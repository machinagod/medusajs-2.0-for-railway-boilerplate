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

const toMinor = (a: any): number | null =>
  a != null ? Math.round(Number(a) * 100) : null

/**
 * product_id → { title, sku, pvp1, pvp2, cost } (minor units, EUR). PVP1 = the
 * variant default price; PVP2 + cost come from the draft "Moloni PVP2" / "Moloni
 * Cost" price lists (read directly — they're draft so calculated_price ignores
 * them). See [[competitor-prices]] memory.
 */
async function fetchProducts(
  container: any,
  productIds: string[]
): Promise<Record<string, any>> {
  const out: Record<string, any> = {}
  if (!productIds.length) return out
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const variantToProduct: Record<string, string> = {}
  try {
    const { data } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "variants.id",
        "variants.sku",
        "variants.calculated_price.calculated_amount",
      ],
      filters: { id: productIds },
      context: {
        variants: { calculated_price: QueryContext({ currency_code: "eur" }) },
      },
    })
    for (const p of data ?? []) {
      const v =
        p.variants?.find((x: any) => x?.calculated_price?.calculated_amount != null) ??
        p.variants?.[0]
      out[p.id] = {
        title: p.title,
        sku: p.variants?.[0]?.sku ?? null,
        pvp1: toMinor(v?.calculated_price?.calculated_amount),
        pvp2: null,
        cost: null,
      }
      for (const vv of p.variants ?? []) if (vv.id) variantToProduct[vv.id] = p.id
    }
  } catch {
    return out
  }

  // PVP2 + cost from their (draft) Moloni price lists.
  try {
    const { data: lists } = await query.graph({
      entity: "price_list",
      fields: ["id", "title", "prices.amount", "prices.currency_code", "prices.price_set.variant.id"],
      filters: { title: ["Moloni PVP2", "Moloni Cost"] },
    })
    for (const l of lists ?? []) {
      const field = l.title === "Moloni Cost" ? "cost" : "pvp2"
      for (const pr of l.prices ?? []) {
        const pid = variantToProduct[pr.price_set?.variant?.id]
        if (pid && out[pid] && (pr.currency_code ?? "eur") === "eur") {
          out[pid][field] = toMinor(pr.amount)
        }
      }
    }
  } catch {
    // price lists unavailable → headings show PVP1 only
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
