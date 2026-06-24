import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, QueryContext } from "@medusajs/framework/utils"
import { COMPETITOR_PRICES_MODULE } from "../../modules/competitor-prices"
import { crawlTargets } from "../../modules/competitor-prices/scrapers/engine"
import { DEFAULT_SCRAPER_KEY } from "../../modules/competitor-prices/scrapers/registry"
import type { ScrapeTarget } from "../../modules/competitor-prices/scrapers/types"

export interface ScrapeOptions {
  limit?: number
  mappingIds?: string[]
  /** Ignore next_scrape_at and scrape now. */
  force?: boolean
}

export interface ScrapeReport {
  due: number
  scraped: number
  changed: number
  unchanged: number
  failed: number
  notFound: number
}

/**
 * Resolve which mappings are due, crawl them with Crawlee, and persist each
 * observation (advancing the adaptive schedule). Used by the scheduled job and
 * the admin "scrape now" route.
 */
export async function runCompetitorScrape(
  container: MedusaContainer,
  opts: ScrapeOptions = {}
): Promise<ScrapeReport> {
  const logger = container.resolve("logger")
  const svc: any = container.resolve(COMPETITOR_PRICES_MODULE)
  const cfg = svc.getConfig()

  const due: any[] = opts.mappingIds?.length
    ? await svc.listCompetitorProducts(
        { id: opts.mappingIds },
        { relations: ["competitor"] }
      )
    : await svc.listDueMappings(opts.limit, opts.force)

  const targets: ScrapeTarget[] = due
    .filter((m) => m.is_active && m.competitor_url)
    .map((m) => ({
      url: m.competitor_url,
      competitorId: m.competitor?.id ?? m.competitor_id,
      competitorProductId: m.id,
      scraperKey:
        m.scraper_key ?? m.competitor?.scraper_key ?? DEFAULT_SCRAPER_KEY,
      // Per-mapping override → the competitor's reusable parser recipe.
      hints: m.metadata?.scraper_hints ?? m.competitor?.scraper_hints,
    }))

  const report: ScrapeReport = {
    due: due.length,
    scraped: 0,
    changed: 0,
    unchanged: 0,
    failed: 0,
    notFound: 0,
  }
  if (!targets.length) {
    logger.info("[competitor-prices] no due mappings to scrape")
    return report
  }

  const results = await crawlTargets(targets, { concurrency: cfg.concurrency })

  // Snapshot OUR current EUR price for the mapped products (minor units).
  const ourPrices = await fetchOurPrices(
    container,
    due.map((m) => m.product_id).filter(Boolean)
  )

  for (const m of due) {
    const r = results.get(m.id)
    if (!r) continue
    const outcome = await svc.recordObservation(m, r, ourPrices.get(m.product_id))
    report.scraped++
    if (r.status === "not_found") report.notFound++
    if (outcome === "error") report.failed++
    else if (outcome === "changed") report.changed++
    else report.unchanged++
  }

  logger.info(
    `[competitor-prices] scraped=${report.scraped} changed=${report.changed} unchanged=${report.unchanged} failed=${report.failed} notFound=${report.notFound}`
  )
  return report
}

/**
 * Fetch our current EUR price (minor units) for a set of product ids via the
 * calculated-price engine. Returns a product_id → minor-units map; products
 * without a resolvable price are simply absent.
 */
async function fetchOurPrices(
  container: MedusaContainer,
  productIds: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (!productIds.length) return out
  const logger = container.resolve("logger")
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "variants.calculated_price.calculated_amount"],
      filters: { id: [...new Set(productIds)] },
      context: {
        variants: { calculated_price: QueryContext({ currency_code: "eur" }) },
      },
    })
    for (const p of data ?? []) {
      const amount = p.variants?.find(
        (v: any) => v?.calculated_price?.calculated_amount != null
      )?.calculated_price?.calculated_amount
      if (amount != null) out.set(p.id, Math.round(Number(amount) * 100))
    }
  } catch (e: any) {
    logger.warn(`[competitor-prices] our-price lookup failed: ${e?.message ?? e}`)
  }
  return out
}
