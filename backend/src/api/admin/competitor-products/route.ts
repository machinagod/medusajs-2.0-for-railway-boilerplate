import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COMPETITOR_PRICES_MODULE } from "../../../modules/competitor-prices"
import { readProductPrices } from "../../../modules/competitor-prices/pricing"
import { normalizedUnitPrice } from "../../../modules/competitor-prices/normalize"

/**
 * GET /admin/competitor-products — competitor listings grouped by OUR product,
 * paginated BY PRODUCT GROUP so a product's competitors are never split across a
 * page. Returns the current page's rows (with latest price) + the page's product
 * map + `count` = total matching product groups.
 *
 * Query: ?offset=&limit= (in product groups, default 50) · ?q= (search over
 * product title/sku + competitor name/listing title) · ?product_id=
 * ?competitor_id= ?match_status= (filters; default view is matched-only).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { product_id, competitor_id, match_status, q } = req.query as Record<string, string>
  const offset = Math.max(0, Number(req.query.offset) || 0)
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)

  const filters: Record<string, any> = {}
  if (product_id) filters.product_id = product_id
  if (competitor_id) filters.competitor_id = competitor_id
  if (match_status) filters.match_status = match_status
  // The price view defaults to CONFIRMED matches only — `fuzzy` proposals are
  // unreviewed (mostly wrong) and live in the Match Review queue; `catalog_only`
  // lives in the Catalog tab. An explicit ?match_status overrides this.
  if (!product_id && !match_status) filters.match_status = "confirmed"

  // Light pass: all matching mappings (competitor name only, no price history) —
  // enough to group, search, sort, and count BEFORE paging. Prices are loaded only
  // for the page's mappings below, so the payload stays small even at 10k+ matches.
  const all: any[] = await svc.listCompetitorProducts(filters, {
    relations: ["competitor"],
    take: 50000,
  })

  const allPids = [...new Set(all.map((m) => m.product_id).filter(Boolean))] as string[]
  const products = await readProductPrices(query, allPids)

  const byProduct = new Map<string, any[]>()
  for (const m of all) {
    if (!m.product_id) continue
    const arr = byProduct.get(m.product_id) ?? byProduct.set(m.product_id, []).get(m.product_id)!
    arr.push(m)
  }

  // Search across our product title/sku + the competitor name / listing title.
  let pids = [...byProduct.keys()]
  const term = (q ?? "").trim().toLowerCase()
  if (term) {
    pids = pids.filter((pid) => {
      const p = products[pid]
      const rows = byProduct.get(pid)!
      return [p?.title, p?.sku, ...rows.map((r) => r.competitor?.name), ...rows.map((r) => r.title)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    })
  }
  pids.sort((a, b) => (products[a]?.title ?? "").localeCompare(products[b]?.title ?? ""))

  const count = pids.length // total product groups → drives pagination
  const pagePids = pids.slice(offset, offset + limit)
  const pageMappingIds = pagePids.flatMap((pid) => byProduct.get(pid)!.map((m) => m.id))

  // Load price history only for the page's mappings, then keep the latest.
  const priced: any[] = pageMappingIds.length
    ? await svc.listCompetitorProducts(
        { id: pageMappingIds },
        { relations: ["competitor", "prices"], take: pageMappingIds.length }
      )
    : []

  const items = priced.map((m: any) => {
    const latest = (m.prices ?? []).reduce(
      (acc: any, p: any) => (!acc || new Date(p.scraped_at) > new Date(acc.scraped_at) ? p : acc),
      null
    )
    const { prices, ...rest } = m
    const norm = normalizedUnitPrice(latest?.price, m.title)
    return {
      ...rest,
      latest_price: latest,
      base_unit: norm?.base_unit ?? null,
      unit_price: norm?.unit_price ?? null,
    }
  })

  const pageProducts: Record<string, any> = {}
  for (const pid of pagePids) if (products[pid]) pageProducts[pid] = products[pid]

  res.json({ competitor_products: items, products: pageProducts, count, offset, limit })
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
 * POST /admin/competitor-products — manually create a mapping (override insertion).
 * Linking it to one of our products (`product_id`) marks it `confirmed`/`manual` so
 * it goes live immediately; without a product it's an `unmatched` listing. Newly
 * created mappings are due at once (next_scrape_at null), so the next tick scrapes.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as CreateMappingBody
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const competitor_product = await svc.createCompetitorProducts({
    ...body,
    match_status: body.product_id ? "confirmed" : "unmatched",
    match_method: body.product_id ? "manual" : null,
  })
  res.status(201).json({ competitor_product })
}
