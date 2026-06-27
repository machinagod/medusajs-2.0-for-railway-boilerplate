---
name: competitor-matching
description: Resolve the competitor-price match-review queue — confirm/reject/reassign the fuzzy product-match PROPOSALS the deterministic matcher could not auto-confirm. Use when asked to "review competitor matches", "drain the match queue", "confirm fuzzy matches", or on a schedule. The backend never calls an LLM; *you* are the matcher, run as a Claude Code worker (mirrors the competitor-discovery skill).
---

# Competitor match-review worker

The backend auto-confirms only DETERMINISTIC matches (EAN / SKU / brand+reference).
Title-only "fuzzy" candidates are unreliable (audited <50% precision) so they are
parked as **proposals** awaiting review — not scraped, not shown live. You are the
reviewer: pull a batch, judge each proposal against OUR product, and resolve it.
Confirmed proposals go live (scraped + shown on the Prices/Gaps pages); rejected
ones drop to `catalog_only`.

## Tools (MCP — the `medusa-mcp` server fronts the queue)

Call these MCP tools directly — they're **pre-authenticated, no curl / no admin
login** (same `medusa-mcp` server as competitor-discovery; tools are auto-discovered
from its `competitor-matching` module):

1. `competitor_match_review({ limit?, offset?, competitor_id?, status? })` →
   `{ count, limit, offset, items:[{ id, competitor_handle, competitor_name,
   competitor_url, theirs_title, brand, sku, ean, match_score,
   proposed_product_id, proposed_title, proposed_sku }] }` — highest score first.
   `status` defaults to `fuzzy` (the unreviewed backlog); `confirmed` AUDITS the
   live matches, `all` sweeps both. Overrides apply to ANY match, not just fuzzy.
2. `competitor_match_resolve({ mapping_id, action, product_id?, variant_id?, product_sku?, by:"agent" })`
   — `action` is `confirm` | `reject` | `reassign`; works on ANY mapping:
   - **confirm**  — the `proposed_title` IS the same product → goes live
   - **reject**   — different product (even a wrong auto-confirm) → `catalog_only`
   - **reassign** — link to a DIFFERENT product of ours (`product_id` required)
3. `competitor_catalog_items({ limit?, offset?, competitor_id? })` — the
   `catalog_only` assortment-gap viewer (competitor products we don't carry).

For a **reassign**, find the right product with the standard admin tool
`AdminGetProducts({ q, limit, fields:"id,title,*variants.sku" })`.

> Fallback only if the MCP server is unavailable (e.g. a headless run where the
> connector isn't attached): the same routes are reachable via `curl` against
> `${MEDUSA_BACKEND_URL:-https://storeadmin.higitotal.pt}` with an admin bearer
> token (`POST /auth/user/emailpass` with `MEDUSA_ADMIN_EMAIL` /
> `MEDUSA_ADMIN_PASSWORD`) — `GET /admin/competitor-prices/match/review`,
> `POST /admin/competitor-prices/match/resolve`, `GET /admin/products?q=…`.
> Prefer the MCP tools.

## ⚖️ The judging rule (be strict — this is a precision job)

A proposal is **the same product** ONLY if `theirs_title` and `proposed_title`
are the same purchasable item: **same brand/line, same model/variant, AND the same
(or directly equivalent) pack size** — so comparing their prices is meaningful.

- **confirm** when all three hold (size equal, or a trivial restatement like
  `6x0,5L` vs `3L`, or `5 litros` vs `5L`).
- **reject** when ANY of these differ — they are the killers:
  - **Model / spec number**: `Taski Aero 15` ≠ `Aero 8`; `Suma D10` ≠ `Suma D4`;
    `Nilfisk VP300` ≠ `VP100`; `VL500 55-1` ≠ `55-2`.
  - **Accessory / consumable vs the appliance**: a vacuum **bag / hose / filter** is
    NOT the vacuum; a **refill** is NOT the dispenser.
  - **Pack size with no equivalence**: `5L` vs `20L`, `100un` vs `1000un`.
  - **Different product / category** entirely (a straw vs an apron).
  - **Different brand** when ours is brand-specific (not a generic own-label).
- **reassign** when theirs is clearly one of OUR products but NOT the proposed one
  — find the real match with `AdminGetProducts({ q })` and resolve with its `product_id`.
- When our title is **generic** (e.g. "Amaciador para Roupa (5L)") and theirs is a
  specific branded product of the same type+size, it's genuinely ambiguous: **reject**
  unless brand/ref evidence ties them. A wrong confirm pollutes the live comparison.

Open `competitor_url` with **WebFetch** when the titles alone don't settle it
(check the on-page brand, model code, net content). Don't guess.

## Loop

1. `competitor_match_review({ limit: 20 })`. Default drains the `fuzzy` backlog; pass
   `status: "confirmed"` for an audit pass over the live matches (catch wrong
   auto-confirms), or `status: "all"` to sweep everything. If `count` is 0 → done.
2. Judge each item (fan out for big batches — see below).
3. `competitor_match_resolve({ mapping_id, action, by: "agent" })` once per item.
   Every item in the batch gets exactly one confirm / reject / reassign so it
   leaves the queue.
4. Repeat until `count` is 0 or you hit your budget. Report: reviewed, confirmed,
   rejected, reassigned, remaining.

## Fan-out with subagents (batches > ~8)

Parallelise the judging; keep the writes central.

- Spawn **research subagents on `sonnet`**, ~10 proposals each. Give each the
  proposals (their `id`, `theirs_title`, `proposed_title`, `competitor_url`, `brand`),
  the judging rule above, and the domain (Diversey/Suma/Clax/Taski/Vileda/Nilfisk).
- Subagents are **READ-ONLY web research** (WebFetch/WebSearch only). They MUST NOT
  call the admin API. Each returns STRICT JSON:
  `[{"id":"…","verdict":"confirm"|"reject"|"reassign","reassign_query":"…?","reason":"≤12 words"}]`.
- **The orchestrator (you) does ALL `competitor_match_resolve` calls**, re-checking
  the rule; for a `reassign`, `AdminGetProducts({ q: reassign_query })`, pick the
  single clear match, and resolve with its `product_id` (else reject).

## Rules

- **Default to reject when uncertain.** Precision over recall — a human can always
  add a missed match via the Prices UI; a wrong confirm shows a bogus price.
- Read-only on the web; the only writes are `competitor_match_resolve` calls.
- Be a polite crawler: a couple of fetches per ambiguous proposal, not hundreds.
