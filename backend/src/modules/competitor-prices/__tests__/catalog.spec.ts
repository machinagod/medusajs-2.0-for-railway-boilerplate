import { enumerateCatalog, titleFromSlug, type FetchText } from "../scrapers/catalog"

const fetcher = (map: Record<string, string>): FetchText => async (url) => {
  if (url in map) return map[url]
  throw new Error(`404 ${url}`)
}

describe("titleFromSlug", () => {
  it("de-slugifies the last path segment and strips a leading id", () => {
    expect(titleFromSlug("https://s.com/produto/suma-chlor-d4-4-5l/")).toBe("suma chlor d4 4 5l")
    expect(titleFromSlug("https://s.com/aditivos/665-clax-build-12b1-20l.html")).toBe("clax build 12b1 20l")
  })
  it("returns '' for an unparseable url", () => {
    expect(titleFromSlug("not a url")).toBe("")
  })
})

describe("enumerateCatalog — guards", () => {
  const noop: FetchText = async () => ""
  it("returns [] for a missing base url or parser type", async () => {
    expect(await enumerateCatalog("", { type: "sitemap" }, noop)).toEqual([])
    expect(await enumerateCatalog("https://x", { type: undefined as any }, noop)).toEqual([])
  })
})

describe("enumerateCatalog — shopify", () => {
  it("paginates products.json into url + exact title, stopping at the empty page", async () => {
    const base = "https://shop.pt"
    const f = fetcher({
      [`${base}/products.json?limit=250&page=1`]: JSON.stringify({
        products: [
          { handle: "suma-chlor-5l", title: "Suma Chlor D4.4 5L" },
          { handle: "no-title" }, // dropped (no title)
          { title: "no handle" }, // dropped (no handle)
        ],
      }),
      [`${base}/products.json?limit=250&page=2`]: JSON.stringify({ products: [] }),
    })
    const items = await enumerateCatalog(base + "/", { type: "shopify" }, f)
    expect(items).toEqual([{ url: `${base}/products/suma-chlor-5l`, title: "Suma Chlor D4.4 5L" }])
  })
})

describe("enumerateCatalog — sitemap", () => {
  const base = "https://store.es"
  const sitemap = `<?xml version="1.0"?><urlset>
    <url><loc>${base}/producto/suma-chlor-5l</loc></url>
    <url><loc>${base}/producto/clax-build-20l</loc></url>
    <url><loc>${base}/categoria/limpieza</loc></url>
    <url><loc>${base}/producto/suma-chlor-5l</loc></url>
  </urlset>`

  it("filters product URLs and derives slug titles", async () => {
    const items = await enumerateCatalog(
      base,
      { type: "sitemap", product_url_match: "/producto/" },
      fetcher({ [`${base}/sitemap.xml`]: sitemap })
    )
    expect(items).toEqual([
      { url: `${base}/producto/suma-chlor-5l`, title: "suma chlor 5l" },
      { url: `${base}/producto/clax-build-20l`, title: "clax build 20l" },
    ]) // category URL excluded, duplicate deduped
  })

  it("parses CDATA-wrapped <loc> URLs and ignores <image:loc>", async () => {
    const cdata = `<?xml version="1.0"?><urlset>
      <url><loc><![CDATA[${base}/producto/suma-5l]]></loc>
        <image:image><image:loc>${base}/img/suma.jpg</image:loc></image:image></url>
      <url><loc>\n  ${base}/producto/clax-20l\n  </loc></url>
    </urlset>`
    const items = await enumerateCatalog(
      base,
      { type: "sitemap", product_url_match: "/producto/" },
      fetcher({ [`${base}/sitemap.xml`]: cdata })
    )
    expect(items.map((i) => i.url)).toEqual([
      `${base}/producto/suma-5l`, // CDATA unwrapped; the image:loc is not picked up
      `${base}/producto/clax-20l`, // surrounding whitespace trimmed
    ])
  })

  it("decodes XML entities in child-sitemap URLs before following them", async () => {
    // PrestaShop/Magento often link query-param children with `&amp;`.
    const index = `<sitemapindex><sitemap><loc>${base}/sitemap.xml?m=products&amp;lang=pt</loc></sitemap></sitemapindex>`
    const items = await enumerateCatalog(
      base,
      { type: "sitemap", product_url_match: "/producto/" },
      fetcher({
        [`${base}/sitemap.xml`]: index,
        [`${base}/sitemap.xml?m=products&lang=pt`]: sitemap, // fetched only if `&amp;` was decoded
      })
    )
    expect(items.map((i) => i.url)).toEqual([
      `${base}/producto/suma-chlor-5l`,
      `${base}/producto/clax-build-20l`,
    ])
  })

  it("prioritises product child-sitemaps over tag/category/cms in a large index", async () => {
    // Product sitemap appears LAST in document order, behind noise children.
    const children = [
      `${base}/sitemap-producttags-1.xml`, // tag → ranked last
      `${base}/sitemap-category.xml`, // category → ranked last
      `${base}/sitemap-cms.xml`, // cms → low
      `${base}/sitemap-main.xml`, // neutral
      `${base}/sitemap-products.xml`, // product → ranked first
    ]
    const index = `<sitemapindex>${children.map((c) => `<sitemap><loc>${c}</loc></sitemap>`).join("")}</sitemapindex>`
    const items = await enumerateCatalog(
      base,
      { type: "sitemap", product_url_match: "/producto/" },
      // only the product child resolves; the noise children would 404 (skipped)
      fetcher({ [`${base}/sitemap.xml`]: index, [`${base}/sitemap-products.xml`]: sitemap })
    )
    expect(items.map((i) => i.url)).toEqual([
      `${base}/producto/suma-chlor-5l`,
      `${base}/producto/clax-build-20l`,
    ])
  })

  it("follows a sitemap index", async () => {
    const index = `<sitemapindex><sitemap><loc>${base}/sm-products.xml</loc></sitemap></sitemapindex>`
    const items = await enumerateCatalog(
      base,
      { type: "sitemap", sitemap_url: `${base}/sitemap_index.xml`, product_url_match: "/producto/" },
      fetcher({ [`${base}/sitemap_index.xml`]: index, [`${base}/sm-products.xml`]: sitemap })
    )
    expect(items.map((i) => i.url)).toEqual([
      `${base}/producto/suma-chlor-5l`,
      `${base}/producto/clax-build-20l`,
    ])
  })

  it("fetches an exact title from the product page when fetch_titles is set", async () => {
    const items = await enumerateCatalog(
      base,
      { type: "sitemap", product_url_match: "/producto/", fetch_titles: true },
      fetcher({
        [`${base}/sitemap.xml`]: `<urlset><url><loc>${base}/producto/x</loc></url></urlset>`,
        [`${base}/producto/x`]: "<html><h1>Suma Chlor D4.4 5L (garrafa)</h1></html>",
      })
    )
    expect(items[0].title).toBe("Suma Chlor D4.4 5L (garrafa)")
  })

  it("fetch_titles falls back to <title>, then to the slug when a page fails", async () => {
    const items = await enumerateCatalog(
      base,
      { type: "sitemap", product_url_match: "/producto/", fetch_titles: true },
      fetcher({
        [`${base}/sitemap.xml`]: `<urlset><url><loc>${base}/producto/a</loc></url><url><loc>${base}/producto/b</loc></url></urlset>`,
        [`${base}/producto/a`]: "<html><title>Suma A 5L</title></html>", // no h1 → <title>
        // /producto/b absent → fetch throws → keep slug "b"
      })
    )
    expect(items).toEqual([
      { url: `${base}/producto/a`, title: "Suma A 5L" },
      { url: `${base}/producto/b`, title: "b" },
    ])
  })

  it("returns [] on an unreachable sitemap or unknown type", async () => {
    expect(await enumerateCatalog(base, { type: "sitemap" }, fetcher({}))).toEqual([])
    expect(await enumerateCatalog(base, { type: "x" as any }, fetcher({}))).toEqual([])
  })

  it("returns all urls when no product_url_match is set", async () => {
    const items = await enumerateCatalog(base, { type: "sitemap" }, fetcher({ [`${base}/sitemap.xml`]: sitemap }))
    expect(items.map((i) => i.url)).toEqual([
      `${base}/producto/suma-chlor-5l`,
      `${base}/producto/clax-build-20l`,
      `${base}/categoria/limpieza`,
    ])
  })

  it("skips a child sitemap that fails to load (index)", async () => {
    const index = `<sitemapindex><sitemap><loc>${base}/ok.xml</loc></sitemap><sitemap><loc>${base}/broken.xml</loc></sitemap></sitemapindex>`
    const items = await enumerateCatalog(
      base,
      { type: "sitemap", product_url_match: "/producto/" },
      fetcher({ [`${base}/sitemap.xml`]: index, [`${base}/ok.xml`]: sitemap }) // broken.xml absent → throws, skipped
    )
    expect(items.length).toBe(2)
  })
})

describe("enumerateCatalog — shopify guards", () => {
  it("stops cleanly on a malformed products.json page", async () => {
    const base = "https://shop.pt"
    const items = await enumerateCatalog(base, { type: "shopify" }, fetcher({
      [`${base}/products.json?limit=250&page=1`]: "not json",
    }))
    expect(items).toEqual([])
  })

  it("stops on a products.json page with no products array", async () => {
    const base = "https://shop.pt"
    const items = await enumerateCatalog(base, { type: "shopify" }, fetcher({
      [`${base}/products.json?limit=250&page=1`]: "{}", // valid JSON, no `products` → []
    }))
    expect(items).toEqual([])
  })
})
