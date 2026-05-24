# GitHub Issues — Decomposed from Milestones

## Ornamental plants sales — MERN Stack

| Field | Detail |
|---|---|
| Version | 1.0.0 |
| Date | May 19, 2026 |
| Source | [MILESTONES.md](MILESTONES.md) |
| Strategy | Decomposition by app/area (Strategy A) |

Each entry below is a self-contained GitHub Issue. Copy the body into a new issue, attach the listed labels, assign it to the matching milestone, and link the listed dependencies. Acceptance criteria for the *whole* milestone live in [MILESTONES.md](MILESTONES.md); each issue lists only the slice it owns.

### Label scheme

| Group | Values |
|---|---|
| Area | `area:backend`, `area:buyer-app`, `area:admin-app`, `area:e2e`, `area:infra`, `area:devops` |
| Type | `type:feature`, `type:infra`, `type:test`, `type:docs` |
| Priority | `priority:p0` (blocker), `priority:p1` (must-have) |

---

## Issue Index

| # | Title | Milestone | Labels |
|---|---|---|---|
| [M0-1](#m0-1-monorepo-root-setup) | Monorepo root setup | M0 | infra, p0 |
| [M0-2](#m0-2-backend-scaffold--smoke-test) | Backend scaffold + smoke test | M0 | backend, infra, p0 |
| [M0-3](#m0-3-buyer-app-scaffold--smoke-test) | Buyer App scaffold + smoke test | M0 | buyer-app, infra, p0 |
| [M0-4](#m0-4-admin-app-scaffold--smoke-test) | Admin App scaffold + smoke test | M0 | admin-app, infra, p0 |
| [M0-5](#m0-5-e2e-scaffold--smoke-test) | E2E scaffold + smoke test | M0 | e2e, infra, p0 |
| [M1-1](#m1-1-ci-lint--unitintegration-workflow) | CI lint + unit/integration workflow | M1 | devops, p0 |
| [M1-2](#m1-2-ci-e2e-workflow) | CI E2E workflow | M1 | devops, e2e, p0 |
| [M1-3](#m1-3-branch-protection--ci-status-badge) | Branch protection + CI status badge | M1 | devops, p1 |
| [M2-1](#m2-1-backend-dockerfile) | Backend Dockerfile | M2 | backend, devops, p0 |
| [M2-2](#m2-2-buyer-app-dockerfile--nginx-config) | Buyer App Dockerfile + nginx config | M2 | buyer-app, devops, p0 |
| [M2-3](#m2-3-admin-app-dockerfile--nginx-config) | Admin App Dockerfile + nginx config | M2 | admin-app, devops, p0 |
| [M2-4](#m2-4-docker-compose--env-templates) | docker-compose.yml + env templates | M2 | devops, p0 |
| [M2-5](#m2-5-compose-flow-documentation) | Compose flow documentation | M2 | docs, p1 |
| [M3-1](#m3-1-vps-initial-setup) | VPS initial setup | M3 | devops, p0 |
| [M3-2](#m3-2-vps-repository--production-env) | VPS repository + production env | M3 | devops, p0 |
| [M3-3](#m3-3-vps-initial-deployment--firewall) | VPS initial deployment + firewall | M3 | devops, p0 |
| [M3-4](#m3-4-cd-deploy-workflow) | CD deploy workflow | M3 | devops, p0 |
| [M4-1](#m4-1-dns-records-for-staging-subdomains) | DNS records for staging subdomains | M4 | devops, p0 |
| [M4-2](#m4-2-nginx--certbot-services--config) | Nginx + Certbot services + config | M4 | devops, p0 |
| [M4-3](#m4-3-ssl-certificate-issuance--renewal-cron) | SSL certificate issuance + renewal cron | M4 | devops, p0 |
| [M4-4](#m4-4-app-config-for-https-staging) | App config for HTTPS staging | M4 | backend, buyer-app, admin-app, p0 |

---
## M0 — Monorepo Scaffold + Test Suite Setup

**Type:** Infrastructure  
**Goal:** Every app in the monorepo is initialised, TypeScript compiles cleanly, and the full test suite (unit, integration, and e2e) can be run from the root with a single command.

---

### Context

This is the foundation all other milestones depend on. No feature work begins until every app boots, lints, and has at least one passing test in each layer.

The monorepo uses a shared root `package.json` with workspaces pointing to:

- `backend/`
- `buyer-app/`
- `admin-app/`
- `e2e/`

---

### Tasks

#### Monorepo root

- [ ] Initialise root `package.json` with npm workspaces for `backend`, `buyer-app`, `admin-app`, `e2e`
- [ ] Add root-level scripts:
  - `test`
  - `test:backend`
  - `test:admin-app`
  - `test:e2e`
  - `lint`
  - `build`
- [ ] Add `.nvmrc` / `.node-version` pinned to Node.js v24
- [ ] Configure root ESLint (`eslint.config.ts`) with TypeScript rules shared across all apps
- [ ] Configure root Prettier (`.prettierrc`) with a single style baseline
- [ ] Add `.gitignore` covering:
  - `node_modules`
  - `dist`
  - `.env`
  - coverage reports
  - Playwright reports

---

#### Backend (`backend/`)

- [ ] Initialise `package.json` with all backend dependencies
- [ ] Configure `tsconfig.json` targeting Node 24 with strict mode
- [ ] Scaffold folder structure:
  - `src/config`
  - `src/controllers`
  - `src/middleware`
  - `src/models`
  - `src/routes`
  - `src/services`
  - `src/schemas`
  - `src/utils`
- [ ] Create `src/app.ts`
  - Express app
  - No routes yet
  - Add health check `GET /health`
- [ ] Create `src/index.ts`
  - Server entry point
  - Binds port
  - Calls `connectDB()`
- [ ] Add `.env.example` with all required keys documented
- [ ] Configure Vitest (`vitest.config.ts`)
  - `environment: 'node'`
  - coverage via `@vitest/coverage-v8`
- [ ] Write one passing smoke test:
  - `GET /health`
  - returns `{ status: 'ok' }`
  - tested using Supertest

---

#### Admin App (`admin-app/`)

- [ ] Scaffold Vite + React 19 + TypeScript project
- [ ] Install all admin-app dependencies
- [ ] Configure Tailwind v4 + DaisyUI v5
- [ ] Configure `vitest.config.ts`
  - `environment: 'happy-dom'`
  - coverage enabled
- [ ] Set up MSW:
  - `src/mocks/handlers.ts`
  - `src/mocks/server.ts`
- [ ] Write one passing smoke test:
  - renders `<App />`
  - no crash
- [ ] Add `.env.example` documenting:
  - `VITE_API_URL`
  - `VITE_GOOGLE_CLIENT_ID`
  - `VITE_RAZORPAY_KEY`

---

#### E2E (`e2e/`)

- [ ] Initialise `package.json` with `@playwright/test`
- [ ] Configure `playwright.config.ts`
  - Chromium
  - Firefox
  - Safari (WebKit)
  - base URL from env
- [ ] Create folder structure:
  - `e2e/buyer/`
  - `e2e/admin/`
- [ ] Write one passing smoke test:
  - navigate to `VITE_APP_URL`
  - assert page title is not empty

---

### Acceptance Criteria

- [ ] `npm run build` succeeds in all three apps with zero TypeScript errors
- [ ] `npm run lint` passes across all apps with zero errors
- [ ] `npm run test:backend` reports ≥ 1 passing test
- [ ] `npm run test:admin-app` reports ≥ 1 passing test
- [ ] `npm run test:e2e` reports ≥ 1 passing test
- [ ] `npm test` from root runs all test suites sequentially
- [ ] Coverage reports generated in each app’s `coverage/` folder
- [ ] No hardcoded secrets — all config via `.env.example`

---

**Dependencies:** None

---

# M1 — CI Pipeline — GitHub Actions

**Type:** Infrastructure  
**Goal:** Every push and pull request targeting `main` automatically runs linting and the full test suite.

---

### Tasks

#### Lint + Unit/Integration Workflow (`.github/workflows/ci.yml`)

- [ ] Trigger on:
  - push to all branches
  - pull requests targeting `main`
- [ ] Use:
  - `actions/checkout@v4`
  - `actions/setup-node@v4`
- [ ] Use `node-version-file: '.nvmrc'`
- [ ] Cache `node_modules` using `actions/cache`
- [ ] Run `npm ci` at workspace root

##### Jobs

- [ ] `lint`
  - run `npm run lint`
- [ ] `test-backend`
  - run `npm run test:backend`
  - generate coverage
- [ ] `test-admin-app`
  - run `npm run test:admin-app`
  - generate coverage

- [ ] Upload coverage reports as workflow artifacts
- [ ] Retention: 14 days
- [ ] `test-backend` and `test-admin-app` run in parallel

---

#### E2E Workflow (`.github/workflows/e2e.yml`)

- [ ] Trigger on PRs targeting `main`
- [ ] Spin up MongoDB service container (`mongo:8`)
- [ ] Build all apps
- [ ] Start backend and frontend with test `.env`
- [ ] Install Playwright browsers:
  - `npx playwright install --with-deps`
- [ ] Run:
  - `npm run test:e2e`
- [ ] Upload Playwright HTML report on failure

---

#### GitHub Repository Settings

- [ ] Protect `main`
- [ ] Require CI checks before merge
- [ ] Add CI status badge to `README.md`

---

### Acceptance Criteria

- [ ] Passing commits show green checks
- [ ] PRs to `main` run e2e workflow
- [ ] Broken tests fail pipeline and block merge
- [ ] Coverage artifacts downloadable from Actions
- [ ] README badge reflects build state

---

**Dependencies:** M0

---

# M2 — Docker + Local Compose

**Type:** Infrastructure  
**Goal:** Entire application stack runs locally with one command.

---

### Tasks

#### Backend Dockerfile (`backend/Dockerfile`)

- [ ] Multi-stage build using `node:24-alpine`
- [ ] Builder stage:
  - copy package files
  - `npm ci`
  - copy source
  - `npm run build`
- [ ] Runner stage:
  - copy production `node_modules`
  - copy `dist/`
- [ ] Expose port `5000`
- [ ] Command:
  - `CMD ["node", "dist/index.js"]`
- [ ] Add `.dockerignore`

---

#### Frontend Dockerfile (`frontend/Dockerfile`)

- [ ] Builder stage:
  - install deps
  - run build
- [ ] Runner stage:
  - `nginx:alpine`
  - copy `dist/`
- [ ] Add `nginx.conf`
  - SPA fallback
- [ ] Expose port `80`

---

#### Docker Compose (`docker-compose.yml`)

- [ ] Service: `mongo`
  - `mongo:8`
  - named volume
- [ ] Service: `backend`
  - build from `./backend`
  - env from `.env.docker`
  - depends on mongo
  - `5000:5000`
- [ ] Service: `frontend`
  - build from `./frontend`
  - `3000:80`
  - depends on backend
- [ ] Shared `app-network`

---

#### Configuration

- [ ] Create `.env.docker.example`
- [ ] Add `docker-compose.override.yml`
- [ ] Document Docker workflow in `README.md`

---

### Acceptance Criteria

- [ ] `docker compose up --build` succeeds
- [ ] `GET http://localhost:5000/health` returns `{ "status": "ok" }`
- [ ] Frontend loads at `http://localhost:3000`
- [ ] `docker compose down -v` removes containers cleanly
- [ ] No secrets baked into Docker image layers

---

**Dependencies:** M0

---

# M3 — CloudClusters VPS Deployment

**Type:** Infrastructure  
**Goal:** Deploy Docker images to CloudClusters VPS.

---

### Tasks

#### VPS Initial Setup

- [ ] SSH into VPS
- [ ] Update packages
- [ ] Install Docker Engine
- [ ] Install Docker Compose plugin
- [ ] Create `deploy` user
- [ ] Configure SSH key authentication
- [ ] Disable password login

---

#### Repository & Configuration

- [ ] Clone repo into:
  - `/home/deploy/LeafFlow`
- [ ] Create `.env.production`
- [ ] Set permissions:
  - `chmod 600 .env.production`

---

#### Deployment

- [ ] Run:
  ```bash
  docker compose -f docker-compose.yml --env-file .env.production up -d --build