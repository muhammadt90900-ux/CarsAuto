# syntax=docker/dockerfile:1
# ── apps/web/Dockerfile  (Next.js 16 — Turborepo monorepo)
# Build context باید  monorepo root  بێت  (context: .)
# PROMPT 3: syntax directive above is required for --mount=type=secret
# (BuildKit secret mount, used below for SENTRY_AUTH_TOKEN) to work reliably
# across Docker versions.
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json                  ./
COPY packages/types/package.json    ./packages/types/
COPY packages/utils/package.json    ./packages/utils/
COPY packages/config/package.json   ./packages/config/
COPY apps/web/package.json          ./apps/web/

RUN npm install --ignore-scripts

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Internal packages (Next.js transpiles ui/utils from source)
COPY packages/ ./packages/

# Web app source
COPY apps/web/ ./apps/web/

# Next.js 16: proxy.ts replaces middleware.ts — remove old file to avoid conflict
RUN rm -f apps/web/src/middleware.ts

ENV NEXT_OUTPUT=standalone
ENV NEXT_TELEMETRY_DISABLED=1

# BUG FIX: NEXT_PUBLIC_* vars are inlined into the client bundle at build time
# by `next build` — setting them only in docker-compose's `environment:` block
# (which applies at container *runtime*) is too late and leaves every
# browser-side API call (axios baseURL) pointing at `undefined`. They must be
# passed in as build ARGs and exported as ENV before `npm run build` runs.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ARG NEXT_PUBLIC_WS_URL=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

# PROMPT 3: error tracking (Sentry) build-time config.
#
# NEXT_PUBLIC_SENTRY_DSN / NEXT_PUBLIC_APP_VERSION follow the exact same
# "must be a build ARG, not a runtime env var" reasoning as
# NEXT_PUBLIC_API_URL right above — see that comment.
#
# SENTRY_AUTH_TOKEN is different: it's a real secret (scoped to upload
# source maps to your Sentry org) that must NOT end up in a Docker image
# layer or build cache the way a plain ARG would (`docker history` can leak
# ARG values baked in earlier layers even if a later layer overwrites them).
# It's passed via BuildKit's --mount=type=secret instead, which is never
# persisted to any layer — see apps/k8s/README.md / this repo's CI for how
# `docker/build-push-action`'s `secrets:` input wires this up
# (DOCKER_BUILDKIT=1 / buildx is required either way).
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_APP_VERSION=
ARG SENTRY_ORG=
ARG SENTRY_PROJECT=
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}
ENV NEXT_PUBLIC_APP_VERSION=${NEXT_PUBLIC_APP_VERSION}
ENV SENTRY_ORG=${SENTRY_ORG}
ENV SENTRY_PROJECT=${SENTRY_PROJECT}

WORKDIR /app/apps/web
RUN --mount=type=secret,id=sentry_auth_token \
    SENTRY_AUTH_TOKEN="$(cat /run/secrets/sentry_auth_token 2>/dev/null || true)" \
    npm run build

# ── Stage 3: production image ──────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static     ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public           ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
