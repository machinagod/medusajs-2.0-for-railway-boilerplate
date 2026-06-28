import { sdk } from "@lib/config"
import { cache } from "react"
import { getProductsList } from "./products"

export const listCategories = cache(async function () {
  return sdk.store.category
    .list({ fields: "+category_children" }, { next: { tags: ["categories"] } })
    .then(({ product_categories }) => product_categories)
})

export const getCategoriesList = cache(async function (
  offset: number = 0,
  limit: number = 100
) {
  return sdk.store.category.list(
    // TODO: Look into fixing the type
    // @ts-ignore
    { limit, offset },
    { next: { tags: ["categories"] } }
  )
})

export const getCategoryByHandle = cache(async function (
  categoryHandle: string[]
) {
  return sdk.store.category.list(
    {
      handle: categoryHandle,
      // Pull the full descendant tree so a top-level category can list products
      // from all of its sub-categories (most products live on the leaves).
      include_descendants_tree: true,
      fields: "id,name,handle,description,*category_children",
    } as any,
    { next: { tags: ["categories"] } }
  )
})

/**
 * Collect a category's own id plus every descendant id from its
 * `category_children` tree (populated by `include_descendants_tree`). Used to
 * list products from a category AND all of its sub-categories.
 */
export function collectCategoryIds(category: any): string[] {
  const ids: string[] = []
  const walk = (c: any) => {
    if (!c?.id) return
    ids.push(c.id)
    for (const child of c.category_children || []) walk(child)
  }
  walk(category)
  return ids
}

/**
 * Retrieve a single category with its immediate parent and children. Used by the
 * product page path-bar to walk the parent chain and list sibling categories.
 * Fails soft to `null` so the path-bar can gracefully degrade.
 */
export const getCategoryById = cache(async function (categoryId: string) {
  return sdk.store.category
    .retrieve(
      categoryId,
      {
        fields:
          "id,name,handle,*parent_category,*category_children",
      },
      { next: { tags: ["categories"] } }
    )
    .then(({ product_category }) => product_category)
    .catch(() => null)
})

/**
 * Top-level categories for the header nav + home cards, resolved straight from
 * Medusa (dynamic — new product categories appear automatically). Non-product
 * roots (the deactivated bucket, supplier-brand groupings) are excluded at the
 * data source: the bucket is marked `is_internal` (so the store API omits it),
 * and brand groupings carry `metadata.nav_hidden` (so they stay reachable via
 * their /categories pages but drop out of the nav). Each entry resolves to its
 * real /categories/<handle> filtered page and carries a Lucide-style icon name.
 */
export const getNavCategories = cache(async function () {
  const roots = await getRootCategories()
  return (roots || [])
    .filter((c: any) => !isNavHidden(c))
    .map((c: any) => ({
      label: c.name as string,
      href: `/categories/${c.handle}`,
      icon: resolveCategoryIcon(c),
    }))
})

/** The Lucide icon id for a category: an explicit choice in `metadata.icon`
 * (set via the admin picker) wins; otherwise a keyword-derived default. */
export function resolveCategoryIcon(c: any): string {
  const chosen = c?.metadata?.icon
  if (typeof chosen === "string" && chosen.trim()) return chosen.trim()
  return categoryIconName(c?.name || "")
}

function isNavHidden(c: any): boolean {
  const v = c?.metadata?.nav_hidden
  return v === true || v === "true" || v === 1 || v === "1"
}

/** Keyword-derived default Lucide icon id (kebab-case) for a category name.
 * Used when the category has no explicit `metadata.icon`. Pure string helper so
 * the data layer stays free of JSX imports. */
export function categoryIconName(name: string): string {
  const n = (name || "").toLowerCase()
  if (n.includes("detergent") || n.includes("químic") || n.includes("lavandar")) return "spray-can"
  if (n.includes("máquina") || n.includes("maquina")) return "washing-machine"
  if (n.includes("utensílio") || n.includes("utensilio") || n.includes("esfreg") || n.includes("mopa")) return "brush"
  if (n.includes("hotel") || n.includes("cozinha") || n.includes("catering")) return "cooking-pot"
  if (n.includes("papel") || n.includes("toalha") || n.includes("guardanapo")) return "scroll-text"
  if (n.includes("saco")) return "shopping-bag"
  if (n.includes("ambientador") || n.includes("inseticida")) return "wind"
  if (n.includes("descartá") || n.includes("descarta")) return "utensils-crossed"
  if (n.includes("dispensador") || n.includes("suporte")) return "container"
  if (n.includes("assist") || n.includes("técnic") || n.includes("tecnic")) return "wrench"
  return "package"
}

/**
 * Two name-matched featured categories used by the hero's specific CTAs
 * ("Equipamento hoteleiro" + "Detergentes"). Resolved to real handles; falls
 * back to /store if not found.
 */
const FEATURED_CATEGORIES = [
  { match: "detergentes", label: "Detergentes" },
  { match: "equipamento hoteleiro", label: "Equipamento Hoteleiro" },
]

export const getFeaturedCategories = cache(async function () {
  const roots = await getRootCategories()
  const byName = new Map(
    (roots || []).map((c: any) => [String(c.name || "").toLowerCase().trim(), c])
  )
  return FEATURED_CATEGORIES.map(({ match, label }) => {
    const cat = byName.get(match)
    return { label, href: cat ? `/categories/${cat.handle}` : "/store" }
  })
})

/**
 * Retrieve the top-level (root) categories — those with no parent. Used as the
 * sibling set for the first path-bar segment and the source for the nav. Ordered
 * by the category `rank` so the nav follows the merchandising order set in admin.
 */
export const getRootCategories = cache(async function () {
  return sdk.store.category
    .list(
      // @ts-ignore — parent_category_id filter is supported by the store API
      {
        parent_category_id: "null",
        fields: "id,name,handle,rank,metadata",
        limit: 100,
      },
      { next: { tags: ["categories"] } }
    )
    .then(({ product_categories }) =>
      [...(product_categories || [])].sort(navSortKey)
    )
    .catch(() => [])
})

/**
 * Order categories for the storefront nav. Precedence:
 *   1. explicit `metadata.nav_order` (set per-category in the admin) — wins,
 *   2. a flagship-led default for the known product lines (so the nav reads
 *      intentionally out of the box instead of alphabetically),
 *   3. the Medusa `rank`, then name.
 * A merchant can override any position from the admin "Storefront nav" widget
 * without touching code; new categories fall through to rank/name.
 */
const DEFAULT_NAV_PRIORITY: Record<string, number> = {
  detergentes: 1,
  "utensilios-limpeza": 2,
  "maquinas-de-limpeza": 3,
  "equipamento-hoteleiro": 4,
  papel: 5,
  descartaveis: 6,
  sacos: 7,
  "ambientador-e-inseticidas": 8,
  "suportes-e-dispensadores": 9,
}

function navSortKey(a: any, b: any): number {
  const ao = navOrder(a)
  const bo = navOrder(b)
  if (ao !== bo) return ao - bo
  const ap = DEFAULT_NAV_PRIORITY[a?.handle] ?? Number.MAX_SAFE_INTEGER
  const bp = DEFAULT_NAV_PRIORITY[b?.handle] ?? Number.MAX_SAFE_INTEGER
  if (ap !== bp) return ap - bp
  const ar = a?.rank ?? Number.MAX_SAFE_INTEGER
  const br = b?.rank ?? Number.MAX_SAFE_INTEGER
  if (ar !== br) return ar - br
  return String(a?.name || "").localeCompare(String(b?.name || ""))
}

function navOrder(c: any): number {
  const v = Number(c?.metadata?.nav_order)
  return Number.isFinite(v) ? v : Number.MAX_SAFE_INTEGER
}

export type NavCategoryCard = {
  label: string
  href: string
  icon: string
  /** Up to CARD_IMAGE_COUNT primary product thumbnails for the card carousel. */
  images: string[]
}

/** How many representative product images each home category card rotates. */
const CARD_IMAGE_COUNT = 5

/**
 * Nav categories (same set/order as {@link getNavCategories}) enriched with a
 * few representative product images for the home cards' bottom-right carousel.
 * Images are the products' primary thumbnails, pulled from the category AND all
 * of its sub-categories — most products live on the leaves, so we walk the
 * descendant tree to collect ids. Resolved per-category in parallel; any
 * per-category failure degrades to an empty image list (card renders, no
 * carousel) rather than failing the whole section.
 */
export const getNavCategoriesWithImages = cache(async function (
  countryCode: string
): Promise<NavCategoryCard[]> {
  const roots = await getRootCategories()
  const visible = (roots || []).filter((c: any) => !isNavHidden(c))
  return Promise.all(
    visible.map(async (c: any) => ({
      label: c.name as string,
      href: `/categories/${c.handle}`,
      icon: resolveCategoryIcon(c),
      images: await getCategoryThumbnails(c.handle, countryCode).catch(
        () => [] as string[]
      ),
    }))
  )
})

/**
 * Distinct primary thumbnails (up to {@link CARD_IMAGE_COUNT}) for a category
 * and its descendants. Over-fetches a small page and de-dupes, so categories
 * whose first products lack images still fill the carousel when possible.
 */
async function getCategoryThumbnails(
  handle: string,
  countryCode: string
): Promise<string[]> {
  const { product_categories } = await getCategoryByHandle([handle])
  const root = product_categories?.[0]
  if (!root) return []

  const ids = collectCategoryIds(root)
  if (!ids.length) return []

  const {
    response: { products },
  } = await getProductsList({
    queryParams: { category_id: ids, limit: 12, fields: "id,thumbnail" } as any,
    countryCode,
  })

  const images: string[] = []
  const seen = new Set<string>()
  for (const p of products) {
    const url = p.thumbnail
    if (!url || seen.has(url)) continue
    seen.add(url)
    images.push(url)
    if (images.length >= CARD_IMAGE_COUNT) break
  }
  return images
}
