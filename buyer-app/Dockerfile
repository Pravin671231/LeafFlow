# ── Stage 0: dev ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json ./
COPY Backend/package.json ./Backend/
COPY buyer-app/package.json ./buyer-app/
COPY admin-app/package.json ./admin-app/

RUN npm ci

WORKDIR /app/buyer-app

EXPOSE 3000
# No CMD — docker-compose provides: npx next dev -H 0.0.0.0

# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS deps

WORKDIR /app

# Copy workspace manifests first so dep install is cached separately
COPY package.json package-lock.json ./
COPY Backend/package.json ./Backend/
COPY buyer-app/package.json ./buyer-app/
COPY admin-app/package.json ./admin-app/

RUN npm ci

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY Backend/package.json ./Backend/
COPY buyer-app/package.json ./buyer-app/
COPY admin-app/package.json ./admin-app/

# Reuse installed deps from deps stage (avoids re-downloading)
COPY --from=deps /app/node_modules ./node_modules

# Copy buyer-app source
COPY buyer-app/ ./buyer-app/

# Build generates buyer-app/.next/standalone + .next/static
RUN npm run build --workspace buyer-app

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S appuser -u 1001 -G nodejs

# Copy the standalone bundle (includes server.js + traced node_modules)
COPY --from=builder --chown=appuser:nodejs /app/buyer-app/.next/standalone ./
# Serve static assets: must live inside standalone at .next/static
COPY --from=builder --chown=appuser:nodejs /app/buyer-app/.next/static ./.next/static
# Serve public assets
COPY --from=builder --chown=appuser:nodejs /app/buyer-app/public ./public

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
