import { Logger } from "@medusajs/framework/types"
import { MedusaService } from "@medusajs/framework/utils"
import { createMoloniClient, MoloniClient } from "./client"
import { MoloniSyncCursor } from "./models/sync-cursor"
import { MoloniCategory, MoloniCustomer, MoloniProduct } from "./types"

export interface MoloniModuleOptions {
  clientId: string
  clientSecret: string
  username: string
  password: string
  companyId: number
  sandbox?: boolean
}

const PAGE_SIZE = 50
/** Cursor used on the very first run: fetch everything modified since the epoch. */
export const EPOCH_CURSOR = "1970-01-01T00:00:00.000Z"

interface FetchOptions {
  /** ISO timestamp; only records modified at/after this are returned. */
  since?: string
  /** Cap the number of records (for dry-runs / testing). */
  limit?: number
}

/**
 * MoloniModuleService — wraps the Moloni API client (paginated readers via
 * `getModifiedSince`, so the same code does full and incremental syncs) and
 * persists per-entity sync cursors via the MoloniSyncCursor model.
 */
export default class MoloniModuleService extends MedusaService({
  MoloniSyncCursor,
}) {
  static identifier = "moloni"

  protected readonly logger_: Logger
  protected readonly client_: MoloniClient
  protected readonly companyId_: number

  constructor(container: any, options: MoloniModuleOptions) {
    super(container, options)
    this.logger_ = container.logger

    const missing = (
      ["clientId", "clientSecret", "username", "password"] as const
    ).filter((k) => !options?.[k])
    if (missing.length || !options?.companyId) {
      throw new Error(
        `Moloni module misconfigured. Missing: ${[
          ...missing,
          options?.companyId ? null : "companyId",
        ]
          .filter(Boolean)
          .join(", ")}`
      )
    }

    this.companyId_ = options.companyId
    this.client_ = createMoloniClient(
      {
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        username: options.username,
        password: options.password,
      },
      options.companyId,
      options.sandbox
    )
  }

  get companyId(): number {
    return this.companyId_
  }

  get client(): MoloniClient {
    return this.client_
  }

  // ── Sync cursors ─────────────────────────────────────────────────────────

  /** Returns the stored cursor for an entity, or the epoch on first run. */
  async getSyncCursor(entity: string): Promise<string> {
    const [row] = await this.listMoloniSyncCursors({ entity })
    return row?.last_modified || EPOCH_CURSOR
  }

  /** Upserts the cursor for an entity. */
  async setSyncCursor(entity: string, lastModified: string): Promise<void> {
    const [row] = await this.listMoloniSyncCursors({ entity })
    if (row) {
      await this.updateMoloniSyncCursors({
        id: row.id,
        last_modified: lastModified,
      })
    } else {
      await this.createMoloniSyncCursors({ entity, last_modified: lastModified })
    }
  }

  // ── Readers ──────────────────────────────────────────────────────────────

  /**
   * Full category tree. Moloni's productCategories/getAll is scoped by
   * parent_id, so we breadth-first traverse from the root (parent_id: 0).
   * Categories have no modified-since endpoint and are few, so always full.
   */
  async listAllCategories(): Promise<MoloniCategory[]> {
    const all: MoloniCategory[] = []
    const queue: number[] = [0]
    const seenParents = new Set<number>()

    while (queue.length) {
      const parentId = queue.shift()!
      if (seenParents.has(parentId)) continue
      seenParents.add(parentId)

      let offset = 0
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const page = await this.client_.productCategories<MoloniCategory[]>(
          "getAll",
          { parent_id: parentId, offset }
        )
        if (!Array.isArray(page) || page.length === 0) break
        for (const cat of page) {
          all.push(cat)
          if ((cat.num_categories ?? 0) > 0) queue.push(cat.category_id)
        }
        if (page.length < PAGE_SIZE) break
        offset += PAGE_SIZE
      }
    }

    this.logger_.info(`[moloni] fetched ${all.length} categories`)
    return all
  }

  /** Products modified since `since` (default epoch = all), paginated. */
  async listProducts(opts: FetchOptions = {}): Promise<MoloniProduct[]> {
    const since = opts.since || EPOCH_CURSOR
    const all: MoloniProduct[] = []
    let offset = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await this.client_.products<MoloniProduct[]>(
        "getModifiedSince",
        { lastmodified: since, qty: PAGE_SIZE, offset }
      )
      if (!Array.isArray(page) || page.length === 0) break
      all.push(...page)
      if (opts.limit && all.length >= opts.limit) return all.slice(0, opts.limit)
      if (page.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }
    this.logger_.info(`[moloni] fetched ${all.length} products since ${since}`)
    return all
  }

  /** Customers modified since `since` (default epoch = all), paginated. */
  async listCustomers(opts: FetchOptions = {}): Promise<MoloniCustomer[]> {
    const since = opts.since || EPOCH_CURSOR
    const all: MoloniCustomer[] = []
    let offset = 0
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await this.client_.customers<MoloniCustomer[]>(
        "getModifiedSince",
        { lastmodified: since, offset }
      )
      if (!Array.isArray(page) || page.length === 0) break
      all.push(...page)
      if (opts.limit && all.length >= opts.limit) return all.slice(0, opts.limit)
      if (page.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }
    this.logger_.info(`[moloni] fetched ${all.length} customers since ${since}`)
    return all
  }
}
