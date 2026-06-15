import { model } from "@medusajs/framework/utils"

/**
 * Per-entity incremental-sync checkpoint. Stores the timestamp passed to
 * Moloni's `getModifiedSince` on the next run. Defaults to the epoch on first
 * run, so the initial sync naturally imports everything.
 */
export const MoloniSyncCursor = model
  .define("moloni_sync_cursor", {
    id: model.id().primaryKey(),
    entity: model.text(), // "products" | "customers"
    last_modified: model.text(), // ISO timestamp cursor for getModifiedSince
  })
  .indexes([{ on: ["entity"], unique: true }])
