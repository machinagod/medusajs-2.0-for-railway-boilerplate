import Service from "../service"

const OPTS = {
  baseIntervalSeconds: 1000,
  minIntervalSeconds: 100,
  maxIntervalSeconds: 10000,
  backoffFactor: 2,
  stableFactor: 1.5,
  jitterRatio: 0, // deterministic schedules
  batchSize: 7,
  concurrency: 4,
  autoConfirmScore: 90,
  productDiscoveryIntervalSeconds: 5000,
  catalogDiscoveryIntervalSeconds: 3000,
}

const STUBS = [
  "createCompetitorPrices",
  "updateCompetitorProducts",
  "listCompetitorProducts",
  "listCompetitors",
  "createCompetitors",
  "updateCompetitors",
  "listProductWatches",
  "createProductWatches",
  "updateProductWatches",
] as const

function makeSvc(opts: any = OPTS) {
  const svc: any = new Service({}, opts)
  for (const m of STUBS) svc[m] = jest.fn().mockResolvedValue(undefined)
  return svc
}

const NOW = 1_700_000_000_000
beforeEach(() => jest.spyOn(Date, "now").mockReturnValue(NOW))
afterEach(() => jest.restoreAllMocks())

describe("config + base interval", () => {
  it("merges defaults", () => {
    expect(new Service({}, {}).getConfig().baseIntervalSeconds).toBe(86400)
  })
  it("works without an options argument", () => {
    expect(new Service({}).getConfig().backoffFactor).toBe(2)
  })
  it("resolves base interval mapping → competitor → global", () => {
    const svc = makeSvc()
    expect(svc.resolveBaseInterval({ refresh_interval_seconds: 200 })).toBe(200)
    expect(svc.resolveBaseInterval({ competitor: { refresh_interval_seconds: 300 } })).toBe(300)
    expect(svc.resolveBaseInterval({})).toBe(1000)
  })
})

describe("nextSchedule", () => {
  const svc = makeSvc()
  const at = (s: number) => new Date(NOW + s * 1000)

  it("backs off on error", () => {
    expect(svc.nextSchedule({ prevInterval: 200, base: 1000, outcome: "error" })).toEqual({ interval: 400, at: at(400) })
  })
  it("resets to base on change", () => {
    expect(svc.nextSchedule({ prevInterval: 200, base: 1000, outcome: "changed" })).toEqual({ interval: 1000, at: at(1000) })
  })
  it("eases off while unchanged", () => {
    expect(svc.nextSchedule({ prevInterval: 200, base: 1000, outcome: "unchanged" })).toEqual({ interval: 300, at: at(300) })
  })
  it("uses base when there is no previous interval", () => {
    expect(svc.nextSchedule({ prevInterval: null, base: 1000, outcome: "unchanged" }).interval).toBe(1500)
  })
  it("clamps to [min, max]", () => {
    expect(svc.nextSchedule({ prevInterval: 9000, base: 1000, outcome: "error" }).interval).toBe(10000)
    expect(svc.nextSchedule({ prevInterval: 50, base: 1000, outcome: "unchanged" }).interval).toBe(100)
  })
})

describe("listDue* filters", () => {
  it("listDueMappings builds the due filter (force toggles $or)", async () => {
    const svc = makeSvc()
    svc.listCompetitorProducts.mockResolvedValue([])
    await svc.listDueMappings(5)
    let [filters, config] = svc.listCompetitorProducts.mock.calls[0]
    expect(filters.is_active).toBe(true)
    expect(filters.$or).toHaveLength(2)
    expect(config).toMatchObject({ take: 5, relations: ["competitor"], order: { next_scrape_at: "ASC" } })

    await svc.listDueMappings(undefined, true)
    ;[filters, config] = svc.listCompetitorProducts.mock.calls[1]
    expect(filters.$or).toBeUndefined()
    expect(config.take).toBe(7) // batchSize default
  })

  it("listDueCatalogDiscovery requires enabled + builds due filter", async () => {
    const svc = makeSvc()
    svc.listCompetitors.mockResolvedValue([])
    await svc.listDueCatalogDiscovery()
    const [filters] = svc.listCompetitors.mock.calls[0]
    expect(filters).toMatchObject({ is_active: true, catalog_discovery_enabled: true })
    expect(filters.$or).toHaveLength(2)
    await svc.listDueCatalogDiscovery(3, true)
    expect(svc.listCompetitors.mock.calls[1][0].$or).toBeUndefined()
  })

  it("listDueProductWatches builds due filter", async () => {
    const svc = makeSvc()
    svc.listProductWatches.mockResolvedValue([])
    await svc.listDueProductWatches()
    expect(svc.listProductWatches.mock.calls[0][0].$or).toHaveLength(2)
    await svc.listDueProductWatches(2, true)
    expect(svc.listProductWatches.mock.calls[1][0].$or).toBeUndefined()
  })
})

describe("recordObservation", () => {
  const base = {
    id: "m",
    last_price: 500,
    consecutive_failures: 0,
    consecutive_unchanged: 2,
    current_interval_seconds: 200,
    competitor: {},
    title: null,
    brand: null,
    competitor_sku: null,
    competitor_ean: null,
  }

  it("records an unchanged observation and eases off + enriches missing fields", async () => {
    const svc = makeSvc()
    const outcome = await svc.recordObservation(base, {
      status: "ok",
      price: 500,
      currencyCode: "EUR",
      title: "Disc Title",
    })
    expect(outcome).toBe("unchanged")
    expect(svc.createCompetitorPrices).toHaveBeenCalledWith(
      expect.objectContaining({ competitor_product_id: "m", price: 500, status: "ok" })
    )
    const upd = svc.updateCompetitorProducts.mock.calls[0][0]
    expect(upd).toMatchObject({
      id: "m",
      consecutive_unchanged: 3,
      consecutive_failures: 0,
      current_interval_seconds: 300,
      last_price: 500,
      last_status: "ok",
      last_error: null,
      title: "Disc Title",
    })
  })

  it("snapshots our price on the observation", async () => {
    const svc = makeSvc()
    await svc.recordObservation(base, { status: "ok", price: 600 }, 8217)
    expect(svc.createCompetitorPrices).toHaveBeenCalledWith(
      expect.objectContaining({ price: 600, our_price: 8217 })
    )
  })

  it("detects a price change and resets cadence", async () => {
    const svc = makeSvc()
    const outcome = await svc.recordObservation(base, { status: "ok", price: 600 })
    expect(outcome).toBe("changed")
    expect(svc.updateCompetitorProducts.mock.calls[0][0]).toMatchObject({
      last_price: 600,
      current_interval_seconds: 1000,
      consecutive_unchanged: 0,
    })
  })

  it("backs off on error, records the reason, and inserts NO price row", async () => {
    const svc = makeSvc()
    const outcome = await svc.recordObservation(base, { status: "error", errorMessage: "boom" })
    expect(outcome).toBe("error")
    expect(svc.createCompetitorPrices).not.toHaveBeenCalled() // no record on failure
    const upd = svc.updateCompetitorProducts.mock.calls[0][0]
    expect(upd).toMatchObject({
      consecutive_failures: 1,
      current_interval_seconds: 400,
      last_status: "error",
      last_error: "boom",
    })
    expect(upd.last_price).toBeUndefined()
  })

  it("normalizes the listing price by pack_units into unit_price", async () => {
    const svc = makeSvc()
    await svc.recordObservation({ ...base, pack_units: 2 }, { status: "ok", price: 6677 })
    expect(svc.createCompetitorPrices).toHaveBeenCalledWith(
      expect.objectContaining({ price: 6677, unit_price: 3339 })
    )
  })

  it("defaults pack_units to 1 (unit_price == price); zero pack_units is treated as 1", async () => {
    const svc = makeSvc()
    await svc.recordObservation(base, { status: "ok", price: 500 })
    expect(svc.createCompetitorPrices).toHaveBeenCalledWith(
      expect.objectContaining({ price: 500, unit_price: 500 })
    )
    svc.createCompetitorPrices.mockClear()
    await svc.recordObservation({ ...base, pack_units: 0 }, { status: "ok", price: 900 })
    expect(svc.createCompetitorPrices).toHaveBeenCalledWith(
      expect.objectContaining({ price: 900, unit_price: 900 })
    )
  })

  it("treats a null price as unchanged and never overwrites curated fields", async () => {
    const svc = makeSvc()
    const mapping = { ...base, title: "Kept", price: undefined }
    const outcome = await svc.recordObservation(mapping, { status: "ok", price: null, title: "New" })
    expect(outcome).toBe("unchanged")
    const upd = svc.updateCompetitorProducts.mock.calls[0][0]
    expect(upd.last_price).toBeUndefined()
    expect(upd.title).toBeUndefined()
  })
})

describe("applyMatch", () => {
  it("clears to unmatched with no candidate", async () => {
    const svc = makeSvc()
    expect(await svc.applyMatch({ id: "m" }, null)).toBe("unmatched")
    expect(svc.updateCompetitorProducts).toHaveBeenCalledWith({ id: "m", match_status: "unmatched" })
  })

  it("confirms a strong candidate and stores match metadata", async () => {
    const svc = makeSvc()
    const status = await svc.applyMatch(
      { id: "m", metadata: { keep: 1 } },
      { product_id: "p", variant_id: "v", sku: "S", score: 95, method: "ean" }
    )
    expect(status).toBe("confirmed")
    const upd = svc.updateCompetitorProducts.mock.calls[0][0]
    expect(upd).toMatchObject({ product_id: "p", match_status: "confirmed", match_method: "ean", match_score: 95 })
    expect(upd.metadata.keep).toBe(1)
    expect(upd.metadata.match).toMatchObject({ product_id: "p", method: "ean" })
  })

  it("marks a weak candidate as fuzzy", async () => {
    const svc = makeSvc()
    const status = await svc.applyMatch({ id: "m" }, { product_id: "p", score: 70, method: "fuzzy" })
    expect(status).toBe("fuzzy")
  })
})

describe("discovery scheduling + upserts", () => {
  it("markCatalogDiscovered uses the competitor interval or global default", async () => {
    const svc = makeSvc()
    await svc.markCatalogDiscovered({ id: "c", catalog_discovery_interval_seconds: 60 })
    expect(svc.updateCompetitors.mock.calls[0][0]).toMatchObject({
      id: "c",
      next_catalog_discovery_at: new Date(NOW + 60 * 1000),
    })
    await svc.markCatalogDiscovered({ id: "c2" })
    expect(svc.updateCompetitors.mock.calls[1][0].next_catalog_discovery_at).toEqual(new Date(NOW + 3000 * 1000))
  })

  it("markProductDiscovered uses the watch interval or global default", async () => {
    const svc = makeSvc()
    await svc.markProductDiscovered({ id: "w" })
    expect(svc.updateProductWatches.mock.calls[0][0].next_discovery_at).toEqual(new Date(NOW + 5000 * 1000))
  })

  it("ensureCompetitor returns the existing one or creates it", async () => {
    const svc = makeSvc()
    svc.listCompetitors.mockResolvedValueOnce([{ id: "exists" }])
    expect(await svc.ensureCompetitor({ handle: "h" })).toEqual({ id: "exists" })
    expect(svc.createCompetitors).not.toHaveBeenCalled()

    svc.listCompetitors.mockResolvedValueOnce([])
    svc.createCompetitors.mockResolvedValueOnce({ id: "new" })
    expect(await svc.ensureCompetitor({ handle: "h2", name: "N" })).toEqual({ id: "new" })
  })

  it("upsertDiscoveredMapping handles no-url / existing / confirmed / unmatched", async () => {
    const svc = makeSvc()
    expect(await svc.upsertDiscoveredMapping("c", {})).toBeNull()

    svc.listCompetitorProducts.mockResolvedValueOnce([{ id: "existing" }])
    expect(await svc.upsertDiscoveredMapping("c", { url: "u" })).toEqual({ id: "existing" })

    svc.listCompetitorProducts.mockResolvedValue([])
    svc.createCompetitorProducts = jest.fn().mockResolvedValue({ id: "m1", match_status: "confirmed" })
    await svc.upsertDiscoveredMapping("c", { url: "u2", confidence: 88 }, "prod1")
    expect(svc.createCompetitorProducts.mock.calls[0][0]).toMatchObject({
      product_id: "prod1",
      match_status: "confirmed",
      match_method: "discovery",
      match_score: 88,
    })

    await svc.upsertDiscoveredMapping("c", { url: "u3" })
    expect(svc.createCompetitorProducts.mock.calls[1][0]).toMatchObject({
      match_status: "unmatched",
      match_method: null,
    })

    // productId but no confidence → match_score null
    await svc.upsertDiscoveredMapping("c", { url: "u4" }, "prod2")
    expect(svc.createCompetitorProducts.mock.calls[2][0].match_score).toBeNull()
  })

  it("ensureCompetitor passes through base_url and defaults the scraper", async () => {
    const svc = makeSvc()
    svc.listCompetitors.mockResolvedValueOnce([])
    svc.createCompetitors.mockResolvedValueOnce({ id: "n" })
    await svc.ensureCompetitor({ handle: "h", name: "N", base_url: "http://n" })
    expect(svc.createCompetitors).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: "h",
        base_url: "http://n",
        scraper_key: "generic-jsonld",
      })
    )
    expect(svc.createCompetitors.mock.calls[0][0].metadata).toBeUndefined()
  })

  it("ensureCompetitor flags a newly-discovered store with country + metadata", async () => {
    const svc = makeSvc()
    svc.listCompetitors.mockResolvedValueOnce([])
    svc.createCompetitors.mockResolvedValueOnce({ id: "d" })
    await svc.ensureCompetitor({
      handle: "newstore-pt",
      country: "PT",
      scraper_key: "prestashop",
      discovered: true,
    })
    expect(svc.createCompetitors).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: "newstore-pt",
        country: "PT",
        scraper_key: "prestashop",
        metadata: expect.objectContaining({ discovered: true }),
      })
    )
  })
})
