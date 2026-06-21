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
 * Retrieve the top-level (root) categories — those with no parent. Used as the
 * sibling set for the first path-bar segment.
 */
export const getRootCategories = cache(async function () {
  return sdk.store.category
    .list(
      // @ts-ignore — parent_category_id filter is supported by the store API
      {
        parent_category_id: "null",
        fields: "id,name,handle",
        limit: 100,
      },
      { next: { tags: ["categories"] } }
    )
    .then(({ product_categories }) => product_categories)
    .catch(() => [])
})
