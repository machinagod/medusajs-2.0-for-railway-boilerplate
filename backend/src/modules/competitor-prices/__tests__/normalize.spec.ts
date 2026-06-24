import { parseMeasure, unitPriceMinor, normalizedUnitPrice, convertTaxBasis } from "../normalize"

describe("convertTaxBasis", () => {
  it("strips VAT (incl → excl) and adds it (excl → incl)", () => {
    expect(convertTaxBasis(1230, "incl", "excl", 0.23)).toBe(1000)
    expect(convertTaxBasis(1000, "excl", "incl", 0.23)).toBe(1230)
  })
  it("is a no-op for same basis, unknown from-basis, or zero VAT", () => {
    expect(convertTaxBasis(1000, "excl", "excl", 0.23)).toBe(1000)
    expect(convertTaxBasis(1000, null, "excl", 0.23)).toBe(1000)
    expect(convertTaxBasis(1000, "incl", "excl", 0)).toBe(1000)
  })
  it("returns null for a null price", () => {
    expect(convertTaxBasis(null, "incl", "excl", 0.23)).toBeNull()
  })
})

describe("parseMeasure", () => {
  it("reduces volume to litres", () => {
    expect(parseMeasure("Jonclean 900 (20L)")).toEqual({ base_unit: "L", qty: 20 })
    expect(parseMeasure("Sprint 750ml")).toEqual({ base_unit: "L", qty: 0.75 })
  })
  it("reduces weight to kilograms", () => {
    expect(parseMeasure("Suma Shine K2 (10Kg)")).toEqual({ base_unit: "kg", qty: 10 })
    expect(parseMeasure("Pó 1,5Kg")).toEqual({ base_unit: "kg", qty: 1.5 })
  })
  it("multiplies packs and keeps count units", () => {
    expect(parseMeasure("Suma Bac D10 (2x1,4L)")).toEqual({ base_unit: "L", qty: 2.8 })
    expect(parseMeasure("Touca de Banho Flow Pack 500un")).toEqual({ base_unit: "un", qty: 500 })
  })
  // NOTE: multi-size titles (e.g. "Sabonete 20g 400un" — per-item weight AND a
  // pack count) currently resolve to the FIRST token. Which unit should win is a
  // mapper-configuration question handled separately; this layer stays mechanical.
  it("returns null when no size is present", () => {
    expect(parseMeasure("Dispensador Intellicare Manual")).toBeNull()
    expect(parseMeasure(null)).toBeNull()
  })
})

describe("unitPriceMinor", () => {
  it("divides price by the base quantity", () => {
    expect(unitPriceMinor(8217, { base_unit: "L", qty: 10 })).toBe(822) // 8217/10 → 821.7
    expect(unitPriceMinor(5000, { base_unit: "L", qty: 2.8 })).toBe(1786)
  })
  it("returns null for missing price, measure, or non-positive qty", () => {
    expect(unitPriceMinor(null, { base_unit: "L", qty: 10 })).toBeNull()
    expect(unitPriceMinor(100, null)).toBeNull()
    expect(unitPriceMinor(100, { base_unit: "L", qty: 0 })).toBeNull()
  })
})

describe("normalizedUnitPrice", () => {
  it("parses size and reduces price to €/base", () => {
    expect(normalizedUnitPrice(8217, "Jonclean 900 (10L)")).toEqual({
      base_unit: "L",
      qty: 10,
      unit_price: 822,
    })
  })
  it("keeps unit_price null when the price is unknown but the size is not", () => {
    expect(normalizedUnitPrice(null, "Jonclean (20L)")).toEqual({
      base_unit: "L",
      qty: 20,
      unit_price: null,
    })
  })
  it("returns null when the text has no size", () => {
    expect(normalizedUnitPrice(1000, "Dispensador Manual")).toBeNull()
  })
})
