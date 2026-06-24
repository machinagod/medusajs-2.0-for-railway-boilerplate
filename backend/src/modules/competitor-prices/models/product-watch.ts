import { model } from "@medusajs/framework/utils"

/**
 * A product of OURS to monitor for new competitor stores (product discovery).
 * The discovery job periodically asks the discovery agent "who else sells this?"
 * at an adjustable cadence (per-watch interval → global default), tracked via
 * next_discovery_at. Discovered listings become competitor_product mappings.
 */
export const ProductWatch = model
  .define("product_watch", {
    id: model.id().primaryKey(),
    product_id: model.text(),
    product_sku: model.text().nullable(),
    title: model.text().nullable(),
    brand: model.text().nullable(),
    ean: model.text().nullable(),
    discovery_interval_seconds: model.number().nullable(),
    last_discovery_at: model.dateTime().nullable(),
    next_discovery_at: model.dateTime().nullable(),
    // Consecutive discovery passes that found NO competitor anywhere. Drives
    // exponential back-off and eventual retirement — this is how "own-label /
    // no-competitor" products are identified: by outcome, not by name-guessing.
    consecutive_misses: model.number().default(0),
    is_active: model.boolean().default(true),
    metadata: model.json().nullable(),
  })
  .indexes([{ on: ["product_id"], unique: true }, { on: ["next_discovery_at"] }])
