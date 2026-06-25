import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

/**
 * Storefront unit tests + coverage. Coverage is collected across `src/lib`
 * (framework-agnostic logic) so the project-wide PATCH coverage gate
 * (diff-cover in CI) can measure any changed lib file. React pages/components
 * (`src/app`, `src/modules`) are covered by the Playwright e2e suite, not unit
 * tests — add React Testing Library here to bring them under the unit gate.
 */
export default defineConfig({
  // Mirror the tsconfig path aliases so lib modules that import via `@lib/*`
  // (e.g. seo.ts → @lib/data/regions) resolve under vitest.
  resolve: {
    alias: {
      "@lib": fileURLToPath(new URL("./src/lib", import.meta.url)),
      "@modules": fileURLToPath(new URL("./src/modules", import.meta.url)),
      "@pages": fileURLToPath(new URL("./src/pages", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      all: true,
      reporter: ["text-summary", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/lib/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/**/__tests__/**",
        "src/**/*.d.ts",
        "src/lib/data/**", // server actions (network/DB) — covered via e2e
      ],
    },
  },
})
