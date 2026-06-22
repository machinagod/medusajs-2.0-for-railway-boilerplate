import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductTabs from "@modules/products/components/product-tabs"
import BoughtTogether from "@modules/products/components/bought-together"
import ProductInfo from "@modules/products/templates/product-info"
import ProductHighlights from "@modules/products/components/product-highlights"
import ProductSpecSheet from "@modules/products/components/product-spec-sheet"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import ProductActionsWrapper from "./product-actions-wrapper"
import PathBar from "@modules/products/components/path-bar"
import { HttpTypes } from "@medusajs/types"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  return (
    <>
      <Suspense fallback={null}>
        <PathBar product={product} countryCode={countryCode} />
      </Suspense>

      {/* Two-column: gallery (sticky) | info + buy box */}
      <div
        className="content-container grid grid-cols-1 small:grid-cols-2 small:items-start small:gap-x-10 py-6"
        data-testid="product-container"
      >
        <div className="w-full small:sticky small:top-32">
          <ImageGallery images={product?.images || []} />
        </div>

        <div className="flex flex-col gap-y-6 py-6 small:py-0 w-full">
          <ProductInfo product={product} />
          <Suspense
            fallback={
              <ProductActions
                disabled={true}
                product={product}
                region={region}
              />
            }
          >
            <ProductActionsWrapper id={product.id} region={region} />
          </Suspense>
          <Suspense fallback={null}>
            <ProductHighlights productId={product.id} />
          </Suspense>
        </div>
      </div>

      {/* Full-width details: spec sheet + tabs */}
      <div className="content-container flex flex-col gap-y-6 pb-6">
        <ProductSpecSheet product={product} />
        <ProductTabs product={product} />
      </div>

      <div
        className="content-container my-16 small:my-24"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <BoughtTogether product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
