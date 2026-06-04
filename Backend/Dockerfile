# ── Stage 0: dev ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json ./
COPY Backend/package.json ./Backend/
COPY buyer-app/package.json ./buyer-app/
COPY admin-app/package.json ./admin-app/

RUN npm ci

WORKDIR /app/Backend

EXPOSE 3000
# No CMD — docker-compose provides: npx tsx watch src/index.ts

# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Copy workspace manifests first so dependency install is cached separately
COPY package.json package-lock.json ./
COPY Backend/package.json ./Backend/
COPY buyer-app/package.json ./buyer-app/
COPY admin-app/package.json ./admin-app/

# Install all deps (devDeps required: tsc lives in devDependencies)
RUN npm ci

# Copy backend source and tsconfig (no "extends" → root tsconfig.base.json not needed)
COPY Backend/src ./Backend/src
COPY Backend/tsconfig.json ./Backend/

# Compile TypeScript → Backend/dist/
RUN npm run build --workspace backend

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

# Create non-root user before COPY --chown so the user exists
RUN addgroup -S nodejs && adduser -S appuser -u 1001 -G nodejs

# Copy only the backend package.json for a standalone production install.
# Cannot use npm ci here — the root lockfile is workspace-scoped and would
# pull in all workspace prod deps (Next.js, React, …), bloating the image.
# A standalone npm install --omit=dev installs only express + dotenv (~10 MB).
COPY --chown=appuser:nodejs Backend/package.json ./package.json

RUN npm install --omit=dev

# Copy compiled output from builder stage
COPY --from=builder --chown=appuser:nodejs /app/Backend/dist ./dist

USER appuser

EXPOSE 3000

# wget is built into node:24-alpine; curl is not
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
