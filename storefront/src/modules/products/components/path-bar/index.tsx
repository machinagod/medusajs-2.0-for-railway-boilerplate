import { HttpTypes } from "@medusajs/types"
import {
  getCategoryById,
  getRootCategories,
} from "@lib/data/categories"
import { getProductsList } from "@lib/data/products"
import PathBar, { PathOption, PathSegment } from "./path-bar"

type PathBarWrapperProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
}

/** Max sibling products listed in the leaf (product) dropdown. */
const MAX_SIBLING_PRODUCTS = 12

/**
 * Pick the "deepest" category for a product: the one with the longest parent
 * chain. Products can belong to several categories; we follow the most specific.
 */
function pickDeepestCategory(
  categories: HttpTypes.StoreProductCategory[]
): HttpTypes.StoreProductCategory | undefined {
  if (!categories.length) return undefined
  // Prefer a category that is itself a child (has a parent) — i.e. a leaf-ish
  // node — falling back to the first one.
  const withParent = categories.filter((c) => c.parent_category)
  return (withParent[0] ?? categories[0]) as HttpTypes.StoreProductCategory
}

/**
 * Server wrapper that derives the breadcrumb path from the product's categories
 * and fetches sibling options for each level, then hands plain arrays to the
 * interactive client <PathBar>.
 *
 * Graceful degradation: if the product has no categories, renders a minimal
 * "Início / Produtos / {title}" path. Sibling fetches fail soft to a
 * single-option (current-only) dropdown.
 */
const PathBarWrapper = async ({
  product,
  countryCode,
}: PathBarWrapperProps) => {
  const productHref = `/products/${product.handle}`
  const categories = (product.categories ??
    []) as HttpTypes.StoreProductCategory[]

  // --- No categories: minimal path -----------------------------------------
  if (!categories.length) {
    const segments: PathSegment[] = [
      {
        label: "Produtos",
        options: [{ label: "Produtos", href: "/store", current: true }],
      },
      {
        label: product.title,
        options: [{ label: product.title, href: productHref, current: true }],
      },
    ]
    return <PathBar segments={segments} />
  }

  // --- Walk the parent chain (leaf → root) ----------------------------------
  const deepest = pickDeepestCategory(categories)!

  // The product's categories arrive with one level of parent. To build the full
  // chain we re-fetch each category by id (which carries parent + children).
  const chain: HttpTypes.StoreProductCategory[] = []
  let cursorId: string | undefined = deepest.id
  // Guard against cycles / runaway depth.
  let guard = 0
  while (cursorId && guard < 8) {
    const cat = await getCategoryById(cursorId)
    if (!cat) break
    chain.unshift(cat as HttpTypes.StoreProductCategory)
    cursorId = (cat.parent_category as HttpTypes.StoreProductCategory | null)
      ?.id
    guard++
  }

  // Fallback if the re-fetch failed entirely: use what came on the product.
  const path = chain.length ? chain : [deepest]

  const rootCategories = await getRootCategories()

  // --- Build a dropdown segment per category level --------------------------
  const categorySegments: PathSegment[] = path.map((cat, level) => {
    const parent = cat.parent_category as
      | HttpTypes.StoreProductCategory
      | null
      | undefined

    // Siblings = parent's children, or the root categories for the top level.
    const siblings: HttpTypes.StoreProductCategory[] =
      level === 0
        ? (rootCategories as HttpTypes.StoreProductCategory[])
        : ((parent?.category_children as
            | HttpTypes.StoreProductCategory[]
            | undefined) ?? [])

    const options: PathOption[] = (
      siblings.length ? siblings : [cat]
    ).map((sib) => ({
      label: sib.name,
      href: `/categories/${sib.handle}`,
      current: sib.id === cat.id,
    }))

    return { label: cat.name, options }
  })

  // --- Leaf segment: the product, with sibling products in its category -----
  let productOptions: PathOption[] = [
    { label: product.title, href: productHref, current: true },
  ]

  try {
    const {
      response: { products: siblings },
    } = await getProductsList({
      queryParams: {
        category_id: [deepest.id],
        limit: MAX_SIBLING_PRODUCTS,
      } as any,
      countryCode,
    })

    const siblingOptions = siblings
      .filter((p) => p.handle)
      .map((p) => ({
        label: p.title,
        href: `/products/${p.handle}`,
        current: p.id === product.id,
      }))

    // Ensure the current product is present even if outside the fetched window.
    if (siblingOptions.length) {
      if (!siblingOptions.some((o) => o.current)) {
        siblingOptions.unshift({
          label: product.title,
          href: productHref,
          current: true,
        })
      }
      productOptions = siblingOptions
    }
  } catch {
    // fall through to the single-option (current-only) leaf
  }

  const segments: PathSegment[] = [
    ...categorySegments,
    { label: product.title, options: productOptions },
  ]

  return <PathBar segments={segments} />
}

export default PathBarWrapper
