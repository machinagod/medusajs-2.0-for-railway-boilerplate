import { computeGaps } from "../gaps"
import type { OurPrice } from "../pricing"

const mk = (
  title: string,
  base_unit: any,
  pvp2_unit: number | null,
  cost_unit: number | null,
  vat: number | null = null
): OurPrice => ({
  title,
  sku: null,
  pvp1: null,
  pvp2: null,
  cost: null,
  base_unit,
  qty: null,
  pvp1_unit: null,
  pvp2_unit,
  cost_unit,
  vat,
})

describe("computeGaps", () => {
  const products: Record<string, OurPrice> = {
    p_above: mk("Above (10L)", "L", 1200, null), // our €/L 1200
    p_below: mk("Below (10L)", "L", 700, null), // our €/L 700
    p_cost: mk("Cost (10L)", "L", 850, 900), // our €/L 850, cost €/L 900
    p_filter: mk("Filter (10L)", "L", 1000, null),
    p_nosize: mk("NoSize", null, null, null), // no €/base → excluded
  }
  const mappings = [
    { product_id: "p_above", title: "a1 (10L)", latest_price: { price: 8000, scraped_at: "2024-01-01" } }, // 800/L
    { product_id: "p_above", title: "a2 (5L)", latest_price: { price: 5000, scraped_at: "2024-01-01" } }, // 1000/L
    { product_id: "p_below", title: "b1 (10L)", latest_price: { price: 8000 } }, // 800
    { product_id: "p_below", title: "b2 (10L)", latest_price: { price: 10000 } }, // 1000
    { product_id: "p_cost", title: "c1 (10L)", latest_price: { price: 8000 } }, // 800 < cost 900
    { product_id: "p_filter", title: "f1 (5Kg)", latest_price: { price: 9000 } }, // kg → wrong family, excluded
    { product_id: "p_filter", title: "f2 (10L)", latest_price: { price: 9000 } }, // 900
    { product_id: "p_nosize", title: "n1 (10L)", latest_price: { price: 5000 } }, // product has no base → skip
    { product_id: null, title: "x (10L)", latest_price: { price: 5000 } }, // no product → skip
    { product_id: "p_above", title: "noprice", latest_price: null }, // no price → skip
  ]

  it("ranks products most-above-market first and computes the distribution", () => {
    const rows = computeGaps(products, mappings)
    expect(rows.map((r) => r.product_id)).toEqual(["p_above", "p_filter", "p_cost", "p_below"])
    expect(rows.find((r) => r.product_id === "p_above")).toMatchObject({
      position: "above",
      base_unit: "L",
      our_unit_price: 1200,
      below_cost: false,
      competitor: { count: 2, min: 800, median: 900, max: 1000 },
      vs_min_pct: 50,
      vs_median_pct: 33.3,
    })
  })

  it("flags below-market and below-cost", () => {
    const rows = computeGaps(products, mappings)
    expect(rows.find((r) => r.product_id === "p_below")).toMatchObject({
      position: "below",
      vs_median_pct: -22.2,
    })
    // a competitor (€/L 800) undercuts our cost (€/L 900)
    expect(rows.find((r) => r.product_id === "p_cost")).toMatchObject({
      below_cost: true,
      position: "above",
      competitor: { count: 1 },
    })
  })

  it("ignores competitor listings in a different unit family", () => {
    const filt = computeGaps(products, mappings).find((r) => r.product_id === "p_filter")
    expect(filt?.competitor.count).toBe(1) // the 5Kg listing was excluded
  })

  it("excludes products without our own €/base price", () => {
    const ids = computeGaps(products, mappings).map((r) => r.product_id)
    expect(ids).not.toContain("p_nosize")
  })

  it("returns nothing when there are no comparable competitors", () => {
    expect(computeGaps({ p1: mk("Solo (10L)", "L", 500, null) }, [])).toEqual([])
  })

  it("covers at-market, the PVP1 fallback, and unknown position", () => {
    const prods: Record<string, OurPrice> = {
      p_at: mk("At (10L)", "L", 900, null),
      p_pvp1: { ...mk("Pvp1 (10L)", "L", null, null), pvp1_unit: 600 }, // no PVP2 → falls back to PVP1
      p_null: mk("Null (10L)", "L", null, null), // no €/base price at all
    }
    const maps = [
      { product_id: "p_at", title: "x (10L)", latest_price: { price: 8000 } }, // 800
      { product_id: "p_at", title: "y (10L)", latest_price: { price: 10000 } }, // 1000 (median)
      { product_id: "p_at", title: "z (10L)", latest_price: { price: 12000 } }, // 1200
      { product_id: "p_pvp1", title: "w (10L)", latest_price: { price: 8000 } }, // 800
      { product_id: "p_null", title: "n (10L)", latest_price: { price: 0 } }, // €/L 0 → guards div-by-zero
    ]
    const rows = computeGaps(prods, maps)
    expect(rows.find((r) => r.product_id === "p_at")).toMatchObject({
      position: "at",
      our_unit_price: 900,
      competitor: { count: 3, min: 800, median: 1000, max: 1200 },
    })
    expect(rows.find((r) => r.product_id === "p_pvp1")).toMatchObject({
      position: "below",
      our_unit_price: 600, // PVP1 fallback used
    })
    expect(rows.find((r) => r.product_id === "p_null")).toMatchObject({
      position: "unknown",
      our_unit_price: null,
      vs_min_pct: null,
      vs_median_pct: null,
    })
  })

  it("normalises an incl-VAT competitor to our net basis before comparing", () => {
    const prods: Record<string, OurPrice> = { p_tax: mk("Tax (10L)", "L", 1000, null, 0.23) }
    const maps = [
      { product_id: "p_tax", title: "t (10L)", latest_price: { price: 12300 }, tax_basis: "incl" as const },
    ]
    const row = computeGaps(prods, maps)[0]
    // 12300 ÷ 10L = 1230 incl-VAT → ÷1.23 = 1000 net, matching our 1000
    expect(row.competitor).toMatchObject({ min: 1000, median: 1000, max: 1000 })
    expect(row).toMatchObject({ position: "below", vs_min_pct: 0 })
  })
})
