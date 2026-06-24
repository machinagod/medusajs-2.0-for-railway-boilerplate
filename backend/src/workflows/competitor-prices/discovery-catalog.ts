import type { MedusaContainer } from "@medusajs/framework/types"
import { COMPETITOR_PRICES_MODULE } from "../../modules/competitor-prices"
import { enumerateCatalog } from "../../modules/competitor-prices/scrapers/catalog"
import { runCompetitorMatch } from "./match"

export interface CatalogDiscoveryOptions {
  competitorIds?: string[]
  limit?: number
  force?: boolean
}

export interface CatalogDiscoveryReport {
  considered: number
  crawled: number
  newListings: number
}

/** Polite, bounded fetch of a catalog/sitemap/products.json resource. */
export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; HigitotalCatalogBot/1.0)" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

/**
 * DETERMINISTIC catalog discovery — for each due competitor that has a
 * `catalog_parser` recipe, enumerate its product pages with no LLM (Shopify
 * products.json / sitemap), create unmatched mappings for the new URLs, and run
 * the matcher. The discovery skill's job is only to CONFIGURE the catalog_parser
 * once (like it configures the price scraper); this then runs on a schedule.
 * Competitors without a catalog_parser are skipped (the skill hasn't set one yet).
 */
export async function runCatalogDiscovery(
  container: MedusaContainer,
  opts: CatalogDiscoveryOptions = {}
): Promise<CatalogDiscoveryReport> {
  const logger = container.resolve("logger")
  const svc: any = container.resolve(COMPETITOR_PRICES_MODULE)

  const competitors: any[] = opts.competitorIds?.length
    ? await svc.listCompetitors({ id: opts.competitorIds })
    : await svc.listDueCatalogCrawl(opts.limit, opts.force)

  const report: CatalogDiscoveryReport = { considered: 0, crawled: 0, newListings: 0 }
  const newIds: string[] = []

  for (const c of competitors) {
    if (!c.catalog_parser || !c.base_url) continue // needs a recipe to crawl deterministically
    report.considered++

    let items: { url: string; title: string }[] = []
    try {
      items = await enumerateCatalog(c.base_url, c.catalog_parser, fetchText)
    } catch (e: any) {
      logger.warn(`[competitor-prices] catalog enumerate(${c.handle}) failed: ${e?.message ?? e}`)
      await svc.markCatalogDiscovered(c)
      continue
    }

    const known = new Set(
      (await svc.listCompetitorProducts({ competitor_id: c.id }, { take: 5000 }))
        .map((k: any) => k.competitor_url)
        .filter(Boolean)
    )

    let created = 0
    for (const it of items) {
      if (known.has(it.url)) continue
      const mapping = await svc.upsertDiscoveredMapping(c.id, { url: it.url, title: it.title })
      if (mapping?.match_status === "unmatched") {
        created++
        if (mapping.id) newIds.push(mapping.id)
      }
    }

    report.crawled++
    report.newListings += created
    await svc.markCatalogDiscovered(c)
    logger.info(
      `[competitor-prices] catalog ${c.handle}: ${items.length} listed, ${created} new`
    )
  }

  if (newIds.length) await runCompetitorMatch(container, { mappingIds: newIds })

  logger.info(
    `[competitor-prices] catalog discovery: considered=${report.considered} crawled=${report.crawled} new=${report.newListings}`
  )
  return report
}
