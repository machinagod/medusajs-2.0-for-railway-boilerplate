import type { MedusaContainer } from "@medusajs/framework/types"
import { COMPETITOR_PRICES_MODULE } from "../modules/competitor-prices"
import { runCatalogDiscovery } from "../workflows/competitor-prices/discovery-catalog"

let running = false

/**
 * Scheduled catalog discovery — crawl each due competitor's catalog DETERMIN-
 * ISTICALLY (no LLM) using its configured `catalog_parser`, and feed new products
 * to the matcher. Per-competitor cadence is gated by next_catalog_discovery_at;
 * this is just the tick. Competitors without a catalog_parser are skipped, so it
 * stays inert until the discovery skill has configured one.
 */
export default async function discoverCompetitorCatalogJob(
  container: MedusaContainer
) {
  const logger = container.resolve("logger")
  try {
    container.resolve(COMPETITOR_PRICES_MODULE)
  } catch {
    return
  }
  if (running) return
  running = true
  try {
    await runCatalogDiscovery(container, {})
  } catch (e: any) {
    logger.error(`[competitor-prices] catalog discovery tick failed: ${e?.message ?? e}`)
  } finally {
    running = false
  }
}

export const config = {
  name: "discover-competitor-catalog",
  // Daily; per-competitor next_catalog_discovery_at controls real frequency.
  schedule: "0 3 * * *",
}
