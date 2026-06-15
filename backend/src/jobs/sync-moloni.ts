import type { MedusaContainer } from "@medusajs/framework/types"
import { MOLONI_MODULE } from "../modules/moloni"
import { runMoloniSync } from "../workflows/moloni/sync"

/**
 * Scheduled Moloni -> Medusa sync. Idempotent; safe to run repeatedly.
 * No-ops when the Moloni module isn't configured (credentials absent).
 */
export default async function moloniSyncJob(container: MedusaContainer) {
  const logger = container.resolve("logger")
  try {
    container.resolve(MOLONI_MODULE)
  } catch {
    logger.info("[moloni-sync] module not configured — skipping scheduled run")
    return
  }
  await runMoloniSync(container, {})
}

export const config = {
  name: "moloni-sync",
  // Every 5 minutes. Incremental by default (driven by per-entity cursors), so
  // each tick only fetches what changed in Moloni. https://crontab.guru/
  schedule: "*/5 * * * *",
}
