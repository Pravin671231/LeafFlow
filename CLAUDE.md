# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LeafFlow is a single-seller e-commerce platform for ornamental plants, built as a monorepo with three workspaces:
- **Backend** — Node.js + Express 5 REST API (TypeScript, CommonJS), backed by MongoDB via Mongoose
- **buyer-app** — Next.js 16 customer-facing storefront (React 19, SSR, App Router)
- **admin-app** — Vite 8 + React 19 seller dashboard (SPA)

**Current state (June 2026):** Admin auth is fully implemented (OTP login, JWT + refresh tokens, password reset, account lockout). `connectDB()` in `src/index.ts` is mocked — real Mongoose connection comes in M4 (issue #14). Buyer/product/catalog/commerce features are not yet started. buyer-app and admin-app are scaffolds with no real pages or features.

## Commands

### Local dev (Docker — preferred)
```
make dev       # start all 4 services (mongo, backend, buyer-app, admin-app) with hot reload
make prod      # build and start production stack (detached)
make down      # stop containers and remove mongo_data volume
make logs      # tail logs from all services
make ps        # show container status
```
Ports: backend `:3000`, buyer-app `:3001`, admin-app `:5173`, mongo internal only.

### Per-workspace dev servers (no Docker)
```
npm run dev --workspace backend       # tsx src/index.ts on :3000
npm run dev --workspace buyer-app     # Next.js dev server on :3000
npm run dev --workspace admin-app     # Vite dev server on :5173
```

### Root (all workspaces)
```
npm run build          # build all workspaces
npm run lint           # ESLint across entire monorepo
npm test               # run tests in all workspaces
```

### Testing
```
npm run test:backend        # run Backend tests once
npm run test:buyer-app      # run buyer-app tests once
npm run test:admin-app      # run admin-app tests once

# Single test file
npm run test --workspace backend -- __tests__/health.test.ts

# Watch mode (per workspace)
npm run test:watch --workspace backend

# Coverage
npm run test:coverage:backend
npm run test:coverage:buyer-app
npm run test:coverage:admin-app
```

Coverage thresholds (Backend): 80% lines/functions, 75% branches. `src/index.ts` and `src/scripts/**` are excluded from coverage.

### Backend build & start
```
npm run build --workspace backend     # tsc → dist/
npm run start --workspace backend     # node dist/index.js
```

## Architecture

### Monorepo layout
```
LeafFlow/
├── Backend/          Express API (src/app.ts, src/index.ts)
├── buyer-app/        Next.js app (app/ router)
├── admin-app/        Vite SPA (src/)
├── e2e/              Playwright workspace (planned, M9)
├── docs/SRS.md       Full software requirements spec
├── docs/milestone.md Delivery roadmap (M0–M9)
├── tsconfig.base.json
└── eslint.config.ts
```

Requires Node ≥ 24.15.0.

### Backend structure

`src/app.ts` configures the Express app; `src/index.ts` starts the server with graceful shutdown.

```
src/
├── config/       # env.ts (Zod-validated), db.ts (Mongoose — mocked until M4), constants.ts, index.ts
├── controllers/  # adminAuth.controller.ts (7 handlers: login, verifyOtp, refresh, logout, me, forgotPassword, resetPassword)
├── middleware/   # adminAuth.ts (JWT validation), validate.ts (Zod), rateLimiter.ts, index.ts
├── models/       # Admin.ts, OtpSession.ts, RefreshToken.ts, index.ts
├── routes/       # admin/auth.ts (8 endpoints), index.ts (mounts /api/admin/auth)
├── services/     # adminAuth.service.ts, email.ts, otp.ts, token.ts (JWT sign/verify), index.ts
├── schemas/      # auth.ts (Zod schemas for login, verify-otp, forgot-password), index.ts
├── utils/        # logger.ts (Pino), errorHandler.ts, sendResponse.ts, AppError.ts
└── scripts/      # seed.ts (admin seeder)
```

**Implemented admin auth endpoints** (`/api/admin/auth`):
`POST /login` → `POST /verify-otp` → `POST /refresh` → `POST /logout`
`GET /me` · `POST /forgot-password` · `POST /reset-password`

**What's NOT yet implemented** (planned M5–M6): buyer models (User, Product, Cart, Order, Payment), buyer/product/order routes, Razorpay integration, Cloudflare R2 storage.

### Backend coding patterns

- **Responses**: Always use `sendResponse(res, status, data)` from `src/utils/sendResponse.ts`. Error shape: `{ success: false, code: string, message: string }`.
- **Errors**: Throw `new AppError(message, statusCode, code)` from `src/utils/AppError.ts`; the `errorHandler` middleware catches it.
- **Logging**: Use the Pino logger from `src/utils/logger.ts` — never `console.log`.
- **Validation**: Apply `validate(schema)` middleware (Zod) in routes before controllers.
- **Config**: Access validated env through `src/config/env.ts`, never `process.env` directly.

### Frontend structure (planned)
```
buyer-app/src/
├── components/
├── hooks/        # TanStack Query hooks
├── stores/       # Zustand (cart, checkout)
└── lib/          # API client

admin-app/src/
├── features/     # products, orders, auth (RTK Query slices)
├── store/        # Redux store + RTK Query API definitions
└── components/
```

### State management
| App | Server / async state | Client / UI state |
| --- | -------------------- | ----------------- |
| **admin-app** | **RTK Query** (`@reduxjs/toolkit`) | **Redux slices** (auth session, sidebar, table filters) |
| **buyer-app** | **TanStack Query** | **Zustand** (cart, checkout step) |

### Key data models (MongoDB/Mongoose)
`Admin`, `OtpSession`, `RefreshToken` (M4, implemented schemas) → `User`, `Category`, `Product` (M5) → `Cart`, `Order`, `Payment` (M6). See `docs/SRS.md` §10 for full field lists.

### External integrations
MongoDB 8, Cloudflare R2 (S3-compatible), Razorpay (India), Gmail SMTP (Nodemailer), Google OAuth / One Tap.

### Testing approach
All three workspaces use **Vitest** with **@testing-library/react** for UI and **Supertest** for HTTP assertions in the backend. Frontend tests mock API calls with **MSW** (server initialized in `vitest.setup.ts`). Test files live in `__tests__/` directories.

### Shared config
`tsconfig.base.json` defines base TypeScript settings (ES2023, NodeNext); each workspace extends it. ESLint uses the flat config format (`eslint.config.ts`). Prettier is configured via `.prettierrc` (100-char line width, trailing commas, 2-space indent).

## Next.js version warning

`buyer-app` targets **Next.js 16**, which has breaking changes from earlier versions. Before writing any Next.js code, read the relevant guide in `buyer-app/node_modules/next/dist/docs/` — APIs, conventions, and file structure may differ from training data. The `buyer-app/AGENTS.md` file reinforces this.

## Environment setup

Copy `Backend/.env.example` to `Backend/.env` and fill in:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/leafflow
JWT_SECRET=...
JWT_EXPIRES_IN=7d
NODE_ENV=development
```
When using Docker Compose, `MONGODB_URI` is injected automatically as `mongodb://mongo:27017/leafflow`. The `.env` file is only needed for non-Docker local runs.

## Branch strategy

```
feature/<scope>  →  develop  →  master
```
Cut `feature/*` branches from `develop`, one per issue. Rebase onto `develop` before opening a PR. Squash-merge `develop → master`.

## CI

Three GitHub Actions workflows:
- **`ci-feature.yml`** — lint + unit + integration on every PR into `develop`
- **`ci-release.yml`** — lint + unit + integration + E2E placeholder on every PR into `master`
- **`deploy-render.yml`** — triggers Render deploy hooks on push to `master`

Coverage uploads to Codecov from each workspace's `test:coverage` job.

## Development Workflow

### Branch Naming Convention

All feature branches follow:
```
feature/<issue-number>-<scope>
```

Where `<scope>` is a 2–4 word kebab-case description from the issue title. Examples:
- `feature/62-e2e-ci-gate-activation`
- `feature/14-mongoose-real-connection`
- `feature/33-cors-middleware`

Always cut from `develop`. Use `gh issue develop <N> --base develop --name feature/<N>-<scope> --checkout` — this registers the branch with the GitHub issue's Development sidebar automatically (works even on closed issues).

### Pre-Merge Checklist

Before merging any feature branch to `develop`, all of the following must pass locally:

1. **Tests** — `npm run test` (all workspaces, zero failures)
2. **Build** — `npm run build` (all workspaces, no TypeScript errors)
3. **Backend start** — build backend, start with `npm run start --workspace backend`, confirm `GET /health` returns HTTP 200

CI (`ci-feature.yml`) also enforces lint + test on every PR. Do not merge if CI is red.

### Commit Message Format

```
<type>(<scope>): <description> (Issue #<N>)
```

Types: `feat`, `fix`, `test`, `chore`, `docs`, `refactor`
Scopes: `backend`, `buyer-app`, `admin-app`, `ci`, `infra`, `e2e`

Example: `feat(backend): implement OTP session model and expiry (Issue #14)`

### Issue-to-PR Skill

Use `/dev-workflow <issue-number>` to run the full workflow end-to-end:
**read issue → plan → implement → commit → PR → merge → cleanup**

The skill enforces a plan approval gate — no code is written until the plan is explicitly approved.
