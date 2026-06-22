import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import fs from "fs"
import path from "path"

/**
 * One-time bootstrap of the @rsc-labs/medusa-products-bought-together-v2 plugin
 * from Higitotal's historical Moloni sales baskets.
 *
 * Why a bootstrap: the plugin only learns from Medusa orders placed *after* it is
 * installed, so on a fresh storefront it starts empty. This seeds it with years of
 * real co-purchase signal; the plugin's order subscriber then keeps it current with
 * no recurring manual step.
 *
 * Data path (no live Moloni call from the backend — the client only syncs the
 * catalog): the seed CSV is produced from the Moloni mirror, one row per co-purchase
 * pair as `moloniProductIdA,moloniProductIdB,frequency`. Frequencies are counted over
 * documents of type FT (invoice), FR (fatura-recibo) and SM (goods issue), keeping
 * pairs that co-occur >= 3 times. Regenerate with this query against the mirror:
 *
 *   SELECT a_pid, b_pid, freq FROM (
 *     SELECT a_pid, b_pid, COUNT(*) AS freq FROM (
 *       SELECT (data->>'document_id') AS doc,
 *              array_agg(DISTINCT (p->>'product_id')) AS prods
 *       FROM documents d, LATERAL jsonb_array_elements(d.data->'products') p
 *       WHERE d.data->>'document_type_id' IN ('1','27','11')
 *         AND (p->>'product_id') IS NOT NULL AND (p->>'product_id') <> '0'
 *       GROUP BY 1
 *     ) b, LATERAL unnest(b.prods) AS a_pid, LATERAL unnest(b.prods) AS b_pid
 *     WHERE a_pid < b_pid GROUP BY a_pid, b_pid
 *   ) z WHERE freq >= 3 ORDER BY freq DESC;
 *
 * Moloni product_id maps to a Medusa product via `product.external_id` (set by the
 * Moloni sync); pairs whose products were never imported are skipped.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/backfill-bought-together.ts
 *   npx medusa exec ./src/scripts/backfill-bought-together.ts ./.bootstrap/pairs.csv
 *   npx medusa exec ./src/scripts/backfill-bought-together.ts reset   # wipe + reseed
 *
 * Idempotency: aborts if the table is already populated unless `reset` is passed
 * (the plugin increments on every order, so a blind re-run would double-count).
 */
export default async function backfillBoughtTogether({ container, args }: ExecArgs) {
  const logger = container.resolve("logger")

  const reset = args.includes("reset")
  const seedPath = path.resolve(
    process.cwd(),
    args.find((a) => a.endsWith(".csv") || a.includes("/")) ??
      ".bootstrap/bought-together-pairs.csv"
  )

  if (!fs.existsSync(seedPath)) {
    logger.error(`[bought-together] seed file not found: ${seedPath}`)
    return
  }

  // Plugin module key (see PRODUCTS_BOUGHT_TOGETHER_MODULE in the package). Resolve
  // by the literal string so this script doesn't depend on the plugin's TS types.
  const pbt: any = container.resolve("productsBoughtTogetherService")
  const productService = container.resolve(Modules.PRODUCT)

  // --- idempotency guard ---------------------------------------------------
  const existing = await pbt.listProductsBoughtTogethers({}, { take: 1 })
  if (existing.length && !reset) {
    logger.warn(
      "[bought-together] table already populated — aborting. Pass `reset` to wipe and reseed."
    )
    return
  }
  if (reset && existing.length) {
    logger.info("[bought-together] reset: deleting existing pairs…")
    let deleted = 0
    for (;;) {
      const page = await pbt.listProductsBoughtTogethers({}, { take: 1000, select: ["id"] })
      if (!page.length) break
      await pbt.deleteProductsBoughtTogethers(page.map((r: { id: string }) => r.id))
      deleted += page.length
    }
    logger.info(`[bought-together] reset: deleted ${deleted} pairs.`)
  }

  // --- Moloni product_id -> Medusa product.id map --------------------------
  const externalToId = new Map<string, string>()
  const pageSize = 1000
  for (let skip = 0; ; skip += pageSize) {
    const products = await productService.listProducts(
      {},
      { select: ["id", "external_id"], take: pageSize, skip }
    )
    for (const p of products) {
      if (p.external_id) externalToId.set(String(p.external_id), p.id)
    }
    if (products.length < pageSize) break
  }
  logger.info(`[bought-together] mapped ${externalToId.size} Moloni products to Medusa.`)

  // --- translate pairs -----------------------------------------------------
  const lines = fs.readFileSync(seedPath, "utf-8").split("\n")
  const seen = new Set<string>()
  const rows: { productId1: string; productId2: string; frequency: number }[] = []
  let total = 0
  let skippedUnmapped = 0
  for (const line of lines) {
    if (!line.trim()) continue
    total++
    const [a, b, f] = line.split(",")
    const idA = externalToId.get(a)
    const idB = externalToId.get(b)
    if (!idA || !idB || idA === idB) {
      skippedUnmapped++
      continue
    }
    // Normalise pair order so each unordered pair is stored once; the plugin's
    // subscriber matches both directions, so live orders increment these rows.
    const [productId1, productId2] = idA < idB ? [idA, idB] : [idB, idA]
    const key = `${productId1}|${productId2}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({ productId1, productId2, frequency: Number(f) || 1 })
  }

  // --- bulk insert ---------------------------------------------------------
  const batch = 1000
  for (let i = 0; i < rows.length; i += batch) {
    await pbt.createProductsBoughtTogethers(rows.slice(i, i + batch))
    logger.info(`[bought-together] inserted ${Math.min(i + batch, rows.length)}/${rows.length}`)
  }

  logger.info(
    `[bought-together] done. seed pairs: ${total}, inserted: ${rows.length}, ` +
      `skipped (product not in Medusa): ${skippedUnmapped}.`
  )
}
