# CI & deploy

## Flow

```
push to master ──► GitHub Actions "CI" (ci.yml)
    │
    ├─ e2e                spins Postgres + backend + storefront, runs Playwright e2e
    │                     (ephemeral CI Postgres — never production)
    │                          │ green
    │                          ▼
    ├─ image-smoke        build + boot the REAL backend & storefront images,
    │                     assert backend /health and storefront serves
    │                          │ green
    │                          ▼
    ├─ backend-image     build backend/Dockerfile  ─┐  push to GHCR (private)
    ├─ storefront-image  build storefront/Dockerfile ┘  tags :latest + :sha-<commit>
    │                                                 │
    └─ deploy ── railway redeploy --from-source ──────┘  (nudge Railway to pull now)
```

GitHub Actions **builds, smoke-tests, and pushes the images**, then **nudges
Railway to pull the new `:latest` immediately** (`deploy` job, `railway redeploy
--from-source`). Railway services also have **GHCR image auto-updates** enabled
as a fallback — if the nudge is skipped (no `RAILWAY_TOKEN`) or fails, Railway
still picks up the new image on its next poll (just slower, 10+ min). Railway no
longer builds from the repo.

`e2e` and `image-smoke` both gate the push: a red run blocks the image (and
therefore the deploy). `e2e` runs the app from source with devDependencies
present; `image-smoke` boots the **pruned** production images, so a runtime
dependency misfiled as a devDependency (e.g. storefront `ansi-colors`, backend
`react`) can't pass `e2e` yet crash the deployed image.

`backend-image` and `storefront-image` only run on **push to master** (not on
PRs). PRs get the full `e2e` + `image-smoke` gate.

## Images

- `ghcr.io/machinagod/medusajs-2.0-for-railway-boilerplate/backend`
- `ghcr.io/machinagod/medusajs-2.0-for-railway-boilerplate/storefront`

Both are **private** packages. Tags: `latest` (moving, what Railway deploys) and
`sha-<short-commit>` (immutable, for traceability / rollback).

The `NEXT_PUBLIC_*` storefront config is **baked into the image at build time**
(Next.js inlines it), so the storefront image is environment-specific — it
carries the production backend URL, publishable key, region, etc. The backend
image needs no build-time secrets (`medusa build` only bundles; optional modules
stay disabled when their env is absent).

The storefront image builds **hermetically** — it does not need a running
backend. `generateStaticParams` (product/collection/category routes) degrades to
no prerendered paths when the backend is unreachable at build time, so those
routes simply render on demand instead. When the backend *is* reachable at build
time, they are still statically prerendered.

## One-time setup

### 1. GitHub → Settings → Secrets and variables → Actions

**Secrets:**
- `GITHUB_TOKEN` — provided automatically; has `packages: write` for pushing to GHCR.
- `RAILWAY_TOKEN` — **optional but recommended.** A Railway *project* token scoped
  to the **production** environment (Railway → project → Settings → Tokens). The
  `deploy` job uses it to force an immediate `railway redeploy --from-source` of
  both services so they pull the new `:latest` without waiting on Railway's
  auto-update poll (which can lag 10+ min). If unset, the `deploy` job no-ops with
  a warning and image auto-updates (step 2) remain the fallback.

**Variables** (these are `NEXT_PUBLIC_*` — public values, not secrets — inlined
into the storefront image at build time):

| Variable | Example |
| --- | --- |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `https://<backend>.up.railway.app` |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | `pk_...` (required — missing fails the build) |
| `NEXT_PUBLIC_BASE_URL` | `https://<storefront>.up.railway.app` |
| `NEXT_PUBLIC_DEFAULT_REGION` | `dk` |
| `NEXT_PUBLIC_MINIO_ENDPOINT` | `bucket-...up.railway.app` (optional) |
| `NEXT_PUBLIC_SEARCH_ENDPOINT` | MeiliSearch URL (optional) |
| `NEXT_PUBLIC_SEARCH_API_KEY` | MeiliSearch search key (optional) |
| `NEXT_PUBLIC_INDEX_NAME` | `products` (optional) |

### 2. Railway → each service (Backend, Storefront), `production` environment

1. **Source → Docker Image**: set to the GHCR image above with the `:latest` tag.
2. **Private registry credentials**: add GHCR auth so Railway can pull the
   private package — username = your GitHub username, password = a GitHub PAT
   with **`read:packages`**. (This credential cannot be set through the Railway
   API/MCP; it must be added in the dashboard.)
3. Clear any **custom start command** so the image's `CMD` is used (the backend
   image runs `pnpm start` = migrate-on-boot + `medusa start`; the storefront
   image runs `next start`).
4. Keep the existing **health check paths** (`/health`, `/api/healthcheck`).
5. **Enable image auto-updates** on the service so Railway polls the GHCR tag and
   redeploys when CI publishes a new `:latest`. This is what deploys — CI has no
   deploy job. (The old **"Wait for CI"** git setting is moot for image-source
   services; leave it off.)

> Because the images don't exist until the first `master` build runs, do the
> Railway source switch **after** that first build has pushed both images
> (otherwise the first image-source deploy has nothing to pull).

## ⚠️ The Playwright suite mutates its database

`storefront/e2e` **drops and recreates** its database between runs (failsafes
require the DB name to start with `test_`). It must only ever point at the
ephemeral CI database — never the production `DATABASE_URL`. The CI workflow
enforces this with `TEST_POSTGRES_DATABASE=test_medusa_db` against the CI
Postgres service.

## Iterating on CI

- **Image build / boot failures** surface in the `image-smoke` job (and, on
  master, the `backend-image` / `storefront-image` push jobs). `image-smoke`
  builds the real Dockerfiles and boots them, so it catches both build breakage
  and runtime crashes (e.g. a pruned runtime dep, or a `medusa db:migrate`
  failure) — check its container-log step.
- **e2e failures**: check the **playwright-report** artifact and the "Dump
  server logs" step. Likely tweaks: the seeded `NEXT_PUBLIC_DEFAULT_REGION`,
  seed data expectations, or specs that need a payment provider.
- **Deploy didn't happen**: CI only publishes the image; the redeploy is
  Railway's image auto-update. Check that the service has auto-updates enabled
  and valid GHCR pull credentials, and that the new `:latest` digest was pushed.
