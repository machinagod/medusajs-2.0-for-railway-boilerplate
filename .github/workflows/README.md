# CI & deploy

## Flow

```
push to master ──► GitHub Actions "CI" (ci.yml)
    │
    ├─ changes            paths-filter → which app changed (backend / storefront)
    │                          │
    ├─ image-smoke        builds + boots ONLY the changed app's image(s)   ◄ the gate
    │                     (skips the backend build/boot for storefront-only pushes)
    │                          │ green
    │                          ▼
    ├─ backend-image     build+push  (only if backend/** changed; bakes GIT_SHA)
    ├─ storefront-image  build+push  (only if storefront/** changed; bakes GIT_SHA)
    │                                                 │
    ├─ deploy ── railway redeploy ──► WAIT until prod reports the new commit
    │            (/version + /api/healthcheck report GIT_SHA)
    │                          │ live
    │                          ▼
    └─ e2e-prod           read-only Playwright against LIVE prod (token-gated)
```

**Path-filtered for fast iteration:** a `changes` job (dorny/paths-filter) detects
whether `backend/**` or `storefront/**` changed; a change to `.github/workflows/ci.yml`
counts as both. `image-smoke` ALWAYS runs (so the gate reports), but only
builds/boots the changed app, and the image-push + `deploy` + `e2e-prod` jobs are
per-app. So a storefront-only push skips the entire backend Docker build + migrate
+ boot + redeploy (and vice-versa) — a much faster publish.

GitHub Actions **builds, smoke-tests, and pushes the images**, then **nudges
Railway to pull the new `:latest` immediately** (`deploy` job, `railway redeploy
--from-source`). Each image bakes the commit into `GIT_SHA`, and `deploy` then
**waits until prod reports that commit** — the backend at `/version`, the
storefront at `/api/healthcheck` — so we never test a half-rolled deploy. Railway
services also have **GHCR image auto-updates** enabled as a fallback.

**`image-smoke` is the only pre-push gate** — it boots the **pruned** production
images, so a runtime dependency misfiled as a devDependency (e.g. storefront
`ansi-colors`, backend `react`) is caught before publish. `e2e` is **no longer a
pre-merge gate**: it runs as `e2e-prod` *after* the deploy, validating the live
site. It is strictly **read-only** (navigation/render assertions; never creates
carts/accounts/orders) and authenticates through the pre-launch access gate with
the `STOREFRONT_ACCESS_TOKEN` secret.

`backend-image`, `storefront-image`, `deploy`, and `e2e-prod` only run on **push
to master** (not on PRs). **PRs run only `image-smoke`** (build + boot).

## Images

- `ghcr.io/machinagod/higitotal-store/backend`
- `ghcr.io/machinagod/higitotal-store/storefront`

Both are **private** packages. Tags: `latest` (moving, what Railway deploys) and
`sha-<short-commit>` (immutable, for traceability / rollback).

> **Repo rename gotcha:** the GitHub repo was renamed from
> `medusajs-2.0-for-railway-boilerplate` to `higitotal-store`. CI tags with
> `ghcr.io/${{ github.repository }}/…`, so it now pushes to the `higitotal-store`
> path automatically. **Railway's image source on each service must point at the
> same path** — after the rename, `:latest` on the OLD path stops moving, so a
> service still pointed there silently keeps serving the last pre-rename build
> (this happened: prod was stuck until the Storefront/Backend sources were
> repointed to `…/higitotal-store/…:latest`).

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
- `RAILWAY_TOKEN` — A Railway *project* token scoped to the **production**
  environment (Railway → project → Settings → Tokens). Stored as a secret on the
  **`scintillating-adaptation / production` GitHub Environment** (not a plain repo
  secret), which is why the `deploy` job declares
  `environment: "scintillating-adaptation / production"`. The job uses it to force
  an immediate `railway redeploy --from-source` of both services so they pull the
  new `:latest` without waiting on Railway's auto-update poll (which can lag 10+
  min). If unset, the redeploy no-ops with a warning and image auto-updates (step
  2) remain the fallback — but then `deploy` waits on the slower poll before
  `e2e-prod` can run.
- `STOREFRONT_ACCESS_TOKEN` — **repo secret.** The pre-launch access-gate token;
  `e2e-prod` uses it to authenticate against live prod. Must match the storefront
  service's `STOREFRONT_ACCESS_TOKEN` env var.

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
   redeploys when CI publishes a new `:latest`. CI's `deploy` job force-redeploys
   for speed; this auto-update is the fallback when `RAILWAY_TOKEN` is absent. (The
   old **"Wait for CI"** git setting is moot for image-source services; leave it
   off.)

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
