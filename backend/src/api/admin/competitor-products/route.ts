import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COMPETITOR_PRICES_MODULE } from "../../../modules/competitor-prices"
import { readProductPrices } from "../../../modules/competitor-prices/pricing"

/**
 * GET /admin/competitor-products — list competitor mappings with their latest
 * observed price, plus a `products` map (our title + current EUR price per
 * product) so the admin can group competitor rows under each of our products.
 * Optional filters: ?product_id=, ?competitor_id=, ?match_status=.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const { product_id, competitor_id, match_status } = req.query as Record<
    string,
    string
  >

  const filters: Record<string, any> = {}
  if (product_id) filters.product_id = product_id
  if (competitor_id) filters.competitor_id = competitor_id
  if (match_status) filters.match_status = match_status

  const mappings = await svc.listCompetitorProducts(filters, {
    relations: ["competitor", "prices"],
    take: 200,
  })

  // Attach the most recent price observation to each mapping.
  const items = mappings.map((m: any) => {
    const latest = (m.prices ?? []).reduce(
      (acc: any, p: any) =>
        !acc || new Date(p.scraped_at) > new Date(acc.scraped_at) ? p : acc,
      null
    )
    const { prices, ...rest } = m
    return { ...rest, latest_price: latest }
  })

  // Resolve OUR product title + PVP1/PVP2/cost for grouping headings.
  const productIds = [
    ...new Set(items.map((i: any) => i.product_id).filter(Boolean)),
  ] as string[]
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const products = await readProductPrices(query, productIds)

  res.json({ competitor_products: items, products, count: items.length })
}

interface CreateMappingBody {
  competitor_id: string
  competitor_url: string
  product_id?: string
  variant_id?: string
  product_sku?: string
  competitor_sku?: string
  competitor_ean?: string
  title?: string
  brand?: string
  pack_units?: number
  pack_label?: string
  scraper_key?: string
  refresh_interval_seconds?: number
  metadata?: Record<string, any>
}

/**
 * POST /admin/competitor-products — create a mapping. Newly created mappings are
 * due immediately (next_scrape_at left null), so the next tick scrapes them.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as CreateMappingBody
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const competitor_product = await svc.createCompetitorProducts(body)
  res.status(201).json({ competitor_product })
}
