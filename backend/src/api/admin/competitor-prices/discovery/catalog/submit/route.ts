import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPETITOR_PRICES_MODULE } from "../../../../../../modules/competitor-prices"
import { runCompetitorMatch } from "../../../../../../workflows/competitor-prices/match"

interface CatalogListing {
  url?: string
  title?: string
  brand?: string
  sku?: string
  ean?: string
  characteristics?: any
}

interface CatalogSubmitBody {
  competitor_id?: string
  competitor_handle?: string
  listings?: CatalogListing[]
}

/**
 * POST /admin/competitor-prices/discovery/catalog/submit
 *
 * The worker crawled a competitor's catalog and posts back the product listings
 * it found. Each becomes an UNMATCHED mapping; we then run the matcher (strict
 * EAN/SKU + fuzzy title with size awareness) to resolve them to our products.
 * Body: { competitor_id | competitor_handle, listings:[{url,title,brand,sku,ean}] }.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const body = (req.body ?? {}) as CatalogSubmitBody
  const listings = Array.isArray(body.listings) ? body.listings : []

  let competitor: any = null
  if (body.competitor_id) {
    ;[competitor] = await svc.listCompetitors({ id: body.competitor_id })
  } else if (body.competitor_handle) {
    ;[competitor] = await svc.listCompetitors({ handle: body.competitor_handle })
  }
  if (!competitor) {
    return res
      .status(404)
      .json({ message: "competitor not found (pass competitor_id or competitor_handle)" })
  }

  let created = 0
  const newIds: string[] = []
  for (const l of listings) {
    if (!l.url) continue
    const mapping = await svc.upsertDiscoveredMapping(competitor.id, {
      url: l.url,
      title: l.title,
      brand: l.brand,
      sku: l.sku,
      ean: l.ean,
      characteristics: l.characteristics,
    })
    if (mapping?.match_status === "unmatched") {
      created++
      if (mapping.id) newIds.push(mapping.id)
    }
  }

  await svc.markCatalogDiscovered(competitor)

  // Resolve the freshly ingested listings against our catalog.
  const report = newIds.length
    ? await runCompetitorMatch(req.scope, { mappingIds: newIds })
    : { considered: 0, confirmed: 0, fuzzy: 0, catalog_only: 0 }

  res.json({
    competitor_id: competitor.id,
    handle: competitor.handle,
    submitted: listings.length,
    created,
    matched: report.confirmed + report.fuzzy,
    report,
  })
}
