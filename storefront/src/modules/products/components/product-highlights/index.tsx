import { Heading, Text } from "@medusajs/ui"
import { getProductAttributes } from "@lib/data/products"

/**
 * "About this item" — the Amazon-style bullet list from the product_attributes
 * module. Async server component: fetches its own data and renders nothing when
 * a product has no highlights.
 */
const ProductHighlights = async ({ productId }: { productId: string }) => {
  const { highlights } = await getProductAttributes(productId)

  if (!highlights?.length) {
    return null
  }

  return (
    <div className="flex flex-col gap-y-3" data-testid="product-highlights">
      <Heading level="h3" className="text-base-semi text-ui-fg-base">
        Sobre este artigo
      </Heading>
      <ul className="flex flex-col gap-y-2 list-disc pl-5">
        {highlights.map((h) => (
          <li key={h.id} className="text-ui-fg-subtle pl-1">
            <Text
              as="span"
              className="text-medium text-ui-fg-subtle whitespace-pre-line"
            >
              {h.value}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ProductHighlights
