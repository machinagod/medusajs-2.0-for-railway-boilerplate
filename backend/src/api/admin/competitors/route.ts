import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPETITOR_PRICES_MODULE } from "../../../modules/competitor-prices"

/**
 * GET /admin/competitors — list competitors (incl. parser config:
 * scraper_key + scraper_hints) with per-competitor mapping/priced counts.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const competitors = await svc.listCompetitors({})

  // Count across ALL mappings (light — no price history) so per-store totals are
  // correct; a low `take` here previously capped the WHOLE count at 2k of ~22k,
  // making most stores look near-empty.
  const all = await svc.listCompetitorProducts({}, { take: 50000 })
  const counts: Record<string, { mappings: number; confirmed: number; fuzzy: number; catalog_only: number }> = {}
  for (const m of all) {
    const c = (counts[m.competitor_id] ??= { mappings: 0, confirmed: 0, fuzzy: 0, catalog_only: 0 })
    c.mappings++
    if (m.match_status === "confirmed") c.confirmed++
    else if (m.match_status === "fuzzy") c.fuzzy++
    else if (m.match_status === "catalog_only") c.catalog_only++
  }

  // `priced` = confirmed mappings with at least one successful price observation.
  const confirmed = await svc.listCompetitorProducts(
    { match_status: "confirmed" },
    { relations: ["prices"], take: 50000 }
  )
  const priced: Record<string, number> = {}
  for (const m of confirmed) {
    if ((m.prices ?? []).some((p: any) => p.status === "ok" && p.price != null)) {
      priced[m.competitor_id] = (priced[m.competitor_id] ?? 0) + 1
    }
  }

  res.json({
    competitors: competitors.map((c: any) => ({
      ...c,
      mapping_count: counts[c.id]?.mappings ?? 0,
      confirmed_count: counts[c.id]?.confirmed ?? 0,
      fuzzy_count: counts[c.id]?.fuzzy ?? 0,
      catalog_only_count: counts[c.id]?.catalog_only ?? 0,
      priced_count: priced[c.id] ?? 0,
    })),
  })
}

interface CreateCompetitorBody {
  name: string
  handle: string
  base_url?: string
  scraper_key?: string
  is_active?: boolean
  refresh_interval_seconds?: number
  metadata?: Record<string, any>
}

/** POST /admin/competitors — create a competitor. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as CreateCompetitorBody
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const competitor = await svc.createCompetitors(body)
  res.status(201).json({ competitor })
}
