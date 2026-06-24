import { extractSize } from "./matching/fuzzy"

/**
 * Canonical unit-price layer — the keystone of the pricing-intelligence module.
 *
 * `extractSize` (in matching/fuzzy) already parses a title's pack/size into a
 * canonical magnitude (ml / g / un). This builds the comparison currency on top:
 * a price reduced to **€ per base unit** (per Litre / Kilogram / unit). That
 * single figure makes any two offerings comparable regardless of pack size —
 * a 5L, a 2×5L and a 20L all collapse to €/L — which is what lets us:
 *   • compare our price to a competitor's across mismatched packs, and
 *   • fuzzy-match private-label products by brand + €/L when no SKU lines up.
 *
 * Pure functions; minor units (cents) throughout.
 */

export type BaseUnit = "L" | "kg" | "un"

export type Measure = {
  base_unit: BaseUnit
  qty: number // total quantity in base_unit (e.g. 2×1,4L → 2.8)
}

// extractSize speaks ml/g/un; collapse each family to its display base unit.
const BASE_OF: Record<string, BaseUnit> = { ml: "L", g: "kg", un: "un" }
const PER_BASE: Record<string, number> = { ml: 1000, g: 1000, un: 1 }

/**
 * Parse a title/size string into a canonical measure (total quantity in
 * L / kg / un). Returns null when no size is detectable.
 */
export function parseMeasure(text: string | null | undefined): Measure | null {
  const s = extractSize(text)
  if (!s) return null
  return { base_unit: BASE_OF[s.unit], qty: s.value / PER_BASE[s.unit] }
}

/**
 * € per base unit (minor units), given a price in minor units and a measure.
 * Null when the price or measure is missing / non-positive.
 */
export function unitPriceMinor(
  priceMinor: number | null | undefined,
  measure: Measure | null
): number | null {
  if (priceMinor == null || !measure || measure.qty <= 0) return null
  return Math.round(priceMinor / measure.qty)
}

export type TaxBasis = "incl" | "excl"

/**
 * Convert a price (minor units) between VAT bases so two prices are compared on
 * the same footing. `vatRate` is a fraction (0.23 for 23%). Same basis → no-op.
 * Our own prices are net (ex-VAT, from Moloni); a competitor showing incl-VAT
 * prices must be divided down to net before comparison, else it looks ~23% off.
 */
export function convertTaxBasis(
  priceMinor: number | null | undefined,
  from: TaxBasis | null | undefined,
  to: TaxBasis,
  vatRate: number
): number | null {
  if (priceMinor == null) return null
  if (!from || from === to || !vatRate) return priceMinor
  return from === "incl"
    ? Math.round(priceMinor / (1 + vatRate)) // gross → net
    : Math.round(priceMinor * (1 + vatRate)) // net → gross
}

export type NormalizedPrice = {
  base_unit: BaseUnit
  qty: number
  unit_price: number | null // minor units per base unit
}

/**
 * One-shot: parse `text` for its size and reduce `priceMinor` to €/base-unit.
 * Returns null when the text carries no recognisable size.
 */
export function normalizedUnitPrice(
  priceMinor: number | null | undefined,
  text: string | null | undefined
): NormalizedPrice | null {
  const measure = parseMeasure(text)
  if (!measure) return null
  return {
    base_unit: measure.base_unit,
    qty: measure.qty,
    unit_price: unitPriceMinor(priceMinor, measure),
  }
}
