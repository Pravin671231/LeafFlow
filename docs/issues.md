# LeafFlow — GitHub Issue Decomposition

Each issue maps to one feature branch. Open one GitHub issue per entry and track it against the corresponding milestone in `milestone.md`.

Branch flow: `feature/<scope>` → `develop` → `master`

---

## Issue #1 — Branch Setup & Protection Rules

**Branch:** `feature/ci-branch-setup` | **Milestone:** M1 | **Labels:** `infra`, `ci`

### Context

The repo currently only has `master`. The intended branch strategy (`feature/* → develop → master`) requires a `develop` integration branch and branch protection rules on both. Without protection, developers can push directly to `master` or `develop`, bypassing all quality gates. This issue creates the `develop` branch and configures both sets of rules in GitHub repo settings.

### Tasks

- [ ] Create `develop` branch from current `master` HEAD
- [ ] Configure branch protection on `master`: require PR, require `ci-release` status check, no direct push, require linear history, dismiss stale reviews on new commits
- [ ] Configure branch protection on `develop`: require PR, require `ci-feature` status check, no direct push
- [ ] Verify both rules by attempting a direct push to each branch (should be rejected)

### Acceptance Criteria

- [ ] `git push origin master` from a local branch is rejected with "protected branch" error
- [ ] `git push origin develop` from a local branch is rejected with "protected branch" error
- [ ] A PR from `feature/smoke` → `develop` shows `ci-feature` as a required status check
- [ ] A PR from `develop` → `master` shows `ci-release` as a required status check

---

## Issue #2 — `ci-feature.yml` Workflow

**Branch:** `feature/ci-feature-workflow` | **Milestone:** M1 | **Labels:** `infra`, `ci`

### Context

There is no workflow targeting the `develop` branch. This issue creates `ci-feature.yml` — triggered when a PR targets `develop` — running lint and the full test matrix (all three workspaces with coverage). Coverage reports are uploaded to Codecov so trends are visible per PR.

SRS refs: §8.1 (testing layers), §8.5 (coverage thresholds).

### Tasks

- [ ] Create `.github/workflows/ci-feature.yml`:
  - Trigger: `pull_request` with `branches: [develop]`
  - `concurrency` group to cancel in-progress runs for the same PR
  - `permissions: contents: read`
- [ ] Add `lint` job: checkout, `setup-node` (from `.nvmrc`), `npm ci`, `npm run lint`
- [ ] Add `test` matrix job: three entries — `backend` (coverage dir: `Backend`), `buyer-app`, `admin-app`; each runs `npm run test:coverage --workspace=<ws>` and uploads via `codecov/codecov-action@v4`
- [ ] Lint and test jobs run in parallel (no `needs:` between them)

### Acceptance Criteria

- [ ] Opening a PR from `feature/*` → `develop` triggers `ci-feature.yml` and only `ci-feature.yml`
- [ ] All three workspace coverage reports appear in Codecov linked to the PR
- [ ] A deliberate lint error in a PR causes the `lint` job to fail and blocks merge
- [ ] `node-version-file: .nvmrc` is used in `setup-node` (not a hard-coded version)

---

## Issue #3 — `ci-release.yml` Workflow

**Branch:** `feature/ci-release-workflow` | **Milestone:** M1 | **Labels:** `infra`, `ci`

### Context

When `develop` merges to `master` a stricter gate is needed: everything in `ci-feature.yml` plus an E2E job slot. The E2E job exits 0 as a placeholder — it must exist as a named required status check from day one so that activating the real Playwright run in M9 only requires updating the job body, not the branch protection config.

SRS refs: §8.4 (E2E strategy), §3.1 (branch strategy).

### Tasks

- [ ] Create `.github/workflows/ci-release.yml`:
  - Trigger: `pull_request` with `branches: [master]`
  - `concurrency` group; `permissions: contents: read`
- [ ] Copy lint + test matrix jobs from `ci-feature.yml` (identical config)
- [ ] Add `e2e` job that `needs: [test]` and runs a placeholder:
  ```yaml
  e2e:
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - run: echo "E2E placeholder — activated in Issue #42"
  ```
- [ ] Update `master` branch protection (Issue #1) to require `e2e` as a passing status check

### Acceptance Criteria

- [ ] Opening a PR from `develop` → `master` triggers `ci-release.yml` and only `ci-release.yml`
- [ ] `e2e` job shows green without running any real tests
- [ ] `ci-feature.yml` does NOT trigger on a `develop → master` PR
- [ ] `master` branch protection requires `e2e`; a PR where `e2e` is skipped cannot merge

---

## Issue #4 — CI Cleanup & Environment Template

**Branch:** `feature/ci-env-cleanup` | **Milestone:** M1 | **Labels:** `infra`, `ci`

### Context

The legacy `ci.yml` fires on every push and will conflict with the new targeted workflows. Retiring it, adding `.nvmrc`, stubbing `deploy-render.yml`, and correcting `Backend/.env.example` (which has PostgreSQL placeholders from the initial scaffold) are all bundled here as repo hygiene.

SRS refs: §16.4 (full environment variable reference).

### Tasks

- [ ] Delete `.github/workflows/ci.yml`
- [ ] Create `.nvmrc` at repo root containing `24`
- [ ] Create `.github/workflows/deploy-render.yml` stub (trigger: push to `master`; single step: `echo "Render deploy — activated in Issue #11"`)
- [ ] Rewrite `Backend/.env.example` — remove `DATABASE_URL`; add all SRS §16.4 vars: `PORT`, `NODE_ENV`, `MONGODB_URI`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRES_IN`, `GOOGLE_CLIENT_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `ADMIN_LOGIN_EMAIL`, `ADMIN_OTP_EMAIL`, `ADMIN_PASSWORD`, `CORS_ORIGIN`, `LOG_LEVEL`

### Acceptance Criteria

- [ ] Pushing a commit to a feature branch after this merge no longer triggers the old `ci.yml`
- [ ] `.nvmrc` contains `24`; both new CI workflows use `node-version-file: .nvmrc`
- [ ] `Backend/.env.example` contains `MONGODB_URI` and no `DATABASE_URL`
- [ ] `Backend/.env.example` contains all 26 variables from SRS §16.4 with placeholder (non-secret) values
- [ ] `deploy-render.yml` appears in GitHub Actions UI and triggers on push to `master`

---

## Issue #5 — Backend Dockerfile

**Branch:** `feature/docker-backend` | **Milestone:** M2 | **Labels:** `infra`, `docker`

### Context

Without a Dockerfile, the backend can only run locally with `tsx watch`. A multi-stage Dockerfile compiles TypeScript in the builder stage and copies only the compiled output + production `node_modules` to the runner stage, running as a non-root user for security.

SRS refs: §2.4, §12 (non-root process).

### Tasks

- [ ] Create `Backend/Dockerfile` — two stages:
  - `builder`: `node:24-alpine`, `WORKDIR /app`, copy workspace `package*.json` files, `npm ci`, copy `Backend/src` + `tsconfig.json`, run `npx tsc`
  - `runner`: `node:24-alpine`, copy `dist/` and `node_modules/` from builder, create non-root user (`adduser -D appuser`), `USER appuser`, `EXPOSE 3000`, `CMD ["node", "dist/index.js"]`
- [ ] Add `Backend/.dockerignore`: exclude `node_modules`, `dist`, `*.env`, `coverage`, `__tests__`
- [ ] Add `HEALTHCHECK` instruction: `CMD wget -qO- http://localhost:3000/health || exit 1` with `--interval=30s --timeout=10s --start-period=10s`
- [ ] Verify the build from repo root: `docker build -f Backend/Dockerfile .`

### Acceptance Criteria

- [ ] `docker build -f Backend/Dockerfile .` completes without errors
- [ ] Running the image with `MONGODB_URI` set: `GET /health` returns `{ "status": "ok" }` on port 3000
- [ ] The running process inside the container is not root (`docker exec <id> whoami` returns `appuser`)
- [ ] Final image size is under 300 MB (multi-stage removes dev deps and TypeScript source)
- [ ] `HEALTHCHECK` passes within 30 seconds of container start

---

## Issue #6 — buyer-app Dockerfile

**Branch:** `feature/docker-buyer-app` | **Milestone:** M2 | **Labels:** `infra`, `docker`

### Context

Next.js with `output: 'standalone'` produces a self-contained `server.js` — no full `node_modules` needed at runtime. The runner stage copies only this bundle plus static assets, keeping the image small.

SRS refs: §2.4, §7 (Next.js 16).

### Tasks

- [ ] Enable `output: 'standalone'` in `buyer-app/next.config.ts`
- [ ] Create `buyer-app/Dockerfile` — three stages:
  - `deps`: `node:24-alpine`, install production deps
  - `builder`: copy `node_modules` from deps, copy source, run `npm run build`
  - `runner`: `node:24-alpine`, copy `.next/standalone`, `.next/static` → `standalone/.next/static`, `public/` → `standalone/public`, non-root user, `EXPOSE 3000`, `CMD ["node", "server.js"]`
- [ ] Add `buyer-app/.dockerignore`: exclude `node_modules`, `.next`, `coverage`
- [ ] Set `ENV NODE_ENV=production` in runner stage

### Acceptance Criteria

- [ ] `docker build -f buyer-app/Dockerfile .` from repo root completes without errors
- [ ] `GET http://localhost:3001/` (port-mapped from container 3000) returns HTTP `200`
- [ ] The runner image does NOT contain `node_modules` at the root (standalone bundle only)
- [ ] `NODE_ENV` inside the container is `production`

---

## Issue #7 — admin-app Dockerfile

**Branch:** `feature/docker-admin-app` | **Milestone:** M2 | **Labels:** `infra`, `docker`

### Context

The admin-app is a Vite SPA — after build it is a static `dist/` folder. nginx serves it in the runner stage. A custom nginx config ensures all routes return `index.html` for client-side routing; without this, refreshing any non-root URL returns a 404 from nginx.

SRS refs: §2.4, §7 (Vite SPA).

### Tasks

- [ ] Create `admin-app/nginx.conf`:
  ```nginx
  server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
  }
  ```
- [ ] Create `admin-app/Dockerfile` — two stages:
  - `builder`: `node:24-alpine`, install deps, run `npm run build` (vite build)
  - `runner`: `nginx:alpine`, copy `dist/` to `/usr/share/nginx/html`, copy `nginx.conf` to `/etc/nginx/conf.d/default.conf`, `EXPOSE 80`
- [ ] Add `admin-app/.dockerignore`: exclude `node_modules`, `dist`, `coverage`

### Acceptance Criteria

- [ ] `docker build -f admin-app/Dockerfile .` completes without errors
- [ ] `GET http://localhost:5173/` (port-mapped from container 80) returns HTTP `200` with `index.html`
- [ ] `GET http://localhost:5173/products` returns `200` with `index.html` (SPA routing works in nginx)
- [ ] `GET http://localhost:5173/nonexistent` also returns `index.html` (not a 404 from nginx)

---

## Issue #8 — docker-compose.yml (Local Dev) + Makefile

**Branch:** `feature/docker-compose-dev` | **Milestone:** M2 | **Labels:** `infra`, `docker`

### Context

Individual Dockerfiles still require starting four containers manually. `docker-compose.yml` orchestrates the full local dev stack: MongoDB, Backend (hot-reload), buyer-app (`next dev`), and admin-app (`vite --host`). The `Makefile` provides human-friendly shortcuts.

SRS refs: §2.4.

### Tasks

- [ ] Create `docker-compose.yml` at repo root:
  - `mongo`: `mongo:8.0`, named volume `mongo_data`, health check (`mongosh --eval "db.adminCommand('ping')"`)
  - `backend`: build `./Backend`, bind-mount `./Backend/src:/app/src`, command `npx tsx watch src/index.ts`, `env_file: ./Backend/.env`, `depends_on: { mongo: { condition: service_healthy } }`, port `3000:3000`
  - `buyer-app`: build `./buyer-app`, bind-mount `./buyer-app/src:/app/src` and `./buyer-app/app:/app/app`, command `npx next dev`, port `3001:3000`
  - `admin-app`: build `./admin-app`, bind-mount `./admin-app/src:/app/src`, command `npx vite --host`, port `5173:5173`
  - Network: `leafflow-net` (bridge)
- [ ] Create `Makefile` at repo root: `dev` → `docker compose up`; `down` → `docker compose down -v`; `logs` → `docker compose logs -f`; `ps` → `docker compose ps`

### Acceptance Criteria

- [ ] `make dev` starts all four containers without errors
- [ ] `GET http://localhost:3000/health` returns `{ "status": "ok" }` within 30 seconds
- [ ] `http://localhost:3001` loads without a connection error
- [ ] `http://localhost:5173` loads the admin-app shell
- [ ] Editing `Backend/src/index.ts` while running triggers a `tsx watch` restart (visible in logs)
- [ ] `make down` removes all containers and the `mongo_data` volume

---

## Issue #9 — docker-compose.prod.yml + CI Integration

**Branch:** `feature/docker-compose-prod` | **Milestone:** M2 | **Labels:** `infra`, `docker`, `ci`

### Context

The dev compose file uses bind mounts and hot-reload commands — unsuitable for CI or staging. `docker-compose.prod.yml` builds final images with no bind mounts. The `ci-release.yml` E2E job is updated to spin up this prod stack so E2E tests (M9) have a realistic environment.

SRS refs: §8.4 (E2E against real stack).

### Tasks

- [ ] Create `docker-compose.prod.yml`:
  - `mongo`: same image + volume as dev
  - `backend`: build `./Backend`, no bind mounts, `command: node dist/index.js`, same ports + env + depends_on
  - `buyer-app`: build `./buyer-app`, no bind mounts, `command: node server.js`, port `3001:3000`
  - `admin-app`: build `./admin-app`, no bind mounts (nginx serves static), port `5173:80`
- [ ] Add `prod` Makefile target: `docker compose -f docker-compose.prod.yml up --build -d`
- [ ] Update `ci-release.yml` E2E job: add `docker compose -f docker-compose.prod.yml up -d --build` before the placeholder echo; add `docker compose down -v` in a cleanup step (`if: always()`)

### Acceptance Criteria

- [ ] `make prod` builds all production images and starts containers without errors
- [ ] `GET http://localhost:3000/health` returns `{ "status": "ok" }` within 60 seconds of `make prod`
- [ ] `http://localhost:3001` returns HTTP `200` (buyer-app built and served)
- [ ] `http://localhost:5173` returns HTTP `200` (nginx serving `dist/`)
- [ ] `ci-release.yml` E2E job still passes (exits 0) after the docker compose steps
- [ ] `docker compose -f docker-compose.prod.yml down -v` cleans up all containers and volumes

---

## Issue #10 — render.yaml IaC

**Branch:** `feature/render-yaml` | **Milestone:** M3 | **Labels:** `infra`, `deployment`

### Context

Declaring services in `render.yaml` makes deployments reproducible and reviewable — new environments can be created by importing the file rather than clicking through the dashboard.

SRS refs: §2.4, §16.4.

### Tasks

- [ ] Create `render.yaml` at repo root with a `services` array:
  - `backend`: type `web`, runtime `docker`, `dockerfilePath: ./Backend/Dockerfile`, envVars reference group `leafflow-backend`, `healthCheckPath: /health`
  - `buyer-app`: type `web`, runtime `docker`, `dockerfilePath: ./buyer-app/Dockerfile`, envVars reference group `leafflow-buyer`
  - `admin-app`: type `web`, runtime `static`, `buildCommand: npm run build --workspace admin-app`, `staticPublishPath: ./admin-app/dist`, envVars reference group `leafflow-admin`, routes: `[{ type: rewrite, source: /*, destination: /index.html }]`
- [ ] Create Render environment groups in the Render dashboard (not in code): `leafflow-backend`, `leafflow-buyer`, `leafflow-admin` with all SRS §16.4 vars
- [ ] Validate `render.yaml` via Render dashboard import or `render validate` CLI

### Acceptance Criteria

- [ ] `render.yaml` imports into Render dashboard without validation errors
- [ ] All three services appear in the Render dashboard after import
- [ ] `backend` service has health check configured at `/health`
- [ ] `admin-app` static site has a rewrite rule returning `index.html` for all paths

---

## Issue #11 — Deploy Workflow

**Branch:** `feature/render-deploy-workflow` | **Milestone:** M3 | **Labels:** `infra`, `deployment`, `ci`

### Context

After merge to `master`, all three Render services must redeploy automatically. Render provides per-service deploy hook URLs; curling a hook triggers a redeploy. Hooks are stored as GitHub secrets so they never appear in code. This issue completes the `deploy-render.yml` stub from Issue #4.

SRS refs: §2.4.

### Tasks

- [ ] Update `.github/workflows/deploy-render.yml` (the stub from Issue #4):
  - Trigger: `push` to `master`
  - Job `deploy` with three steps curling Render hooks with `--fail`:
    - `curl --fail -X POST ${{ secrets.RENDER_DEPLOY_BACKEND }}`
    - `curl --fail -X POST ${{ secrets.RENDER_DEPLOY_BUYER }}`
    - `curl --fail -X POST ${{ secrets.RENDER_DEPLOY_ADMIN }}`
  - Guard: `if: github.ref == 'refs/heads/master'`
- [ ] Document in PR: add `RENDER_DEPLOY_BACKEND`, `RENDER_DEPLOY_BUYER`, `RENDER_DEPLOY_ADMIN` as GitHub Actions secrets (values from Render dashboard → Settings → Deploy Hook)

### Acceptance Criteria

- [ ] Merging to `master` triggers `deploy-render.yml`; all three curl steps complete with HTTP 200
- [ ] Backend Render service begins redeploying within 30 seconds of the workflow run
- [ ] `deploy-render.yml` does NOT trigger on pushes to branches other than `master`
- [ ] Workflow fails if any curl step returns a non-200 status (`--fail` flag active)

---

## Issue #12 — Admin Account Seed Script

**Branch:** `feature/render-seed` | **Milestone:** M3 | **Labels:** `infra`, `backend`

### Context

On first deploy there is no admin account in MongoDB — the seller cannot log in. A seed script creates the admin idempotently: running it twice does not create duplicates or throw errors. It is called on first deploy via a Render start command.

SRS refs: §10.1 (Admin model fields), §15.1.

### Tasks

- [ ] Create `Backend/src/scripts/seed.ts`:
  - Connect via `connectDB()`
  - Check if `Admin` exists with `loginEmail === process.env.ADMIN_LOGIN_EMAIL`
  - If not found: hash `ADMIN_PASSWORD` (bcrypt cost 12), create `Admin` document
  - If found: log "Admin already exists, skipping" and exit 0
  - Disconnect and exit
- [ ] Add `"seed": "npx tsx src/scripts/seed.ts"` to `Backend/package.json` scripts
- [ ] Update `render.yaml` backend service: add startup command that runs seed then starts the server
- [ ] Exit non-zero if required env vars (`MONGODB_URI`, `ADMIN_LOGIN_EMAIL`, `ADMIN_PASSWORD`) are missing

### Acceptance Criteria

- [ ] `npm run seed --workspace backend` creates an `Admin` document in MongoDB with a bcrypt hash (starts with `$2b$12$`)
- [ ] Running seed a second time outputs "Admin already exists" and exits 0 — no duplicate created
- [ ] `ADMIN_PASSWORD` is NOT stored as plain text in MongoDB
- [ ] Script exits non-zero if `MONGODB_URI` is missing
- [ ] Seeded admin can complete the login flow against the backend

---

## Issue #13 — CORS Configuration & Staging Smoke Test

**Branch:** `feature/render-cors-staging` | **Milestone:** M3 | **Labels:** `infra`, `deployment`

### Context

The backend must only accept cross-origin requests from the two frontend Render URLs. `CORS_ORIGIN` is a comma-separated env var — no code change needed when URLs change. This issue also verifies the complete staging deployment is functional.

SRS refs: §12 (SEC-03 — CORS allowlist), §16.4.

### Tasks

- [ ] Install `cors` npm package in `Backend`
- [ ] Add `cors` middleware to `Backend/src/app.ts` as the first route middleware:
  - Split `CORS_ORIGIN` on `,`, trim whitespace
  - `cors({ origin: [...origins], credentials: true })`
- [ ] Set `CORS_ORIGIN` in `leafflow-backend` Render env group to `<buyer-app-url>,<admin-app-url>`
- [ ] Verify `CORS_ORIGIN` placeholder is in `Backend/.env.example`

### Acceptance Criteria

- [ ] `GET /api/buyer/products` from the buyer-app Render origin receives `Access-Control-Allow-Origin` header matching that origin
- [ ] Same request with `Origin: https://evil.com` does NOT receive `Access-Control-Allow-Origin: https://evil.com`
- [ ] `OPTIONS` preflight request returns `200` with correct `Access-Control-Allow-*` headers
- [ ] `GET <backend-render-url>/health` returns `{ "status": "ok" }`
- [ ] buyer-app and admin-app staging URLs load without CORS errors in browser DevTools

---

## Issue #14 — Database Connection & Core Auth Models

**Branch:** `feature/db-connect-models` | **Milestone:** M4 | **Labels:** `feature`, `backend`

### Context

The backend currently uses a mock `connectDB()`. Before any feature can write real data, this must be replaced with a real Mongoose connection with retry logic. Three models are needed across auth features: `Admin`, `OtpSession` (TTL-indexed, auto-expires), and `RefreshToken`. The Nodemailer SMTP service is set up here since both admin and buyer auth need OTP delivery.

SRS refs: §10.1–10.3, §15.1.5, §16.4.

### Tasks

- [ ] Replace mock `connectDB()` in `Backend/src/index.ts`: `mongoose.connect(MONGODB_URI)` in a retry loop (max 5 attempts, 2-second backoff); log success; exit on final failure
- [ ] Create `Backend/src/models/Admin.ts` — fields: `loginEmail` (unique), `passwordHash`, `otpDeliveryEmail`, `failedLoginAttempts` (default 0), `lockUntil` (Date, optional); timestamps
- [ ] Create `Backend/src/models/OtpSession.ts` — fields: `purpose` (enum: `admin_login`, `admin_forgot`, `admin_reset`, `buyer_login`), `identifier`, `otpHash`, `expiresAt` (TTL index 5 min), `attemptCount` (default 0)
- [ ] Create `Backend/src/models/RefreshToken.ts` — fields: `tokenHash`, `userId` or `adminId`, `role` (enum: `admin`, `buyer`), `expiresAt`, `revokedAt` (optional); index on `tokenHash`
- [ ] Create `Backend/src/services/email.ts` — Nodemailer transporter using `SMTP_*` env vars; export `sendOtpEmail(to: string, otp: string)` using template from SRS §15.1.5

### Acceptance Criteria

- [ ] With valid `MONGODB_URI`, backend logs "MongoDB connected" on startup
- [ ] With invalid `MONGODB_URI`, backend retries 5 times then exits with non-zero code
- [ ] `Admin.create({...})` with a duplicate `loginEmail` throws a duplicate key error
- [ ] An `OtpSession` document auto-disappears from the collection 5 minutes after `expiresAt` (TTL index active)
- [ ] `sendOtpEmail()` delivers an email in test environment (Ethereal/Mailtrap SMTP)

---

## Issue #15 — Admin Auth Backend

**Branch:** `feature/auth-admin-backend` | **Milestone:** M4 | **Labels:** `feature`, `backend`, `auth`

### Context

Admin authentication is two-factor: login email + password first, then a 6-digit OTP sent to a separate delivery email. An attacker with the login credentials still cannot access the dashboard without the OTP inbox. All admin routes are JWT-protected. Rate limiting and account lockout prevent brute-force.

SRS refs: §5.1 (ADM-001–004), §11.2, §12 (SEC-01–12), §15.1.

### Tasks

- [ ] Generate RS256 key pair; document `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` (base64 PEM) in `Backend/.env.example`
- [ ] Create `Backend/src/middleware/adminAuth.ts` — verify RS256 JWT, attach `req.admin`; return `401` if missing/expired/invalid
- [ ] Create `Backend/src/routes/admin/auth.ts` with all routes:
  - `POST /api/admin/auth/login` — bcrypt verify, check lockout, create `OtpSession`, `sendOtpEmail`, return `{ otpSessionId, expiresInSeconds: 300 }`
  - `POST /api/admin/auth/login/verify-otp` — verify hash (max 5 attempts), issue RS256 access JWT (15 min) + hashed refresh token (httpOnly cookie, 7 days)
  - `POST /api/admin/auth/refresh`, `POST /api/admin/auth/logout`, `GET /api/admin/auth/me`
  - `POST /api/admin/auth/forgot-password/send-otp` + `/reset`
  - `POST /api/admin/auth/reset-password/send-otp` + `/confirm` (requires valid JWT)
- [ ] Apply `express-rate-limit`: 3 OTP sends / 15 min per `loginEmail`; 5 failed logins → `lockUntil = now + 15min`
- [ ] Zod schemas for all bodies in `Backend/src/schemas/auth.ts`
- [ ] Integration tests in `Backend/__tests__/admin-auth.test.ts` — happy path, wrong password, locked account, expired OTP, refresh, logout, forgot-password

### Acceptance Criteria

- [ ] `POST /api/admin/auth/login` with correct credentials returns `200` + `otpSessionId`; wrong password returns `401` with `{ code: "INVALID_CREDENTIALS" }`
- [ ] After 5 failed logins, next attempt returns `403` with `{ code: "ACCOUNT_LOCKED" }`
- [ ] Correct OTP returns `200`, sets `refreshToken` httpOnly cookie, returns `accessToken` in body
- [ ] OTP after 5 minutes returns `401` with `{ code: "OTP_EXPIRED" }`
- [ ] `GET /api/admin/auth/me` valid JWT → `200`; expired JWT → `401`
- [ ] Logout + subsequent refresh → `401`
- [ ] No plain OTP or plain refresh token stored in MongoDB
- [ ] Auth integration test coverage ≥ 90% (SRS §8.5)

---

## Issue #16 — Admin Auth Frontend

**Branch:** `feature/auth-admin-frontend` | **Milestone:** M4 | **Labels:** `feature`, `admin-app`, `auth`

### Context

With the admin auth backend in place, the admin-app needs a complete auth UI: login, OTP verification, forgot-password, and a route guard. RTK Query handles API calls; Redux stores auth state in memory (not localStorage) to reduce XSS risk.

SRS refs: §5.1 (ADM-001–004), §15.1.

### Tasks

- [ ] Create RTK Query `authApi` slice (`src/store/authApi.ts`) with endpoints: `login`, `verifyOtp`, `forgotPasswordSendOtp`, `forgotPasswordReset`, `resetPasswordSendOtp`, `resetPasswordConfirm`, `refresh`, `logout`, `me`
- [ ] Create Redux `authSlice` — state: `admin | null`, `isAuthenticated`, `accessToken`; actions: `setCredentials`, `clearCredentials`
- [ ] Create `RequireAuth` guard component — reads `isAuthenticated`; redirects to `/login` if false; renders `<Outlet />` if true; wraps all protected routes in `App.tsx`
- [ ] Build `/login` page — email + password form; on success navigate to `/login/verify-otp`
- [ ] Build `/login/verify-otp` page — 6-digit OTP input, resend button (60-second cooldown), 5-minute expiry countdown; on success navigate to `/dashboard`
- [ ] Build `/forgot-password` page — three-step flow: enter loginEmail → OTP → new password + confirm; on success navigate to `/login`

### Acceptance Criteria

- [ ] Navigating to `/dashboard` while unauthenticated redirects to `/login`
- [ ] Full login flow (email → password → OTP → dashboard) completes without errors on staging backend
- [ ] Wrong password shows inline error "Invalid credentials" without leaving the login page
- [ ] OTP resend button disabled for 60 seconds after sending; re-enables and allows resend
- [ ] After logout, navigating to `/dashboard` redirects to `/login`
- [ ] `RequireAuth` unit test: renders `<Outlet />` when authenticated; redirects when not

---

## Issue #17 — Buyer Auth Backend

**Branch:** `feature/auth-buyer-backend` | **Milestone:** M4 | **Labels:** `feature`, `backend`, `auth`

### Context

Buyers authenticate without passwords via email OTP, Google OAuth redirect, or Google One Tap. Account linking ensures a buyer who first used email OTP and later signs in via Google (same email) gets one account — `googleId` is added to the existing document. Admin JWTs are explicitly rejected on buyer routes.

SRS refs: §4.1 (BUY-001–006), §10.4, §11.3, §15.2.

### Tasks

- [ ] Create `Backend/src/models/User.ts` — fields: `email` (unique), `googleId` (sparse unique), `name`, `phone`, `addresses` (array per SRS §10.4), `isVerified` (boolean); timestamps
- [ ] Create `Backend/src/middleware/buyerAuth.ts` — RS256 JWT verify, attach `req.user`; reject tokens with `role === "admin"` with `403`
- [ ] Create `Backend/src/routes/buyer/auth.ts`:
  - `POST /api/buyer/auth/email/send-otp` — find-or-create `User`, create `OtpSession`, send OTP
  - `POST /api/buyer/auth/email/verify-otp` — verify OTP, set `isVerified: true`, issue tokens
  - `GET /api/buyer/auth/google` — redirect to Google OAuth consent URL (scopes: `email profile`)
  - `GET /api/buyer/auth/google/callback` — exchange code, verify via `google-auth-library`, find-or-create, link `googleId`, issue tokens
  - `POST /api/buyer/auth/google/one-tap` — verify `credential` JWT, find-or-create, link `googleId`, issue tokens
  - `POST /api/buyer/auth/refresh`, `POST /api/buyer/auth/logout`, `GET /api/buyer/auth/me`
- [ ] Integration tests in `Backend/__tests__/buyer-auth.test.ts` — OTP flow, One Tap (MSW mock), account linking

### Acceptance Criteria

- [ ] `POST /api/buyer/auth/email/send-otp` with new email creates `User` with `isVerified: false`, returns `200`
- [ ] After OTP verify, `User.isVerified` is `true`; tokens issued
- [ ] One Tap with valid (MSW-mocked) Google credential returns `200` and tokens
- [ ] One Tap with Google email matching existing OTP buyer merges `googleId` — only one `User` document
- [ ] Admin JWT sent to `GET /api/buyer/auth/me` returns `403`
- [ ] Buyer JWT sent to `GET /api/admin/auth/me` returns `401`

---

## Issue #18 — Buyer Auth Frontend

**Branch:** `feature/auth-buyer-frontend` | **Milestone:** M4 | **Labels:** `feature`, `buyer-app`, `auth`

### Context

The buyer login page offers three auth methods on a single screen. Zustand stores auth state for fast reads. After login, buyers are redirected to the page they were trying to access. Profile management (personal info + addresses) is included here.

SRS refs: §4.1 (BUY-001–006), §15.2.

### Tasks

- [ ] Create TanStack Query hooks: `useSendOtp`, `useVerifyOtp`, `useGoogleOneTap`, `useLogout`, `useMe`
- [ ] Create Zustand `authStore` — state: `user`, `isAuthenticated`, `accessToken`; actions: `setAuth`, `clearAuth`
- [ ] Build login page (`src/app/login/page.tsx`):
  - Email input + "Send OTP" button
  - Google OAuth button (`href="/api/buyer/auth/google"`)
  - Google One Tap (`<Script>` loading GSI client; callback calls `useGoogleOneTap`)
  - After OTP send: inline OTP input + "Verify" button + resend link with cooldown
- [ ] Create `useRequireAuth` hook — redirects to `/login?next=<currentPath>` if not authenticated; apply to `/checkout`, `/orders`, `/profile`
- [ ] Build profile page (`src/app/profile/page.tsx`) — view/edit name + phone; address list with add/edit/delete/set-default

### Acceptance Criteria

- [ ] Login page displays all three auth methods (OTP form, Google OAuth button, One Tap prompt)
- [ ] After OTP login, buyer is redirected to the `?next=` URL or `/` if none
- [ ] Accessing `/checkout` without login redirects to `/login?next=/checkout`
- [ ] Profile page displays current user's name and saved addresses; adding an address reflects on next render
- [ ] After logout, `isAuthenticated` is false; protected routes redirect to login

---

## Issue #19 — Catalog Data Models

**Branch:** `feature/catalog-models` | **Milestone:** M5 | **Labels:** `feature`, `backend`

### Context

`Category` and `Product` are the core data layer for catalog features. Products have plant-specific attributes (light requirement, water schedule, humidity, pet-friendliness, pot size, height) that differentiate LeafFlow from a generic e-commerce schema. Text indexing on name fields enables full-text search.

SRS refs: §10.5 (Category), §10.6 (Product).

### Tasks

- [ ] Create `Backend/src/models/Category.ts` — fields: `name`, `slug` (unique), `description`, `imageUrl`, `isActive` (default true); timestamps
- [ ] Create `Backend/src/models/Product.ts` — fields: `name`, `commonName`, `scientificName`, `slug` (unique), `description`, `categoryId` (ref: Category), `price`, `compareAtPrice` (optional), `stock` (default 0), `lowStockThreshold` (default 5), `images` (string[]), `lightRequirement` (enum: low/medium/high/indirect), `waterSchedule` (enum: daily/every-2-days/weekly/bi-weekly), `humidity` (enum: low/medium/high), `petFriendly` (Boolean), `potSize`, `heightRange`, `careInstructions`, `isActive` (default true); timestamps
- [ ] Add compound text index on Product: `{ name: "text", commonName: "text", scientificName: "text" }`
- [ ] Add indexes: `Product.categoryId`, `Product.isActive` + `Product.stock`
- [ ] Write model validation unit tests: required fields, slug uniqueness, enum constraints

### Acceptance Criteria

- [ ] `Category.create({ name: "Succulents", slug: "succulents" })` persists to MongoDB
- [ ] Creating two categories with the same `slug` throws a duplicate key error
- [ ] `Product.create({...})` with `lightRequirement: "invalid"` fails Mongoose validation
- [ ] `Product.find({ $text: { $search: "fern" } })` returns products matching name/commonName/scientificName
- [ ] `Product.find({ isActive: true, stock: { $gt: 0 } })` uses the compound index (verified via `explain()`)

---

## Issue #20 — Admin Catalog API

**Branch:** `feature/catalog-admin-api` | **Milestone:** M5 | **Labels:** `feature`, `backend`

### Context

The admin must be able to create, edit, soft-delete, and list categories and products via the API. Soft delete (`isActive: false`) is used when associated data exists — hard deleting would break order history references. All admin catalog routes require a valid admin JWT.

SRS refs: §5.3 (ADM-020–022), §11.4.

### Tasks

- [ ] Create `Backend/src/routes/admin/categories.ts`:
  - `GET /api/admin/categories` — list all (including inactive), sorted by name
  - `POST /api/admin/categories` — create; auto-generate `slug` from `name` using `slugify`
  - `PATCH /api/admin/categories/:id` — update any field
  - `DELETE /api/admin/categories/:id` — soft delete if products exist; hard delete if empty
- [ ] Create `Backend/src/routes/admin/products.ts`:
  - `GET /api/admin/products` — paginated (default 20); filter by `categoryId`, `isActive`; search `q`
  - `POST /api/admin/products` — create; auto-generate `slug`
  - `PATCH /api/admin/products/:id` — partial update
  - `DELETE /api/admin/products/:id` — soft delete
- [ ] Zod schemas for all bodies in `Backend/src/schemas/catalog.ts`
- [ ] Apply `adminAuth` middleware to all routes; integration tests covering CRUD, soft delete, pagination

### Acceptance Criteria

- [ ] `POST /api/admin/categories` with `{ name: "Tropical Plants" }` returns `201` with `slug: "tropical-plants"`
- [ ] `DELETE /api/admin/categories/:id` for a category with products sets `isActive: false` (no document deletion)
- [ ] `GET /api/admin/products?q=monstera` returns only text-search matching products
- [ ] `POST /api/admin/products` without a required field returns `400` with Zod errors
- [ ] All admin catalog routes return `401` without a valid admin JWT
- [ ] `PATCH /api/admin/products/:id` with `{ stock: 50 }` updates only `stock`; other fields unchanged

---

## Issue #21 — R2 Upload & Buyer Catalog API

**Branch:** `feature/catalog-upload-buyer-api` | **Milestone:** M5 | **Labels:** `feature`, `backend`

### Context

Product images are stored in Cloudflare R2. The upload flow: admin requests a presigned PUT URL, uploads directly to R2 from the browser (no round-trip through the API), stores the CDN URL. Buyer catalog routes serve active products with filtering, search, and pagination.

SRS refs: §4.2 (BUY-010–013), §13 (R2 strategy), §11.5.

### Tasks

- [ ] Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- [ ] Create `Backend/src/routes/admin/uploads.ts`:
  - `POST /api/admin/uploads/presign` — validate `contentType` (jpeg/png/webp only), validate intent size ≤ 5 MB, generate UUID key, call `PutObjectCommand` + `getSignedUrl` (15-min expiry), return `{ presignedUrl, cdnUrl: R2_PUBLIC_URL + "/" + key }`
- [ ] Create `Backend/src/routes/buyer/products.ts`:
  - `GET /api/buyer/products` — active only; pagination; filters: `category` (slug), `minPrice`, `maxPrice`, `light`, `inStock`; search `q`
  - `GET /api/buyer/products/:slug` — single product; `404` if inactive or not found
  - `GET /api/buyer/categories` — active only, sorted by name
- [ ] Integration tests in `Backend/__tests__/catalog.test.ts` — presign validation, browse filters, text search, pagination

### Acceptance Criteria

- [ ] `POST /api/admin/uploads/presign` with `contentType: "image/jpeg"` returns `200` with `presignedUrl` and `cdnUrl`
- [ ] Same endpoint with `contentType: "image/gif"` returns `400`
- [ ] `GET /api/buyer/products?light=low&inStock=true` returns only low-light, in-stock products
- [ ] `GET /api/buyer/products?page=2&limit=5` returns correct 5-item window with `total` field
- [ ] `GET /api/buyer/products/:slug` for `isActive: false` product returns `404`
- [ ] Backend catalog integration test coverage ≥ 70% (SRS §8.5)

---

## Issue #22 — Catalog Admin UI

**Branch:** `feature/catalog-admin-ui` | **Milestone:** M5 | **Labels:** `feature`, `admin-app`

### Context

With the catalog API ready, the admin-app needs UI to manage products and categories. The product form must handle the presign → upload to R2 → store CDN URL flow. Multiple images can be reordered by drag.

SRS refs: §5.3 (ADM-020–022), §5.4 (ADM-030), §13.

### Tasks

- [ ] Create RTK Query `catalogApi` slice with endpoints: `getProducts`, `createProduct`, `updateProduct`, `deleteProduct`, `getCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `presignUpload`
- [ ] Categories page (`/categories`): table (name, slug, product count, active toggle), inline create/edit modal, delete confirmation dialog (warns if products exist)
- [ ] Products list page (`/products`): data table (name, category, price, stock, status badge), search + category filter, pagination, "New product" button
- [ ] Product create/edit form (`/products/new`, `/products/:id/edit`): all SRS §10.6 fields, image uploader (drag-and-drop → presign → PUT to R2 → push CDN URL; multiple images, drag to reorder), active/inactive toggle

### Acceptance Criteria

- [ ] Admin creates a product with all required fields and one image; it appears in the list immediately after save
- [ ] Uploading a `.pdf` shows an "Images only" error and does NOT call the presign endpoint
- [ ] Editing a product price and saving reflects the new price on `GET /api/buyer/products/:slug`
- [ ] Toggling a product inactive removes it from `GET /api/buyer/products` results
- [ ] Deleting a category with products shows the warning dialog; confirming soft-deletes it
- [ ] Image drag-reorder is preserved after save (array order matches saved `images` field)

---

## Issue #23 — Catalog Buyer UI

**Branch:** `feature/catalog-buyer-ui` | **Milestone:** M5 | **Labels:** `feature`, `buyer-app`

### Context

The storefront is the primary conversion surface. The shop page must reflect filter/search state in the URL (shareable, browser-back friendly). Product detail must display all plant care attributes clearly.

SRS refs: §4.2 (BUY-010–013).

### Tasks

- [ ] Create TanStack Query hooks: `useProducts(filters)`, `useProduct(slug)`, `useCategories()` — `staleTime: 60_000`
- [ ] Shop page (`/shop`): responsive product grid (1 → 2 → 3–4 col), filter panel (category, price range, light requirement, in-stock toggle), debounced search bar (400 ms), pagination, product card (image, name, price, compareAtPrice strikethrough, stock badge)
- [ ] Product detail page (`/shop/[slug]`): image gallery + thumbnail row, plant care attributes table, "Add to Cart" button (disabled when `stock === 0`), category breadcrumb
- [ ] Category navigation strip (horizontal scroll on mobile)
- [ ] Empty state for zero search results

### Acceptance Criteria

- [ ] `/shop` loads products from the live API without console errors
- [ ] Applying "low light" filter updates URL to `?light=low` and re-fetches matching products
- [ ] Search triggers a debounced API call; results update ≤ 400 ms after typing stops
- [ ] `/shop/[slug]` for a valid product shows all plant attributes (light, water, humidity, pet-friendly, pot size, height)
- [ ] `/shop/[slug]` for nonexistent slug shows Next.js 404 page
- [ ] "Add to Cart" is disabled with "Out of stock" text when `stock === 0`
- [ ] Navigating away from `/shop` and back does NOT trigger a network request (TanStack Query cache hit)

---

## Issue #24 — Cart Backend

**Branch:** `feature/cart-backend` | **Milestone:** M6 | **Labels:** `feature`, `backend`

### Context

The cart is stored server-side for persistence across sessions and devices. `PUT /api/buyer/cart` replaces the entire cart atomically. Stock validation prevents overselling before an order is created.

SRS refs: §4.3 (BUY-020–021), §10.7.

### Tasks

- [ ] Create `Backend/src/models/Cart.ts` — fields: `userId` (unique, ref: User), `items: [{ productId, quantity (min:1), priceAtAdd }]`; timestamps
- [ ] `GET /api/buyer/cart` — find cart by `userId`; if none return `{ items: [] }`; populate `productId` with `name`, `price`, `stock`, `images[0]`, `slug`
- [ ] `PUT /api/buyer/cart` — upsert for `userId`; validate `quantity ≤ product.stock` for each item; on failure return `422` naming the product; on success return populated cart
- [ ] Apply `buyerAuth` middleware; integration tests: empty cart, add item, exceed stock, remove item

### Acceptance Criteria

- [ ] `GET /api/buyer/cart` for buyer with no cart returns `200` with `{ items: [] }`
- [ ] `PUT /api/buyer/cart` with `quantity` exceeding `product.stock` returns `422` with descriptive error naming the product
- [ ] After successful `PUT`, subsequent `GET` returns updated items with populated product fields
- [ ] `GET /api/buyer/cart` without a buyer JWT returns `401`
- [ ] `PUT /api/buyer/cart` with `{ items: [] }` clears the cart

---

## Issue #25 — Cart Frontend

**Branch:** `feature/cart-frontend` | **Milestone:** M6 | **Labels:** `feature`, `buyer-app`

### Context

Cart state must be immediately responsive (Zustand handles local mutations instantly) while persisted to the server. On login, the server cart is fetched and merged with local state (server wins on conflicts). The cart drawer shows line items with quantity controls.

SRS refs: §4.3 (BUY-020–021).

### Tasks

- [ ] Create Zustand `cartStore` — state: `items: CartItem[]`; actions: `addItem`, `updateQuantity`, `removeItem`, `syncFromServer`, `clearCart`; `syncFromServer` merges server state (server wins per productId)
- [ ] On buyer login success: call `GET /api/buyer/cart`, dispatch `syncFromServer`
- [ ] Cart drawer component: slide-in panel from right; line items (thumbnail, name, price × qty, +/− stepper capped at `product.stock`, remove ×); subtotal; "Proceed to Checkout" button (disabled if empty); empty state
- [ ] Cart icon in header: shopping bag + item count badge (sum of quantities); opens drawer on click

### Acceptance Criteria

- [ ] Clicking "Add to Cart" adds item to Zustand and increments header badge — no page reload
- [ ] Quantity stepper cannot increment above `product.stock`
- [ ] Removing all items shows "Your cart is empty" empty state
- [ ] After login, server cart items appear in drawer within one render cycle
- [ ] "Proceed to Checkout" button is disabled when cart is empty

---

## Issue #26 — Order Backend

**Branch:** `feature/order-backend` | **Milestone:** M6 | **Labels:** `feature`, `backend`

### Context

On checkout the backend creates a Razorpay order and persists an `Order`. Prices are snapshotted at order time so future price changes don't affect placed orders. Stock is decremented optimistically — restored if payment fails (Issue #27).

SRS refs: §4.4 (BUY-030–032), §10.8, §11.4, §14.

### Tasks

- [ ] Install `razorpay`; create `Backend/src/services/razorpay.ts` — export initialized `Razorpay` instance
- [ ] Create `Backend/src/models/Order.ts` — fields: `userId`, `items: [{ productId, name, quantity, priceAtOrder }]`, `shippingAddress` (embedded), `subtotal`, `shippingFee`, `total`, `razorpayOrderId` (unique), `paymentStatus` (enum: pending/paid/failed/refunded), `status` (enum: pending/placed/packed/shipped/delivered/cancelled); indexes on `userId`, `status`, `razorpayOrderId`
- [ ] `POST /api/buyer/orders`: validate cart non-empty + all items in stock, snapshot prices, decrement stock, `razorpay.orders.create`, persist `Order` with `paymentStatus: "pending"`, return `{ orderId, razorpayOrderId, amount, currency }`
- [ ] `GET /api/buyer/orders` — paginated, sorted newest first; `GET /api/buyer/orders/:id` — `404` if `userId` mismatch

### Acceptance Criteria

- [ ] `POST /api/buyer/orders` with valid cart returns `201` with `razorpayOrderId` and `amount` in paise
- [ ] After order creation, `product.stock` is decremented by the ordered quantity
- [ ] `POST /api/buyer/orders` with `stock === 0` item returns `422`
- [ ] `GET /api/buyer/orders/:id` with another buyer's orderId returns `404`

---

## Issue #27 — Razorpay Webhook Backend

**Branch:** `feature/webhook-backend` | **Milestone:** M6 | **Labels:** `feature`, `backend`, `payments`

### Context

The webhook is the authoritative source for payment status — client-side callbacks can be spoofed. HMAC verification guards against forged webhooks. Processing is idempotent: duplicate events (Razorpay retries on 5xx) are no-ops. Stock is restored on payment failure.

SRS refs: §10.9, §12 (SEC-09), §14.

### Tasks

- [ ] Create `Backend/src/models/Payment.ts` — fields: `razorpayEventId` (unique), `razorpayOrderId`, `razorpayPaymentId`, `event`, `amount`, `processedAt`
- [ ] `POST /api/webhooks/razorpay` (no auth middleware):
  - HMAC: `crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex")`; compare to `X-Razorpay-Signature`; return `400` if mismatch
  - Idempotency check: if `Payment` with `razorpayEventId` exists → return `200`, no changes
  - `payment.captured`: set `Order.paymentStatus = "paid"`, `status = "placed"`, create `Payment`
  - `payment.failed`: restore `product.stock`, set `Order.paymentStatus = "failed"`
- [ ] Use `express.raw({ type: "application/json" })` for this route (before `express.json()`)
- [ ] Integration tests: valid HMAC, tampered HMAC, duplicate event, `payment.failed` stock restore

### Acceptance Criteria

- [ ] Valid HMAC + `payment.captured` → `Order.paymentStatus = "paid"`, `status = "placed"`
- [ ] Tampered signature → `400`, no DB changes
- [ ] Same `razorpayEventId` twice → second call returns `200`, no new `Payment` document
- [ ] `payment.failed` → `product.stock` restored to pre-order value
- [ ] Missing `X-Razorpay-Signature` header → `400`

---

## Issue #28 — Checkout Frontend

**Branch:** `feature/checkout-frontend` | **Milestone:** M6 | **Labels:** `feature`, `buyer-app`, `payments`

### Context

Checkout is a 3-step flow: address, summary, payment. Razorpay Checkout.js handles card/UPI — LeafFlow never touches card data. After payment, the frontend polls for `paymentStatus === "paid"` rather than trusting the client-side callback.

SRS refs: §4.4 (BUY-030–032), §14.

### Tasks

- [ ] Checkout page (`/checkout`): stepper UI with 3 steps — (1) select/add address, (2) order summary (items, subtotal, shipping, total), (3) "Pay" button that calls `POST /api/buyer/orders` then loads Razorpay popup with `razorpayOrderId`
- [ ] Razorpay `handler` callback: navigate to `/orders/<orderId>?status=processing`
- [ ] Order detail page (`/orders/[id]`): if `?status=processing`, poll `GET /api/buyer/orders/:id` every 2 seconds until `paymentStatus === "paid"` (max 30 seconds, then show "Verification pending"); display order number, items, total
- [ ] Order history page (`/orders`): list of buyer's orders, status badge, newest first
- [ ] Apply `useRequireAuth` to `/checkout` and `/orders` pages

### Acceptance Criteria

- [ ] Checkout page shows all 3 steps; navigating between steps preserves entered data
- [ ] Razorpay popup opens with correct `amount` (paise) and `currency: "INR"`
- [ ] Closing popup without paying leaves order in `paymentStatus: "pending"`
- [ ] After successful Razorpay test payment: confirmation page shows "Payment verified" within 10 seconds
- [ ] Order history lists most recent order first with a status badge
- [ ] Accessing `/checkout` without login redirects to `/login?next=/checkout`

---

## Issue #29 — Admin Orders API

**Branch:** `feature/admin-orders-api` | **Milestone:** M7 | **Labels:** `feature`, `backend`

### Context

The admin needs to manage the order lifecycle. Status transitions must be validated — skipping states (e.g. `placed` → `delivered`) is disallowed. Cancellation calls the Razorpay refund API.

SRS refs: §5.2 (ADM-010), §5.5 (ADM-040–042), §11.5.

### Tasks

- [ ] `GET /api/admin/orders` — paginated (default 20), sorted by `createdAt` desc; filters: `status`, `paymentStatus`, `dateFrom`, `dateTo`, `userId`; populate buyer name + email
- [ ] `PATCH /api/admin/orders/:id/status` — validate allowed transitions: `placed→packed`, `packed→shipped`, `shipped→delivered`, `any→cancelled`; return `422` for invalid
- [ ] `POST /api/admin/orders/:id/cancel` — validate `paymentStatus === "paid"`, call `razorpay.payments.refund(...)`, set `paymentStatus: "refunded"`, `status: "cancelled"`
- [ ] Apply `adminAuth` middleware; integration tests: list filters, valid/invalid transitions, cancel+refund (MSW mock)

### Acceptance Criteria

- [ ] `GET /api/admin/orders?status=placed` returns only `placed` orders
- [ ] `PATCH` with `status: "delivered"` from `placed` returns `422` ("Invalid status transition")
- [ ] `POST /api/admin/orders/:id/cancel` calls Razorpay refund API (MSW-verified) and updates both fields
- [ ] `GET /api/admin/orders?dateFrom=2026-01-01&dateTo=2026-01-31` returns only orders in that range
- [ ] All routes return `401` without a valid admin JWT

---

## Issue #30 — Admin Customers, Inventory & Dashboard API

**Branch:** `feature/admin-customers-inventory-api` | **Milestone:** M7 | **Labels:** `feature`, `backend`

### Context

The admin needs to view buyers and their order history, adjust stock levels, and monitor store health via aggregated dashboard metrics. Dashboard figures are computed on every request — no stale cache.

SRS refs: §5.2 (ADM-010), §5.4 (ADM-030–031), §11.5.

### Tasks

- [ ] `GET /api/admin/customers` — paginated buyer list; MongoDB aggregation to compute `orderCount` and `totalSpent` (sum of paid order totals) per buyer; search by name/email via `q`
- [ ] `GET /api/admin/customers/:id/orders` — full order history for a specific buyer, paginated
- [ ] `PATCH /api/admin/products/:id/stock` — update `stock` and/or `lowStockThreshold`; return updated product
- [ ] `GET /api/admin/dashboard` — return: `totalOrders`, `revenue: { today, last7days, last30days }`, `pendingOrders` count, `lowStockProducts` array (name, stock, lowStockThreshold)
- [ ] Apply `adminAuth` middleware to all routes

### Acceptance Criteria

- [ ] `GET /api/admin/customers` returns buyers with correct `orderCount` (verified by placing test orders)
- [ ] `PATCH /api/admin/products/:id/stock` with `{ stock: 100 }` updates and returns the updated document
- [ ] `GET /api/admin/dashboard` revenue updates immediately after a test order is placed
- [ ] Dashboard `lowStockProducts` includes only products where `stock < lowStockThreshold`
- [ ] `GET /api/admin/customers/:id/orders` returns `404` if no user with that ID exists

---

## Issue #31 — Admin Orders & Customers UI

**Branch:** `feature/admin-orders-ui` | **Milestone:** M7 | **Labels:** `feature`, `admin-app`

### Context

The admin-app needs UI for order management and customer browsing. The orders table is the primary operational view. Status updates and cancellations happen from a side drawer without navigating away.

SRS refs: §5.2 (ADM-010), §5.5 (ADM-040–042).

### Tasks

- [ ] Add RTK Query endpoints: `getOrders`, `updateOrderStatus`, `cancelOrder`, `getCustomers`, `getCustomerOrders`
- [ ] Orders list page (`/orders`): table (order number, buyer name, total, status badge, date), filter bar (status dropdown, date range), pagination, row click opens order detail drawer
- [ ] Order detail drawer: line items, shipping address, payment info, status update dropdown (valid next statuses only), "Update" button; "Cancel & Refund" button (disabled if `paymentStatus !== "paid"`) + confirmation modal showing refund amount
- [ ] Customers page (`/customers`): table (name, email, order count, total spent), search input, row click opens order history modal

### Acceptance Criteria

- [ ] Orders list shows only `placed` orders when "Placed" is selected in the status filter
- [ ] Order detail drawer shows only valid next statuses in the dropdown (no backwards transitions)
- [ ] Confirming "Cancel & Refund" updates the order status in the table without a page reload
- [ ] Customer page search by email narrows results in real time (debounced)
- [ ] Clicking a customer row opens a modal with that buyer's order history

---

## Issue #32 — Admin Inventory & Dashboard UI

**Branch:** `feature/admin-inventory-dashboard-ui` | **Milestone:** M7 | **Labels:** `feature`, `admin-app`

### Context

Inventory and dashboard give the admin real-time visibility into store health. Stock is editable inline. The dashboard is the landing page after login.

SRS refs: §5.4 (ADM-030–031), §11.5.

### Tasks

- [ ] Inventory page (`/inventory`): table (product name, category, stock as inline editable input, low-stock threshold as inline editable, last updated); rows where `stock < lowStockThreshold` highlighted amber; "Save" per row calls `PATCH /api/admin/products/:id/stock`
- [ ] Dashboard page (`/dashboard`): summary cards (Total Orders, Revenue with period toggle Today/7 days/30 days, Pending Orders, Low-stock count); low-stock product list (name, stock, threshold, edit link); data from `GET /api/admin/dashboard`
- [ ] Redirect to `/dashboard` after admin login
- [ ] Add sidebar nav items: Dashboard, Orders, Inventory, Customers, Products, Categories, Settings

### Acceptance Criteria

- [ ] Inventory page highlights amber rows where `stock < lowStockThreshold`
- [ ] Editing stock inline and saving calls `PATCH` and updates the table value without page reload
- [ ] Dashboard revenue card shows `₹0` for a period with no paid orders; updates after a test order + refresh
- [ ] Dashboard low-stock count matches the number of highlighted rows on inventory page
- [ ] Switching revenue toggle from "Today" to "30 days" re-fetches and updates the figure
- [ ] After login, admin is redirected to `/dashboard`

---

## Issue #33 — Static Pages

**Branch:** `feature/static-pages` | **Milestone:** M8 | **Labels:** `feature`, `buyer-app`

### Context

LeafFlow requires informational pages for legal and trust purposes. All four must be reachable from the site footer on every page.

SRS refs: §4.5 (BUY-040).

### Tasks

- [ ] Create `src/app/about/page.tsx` — store story, plant sourcing philosophy, team section
- [ ] Create `src/app/shipping/page.tsx` — delivery zones, estimated timelines, shipping costs
- [ ] Create `src/app/returns/page.tsx` — return eligibility, process, refund timeline
- [ ] Create `src/app/contact/page.tsx` — contact form (name, email, message) or store contact details
- [ ] Add site footer component (`src/components/Footer.tsx`) with links to About, Shipping, Returns, Contact, Shop + copyright line; include in root layout (`src/app/layout.tsx`)

### Acceptance Criteria

- [ ] `GET /about`, `/shipping`, `/returns`, `/contact` all return HTTP `200` with rendered content
- [ ] All four pages are reachable from the footer on home, shop, and product detail pages
- [ ] Pages render without console errors on 375 px and 1280 px viewports
- [ ] Footer is present on every page including `/shop`, `/shop/[slug]`, and `/profile`

---

## Issue #34 — Error Pages & Accessibility

**Branch:** `feature/error-a11y` | **Milestone:** M8 | **Labels:** `feature`, `buyer-app`, `a11y`

### Context

Missing custom error pages show Next.js generic screens. Loading spinners cause layout shift — skeletons are better. WCAG 2.1 AA compliance is required before launch (SRS §6.5).

SRS refs: §4.5 (BUY-040), §6.5 (accessibility NFR).

### Tasks

- [ ] Create `src/app/not-found.tsx` — friendly 404 page with link back to `/shop`
- [ ] Create `src/app/error.tsx` — error boundary with "Something went wrong", "Try again" button (`router.refresh()`), link to home
- [ ] Create skeleton components: `ProductCardSkeleton` and `ProductDetailSkeleton` (animated pulse, matching dimensions); use in shop and product detail pages during loading
- [ ] Accessibility audit and fixes: single `h1` per page; `<nav>` landmarks; all form inputs have `<label>`; visible `:focus-visible` ring; descriptive `alt` on all `<img>`; colour contrast ≥ 4.5:1 for normal text
- [ ] Focus trap in cart drawer: `Tab` cycles within drawer; `Escape` closes it

### Acceptance Criteria

- [ ] Navigating to `/nonexistent` shows the custom 404 page with a link to `/shop`
- [ ] Triggering a component error shows the custom error page with "Try again" button
- [ ] Product grid shows skeleton cards while loading (no empty space or spinner)
- [ ] `Tab` from within the cart drawer cycles through drawer items only; `Escape` closes it
- [ ] All form inputs on login, checkout, and contact pages have visible `<label>` elements
- [ ] Lighthouse accessibility score on `/shop` ≥ 90

---

## Issue #35 — Admin Settings

**Branch:** `feature/admin-settings` | **Milestone:** M8 | **Labels:** `feature`, `admin-app`, `backend`

### Context

The admin needs to configure store-level settings (name, contact details, delivery zones). These are stored as a singleton `Settings` document — upserted on first `PATCH` if it doesn't exist.

SRS refs: §5.6 (ADM-050).

### Tasks

- [ ] Create `Backend/src/models/Settings.ts` — singleton document: `storeName`, `contactEmail`, `contactPhone`, `deliveryZones` (string[]), `updatedAt`; enforce singleton via `key: "global"` unique field
- [ ] `GET /api/admin/settings` — return current settings or defaults if no document exists
- [ ] `PATCH /api/admin/settings` — upsert settings; validate with Zod schema; apply `adminAuth`
- [ ] admin-app Settings page (`/settings`): form (store name, contact email, phone, delivery zones textarea); "Save" button with success toast; fetches current settings on mount

### Acceptance Criteria

- [ ] `GET /api/admin/settings` returns `200` with defaults before any `PATCH`
- [ ] `PATCH /api/admin/settings` with `{ storeName: "LeafFlow" }` updates document; subsequent `GET` returns `storeName: "LeafFlow"`
- [ ] Saving from admin-app shows success toast; values persist on page reload
- [ ] `PATCH` with invalid email format returns `400` with Zod error
- [ ] Settings page accessible from `/settings` in sidebar nav

---

## Issue #36 — Security Headers & Rate Limiting

**Branch:** `feature/security-headers` | **Milestone:** M8 | **Labels:** `feature`, `backend`, `security`

### Context

The backend currently has no HTTP security headers and no rate limiting. `helmet`, `cors` enforcement, and `express-rate-limit` are required by SRS §12 before production launch.

SRS refs: §12 (SEC-01–12), §6.7 (security NFR).

### Tasks

- [ ] Install `helmet` and `express-rate-limit` in `Backend`
- [ ] Apply `helmet()` as the first middleware in `Backend/src/app.ts`
- [ ] Apply `cors()` with `CORS_ORIGIN` allowlist and `credentials: true` (if not already added in Issue #13)
- [ ] General auth limiter: 100 requests / 15 min per IP — apply to all `/api/*/auth/` routes
- [ ] OTP send limiter: 3 requests / 15 min per IP — apply to all `/*/send-otp` endpoints
- [ ] Exclude `POST /api/webhooks/razorpay` from auth rate limiters

### Acceptance Criteria

- [ ] `GET /api/health` response headers include `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security`
- [ ] `POST /api/buyer/auth/email/send-otp` called 4 times within 15 minutes from the same IP returns `429` on the 4th request
- [ ] Cross-origin request from a non-allowed origin does NOT receive `Access-Control-Allow-Origin` (verified with curl)
- [ ] `POST /api/webhooks/razorpay` is not blocked by auth rate limiters

---

## Issue #37 — Structured Logging

**Branch:** `feature/logging` | **Milestone:** M8 | **Labels:** `feature`, `backend`

### Context

`console.log` produces unstructured text. Production observability requires structured JSON logs parseable by log aggregators. `pino` is the standard structured logger for Node.js; `pino-http` adds automatic per-request logging.

SRS refs: §6.6 (observability NFR).

### Tasks

- [ ] Install `pino` and `pino-http` in `Backend`
- [ ] Create `Backend/src/lib/logger.ts` — export `pino` instance with `level: process.env.LOG_LEVEL ?? "info"`; pretty-print disabled in production
- [ ] Apply `pino-http` middleware in `Backend/src/app.ts` before routes; log fields: `method`, `url`, `statusCode`, `responseTime`; exclude `GET /health` from request logs
- [ ] Replace all `console.log` / `console.error` calls in `Backend/src/` with `logger` methods
- [ ] Add `LOG_LEVEL=info` to `Backend/.env.example`

### Acceptance Criteria

- [ ] A request produces a JSON log line containing `method`, `url`, `statusCode`, and `responseTime`
- [ ] `LOG_LEVEL=debug` causes debug log lines to appear; `LOG_LEVEL=error` suppresses info/debug
- [ ] `GET /health` does NOT produce a request log line
- [ ] No bare `console.log` or `console.error` remain in `Backend/src/` (`grep -r "console\." Backend/src` returns zero results)
- [ ] Each log line is valid JSON (parseable with `JSON.parse`)

---

## Issue #38 — Playwright Workspace Setup

**Branch:** `feature/e2e-setup` | **Milestone:** M9 | **Labels:** `testing`, `e2e`

### Context

The E2E suite requires its own workspace. Playwright needs a config specifying the app URL, browsers, retry policy, and how to start the full stack. Global setup seeds the test DB; teardown cleans it. Auth fixtures provide pre-authenticated pages so individual specs don't repeat login steps.

SRS refs: §8.4–8.6.

### Tasks

- [ ] Add `"e2e"` to `workspaces` array in root `package.json`
- [ ] Create `e2e/package.json` — `@playwright/test@1.60.0`; scripts: `test:e2e` (headless), `test:e2e:headed`, `test:e2e:report` (`playwright show-report`)
- [ ] Create `e2e/playwright.config.ts`: `baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001"`, projects: chromium / firefox / webkit, `retries: process.env.CI ? 1 : 0`, `webServer: { command: "docker compose -f docker-compose.prod.yml up -d", url: "http://localhost:3000/health", reuseExistingServer: !process.env.CI }`
- [ ] Create `e2e/global-setup.ts` — connect to `MONGODB_URI_TEST`; seed: 1 admin account, 3 categories, 10 products (8 in stock, 2 with `stock: 0`)
- [ ] Create `e2e/global-teardown.ts` — drop buyer-created collections; keep admin + catalog data for repeatability
- [ ] Create `e2e/fixtures/auth.ts` — Playwright fixture exporting `adminPage` (logged-in admin-app) and `buyerPage` (logged-in buyer-app) using `request` fixture for API-based login

### Acceptance Criteria

- [ ] `npm run test:e2e --workspace e2e` completes without setup errors (stack already running)
- [ ] `global-setup.ts` creates expected documents in MongoDB (verified via `mongosh`)
- [ ] `global-teardown.ts` leaves DB clean; running the suite twice produces the same results
- [ ] `adminPage` fixture provides a page authenticated as admin (no login steps in specs)
- [ ] Config runs tests in Chromium, Firefox, and WebKit projects

---

## Issue #39 — Admin Auth E2E Specs

**Branch:** `feature/e2e-admin-auth` | **Milestone:** M9 | **Labels:** `testing`, `e2e`

### Context

Admin login and password reset are the most security-critical flows. E2E tests verify the full journey including UI navigation bugs that unit tests cannot catch.

SRS refs: §8.6, §15.1.

### Tasks

- [ ] Create `e2e/admin/login.spec.ts`:
  - Happy path: enter valid credentials → OTP page appears, enter seeded OTP (retrieved via direct DB query in `beforeEach`), submit → URL is `/dashboard`, welcome element visible
  - Wrong password: enter wrong password → error "Invalid credentials" visible, no OTP page
  - Invalid OTP: complete step 1 → enter wrong OTP → error message visible, attempt counter increments
- [ ] Create `e2e/admin/forgot-password.spec.ts`:
  - Full flow: enter `loginEmail` → OTP shown → enter OTP → set new password → navigate to `/login` → login with new password succeeds → `/dashboard` reached
  - Old password rejected: after reset, login with old password shows `INVALID_CREDENTIALS`

### Acceptance Criteria

- [ ] `login.spec.ts` happy path passes in Chromium, Firefox, and WebKit
- [ ] Wrong password test shows error without navigating to OTP page
- [ ] `forgot-password.spec.ts` full flow completes; admin can log in with the new password
- [ ] After reset, old password returns `INVALID_CREDENTIALS`
- [ ] All specs pass with `retries: 1` and no `waitForTimeout` calls

---

## Issue #40 — Buyer Auth E2E Specs

**Branch:** `feature/e2e-buyer-auth` | **Milestone:** M9 | **Labels:** `testing`, `e2e`

### Context

Buyer email OTP and Google OAuth flows are tested. Google OAuth is stubbed via request interception since real Google accounts cannot be used in CI. Account linking (same email, two auth methods → one user) is the most complex case.

SRS refs: §8.6, §15.2.

### Tasks

- [ ] Create `e2e/buyer/email-otp.spec.ts`:
  - New buyer: enter fresh email, send OTP, enter OTP, verify → session established (auth cookie set, `GET /api/buyer/auth/me` returns `200`)
  - Returning buyer: repeat same flow with same email → same `_id` returned from `/me`
- [ ] Create `e2e/buyer/google-oauth.spec.ts`:
  - New buyer via Google: stub Google callback via `page.route` to return mocked token → session established, `User` doc with `googleId`
  - Account linking: create buyer via OTP (seed), POST One Tap with same email via `request` fixture → single `User` document with `googleId` added

### Acceptance Criteria

- [ ] `email-otp.spec.ts` test 1: auth cookie set and `/api/buyer/auth/me` returns `200` after OTP verify
- [ ] `email-otp.spec.ts` test 2: second login with same email returns same `_id` from `/me`
- [ ] `google-oauth.spec.ts` test 1: `User` doc has `googleId` set after mocked OAuth flow
- [ ] `google-oauth.spec.ts` test 2: only one `User` document exists after account linking (no duplicates)
- [ ] All specs pass in all 3 browsers with `retries: 1`

---

## Issue #41 — Purchase Flow & Product Publish E2E Specs

**Branch:** `feature/e2e-purchase-flow` | **Milestone:** M9 | **Labels:** `testing`, `e2e`

### Context

The purchase flow is the most critical user journey — any regression directly impacts revenue. The product publish test verifies the admin→buyer data pipeline end-to-end.

SRS refs: §8.6, §14.

### Tasks

- [ ] Create `e2e/buyer/purchase-flow.spec.ts` using `buyerPage` fixture:
  - Full flow: navigate `/shop`, click first in-stock product, "Add to Cart", cart drawer opens, "Proceed to Checkout", select seeded address, review summary, "Pay", complete Razorpay test payment via popup, poll until confirmation page shows "Payment verified", verify order total and line items
  - Edge case: navigate to out-of-stock product → "Add to Cart" is disabled (has `disabled` attribute)
- [ ] Create `e2e/admin/product-publish.spec.ts` using `adminPage` fixture:
  - Navigate to `/products/new`, fill required fields, upload test image (`page.setInputFiles`), save → product in list
  - Open buyer-app page → navigate to `/shop` → new product card visible with correct name and price

### Acceptance Criteria

- [ ] `purchase-flow.spec.ts`: order confirmation page appears after Razorpay test payment
- [ ] Order total on confirmation matches cart subtotal + shipping
- [ ] Out-of-stock product "Add to Cart" button has `disabled` attribute
- [ ] `product-publish.spec.ts`: newly created product appears on `/shop`
- [ ] All specs pass in Chromium, Firefox, and WebKit with `retries: 1`

---

## Issue #42 — E2E CI Gate Activation

**Branch:** `feature/e2e-ci-gate` | **Milestone:** M9 | **Labels:** `testing`, `e2e`, `ci`

### Context

The `ci-release.yml` E2E job has run `exit 0` since M1. Now that all 5 spec files exist and pass, the real Playwright run replaces the placeholder. This is the final step completing the `develop → master` quality gate.

SRS refs: §8.4 (E2E CI gate), §8.6.

### Tasks

- [ ] Update `ci-release.yml` `e2e` job: replace placeholder echo with real steps:
  - `npm ci`
  - `npx playwright install --with-deps`
  - `npm run test:e2e --workspace e2e` (env: `E2E_BASE_URL`, `MONGODB_URI_TEST`)
- [ ] Add artifact upload steps (`if: failure()`): `e2e/playwright-report/` and `e2e/test-results/` with `retention-days: 7`
- [ ] Add GitHub Actions secrets: `MONGODB_URI_TEST`, `RAZORPAY_TEST_KEY_ID`, `RAZORPAY_TEST_KEY_SECRET` (document in PR description)
- [ ] Verify `master` branch protection still requires the `e2e` status check (configured in Issue #3)

### Acceptance Criteria

- [ ] A PR from `develop` → `master` where all E2E specs pass shows `e2e` job as green
- [ ] A PR with a deliberately broken E2E test is blocked from merging — `e2e` job is red
- [ ] Playwright HTML report and `test-results` are uploaded as CI artifacts on any test failure
- [ ] `npx playwright install --with-deps` installs browser binaries in CI without errors
- [ ] Running the suite twice against the same DB (teardown between runs) produces identical results
