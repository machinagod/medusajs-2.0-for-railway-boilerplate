import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPETITOR_PRICES_MODULE } from "../../../modules/competitor-prices"

/**
 * GET /admin/competitors — list competitors (incl. parser config:
 * scraper_key + scraper_hints) with per-competitor mapping/priced counts.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const competitors = await svc.listCompetitors({})

  const mappings = await svc.listCompetitorProducts({}, {
    relations: ["prices"],
    take: 2000,
  })
  const counts: Record<string, { mappings: number; priced: number }> = {}
  for (const m of mappings) {
    const id = m.competitor_id
    const c = (counts[id] ??= { mappings: 0, priced: 0 })
    c.mappings++
    if ((m.prices ?? []).some((p: any) => p.status === "ok" && p.price != null)) {
      c.priced++
    }
  }

  res.json({
    competitors: competitors.map((c: any) => ({
      ...c,
      mapping_count: counts[c.id]?.mappings ?? 0,
      priced_count: counts[c.id]?.priced ?? 0,
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
