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
# `medusa build` loads medusa-config.js → constants.ts, which assertValue()s
# DATABASE_URL/JWT_SECRET/COOKIE_SECRET. The build only compiles (no DB
# connection), so satisfy the asserts with throwaway values scoped to this RUN
# (they never persist in the image). Real values come from Railway at runtime.
RUN DATABASE_URL="postgres://build:build@localhost:5432/build" \
    JWT_SECRET="build" \
    COOKIE_SECRET="build" \
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
# Bake pnpm into the image so container start does not hit the network.
RUN corepack enable && corepack prepare pnpm@9.10.0 --activate
WORKDIR /app

# Built app: pruned root node_modules + .medusa (server tree already prod-installed).
COPY --from=builder /app ./

# Railway injects PORT; Medusa serves on 9000 by default.
EXPOSE 9000

# `pnpm start` = `init-backend && cd .medusa/server && medusa start --verbose`.
# init-backend runs migrations + base seed + admin user before the server boots —
# identical to the current Railway deploy behaviour.
CMD ["pnpm", "start"]
