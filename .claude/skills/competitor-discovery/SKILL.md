---
name: competitor-discovery
description: Find competitor product listings for our watched products via the Medusa discovery queue. Use when asked to "run competitor discovery", "find competitor listings/URLs", "process the discovery queue", or on a scheduled routine. Does the web research itself (no Anthropic API key in the backend) and submits results back to the queue.
---

# Competitor discovery worker

You are the **worker** for the competitor-price discovery queue. The Medusa
backend holds the queue of our products to find at competitors; you pull a
batch, do the web research yourself, and submit the listings back. The backend
never calls an LLM API — *you* are the intelligence, run on a schedule.

This mirrors the higitotal-deno contest-enrichment pattern (`enrich_next_batch`
→ research → `enrich_submit`).

## Endpoints (Medusa admin API, admin-authed)

Base URL: `${MEDUSA_BACKEND_URL:-https://storeadmin.higitotal.pt}`

1. `GET  /admin/competitor-prices/discovery/next-batch?limit=N` → `{ watches:[{watch_id, product_id, sku, title, brand, ean}], competitors:[{handle,name,base_url,country,scraper_key}] }`
2. `POST /admin/competitor-prices/discovery/submit` → `{ watch_id, listings:[{competitor_handle, competitor_name?, competitor_base_url?, url, title?, brand?, sku?, confidence?}] }`
3. `POST /admin/competitor-prices/discovery/skip`   → `{ watch_id }` (nothing found)
4. `GET  /admin/competitor-prices/discovery/stats`  → queue health

## Auth

Get a bearer token once, reuse it for the run. Credentials come from env
(`MEDUSA_ADMIN_EMAIL` / `MEDUSA_ADMIN_PASSWORD`), falling back to `backend/.env`
when running locally:

```bash
BE="${MEDUSA_BACKEND_URL:-https://storeadmin.higitotal.pt}"
E="${MEDUSA_ADMIN_EMAIL:-$(grep -m1 '^MEDUSA_ADMIN_EMAIL=' backend/.env | cut -d= -f2-)}"
P="${MEDUSA_ADMIN_PASSWORD:-$(grep -m1 '^MEDUSA_ADMIN_PASSWORD=' backend/.env | cut -d= -f2-)}"
TOK=$(curl -s -X POST "$BE/auth/user/emailpass" -H 'Content-Type: application/json' \
  --data-binary "$(node -e "console.log(JSON.stringify({email:process.env.E,password:process.env.P}))" E="$E" P="$P")" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).token||''))")
```

## Loop

1. **Pull a batch**: `GET /next-batch?limit=10`. If `count` is 0, the queue is
   drained — report and stop.
2. **For each watch**, research where the product is sold among the returned
   `competitors` (prefer the ones whose `country` matches and that publish public
   prices). Use `WebSearch` and `WebFetch`:
   - Search the product's `title` + `brand` (+ size) scoped to a competitor's
     `base_url` domain, e.g. `WebSearch("Oxivir Plus 5L site:distribucionesbatoy.com")`.
   - Open the best candidate with `WebFetch` and **verify it is the same product
     and the same pack size** (a 5L listing is NOT our 20L). Capture the exact
     product-page `url`, and the listing `title`/`brand`/`sku` if visible.
   - **Confidence (0–100)**: 95+ exact same product & size & brand; 80–94 same
     product, size inferred/slightly ambiguous; <80 uncertain — submit with the
     low score (the backend keeps it as `fuzzy` for human review) rather than
     inventing certainty. Never fabricate a URL.
3. **Submit**: `POST /submit { watch_id, listings:[…] }` with everything found
   (0..N per competitor). If you found nothing for a watch, `POST /skip
   { watch_id }` so it leaves the queue.
4. Repeat from step 1 until the batch is empty or you hit your budget.

## Rules

- **Read-only on the web.** Only writes are the queue `submit`/`skip` calls.
- **One listing per (competitor, product)** — the backend dedupes by URL anyway.
- Don't guess prices; the scraper captures the live price from the `url` you
  submit. Submitting an accurate URL + size is what matters.
- Be a polite crawler: a handful of fetches per product, not hundreds.
- At the end, `GET /stats` and report: batches processed, listings submitted,
  watches skipped, queue remaining.
