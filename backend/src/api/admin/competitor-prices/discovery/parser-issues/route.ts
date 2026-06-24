import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPETITOR_PRICES_MODULE } from "../../../../../modules/competitor-prices"

/**
 * GET /admin/competitor-prices/discovery/parser-issues
 *
 * Self-correction queue: competitors whose deterministic parser is FAILING —
 * active mappings that the scheduled scraper couldn't read (last_status not
 * "ok") with zero priced mappings (the parser recipe is wrong or the site
 * changed). The discovery worker pulls these, re-inspects a sample page, and
 * POSTs a corrected recipe to /discovery/fix-parser. Includes the current
 * parser config + sample failing URLs + errors so the worker can re-derive it.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const competitors = await svc.listCompetitors({ is_active: true })
  const byId: Record<string, any> = {}
  for (const c of competitors) byId[c.id] = c

  const mappings = await svc.listCompetitorProducts(
    { is_active: true },
    { take: 5000 }
  )
  const agg: Record<string, { ok: number; failing: number; samples: any[] }> = {}
  for (const m of mappings) {
    if (!byId[m.competitor_id]) continue
    const a = (agg[m.competitor_id] ??= { ok: 0, failing: 0, samples: [] })
    if (m.last_status === "ok") a.ok++
    else if (m.last_status === "not_found" || m.last_status === "error") {
      a.failing++
      if (a.samples.length < 3 && m.competitor_url) {
        a.samples.push({ url: m.competitor_url, last_error: m.last_error })
      }
    }
  }

  // A parser issue = something failed AND nothing succeeds (recipe is broken,
  // not just a few individually-gated products).
  const issues = Object.entries(agg)
    .filter(([, a]) => a.failing > 0 && a.ok === 0)
    .map(([id, a]) => {
      const c = byId[id]
      return {
        competitor_id: id,
        competitor_handle: c.handle,
        base_url: c.base_url,
        country: c.country,
        scraper_key: c.scraper_key,
        scraper_hints: c.scraper_hints,
        failing: a.failing,
        sample_failures: a.samples,
      }
    })
    .sort((x, y) => y.failing - x.failing)

  res.json({ count: issues.length, issues })
}
