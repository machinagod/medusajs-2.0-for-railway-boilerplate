import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COMPETITOR_PRICES_MODULE } from "../../../../../modules/competitor-prices"
import { readProductPrices } from "../../../../../modules/competitor-prices/pricing"

/**
 * GET /admin/competitor-prices/match/review?limit=&offset=&competitor_id=
 *
 * The match-review queue: fuzzy PROPOSALS (a title-fuzzy candidate the matcher
 * found but did not auto-confirm) awaiting agent/human resolution. Each item pairs
 * the competitor listing with OUR proposed product so a reviewer can confirm /
 * reject / reassign via /match/resolve. Highest-confidence proposals first.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
  const offset = Math.max(0, Number(req.query.offset) || 0)

  const filters: Record<string, any> = { match_status: "fuzzy" }
  if (req.query.competitor_id) filters.competitor_id = req.query.competitor_id as string

  const [rows, count] = await svc.listAndCountCompetitorProducts(filters, {
    relations: ["competitor"],
    take: limit,
    skip: offset,
    order: { match_score: "DESC" },
  })

  const productIds = [...new Set((rows ?? []).map((m: any) => m.product_id).filter(Boolean))] as string[]
  const products = await readProductPrices(query, productIds)

  res.json({
    count,
    limit,
    offset,
    items: (rows ?? []).map((m: any) => ({
      id: m.id,
      competitor_handle: m.competitor?.handle ?? null,
      competitor_name: m.competitor?.name ?? null,
      competitor_url: m.competitor_url,
      theirs_title: m.title,
      brand: m.brand,
      sku: m.competitor_sku,
      ean: m.competitor_ean,
      match_score: m.match_score ?? null,
      proposed_product_id: m.product_id ?? null,
      proposed_title: m.product_id ? products[m.product_id]?.title ?? null : null,
      proposed_sku: m.product_id ? products[m.product_id]?.sku ?? null : null,
    })),
  })
}
