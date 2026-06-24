import { MedusaService } from "@medusajs/framework/utils"
import { Competitor } from "./models/competitor"
import { CompetitorProduct } from "./models/competitor-product"
import { CompetitorPrice } from "./models/competitor-price"
import { ProductWatch } from "./models/product-watch"
import { ScrapeResult } from "./scrapers/types"
import { MatchCandidate } from "./matching/fuzzy"

export interface CompetitorPricesModuleOptions {
  /** Default refresh interval (seconds) when neither mapping nor competitor set one. */
  baseIntervalSeconds?: number
  minIntervalSeconds?: number
  maxIntervalSeconds?: number
  /** Multiplier applied to the interval on each consecutive failure. */
  backoffFactor?: number
  /** Multiplier applied while the price is unchanged (gradually slow down). */
  stableFactor?: number
  /** ± jitter fraction added to each scheduled interval to de-sync ticks. */
  jitterRatio?: number
  /** Max mappings processed per scheduled tick. */
  batchSize?: number
  /** Concurrent in-flight requests per crawl. */
  concurrency?: number
  /** Fuzzy score (0..100) at/above which a match is auto-confirmed. */
  autoConfirmScore?: number
  /** Default cadence (seconds) for product discovery (find new stores). */
  productDiscoveryIntervalSeconds?: number
  /** Default cadence (seconds) for catalog discovery (competitor's new products). */
  catalogDiscoveryIntervalSeconds?: number
}

const DEFAULTS: Required<CompetitorPricesModuleOptions> = {
  baseIntervalSeconds: 86_400, // 1 day
  minIntervalSeconds: 3_600, // 1 hour
  maxIntervalSeconds: 1_209_600, // 14 days
  backoffFactor: 2,
  stableFactor: 1.5,
  jitterRatio: 0.1,
  batchSize: 50,
  concurrency: 4,
  autoConfirmScore: 90,
  productDiscoveryIntervalSeconds: 2_592_000, // 30 days
  catalogDiscoveryIntervalSeconds: 604_800, // 7 days
}

type Outcome = "changed" | "unchanged" | "error"

/**
 * CompetitorPricesModuleService — CRUD for competitors / mappings / price
 * observations, plus the adaptive refresh scheduler. Cadence resolves
 * mapping → competitor → global option; the interval then adapts per result:
 * faster on change, gradually slower while stable, exponential backoff on error
 * (all clamped to [min, max] with jitter).
 */
export default class CompetitorPricesModuleService extends MedusaService({
  Competitor,
  CompetitorProduct,
  CompetitorPrice,
  ProductWatch,
}) {
  static identifier = "competitor_prices"

  protected readonly options_: Required<CompetitorPricesModuleOptions>
  protected readonly logger_: any

  constructor(container: any, options?: CompetitorPricesModuleOptions) {
    super(container, options)
    this.options_ = { ...DEFAULTS, ...(options ?? {}) }
    this.logger_ = container?.logger
  }

  getConfig(): Required<CompetitorPricesModuleOptions> {
    return this.options_
  }

  /** Base interval before adaptation: mapping → competitor → global default. */
  resolveBaseInterval(mapping: any): number {
    return (
      mapping?.refresh_interval_seconds ??
      mapping?.competitor?.refresh_interval_seconds ??
      this.options_.baseIntervalSeconds
    )
  }

  /** Compute the next interval + timestamp from the previous interval + outcome. */
  nextSchedule(args: {
    prevInterval?: number | null
    base: number
    outcome: Outcome
  }): { interval: number; at: Date } {
    const o = this.options_
    const prev = args.prevInterval ?? args.base
    let interval: number
    if (args.outcome === "error") {
      interval = prev * o.backoffFactor
    } else if (args.outcome === "changed") {
      interval = args.base // price moved → watch closely again
    } else {
      interval = prev * o.stableFactor // stable → ease off
    }
    interval = Math.max(o.minIntervalSeconds, Math.min(interval, o.maxIntervalSeconds))
    const jitter = interval * o.jitterRatio * (Math.random() * 2 - 1)
    const at = new Date(Date.now() + Math.round(interval + jitter) * 1000)
    return { interval: Math.round(interval), at }
  }

  /** Active mappings whose next_scrape_at is due (or never scraped). */
  async listDueMappings(limit?: number, force = false): Promise<any[]> {
    const filters: Record<string, any> = { is_active: true }
    if (!force) {
      filters.$or = [
        { next_scrape_at: null },
        { next_scrape_at: { $lte: new Date() } },
      ]
    }
    return this.listCompetitorProducts(filters, {
      take: limit ?? this.options_.batchSize,
      relations: ["competitor"],
      order: { next_scrape_at: "ASC" },
    })
  }

  /**
   * Persist a price observation and advance the mapping's adaptive schedule.
   * `mapping` is the already-loaded record (with `competitor` relation) to avoid
   * a re-fetch. Returns the outcome that drove the schedule.
   */
  async recordObservation(
    mapping: any,
    result: ScrapeResult,
    ourPrice?: number | null
  ): Promise<Outcome> {
    const now = new Date()
    const ok = result.status === "ok"

    if (ok) {
      // Normalize to a per-unit price comparable to our product, and snapshot
      // our own price at extraction time.
      const packUnits =
        mapping.pack_units && mapping.pack_units > 0 ? mapping.pack_units : 1
      const unitPrice =
        result.price != null ? Math.round(result.price / packUnits) : null
      await this.createCompetitorPrices({
        competitor_product_id: mapping.id,
        price: result.price ?? null,
        unit_price: unitPrice,
        our_price: ourPrice ?? null,
        original_price: result.originalPrice ?? null,
        currency_code: result.currencyCode ?? "EUR",
        in_stock: result.inStock ?? null,
        availability: result.availability ?? null,
        status: "ok",
        raw: result.raw ?? null,
        scraped_at: now,
      })
    } else {
      // Failed retrieval: log the reason and record it on the mapping, but do
      // NOT insert a price row (keeps the time-series clean of non-prices).
      this.logger_?.warn?.(
        `[competitor-prices] no price for mapping ${mapping.id} (${mapping.competitor_url ?? "?"}): ${result.errorMessage ?? result.status}`
      )
    }

    const changed =
      ok && result.price != null && result.price !== mapping.last_price
    const outcome: Outcome = !ok ? "error" : changed ? "changed" : "unchanged"

    const { interval, at } = this.nextSchedule({
      prevInterval: mapping.current_interval_seconds,
      base: this.resolveBaseInterval(mapping),
      outcome,
    })

    const update: Record<string, any> = {
      id: mapping.id,
      last_scraped_at: now,
      next_scrape_at: at,
      current_interval_seconds: interval,
      last_status: result.status,
      last_error: ok ? null : result.errorMessage ?? result.status,
      consecutive_failures: ok ? 0 : (mapping.consecutive_failures ?? 0) + 1,
      consecutive_unchanged:
        outcome === "unchanged" ? (mapping.consecutive_unchanged ?? 0) + 1 : 0,
    }
    if (ok && result.price != null) update.last_price = result.price
    // Enrich discovered identifiers (help later matching) without clobbering
    // any human-curated values already on the mapping.
    if (!mapping.title && result.title) update.title = result.title
    if (!mapping.brand && result.brand) update.brand = result.brand
    if (!mapping.competitor_sku && result.sku) update.competitor_sku = result.sku
    if (!mapping.competitor_ean && result.ean) update.competitor_ean = result.ean

    await this.updateCompetitorProducts(update)
    return outcome
  }

  /**
   * Apply a fuzzy/exact match result to a mapping. Stores the resolved product
   * ids, the method + score, sets match_status (confirmed at/above the
   * auto-confirm threshold, otherwise fuzzy/pending), and records the full match
   * detail in `metadata.match` for audit/review.
   */
  async applyMatch(
    mapping: any,
    candidate: MatchCandidate | null
  ): Promise<"confirmed" | "fuzzy" | "unmatched"> {
    if (!candidate) {
      await this.updateCompetitorProducts({
        id: mapping.id,
        match_status: "unmatched",
      })
      return "unmatched"
    }
    const status =
      candidate.score >= this.options_.autoConfirmScore ? "confirmed" : "fuzzy"
    await this.updateCompetitorProducts({
      id: mapping.id,
      product_id: candidate.product_id,
      variant_id: candidate.variant_id ?? null,
      product_sku: candidate.sku ?? null,
      match_status: status,
      match_method: candidate.method,
      match_score: candidate.score,
      metadata: {
        ...(mapping.metadata ?? {}),
        match: { ...candidate, matched_at: new Date().toISOString() },
      },
    })
    return status
  }

  // ── Discovery scheduling ───────────────────────────────────────────────

  /** Periodic next-run with jitter (no backoff — discovery is exploratory). */
  private nextDiscoveryAt(intervalSeconds: number): Date {
    const jitter = intervalSeconds * this.options_.jitterRatio * (Math.random() * 2 - 1)
    return new Date(Date.now() + Math.round(intervalSeconds + jitter) * 1000)
  }

  /** Competitors due for catalog discovery (enabled + due/never run). */
  async listDueCatalogDiscovery(limit?: number, force = false): Promise<any[]> {
    const filters: Record<string, any> = {
      is_active: true,
      catalog_discovery_enabled: true,
    }
    if (!force) {
      filters.$or = [
        { next_catalog_discovery_at: null },
        { next_catalog_discovery_at: { $lte: new Date() } },
      ]
    }
    return this.listCompetitors(filters, {
      take: limit ?? this.options_.batchSize,
      order: { next_catalog_discovery_at: "ASC" },
    })
  }

  /** Product watches due for store discovery. */
  async listDueProductWatches(limit?: number, force = false): Promise<any[]> {
    const filters: Record<string, any> = { is_active: true }
    if (!force) {
      filters.$or = [
        { next_discovery_at: null },
        { next_discovery_at: { $lte: new Date() } },
      ]
    }
    return this.listProductWatches(filters, {
      take: limit ?? this.options_.batchSize,
      order: { next_discovery_at: "ASC" },
    })
  }

  async markCatalogDiscovered(competitor: any): Promise<void> {
    const interval =
      competitor.catalog_discovery_interval_seconds ??
      this.options_.catalogDiscoveryIntervalSeconds
    await this.updateCompetitors({
      id: competitor.id,
      last_catalog_discovery_at: new Date(),
      next_catalog_discovery_at: this.nextDiscoveryAt(interval),
    })
  }

  async markProductDiscovered(watch: any): Promise<void> {
    const interval =
      watch.discovery_interval_seconds ??
      this.options_.productDiscoveryIntervalSeconds
    await this.updateProductWatches({
      id: watch.id,
      last_discovery_at: new Date(),
      next_discovery_at: this.nextDiscoveryAt(interval),
    })
  }

  /** Get a competitor by handle, creating it if unknown (for discovery). */
  async ensureCompetitor(input: {
    handle: string
    name?: string
    base_url?: string
    country?: string
    scraper_key?: string
    discovered?: boolean
  }): Promise<any> {
    const [existing] = await this.listCompetitors({ handle: input.handle })
    if (existing) return existing
    // A brand-new store surfaced by discovery: default to the generic scraper and
    // flag it as discovered so a human can review the addition.
    return this.createCompetitors({
      handle: input.handle,
      name: input.name ?? input.handle,
      base_url: input.base_url ?? undefined,
      country: input.country ?? undefined,
      scraper_key: input.scraper_key ?? "generic-jsonld",
      ...(input.discovered
        ? { metadata: { discovered: true, discovered_at: new Date().toISOString() } }
        : {}),
    })
  }

  /**
   * Create a competitor_product mapping from a discovered listing if we don't
   * already track that URL. Returns the mapping (existing or created), or null
   * when the listing lacks a URL. `productId` ties it to one of our products
   * (product discovery); omit it for catalog discovery (matcher resolves later).
   */
  async upsertDiscoveredMapping(
    competitorId: string,
    listing: {
      url?: string
      title?: string
      brand?: string
      sku?: string
      ean?: string
      characteristics?: Record<string, any>
      confidence?: number
    },
    productId?: string
  ): Promise<any | null> {
    if (!listing.url) return null
    const [existing] = await this.listCompetitorProducts({
      competitor_id: competitorId,
      competitor_url: listing.url,
    })
    if (existing) return existing
    return this.createCompetitorProducts({
      competitor_id: competitorId,
      competitor_url: listing.url,
      title: listing.title ?? null,
      brand: listing.brand ?? null,
      competitor_sku: listing.sku ?? null,
      competitor_ean: listing.ean ?? null,
      product_id: productId ?? null,
      match_status: productId ? "confirmed" : "unmatched",
      match_method: productId ? "discovery" : null,
      match_score: productId ? listing.confidence ?? null : null,
      metadata: {
        discovered: true,
        characteristics: listing.characteristics ?? null,
        discovered_at: new Date().toISOString(),
      },
    })
  }
}
