/**
 * Deterministic CATALOG enumerator — the catalog-discovery equivalent of the
 * price scrapers. Given a competitor's `catalog_parser` recipe (configured ONCE
 * by the discovery skill, just like `scraper_hints` for prices), it lists the
 * competitor's product pages (url + title) with no LLM, so the backend can crawl
 * each competitor's catalog on a schedule and feed new products to the matcher.
 *
 * Strategies (no cheerio needed — JSON + sitemap XML):
 *   - shopify : paginate `${base}/products.json` → exact titles + handles
 *   - sitemap : fetch the sitemap (following an index), filter product URLs,
 *               derive a title from the slug (optionally fetch each page's title)
 *
 * Pure: the HTTP fetcher is injected so it's testable offline.
 */

export type CatalogParser = {
  type: "shopify" | "sitemap"
  /** sitemap: explicit URL, else `${base}/sitemap.xml`. */
  sitemap_url?: string
  /** sitemap: only URLs containing this substring count as product pages. */
  product_url_match?: string
  /** sitemap: fetch each product page for an exact <title>/<h1> (slower). */
  fetch_titles?: boolean
  /** Hard cap on URLs enumerated per run. */
  max?: number
}

export type CatalogItem = { url: string; title: string }

export type FetchText = (url: string) => Promise<string>

const DEFAULT_MAX = 800
const SITEMAP_INDEX_LIMIT = 8 // child sitemaps to follow from an index

/** "/produto/suma-chlor-d4-4-5l/" → "suma chlor d4 4 5l". */
export function titleFromSlug(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "")
    const last = decodeURIComponent(path.split("/").pop() ?? "")
    return last
      .replace(/\.\w+$/, "") // strip extension
      .replace(/^\d+[-_]/, "") // strip a leading numeric id (PrestaShop "665-...")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  } catch {
    return ""
  }
}

const locs = (xml: string): string[] =>
  [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1])

async function enumShopify(
  base: string,
  fetchText: FetchText,
  max: number
): Promise<CatalogItem[]> {
  const items: CatalogItem[] = []
  for (let page = 1; page <= 40 && items.length < max; page++) {
    let products: any[] = []
    try {
      const raw = await fetchText(`${base}/products.json?limit=250&page=${page}`)
      products = JSON.parse(raw)?.products ?? []
    } catch {
      break
    }
    if (!products.length) break
    for (const p of products) {
      if (p?.handle && p?.title) {
        items.push({ url: `${base}/products/${p.handle}`, title: String(p.title) })
      }
    }
  }
  return items.slice(0, max)
}

async function enumSitemap(
  base: string,
  parser: CatalogParser,
  fetchText: FetchText,
  max: number
): Promise<CatalogItem[]> {
  const root = parser.sitemap_url || `${base}/sitemap.xml`
  let xml = ""
  try {
    xml = await fetchText(root)
  } catch {
    return []
  }

  // A sitemap index points at child sitemaps; follow a bounded number of them.
  let urls: string[]
  if (/<sitemapindex/i.test(xml)) {
    urls = []
    for (const child of locs(xml).slice(0, SITEMAP_INDEX_LIMIT)) {
      if (urls.length >= max * 2) break
      try {
        urls.push(...locs(await fetchText(child)))
      } catch {
        /* skip a bad child sitemap */
      }
    }
  } else {
    urls = locs(xml)
  }

  const match = parser.product_url_match
  const productUrls = [
    ...new Set(urls.filter((u) => (match ? u.includes(match) : true))),
  ].slice(0, max)

  if (!parser.fetch_titles) {
    return productUrls.map((url) => ({ url, title: titleFromSlug(url) }))
  }

  const items: CatalogItem[] = []
  for (const url of productUrls) {
    let title = titleFromSlug(url)
    try {
      const html = await fetchText(url)
      const m =
        html.match(/<h1[^>]*>([^<]{3,200})<\/h1>/i) ??
        html.match(/<title[^>]*>([^<]{3,200})<\/title>/i)
      if (m) title = m[1].replace(/\s+/g, " ").trim()
    } catch {
      /* keep the slug title */
    }
    items.push({ url, title })
  }
  return items
}

export async function enumerateCatalog(
  baseUrl: string,
  parser: CatalogParser,
  fetchText: FetchText
): Promise<CatalogItem[]> {
  if (!baseUrl || !parser?.type) return []
  const base = baseUrl.replace(/\/+$/, "")
  const max = parser.max ?? DEFAULT_MAX
  if (parser.type === "shopify") return enumShopify(base, fetchText, max)
  if (parser.type === "sitemap") return enumSitemap(base, parser, fetchText, max)
  return []
}
