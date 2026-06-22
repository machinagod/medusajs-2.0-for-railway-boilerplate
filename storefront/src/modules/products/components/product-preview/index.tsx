import { getProductPrice } from "@lib/util/get-product-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"
import ProductCardAddButton from "./add-button"
import { getProductsById } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"

export default async function ProductPreview({
  product,
  isFeatured,
  region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const [pricedProduct] = await getProductsById({
    ids: [product.id!],
    regionId: region.id,
  })

  if (!pricedProduct) {
    return null
  }

  const { cheapestPrice } = getProductPrice({
    product: pricedProduct,
  })

  // Optional eyebrow: collection title, else first category title.
  const eyebrow =
    product.collection?.title ?? product.categories?.[0]?.name ?? null

  // Single (default) variant — add it straight to the cart from the card.
  const variantId = (pricedProduct.variants ?? [])[0]?.id
  const countryCode = region.countries?.[0]?.iso_2 ?? "pt"

  return (
    <div
      data-testid="product-wrapper"
      className="group relative flex h-full flex-col rounded-card border border-hairline bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(16,24,40,0.10)]"
    >
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="flex flex-col"
      >
        {/* Image on white */}
        <div className="relative mb-3.5 overflow-hidden rounded-btn bg-[#f5f7f9]">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
          />
        </div>

        {/* Eyebrow (cyan dot + collection/category) */}
        {eyebrow && (
          <span className="mb-1.5 inline-flex items-center gap-x-2 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-cyan">
            <span className="ind" />
            {eyebrow}
          </span>
        )}

        {/* Title — clamp to ~2 lines */}
        <h3
          className="line-clamp-2 text-sm font-medium leading-snug text-brand-ink"
          data-testid="product-title"
        >
          {product.title}
        </h3>
      </LocalizedClientLink>

      {/* Footer: price + compact add-to-cart. mt-auto keeps it aligned across
          cards regardless of title length. */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <div className="min-w-0">
          {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
        </div>
        <ProductCardAddButton variantId={variantId} countryCode={countryCode} />
      </div>
    </div>
  )
}
