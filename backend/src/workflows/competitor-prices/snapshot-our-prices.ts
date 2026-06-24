import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COMPETITOR_PRICES_MODULE } from "../../modules/competitor-prices"
import { readProductPrices } from "../../modules/competitor-prices/pricing"

export interface SnapshotReport {
  considered: number
  snapshotted: number
}

/**
 * Snapshot OUR price (PVP1/PVP2/cost) for every watched product into
 * product_price_history — but only a row per product where a value CHANGED since
 * its last snapshot, so the table stays a clean change-log to chart against the
 * competitor_price series.
 */
export async function runSnapshotOurPrices(
  container: MedusaContainer
): Promise<SnapshotReport> {
  const logger = container.resolve("logger")
  const svc: any = container.resolve(COMPETITOR_PRICES_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const watches = await svc.listProductWatches({ is_active: true }, { take: 100000 })
  const productIds = [
    ...new Set(watches.map((w: any) => w.product_id).filter(Boolean)),
  ] as string[]
  const report: SnapshotReport = { considered: productIds.length, snapshotted: 0 }
  if (!productIds.length) return report

  const prices = await readProductPrices(query, productIds)

  // Latest snapshot per product (history is change-only, so this stays small).
  const hist = await svc.listProductPriceHistories(
    { product_id: productIds },
    { order: { captured_at: "DESC" }, take: 100000 }
  )
  const last: Record<string, any> = {}
  for (const h of hist) if (!last[h.product_id]) last[h.product_id] = h

  const now = new Date()
  const toCreate: any[] = []
  for (const pid of productIds) {
    const p = prices[pid]
    if (!p || (p.pvp1 == null && p.pvp2 == null && p.cost == null)) continue
    const l = last[pid]
    if (!l || l.pvp1 !== p.pvp1 || l.pvp2 !== p.pvp2 || l.cost !== p.cost) {
      toCreate.push({ product_id: pid, pvp1: p.pvp1, pvp2: p.pvp2, cost: p.cost, captured_at: now })
    }
  }
  for (let i = 0; i < toCreate.length; i += 500) {
    await svc.createProductPriceHistories(toCreate.slice(i, i + 500))
  }
  report.snapshotted = toCreate.length
  logger.info(
    `[competitor-prices] price-history snapshot: ${report.snapshotted} changed of ${report.considered}`
  )
  return report
}
