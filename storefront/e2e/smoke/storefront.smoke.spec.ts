import { expect, test } from "@playwright/test"

/**
 * Read-only smoke tests — no data mutation. They verify the deployed stack is
 * sane end to end: the storefront renders, region routing works, the backend's
 * catalog is served through to product pages, and the admin loads.
 */

const REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "dk"
const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

test("home redirects to a region and renders", async ({ page }) => {
  await page.goto("/")
  // Middleware redirects "/" to "/<countryCode>".
  await expect(page).toHaveURL(/\/[a-z]{2}(\/|\?|$)/)
  await expect(page.locator("body")).toBeVisible()
})

test("store lists products and a product page loads", async ({ page }) => {
  await page.goto(`/${REGION}/store`)

  const productLink = page.locator('a[href*="/products/"]').first()
  await expect(productLink).toBeVisible({ timeout: 30_000 })

  await productLink.click()
  await expect(page).toHaveURL(/\/products\//)
  // The product title heading proves the page resolved a real product from the
  // backend. The starter renders the title as a Heading (h2), so match any
  // heading role rather than a specific tag.
  await expect(page.getByRole("heading").first()).toBeVisible({
    timeout: 30_000,
  })
})

test("admin dashboard login renders", async ({ page }) => {
  await page.goto(`${BACKEND_URL}/app/login`)
  await expect(page.getByText(/welcome to medusa/i)).toBeVisible({
    timeout: 30_000,
  })
})
