import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, QueryContext } from "@medusajs/framework/utils"
import { COMPETITOR_PRICES_MODULE } from "../../../modules/competitor-prices"

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

  // Resolve OUR product title + current EUR price for grouping headings.
  const productIds = [
    ...new Set(items.map((i: any) => i.product_id).filter(Boolean)),
  ] as string[]
  const products = await fetchProducts(req.scope, productIds)

  res.json({ competitor_products: items, products, count: items.length })
}

/** product_id → { title, sku, our_price (minor units, EUR) } for the mapped products. */
async function fetchProducts(
  container: any,
  productIds: string[]
): Promise<Record<string, { title: string; sku: string | null; our_price: number | null }>> {
  const out: Record<string, any> = {}
  if (!productIds.length) return out
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "variants.sku",
        "variants.calculated_price.calculated_amount",
      ],
      filters: { id: productIds },
      context: {
        variants: { calculated_price: QueryContext({ currency_code: "eur" }) },
      },
    })
    for (const p of data ?? []) {
      const v = p.variants?.find(
        (x: any) => x?.calculated_price?.calculated_amount != null
      )
      const amount = v?.calculated_price?.calculated_amount
      out[p.id] = {
        title: p.title,
        sku: p.variants?.[0]?.sku ?? null,
        our_price: amount != null ? Math.round(Number(amount) * 100) : null,
      }
    }
  } catch {
    // pricing/query unavailable → headings fall back to per-row data
  }
  return out
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
