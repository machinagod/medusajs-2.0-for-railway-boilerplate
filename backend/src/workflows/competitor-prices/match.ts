import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COMPETITOR_PRICES_MODULE } from "../../modules/competitor-prices"
import { matchListing, type CatalogItem } from "../../modules/competitor-prices/matching/fuzzy"

export interface MatchOptions {
  mappingIds?: string[]
  limit?: number
  /** Also re-run already-fuzzy (pending) mappings, not just unmatched ones. */
  rematch?: boolean
}

export interface MatchReport {
  considered: number
  confirmed: number
  fuzzy: number
  /** No product of ours matched — retained as competitor-only assortment data. */
  catalog_only: number
}

/**
 * Resolve competitor mappings to our catalog products via the fuzzy matcher
 * (EAN → SKU/ref → fuzzy title). The catalog is pulled from the product module
 * through Query, so this module stays decoupled. Matches at/above the
 * auto-confirm score become `confirmed`; weaker ones become `fuzzy` (pending
 * human review). The match detail is stored in `metadata.match`.
 */
export async function runCompetitorMatch(
  container: MedusaContainer,
  opts: MatchOptions = {}
): Promise<MatchReport> {
  const logger = container.resolve("logger")
  const svc: any = container.resolve(COMPETITOR_PRICES_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const catalog = await buildCatalog(query)
  logger.info(`[competitor-prices] match: catalog size ${catalog.length}`)

  const filters: Record<string, any> = opts.mappingIds?.length
    ? { id: opts.mappingIds }
    : {
        // Default: only freshly ingested (`unmatched`) rows. A rematch also
        // revisits `fuzzy` (pending review) and `catalog_only` rows — the latter
        // can newly match as our own catalog grows.
        match_status: opts.rematch ? ["unmatched", "fuzzy", "catalog_only"] : "unmatched",
      }

  const mappings: any[] = await svc.listCompetitorProducts(filters, {
    take: opts.limit ?? 500,
  })

  const report: MatchReport = {
    considered: mappings.length,
    confirmed: 0,
    fuzzy: 0,
    catalog_only: 0,
  }

  for (const m of mappings) {
    const candidate = matchListing(
      {
        title: m.title,
        brand: m.brand,
        sku: m.competitor_sku,
        ean: m.competitor_ean,
      },
      catalog
    )
    const status = await svc.applyMatch(m, candidate)
    report[status]++
  }

  logger.info(
    `[competitor-prices] match considered=${report.considered} confirmed=${report.confirmed} fuzzy=${report.fuzzy} catalog_only=${report.catalog_only}`
  )
  return report
}

/** Build a flat catalog index (id, sku, ean, brand, title) from the product module. */
async function buildCatalog(query: any): Promise<CatalogItem[]> {
  const items: CatalogItem[] = []
  const pageSize = 1000
  let offset = 0
  for (;;) {
    const { data } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "metadata",
        "variants.id",
        "variants.sku",
        "variants.ean",
        "variants.barcode",
      ],
      pagination: { take: pageSize, skip: offset },
    })
    if (!data?.length) break
    for (const p of data) {
      const v = p.variants?.[0]
      items.push({
        product_id: p.id,
        variant_id: v?.id ?? null,
        sku: v?.sku ?? null,
        ean: v?.ean ?? v?.barcode ?? null,
        brand: (p.metadata?.brand as string) ?? null,
        title: p.title,
      })
    }
    if (data.length < pageSize) break
    offset += pageSize
  }
  return items
}
