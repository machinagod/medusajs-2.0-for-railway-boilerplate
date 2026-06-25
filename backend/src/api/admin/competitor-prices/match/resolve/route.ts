import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPETITOR_PRICES_MODULE } from "../../../../../modules/competitor-prices"

interface ResolveBody {
  mapping_id?: string
  action?: "confirm" | "reject" | "reassign"
  product_id?: string
  variant_id?: string | null
  product_sku?: string | null
  by?: string // "agent" | "human" | a user id — recorded for audit
}

/**
 * POST /admin/competitor-prices/match/resolve — resolve a fuzzy match proposal.
 * The single override point for BOTH the agent-matching skill and a human:
 *   - confirm  : the proposed product is correct → `confirmed` (becomes live, scraped)
 *   - reject   : not the same product → `catalog_only`, link cleared
 *   - reassign : link to a DIFFERENT product → `confirmed` on that product
 * Body: { mapping_id, action, product_id? (reassign), variant_id?, product_sku?, by? }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const { mapping_id, action, product_id, variant_id, product_sku, by } = (req.body ?? {}) as ResolveBody

  if (!mapping_id || !action) {
    return res.status(400).json({ message: "mapping_id and action are required" })
  }
  const [m] = await svc.listCompetitorProducts({ id: mapping_id })
  if (!m) return res.status(404).json({ message: "mapping not found" })

  const metadata = { ...(m.metadata ?? {}), resolution: { action, by: by ?? "human" } }

  if (action === "reject") {
    await svc.updateCompetitorProducts({
      id: mapping_id,
      match_status: "catalog_only",
      product_id: null,
      variant_id: null,
      product_sku: null,
      metadata,
    })
    return res.json({ id: mapping_id, match_status: "catalog_only" })
  }

  if (action === "confirm") {
    if (!m.product_id) {
      return res.status(400).json({ message: "mapping has no proposed product to confirm" })
    }
    await svc.updateCompetitorProducts({
      id: mapping_id,
      match_status: "confirmed",
      match_method: m.match_method ?? "manual",
      next_scrape_at: null, // newly live → scrape on the next tick
      metadata,
    })
    return res.json({ id: mapping_id, match_status: "confirmed", product_id: m.product_id })
  }

  if (action === "reassign") {
    if (!product_id) return res.status(400).json({ message: "product_id is required for reassign" })
    await svc.updateCompetitorProducts({
      id: mapping_id,
      product_id,
      variant_id: variant_id ?? null,
      product_sku: product_sku ?? null,
      match_status: "confirmed",
      match_method: "manual",
      match_score: null,
      next_scrape_at: null,
      metadata,
    })
    return res.json({ id: mapping_id, match_status: "confirmed", product_id })
  }

  return res.status(400).json({ message: `invalid action: ${action}` })
}
