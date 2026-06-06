# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LeafFlow is a single-seller e-commerce platform for ornamental plants, built as a monorepo with three workspaces:
- **Backend** — Node.js + Express 5 REST API (TypeScript, CommonJS), backed by MongoDB via Mongoose
- **buyer-app** — Next.js 16 customer-facing storefront (React 19, SSR, App Router)
- **admin-app** — Vite 8 + React 19 seller dashboard (SPA)

**Current state (June 2026):** Scaffold + Docker complete (M0–M2). Auth, catalog, and commerce features are not yet implemented. `Backend` exposes only `GET /health`. `connectDB()` in `src/index.ts` is mocked — real Mongoose connection comes in M4 (issue #14).

## Commands

### Local dev (Docker — preferred)
```
make dev       # start all 4 services (mongo, backend, buyer-app, admin-app) with hot reload
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

### Backend structure (planned — populate from SRS §9.1)
`src/app.ts` configures the Express app; `src/index.ts` starts the server and calls `connectDB()` (currently mocked). Scaffolded directories are empty and ready to populate per this layout:
```
src/
├── config/       # env, db, razorpay, r2 init
├── controllers/
├── middleware/   # auth, validate, errorHandler
├── models/       # Mongoose schemas
├── routes/       # /api/admin, /api/buyer, /api/webhooks
├── services/     # otp, email, payment, storage
├── schemas/      # Zod request schemas
└── utils/
```
API base: `/api`. Error shape: `{ success: false, code: string, message: string }`.

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

### Key data models (MongoDB/Mongoose — implement in M4–M6)
`Admin`, `OtpSession`, `RefreshToken` (M4) → `User`, `Category`, `Product` (M5) → `Cart`, `Order`, `Payment` (M6). See SRS §10 for full field lists.

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
