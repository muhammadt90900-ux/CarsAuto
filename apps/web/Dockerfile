# ── apps/web/Dockerfile  (Next.js 16 — Turborepo monorepo)
# Build context باید  monorepo root  بێت  (context: .)
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json                  ./
COPY packages/types/package.json    ./packages/types/
COPY packages/ui/package.json       ./packages/ui/
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

WORKDIR /app/apps/web
RUN npm run build

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
