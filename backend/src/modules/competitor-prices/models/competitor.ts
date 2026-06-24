import { model } from "@medusajs/framework/utils"
import { CompetitorProduct } from "./competitor-product"

/**
 * A competitor e-shop we monitor. `scraper_key` selects the registered backend
 * scraper strategy used for its listings (overridable per mapping). Refresh
 * cadence falls back: mapping → competitor → global module options.
 */
export const Competitor = model
  .define("competitor", {
    id: model.id().primaryKey(),
    name: model.text(),
    handle: model.text(),
    base_url: model.text().nullable(),
    country: model.text().nullable(), // ISO-ish market code, e.g. PT / ES
    // Whether this competitor's LISTED prices include VAT ("incl", typical B2C /
    // "IVA incluído") or exclude it ("excl", typical B2B / "S/IVA", "+IVA"); null
    // = unknown. The discovery skill determines this from the page so the gap
    // comparison can normalise to our ex-VAT (net) basis instead of comparing a
    // gross competitor price to our net one (~23% error). See the discovery skill.
    price_tax_basis: model.text().nullable(), // "incl" | "excl" | null
    scraper_key: model.text().default("generic-jsonld"),
    // Deterministic parser recipe for this site (reused across all its mappings).
    // For `config-selectors`: a CSS-selector spec { price, attr?, title?, ... };
    // null when `generic-jsonld`/`prestashop` handles the site out of the box.
    scraper_hints: model.json().nullable(),
    is_active: model.boolean().default(true),
    // Competitor-level default refresh interval (seconds).
    refresh_interval_seconds: model.number().nullable(),

    // ── Catalog discovery (find this competitor's new products) ──
    // Deterministic catalog-enumeration recipe (set once by the discovery skill,
    // like scraper_hints for prices): { type:"shopify"|"sitemap", sitemap_url?,
    // product_url_match?, fetch_titles? }. When present, the scheduled catalog job
    // lists this competitor's product pages with no LLM and feeds them to the
    // matcher. See scrapers/catalog.ts.
    catalog_parser: model.json().nullable(),
    catalog_discovery_enabled: model.boolean().default(false),
    catalog_discovery_interval_seconds: model.number().nullable(),
    last_catalog_discovery_at: model.dateTime().nullable(),
    next_catalog_discovery_at: model.dateTime().nullable(),

    metadata: model.json().nullable(),
    products: model.hasMany(() => CompetitorProduct, {
      mappedBy: "competitor",
    }),
  })
  .indexes([{ on: ["handle"], unique: true }])
