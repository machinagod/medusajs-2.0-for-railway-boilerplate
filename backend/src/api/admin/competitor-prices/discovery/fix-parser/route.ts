import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPETITOR_PRICES_MODULE } from "../../../../../modules/competitor-prices"

interface FixParserBody {
  competitor_id?: string
  competitor_handle?: string
  scraper_key?: string
  scraper_hints?: Record<string, any> | null
  price_tax_basis?: "incl" | "excl" // correct/set whether listed prices include VAT
  catalog_parser?: Record<string, any> | null // deterministic catalog-enumeration recipe
  deactivate?: boolean // for genuinely gated stores with no public price
}

/**
 * POST /admin/competitor-prices/discovery/fix-parser
 *
 * Apply a corrected deterministic parser recipe to a competitor (the repair side
 * of the self-correction loop). Updates scraper_key/scraper_hints, or deactivates
 * a store that turns out to be login-gated. The next scrape tick re-reads its
 * pages with the new recipe.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const body = (req.body ?? {}) as FixParserBody

  let competitor: any = null
  if (body.competitor_id) {
    ;[competitor] = await svc.listCompetitors({ id: body.competitor_id })
  } else if (body.competitor_handle) {
    ;[competitor] = await svc.listCompetitors({ handle: body.competitor_handle })
  }
  if (!competitor) {
    return res.status(404).json({ message: "competitor not found" })
  }

  const update: Record<string, any> = { id: competitor.id }
  if (body.deactivate) update.is_active = false
  if (body.scraper_key) update.scraper_key = body.scraper_key
  if (body.scraper_hints !== undefined) update.scraper_hints = body.scraper_hints
  if (body.price_tax_basis) update.price_tax_basis = body.price_tax_basis
  if (body.catalog_parser !== undefined) update.catalog_parser = body.catalog_parser

  await svc.updateCompetitors(update)
  res.json({
    competitor_id: competitor.id,
    handle: competitor.handle,
    updated: Object.keys(update).filter((k) => k !== "id"),
  })
}
