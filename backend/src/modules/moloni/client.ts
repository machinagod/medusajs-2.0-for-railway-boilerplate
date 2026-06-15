/**
 * Moloni client — thin adapter over the published JSR package
 * `@machinagod/moloni-client-ts` (consumed in Node via the @jsr npm registry).
 *
 * We expose a small structural `MoloniClient` interface (just the endpoint
 * dispatchers the sync uses) so the rest of the module is decoupled from the
 * package's stricter generic signatures. The package's `Moloni` class
 * implements this surface — OAuth password grant against api.moloni.pt with an
 * in-memory token cache.
 */
import { MoloniCredentials } from "./types"

export interface MoloniClient {
  setCompanyId(id: number): MoloniClient
  products<T = any>(request: string, params?: Record<string, any>): Promise<T>
  productCategories<T = any>(
    request: string,
    params?: Record<string, any>
  ): Promise<T>
  productStocks<T = any>(
    request: string,
    params?: Record<string, any>
  ): Promise<T>
  customers<T = any>(
    request: string,
    params?: Record<string, any>
  ): Promise<T>
}

/**
 * Construct a company-scoped Moloni client. The package is ESM-only, so it's
 * pulled in via dynamic import (this module compiles to CJS).
 */
export async function createMoloniClient(
  creds: MoloniCredentials,
  companyId: number,
  sandbox = false
): Promise<MoloniClient> {
  const { default: Moloni } = await import("@machinagod/moloni-client-ts")
  const client = new Moloni({ ...creds, sandbox })
  client.setCompanyId(companyId)
  return client as unknown as MoloniClient
}
