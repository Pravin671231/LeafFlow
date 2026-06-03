# LeafFlow — Development Milestones

This document is the delivery roadmap for LeafFlow. Each milestone groups one or more GitHub issues into a shippable increment. Detailed acceptance criteria live in [issues.md](issues.md); SRS requirements live in [SRS.md](SRS.md).

---

## Branch Strategy

```
feature/<scope>  →  develop  →  master
```

- **`feature/*`** branches cut from `develop`; one branch per issue.
- **`develop`** is the integration branch. Every merge requires a passing `ci-feature` run.
- **`master`** is production-ready. Every merge from `develop` requires a passing `ci-release` run (includes E2E from M9 onward).
- Rebase `feature/*` onto `develop` before opening a PR. Squash-merge `develop → master`.

---

## CI Gates

| PR direction | Workflow | Jobs |
|---|---|---|
| `feature/*` → `develop` | `ci-feature.yml` | lint · unit · integration (all workspaces) |
| `develop` → `master` | `ci-release.yml` | lint · unit · integration · E2E (placeholder until M9) |
| push to `master` | `deploy-render.yml` | trigger Render deploy hooks |

---

## Milestone Overview

| Milestone | Goal | Issues | Outcome |
|---|---|---|---|
| **M0** | Base scaffold | — (done) | Monorepo with Backend, buyer-app, admin-app; Vitest suites green; health endpoint live |
| **M1** | CI pipelines | [#1](issues.md#issue-1--branch-setup--protection-rules) [#2](issues.md#issue-2--ci-featureyml-workflow) [#3](issues.md#issue-3--ci-releaseyml-workflow) [#4](issues.md#issue-4--ci-cleanup--environment-template) | Branch protection enforced; automated test gates on every PR; `.env.example` corrected |
| **M2** | Docker | [#5](issues.md#issue-5--backend-dockerfile) [#6](issues.md#issue-6--buyer-app-dockerfile) [#7](issues.md#issue-7--admin-app-dockerfile) [#8](issues.md#issue-8--docker-composeyml-local-dev--makefile) [#9](issues.md#issue-9--docker-composeprodyml--ci-integration) | One-command local stack; production images for CI |
| **M3** | Render deploy | [#10](issues.md#issue-10--renderyaml-iac) [#11](issues.md#issue-11--deploy-workflow) [#12](issues.md#issue-12--admin-account-seed-script) [#13](issues.md#issue-13--cors-configuration--staging-smoke-test) | Staging auto-deploys on every `master` merge; CORS configured |
| **M4** | Authentication | [#14](issues.md#issue-14--database-connection--core-auth-models) [#15](issues.md#issue-15--admin-auth-backend) [#16](issues.md#issue-16--admin-auth-frontend) [#17](issues.md#issue-17--buyer-auth-backend) [#18](issues.md#issue-18--buyer-auth-frontend) | Admin 2FA (password + OTP) and buyer passwordless (OTP / Google OAuth) |
| **M5** | Catalog | [#19](issues.md#issue-19--catalog-data-models) [#20](issues.md#issue-20--admin-catalog-api) [#21](issues.md#issue-21--r2-upload--buyer-catalog-api) [#22](issues.md#issue-22--catalog-admin-ui) [#23](issues.md#issue-23--catalog-buyer-ui) | Products and categories manageable by admin; browsable and searchable by buyers |
| **M6** | Commerce | [#24](issues.md#issue-24--cart-backend) [#25](issues.md#issue-25--cart-frontend) [#26](issues.md#issue-26--order-backend) [#27](issues.md#issue-27--razorpay-webhook-backend) [#28](issues.md#issue-28--checkout-frontend) | Persistent cart; Razorpay checkout; webhook-confirmed orders |
| **M7** | Order management | [#29](issues.md#issue-29--admin-orders-api) [#30](issues.md#issue-30--admin-customers-inventory--dashboard-api) [#31](issues.md#issue-31--admin-orders--customers-ui) [#32](issues.md#issue-32--admin-inventory--dashboard-ui) | Admin can fulfil, cancel, refund orders; inventory tracked; dashboard live |
| **M8** | Polish | [#33](issues.md#issue-33--static-pages) [#34](issues.md#issue-34--error-pages--accessibility) [#35](issues.md#issue-35--admin-settings) [#36](issues.md#issue-36--security-headers--rate-limiting) [#37](issues.md#issue-37--structured-logging) | Static pages; security headers; rate limiting; structured logging; a11y audit |
| **M9** | E2E tests | [#38](issues.md#issue-38--playwright-workspace-setup) [#39](issues.md#issue-39--admin-auth-e2e-specs) [#40](issues.md#issue-40--buyer-auth-e2e-specs) [#41](issues.md#issue-41--purchase-flow--product-publish-e2e-specs) [#42](issues.md#issue-42--e2e-ci-gate-activation) | 6 Playwright scenarios passing across 3 browsers; CI E2E gate activated |

---

## Detailed Milestones

### M0 — Base Scaffold *(complete)*

**Branch:** `master` (current state)

**Outcome:** Working monorepo with all three workspaces scaffolded, Vitest test suites passing, and `GET /health` returning `{ "status": "ok" }`.

**What's in place:**
- Backend: Express 5 + TypeScript + Mongoose (mocked `connectDB`) + Vitest + Supertest
- buyer-app: Next.js 16 App Router + React 19 + TanStack Query + Zustand + Vitest + RTL + MSW
- admin-app: Vite 8 + React 19 + RTK Query + Redux + react-router-dom 7 + Vitest + RTL + MSW
- Root ESLint flat config + Prettier + TypeScript base config
- GitHub Actions `ci.yml` running on all pushes

---

### M1 — CI Pipelines & Branch Protection

**Issues:** [#1](issues.md#issue-1--branch-setup--protection-rules) · [#2](issues.md#issue-2--ci-featureyml-workflow) · [#3](issues.md#issue-3--ci-releaseyml-workflow) · [#4](issues.md#issue-4--ci-cleanup--environment-template)
**Branches:** `feature/ci-branch-setup` · `feature/ci-feature-workflow` · `feature/ci-release-workflow` · `feature/ci-env-cleanup`

**Outcome:** Two targeted CI workflows replace the generic `ci.yml`. Branch protection on `develop` and `master` prevents direct pushes. The E2E job exists as a placeholder to hold the required status check slot from day one.

**Key deliverables:**
- `develop` branch + GitHub branch protection on `master` and `develop` (#1)
- `.github/workflows/ci-feature.yml` — lint + test matrix on PR → `develop` (#2)
- `.github/workflows/ci-release.yml` — lint + test + E2E placeholder on PR → `master` (#3)
- `ci.yml` retired; `.nvmrc` added; `deploy-render.yml` stub; `Backend/.env.example` corrected (PostgreSQL → MongoDB + full SRS §16.4 vars) (#4)

**Definition of done:** A test PR from `feature/smoke` → `develop` triggers only `ci-feature.yml` and passes. Direct push to `master` is rejected by GitHub.

---

### M2 — Docker & Local Dev Parity

**Issues:** [#5](issues.md#issue-5--backend-dockerfile) · [#6](issues.md#issue-6--buyer-app-dockerfile) · [#7](issues.md#issue-7--admin-app-dockerfile) · [#8](issues.md#issue-8--docker-composeyml-local-dev--makefile) · [#9](issues.md#issue-9--docker-composeprodyml--ci-integration)
**Branches:** `feature/docker-backend` · `feature/docker-buyer-app` · `feature/docker-admin-app` · `feature/docker-compose-dev` · `feature/docker-compose-prod`
**Depends on:** M1

**Outcome:** `make dev` brings up the full stack in a single command. Production images are built for CI.

**Key deliverables:**
- `Backend/Dockerfile` — multi-stage, non-root runner (#5)
- `buyer-app/Dockerfile` — Next.js standalone output (#6)
- `admin-app/Dockerfile` — nginx with SPA routing (#7)
- `docker-compose.yml` + `Makefile` — local dev stack (#8)
- `docker-compose.prod.yml` + `ci-release.yml` e2e job updated (#9)

**Definition of done:** `make dev` → all four containers healthy → `GET http://localhost:3000/health` returns `{ "status": "ok" }` within 30 seconds.

---

### M3 — Render Deployment (Staging)

**Issues:** [#10](issues.md#issue-10--renderyaml-iac) · [#11](issues.md#issue-11--deploy-workflow) · [#12](issues.md#issue-12--admin-account-seed-script) · [#13](issues.md#issue-13--cors-configuration--staging-smoke-test)
**Branches:** `feature/render-yaml` · `feature/render-deploy-workflow` · `feature/render-seed` · `feature/render-cors-staging`
**Depends on:** M2

**Outcome:** Every merge to `master` automatically deploys all three services to Render. CORS is configured. Staging environment is verified end-to-end.

**Key deliverables:**
- `render.yaml` IaC — all three services declared (#10)
- `deploy-render.yml` — curls Render deploy hooks on push to `master` (#11)
- `Backend/src/scripts/seed.ts` — idempotent admin account seeder (#12)
- CORS allowlist middleware + staging smoke test (#13)

**Definition of done:** Merge to `master` → `deploy-render.yml` runs → `GET <staging-backend>/health` returns `200` within 10 minutes. buyer-app and admin-app staging URLs load without CORS errors.

---

### M4 — Authentication

**Issues:** [#14](issues.md#issue-14--database-connection--core-auth-models) · [#15](issues.md#issue-15--admin-auth-backend) · [#16](issues.md#issue-16--admin-auth-frontend) · [#17](issues.md#issue-17--buyer-auth-backend) · [#18](issues.md#issue-18--buyer-auth-frontend)
**Branches:** `feature/db-connect-models` → `feature/auth-admin-backend` ∥ `feature/auth-buyer-backend` → respective frontend branches
**Depends on:** M3

**Outcome:** Admin dashboard secured behind password + OTP 2FA. Buyers log in via email OTP, Google OAuth, or Google One Tap. Both flows use RS256 JWTs with httpOnly cookie refresh tokens.

**Key deliverables:**
- Real `connectDB()` + `Admin`, `OtpSession`, `RefreshToken` models + Nodemailer SMTP (#14)
- Admin auth backend routes + rate limiting + account lockout (#15)
- admin-app RTK Query + Redux + route guard + login/OTP/forgot-password pages (#16)
- `User` model + buyer auth routes (email OTP, Google OAuth, One Tap, account linking) (#17)
- buyer-app TanStack Query + Zustand + login page (3 methods) + profile page (#18)

**Definition of done:** Full admin login flow (email → password → OTP → dashboard) and buyer OTP login flow work against staging.

---

### M5 — Catalog

**Issues:** [#19](issues.md#issue-19--catalog-data-models) · [#20](issues.md#issue-20--admin-catalog-api) · [#21](issues.md#issue-21--r2-upload--buyer-catalog-api) · [#22](issues.md#issue-22--catalog-admin-ui) · [#23](issues.md#issue-23--catalog-buyer-ui)
**Branches:** `feature/catalog-models` → `feature/catalog-admin-api` → `feature/catalog-upload-buyer-api` → `feature/catalog-admin-ui` ∥ `feature/catalog-buyer-ui`
**Depends on:** M4

**Outcome:** Admin can manage products and categories with R2 image uploads. Buyers can browse, search, and filter the catalog.

**Key deliverables:**
- `Category` + `Product` Mongoose models with plant attributes + text index (#19)
- Admin CRUD routes for categories + products (#20)
- R2 presign endpoint + buyer browse/search/filter routes (#21)
- admin-app catalog UI: categories page, products list, product form with drag-and-drop image uploader (#22)
- buyer-app `/shop` page + `/shop/[slug]` product detail (#23)

**Definition of done:** Admin creates a product with an image → product appears on buyer storefront at `/shop` and `/shop/[slug]` with all attributes visible.

---

### M6 — Commerce (Cart & Checkout)

**Issues:** [#24](issues.md#issue-24--cart-backend) · [#25](issues.md#issue-25--cart-frontend) · [#26](issues.md#issue-26--order-backend) · [#27](issues.md#issue-27--razorpay-webhook-backend) · [#28](issues.md#issue-28--checkout-frontend)
**Branches:** `feature/cart-backend` → `feature/cart-frontend` → `feature/order-backend` → `feature/webhook-backend` → `feature/checkout-frontend`
**Depends on:** M5

**Outcome:** Buyers maintain a persistent cart and complete purchases via Razorpay. Payment confirmed via webhook HMAC verification — backend is the source of truth, not the client.

**Key deliverables:**
- `Cart` model + `GET`/`PUT /api/buyer/cart` + stock validation (#24)
- buyer-app Zustand `cartStore` + cart drawer + header badge (#25)
- `Order` + `Payment` models + `POST /api/buyer/orders` (price snapshot, stock decrement, Razorpay order) (#26)
- `POST /api/webhooks/razorpay` — HMAC verify, idempotent processing, stock restore on failure (#27)
- buyer-app 3-step checkout + Razorpay popup + order confirmation (polling) + order history (#28)

**Definition of done:** Full purchase flow works end-to-end in staging: browse → cart → checkout → Razorpay test payment → order confirmed with `paymentStatus: paid`.

---

### M7 — Admin Order & Inventory Management

**Issues:** [#29](issues.md#issue-29--admin-orders-api) · [#30](issues.md#issue-30--admin-customers-inventory--dashboard-api) · [#31](issues.md#issue-31--admin-orders--customers-ui) · [#32](issues.md#issue-32--admin-inventory--dashboard-ui)
**Branches:** `feature/admin-orders-api` · `feature/admin-customers-inventory-api` · `feature/admin-orders-ui` · `feature/admin-inventory-dashboard-ui`
**Depends on:** M6

**Outcome:** Admin views all orders, advances status, cancels with Razorpay refund, adjusts inventory, and monitors store health via dashboard.

**Key deliverables:**
- Admin order list + status update (transition validation) + cancel/refund routes (#29)
- Admin customer list/history + stock update + dashboard aggregation (#30)
- admin-app orders list + order detail drawer + cancel modal + customers page (#31)
- admin-app inventory page (inline stock edit, low-stock highlight) + dashboard page (#32)

**Definition of done:** Admin places an order as a buyer in staging, views it in admin-app, advances status to `packed`, then cancels — Razorpay refund fires and stock is restored.

---

### M8 — Static Pages & Polish

**Issues:** [#33](issues.md#issue-33--static-pages) · [#34](issues.md#issue-34--error-pages--accessibility) · [#35](issues.md#issue-35--admin-settings) · [#36](issues.md#issue-36--security-headers--rate-limiting) · [#37](issues.md#issue-37--structured-logging)
**Branches:** `feature/static-pages` · `feature/error-a11y` · `feature/admin-settings` · `feature/security-headers` · `feature/logging`
**Depends on:** M7

**Outcome:** All legally required pages live. Security posture meets SRS §12. Structured logging active. WCAG 2.1 AA passed on storefront.

**Key deliverables:**
- buyer-app `/about`, `/shipping`, `/returns`, `/contact` + footer nav (#33)
- buyer-app custom 404/500 + loading skeletons + WCAG 2.1 AA a11y audit (#34)
- admin-app `/settings` page + `Settings` model + `PATCH /api/admin/settings` (#35)
- Backend `helmet` + `cors` allowlist + `express-rate-limit` (#36)
- Backend `pino` + `pino-http` structured JSON logging (#37)

**Definition of done:** Lighthouse a11y score on `/shop` ≥ 90. OTP endpoints return `429` on 4th request in 15 minutes. All four static pages in footer nav.

---

### M9 — E2E Test Suite

**Issues:** [#38](issues.md#issue-38--playwright-workspace-setup) · [#39](issues.md#issue-39--admin-auth-e2e-specs) · [#40](issues.md#issue-40--buyer-auth-e2e-specs) · [#41](issues.md#issue-41--purchase-flow--product-publish-e2e-specs) · [#42](issues.md#issue-42--e2e-ci-gate-activation)
**Branches:** `feature/e2e-setup` → `feature/e2e-admin-auth` ∥ `feature/e2e-buyer-auth` ∥ `feature/e2e-purchase-flow` → `feature/e2e-ci-gate`
**Depends on:** M8 (all features complete)

**Outcome:** 6 Playwright scenarios cover critical user journeys across 3 browsers. CI E2E gate activated — `develop → master` PRs with failing E2E are blocked.

**Key deliverables:**
- `e2e/` workspace: Playwright 1.60, 3-browser config, global setup/teardown, auth fixtures (#38)
- Admin auth specs: login (happy path, wrong password, invalid OTP) + forgot-password (#39)
- Buyer auth specs: email OTP (new + returning) + Google OAuth (new + account linking) (#40)
- Purchase flow spec + admin product-publish spec (#41)
- Replace `exit 0` placeholder with real Playwright run; artifact upload on failure (#42)

**Definition of done:** All 6 spec files pass in Chromium, Firefox, and WebKit on a clean CI run. A PR with a deliberately broken E2E test is blocked from merging.

---

## Dependency Graph

```
M0 (scaffold)
 └─ M1 (CI: #1 → #2 → #3 → #4)
     └─ M2 (Docker: #5 → #6 → #7 → #8 → #9)
         └─ M3 (Render: #10 → #11 → #12 → #13)
             └─ M4 (Auth: #14 → #15 ∥ #17 → #16 ∥ #18)
                 └─ M5 (Catalog: #19 → #20 → #21 → #22 ∥ #23)
                     └─ M6 (Commerce: #24 → #25 → #26 → #27 → #28)
                         └─ M7 (Orders: #29 ∥ #30 → #31 ∥ #32)
                             └─ M8 (Polish: #33 ∥ #34 ∥ #35 ∥ #36 ∥ #37)
                                 └─ M9 (E2E: #38 → #39 ∥ #40 ∥ #41 → #42)
```

Parallel branches within a milestone (`∥`) can be developed simultaneously after the listed prerequisite merges to `develop`.
