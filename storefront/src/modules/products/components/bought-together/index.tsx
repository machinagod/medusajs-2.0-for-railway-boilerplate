import Product from "../product-preview"
import RelatedProducts from "../related-products"
import { getRegion } from "@lib/data/regions"
import { getBoughtTogether, getProductsById } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"

type BoughtTogetherProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
}

// How many partners to show, and how wide to cast the net before availability filtering.
const BOUGHT_TOGETHER_LIMIT = 4
const CANDIDATE_LIMIT = 12

/**
 * "Frequentemente comprados juntos" — real co-purchase recommendations from the
 * bought-together plugin (seeded from Moloni sales history, then self-maintaining
 * from live orders). Falls back to the collection/tags `RelatedProducts` rail when
 * a product has no co-purchase data yet (cold start) or none of its partners are
 * currently purchasable in this region.
 */
export default async function BoughtTogether({
  product,
  countryCode,
}: BoughtTogetherProps) {
  const region = await getRegion(countryCode)
  if (!region) {
    return null
  }

  const pairs = await getBoughtTogether(product.id)

  // Rank partner products by co-purchase frequency, de-duplicated.
  const ranked = new Map<string, number>()
  for (const pair of pairs) {
    const partnerId =
      pair.productId1 === product.id ? pair.productId2 : pair.productId1
    if (!partnerId || partnerId === product.id) {
      continue
    }
    if (!ranked.has(partnerId) || pair.frequency > (ranked.get(partnerId) ?? 0)) {
      ranked.set(partnerId, pair.frequency)
    }
  }

  const candidateIds = Array.from(ranked.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, CANDIDATE_LIMIT)
    .map(([id]) => id)

  if (!candidateIds.length) {
    return <RelatedProducts product={product} countryCode={countryCode} />
  }

  // Hydrate; `getProductsById` only returns published, in-region products, so this
  // also filters out drafts / discontinued partners.
  const products = await getProductsById({
    ids: candidateIds,
    regionId: region.id,
  })

  // Preserve frequency order (the list endpoint doesn't guarantee input order).
  const ordered = candidateIds
    .map((id) => products.find((p) => p.id === id))
    .filter(
      (p): p is HttpTypes.StoreProduct => Boolean(p) && p!.id !== product.id
    )
    .slice(0, BOUGHT_TOGETHER_LIMIT)

  if (!ordered.length) {
    return <RelatedProducts product={product} countryCode={countryCode} />
  }

  return (
    <div className="content-container">
      <div className="mb-7 flex flex-col gap-1">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-cyan">
          <span className="ind" />
          Sugestões
        </span>
        <h2 className="text-2xl font-extrabold tracking-tight text-brand-ink small:text-[28px]">
          Frequentemente comprados juntos
        </h2>
      </div>

      <ul className="grid grid-cols-2 small:grid-cols-4 gap-x-4 gap-y-6 small:gap-x-6">
        {ordered.map((p) => (
          <li key={p.id}>
            <Product region={region} product={p} />
          </li>
        ))}
      </ul>
    </div>
  )
}
