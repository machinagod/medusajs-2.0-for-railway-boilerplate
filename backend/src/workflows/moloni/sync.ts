/**
 * Moloni -> Medusa sync orchestration.
 *
 * Idempotent: every entity is keyed on its Moloni id (products via
 * `external_id`, everything else via `metadata.moloni_*`), so re-runs update
 * in place rather than duplicating. Safe to run on a schedule.
 *
 * Order matters: categories -> products(+variants, default EUR price) ->
 * price lists (price classes + cost) -> stock -> customers.
 */
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createCustomerAddressesWorkflow,
  createCustomersWorkflow,
  createInventoryLevelsWorkflow,
  createPriceListPricesWorkflow,
  createPriceListsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  deleteProductsWorkflow,
  updateCustomersWorkflow,
  updateInventoryLevelsWorkflow,
  updatePriceListPricesWorkflow,
  updateProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { MOLONI_MODULE } from "../../modules/moloni"
import type MoloniModuleService from "../../modules/moloni/service"
import { EPOCH_CURSOR } from "../../modules/moloni/service"
import type { MoloniCustomer, MoloniProduct } from "../../modules/moloni"
import {
  EUR,
  categoryHandle,
  collectPriceClasses,
  defaultEurPrice,
  placeholderCustomerEmail,
  realCustomerEmail,
  supplierCost,
  toCreateProductInput,
  toCustomerAddress,
  toCustomerInput,
  totalStock,
} from "./mappers"

export type MoloniSyncEntity =
  | "categories"
  | "products"
  | "prices"
  | "stock"
  | "customers"

export interface MoloniSyncOptions {
  dryRun?: boolean
  /** Cap products & customers fetched (for testing / first observed runs). */
  limit?: number
  /** Restrict to a subset of entities. Defaults to all. */
  entities?: MoloniSyncEntity[]
  /** Override product status (defaults to draft). */
  productStatus?: "draft" | "published"
  /**
   * Ignore stored cursors and fetch everything (since epoch). Default false:
   * the run is incremental once a cursor exists, full on the first run.
   */
  full?: boolean
}

export interface MoloniSyncReport {
  dryRun: boolean
  categories: { created: number; updated: number }
  products: { created: number; updated: number }
  priceListPrices: { created: number; updated: number; priceLists: number }
  stock: { created: number; updated: number }
  customers: {
    created: number
    updated: number
    skipped: number
    emailConflicts: number
  }
}

const CHUNK = 50

function chunk<T>(arr: T[], size = CHUNK): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** Fetch every row of a graph query, paginating in pages of 200. */
async function graphAll(
  query: any,
  entity: string,
  fields: string[],
  filters?: Record<string, unknown>
): Promise<any[]> {
  const out: any[] = []
  let skip = 0
  const take = 200
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, metadata } = await query.graph({
      entity,
      fields,
      filters,
      pagination: { skip, take },
    })
    out.push(...data)
    const count = metadata?.count ?? out.length
    skip += take
    if (out.length >= count || data.length === 0) break
  }
  return out
}

export async function runMoloniSync(
  container: MedusaContainer,
  options: MoloniSyncOptions = {}
): Promise<MoloniSyncReport> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const moloni = container.resolve(MOLONI_MODULE) as MoloniModuleService

  const dryRun = options.dryRun ?? false
  const status = (options.productStatus ?? "draft") as "draft" | "published"
  const entities = new Set<MoloniSyncEntity>(
    options.entities ?? ["categories", "products", "prices", "stock", "customers"]
  )

  const report: MoloniSyncReport = {
    dryRun,
    categories: { created: 0, updated: 0 },
    products: { created: 0, updated: 0 },
    priceListPrices: { created: 0, updated: 0, priceLists: 0 },
    stock: { created: 0, updated: 0 },
    customers: { created: 0, updated: 0, skipped: 0, emailConflicts: 0 },
  }

  logger.info(
    `[moloni-sync] start dryRun=${dryRun} entities=${[...entities].join(",")} limit=${
      options.limit ?? "none"
    }`
  )

  // ── Shared infra references ──────────────────────────────────────────────
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
  const [defaultSalesChannel] = await salesChannelService.listSalesChannels({
    name: "Default Sales Channel",
  })
  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  const [shippingProfile] = await fulfillmentService.listShippingProfiles({
    type: "default",
  })
  const [stockLocation] = await graphAll(query, "stock_location", ["id", "name"])

  if (!defaultSalesChannel || !shippingProfile || !stockLocation) {
    throw new Error(
      "[moloni-sync] Missing prerequisites (default sales channel / shipping profile / stock location). Run the base seed first."
    )
  }

  // ── 1. Categories ──────────────────────────────────────────────────────
  // moloni category_id -> medusa category id
  const categoryMap = new Map<number, string>()
  {
    const existing = await graphAll(query, "product_category", [
      "id",
      "metadata",
    ])
    for (const c of existing) {
      const mid = c.metadata?.moloni_category_id
      if (mid != null) categoryMap.set(Number(mid), c.id)
    }
  }

  if (entities.has("categories")) {
    const moloniCats = await moloni.listAllCategories()
    const pending = [...moloniCats]
    // Topologically create/update: a category is ready when its parent is the
    // root (0) or already mapped.
    let guard = pending.length + 1
    while (pending.length && guard-- > 0) {
      const ready = pending.filter(
        (c) => c.parent_id === 0 || categoryMap.has(c.parent_id)
      )
      if (!ready.length) {
        // Orphans (parent missing in Moloni payload) — attach to root.
        ready.push(...pending)
      }
      for (const c of ready) {
        const parentId =
          c.parent_id === 0 ? undefined : categoryMap.get(c.parent_id)
        const existingId = categoryMap.get(c.category_id)
        if (existingId) {
          if (!dryRun) {
            await updateProductCategoriesWorkflow(container).run({
              input: {
                selector: { id: existingId },
                update: {
                  name: c.name,
                  parent_category_id: parentId ?? null,
                },
              },
            })
          }
          report.categories.updated++
        } else {
          if (!dryRun) {
            const { result } = await createProductCategoriesWorkflow(
              container
            ).run({
              input: {
                product_categories: [
                  {
                    name: c.name,
                    handle: categoryHandle(c.name, c.category_id),
                    is_active: true,
                    parent_category_id: parentId ?? null,
                    metadata: { moloni_category_id: c.category_id },
                  },
                ],
              },
            })
            categoryMap.set(c.category_id, result[0].id)
          } else {
            // In dry-run we still register a placeholder so children resolve.
            categoryMap.set(c.category_id, `dry-${c.category_id}`)
          }
          report.categories.created++
        }
      }
      const done = new Set(ready.map((c) => c.category_id))
      for (let i = pending.length - 1; i >= 0; i--) {
        if (done.has(pending[i].category_id)) pending.splice(i, 1)
      }
    }
    logger.info(
      `[moloni-sync] categories created=${report.categories.created} updated=${report.categories.updated}`
    )
  }

  // ── 2. Products (+ default EUR price on the single variant) ─────────────
  const needProducts =
    entities.has("products") || entities.has("prices") || entities.has("stock")
  const runStart = new Date().toISOString()
  const productsSince = options.full
    ? EPOCH_CURSOR
    : await moloni.getSyncCursor("products")
  const moloniProducts = needProducts
    ? await moloni.listProducts({ since: productsSince, limit: options.limit })
    : []

  // moloni product_id -> { productId, variantId }. Only look up the products
  // we actually fetched (keeps incremental runs cheap as the catalog grows).
  const variantByMoloni = new Map<
    number,
    { productId: string; variantId: string }
  >()
  if (moloniProducts.length) {
    const externalIds = moloniProducts.map((p) => String(p.product_id))
    const existing: any[] = []
    for (const ids of chunk(externalIds, 200)) {
      existing.push(
        ...(await graphAll(
          query,
          "product",
          ["id", "external_id", "variants.id", "variants.sku"],
          { external_id: ids }
        ))
      )
    }
    for (const p of existing) {
      if (!p.external_id) continue
      const mid = Number(p.external_id)
      if (Number.isNaN(mid)) continue
      const variantId = p.variants?.[0]?.id
      if (variantId) variantByMoloni.set(mid, { productId: p.id, variantId })
    }
  }

  if (entities.has("products")) {
    const toCreate: MoloniProduct[] = []
    const toUpdate: MoloniProduct[] = []
    for (const p of moloniProducts) {
      ;(variantByMoloni.has(p.product_id) ? toUpdate : toCreate).push(p)
    }

    // creates (batched)
    for (const batch of chunk(toCreate)) {
      const products = batch.map((p) =>
        toCreateProductInput({
          product: p,
          status,
          categoryId: categoryMap.get(p.category_id),
          shippingProfileId: shippingProfile.id,
          salesChannelId: defaultSalesChannel.id,
        })
      )
      if (!dryRun) {
        const { result } = await createProductsWorkflow(container).run({
          input: { products: products as any },
        })
        for (const created of result) {
          const mid = Number(created.external_id)
          const variantId = created.variants?.[0]?.id
          if (!Number.isNaN(mid) && variantId) {
            variantByMoloni.set(mid, { productId: created.id, variantId })
          }
        }
      }
      report.products.created += batch.length
    }

    // updates (preserve manual status / publishing)
    for (const batch of chunk(toUpdate)) {
      const products = batch
        .map((p) => {
          const ref = variantByMoloni.get(p.product_id)!
          const cost = supplierCost(p)
          return {
            id: ref.productId,
            title: p.name,
            description: p.summary || undefined,
            category_ids: categoryMap.get(p.category_id)
              ? [categoryMap.get(p.category_id)!]
              : undefined,
            metadata: {
              moloni_product_id: p.product_id,
              moloni_category_id: p.category_id,
            },
            variants: [
              {
                id: ref.variantId,
                sku: p.reference || `MOLONI-${p.product_id}`,
                barcode: p.ean || undefined,
                manage_inventory: p.has_stock === 1,
                prices: [{ amount: defaultEurPrice(p), currency_code: EUR }],
                metadata: { moloni_product_id: p.product_id, ...cost },
              },
            ],
          }
        })
      if (!dryRun) {
        await updateProductsWorkflow(container).run({
          input: { products: products as any },
        })
      }
      report.products.updated += batch.length
    }
    logger.info(
      `[moloni-sync] products created=${report.products.created} updated=${report.products.updated}`
    )
  }

  // ── 3. Price lists (price classes + Moloni Cost) ────────────────────────
  if (entities.has("prices") && !dryRun) {
    await syncPriceLists(container, query, moloniProducts, variantByMoloni, report, logger)
  } else if (entities.has("prices")) {
    const classes = collectPriceClasses(moloniProducts)
    logger.info(
      `[moloni-sync] (dry) would ensure ${classes.size + 1} price lists and prices for ${variantByMoloni.size} variants`
    )
  }

  // ── 4. Stock ────────────────────────────────────────────────────────────
  if (entities.has("stock")) {
    await syncStock(
      container,
      query,
      moloniProducts,
      variantByMoloni,
      stockLocation.id,
      dryRun,
      report,
      logger
    )
  }

  // Advance the products cursor once products (and their derived prices/stock)
  // are synced. Use the run start time so anything modified during the run is
  // re-checked next time.
  if (entities.has("products") && !dryRun) {
    await moloni.setSyncCursor("products", runStart)
  }

  // ── 5. Customers ────────────────────────────────────────────────────────
  if (entities.has("customers")) {
    const customersSince = options.full
      ? EPOCH_CURSOR
      : await moloni.getSyncCursor("customers")
    await syncCustomers(
      container,
      query,
      moloni,
      customersSince,
      options.limit,
      dryRun,
      report,
      logger
    )
    if (!dryRun) await moloni.setSyncCursor("customers", runStart)
  }

  logger.info(`[moloni-sync] done: ${JSON.stringify(report)}`)
  return report
}

/**
 * Prune Medusa products that were imported from Moloni but are no longer in
 * Moloni's *visible* set (archived/hidden or deleted in Moloni). Manual only —
 * never wired into the scheduled job, since auto-deletion on a cron is risky.
 *
 * Safety: aborts if Moloni returns an implausibly small visible set, or if the
 * prune would remove more than 70% of the imported products (guards against a
 * partial/empty API response wiping the catalog).
 */
export async function pruneInvisibleProducts(
  container: MedusaContainer,
  opts: { dryRun?: boolean } = {}
): Promise<{ visible: number; imported: number; toDelete: number; deleted: number }> {
  const dryRun = opts.dryRun ?? false
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const moloni = container.resolve(MOLONI_MODULE) as MoloniModuleService

  const visible = await moloni.listProducts({}) // getModifiedSince(epoch) = visible only
  const visibleIds = new Set(visible.map((p) => String(p.product_id)))
  if (visibleIds.size < 100) {
    throw new Error(
      `[moloni-prune] aborting: Moloni returned only ${visibleIds.size} visible products — refusing to prune`
    )
  }

  const existing = await graphAll(query, "product", ["id", "external_id"])
  const imported = existing.filter(
    (p) => p.external_id && /^\d+$/.test(p.external_id)
  )
  const toDelete = imported
    .filter((p) => !visibleIds.has(p.external_id))
    .map((p) => p.id)

  const ratio = imported.length ? toDelete.length / imported.length : 0
  if (ratio > 0.7) {
    throw new Error(
      `[moloni-prune] aborting: would delete ${toDelete.length}/${imported.length} (${Math.round(
        ratio * 100
      )}%) imported products — exceeds 70% safety threshold`
    )
  }

  logger.info(
    `[moloni-prune] visible=${visibleIds.size} imported=${imported.length} toDelete=${toDelete.length} dryRun=${dryRun}`
  )

  if (!dryRun) {
    for (const batch of chunk(toDelete, 100)) {
      await deleteProductsWorkflow(container).run({ input: { ids: batch } })
    }
  }

  return {
    visible: visibleIds.size,
    imported: imported.length,
    toDelete: toDelete.length,
    deleted: dryRun ? 0 : toDelete.length,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Price lists
// ─────────────────────────────────────────────────────────────────────────
async function syncPriceLists(
  container: MedusaContainer,
  query: any,
  products: MoloniProduct[],
  variantByMoloni: Map<number, { productId: string; variantId: string }>,
  report: MoloniSyncReport,
  logger: any
) {
  const classes = collectPriceClasses(products) // price_class_id -> title

  // price_list has no metadata column, so idempotency keys on the deterministic
  // title ("Moloni <price class>", and "Moloni Cost").
  const COST_TITLE = "Moloni Cost"
  const classTitle = (title: string) => `Moloni ${title}`

  const existingLists = await graphAll(query, "price_list", ["id", "title"])
  const listByTitle = new Map<string, string>()
  for (const pl of existingLists) {
    if (pl.title) listByTitle.set(pl.title, pl.id)
  }

  // Moloni price-class / cost lists are created as DRAFT so they never apply to
  // storefront carts — otherwise Medusa resolves to the cheapest applicable
  // price and leaks supplier cost / wholesale (PVP2…) as the public price. The
  // store uses the variant's default price (= PVP1); these drafts keep cost and
  // alternate classes visible in admin for margin analysis only.
  const ensureList = async (title: string, description: string) => {
    const existing = listByTitle.get(title)
    if (existing) return existing
    const { result } = await createPriceListsWorkflow(container).run({
      input: {
        price_lists_data: [
          { title, description, type: "override", status: "draft" } as any,
        ],
      },
    })
    listByTitle.set(title, result[0].id)
    report.priceListPrices.priceLists++
    return result[0].id as string
  }

  // price_class_id -> price list id
  const listByClass = new Map<number, string>()
  for (const [classId, title] of classes) {
    const id = await ensureList(
      classTitle(title),
      `Moloni price class ${title} (#${classId})`
    )
    listByClass.set(classId, id)
  }
  const costListId = await ensureList(
    COST_TITLE,
    "Supplier cost prices imported from Moloni"
  )

  // Existing price-list prices keyed by `${listId}:${variantId}` -> { id, amount }.
  const existingPrices = new Map<string, { id: string; amount: number }>()
  try {
    const lists = await graphAll(query, "price_list", [
      "id",
      "prices.id",
      "prices.amount",
      "prices.currency_code",
      "prices.price_set.variant.id",
    ])
    for (const pl of lists) {
      for (const pr of pl.prices ?? []) {
        const variantId = pr.price_set?.variant?.id
        if (variantId) {
          existingPrices.set(`${pl.id}:${variantId}`, {
            id: pr.id,
            amount: pr.amount,
          })
        }
      }
    }
  } catch (e: any) {
    logger.warn(
      `[moloni-sync] could not read existing price-list prices (${e.message}); will create only`
    )
  }

  // Build desired prices grouped by list, split into create vs update.
  const toCreate = new Map<string, any[]>() // listId -> [{amount,currency_code,variant_id}]
  const toUpdate = new Map<string, any[]>() // listId -> [{id,amount,currency_code,variant_id}]

  const push = (listId: string, variantId: string, amount: number) => {
    const key = `${listId}:${variantId}`
    const existing = existingPrices.get(key)
    if (existing) {
      if (Math.abs(existing.amount - amount) > 1e-9) {
        const arr = toUpdate.get(listId) ?? []
        arr.push({ id: existing.id, amount, currency_code: EUR, variant_id: variantId })
        toUpdate.set(listId, arr)
      }
    } else {
      const arr = toCreate.get(listId) ?? []
      arr.push({ amount, currency_code: EUR, variant_id: variantId })
      toCreate.set(listId, arr)
    }
  }

  for (const p of products) {
    const ref = variantByMoloni.get(p.product_id)
    if (!ref) continue
    for (const pc of p.price_classes ?? []) {
      const listId = listByClass.get(pc.price_class?.price_class_id)
      if (listId) push(listId, ref.variantId, Number(pc.value) || 0)
    }
    const cost = supplierCost(p)
    const costAmount = cost.cost_price_discounted ?? cost.cost_price
    if (costListId && costAmount != null) {
      push(costListId, ref.variantId, Number(costAmount) || 0)
    }
  }

  for (const [listId, prices] of toCreate) {
    for (const batch of chunk(prices, 200)) {
      await createPriceListPricesWorkflow(container).run({
        input: { data: [{ id: listId, prices: batch as any }] },
      })
      report.priceListPrices.created += batch.length
    }
  }
  for (const [listId, prices] of toUpdate) {
    for (const batch of chunk(prices, 200)) {
      await updatePriceListPricesWorkflow(container).run({
        input: { data: [{ id: listId, prices: batch as any }] },
      })
      report.priceListPrices.updated += batch.length
    }
  }
  logger.info(
    `[moloni-sync] price-list prices created=${report.priceListPrices.created} updated=${report.priceListPrices.updated} lists=${report.priceListPrices.priceLists}`
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Stock
// ─────────────────────────────────────────────────────────────────────────
async function syncStock(
  container: MedusaContainer,
  query: any,
  products: MoloniProduct[],
  variantByMoloni: Map<number, { productId: string; variantId: string }>,
  locationId: string,
  dryRun: boolean,
  report: MoloniSyncReport,
  logger: any
) {
  // variant id -> inventory_item id
  const variantIds = [...variantByMoloni.values()].map((v) => v.variantId)
  const invItemByVariant = new Map<string, string>()
  for (const batch of chunk(variantIds, 100)) {
    const rows = await graphAll(
      query,
      "product_variant",
      ["id", "inventory_items.inventory.id"],
      { id: batch }
    )
    for (const v of rows) {
      const invId = v.inventory_items?.[0]?.inventory?.id
      if (invId) invItemByVariant.set(v.id, invId)
    }
  }

  // existing inventory levels at this location
  const levels = await graphAll(
    query,
    "inventory_level",
    ["id", "inventory_item_id", "location_id", "stocked_quantity"],
    { location_id: locationId }
  )
  const levelByItem = new Map<string, { id: string; stocked: number }>()
  for (const l of levels) {
    levelByItem.set(l.inventory_item_id, {
      id: l.id,
      stocked: l.stocked_quantity,
    })
  }

  const toCreate: any[] = []
  const toUpdate: any[] = []
  for (const p of products) {
    const ref = variantByMoloni.get(p.product_id)
    if (!ref || p.has_stock !== 1) continue
    const invId = invItemByVariant.get(ref.variantId)
    if (!invId) continue
    const stocked = Math.max(0, Math.round(totalStock(p)))
    const existing = levelByItem.get(invId)
    if (existing) {
      if (existing.stocked !== stocked) {
        toUpdate.push({
          inventory_item_id: invId,
          location_id: locationId,
          stocked_quantity: stocked,
        })
      }
    } else {
      toCreate.push({
        inventory_item_id: invId,
        location_id: locationId,
        stocked_quantity: stocked,
      })
    }
  }

  if (!dryRun && toCreate.length) {
    for (const batch of chunk(toCreate, 200)) {
      await createInventoryLevelsWorkflow(container).run({
        input: { inventory_levels: batch },
      })
    }
  }
  if (!dryRun && toUpdate.length) {
    for (const batch of chunk(toUpdate, 200)) {
      await updateInventoryLevelsWorkflow(container).run({
        input: { updates: batch } as any,
      })
    }
  }
  report.stock.created += toCreate.length
  report.stock.updated += toUpdate.length
  logger.info(
    `[moloni-sync] stock created=${report.stock.created} updated=${report.stock.updated}`
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Customers
// ─────────────────────────────────────────────────────────────────────────
async function syncCustomers(
  container: MedusaContainer,
  query: any,
  moloni: MoloniModuleService,
  since: string,
  limit: number | undefined,
  dryRun: boolean,
  report: MoloniSyncReport,
  logger: any
) {
  const moloniCustomers = await moloni.listCustomers({ since, limit })
  if (!moloniCustomers.length) {
    logger.info("[moloni-sync] no modified customers")
    return
  }

  // Existence is keyed on the authoritative moloni_customer_id (order-independent)
  // rather than email — email-based matching is fragile when collision-resolution
  // order differs between runs. Load existing customers once, mapping both by
  // Moloni id (update/create decision) and by email (collision detection when
  // minting an email for a NEW customer).
  const existingAll = await graphAll(query, "customer", [
    "id",
    "email",
    "metadata",
  ])
  const byMoloniId = new Map<number, { id: string; metadata: any }>()
  const emailOwner = new Map<string, number | null>() // email -> moloni id | null
  for (const r of existingAll) {
    const mid = r.metadata?.moloni_customer_id
    if (r.email) {
      emailOwner.set(r.email.toLowerCase(), mid != null ? Number(mid) : null)
    }
    if (mid != null) {
      byMoloniId.set(Number(mid), { id: r.id, metadata: r.metadata ?? {} })
    }
  }

  // Reserve a unique email for a NEW customer: its real email if free, else the
  // deterministic placeholder (falling back to the always-unique customer_id if
  // two Moloni customers ever share a number).
  const claimed = new Map<string, number>() // email -> moloni id that claimed it
  const reserveEmail = (c: MoloniCustomer) => {
    const real = realCustomerEmail(c)
    if (real) {
      const owner = emailOwner.get(real)
      const claimer = claimed.get(real)
      const free =
        (owner === undefined || owner === c.customer_id) &&
        (claimer === undefined || claimer === c.customer_id)
      if (free) {
        claimed.set(real, c.customer_id)
        return { finalEmail: real, noEmail: false, conflict: false, real }
      }
    }
    let ph = placeholderCustomerEmail(c)
    if (claimed.has(ph) && claimed.get(ph) !== c.customer_id) {
      ph = `moloni-${c.customer_id}@no-email.invalid`
    }
    claimed.set(ph, c.customer_id)
    return { finalEmail: ph, noEmail: !real, conflict: !!real, real }
  }

  const creates: { input: any; moloni: MoloniCustomer }[] = []
  for (const c of moloniCustomers) {
    const existing = byMoloniId.get(c.customer_id)
    if (existing) {
      // Keep the existing email (changing it risks collisions) and preserve its
      // email-related flags; refresh the mutable fields.
      if (!dryRun) {
        await updateCustomersWorkflow(container).run({
          input: {
            selector: { id: existing.id },
            update: {
              company_name: c.name || undefined,
              phone: c.phone || c.contact_phone || undefined,
              metadata: {
                ...existing.metadata,
                moloni_customer_id: c.customer_id,
                moloni_number: c.number,
                moloni_vat: c.vat || null,
              },
            },
          },
        })
      }
      report.customers.updated++
      continue
    }
    const r = reserveEmail(c)
    if (r.conflict) report.customers.emailConflicts++
    const input = toCustomerInput(c, r.finalEmail, {
      noEmail: r.noEmail,
      emailConflict: r.conflict,
      realEmail: r.conflict ? r.real : undefined,
    })
    creates.push({ input, moloni: c })
  }

  for (const batch of chunk(creates)) {
    if (!dryRun) {
      const { result } = await createCustomersWorkflow(container).run({
        input: { customersData: batch.map((b) => b.input) },
      })
      // Attach addresses for the freshly created customers.
      const addresses: any[] = []
      for (let i = 0; i < result.length; i++) {
        const addr = toCustomerAddress(batch[i].moloni)
        if (addr) addresses.push({ customer_id: result[i].id, ...addr })
      }
      if (addresses.length) {
        await createCustomerAddressesWorkflow(container).run({
          input: { addresses },
        })
      }
    }
    report.customers.created += batch.length
  }
  logger.info(
    `[moloni-sync] customers created=${report.customers.created} updated=${report.customers.updated} skipped=${report.customers.skipped} emailConflicts=${report.customers.emailConflicts} (conflicts imported under placeholder emails)`
  )
}
