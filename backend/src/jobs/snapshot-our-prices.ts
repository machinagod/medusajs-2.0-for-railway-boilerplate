import type { MedusaContainer } from "@medusajs/framework/types"
import { COMPETITOR_PRICES_MODULE } from "../modules/competitor-prices"
import { runSnapshotOurPrices } from "../workflows/competitor-prices/snapshot-our-prices"

/**
 * Daily snapshot of OUR price (PVP1/PVP2/cost) per watched product into the
 * price-history change-log — the us-side series for the price-evolution
 * sparkline. No-ops (inert) when the module isn't registered.
 */
export default async function snapshotOurPricesJob(container: MedusaContainer) {
  const logger = container.resolve("logger")
  try {
    container.resolve(COMPETITOR_PRICES_MODULE)
  } catch {
    return
  }
  try {
    await runSnapshotOurPrices(container)
  } catch (e: any) {
    logger.error(`[competitor-prices] price-history snapshot failed: ${e?.message ?? e}`)
  }
}

export const config = {
  name: "snapshot-our-prices",
  schedule: "0 5 * * *", // daily 05:00 UTC
}
