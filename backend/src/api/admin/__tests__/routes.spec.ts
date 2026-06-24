jest.mock("../../../workflows/competitor-prices/scrape", () => ({ runCompetitorScrape: jest.fn().mockResolvedValue({ scraped: 1 }) }))
jest.mock("../../../workflows/competitor-prices/match", () => ({ runCompetitorMatch: jest.fn().mockResolvedValue({ confirmed: 1 }) }))
jest.mock("../../../workflows/competitor-prices/discovery-catalog", () => ({ runCatalogDiscovery: jest.fn().mockResolvedValue({ c: 1 }) }))
jest.mock("../../../workflows/competitor-prices/discovery-product", () => ({ runProductDiscovery: jest.fn().mockResolvedValue({ p: 1 }) }))

import { GET as competitorsGET, POST as competitorsPOST } from "../competitors/route"
import { GET as cpGET, POST as cpPOST } from "../competitor-products/route"
import { GET as pwGET, POST as pwPOST } from "../product-watches/route"
import { POST as scrapePOST } from "../competitor-prices/scrape/route"
import { POST as matchPOST } from "../competitor-prices/match/route"
import { POST as discoverPOST } from "../competitor-prices/discover/route"
import { GET as dqBatchGET } from "../competitor-prices/discovery/next-batch/route"
import { POST as dqSubmitPOST } from "../competitor-prices/discovery/submit/route"
import { POST as dqSkipPOST } from "../competitor-prices/discovery/skip/route"
import { GET as dqStatsGET } from "../competitor-prices/discovery/stats/route"
import { GET as parserIssuesGET } from "../competitor-prices/discovery/parser-issues/route"
import { POST as fixParserPOST } from "../competitor-prices/discovery/fix-parser/route"
import { GET as catBatchGET } from "../competitor-prices/discovery/catalog/next-batch/route"
import { POST as catSubmitPOST } from "../competitor-prices/discovery/catalog/submit/route"
import { GET as catalogItemsGET } from "../competitor-prices/catalog-items/route"
import { GET as gapsGET } from "../competitor-prices/gaps/route"
import { GET as historyGET } from "../competitor-prices/price-history/route"
import { runCompetitorMatch } from "../../../workflows/competitor-prices/match"
import { runCompetitorScrape } from "../../../workflows/competitor-prices/scrape"
import { runCatalogDiscovery } from "../../../workflows/competitor-prices/discovery-catalog"
import { runProductDiscovery } from "../../../workflows/competitor-prices/discovery-product"

const makeRes = () => {
  const res: any = {}
  res.json = jest.fn().mockReturnValue(res)
  res.status = jest.fn().mockReturnValue(res)
  return res
}
const makeReq = (svc: any, body: any = {}, query: any = {}) => ({
  scope: { resolve: () => svc },
  body,
  query,
})

describe("admin routes", () => {
  it("GET/POST /admin/competitors", async () => {
    const svc = {
      listCompetitors: jest.fn().mockResolvedValue([{ id: "c" }, { id: "c2" }]),
      listCompetitorProducts: jest.fn().mockResolvedValue([
        { competitor_id: "c", prices: [{ status: "ok", price: 100 }] },
        { competitor_id: "c", prices: [] },
      ]),
      createCompetitors: jest.fn().mockResolvedValue({ id: "new" }),
    }
    const res1 = makeRes()
    await competitorsGET(makeReq(svc) as any, res1)
    const out = res1.json.mock.calls[0][0].competitors
    expect(out[0]).toMatchObject({ id: "c", mapping_count: 2, priced_count: 1 })
    expect(out[1]).toMatchObject({ id: "c2", mapping_count: 0, priced_count: 0 })

    const res2 = makeRes()
    await competitorsPOST(makeReq(svc, { name: "X", handle: "x" }) as any, res2)
    expect(res2.status).toHaveBeenCalledWith(201)
    expect(res2.json).toHaveBeenCalledWith({ competitor: { id: "new" } })
  })

  const cpReq = (svc: any, query: any, q: any = {}) => ({
    scope: { resolve: (n: string) => (n === "query" ? query : svc) },
    body: {},
    query: q,
  })

  it("GET /admin/competitor-products attaches latest price + our product map", async () => {
    const svc = {
      listCompetitorProducts: jest.fn().mockResolvedValue([
        { id: "m1", product_id: "p1", title: "Rival Item (2L)", competitor: {}, prices: [
          { price: 1, scraped_at: "2024-01-01" },
          { price: 2, scraped_at: "2024-02-01" },
        ] },
        { id: "m2", competitor: {}, prices: [] },
      ]),
    }
    const query = {
      graph: jest
        .fn()
        .mockResolvedValueOnce({
          data: [{ id: "p1", title: "Our Prod", variants: [{ id: "v1", sku: "S1", calculated_price: { calculated_amount: 82.17 } }] }],
        })
        .mockResolvedValueOnce({
          data: [
            { id: "pl1", title: "Moloni PVP2", prices: [{ amount: 70, currency_code: "eur", price_set: { variant: { id: "v1" } } }] },
            { id: "pl2", title: "Moloni Cost", prices: [{ amount: 55, currency_code: "eur", price_set: { variant: { id: "v1" } } }] },
          ],
        }),
    }
    const res = makeRes()
    await cpGET(cpReq(svc, query, { product_id: "p", competitor_id: "c", match_status: "confirmed" }) as any, res)
    expect(svc.listCompetitorProducts).toHaveBeenCalledWith(
      { product_id: "p", competitor_id: "c", match_status: "confirmed" },
      expect.objectContaining({ relations: ["competitor", "prices"] })
    )
    const payload = res.json.mock.calls[0][0]
    expect(payload.count).toBe(2)
    expect(payload.competitor_products[0].latest_price.price).toBe(2)
    expect(payload.competitor_products[1].latest_price).toBeNull()
    expect(payload.competitor_products[0].prices).toBeUndefined()
    // canonical €/base from the listing's own title: 2 ÷ 2L → 1 per L
    expect(payload.competitor_products[0]).toMatchObject({ base_unit: "L", unit_price: 1 })
    expect(payload.competitor_products[1]).toMatchObject({ base_unit: null, unit_price: null })
    expect(payload.products.p1).toMatchObject({ title: "Our Prod", sku: "S1", pvp1: 8217, pvp2: 7000, cost: 5500 })
  })

  it("GET /admin/competitor-products tolerates a product-price lookup failure", async () => {
    const svc = { listCompetitorProducts: jest.fn().mockResolvedValue([{ id: "m1", product_id: "p1", competitor: {}, prices: [] }]) }
    const query = { graph: jest.fn().mockRejectedValue(new Error("pricing down")) }
    const res = makeRes()
    await cpGET(cpReq(svc, query) as any, res)
    expect(res.json.mock.calls[0][0].products).toEqual({})
  })

  it("POST /admin/competitor-products", async () => {
    const svc = { createCompetitorProducts: jest.fn().mockResolvedValue({ id: "m" }) }
    const res = makeRes()
    await cpPOST(makeReq(svc, { competitor_id: "c", competitor_url: "u" }) as any, res)
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it("GET/POST /admin/product-watches", async () => {
    const svc = {
      listProductWatches: jest.fn().mockResolvedValue([{ id: "w" }]),
      createProductWatches: jest.fn().mockResolvedValue({ id: "w2" }),
    }
    const res1 = makeRes()
    await pwGET(makeReq(svc) as any, res1)
    expect(res1.json).toHaveBeenCalledWith({ product_watches: [{ id: "w" }] })
    const res2 = makeRes()
    await pwPOST(makeReq(svc, { product_id: "p" }) as any, res2)
    expect(res2.status).toHaveBeenCalledWith(201)
  })

  it("POST /admin/competitor-prices/scrape + /match", async () => {
    const res1 = makeRes()
    await scrapePOST(makeReq({}, { mapping_ids: ["a"], force: true }) as any, res1)
    expect(runCompetitorScrape).toHaveBeenCalledWith(expect.anything(), { mappingIds: ["a"], limit: undefined, force: true })
    expect(res1.json).toHaveBeenCalledWith({ report: { scraped: 1 } })

    const res2 = makeRes()
    await matchPOST(makeReq({}, { rematch: true }) as any, res2)
    expect(res2.json).toHaveBeenCalledWith({ report: { confirmed: 1 } })
  })

  it("POST /admin/competitor-prices/discover honours mode", async () => {
    const resBoth = makeRes()
    await discoverPOST(makeReq({}, {}) as any, resBoth)
    expect(runCatalogDiscovery).toHaveBeenCalled()
    expect(runProductDiscovery).toHaveBeenCalled()
    expect(resBoth.json.mock.calls[0][0]).toHaveProperty("catalog")
    expect(resBoth.json.mock.calls[0][0]).toHaveProperty("product")

    ;(runCatalogDiscovery as jest.Mock).mockClear()
    ;(runProductDiscovery as jest.Mock).mockClear()
    const resCat = makeRes()
    await discoverPOST(makeReq({}, { mode: "catalog" }) as any, resCat)
    expect(runCatalogDiscovery).toHaveBeenCalled()
    expect(runProductDiscovery).not.toHaveBeenCalled()

    ;(runCatalogDiscovery as jest.Mock).mockClear()
    const resProd = makeRes()
    await discoverPOST(makeReq({}, { mode: "product" }) as any, resProd)
    expect(runCatalogDiscovery).not.toHaveBeenCalled()
    expect(runProductDiscovery).toHaveBeenCalled()
  })

  it("tolerates a missing request body (defaults to {})", async () => {
    const svc = {
      createCompetitors: jest.fn().mockResolvedValue({}),
      createCompetitorProducts: jest.fn().mockResolvedValue({}),
      createProductWatches: jest.fn().mockResolvedValue({}),
    }
    const reqNoBody = (s: any) => ({ scope: { resolve: () => s }, query: {} })
    await competitorsPOST(reqNoBody(svc) as any, makeRes())
    await cpPOST(reqNoBody(svc) as any, makeRes())
    await pwPOST(reqNoBody(svc) as any, makeRes())
    await scrapePOST(reqNoBody({}) as any, makeRes())
    await matchPOST(reqNoBody({}) as any, makeRes())
    await discoverPOST(reqNoBody({}) as any, makeRes())
    expect(svc.createCompetitors).toHaveBeenCalledWith({})
  })

  it("competitor-products GET with no filters + descending price order", async () => {
    const svc = {
      listCompetitorProducts: jest.fn().mockResolvedValue([
        { id: "m1", competitor: {}, prices: [
          { price: 2, scraped_at: "2024-02-01" },
          { price: 1, scraped_at: "2024-01-01" }, // older — reduce keeps the newer
        ] },
      ]),
    }
    const res = makeRes()
    await cpGET({ scope: { resolve: () => svc }, body: {}, query: {} } as any, res)
    expect(svc.listCompetitorProducts).toHaveBeenCalledWith({}, expect.anything())
    expect(res.json.mock.calls[0][0].competitor_products[0].latest_price.price).toBe(2)
  })
})

describe("discovery queue routes", () => {
  it("GET /discovery/next-batch returns due watches + competitors", async () => {
    const svc = {
      listDueProductWatches: jest.fn().mockResolvedValue([
        { id: "w1", product_id: "p1", product_sku: "S1", title: "T1", brand: "B", ean: null },
      ]),
      listCompetitors: jest.fn().mockResolvedValue([
        { handle: "h", name: "N", base_url: "u", country: "PT", scraper_key: "generic-jsonld" },
      ]),
    }
    const res = makeRes()
    await dqBatchGET(makeReq(svc, {}, { limit: "5" }) as any, res)
    expect(svc.listDueProductWatches).toHaveBeenCalledWith(5, false)
    const out = res.json.mock.calls[0][0]
    expect(out.count).toBe(1)
    expect(out.watches[0]).toMatchObject({ watch_id: "w1", sku: "S1" })
    expect(out.competitors[0].handle).toBe("h")
  })

  it("POST /discovery/submit ingests listings and marks the watch discovered", async () => {
    const svc = {
      listProductWatches: jest.fn().mockResolvedValue([{ id: "w1", product_id: "p1" }]),
      ensureCompetitor: jest.fn().mockResolvedValue({ id: "c1" }),
      upsertDiscoveredMapping: jest.fn().mockResolvedValue({ id: "m1" }),
      markProductDiscovered: jest.fn().mockResolvedValue(undefined),
    }
    const res = makeRes()
    await dqSubmitPOST(
      makeReq(svc, {
        watch_id: "w1",
        listings: [
          { competitor_handle: "h", url: "http://x/p", confidence: 88 },
          { url: "http://no-handle" }, // skipped (no handle)
        ],
      }) as any,
      res
    )
    expect(svc.ensureCompetitor).toHaveBeenCalledTimes(1)
    expect(svc.upsertDiscoveredMapping).toHaveBeenCalledWith("c1", expect.objectContaining({ url: "http://x/p", confidence: 88 }), "p1")
    // created>0 → marked as a hit (resets the miss back-off)
    expect(svc.markProductDiscovered).toHaveBeenCalledWith({ id: "w1", product_id: "p1" }, { found: true })
    expect(res.json.mock.calls[0][0]).toMatchObject({ created: 1, skipped: 1 })
  })

  it("POST /discovery/submit 404s when the watch is unknown", async () => {
    const svc = { listProductWatches: jest.fn().mockResolvedValue([]) }
    const res = makeRes()
    await dqSubmitPOST(makeReq(svc, { product_id: "nope", listings: [] }) as any, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it("POST /discovery/skip marks the watch a miss and surfaces retire state", async () => {
    const svc = {
      listProductWatches: jest.fn().mockResolvedValue([{ id: "w1" }]),
      markProductDiscovered: jest.fn().mockResolvedValue({ misses: 3, retired: true }),
    }
    const res = makeRes()
    await dqSkipPOST(makeReq(svc, { watch_id: "w1" }) as any, res)
    expect(svc.markProductDiscovered).toHaveBeenCalledWith({ id: "w1" }, { found: false })
    expect(res.json.mock.calls[0][0]).toMatchObject({ skipped: true, consecutive_misses: 3, retired: true })
  })

  it("POST /discovery/skip 404s when unknown", async () => {
    const svc = { listProductWatches: jest.fn().mockResolvedValue([]) }
    const res = makeRes()
    await dqSkipPOST(makeReq(svc, {}) as any, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it("GET /discovery/parser-issues flags competitors whose parser yields no prices", async () => {
    const svc = {
      listCompetitors: jest.fn().mockResolvedValue([
        { id: "c1", handle: "broken", scraper_key: "config-selectors", scraper_hints: { price: ".x" } },
        { id: "c2", handle: "working" },
      ]),
      listCompetitorProducts: jest.fn().mockResolvedValue([
        { competitor_id: "c1", last_status: "not_found", last_error: "price not found", competitor_url: "http://b/1" },
        { competitor_id: "c1", last_status: "error", last_error: "boom", competitor_url: "http://b/2" },
        { competitor_id: "c2", last_status: "ok" },
        { competitor_id: "c2", last_status: "not_found" }, // has a success → not an issue
      ]),
    }
    const res = makeRes()
    await parserIssuesGET(makeReq(svc) as any, res)
    const out = res.json.mock.calls[0][0]
    expect(out.count).toBe(1)
    expect(out.issues[0]).toMatchObject({ competitor_handle: "broken", failing: 2 })
    expect(out.issues[0].sample_failures.length).toBe(2)
  })

  it("POST /discovery/fix-parser updates the recipe (and 404s if unknown)", async () => {
    const svc = {
      listCompetitors: jest.fn().mockResolvedValue([{ id: "c1", handle: "broken" }]),
      updateCompetitors: jest.fn().mockResolvedValue(undefined),
    }
    const res = makeRes()
    await fixParserPOST(
      makeReq(svc, { competitor_handle: "broken", scraper_key: "config-selectors", scraper_hints: { price: ".price" }, price_tax_basis: "excl", catalog_parser: { type: "sitemap", product_url_match: "/p/" } }) as any,
      res
    )
    expect(svc.updateCompetitors).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c1", scraper_key: "config-selectors", scraper_hints: { price: ".price" }, price_tax_basis: "excl", catalog_parser: { type: "sitemap", product_url_match: "/p/" } })
    )
    expect(res.json.mock.calls[0][0].updated).toEqual(expect.arrayContaining(["scraper_key", "scraper_hints", "price_tax_basis", "catalog_parser"]))

    const svc2 = { listCompetitors: jest.fn().mockResolvedValue([]) }
    const res2 = makeRes()
    await fixParserPOST(makeReq(svc2, { competitor_id: "nope" }) as any, res2)
    expect(res2.status).toHaveBeenCalledWith(404)
  })

  it("GET /discovery/stats aggregates counts", async () => {
    const svc = {
      listAndCountProductWatches: jest
        .fn()
        .mockResolvedValueOnce([[], 100]) // total
        .mockResolvedValueOnce([[], 12]), // due
      listAndCountCompetitorProducts: jest
        .fn()
        .mockResolvedValueOnce([[], 40]) // total mappings
        .mockResolvedValueOnce([[], 15]) // unmatched (transient)
        .mockResolvedValueOnce([[], 8]), // catalog_only
    }
    const res = makeRes()
    await dqStatsGET(makeReq(svc) as any, res)
    expect(res.json.mock.calls[0][0]).toMatchObject({
      total_watches: 100,
      due_watches: 12,
      total_mappings: 40,
      unmatched_mappings: 15,
      catalog_only_mappings: 8,
      matched_mappings: 17, // 40 - 15 - 8
    })
  })
})

describe("catalog (reverse) discovery routes", () => {
  it("GET /discovery/catalog/next-batch returns due competitors with known urls", async () => {
    const svc = {
      listDueCatalogCrawl: jest.fn().mockResolvedValue([
        { id: "c1", handle: "egi-pt", name: "EGI", base_url: "https://egi.com.pt", country: "PT", scraper_key: "generic-jsonld", scraper_hints: null },
      ]),
      listCompetitorProducts: jest.fn().mockResolvedValue([{ competitor_url: "u1" }, { competitor_url: "u2" }]),
    }
    const res = makeRes()
    await catBatchGET(makeReq(svc, {}, { limit: "3" }) as any, res)
    const payload = res.json.mock.calls[0][0]
    expect(svc.listDueCatalogCrawl).toHaveBeenCalledWith(3, false)
    expect(payload).toMatchObject({ count: 1 })
    expect(payload.competitors[0]).toMatchObject({ competitor_id: "c1", handle: "egi-pt", known_urls: ["u1", "u2"] })
  })

  it("POST /discovery/catalog/submit ingests listings, marks crawled, and runs the matcher", async () => {
    ;(runCompetitorMatch as jest.Mock).mockResolvedValueOnce({ considered: 1, confirmed: 1, fuzzy: 1, catalog_only: 0 })
    const svc = {
      listCompetitors: jest.fn().mockResolvedValue([{ id: "c1", handle: "egi-pt" }]),
      upsertDiscoveredMapping: jest.fn().mockResolvedValue({ id: "m1", match_status: "unmatched" }),
      markCatalogDiscovered: jest.fn().mockResolvedValue(undefined),
    }
    const res = makeRes()
    await catSubmitPOST(
      makeReq(svc, { competitor_handle: "egi-pt", listings: [{ url: "https://egi.com.pt/p1", title: "X" }, { title: "no url" }] }) as any,
      res
    )
    expect(svc.upsertDiscoveredMapping).toHaveBeenCalledTimes(1) // listing without url skipped
    expect(svc.markCatalogDiscovered).toHaveBeenCalledWith({ id: "c1", handle: "egi-pt" })
    expect(runCompetitorMatch).toHaveBeenCalledWith(expect.anything(), { mappingIds: ["m1"] })
    expect(res.json.mock.calls[0][0]).toMatchObject({ submitted: 2, created: 1, matched: 2 })
  })

  it("POST /discovery/catalog/submit 404s when the competitor is unknown", async () => {
    const svc = { listCompetitors: jest.fn().mockResolvedValue([]) }
    const res = makeRes()
    await catSubmitPOST(makeReq(svc, { competitor_id: "nope", listings: [] }) as any, res)
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it("POST /discovery/catalog/submit skips the matcher when nothing new was created", async () => {
    ;(runCompetitorMatch as jest.Mock).mockClear()
    const svc = {
      listCompetitors: jest.fn().mockResolvedValue([{ id: "c1", handle: "h" }]),
      upsertDiscoveredMapping: jest.fn().mockResolvedValue({ id: "dup", match_status: "confirmed" }), // existing, not unmatched
      markCatalogDiscovered: jest.fn().mockResolvedValue(undefined),
    }
    const res = makeRes()
    await catSubmitPOST(makeReq(svc, { competitor_id: "c1", listings: [{ url: "https://h/p" }] }) as any, res)
    expect(runCompetitorMatch).not.toHaveBeenCalled()
    expect(res.json.mock.calls[0][0]).toMatchObject({ created: 0, matched: 0 })
  })
})

describe("catalog-items (assortment-gap) viewer", () => {
  it("GET /catalog-items lists catalog_only mappings with competitor + paging", async () => {
    const svc = {
      listAndCountCompetitorProducts: jest.fn().mockResolvedValue([
        [
          {
            id: "m1",
            competitor_url: "https://egi.com.pt/x",
            title: "Rival 20L",
            brand: "Other",
            competitor_sku: "999",
            competitor_ean: null,
            competitor: { handle: "egi-pt", name: "EGI", country: "PT" },
            metadata: { discovered_at: "2026-06-25T00:00:00.000Z" },
          },
        ],
        1,
      ]),
    }
    const res = makeRes()
    await catalogItemsGET(makeReq(svc, {}, { limit: "10", offset: "5", competitor_id: "c1" }) as any, res)
    const [filters, config] = svc.listAndCountCompetitorProducts.mock.calls[0]
    expect(filters).toEqual({ match_status: "catalog_only", competitor_id: "c1" })
    expect(config).toMatchObject({ take: 10, skip: 5, relations: ["competitor"] })
    const payload = res.json.mock.calls[0][0]
    expect(payload).toMatchObject({ count: 1, limit: 10, offset: 5 })
    expect(payload.items[0]).toMatchObject({
      id: "m1",
      competitor_handle: "egi-pt",
      url: "https://egi.com.pt/x",
      title: "Rival 20L",
      discovered_at: "2026-06-25T00:00:00.000Z",
    })
  })

  it("GET /catalog-items defaults paging and omits the competitor filter", async () => {
    const svc = { listAndCountCompetitorProducts: jest.fn().mockResolvedValue([[], 0]) }
    const res = makeRes()
    await catalogItemsGET(makeReq(svc) as any, res)
    const [filters, config] = svc.listAndCountCompetitorProducts.mock.calls[0]
    expect(filters).toEqual({ match_status: "catalog_only" })
    expect(config).toMatchObject({ take: 50, skip: 0 })
    expect(res.json.mock.calls[0][0]).toMatchObject({ count: 0, items: [] })
  })
})

describe("competitor-prices gaps route", () => {
  const cpReq = (svc: any, query: any, q: any = {}) => ({
    scope: { resolve: (n: string) => (n === "query" ? query : svc) },
    body: {},
    query: q,
  })

  const gapsSvcQuery = () => ({
    svc: {
      listCompetitorProducts: jest.fn().mockResolvedValue([
        { product_id: "p1", title: "Rival (10L)", prices: [{ price: 8000, scraped_at: "2024-02-01" }] },
      ]),
    },
    query: {
      graph: jest
        .fn()
        .mockResolvedValueOnce({
          data: [{ id: "p1", title: "Our (10L)", variants: [{ id: "v1", sku: "S1", calculated_price: { calculated_amount: 100 } }] }],
        })
        .mockResolvedValueOnce({
          data: [
            { title: "Moloni PVP2", prices: [{ amount: 120, currency_code: "eur", price_set: { variant: { id: "v1" } } }] },
            { title: "Moloni Cost", prices: [{ amount: 50, currency_code: "eur", price_set: { variant: { id: "v1" } } }] },
          ],
        }),
    },
  })

  it("GET /admin/competitor-prices/gaps computes the €/L market position", async () => {
    const { svc, query } = gapsSvcQuery()
    const res = makeRes()
    await gapsGET(cpReq(svc, query) as any, res)
    expect(svc.listCompetitorProducts).toHaveBeenCalledWith(
      { match_status: ["confirmed", "fuzzy"] },
      expect.objectContaining({ relations: ["prices", "competitor"] })
    )
    const payload = res.json.mock.calls[0][0]
    expect(payload.count).toBe(1)
    // our PVP2 €/L = 1200, competitor "Rival (10L)" @ 8000 → 800/L → we're above market
    expect(payload.gaps[0]).toMatchObject({
      product_id: "p1",
      base_unit: "L",
      our_unit_price: 1200,
      position: "above",
      competitor: { count: 1, min: 800, median: 800, max: 800 },
      vs_median_pct: 50,
      below_cost: false,
    })
  })

  it("?position filters the rows", async () => {
    const { svc, query } = gapsSvcQuery()
    const res = makeRes()
    await gapsGET(cpReq(svc, query, { position: "below" }) as any, res)
    expect(res.json.mock.calls[0][0]).toMatchObject({ count: 0, gaps: [] })
  })
})

describe("competitor-prices price-history route", () => {
  it("GET /admin/competitor-prices/price-history returns ours + market series", async () => {
    const svc = {
      listProductPriceHistories: jest.fn().mockResolvedValue([
        { product_id: "p1", captured_at: "2024-01-01", pvp2: 7000, pvp1: 8000 },
        { product_id: "p1", captured_at: "2024-02-01", pvp2: null, pvp1: 8100 }, // pvp1 fallback
      ]),
      listCompetitorProducts: jest.fn().mockResolvedValue([
        { product_id: "p1", prices: [
          { unit_price: 6800, scraped_at: "2024-01-15" },
          { unit_price: null, scraped_at: "2024-01-16" }, // skipped
        ] },
        { product_id: null, prices: [{ unit_price: 100, scraped_at: "x" }] }, // no product → skipped
      ]),
    }
    const res = makeRes()
    await historyGET({ scope: { resolve: () => svc }, query: { product_ids: "p1" } } as any, res)
    expect(svc.listProductPriceHistories).toHaveBeenCalledWith({ product_id: ["p1"] }, expect.anything())
    const payload = res.json.mock.calls[0][0]
    expect(payload.count).toBe(1)
    expect(payload.history.p1.ours).toEqual([
      [new Date("2024-01-01").getTime(), 7000],
      [new Date("2024-02-01").getTime(), 8100],
    ])
    expect(payload.history.p1.market).toEqual([[new Date("2024-01-15").getTime(), 6800]])
  })

  it("defaults to matched mappings when no ids are given", async () => {
    const svc = {
      listProductPriceHistories: jest.fn().mockResolvedValue([]),
      listCompetitorProducts: jest.fn().mockResolvedValue([]),
    }
    const res = makeRes()
    await historyGET({ scope: { resolve: () => svc }, query: {} } as any, res)
    expect(svc.listProductPriceHistories).toHaveBeenCalledWith({}, expect.anything())
    expect(svc.listCompetitorProducts).toHaveBeenCalledWith(
      { match_status: ["confirmed", "fuzzy"] },
      expect.objectContaining({ relations: ["prices", "competitor"] })
    )
    expect(res.json.mock.calls[0][0]).toMatchObject({ count: 0 })
  })
})
