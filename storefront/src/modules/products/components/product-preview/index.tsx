import { getProductPrice } from "@lib/util/get-product-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"
import { getProductsById } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import { Plus } from "lucide-react"

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

  return (
    <LocalizedClientLink
      href={`/products/${product.handle}`}
      className="group block h-full"
    >
      <div
        data-testid="product-wrapper"
        className="flex h-full flex-col rounded-card border border-hairline bg-white p-4 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_rgba(16,24,40,0.10)]"
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

        {/* Price */}
        <div className="mt-3">
          {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
        </div>

        {/* Footer action chip (visual only — leads to the PDP, where the dual
            CTA incl. the salesperson-contact widget lives). */}
        <div className="mt-4">
          <span className="flex w-full items-center justify-center gap-x-1.5 rounded-btn bg-brand-ink px-3 py-2.5 text-xs font-bold uppercase tracking-[0.04em] text-white transition-colors group-hover:bg-brand-cyan">
            <Plus className="h-3.5 w-3.5" /> Carrinho
          </span>
        </div>
      </div>
    </LocalizedClientLink>
  )
}
