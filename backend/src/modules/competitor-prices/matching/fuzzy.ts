/**
 * Dependency-free fuzzy matcher for resolving a competitor listing to one of our
 * catalog products. Strategy, strongest first:
 *   1. EAN/GTIN exact         → method "ean",       score 100
 *   2. SKU / brand+reference  → method "sku"/"brand_ref", score ~95
 *   3. Token Dice-coefficient → method "fuzzy",     score 0..100 (title similarity)
 *
 * The score lets the caller auto-confirm above a threshold and queue the rest
 * for human review. Pure functions — the catalog is fed in by the caller so this
 * module stays decoupled from the product module.
 */

export type CatalogItem = {
  product_id: string
  variant_id?: string | null
  sku?: string | null
  ean?: string | null
  brand?: string | null
  title: string
}

export type Listing = {
  title?: string | null
  brand?: string | null
  sku?: string | null
  ean?: string | null
}

export type MatchCandidate = {
  product_id: string
  variant_id?: string | null
  sku?: string | null
  score: number // 0..100
  method: "ean" | "sku" | "brand_ref" | "fuzzy"
}

export function normalizeText(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

const normRef = (s: string | null | undefined): string =>
  (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")

/**
 * Extract a comparable pack/size signature from a product title, in a canonical
 * base unit, so two listings can be checked for size compatibility:
 *   "20L" → 20000 ml · "1,5Kg" → 1500 g · "6x2L" → 12000 ml · "100un" → 100 un
 * Returns null when no size is detectable. We only compare within the same unit
 * family (volume / weight / count); mismatched families don't penalise.
 */
export function extractSize(
  title: string | null | undefined
): { value: number; unit: "ml" | "g" | "un" } | null {
  const t = (title ?? "").toLowerCase().replace(/,/g, ".")
  // Optional leading multiplier, e.g. "6x2l", "6 x 0.75ml", "10 x 25".
  const m = t.match(
    /(?:(\d+(?:\.\d+)?)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(l|ml|cl|kg|g|gr|un|u|rolos?|ma[çc]os?|folhas|sacos)\b/
  )
  if (!m) return null
  const mult = m[1] ? parseFloat(m[1]) : 1
  const qty = parseFloat(m[2]) * mult
  if (!isFinite(qty) || qty <= 0) return null
  switch (m[3]) {
    case "l":
      return { value: qty * 1000, unit: "ml" }
    case "cl":
      return { value: qty * 10, unit: "ml" }
    case "ml":
      return { value: qty, unit: "ml" }
    case "kg":
      return { value: qty * 1000, unit: "g" }
    case "g":
    case "gr":
      return { value: qty, unit: "g" }
    default:
      return { value: qty, unit: "un" } // un / u / rolos / maços / folhas / sacos
  }
}

/**
 * Size-compatibility factor in [0,1] applied to a fuzzy title score. 1 when sizes
 * agree (or aren't comparable), dropping toward ~0.5 as they diverge — so a
 * "5L" listing can't masquerade as our "20L" on title similarity alone.
 */
export function sizeFactor(
  a: string | null | undefined,
  b: string | null | undefined
): number {
  const sa = extractSize(a)
  const sb = extractSize(b)
  if (!sa || !sb || sa.unit !== sb.unit) return 1 // not comparable → no penalty
  if (sa.value === sb.value) return 1
  const ratio = Math.min(sa.value, sb.value) / Math.max(sa.value, sb.value)
  // ratio 1 → 1.0 (equal), ratio→0 → 0.5 (very different); linear blend.
  return 0.5 + 0.5 * ratio
}

/** Sørensen–Dice coefficient over character bigrams → 0..1. */
export function diceCoefficient(a: string, b: string): number {
  const x = normalizeText(a)
  const y = normalizeText(b)
  if (!x || !y) return 0
  if (x === y) return 1
  const bigrams = (s: string) => {
    const m = new Map<string, number>()
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2)
      m.set(g, (m.get(g) ?? 0) + 1)
    }
    return m
  }
  const ax = bigrams(x)
  const bx = bigrams(y)
  let overlap = 0
  let sizeA = 0
  let sizeB = 0
  for (const v of ax.values()) sizeA += v
  for (const [g, v] of bx) {
    sizeB += v
    overlap += Math.min(v, ax.get(g) ?? 0)
  }
  return (2 * overlap) / (sizeA + sizeB)
}

export function matchListing(
  listing: Listing,
  catalog: CatalogItem[]
): MatchCandidate | null {
  // 1. EAN exact.
  const ean = normRef(listing.ean)
  if (ean) {
    const hit = catalog.find((c) => normRef(c.ean) === ean)
    if (hit) return toCandidate(hit, 100, "ean")
  }

  // 2. SKU / reference exact (Moloni ref is the shared business identifier).
  const sku = normRef(listing.sku)
  if (sku) {
    const hit = catalog.find((c) => normRef(c.sku) === sku)
    if (hit) return toCandidate(hit, 96, "sku")
  }

  // 3. Brand + reference token inside the title (e.g. Vileda "V173433").
  const titleRef = normRef(listing.title)
  if (titleRef) {
    const hit = catalog.find((c) => {
      const ref = normRef(c.sku)
      return ref.length >= 4 && titleRef.includes(ref)
    })
    if (hit) return toCandidate(hit, 92, "brand_ref")
  }

  // 4. Fuzzy title similarity (optionally gated by matching brand), discounted
  //    by pack-size compatibility so a different-size listing can't pass on title
  //    alone. We can't assume competitors carry our SKU, so this is the path that
  //    matches the long tail — every candidate keeps a confidence the caller can
  //    auto-confirm or queue for review.
  if (listing.title) {
    const wantBrand = normalizeText(listing.brand)
    let best: CatalogItem | null = null
    let bestScore = 0
    for (const c of catalog) {
      if (wantBrand && c.brand && normalizeText(c.brand) !== wantBrand) continue
      const score =
        diceCoefficient(listing.title, c.title) * sizeFactor(listing.title, c.title)
      if (score > bestScore) {
        bestScore = score
        best = c
      }
    }
    if (best && bestScore > 0) {
      return toCandidate(best, Math.round(bestScore * 100), "fuzzy")
    }
  }

  return null
}

function toCandidate(
  c: CatalogItem,
  score: number,
  method: MatchCandidate["method"]
): MatchCandidate {
  return {
    product_id: c.product_id,
    variant_id: c.variant_id ?? null,
    sku: c.sku ?? null,
    score,
    method,
  }
}
