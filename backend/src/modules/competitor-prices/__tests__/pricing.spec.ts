import { readProductPrices } from "../pricing"

describe("readProductPrices", () => {
  it("returns empty for no ids", async () => {
    expect(await readProductPrices({ graph: jest.fn() }, [])).toEqual({})
  })

  it("returns empty when the product query throws", async () => {
    const query = { graph: jest.fn().mockRejectedValue(new Error("down")) }
    expect(await readProductPrices(query, ["p1"])).toEqual({})
  })

  it("reads PVP1 + PVP2 + cost and maps by variant", async () => {
    const query = {
      graph: jest
        .fn()
        .mockResolvedValueOnce({
          data: [{ id: "p1", title: "P1", variants: [{ id: "v1", sku: "S1", calculated_price: { calculated_amount: 82.17 } }] }],
        })
        .mockResolvedValueOnce({
          data: [
            { title: "Moloni PVP2", prices: [{ amount: 70, currency_code: "eur", price_set: { variant: { id: "v1" } } }] },
            { title: "Moloni Cost", prices: [{ amount: 55, price_set: { variant: { id: "v1" } } }] }, // no currency → defaults eur
          ],
        }),
    }
    const out = await readProductPrices(query, ["p1"])
    expect(out.p1).toMatchObject({ title: "P1", sku: "S1", pvp1: 8217, pvp2: 7000, cost: 5500 })
    // "P1" carries no size → no canonical unit price.
    expect(out.p1).toMatchObject({ base_unit: null, qty: null, pvp1_unit: null })
  })

  it("derives €/base unit prices from a sized title", async () => {
    const query = {
      graph: jest
        .fn()
        .mockResolvedValueOnce({
          data: [{ id: "p9", title: "Jonclean 900 (10L)", metadata: { moloni_vat_percent: 23 }, variants: [{ id: "v9", sku: "S9", calculated_price: { calculated_amount: 82.17 } }] }],
        })
        .mockResolvedValueOnce({
          data: [{ title: "Moloni Cost", prices: [{ amount: 50, currency_code: "eur", price_set: { variant: { id: "v9" } } }] }],
        }),
    }
    const out = await readProductPrices(query, ["p9"])
    expect(out.p9).toMatchObject({ base_unit: "L", qty: 10, pvp1: 8217, pvp1_unit: 822, cost: 5000, cost_unit: 500, pvp2_unit: null, vat: 0.23 })
  })

  it("falls back to first variant for PVP1, skips non-eur, and tolerates price-list failure", async () => {
    const query = {
      graph: jest
        .fn()
        .mockResolvedValueOnce({
          // variant has no calculated_price → falls back to variants[0], pvp1 null
          data: [{ id: "p2", title: "P2", variants: [{ id: "v2", sku: "S2" }] }],
        })
        .mockRejectedValueOnce(new Error("price lists down")),
    }
    const out = await readProductPrices(query, ["p2"])
    expect(out.p2).toMatchObject({ title: "P2", sku: "S2", pvp1: null, pvp2: null, cost: null })
  })

  it("handles a product with no variants and malformed price-list rows", async () => {
    const query = {
      graph: jest
        .fn()
        .mockResolvedValueOnce({ data: [{ id: "p4", title: "P4" }] }) // no variants
        .mockResolvedValueOnce({
          data: [
            { title: "Moloni PVP2", prices: [{ amount: 5 }] }, // no price_set → skipped
            { title: "Other", prices: undefined }, // no prices
          ],
        }),
    }
    const out = await readProductPrices(query, ["p4"])
    expect(out.p4).toMatchObject({ title: "P4", sku: null, pvp1: null, pvp2: null, cost: null })
  })

  it("tolerates empty graph results", async () => {
    const query = { graph: jest.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({}) }
    expect(await readProductPrices(query, ["p5"])).toEqual({})
  })

  it("ignores a price-list entry in a non-eur currency", async () => {
    const query = {
      graph: jest
        .fn()
        .mockResolvedValueOnce({
          data: [{ id: "p3", title: "P3", variants: [{ id: "v3", sku: "S3", calculated_price: { calculated_amount: 10 } }] }],
        })
        .mockResolvedValueOnce({
          data: [{ title: "Moloni PVP2", prices: [{ amount: 9, currency_code: "usd", price_set: { variant: { id: "v3" } } }] }],
        }),
    }
    const out = await readProductPrices(query, ["p3"])
    expect(out.p3).toMatchObject({ pvp1: 1000, pvp2: null })
  })
})
