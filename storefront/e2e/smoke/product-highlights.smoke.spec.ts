import { test, expect } from "@playwright/test"

/**
 * Read-only smoke test for the "About this item" highlights on the product page.
 *
 * The backend seed (backend/src/scripts/seed.ts) attaches highlight + spec rows
 * to the "t-shirt" product via the product_attributes module, so this asserts
 * the storefront fetches the store route and renders the bullets. Navigation +
 * assertions only — never mutates data.
 */
const REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "dk"

test("seeded product highlights render on the product page", async ({ page }) => {
  await page.goto(`/${REGION}/products/t-shirt`)

  await expect(page.getByTestId("product-container")).toBeVisible({
    timeout: 30_000,
  })

  const highlights = page.getByTestId("product-highlights")
  await expect(highlights).toBeVisible({ timeout: 30_000 })
  // the three seeded bullets
  await expect(highlights.locator("li")).toHaveCount(3)
  await expect(highlights).toContainText("organic cotton")
})
