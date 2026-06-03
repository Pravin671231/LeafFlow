# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LeafFlow is a single-seller e-commerce platform for ornamental plants, built as a monorepo with three workspaces:
- **Backend** — Node.js + Express 5 REST API (TypeScript, CommonJS)
- **buyer-app** — Next.js 16 customer-facing storefront (React 19, SSR)
- **admin-app** — Vite + React 19 seller dashboard (SPA)

## Commands

### Root (all workspaces)
```
npm run build          # build all workspaces
npm run lint           # ESLint across entire monorepo
npm test               # run tests in all workspaces
```

### Per-workspace dev servers
```
npm run dev --workspace backend       # Express on :3000 (tsx watch)
npm run dev --workspace buyer-app     # Next.js dev server on :3000
npm run dev --workspace admin-app     # Vite dev server on :5173
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
├── docs/SRS.md       Full software requirements spec
├── tsconfig.base.json
└── eslint.config.ts
```

### Backend structure
`src/app.ts` configures the Express app; `src/index.ts` starts the server and calls `connectDB()` (currently mocked — PostgreSQL is the planned target via `DATABASE_URL`). Scaffolded directories (`controllers/`, `routes/`, `services/`, `models/`, `schemas/`, `middleware/`) are empty and ready to populate.

### Frontend split rationale
- **buyer-app** uses Next.js for SSR/SEO on the public-facing storefront
- **admin-app** uses Vite for fast rebuilds on the internal seller dashboard

### Testing approach
All three workspaces use **Vitest** with **@testing-library/react** for UI and **Supertest** for HTTP assertions in the backend. Frontend tests mock API calls with **MSW** (server initialized in `vitest.setup.ts`). Test files live in `__tests__/` directories.

### Shared config
`tsconfig.base.json` defines base TypeScript settings (ES2023, NodeNext); each workspace extends it. ESLint uses the flat config format (`eslint.config.ts`). Prettier is configured via `.prettierrc` (100-char line width, trailing commas, 2-space indent).

## Next.js version warning

`buyer-app` targets **Next.js 16**, which has breaking changes from earlier versions. Before writing any Next.js code, read the relevant guide in `buyer-app/node_modules/next/dist/docs/` — APIs, conventions, and file structure may differ from training data.

## Environment setup

Copy `Backend/.env.example` to `Backend/.env` and fill in:
```
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/db
JWT_SECRET=...
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `master`:
1. Lint job — `npm run lint`
2. Test matrix — `test:coverage` for each workspace in parallel, uploads to Codecov
