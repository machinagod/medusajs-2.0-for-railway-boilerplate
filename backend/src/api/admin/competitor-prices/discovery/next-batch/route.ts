import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPETITOR_PRICES_MODULE } from "../../../../../modules/competitor-prices"

/**
 * GET /admin/competitor-prices/discovery/next-batch?limit=N
 *
 * Discovery queue (pull side). Returns the next batch of product watches that
 * are due for discovery, plus the active competitor list to search. An external
 * worker — a Claude Code skill on a scheduled routine, NOT the Anthropic API —
 * pulls a batch, finds each product on the competitors, and POSTs the listings
 * back to /discovery/submit (or /skip). Watches stay "due" until submitted, so a
 * crashed run is simply retried next tick.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const limit = Math.min(Number((req.query.limit as string) ?? 20) || 20, 100)
  const force = req.query.force === "true"

  const watches = await svc.listDueProductWatches(limit, force)
  const competitors = await svc.listCompetitors({ is_active: true })

  res.json({
    count: watches.length,
    watches: watches.map((w: any) => ({
      watch_id: w.id,
      product_id: w.product_id,
      sku: w.product_sku,
      title: w.title ?? w.product_sku ?? w.product_id,
      brand: w.brand,
      ean: w.ean,
    })),
    competitors: competitors.map((c: any) => ({
      handle: c.handle,
      name: c.name,
      base_url: c.base_url,
      country: c.country,
      scraper_key: c.scraper_key,
    })),
  })
}
