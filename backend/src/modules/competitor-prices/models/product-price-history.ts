import { model } from "@medusajs/framework/utils"

/**
 * Time-series of OUR price for a product — PVP1 / PVP2 / cost captured on change
 * (a daily snapshot job inserts a row only when one of the values differs from
 * the previous snapshot). Pairs with the competitor_price series to drive a
 * price-evolution sparkline. Minor units, EUR.
 */
export const ProductPriceHistory = model
  .define("product_price_history", {
    id: model.id().primaryKey(),
    product_id: model.text(),
    pvp1: model.number().nullable(),
    pvp2: model.number().nullable(),
    cost: model.number().nullable(),
    captured_at: model.dateTime(),
  })
  .indexes([{ on: ["product_id", "captured_at"] }])
