import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPETITOR_PRICES_MODULE } from "../../../../../modules/competitor-prices"

/**
 * GET /admin/competitor-prices/discovery/stats
 *
 * Queue health for the discovery worker / dashboards: how many watches are due,
 * total watches, and how many mappings exist (matched vs unmatched).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const now = new Date()

  const [, totalWatches] = await svc.listAndCountProductWatches({})
  const [, dueWatches] = await svc.listAndCountProductWatches({
    is_active: true,
    $or: [{ next_discovery_at: null }, { next_discovery_at: { $lte: now } }],
  })
  const [, totalMappings] = await svc.listAndCountCompetitorProducts({})
  const [, unmatched] = await svc.listAndCountCompetitorProducts({
    match_status: "unmatched",
  })

  res.json({
    due_watches: dueWatches,
    total_watches: totalWatches,
    total_mappings: totalMappings,
    unmatched_mappings: unmatched,
    matched_mappings: totalMappings - unmatched,
  })
}
