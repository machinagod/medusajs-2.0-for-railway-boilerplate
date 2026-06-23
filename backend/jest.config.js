/**
 * Unit-test config (no DB / no network). Coverage is collected across the whole
 * backend `src` so the project-wide **patch coverage** gate (diff-cover in CI)
 * can measure any changed file. A per-path threshold additionally keeps the
 * competitor-prices module strictly at 90% line + branch.
 *
 * Excluded from coverage (not unit-testable logic / covered elsewhere):
 *   - migrations  : DDL strings, run by Medusa's migration runner
 *   - src/scripts : one-off operational scripts
 *   - src/admin   : React dashboard views (e2e, not unit)
 *   - test files, .d.ts, and the module index barrel
 */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.[jt]sx?$": [
      "@swc/jest",
      {
        jsc: {
          target: "es2022",
          parser: { syntax: "typescript", tsx: true, decorators: true },
          transform: { decoratorMetadata: true },
        },
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  testMatch: ["**/__tests__/**/*.spec.ts"],
  modulePathIgnorePatterns: ["<rootDir>/.medusa/"],
  clearMocks: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/**/*.d.ts",
    "!src/scripts/**",
    "!src/admin/**",
    "!**/migrations/**",
    "!src/modules/competitor-prices/index.ts",
  ],
  coverageReporters: ["text-summary", "lcov"],
  coverageThreshold: {
    // The competitor-prices module is held to the full bar; the rest of the
    // codebase is governed by the patch-coverage gate (CI diff-cover).
    "./src/modules/competitor-prices/**/*.ts": { lines: 90, branches: 90 },
  },
  coveragePathIgnorePatterns: ["/node_modules/"],
}
