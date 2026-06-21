import { sdk } from "@lib/config"
import { cache } from "react"

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
    // TODO: Look into fixing the type
    // @ts-ignore
    { handle: categoryHandle },
    { next: { tags: ["categories"] } }
  )
})

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
      [...(product_categories || [])].sort(
        (a: any, b: any) => (a.rank ?? 0) - (b.rank ?? 0)
      )
    )
    .catch(() => [])
})
