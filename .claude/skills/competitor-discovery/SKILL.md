---
name: competitor-discovery
description: Find competitor product listings for our watched products via the Medusa discovery queue, driven through the medusa-mcp discovery MCP tools. Use when asked to "run competitor discovery", "find competitor listings/URLs", "process the discovery queue", or on a scheduled routine. Does the web research itself (no Anthropic API key in the backend) and submits results back via the discovery MCP tools.
---

# Competitor discovery worker

You drive the competitor-price discovery queue. The Medusa backend holds the
queue of our products to find at competitors; you pull a batch, do the web
research yourself, and submit verified listings back. The backend never calls an
LLM API — *you* are the intelligence, run on a schedule. Mirrors the
higitotal-deno contest-enrichment pattern (`enrich_next_batch` → research →
`enrich_submit`).

## Tools (MCP — the `medusa-mcp` server fronts the discovery queue)

Call these MCP tools directly — they're **pre-authenticated, no curl / no admin
login**. They wrap `/admin/competitor-prices/discovery/*`; the backend still holds
all the data and runs the deterministic scrapers.

**Forward queue (product-anchored — our product → find it at competitors):**

1. `competitor_discovery_next_batch({ limit?, force? })` → `{ count, watches:[{watch_id, product_id, sku, title, brand, ean}], competitors:[{handle,name,base_url,country,scraper_key}] }`
2. `competitor_discovery_submit({ watch_id, listings:[{competitor_handle, url, confidence, competitor_name?, competitor_base_url?, competitor_country?, competitor_price_tax_basis?, competitor_scraper_key?, competitor_scraper_hints?, is_new_competitor?, title?, brand?, sku?, ean?}] })`
3. `competitor_discovery_skip({ watch_id })` — nothing qualified
4. `competitor_discovery_stats()` — queue health
5. `competitor_discovery_scrape({ force? })` — kick a price scrape after submitting

**Reverse queue (competitor-anchored — crawl a competitor's whole catalog):**

6. `competitor_discovery_catalog_next_batch({ limit?, force? })` → competitors due for a full-catalog crawl, each with the listing URLs we already track (`known_urls` — skip those)
7. `competitor_discovery_catalog_submit({ competitor_handle | competitor_id, listings:[{url, title?, brand?, sku?, ean?}] })` — the listings you crawled; the backend ingests them as unmatched and runs the matcher

**Parser self-correction:**

8. `competitor_discovery_parser_issues()` → competitors whose parser yields no prices, with the current recipe + sample failing URLs
9. `competitor_discovery_fix_parser({ competitor_handle, scraper_key?, scraper_hints?, price_tax_basis?, catalog_parser?, deactivate? })` — apply a corrected price recipe, the tax basis, or the **catalog_parser** recipe (or deactivate a login-gated store)

> Fallback only if the MCP server is unavailable: the same routes are reachable via
> `curl` against `${MEDUSA_BACKEND_URL:-https://storeadmin.higitotal.pt}` with an
> admin bearer token (`POST /auth/user/emailpass` with `MEDUSA_ADMIN_EMAIL` /
> `MEDUSA_ADMIN_PASSWORD`). Prefer the MCP tools.

## Goal — find NEW price sources, then make them scrape themselves

This expensive Claude pass exists to **discover new competitors / price sources**
(not just re-check known ones) **and configure a deterministic parser for each**,
so the backend's scheduled scraper retrieves prices forever with no LLM in the
loop. **Do NOT restrict your search to our known competitors** — search the open
web for any credible Iberian distributor selling the product.

## ⛔ Submission gate — a listing is eligible ONLY if ALL are true

1. The `url` is a **product page** on any credible **price source serving the
   PT/ES market** — B2B distributors, **marketplaces** (Amazon/eBay), and
   **manufacturer webshops** (e.g. `eshop.diversey.*`) are all fair game. Prefer
   the `.es`/`.pt` locale of a marketplace. Use a descriptive `handle`
   (`amazon-es`, `diversey-eshop`, …).
2. You **opened it with `WebFetch`** and **saw a numeric EUR price shown WITHOUT
   login** — not a category/brand/PDF page, not a search result.
3. The **pack size matches ours** (same litres / kg / count, accounting for
   multipliers: our `6x2L` = their `6x2L`/`12L`, NOT their single `2L`; our `4L`
   is NOT their `4x4L` case).
4. You can describe **how a deterministic parser extracts the price** (see
   "Parser recipe" below) — otherwise the scheduled scraper can't read it.

If any is uncertain → **do NOT submit that listing.** Reject pages that show
*login / registo / iniciar sessão / sob consulta / pedir preço / presupuesto /
solicitar precio* or no price at all. **Never invent a URL or a price.** If a
watch has zero eligible listings, `skip` it. A wrong/garbage match is worse than
a skip — the absurd Δ it produces has to be cleaned up by hand.

## Parser recipe (per competitor, reused — set once)

The deterministic scraper needs to extract the price WITHOUT you. For each store
a listing is on:

- If the store is **already in our set** (its `handle` is in the `competitors`
  list from next-batch) → **reuse its existing parser**; submit the listing with
  just `competitor_handle` (omit the parser fields).
- If the store is **NEW** → determine its recipe from the page you fetched and
  include it on the listing (the backend stores it on the competitor, reused for
  all its products):
  - Price is in **JSON-LD** (`<script type="application/ld+json">` with an Offer
    `price`) **or schema.org microdata** (`[itemprop="price"]`) **or a `<meta>`
    price tag → `competitor_scraper_key: "generic-jsonld"`** (no hints needed).
  - PrestaShop site with JSON-LD → `"prestashop"`.
  - Price only in **custom HTML** (visible but not in structured data) →
    `competitor_scraper_key: "config-selectors"` plus
    `competitor_scraper_hints: { "price": "<CSS selector>", "attr": "text"|"content", "availability"?: "<sel>", "currency"?: "EUR" }`.
    **VERIFY the selector — do NOT guess.** Read the fetched HTML, find the
    element that actually wraps the price, and use its real class/id (e.g.
    `<span class="price mr-1">111,16€</span>` → `"price"`, not a guessed
    `".preco"`). Confirm that selector's text/attr yields the price. A selector
    that doesn't match is worse than nothing — it produces 0 prices and has to be
    repaired by hand. WooCommerce/Shopify usually emit JSON-LD → prefer
    `generic-jsonld` for them rather than CSS.
  - If you can't find ANY reliable deterministic extraction → don't submit (the
    scheduled scraper would just return not_found).

**Confidence**: 95+ = verified exact product + size + public price; 85–94 =
public price verified but size shown via a multi-size selector (slight
ambiguity); never submit > 80 if you did not actually see the price.

## ⚖️ Tax basis — WITH or WITHOUT VAT (your responsibility)

Our prices are **net (ex-VAT)**. A competitor that lists **incl-VAT** prices looks
~23% dearer than it is unless we know — so for every store, **determine and record
its price tax basis** with `competitor_price_tax_basis`:

- `"excl"` — prices shown **without** VAT: *"S/IVA", "sem IVA", "+IVA", "IVA não
  incluído", "preço sem IVA", "(IVA não incl.)"*. Common on B2B distributors.
- `"incl"` — prices shown **with** VAT: *"c/IVA", "com IVA", "IVA incluído",
  "preços com IVA", "IVA incl."*. Common on B2C / retail.

**When the page shows BOTH prices** (e.g. `S/IVA: 36,28€ · c/IVA: 44,62€`) — common
on B2B sites — **target the EX-VAT one** (it matches our net basis, no conversion),
set `competitor_price_tax_basis:"excl"`, and point the parser's `price` selector at
that specific element (read the HTML: the S/IVA span vs the c/IVA span have
different classes — pick the S/IVA one; never let `generic-jsonld` guess when both
are present, use `config-selectors` with the verified ex-VAT selector).

If you genuinely can't tell, omit the field (the backend leaves it unknown rather
than mis-normalising). Set it once per store; it's reused for all its products and
backfills an existing store that lacked it.

## Catalog parser recipe (per competitor — set ONCE, backend auto-crawls)

Reverse (catalog) discovery is **deterministic**, mirroring the price scraper:
instead of you crawling a competitor's whole catalog by hand on every run, you
configure a `catalog_parser` recipe **once** per competitor, and the backend
enumerates that competitor's product pages on a nightly schedule **with no LLM**,
feeding any new URLs straight into the matcher. Your job is only to pick the recipe.

Set it with `competitor_discovery_fix_parser({ competitor_handle, catalog_parser })`.
Open the store once and choose the cheapest strategy that yields clean product URLs:

- **Shopify** — the site serves a working `/products.json`. Recipe:
  `{ "type": "shopify" }`. The backend paginates `/products.json` for exact handles
  + titles. Quick check: `WebFetch ${base_url}/products.json?limit=1` → if it returns
  a JSON `products` array, use this (most reliable, exact titles, no guessing).
- **Sitemap** — anything with an XML sitemap (most WooCommerce / PrestaShop /
  Magento). Recipe:
  `{ "type": "sitemap", "product_url_match": "/produto/", "sitemap_url"?: "…", "fetch_titles"?: true }`:
  - `product_url_match` — the substring that distinguishes a **product** URL from
    category / blog / page URLs. **Read real `<loc>` entries from the sitemap and
    pick the segment products actually share** — WooCommerce `/product/` or
    `/produto/`, Magento product URLs usually end `.html`, PrestaShop often has a
    numeric-id slug. A wrong filter yields 0 URLs or all-junk URLs, so verify it
    against the live sitemap before saving. Omit it only if every `<loc>` is a
    product.
  - `sitemap_url` — only when it isn't `${base_url}/sitemap.xml` (the backend
    auto-follows a `<sitemapindex>`). Magento is often `/sitemap.xml` or
    `/pub/sitemap.xml`.
  - `fetch_titles: true` — only when the slug makes a poor title (numeric-only /
    cryptic). Otherwise the backend de-slugifies a decent title for free, which is
    cheaper — prefer leaving it off.

A competitor with **no** `catalog_parser` is simply skipped by the nightly catalog
crawl, so setting one is what **turns catalog discovery on** for that store. Set it
whenever you add/verify a competitor whose platform you can identify.

## Discovering NEW stores (grow the competitor set)

If your research surfaces a store that is **NOT** in the competitor list but
**(a)** publicly sells our product at a public EUR price and **(b)** is a real
distributor that **serves Portugal or Spain**, treat it as a candidate to ADD.
Include it as a normal listing plus these fields — including the **parser
recipe** (above) so the scheduled scraper can read it — and the submit endpoint
creates the competitor (flagged `discovered` for review) with that parser config:

```json
{"competitor_handle":"newstore-pt","competitor_name":"New Store","competitor_base_url":"https://newstore.pt","competitor_country":"PT","competitor_price_tax_basis":"excl","is_new_competitor":true,"competitor_scraper_key":"generic-jsonld","url":"https://newstore.pt/...","title":"…","confidence":90}
```

If the new store needs CSS selectors, add the recipe:
`"competitor_scraper_key":"config-selectors","competitor_scraper_hints":{"price":".product-price","attr":"text","currency":"EUR"}`.

Add any credible source that serves the PT/ES market and shows a public EUR
price: B2B distributors, marketplaces (Amazon/eBay `.es`/`.pt`), and manufacturer
webshops (`eshop.diversey.*`) are all allowed. Require a real, stable product
page (not a transient/3rd-party-seller offer that changes hourly) and a working
parser recipe. `handle` = kebab-case (`-pt`/`-es`/`-eshop` suffix). When unsure,
don't add — note it in your report instead.

## Site intel (known-good STARTING points — not a whitelist; keep finding new ones)

- **Public prices (good first hits):** `egi-pt` (richest — carries most of the
  Diversey range), `hegisantos-pt` (Magento), `higienaroma-pt` (Magento),
  `batoy-es` (PrestaShop), and `progelcone-pt` **/store/** pages. All of these
  use `generic-jsonld`. **But the point is to find NEW Iberian distributors too**
  — a Google/web search for the product name + "comprar"/"preço"/"precio" will
  surface stores not in this list; vet + add them.
- **GATED — skip, don't waste fetches:** `exaclean-pt`, `moreiracarneiro-pt`,
  mostly `lusohigin-pt`, `grupoapr-pt`, `csh-pt`, and progelcone-pt **/catalogo/**
  pages (the `/store/` variant of the same product is the public one).
- **Private-label / own-brand → competitors don't carry it, skip fast:**
  Higitotal own codes (`DL`/`DA`/`DT`/`PA`/`PB`/`PC`/`PE`/`PF`/`FR`/`AC`/`AH`…)
  and brands **Amoos**, **Celea**; generic dispensers/paper. Spend effort on
  clearly **branded** items: Diversey (Suma, Clax, Taski, Jontec, Optimax,
  Hypofoam, Soft Care, Divosan, Sprint, Good Sense), Vileda/SWEP, Nilfisk,
  Sammic, Fagor, Renova, Swarfega/Deb.

## Loop

1. `competitor_discovery_next_batch({ limit: N })`. If `count` is 0 the queue is drained — report + stop.
2. Research each watch (see fan-out below). Apply the submission gate strictly.
3. `competitor_discovery_submit({ watch_id, listings:[…] })` for watches with ≥1
   eligible listing; `competitor_discovery_skip({ watch_id })` for the rest. Every
   watch in the batch must get exactly one submit OR skip so it leaves the queue.
4. After each batch, `competitor_discovery_scrape({ force: true })` to price the new
   mappings, then `competitor_discovery_parser_issues()` — fix any broken parser
   with `competitor_discovery_fix_parser(...)`.
5. Repeat until `count` is 0 or you hit your budget. End with
   `competitor_discovery_stats()` and report: watches processed, listings
   submitted, skipped, queue remaining.

**Reverse (catalog) discovery — prefer the deterministic recipe.** The first-class
path is to set each competitor's `catalog_parser` once (see "Catalog parser recipe"
above) and let the nightly backend job enumerate + match with no LLM. When you
verify or add a store whose platform you recognise (Shopify / sitemap), set its
recipe with `competitor_discovery_fix_parser({ competitor_handle, catalog_parser })`
— that's the whole job; do NOT hand-crawl it.

Only fall back to a manual crawl for a store **no recipe fits** (no `/products.json`,
no usable sitemap): pull `competitor_discovery_catalog_next_batch`, crawl its catalog
(category pages / search) **skipping its `known_urls`**, and post findings with
`competitor_discovery_catalog_submit`; the backend matches them to our products
(strict SKU/EAN + size-aware fuzzy).

## Fan-out with subagents (for batches > ~6 watches)

Parallelise the slow web research; keep the writes central.

- Spawn **research subagents on the `sonnet` model** (`model: "sonnet"`), ~3
  watches each. (Sonnet follows the submission gate far more reliably than Haiku
  — worth the cost for submit-ready output.)
- **Subagents are PURE WEB RESEARCH: WebSearch/WebFetch only.** They must NOT call
  the discovery MCP tools, run curl, authenticate, or touch the Medusa backend in
  any way — tell them so explicitly (some will otherwise try to run this whole
  skill and hit the permission classifier). Only the orchestrator calls the
  discovery tools.
- Give each subagent: its assigned watches (it must stay on those `watch_id`s
  only), the competitor list, the submission gate above (incl. new-store rule),
  and the site intel.
- Each subagent returns **STRICT JSON only**:
  `{"results":[{"watch_id":"…","listings":[{"competitor_handle":"…","url":"…","title":"…","confidence":95}]}]}`
  (empty `listings` = skip).
- **The orchestrator (you) aggregates and does ALL submit/skip calls**, after
  re-checking the gate: drop any listing whose agent didn't clearly confirm a
  public price. When unsure, skip.

The backend scraper is the backstop: if a submitted URL turns out gated, it
records `not_found` with no price row — but don't rely on that to excuse loose
submissions; garbage matches (wrong pack size) still produce misleading prices.
