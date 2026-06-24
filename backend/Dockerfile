# syntax=docker/dockerfile:1

# Backend image (Medusa server + admin). Built in GitHub Actions, pushed to
# GHCR, deployed by Railway. Mirrors what `pnpm build` / `pnpm start` do on the
# Nixpacks path so runtime behaviour is unchanged (init-backend migrates on boot).

# Pinned to the repo's Node (.nvmrc = v22.11.0) and pnpm (packageManager = 9.10.0).
ARG NODE_IMAGE=node:22.11.0-bookworm-slim

# ── Builder ─────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS builder
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate
WORKDIR /app

# Install deps first so the layer caches independently of source changes.
# .npmrc carries the JSR registry (@machinagod/moloni-client-ts) and peer flags.
COPY package.json pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# `pnpm build` = `medusa build` + postBuild.js. postBuild installs prod deps
# inside .medusa/server (its own package.json), so that tree is self-contained.
COPY . .
# The admin dashboard's API base URL (admin.backendUrl) is baked into the bundle
# at BUILD time by `medusa build` from BACKEND_PUBLIC_URL. It MUST be the public
# backend URL — the RAILWAY_PUBLIC_DOMAIN_VALUE fallback only exists at runtime on
# Railway, not here in CI, so without this arg the admin hardwires the
# `http://localhost:9000` dev fallback and every admin API call (incl. login)
# fails in production. Supplied by CI from the NEXT_PUBLIC_MEDUSA_BACKEND_URL var.
ARG BACKEND_PUBLIC_URL
# `medusa build` loads medusa-config.js → constants.ts, which assertValue()s
# DATABASE_URL/JWT_SECRET/COOKIE_SECRET. The build only compiles (no DB
# connection), so satisfy the asserts with throwaway values scoped to this RUN
# (they never persist in the image). Real values come from Railway at runtime.
# Mount the SAME pnpm store the root install populated, so postBuild.js's
# `pnpm i --prod` inside .medusa/server hardlinks from the warm store instead of
# re-downloading every prod dep — the bulk of the backend image build time.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    DATABASE_URL="postgres://build:build@localhost:5432/build" \
    JWT_SECRET="build" \
    COOKIE_SECRET="build" \
    BACKEND_PUBLIC_URL="${BACKEND_PUBLIC_URL}" \
    pnpm build

# Root install still has devDependencies; runtime only needs init-backend's deps
# (@medusajs/cli, medusajs-launch-utils — both runtime dependencies). Slim them.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm prune --prod

# ── Runner ──────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# `procps` provides `ps`, which Crawlee's autoscaled pool shells out to for CPU/
# memory snapshots — absent from the slim base, it fails the competitor scraper
# with "spawn ps ENOENT".
RUN apt-get update \
  && apt-get install -y --no-install-recommends procps \
  && rm -rf /var/lib/apt/lists/*
# Bake pnpm into the image so container start does not hit the network.
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate
WORKDIR /app

# Built app: pruned root node_modules + .medusa (server tree already prod-installed).
COPY --from=builder /app ./

# Commit baked in for the /version probe — CI polls it post-deploy to confirm
# this exact build is live before running prod e2e.
ARG GIT_SHA
ENV GIT_SHA=${GIT_SHA}

# Railway injects PORT; Medusa serves on 9000 by default.
EXPOSE 9000

# `pnpm start` = `init-backend && cd .medusa/server && medusa start --verbose`.
# init-backend runs migrations + base seed + admin user before the server boots —
# identical to the current Railway deploy behaviour.
CMD ["pnpm", "start"]
