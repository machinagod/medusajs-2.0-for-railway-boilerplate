import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COMPETITOR_PRICES_MODULE } from "../../../../modules/competitor-prices"

/**
 * DELETE /admin/competitor-products/:id — permanently remove a competitor mapping
 * (override deletion: drop a wrong listing entirely). To instead keep the listing
 * but unlink a bad match, use POST /competitor-prices/match/resolve { action:"reject" }.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve(COMPETITOR_PRICES_MODULE)
  const { id } = req.params
  await svc.deleteCompetitorProducts(id)
  res.json({ id, object: "competitor_product", deleted: true })
}
