---
name: competitor-discovery
description: Find competitor product listings for our watched products via the Medusa discovery queue. Use when asked to "run competitor discovery", "find competitor listings/URLs", "process the discovery queue", or on a scheduled routine. Does the web research itself (no Anthropic API key in the backend) and submits results back to the queue.
---

# Competitor discovery worker

You drive the competitor-price discovery queue. The Medusa backend holds the
queue of our products to find at competitors; you pull a batch, do the web
research yourself, and submit verified listings back. The backend never calls an
LLM API — *you* are the intelligence, run on a schedule. Mirrors the
higitotal-deno contest-enrichment pattern (`enrich_next_batch` → research →
`enrich_submit`).

## Endpoints (Medusa admin API, admin-authed)

Base URL: `${MEDUSA_BACKEND_URL:-https://storeadmin.higitotal.pt}`

1. `GET  /admin/competitor-prices/discovery/next-batch?limit=N` → `{ count, watches:[{watch_id, product_id, sku, title, brand, ean}], competitors:[{handle,name,base_url,country,scraper_key}] }`
2. `POST /admin/competitor-prices/discovery/submit` → `{ watch_id, listings:[{competitor_handle, competitor_base_url?, url, title?, brand?, sku?, confidence}] }`
3. `POST /admin/competitor-prices/discovery/skip`   → `{ watch_id }` (nothing qualified)
4. `GET  /admin/competitor-prices/discovery/stats`  → queue health

## Auth (once per run, reuse the token)

```bash
BE="${MEDUSA_BACKEND_URL:-https://storeadmin.higitotal.pt}"
E="${MEDUSA_ADMIN_EMAIL:-$(grep -m1 '^MEDUSA_ADMIN_EMAIL=' backend/.env | cut -d= -f2-)}"
P="${MEDUSA_ADMIN_PASSWORD:-$(grep -m1 '^MEDUSA_ADMIN_PASSWORD=' backend/.env | cut -d= -f2-)}"
TOK=$(curl -s -X POST "$BE/auth/user/emailpass" -H 'Content-Type: application/json' \
  --data-binary "$(node -e "console.log(JSON.stringify({email:process.env.E,password:process.env.P}))" E="$E" P="$P")" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).token||''))")
```

## ⛔ Submission gate — a listing is eligible ONLY if ALL are true

1. The `url` is a **product page** on one of OUR competitor `base_url` domains.
2. You **opened it with `WebFetch`** and **saw a numeric EUR price shown WITHOUT
   login** — not a category/brand/PDF page, not a search result.
3. The **pack size matches ours** (same litres / kg / count, accounting for
   multipliers: our `6x2L` = their `6x2L`/`12L`, NOT their single `2L`; our `4L`
   is NOT their `4x4L` case).

If any is uncertain → **do NOT submit that listing.** Reject pages that show
*login / registo / iniciar sessão / sob consulta / pedir preço / presupuesto /
solicitar precio* or no price at all. **Never invent a URL or a price.** If a
watch has zero eligible listings, `skip` it. A wrong/garbage match is worse than
a skip — the absurd Δ it produces has to be cleaned up by hand.

**Confidence**: 95+ = verified exact product + size + public price; 85–94 =
public price verified but size shown via a multi-size selector (slight
ambiguity); never submit > 80 if you did not actually see the price.

## Discovering NEW stores (grow the competitor set)

If your research surfaces a store that is **NOT** in the competitor list but
**(a)** publicly sells our product at a public EUR price and **(b)** is a real
distributor that **serves Portugal or Spain**, treat it as a candidate to ADD.
Include it as a normal listing plus these fields, and the submit endpoint will
create the competitor (flagged `discovered` for human review) so it joins the
watchlist:

```json
{"competitor_handle":"newstore-pt","competitor_name":"New Store","competitor_base_url":"https://newstore.pt","competitor_country":"PT","is_new_competitor":true,"url":"https://newstore.pt/...","title":"…","confidence":90}
```

Be conservative: only credible PT/ES B2B cleaning/hygiene distributors (a real
storefront, public prices, ships to PT/ES). NOT marketplaces (Amazon/eBay), NOT
manufacturer eshops (diversey.*), NOT shops outside Iberia. `handle` = kebab-case
+ `-pt`/`-es` suffix. When unsure, don't add — note it in your report instead.

## Site intel (saves fetches — current as of this writing, re-verify if stale)

- **Public prices (target these):** `egi-pt` (richest — carries most of the
  Diversey range), `hegisantos-pt` (Magento), `higienaroma-pt` (Magento),
  `batoy-es` (PrestaShop), and `progelcone-pt` **/store/** pages.
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

1. `GET /next-batch?limit=N`. If `count` is 0 the queue is drained — report + stop.
2. Research each watch (see fan-out below). Apply the submission gate strictly.
3. `POST /submit { watch_id, listings:[…] }` for watches with ≥1 eligible
   listing; `POST /skip { watch_id }` for the rest. Every watch in the batch must
   get exactly one submit OR skip so it leaves the queue.
4. Repeat until `count` is 0 or you hit your budget. End with `GET /stats` and
   report: watches processed, listings submitted, skipped, queue remaining.

## Fan-out with subagents (for batches > ~6 watches)

Parallelise the slow web research; keep the writes central.

- Spawn **research subagents on the `sonnet` model** (`model: "sonnet"`), ~3
  watches each. (Sonnet follows the submission gate far more reliably than Haiku
  — worth the cost for submit-ready output.)
- **Subagents are PURE WEB RESEARCH: WebSearch/WebFetch only.** They must NOT run
  curl, authenticate, or call the Medusa backend in any way — tell them so
  explicitly (some will otherwise try to run this whole skill and hit the
  permission classifier). Only the orchestrator touches the backend.
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
