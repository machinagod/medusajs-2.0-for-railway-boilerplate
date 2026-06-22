/**
 * Pure mapping helpers: Moloni shapes -> Medusa workflow inputs.
 * No I/O here, so these are trivially unit-testable.
 */
import { MoloniCustomer, MoloniProduct } from "../../modules/moloni"

export const EUR = "eur"

/** Lowercase, accent-stripped, hyphenated slug. */
export function slugify(input: string): string {
  return (input || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

/** Product handle, kept globally unique by the Moloni product id. */
export function productHandle(p: MoloniProduct): string {
  return `${slugify(p.reference || p.name) || "product"}-${p.product_id}`
}

/** Category handle, kept globally unique by the Moloni category id
 * (Moloni allows duplicate category names; Medusa handles must be unique). */
export function categoryHandle(name: string, categoryId: number): string {
  return `${slugify(name) || "category"}-${categoryId}`
}

/** Pick the default EUR price: PVP1 price class, falling back to product.price. */
export function defaultEurPrice(p: MoloniProduct): number {
  const pvp1 = p.price_classes?.find(
    (pc) => pc.price_class?.title?.trim().toUpperCase() === "PVP1"
  )
  const amount = pvp1?.value ?? p.price ?? 0
  return Number(amount) || 0
}

/** Primary VAT percentage on the product (e.g. 23), if any. */
export function vatPercent(p: MoloniProduct): number | undefined {
  const tax = p.taxes?.[0]?.tax
  return tax ? Number(tax.value) : undefined
}

/** Supplier cost info to store on the variant (first supplier wins). */
export function supplierCost(p: MoloniProduct): {
  cost_price?: number
  cost_price_discounted?: number
  supplier_id?: number
  supplier_reference?: string
} {
  const s = p.suppliers?.[0]
  if (!s) return {}
  return {
    cost_price: s.cost_price,
    cost_price_discounted: s.cost_price_discounted,
    supplier_id: s.supplier_id,
    supplier_reference: s.reference || undefined,
  }
}

/** Total on-hand stock: prefer summed warehouses, fall back to product.stock. */
export function totalStock(p: MoloniProduct): number {
  if (p.warehouses?.length) {
    return p.warehouses.reduce((sum, w) => sum + (Number(w.stock) || 0), 0)
  }
  return Number(p.stock) || 0
}

/**
 * Distinct Moloni price classes appearing on a set of products, keyed by
 * price_class_id, with their display title.
 */
export function collectPriceClasses(
  products: MoloniProduct[]
): Map<number, string> {
  const map = new Map<number, string>()
  for (const p of products) {
    for (const pc of p.price_classes ?? []) {
      if (pc.price_class?.price_class_id != null) {
        map.set(pc.price_class.price_class_id, pc.price_class.title)
      }
    }
  }
  return map
}

const DEFAULT_OPTION_TITLE = "Default"
const DEFAULT_OPTION_VALUE = "Default"

/** A Moloni product becomes a single-variant Medusa product. */
export function toCreateProductInput(args: {
  product: MoloniProduct
  status: "draft" | "published"
  categoryId?: string
  shippingProfileId: string
  salesChannelId: string
}) {
  const { product, status, categoryId, shippingProfileId, salesChannelId } =
    args
  const cost = supplierCost(product)

  return {
    title: product.name,
    handle: productHandle(product),
    status,
    // description & subtitle are Medusa-owned (SoT); the sync never touches them.
    shipping_profile_id: shippingProfileId,
    external_id: String(product.product_id),
    category_ids: categoryId ? [categoryId] : [],
    sales_channels: [{ id: salesChannelId }],
    metadata: {
      moloni_product_id: product.product_id,
      moloni_category_id: product.category_id,
      moloni_vat_percent: vatPercent(product) ?? null,
    },
    options: [{ title: DEFAULT_OPTION_TITLE, values: [DEFAULT_OPTION_VALUE] }],
    variants: [
      {
        title: product.name,
        sku: product.reference || `MOLONI-${product.product_id}`,
        barcode: product.ean || undefined,
        manage_inventory: product.has_stock === 1,
        options: { [DEFAULT_OPTION_TITLE]: DEFAULT_OPTION_VALUE },
        prices: [{ amount: defaultEurPrice(product), currency_code: EUR }],
        metadata: {
          moloni_product_id: product.product_id,
          ...cost,
        },
      },
    ],
  }
}

/** The customer's real email (lowercased), or undefined if Moloni has none. */
export function realCustomerEmail(c: MoloniCustomer): string | undefined {
  const real = (c.email || c.contact_email || "").trim().toLowerCase()
  return real || undefined
}

/**
 * Deterministic placeholder email, unique per Moloni customer (number is
 * unique in Moloni). Used when the customer has no email OR its real email
 * collides with another customer's.
 */
export function placeholderCustomerEmail(c: MoloniCustomer): string {
  return `moloni-${c.number || c.customer_id}@no-email.invalid`
}

export function toCustomerInput(
  c: MoloniCustomer,
  finalEmail: string,
  opts: { noEmail?: boolean; emailConflict?: boolean; realEmail?: string } = {}
) {
  return {
    email: finalEmail,
    company_name: c.name || undefined,
    phone: c.phone || c.contact_phone || undefined,
    metadata: {
      moloni_customer_id: c.customer_id,
      moloni_number: c.number,
      moloni_vat: c.vat || null,
      moloni_no_email: opts.noEmail ?? false,
      moloni_email_conflict: opts.emailConflict ?? false,
      ...(opts.realEmail ? { moloni_real_email: opts.realEmail } : {}),
    },
  }
}

/** Customer address from the Moloni billing fields, if there's anything to store. */
export function toCustomerAddress(c: MoloniCustomer) {
  if (!c.address && !c.city && !c.zip_code) return undefined
  return {
    company: c.name || undefined,
    address_1: c.address || undefined,
    city: c.city || undefined,
    postal_code: c.zip_code || undefined,
    country_code: c.country?.iso_3166_1?.toLowerCase() || undefined,
    phone: c.phone || undefined,
  }
}
