import { runCompetitorMatch } from "../match"

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
const makeContainer = (svc: any, query: any) => ({
  resolve: (n: string) => (n === "logger" ? logger : n === "query" ? query : svc),
})

const baseSvc = () => ({
  listCompetitorProducts: jest.fn().mockResolvedValue([]),
  applyMatch: jest.fn().mockResolvedValue("confirmed"),
})

describe("runCompetitorMatch", () => {
  it("pages the catalog through Query (full page then empty)", async () => {
    const svc = baseSvc()
    const big = Array.from({ length: 1000 }, (_, i) => ({
      id: "p" + i,
      title: "t",
      variants: [{ id: "v", sku: "s" + i }],
    }))
    const query = {
      graph: jest
        .fn()
        .mockResolvedValueOnce({ data: big })
        .mockResolvedValueOnce({ data: [] }),
    }
    const report = await runCompetitorMatch(makeContainer(svc, query) as any, {})
    expect(query.graph).toHaveBeenCalledTimes(2)
    expect(report.considered).toBe(0)
  })

  it("matches mappings against a small catalog and applies the result", async () => {
    const svc = baseSvc()
    svc.listCompetitorProducts.mockResolvedValue([
      { id: "m1", competitor_sku: "7010074", title: "Suma" },
    ])
    const query = {
      graph: jest.fn().mockResolvedValueOnce({
        data: [
          { id: "p1", title: "Suma Ultra L2", metadata: { brand: "Diversey" }, variants: [{ id: "v1", sku: "7010074", ean: null, barcode: "BC" }] },
          { id: "p2", title: "No variants" }, // variant fallback path
        ],
      }),
    }
    const report = await runCompetitorMatch(makeContainer(svc, query) as any, {})
    expect(svc.applyMatch).toHaveBeenCalledWith(
      expect.objectContaining({ id: "m1" }),
      expect.objectContaining({ method: "sku" })
    )
    expect(report).toMatchObject({ considered: 1, confirmed: 1 })
  })

  it("filters by mappingIds, then by status (rematch toggles)", async () => {
    const svc = baseSvc()
    const query = { graph: jest.fn().mockResolvedValue({ data: [] }) }
    const c = makeContainer(svc, query) as any

    await runCompetitorMatch(c, { mappingIds: ["x"] })
    expect(svc.listCompetitorProducts.mock.calls[0][0]).toEqual({ id: ["x"] })

    await runCompetitorMatch(c, {})
    expect(svc.listCompetitorProducts.mock.calls[1][0]).toEqual({ match_status: "unmatched" })

    await runCompetitorMatch(c, { rematch: true })
    expect(svc.listCompetitorProducts.mock.calls[2][0]).toEqual({
      match_status: ["unmatched", "fuzzy", "catalog_only"],
    })
  })
})
