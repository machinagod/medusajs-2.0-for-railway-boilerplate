import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPETITOR_PRICES_MODULE } from "../../../../modules/competitor-prices"

/**
 * GET /admin/competitor-prices/catalog-items?limit=&offset=&competitor_id=
 *
 * The "assortment gap" viewer: competitor catalog items discovered by the
 * deterministic crawl that did NOT match any product of ours (`catalog_only`).
 * These are products our competitors sell that we don't — retained as
 * intelligence we can leverage later (expansion candidates, range analysis).
 * Read-only; never scraped (no product of ours to compare against).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const limit = Math.min(Number((req.query.limit as string) ?? 50) || 50, 200)
  const offset = Math.max(Number((req.query.offset as string) ?? 0) || 0, 0)

  const filters: Record<string, any> = { match_status: "catalog_only" }
  if (req.query.competitor_id) filters.competitor_id = req.query.competitor_id as string

  const [items, count] = await svc.listAndCountCompetitorProducts(filters, {
    take: limit,
    skip: offset,
    relations: ["competitor"],
    order: { created_at: "DESC" },
  })

  res.json({
    count,
    limit,
    offset,
    items: (items ?? []).map((m: any) => ({
      id: m.id,
      competitor_handle: m.competitor?.handle ?? null,
      competitor_name: m.competitor?.name ?? null,
      country: m.competitor?.country ?? null,
      url: m.competitor_url,
      title: m.title,
      brand: m.brand,
      sku: m.competitor_sku,
      ean: m.competitor_ean,
      discovered_at: m.metadata?.discovered_at ?? null,
    })),
  })
}
