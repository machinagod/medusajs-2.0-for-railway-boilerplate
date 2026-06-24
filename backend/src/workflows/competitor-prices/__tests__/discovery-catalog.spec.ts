jest.mock("../../../modules/competitor-prices/scrapers/catalog", () => ({
  enumerateCatalog: jest.fn(),
}))
jest.mock("../match", () => ({ runCompetitorMatch: jest.fn().mockResolvedValue({}) }))

import { runCatalogDiscovery, fetchText } from "../discovery-catalog"
import { enumerateCatalog } from "../../../modules/competitor-prices/scrapers/catalog"
import { runCompetitorMatch } from "../match"

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
const makeSvc = (over: any = {}) => ({
  listDueCatalogCrawl: jest.fn().mockResolvedValue([]),
  listCompetitors: jest.fn().mockResolvedValue([]),
  listCompetitorProducts: jest.fn().mockResolvedValue([]),
  upsertDiscoveredMapping: jest.fn(),
  markCatalogDiscovered: jest.fn().mockResolvedValue(undefined),
  ...over,
})
const container = (svc: any) => ({ resolve: (n: string) => (n === "logger" ? logger : svc) })

describe("runCatalogDiscovery (deterministic)", () => {
  beforeEach(() => jest.clearAllMocks())

  it("skips competitors without a catalog_parser recipe", async () => {
    const svc = makeSvc({
      listDueCatalogCrawl: jest
        .fn()
        .mockResolvedValue([{ id: "c1", handle: "x", base_url: "https://x", catalog_parser: null }]),
    })
    const r = await runCatalogDiscovery(container(svc) as any, {})
    expect(r).toMatchObject({ considered: 0, crawled: 0, newListings: 0 })
    expect(enumerateCatalog).not.toHaveBeenCalled()
  })

  it("enumerates, ingests only NEW urls, and runs the matcher", async () => {
    const svc = makeSvc({
      listDueCatalogCrawl: jest.fn().mockResolvedValue([
        { id: "c1", handle: "egi", base_url: "https://egi.pt", catalog_parser: { type: "sitemap" } },
      ]),
      listCompetitorProducts: jest.fn().mockResolvedValue([{ competitor_url: "https://egi.pt/p/known" }]),
      upsertDiscoveredMapping: jest.fn((_cid: string, l: any) => ({ id: `m_${l.url}`, match_status: "unmatched" })),
    })
    ;(enumerateCatalog as jest.Mock).mockResolvedValue([
      { url: "https://egi.pt/p/known", title: "Known" }, // skipped — already tracked
      { url: "https://egi.pt/p/new1", title: "Suma (5L)" },
      { url: "https://egi.pt/p/new2", title: "Clax (20L)" },
    ])
    const r = await runCatalogDiscovery(container(svc) as any, {})
    expect(r).toMatchObject({ considered: 1, crawled: 1, newListings: 2 })
    expect(svc.upsertDiscoveredMapping).toHaveBeenCalledTimes(2)
    expect(svc.markCatalogDiscovered).toHaveBeenCalled()
    expect(runCompetitorMatch).toHaveBeenCalledWith(expect.anything(), {
      mappingIds: ["m_https://egi.pt/p/new1", "m_https://egi.pt/p/new2"],
    })
  })

  it("marks the competitor crawled and continues when enumerate throws", async () => {
    const svc = makeSvc({
      listDueCatalogCrawl: jest
        .fn()
        .mockResolvedValue([{ id: "c1", handle: "x", base_url: "https://x", catalog_parser: { type: "sitemap" } }]),
    })
    ;(enumerateCatalog as jest.Mock).mockRejectedValue(new Error("boom"))
    const r = await runCatalogDiscovery(container(svc) as any, {})
    expect(r).toMatchObject({ considered: 1, crawled: 0 })
    expect(svc.markCatalogDiscovered).toHaveBeenCalled()
    expect(runCompetitorMatch).not.toHaveBeenCalled()
  })

  it("targets explicit competitorIds when given", async () => {
    const svc = makeSvc({ listCompetitors: jest.fn().mockResolvedValue([]) })
    await runCatalogDiscovery(container(svc) as any, { competitorIds: ["c1"] })
    expect(svc.listCompetitors).toHaveBeenCalledWith({ id: ["c1"] })
    expect(svc.listDueCatalogCrawl).not.toHaveBeenCalled()
  })
})

describe("fetchText", () => {
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
  })
  it("returns the body on 2xx", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => "<xml/>" }) as any
    expect(await fetchText("https://x/sitemap.xml")).toBe("<xml/>")
  })
  it("throws on a non-2xx response", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as any
    await expect(fetchText("https://x/sitemap.xml")).rejects.toThrow("HTTP 503")
  })
})
