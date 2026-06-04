# ── Stage 0: dev ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json ./
COPY Backend/package.json ./Backend/
COPY buyer-app/package.json ./buyer-app/
COPY admin-app/package.json ./admin-app/

RUN npm ci

WORKDIR /app/admin-app

EXPOSE 5173
# No CMD — docker-compose provides: npx vite --host

# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Copy workspace manifests first so dep install layer is cached separately
COPY package.json package-lock.json ./
COPY Backend/package.json ./Backend/
COPY buyer-app/package.json ./buyer-app/
COPY admin-app/package.json ./admin-app/

# devDeps required: vite and tsc live in devDependencies
RUN npm ci

# Copy only the source files needed for the Vite build
COPY admin-app/index.html ./admin-app/
COPY admin-app/public/ ./admin-app/public/
COPY admin-app/src/ ./admin-app/src/
COPY admin-app/vite.config.ts ./admin-app/
COPY admin-app/tsconfig.json ./admin-app/
COPY admin-app/tsconfig.app.json ./admin-app/
COPY admin-app/tsconfig.node.json ./admin-app/

# VITE_API_URL is baked into the JS bundle at build time by Vite
ARG VITE_API_URL
RUN VITE_API_URL=$VITE_API_URL npm run build --workspace admin-app

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY admin-app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/admin-app/dist /usr/share/nginx/html

EXPOSE 80

# wget is available in nginx:alpine
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
