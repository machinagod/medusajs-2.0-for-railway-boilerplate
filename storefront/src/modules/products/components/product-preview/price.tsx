import { clx } from "@medusajs/ui"
import { VariantPrice } from "types/global"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  return (
    <div className="flex items-baseline gap-x-2">
      <span
        className={clx(
          "text-[19px] font-bold tracking-tight text-brand-ink",
          {
            "text-brand-cyan-ink": price.price_type === "sale",
          }
        )}
        data-testid="price"
      >
        {price.calculated_price}
      </span>
      {price.price_type === "sale" && (
        <span
          className="text-xs font-medium text-ui-fg-muted line-through"
          data-testid="original-price"
        >
          {price.original_price}
        </span>
      )}
    </div>
  )
}
