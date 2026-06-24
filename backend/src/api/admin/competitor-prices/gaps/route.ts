import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COMPETITOR_PRICES_MODULE } from "../../../../modules/competitor-prices"
import { readProductPrices } from "../../../../modules/competitor-prices/pricing"
import { computeGaps } from "../../../../modules/competitor-prices/gaps"

/**
 * GET /admin/competitor-prices/gaps — competitiveness analysis. For each of our
 * products with competitor mappings, compares our €/base-unit price to the
 * competitor €/base distribution and reports the market position + whether a
 * competitor undercuts our cost. Sorted most-above-market first. Optional
 * `?position=above|at|below` filter.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)

  const mappings = await svc.listCompetitorProducts(
    { match_status: ["confirmed", "fuzzy"] },
    { relations: ["prices"], take: 2000 }
  )

  const items = mappings.map((m: any) => {
    const latest = (m.prices ?? []).reduce(
      (acc: any, p: any) =>
        !acc || new Date(p.scraped_at) > new Date(acc.scraped_at) ? p : acc,
      null
    )
    return { product_id: m.product_id, title: m.title, latest_price: latest }
  })

  const productIds = [
    ...new Set(items.map((i: any) => i.product_id).filter(Boolean)),
  ] as string[]
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const products = await readProductPrices(query, productIds)

  let gaps = computeGaps(products, items)
  const position = (req.query.position as string) || ""
  if (position) gaps = gaps.filter((g) => g.position === position)

  res.json({ gaps, count: gaps.length })
}
