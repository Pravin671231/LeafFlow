# Product Development Milestones

## Ornamental plants sales — MERN Stack

| Field | Detail |
|---|---|
| Version | 1.0.0 |
| Date | May 19, 2026 |
| Repo | `leafFlow` (monorepo) |
| Apps | `backend` · `buyer-app` · `admin-app` · `e2e` |

Each milestone below is written as a self-contained GitHub Issue. Copy the body directly into a GitHub Issue, assign it to the matching milestone, and use the task checklist to track progress.

---

## Milestone Index

| # | Title | Type | Depends On |
|---|---|---|---|
| [M0](#m0-monorepo-scaffold--test-suite-setup) | Monorepo Scaffold + Test Suite Setup | Infrastructure | — |
| [M1](#m1-ci-pipeline--github-actions) | CI Pipeline — GitHub Actions | Infrastructure | M0 |
| [M2](#m2-docker--local-compose) | Docker + Local Compose | Infrastructure | M0 |
| [M3](#m3-cloudclusters-vps-deployment) | CloudClusters VPS Deployment | Infrastructure | M2 |
| [M4](#m4-domain-mapping--ssl-staging) | Domain Mapping + SSL — Staging | Infrastructure | M3 |

---

## M0: Monorepo Scaffold + Test Suite Setup

**Type:** Infrastructure
**Goal:** Every app in the monorepo is initialised, TypeScript compiles cleanly, and the full test suite (unit, integration, and e2e) can be run from the root with a single command.

### Context

This is the foundation all other milestones depend on. No feature work begins until every app boots, lints, and has at least one passing test in each layer. The monorepo uses a shared root `package.json` with workspaces pointing to `backend/`, `buyer-app/`, `admin-app/`, and `e2e/`.

### Tasks

**Monorepo root**
- [ ] Initialise root `package.json` with npm workspaces for `backend`, `buyer-app/`, `admin-app/`, `e2e`
- [ ] Add root-level scripts: `test`, `test:backend`, `test:admin-app`, `test:e2e`, `lint`, `build`
- [ ] Add `.nvmrc` / `.node-version` pinned to Node.js v24
- [ ] Configure root ESLint (`eslint.config.ts`) with TypeScript rules shared across all apps
- [ ] Configure root Prettier (`.prettierrc`) with a single style baseline
- [ ] Add `.gitignore` covering `node_modules`, `dist`, `.env`, coverage reports, Playwright reports

**Backend (`backend/`)**
- [ ] Initialise `package.json` with all backend dependencies (see SRS §7.2)
- [ ] Configure `tsconfig.json` targeting Node 24 with strict mode
- [ ] Scaffold folder structure: `src/config`, `src/controllers`, `src/middleware`, `src/models`, `src/routes`, `src/services`, `src/schemas`, `src/utils`
- [ ] Create `src/app.ts` (Express app, no routes yet — just health check `GET /health`)
- [ ] Create `src/index.ts` (server entry point — binds port, calls `connectDB()`)
- [ ] Add `.env.example` with all required keys documented (see SRS §16)
- [ ] Configure Vitest (`vitest.config.ts`) with `environment: 'node'`, coverage via `@vitest/coverage-v8`
- [ ] Write one passing smoke test: `GET /health` returns `{ status: 'ok' }` using Supertest

**Admin App (`admin-app/`)**
- [ ] Scaffold Vite + React 19 + TypeScript project
- [ ] Install all frontend dependencies (see SRS §7.3)
- [ ] Configure Tailwind v4 + DaisyUI v5
- [ ] Configure `vitest.config.ts` with `environment: 'happy-dom'` and coverage
- [ ] Set up MSW: create `src/mocks/handlers.ts` and `src/mocks/server.ts`
- [ ] Write one passing smoke test: renders `<App />` without crashing
- [ ] Add `.env.example` documenting `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_RAZORPAY_KEY`


**E2E (`e2e/`)**
- [ ] Initialise `package.json` with `@playwright/test`
- [ ] Configure `playwright.config.ts`: Chromium + Firefox + Safari (WebKit), base URL from env
- [ ] Create folder structure: `e2e/buyer/`, `e2e/admin/`
- [ ] Write one passing smoke test: navigate to `VITE_APP_URL`, assert page title is not empty

### Acceptance Criteria

- [ ] `npm run build` succeeds in all three apps with zero TypeScript errors
- [ ] `npm run lint` passes across all apps with zero errors
- [ ] `npm run test:backend` runs and reports ≥ 1 passing test
- [ ] `npm run test:admin-app` runs and reports ≥ 1 passing test
- [ ] `npm run test:e2e` runs and reports ≥ 1 passing test
- [ ] `npm test` from the root triggers all of the above sequentially
- [ ] Coverage reports are generated in each app's `coverage/` folder
- [ ] No hardcoded secrets — all config via `.env.example` files

**Dependencies:** None — this is the root milestone.

---

## M1: CI Pipeline — GitHub Actions

**Type:** Infrastructure
**Goal:** Every push and every pull request targeting `main` automatically runs linting and the full test suite. A failing test or lint error blocks the merge.

### Context

CI is set up before any real features are built so that every subsequent milestone is covered automatically. This milestone creates two workflow files: a fast **lint + unit/integration** check that runs on every push, and a heavier **e2e** check that runs on PRs to `main`.

### Tasks

**Lint + Unit/Integration Workflow (`.github/workflows/ci.yml`)**
- [ ] Trigger on: `push` to all branches, `pull_request` targeting `main`
- [ ] Use `actions/checkout@v4` and `actions/setup-node@v4` with `node-version-file: '.nvmrc'`
- [ ] Cache `node_modules` using `actions/cache` keyed on `package-lock.json` hash
- [ ] Run `npm ci` at workspace root
- [ ] Job: `lint` — run `npm run lint` across all apps
- [ ] Job: `test-backend` — run `npm run test:backend` with coverage
- [ ] Job: `test-admin-app` — run `npm run test:admin-app` with coverage

- [ ] Upload coverage reports as workflow artifacts (retain 14 days)
- [ ] Jobs `test-backend`, `test-admin-app` run in parallel; `lint` runs independently

**E2E Workflow (`.github/workflows/e2e.yml`)**
- [ ] Trigger on: `pull_request` targeting `main` only
- [ ] Spin up a MongoDB service container (`mongo:8`) for the duration of the job
- [ ] Build all three apps and start backend + both frontends using the test `.env` values stored as GitHub Secrets
- [ ] Install Playwright browsers via `npx playwright install --with-deps`
- [ ] Run `npm run test:e2e`
- [ ] Upload Playwright HTML report as a workflow artifact on failure

**GitHub Repository Settings**
- [ ] Set `main` as the protected branch
- [ ] Require all CI jobs to pass before merge is allowed
- [ ] Add CI status badge to root `README.md`

### Acceptance Criteria

- [ ] A passing commit on any branch shows green checks for lint, test-backend, test-buyer, test-admin
- [ ] A PR to `main` additionally runs the e2e workflow
- [ ] A deliberately broken test (introduce a `expect(1).toBe(2)`) causes the pipeline to fail and blocks merge
- [ ] Coverage artifacts are downloadable from the Actions run summary
- [ ] The status badge in `README.md` reflects the current `main` build state

**Dependencies:** M0

---

## M2: Docker + Local Compose

**Type:** Infrastructure
**Goal:** The entire application stack (backend, buyer-app, admin-app, MongoDB) runs locally via `docker compose up` with a single command and is accessible in the browser.

### Context

Docker images built here are reused verbatim for the VPS deployment in M3. The local compose environment uses a `.env.docker` file that mirrors the production `.env` structure so there are no surprises when deploying.

### Tasks

**Backend Dockerfile (`backend/Dockerfile`)**
- [ ] Use multi-stage build: `node:24-alpine` as builder, final image from `node:24-alpine`
- [ ] Stage 1 (`builder`): copy `package*.json`, run `npm ci`, copy source, run `npm run build` (outputs to `dist/`)
- [ ] Stage 2 (`runner`): copy only `node_modules` (production) and `dist/` from builder
- [ ] Expose port `5000`
- [ ] `CMD ["node", "dist/index.js"]`
- [ ] Add `.dockerignore` excluding `node_modules`, `__tests__`, `.env`, `coverage`

**Frontend Dockerfile (`frontend/Dockerfile`)**
- [ ] Stage 1 (`builder`): `node:24-alpine`, `npm ci`, `npm run build` (outputs to `dist/`)
- [ ] Stage 2 (`runner`): `nginx:alpine`, copy `dist/` to `/usr/share/nginx/html`
- [ ] Copy `nginx.conf` that rewrites all paths to `index.html` (SPA fallback)
- [ ] Expose port `80`

**Docker Compose (`docker-compose.yml` at repo root)**
- [ ] Service `mongo`: `mongo:8`, named volume `mongo-data`, no exposed ports externally
- [ ] Service `backend`: build from `./backend`, env from `.env.docker`, depends on `mongo`, port `5000:5000`
- [ ] Service `frontend`: build from `./frontend`, port `3000:80`, depends on `backend`

- [ ] All services on a shared `app-network` bridge network

**Configuration**
- [ ] Create `.env.docker.example` at root with all required environment variables documented
- [ ] Add `docker-compose.override.yml` for development (mounts source for hot-reload via `nodemon`)
- [ ] Document `docker compose up --build` flow in `README.md`

### Acceptance Criteria

- [ ] `docker compose up --build` completes without errors on a clean machine
- [ ] `GET http://localhost:5000/health` returns `{ "status": "ok" }`
- [ ] `http://localhost:3000` loads the frontend home page
- [ ] `docker compose down -v` cleanly removes all containers and volumes
- [ ] No environment secrets are baked into any Docker image layer (verified via `docker history`)

**Dependencies:** M0

---

## M3: CloudClusters VPS Deployment

**Type:** Infrastructure
**Goal:** Docker images from M2 are deployed and running on the CloudClusters VPS. All three apps are accessible over HTTP on the VPS public IP address.

### Context

CloudClusters provides a managed VPS. The deployment uses the same `docker-compose.yml` from M2 with a production-specific `.env` file. This milestone establishes the staging server; HTTPS and a real domain come in M4.

### Tasks

**VPS Initial Setup**
- [ ] SSH into the CloudClusters VPS and confirm root/sudo access
- [ ] Update system packages: `apt update && apt upgrade -y`
- [ ] Install Docker Engine (official Docker repo, not `apt` default)
- [ ] Install Docker Compose plugin (`docker compose` v2)
- [ ] Create a non-root deploy user (`deploy`) and add to `docker` group
- [ ] Set up SSH key authentication for the `deploy` user; disable password SSH login

**Repository & Configuration on VPS**
- [ ] Clone the repository into `/home/deploy/LeafFlow` on the VPS
- [ ] Create `/home/deploy/LeafFlow/.env.production` with all production secrets (never commit this file)
- [ ] Set file permissions: `chmod 600 .env.production`

**Deployment**
- [ ] On VPS: `docker compose -f docker-compose.yml --env-file .env.production up -d --build`
- [ ] Confirm all four containers (`mongo`, `backend`, `frontend`,) are running via `docker compose ps`
- [ ] Configure UFW firewall: allow SSH (22), HTTP (80), ports 3000, 3001, 5000; deny everything else

**CI/CD Deployment Job (`.github/workflows/deploy.yml`)**
- [ ] Trigger on: push to `main` only (after CI passes)
- [ ] Use GitHub Secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`
- [ ] Job: SSH into VPS via `appleboy/ssh-action`, run `git pull && docker compose up -d --build`
- [ ] Add a smoke-test step: `curl --fail http://<VPS_IP>:5000/health` after deploy

### Acceptance Criteria

- [ ] `curl http://<VPS_IP>:5000/health` returns `{ "status": "ok" }` from an external machine
- [ ] `http://<VPS_IP>:3000` loads the frontend home page in a browser
- [ ] Pushing a commit to `main` triggers the deploy workflow and the VPS is updated automatically
- [ ] `docker compose logs backend` shows no fatal errors
- [ ] No production secrets are stored in the repository or in any Docker image

**Dependencies:** M2

---

## M4: Domain Mapping + SSL — Staging

**Type:** Infrastructure
**Goal:** The staging server is accessible via a real domain over HTTPS. HTTP traffic is automatically redirected to HTTPS. SSL certificate auto-renews.

### Context

Uses Nginx as a reverse proxy (or Caddy as an alternative — choose one) running inside Docker alongside the app containers. Let's Encrypt issues the SSL certificate via Certbot (Nginx) or the Caddy ACME client. Staging subdomains are used so production DNS can be set up independently later.

Suggested subdomains:
- `api.staging.yourdomain.com` → backend (port 5000)
- `staging.yourdomain.com` → buyer-app (port 3000)

### Tasks

**DNS**
- [ ] Log into domain registrar and create three A records pointing to the VPS IP:
  - `staging.yourdomain.com`
  - `api.staging.yourdomain.com`
- [ ] Verify DNS propagation: `nslookup staging.yourdomain.com` resolves to VPS IP

**Nginx + Certbot (inside Docker)**
- [ ] Add `nginx` service to `docker-compose.yml`: `nginx:alpine`, ports `80:80` and `443:443`
- [ ] Add `certbot` service: `certbot/certbot`, mounts shared volumes for certs and webroot
- [ ] Write `nginx/conf.d/staging.conf`:
  - HTTP server block on port 80 serving `/.well-known/acme-challenge/` for Certbot, redirect all other traffic to HTTPS
  - HTTPS server block on port 443 with SSL cert paths, proxy pass to `buyer-app:80`
  <!-- - Repeat for `api.staging` → `backend:5000` and `admin.staging` → `admin-app:80` -->
- [ ] Remove direct port exposure for `backend`,  `frontend`,  (traffic only via Nginx)
- [ ] Update UFW: close ports 3000, 5000 externally; keep 80 and 443 open

**Certificate Issuance**
- [ ] Run initial Certbot challenge: `docker compose run certbot certonly --webroot ...` for all three subdomains
- [ ] Confirm certs are issued and stored in the shared volume
- [ ] Reload Nginx to pick up certs: `docker compose exec nginx nginx -s reload`
- [ ] Add cron job on VPS: `0 3 * * * docker compose run certbot renew && docker compose exec nginx nginx -s reload`

**Update App Configuration**
- [ ] Update `VITE_API_URL` in buyer-app and admin-app production `.env` to use `https://api.staging.yourdomain.com`
- [ ] Rebuild and redeploy: `docker compose up -d --build`

### Acceptance Criteria

- [ ] `https://staging.yourdomain.com` loads the buyer-app with a valid SSL certificate (no browser warning)
- [ ] `https://api.staging.yourdomain.com/health` returns `{ "status": "ok" }` over HTTPS
- [ ] `http://staging.yourdomain.com` (HTTP) automatically redirects to `https://staging.yourdomain.com`
- [ ] SSL Labs test scores A or better for all three subdomains
- [ ] Certificate expiry is ≥ 60 days from issuance date
- [ ] Certbot renewal cron is confirmed via `crontab -l` on the VPS

**Dependencies:** M3

---


---

## Appendix: Environment Variables Reference

| Variable | Used By | Description |
|---|---|---|
| `NODE_ENV` | Backend | `development` / `production` |
| `PORT` | Backend | HTTP port (default `5000`) |
| `MONGODB_URI` | Backend | MongoDB Atlas connection string |
| `JWT_PRIVATE_KEY` | Backend | RS256 private key (PEM) for signing access tokens |
| `JWT_PUBLIC_KEY` | Backend | RS256 public key (PEM) for verifying access tokens |
| `REFRESH_TOKEN_SECRET` | Backend | HMAC secret for hashing refresh tokens |
| `GOOGLE_CLIENT_ID` | Backend | Google OAuth client ID |
| `RAZORPAY_KEY_ID` | Backend | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | Backend | Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET` | Backend | HMAC secret for verifying Razorpay webhooks |
| `R2_ACCOUNT_ID` | Backend | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Backend | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Backend | Cloudflare R2 secret key |
| `R2_PUBLIC_BUCKET` | Backend | R2 bucket name for public assets (covers) |
| `R2_PRIVATE_BUCKET` | Backend | R2 bucket name for private assets (PDFs) |
| `R2_PUBLIC_URL` | Backend | CDN base URL for public bucket |
| `SMTP_HOST` | Backend | SMTP server hostname |
| `SMTP_PORT` | Backend | SMTP port (587 for TLS) |
| `SMTP_USER` | Backend | SMTP username |
| `SMTP_PASS` | Backend | SMTP password |
| `ADMIN_EMAIL` | Backend | Default admin account email (seeding) |
| `ADMIN_PASSWORD` | Backend | Default admin account password (seeding) |
| `CORS_ORIGIN` | Backend | Comma-separated allowed origins |
| `VITE_API_URL` | frontend | Backend base URL |
| `VITE_GOOGLE_CLIENT_ID` | frontend | Google OAuth client ID |
| `VITE_RAZORPAY_KEY` | frontend | Razorpay public key (safe to expose) |

---

## Appendix: Test Coverage Targets

| App | Scope | Target |
|---|---|---|
| Backend | Route handlers | ≥ 70% |
| Backend | Services (payment, storage, email) | ≥ 80% |
| Backend | Auth middleware | ≥ 90% |
| frontend | Components | ≥ 60% |
| frontend | Redux slices | ≥ 85% |


---

## Appendix: Critical E2E Scenarios (Playwright)

These scenarios must be green before any milestone is considered deployable to staging:

