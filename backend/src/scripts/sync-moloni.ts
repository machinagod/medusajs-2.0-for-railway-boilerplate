import { ExecArgs } from "@medusajs/framework/types"
import {
  MoloniSyncEntity,
  runMoloniSync,
} from "../workflows/moloni/sync"

/**
 * Observed Moloni sync runner.
 *
 * `medusa exec` parses leading-dash flags itself, so this script takes
 * POSITIONAL args (no `--`):
 *
 *   npx medusa exec ./src/scripts/sync-moloni.ts                       # DRY RUN (default)
 *   npx medusa exec ./src/scripts/sync-moloni.ts commit                # write (incremental)
 *   npx medusa exec ./src/scripts/sync-moloni.ts commit full           # ignore cursors, full sync
 *   npx medusa exec ./src/scripts/sync-moloni.ts commit limit=5
 *   npx medusa exec ./src/scripts/sync-moloni.ts commit entities=products,stock
 *   npx medusa exec ./src/scripts/sync-moloni.ts commit status=published
 *
 * Runs are incremental by default (per-entity cursors); the first run, with no
 * cursor yet, naturally fetches everything. Pass `full` to force a full sync.
 * Defaults to a DRY RUN so the first invocation never writes by accident — the
 * connected database is production. Pass `commit` to actually write.
 */
export default async function syncMoloni({ container, args }: ExecArgs) {
  const argv = args ?? []
  const has = (token: string) => argv.includes(token)
  const valueOf = (key: string): string | undefined => {
    const hit = argv.find((a) => a.startsWith(`${key}=`))
    return hit ? hit.slice(key.length + 1) : undefined
  }

  const dryRun = !has("commit")
  const full = has("full")
  const limitRaw = valueOf("limit")
  const limit = limitRaw ? Number(limitRaw) : undefined
  const entitiesRaw = valueOf("entities")
  const entities = entitiesRaw
    ? (entitiesRaw.split(",").map((s) => s.trim()) as MoloniSyncEntity[])
    : undefined
  const status = (valueOf("status") as "draft" | "published") || undefined

  const logger = container.resolve("logger")
  logger.info(
    `[sync-moloni] ${dryRun ? "DRY RUN (pass 'commit' to write)" : "COMMIT — writing to the connected DB"}`
  )

  const report = await runMoloniSync(container, {
    dryRun,
    full,
    limit,
    entities,
    productStatus: status,
  })

  logger.info(`[sync-moloni] report:\n${JSON.stringify(report, null, 2)}`)
}
