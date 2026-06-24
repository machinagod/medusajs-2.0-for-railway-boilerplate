import { normalizedUnitPrice, type BaseUnit } from "./normalize"
import type { OurPrice } from "./pricing"

/**
 * Competitiveness gap analysis — the €/L answer to "how are we priced vs the
 * market, and where are the gaps?". For each of our products with competitor
 * mappings, it compares OUR €/base-unit to the competitor €/base-unit
 * distribution (only listings in the same unit family count), and flags where we
 * sit relative to the market and whether a competitor undercuts our cost.
 *
 * Pure: the route feeds it our prices + the latest competitor observations.
 */

export type GapMapping = {
  product_id?: string | null
  title?: string | null
  latest_price?: { price?: number | null } | null
}

export type MarketPosition = "below" | "at" | "above" | "unknown"

export type GapRow = {
  product_id: string
  title?: string
  base_unit: BaseUnit | null
  /** Our reference €/base (PVP2 if present, else PVP1), minor units. */
  our_unit_price: number | null
  our_cost_unit: number | null
  competitor: { count: number; min: number; median: number; max: number }
  position: MarketPosition
  /** Our price vs the cheapest / median competitor, percent (+ = we're dearer). */
  vs_min_pct: number | null
  vs_median_pct: number | null
  /** A competitor sells below OUR cost — we can't match it profitably. */
  below_cost: boolean
}

const round1 = (n: number): number => Math.round(n * 10) / 10

function median(sorted: number[]): number {
  const n = sorted.length
  if (n % 2) return sorted[(n - 1) / 2]
  return Math.round((sorted[n / 2 - 1] + sorted[n / 2]) / 2)
}

/**
 * Build the gap rows. Only products where we have a canonical €/base price AND at
 * least one competitor listing in the SAME base unit are included; rows are
 * sorted most-above-market first (the actionable gaps).
 */
export function computeGaps(
  products: Record<string, OurPrice>,
  mappings: GapMapping[]
): GapRow[] {
  const byProduct = new Map<string, number[]>()
  for (const m of mappings) {
    if (!m.product_id) continue
    const p = products[m.product_id]
    if (!p?.base_unit) continue // we can't compare without our own €/base
    const norm = normalizedUnitPrice(m.latest_price?.price, m.title)
    if (!norm || norm.unit_price == null || norm.base_unit !== p.base_unit) continue
    const list = byProduct.get(m.product_id) ?? []
    list.push(norm.unit_price)
    byProduct.set(m.product_id, list)
  }

  const rows: GapRow[] = []
  for (const [pid, prices] of byProduct) {
    const p = products[pid]
    const our = p.pvp2_unit ?? p.pvp1_unit ?? null
    const sorted = [...prices].sort((a, b) => a - b)
    const min = sorted[0]
    const max = sorted[sorted.length - 1]
    const med = median(sorted)
    const cost = p.cost_unit ?? null
    const position: MarketPosition =
      our == null ? "unknown" : our <= min ? "below" : our <= med ? "at" : "above"
    rows.push({
      product_id: pid,
      title: p.title,
      base_unit: p.base_unit,
      our_unit_price: our,
      our_cost_unit: cost,
      competitor: { count: prices.length, min, median: med, max },
      position,
      vs_min_pct: our != null && min > 0 ? round1(((our - min) / min) * 100) : null,
      vs_median_pct: our != null && med > 0 ? round1(((our - med) / med) * 100) : null,
      below_cost: cost != null && min < cost,
    })
  }

  rows.sort(
    (a, b) => (b.vs_median_pct ?? -Infinity) - (a.vs_median_pct ?? -Infinity)
  )
  return rows
}
