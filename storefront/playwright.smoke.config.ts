import { defineConfig, devices } from "@playwright/test"
import "dotenv/config.js"

/**
 * Smoke config — a self-contained, v2-correct sanity gate used by CI.
 *
 * Unlike the legacy `playwright.config.ts` suite (Medusa v1 seeder/teardown that
 * drops the DB), this has NO global setup/teardown and never mutates data. It
 * just boots the storefront and asserts the full stack is sane: the storefront
 * renders and serves the backend's catalog, and the admin loads.
 */
export default defineConfig({
  testDir: "./e2e",
  // v2 suite only: render smoke + no-payment functional flows. The legacy v1
  // suite under e2e/tests is intentionally excluded.
  testMatch: ["smoke/**/*.spec.ts", "flows/**/*.spec.ts"],
  // Multi-step flows (register → server action → revalidate) need more than the
  // 30s default so genuine errors surface instead of test-timeout noise.
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.NEXT_PUBLIC_BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start",
    url: process.env.NEXT_PUBLIC_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
