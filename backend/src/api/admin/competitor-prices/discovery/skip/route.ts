import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPETITOR_PRICES_MODULE } from "../../../../../modules/competitor-prices"

interface SkipBody {
  watch_id?: string
  product_id?: string
}

/**
 * POST /admin/competitor-prices/discovery/skip
 *
 * Worker found nothing for this watched product (or chose to defer it): mark it
 * discovered so its next_discovery_at moves forward and it leaves the queue,
 * without creating any mapping.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const body = (req.body ?? {}) as SkipBody

  let watch: any = null
  if (body.watch_id) {
    ;[watch] = await svc.listProductWatches({ id: body.watch_id })
  } else if (body.product_id) {
    ;[watch] = await svc.listProductWatches({ product_id: body.product_id })
  }
  if (!watch) {
    return res.status(404).json({ message: "watch not found (pass watch_id or product_id)" })
  }

  const { misses, retired } = await svc.markProductDiscovered(watch, { found: false })
  res.json({ watch_id: watch.id, skipped: true, consecutive_misses: misses, retired })
}
