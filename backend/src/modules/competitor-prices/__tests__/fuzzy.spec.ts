import {
  normalizeText,
  diceCoefficient,
  extractSize,
  sizeFactor,
  matchListing,
  type CatalogItem,
} from "../matching/fuzzy"

describe("extractSize", () => {
  it("parses volumes to ml", () => {
    expect(extractSize("Suma Ultra L2 (20L)")).toEqual({ value: 20000, unit: "ml" })
    expect(extractSize("Good Sense 0,75ml")).toEqual({ value: 0.75, unit: "ml" })
    expect(extractSize("Foam 75cl")).toEqual({ value: 750, unit: "ml" })
  })
  it("parses weights to grams and applies multipliers", () => {
    expect(extractSize("Cook Desentop (1,5Kg)")).toEqual({ value: 1500, unit: "g" })
    expect(extractSize("Suma Grill D9 (6x2L)")).toEqual({ value: 12000, unit: "ml" })
  })
  it("parses counts", () => {
    expect(extractSize("Aerosol Inseticida (4un)")).toEqual({ value: 4, unit: "un" })
    expect(extractSize("Papel Jumbo (12 rolos)")).toEqual({ value: 12, unit: "un" })
  })
  it("returns null when no size is present", () => {
    expect(extractSize("Saboneteira Aitana Branca")).toBeNull()
    expect(extractSize(null)).toBeNull()
  })

  // Corpus-tuned cases (real product + competitor titles).
  it("handles the competitor 'lts/LTS' litre spelling", () => {
    expect(extractSize("CLAX Build 12B1 20LTS")).toEqual({ value: 20000, unit: "ml" })
    expect(extractSize("Clax Deosoft Iris conc 54B2 20lts")).toEqual({ value: 20000, unit: "ml" })
    expect(extractSize("Suma Grill D9 6X2LTS")).toEqual({ value: 12000, unit: "ml" })
    expect(extractSize("Suma Bac D10 Smartdose 2x1.4lts")).toEqual({ value: 2800, unit: "ml" })
  })
  it("treats cc as ml and gr as g", () => {
    expect(extractSize("Copo de Policarbonato 250cc")).toEqual({ value: 250, unit: "ml" })
    expect(extractSize("Detergente Pó 500gr")).toEqual({ value: 500, unit: "g" })
  })
  it("lets volume/weight win over a count token", () => {
    expect(extractSize("SKIP PROFESSIONAL LIQUIDO 10L 133 doses")).toEqual({ value: 10000, unit: "ml" })
    expect(extractSize("Caixas Retangulares 800ml (4un)")).toEqual({ value: 800, unit: "ml" })
    expect(extractSize("Clax Revoflow Pro 35X1 (4Kg)")).toEqual({ value: 4000, unit: "g" })
  })
  it("parses extra count spellings", () => {
    expect(extractSize("TASKI JM Ultra Dump Mop 40cm Azul 10 unid.")).toEqual({ value: 10, unit: "un" })
    expect(extractSize("Suma Dify MA1 60 saquetas")).toEqual({ value: 60, unit: "un" })
    expect(extractSize("Sani Uribloc W4g (50pc)")).toEqual({ value: 50, unit: "un" })
    expect(extractSize("Esfregão (2 maços)")).toEqual({ value: 2, unit: "un" })
  })
  it("ignores dimensions and reference codes", () => {
    expect(extractSize("Prato Fundo Policarbonato Branco 18,5cm")).toBeNull()
    expect(extractSize("A Divermite Plus (67067) para D1")).toBeNull()
    expect(extractSize("Parafuso Plástico Ka (50x40)")).toBeNull()
  })
})

describe("sizeFactor", () => {
  it("is 1 for equal or non-comparable sizes", () => {
    expect(sizeFactor("Suma Ultra L2 20L", "Suma Ultra 20L")).toBe(1)
    expect(sizeFactor("No size here", "Also none")).toBe(1) // both missing
    expect(sizeFactor("Box 20L", "Box 500g")).toBe(1) // different unit family
  })
  it("penalises diverging sizes toward 0.5", () => {
    expect(sizeFactor("Oxivir 5L", "Oxivir 20L")).toBeCloseTo(0.625, 3) // ratio 0.25
    expect(sizeFactor("Oxivir 1L", "Oxivir 20L")).toBeGreaterThan(0.5)
    expect(sizeFactor("Oxivir 1L", "Oxivir 20L")).toBeLessThan(0.55)
  })
})

describe("normalizeText", () => {
  it("lowercases, strips accents and punctuation", () => {
    expect(normalizeText("Água  Forte!")).toBe("agua forte")
  })
  it("handles null/undefined", () => {
    expect(normalizeText(null)).toBe("")
    expect(normalizeText(undefined)).toBe("")
  })
})

describe("diceCoefficient", () => {
  it("is 1 for identical strings", () => {
    expect(diceCoefficient("oxivir plus", "Oxivir Plus")).toBe(1)
  })
  it("is 0 when either side is empty", () => {
    expect(diceCoefficient("", "abc")).toBe(0)
    expect(diceCoefficient("ab", "")).toBe(0)
  })
  it("is between 0 and 1 for partial overlap", () => {
    const s = diceCoefficient("suma ultra l2", "suma ultra l3")
    expect(s).toBeGreaterThan(0)
    expect(s).toBeLessThan(1)
  })
})

describe("matchListing", () => {
  const catalog: CatalogItem[] = [
    { product_id: "p1", variant_id: "v1", sku: "7010074", ean: "5011231000019", brand: "Diversey", title: "Suma Ultra L2 20L" },
    { product_id: "p2", variant_id: "v2", sku: "7513452", ean: null, brand: "Diversey", title: "Oxivir Plus 5L" },
    { product_id: "p3", sku: "V140695", ean: null, brand: "Vileda", title: "SWEP Mopa HygienePlus" },
  ]

  it("matches by EAN (score 100)", () => {
    const m = matchListing({ ean: "5011231000019" }, catalog)
    expect(m).toMatchObject({ product_id: "p1", method: "ean", score: 100, variant_id: "v1" })
  })

  it("matches by SKU/reference (score 96)", () => {
    const m = matchListing({ sku: "7513452" }, catalog)
    expect(m).toMatchObject({ product_id: "p2", method: "sku", score: 96 })
  })

  it("matches by reference embedded in the title (brand_ref)", () => {
    const m = matchListing({ title: "Mopa Vileda ref V140695 azul" }, catalog)
    expect(m).toMatchObject({ product_id: "p3", method: "brand_ref", score: 92, variant_id: null })
  })

  it("falls back to fuzzy title, gated by brand", () => {
    const m = matchListing({ title: "Oxivir Plus 5 litros", brand: "Diversey" }, catalog)
    expect(m?.product_id).toBe("p2")
    expect(m?.method).toBe("fuzzy")
    expect(m!.score).toBeGreaterThan(0)
  })

  it("skips fuzzy candidates whose brand differs", () => {
    // Title resembles p2 but brand forces a mismatch → no fuzzy hit.
    const m = matchListing({ title: "Oxivir Plus 5L", brand: "OtherBrand" }, catalog)
    expect(m).toBeNull()
  })

  it("lowers fuzzy confidence when the pack size differs", () => {
    // Same product family + brand, but our catalog item is 20L vs a 5L listing.
    const cat: CatalogItem[] = [
      { product_id: "p", brand: "Diversey", title: "Suma Ultra L2 20L" },
    ]
    const same = matchListing({ title: "Suma Ultra L2 20L", brand: "Diversey" }, cat)!
    const diff = matchListing({ title: "Suma Ultra L2 5L", brand: "Diversey" }, cat)!
    expect(diff.method).toBe("fuzzy")
    // The differing size must score strictly lower than the exact-size match.
    expect(diff.score).toBeLessThan(same.score)
  })

  it("returns null when nothing matches", () => {
    expect(matchListing({ title: "" }, catalog)).toBeNull()
    expect(matchListing({}, catalog)).toBeNull()
  })

  it("does not match EAN when no catalog ean equals it", () => {
    const m = matchListing({ ean: "0000000000000", title: "Suma Ultra L2 20L" }, catalog)
    expect(m?.method).not.toBe("ean")
  })
})
