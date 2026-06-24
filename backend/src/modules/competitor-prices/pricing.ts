import { QueryContext } from "@medusajs/framework/utils"
import { parseMeasure, unitPriceMinor, type BaseUnit } from "./normalize"

export type OurPrice = {
  title?: string
  sku?: string | null
  pvp1: number | null
  pvp2: number | null
  cost: number | null
  // Canonical unit prices (€ per base unit, minor units) derived from the
  // product title's pack size — null when the title carries no size.
  base_unit: BaseUnit | null
  qty: number | null
  pvp1_unit: number | null
  pvp2_unit: number | null
  cost_unit: number | null
  // VAT rate as a fraction (e.g. 0.23), from Moloni; used to normalise a
  // competitor's incl-VAT price to our net basis. Our prices are net (ex-VAT).
  vat: number | null
}

const toMinor = (a: any): number | null =>
  a != null ? Math.round(Number(a) * 100) : null

/**
 * product_id → { title, sku, pvp1, pvp2, cost } (minor units, EUR) for the given
 * products. PVP1 = the variant default price; PVP2 + cost come from the draft
 * "Moloni PVP2" / "Moloni Cost" price lists, read directly (they're draft so the
 * calculated price ignores them). Shared by the admin route + the snapshot job.
 */
export async function readProductPrices(
  query: any,
  productIds: string[]
): Promise<Record<string, OurPrice>> {
  const out: Record<string, OurPrice> = {}
  if (!productIds.length) return out
  const variantToProduct: Record<string, string> = {}
  try {
    const { data } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "metadata",
        "variants.id",
        "variants.sku",
        "variants.calculated_price.calculated_amount",
      ],
      filters: { id: productIds },
      context: {
        variants: { calculated_price: QueryContext({ currency_code: "eur" }) },
      },
    })
    for (const p of data ?? []) {
      const v =
        p.variants?.find((x: any) => x?.calculated_price?.calculated_amount != null) ??
        p.variants?.[0]
      out[p.id] = {
        title: p.title,
        sku: p.variants?.[0]?.sku ?? null,
        pvp1: toMinor(v?.calculated_price?.calculated_amount),
        pvp2: null,
        cost: null,
        base_unit: null,
        qty: null,
        pvp1_unit: null,
        pvp2_unit: null,
        cost_unit: null,
        vat:
          p.metadata?.moloni_vat_percent != null
            ? Number(p.metadata.moloni_vat_percent) / 100
            : null,
      }
      for (const vv of p.variants ?? []) if (vv.id) variantToProduct[vv.id] = p.id
    }
  } catch {
    return out
  }

  try {
    const { data: lists } = await query.graph({
      entity: "price_list",
      fields: ["id", "title", "prices.amount", "prices.currency_code", "prices.price_set.variant.id"],
      filters: { title: ["Moloni PVP2", "Moloni Cost"] },
    })
    for (const l of lists ?? []) {
      const field = l.title === "Moloni Cost" ? "cost" : "pvp2"
      for (const pr of l.prices ?? []) {
        const pid = variantToProduct[pr.price_set?.variant?.id]
        if (pid && out[pid] && (pr.currency_code ?? "eur") === "eur") {
          out[pid][field] = toMinor(pr.amount)
        }
      }
    }
  } catch {
    // price lists unavailable → PVP1 only
  }

  // Canonical €/base-unit for each tier, parsed from the product title's size.
  for (const p of Object.values(out)) {
    const measure = parseMeasure(p.title)
    if (!measure) continue
    p.base_unit = measure.base_unit
    p.qty = measure.qty
    p.pvp1_unit = unitPriceMinor(p.pvp1, measure)
    p.pvp2_unit = unitPriceMinor(p.pvp2, measure)
    p.cost_unit = unitPriceMinor(p.cost, measure)
  }
  return out
}
