import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPETITOR_PRICES_MODULE } from "../../../../modules/competitor-prices"

type Point = [number, number] // [timestamp ms, minor units]

/**
 * GET /admin/competitor-prices/price-history — time series for sparklines.
 * Per product (optionally filtered by ?product_ids=a,b,c):
 *   ours   — our PVP2 (fallback PVP1) over time, from product_price_history
 *   market — competitor per-our-unit prices over time (comparable to ours)
 * Both in minor units, sorted oldest→newest. Bounded to recent observations.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const idsParam = (req.query.product_ids as string) || ""
  const ids = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : null

  const history: Record<string, { ours: Point[]; market: Point[] }> = {}
  const bucket = (pid: string) => (history[pid] ??= { ours: [], market: [] })

  // ── Our price history (change-log) ──
  const snaps = await svc.listProductPriceHistories(
    ids ? { product_id: ids } : {},
    { take: 50000 }
  )
  for (const s of snaps) {
    const v = s.pvp2 ?? s.pvp1
    if (v != null) bucket(s.product_id).ours.push([+new Date(s.captured_at), v])
  }

  // ── Competitor observations (per-our-unit, comparable to ours) ──
  const mappings = await svc.listCompetitorProducts(
    ids ? { product_id: ids } : { match_status: ["confirmed", "fuzzy"] },
    { relations: ["prices"], take: 5000 }
  )
  for (const m of mappings) {
    if (!m.product_id) continue
    for (const p of m.prices ?? []) {
      if (p.unit_price != null) {
        bucket(m.product_id).market.push([+new Date(p.scraped_at), p.unit_price])
      }
    }
  }

  for (const h of Object.values(history)) {
    h.ours.sort((a, b) => a[0] - b[0])
    h.market.sort((a, b) => a[0] - b[0])
  }

  res.json({ history, count: Object.keys(history).length })
}
