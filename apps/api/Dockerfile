# ── apps/api/Dockerfile  (NestJS — Turborepo monorepo)
# Build context باید  monorepo root  بێت  (context: .)
# ──────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy workspace manifests (npm workspaces resolution)
COPY package*.json                  ./
COPY packages/types/package.json    ./packages/types/
COPY packages/config/package.json   ./packages/config/
COPY apps/api/package.json          ./apps/api/

RUN npm install --ignore-scripts

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Internal packages
COPY packages/config/ ./packages/config/
COPY packages/types/  ./packages/types/

# Build @auto-bazaar-pro/types  (API requires compiled dist/index.js)
RUN npx tsc --project packages/types/tsconfig.json

# Copy API source + Prisma schema
COPY apps/api/ ./apps/api/

# Generate Prisma client  (skipped by --ignore-scripts above)
WORKDIR /app/apps/api
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build NestJS
RUN npm run build

# ── Stage 3: production image ──────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nestjs

# Root node_modules (includes workspace symlinks + generated Prisma client)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules              ./node_modules

# Workspace package content (symlink target for @auto-bazaar-pro/types)
COPY --from=builder --chown=nestjs:nodejs /app/packages/types/dist       ./packages/types/dist
COPY --from=builder --chown=nestjs:nodejs /app/packages/types/package.json ./packages/types/package.json

# Compiled API
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist             ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package*.json    ./apps/api/

WORKDIR /app/apps/api
USER nestjs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main"]
