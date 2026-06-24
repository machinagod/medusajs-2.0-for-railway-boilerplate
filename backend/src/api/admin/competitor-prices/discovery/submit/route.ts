import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPETITOR_PRICES_MODULE } from "../../../../../modules/competitor-prices"

interface SubmitListing {
  competitor_handle: string
  competitor_name?: string
  competitor_base_url?: string
  competitor_country?: string // PT/ES — set for newly-discovered stores
  is_new_competitor?: boolean // worker flags a store not in our set
  url: string
  title?: string
  brand?: string
  sku?: string
  ean?: string
  confidence?: number
  characteristics?: Record<string, any>
}

interface SubmitBody {
  watch_id?: string
  product_id?: string
  listings?: SubmitListing[]
}

/**
 * POST /admin/competitor-prices/discovery/submit
 *
 * Discovery queue (push side). The worker submits the listings it found for one
 * watched product: each becomes a competitor + a confirmed mapping (the next
 * scrape tick captures prices). The watch is then marked discovered so it leaves
 * the queue. Mirrors runProductDiscovery's inner loop, but driven externally.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const body = (req.body ?? {}) as SubmitBody
  const listings = body.listings ?? []

  // Resolve the watch (by id or product_id) so we can attribute + mark it.
  let watch: any = null
  if (body.watch_id) {
    ;[watch] = await svc.listProductWatches({ id: body.watch_id })
  } else if (body.product_id) {
    ;[watch] = await svc.listProductWatches({ product_id: body.product_id })
  }
  if (!watch) {
    return res.status(404).json({ message: "watch not found (pass watch_id or product_id)" })
  }

  let created = 0
  let skipped = 0
  for (const l of listings) {
    if (!l.competitor_handle || !l.url) {
      skipped++
      continue
    }
    const competitor = await svc.ensureCompetitor({
      handle: l.competitor_handle,
      name: l.competitor_name,
      base_url: l.competitor_base_url,
      country: l.competitor_country,
      // A store the worker found that wasn't in our set is created (flagged
      // discovered) so it joins the watchlist for future scrapes/review.
      discovered: l.is_new_competitor,
    })
    const mapping = await svc.upsertDiscoveredMapping(
      competitor.id,
      {
        url: l.url,
        title: l.title,
        brand: l.brand,
        sku: l.sku,
        ean: l.ean,
        characteristics: l.characteristics,
        confidence: l.confidence,
      },
      watch.product_id
    )
    if (mapping) created++
    else skipped++
  }

  await svc.markProductDiscovered(watch)
  res.json({ watch_id: watch.id, product_id: watch.product_id, created, skipped })
}
