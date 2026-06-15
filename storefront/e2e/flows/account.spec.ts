import { expect, test } from "@playwright/test"
import { LoginPage } from "../fixtures/account/login-page"
import { RegisterPage } from "../fixtures/account/register-page"
import { OverviewPage } from "../fixtures/account/overview-page"

/**
 * Auth flows (v2). Self-contained: each test registers its own customer through
 * the storefront UI (no admin seeder), so they run against the ephemeral CI DB.
 * Reuses the existing data-testid page objects.
 */

// Unique per attempt so retries / reruns never collide in the shared CI DB.
function uniqueEmail(): string {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}
const PASSWORD = "supersecret123"

async function register(page: import("@playwright/test").Page, email: string) {
  const login = new LoginPage(page)
  const register = new RegisterPage(page)
  await login.goto()
  await login.registerButton.click()
  await register.container.waitFor({ state: "visible" })
  await register.firstNameInput.fill("Test")
  await register.lastNameInput.fill("User")
  await register.emailInput.fill(email)
  await register.passwordInput.fill(PASSWORD)
  await register.registerButton.click()
}

test("register a new customer lands on the account overview", async ({
  page,
}) => {
  const overview = new OverviewPage(page)
  await register(page, uniqueEmail())
  await expect(overview.welcomeMessage).toBeVisible({ timeout: 30_000 })
})

test("a registered customer can log out and log back in", async ({ page }) => {
  const email = uniqueEmail()
  const overview = new OverviewPage(page)

  await register(page, email)
  await expect(overview.welcomeMessage).toBeVisible({ timeout: 30_000 })

  // Drop the session and sign back in with the same credentials.
  await page.context().clearCookies()
  const login = new LoginPage(page)
  await login.goto()
  await login.emailInput.fill(email)
  await login.passwordInput.fill(PASSWORD)
  await login.signInButton.click()
  await expect(overview.welcomeMessage).toBeVisible({ timeout: 30_000 })
})

test("invalid credentials show an error", async ({ page }) => {
  const login = new LoginPage(page)
  await login.goto()
  await login.emailInput.fill(uniqueEmail()) // never registered
  await login.passwordInput.fill("wrong-password")
  await login.signInButton.click()
  await expect(login.errorMessage).toBeVisible({ timeout: 30_000 })
})
