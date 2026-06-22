import { notFound } from "next/navigation"
import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SubcategoryChips from "@modules/categories/components/subcategory-chips"
import { HttpTypes } from "@medusajs/types"
import { collectCategoryIds } from "@lib/data/categories"

export default function CategoryTemplate({
  categories,
  sortBy,
  page,
  countryCode,
}: {
  categories: HttpTypes.StoreProductCategory[]
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  const category = categories[categories.length - 1]
  const parents = categories.slice(0, categories.length - 1)

  if (!category || !countryCode) notFound()

  // Include the category itself AND every sub-category, so selecting a top-level
  // category shows the products that live on its leaves (not an empty page).
  const categoryIds = collectCategoryIds(category)

  return (
    <div className="content-container py-6" data-testid="category-container">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-row flex-wrap items-center gap-y-1 text-2xl font-extrabold tracking-tight text-brand-ink">
          {parents &&
            parents.map((parent) => (
              <span key={parent.id} className="text-grey-50">
                <LocalizedClientLink
                  className="hover:text-brand-cyan"
                  href={`/categories/${parent.handle}`}
                  data-testid="sort-by-link"
                >
                  {parent.name}
                </LocalizedClientLink>
                <span className="mx-2 text-grey-30">/</span>
              </span>
            ))}
          <h1 data-testid="category-page-title">{category.name}</h1>
        </div>
        <RefinementList sortBy={sort} data-testid="sort-by-container" />
      </div>

      {category.description && (
        <p className="mb-6 max-w-[800px] text-base-regular text-grey-60">
          {category.description}
        </p>
      )}

      <SubcategoryChips categories={category.category_children} />

      <Suspense fallback={<SkeletonProductGrid />}>
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          categoryId={categoryIds}
          countryCode={countryCode}
        />
      </Suspense>
    </div>
  )
}
