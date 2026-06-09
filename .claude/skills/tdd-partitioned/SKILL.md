---
name: tdd-partitioned
description: TDD workflow with API-wise sub-issue decomposition for LeafFlow. Triggered by /tdd-partitioned <issue-number>. Executes a 7-step gated sequence: issue analysis → architecture review → test scenario design → sub-issue decomposition → sub-issue-wise TDD implementation → manual verification → PR/CI/merge.
---

# LeafFlow TDD Partitioned Workflow

Execute the following seven steps in order. Stop and wait for explicit user confirmation at each gate before continuing. Never skip a step, create GitHub issues, or merge without all checks passing.

**Key difference from `tdd-workflow`:** This skill breaks the issue into GitHub sub-issues (one per API endpoint group) and runs a TDD red-green cycle for each. This keeps commits focused and sub-issue traceability visible on GitHub.

---

## Step 1 — Issue Analysis

### 1.1 Read and explain the issue

```bash
gh issue view <issue-number> --repo Pravin671231/LeafFlow
```

Produce a structured summary:

- **Goal**: One sentence on what the issue delivers.
- **Problem Explanation**: A plain-English paragraph — what pain or gap exists today, who is affected, and why this issue fixes it.
- **Requirements**: Every task checkbox from the issue body.
- **Acceptance Criteria**: Copied verbatim from the issue's AC section.
- **Affected workspaces**: Which of `Backend`, `buyer-app`, `admin-app` are touched.

### 1.2 Extract SRS features

Read `docs/SRS.md`. Find every §section relevant to this issue (search by feature name or §reference in the issue body). List them as:

```
§<number> <Section Name>
  - Key requirement 1
  - Key requirement 2
```

### 1.3 Extract SRS APIs

From `docs/SRS.md` §11 (API Overview), extract every endpoint for this feature:

| Method | Path | Description | Auth Required? |
|--------|------|-------------|----------------|
| GET    | /api/buyer/products | List all products | No |
| ...    | ...  | ...         | ...            |

### 1.4 Dependency check

Check the issue body for "blocked by" references. If any referenced issue is still open, warn:

> ⚠️ This issue is blocked by #<N> which is still open. Proceeding may cause conflicts. Continue anyway?

### 1.5 Derive branch name

Convention: `feature/<issue-number>-<scope>` where `<scope>` is 2–4 kebab-case words from the issue title.

Show the proposed name and ask for confirmation or a custom name. Then:

```bash
git fetch origin develop
git checkout develop
git pull origin develop
gh issue develop <issue-number> --base develop --name <branch-name> --checkout
```

Verify with `git branch --show-current`. If the branch already exists, check it out with `git checkout <branch-name>` and inform the user.

**Gate:** "Does this analysis look correct? Should I create the branch?"
**Wait for confirmation before continuing.**

---

## Step 2 — Architecture Review

### 2.1 Inspect src/ structure

List `Backend/src/` recursively. For each relevant directory (`models/`, `routes/`, `controllers/`, `services/`, `schemas/`, `middleware/`, `utils/`), note:
- Which files already exist (with a one-line description of what they contain)
- Which directories are empty stubs

### 2.2 Inspect __tests__ structure

List `Backend/__tests__/` recursively. Note:
- Existing test files and which feature they cover
- Naming conventions in use (`*.unit.test.ts`, `*.api.test.ts`, `*.middleware.test.ts`)
- Helper/setup files (e.g., `setup/testKeys.ts`, `helpers/seedAdmin.ts`)

### 2.3 File map

Produce a table of every file to create or modify for this issue:

| File path | Action | Purpose |
|-----------|--------|---------|
| `src/models/Product.ts` | Create | Mongoose schema for products |
| `src/routes/buyer/products.ts` | Create | Buyer product routes |
| `__tests__/products/products.api.test.ts` | Create | API integration tests |
| ... | ... | ... |

**Gate:** "Does this architecture map look correct? Proceed to test scenario design?"
**Wait for confirmation before continuing.**

---

## Step 3 — Test Scenario Design

### 3.1 Coverage baseline

Run:

```bash
npm run test:coverage:backend
```

Report the current baseline:

```
Statements: X%  Branches: X%  Functions: X%  Lines: X%
```

New tests must cover the gaps in this feature's code paths — do not re-test lines already green.

### 3.2 Map requirements to test cases

For every AC item and SRS requirement from Step 1, identify one or more test cases. Classify each as:
- **Unit** — isolated, no HTTP, no DB (services, utils, helpers, middleware in isolation)
- **API Integration** — full request → response via Supertest
- **Middleware** — middleware wired into a minimal test Express app

### 3.3 Plan Mode — test case table

Enter Plan Mode and present the complete test case table:

| ID | Description | Category | Method | Input | Expected |
|----|-------------|----------|--------|-------|----------|
| U1 | Product schema: required fields | Unit | TDD | Missing name field | ValidationError |
| I1 | GET /api/buyer/products — happy path | API | TDD+BDD | Given: 2 products seeded / When: GET / Then: 200 + array of 2 | 200 `{ success: true, data: [...] }` |
| M1 | Auth middleware: missing token | Middleware | TDD+BDD | Given: no Authorization header / When: request hits protected route / Then: 401 | `{ success: false, code: "UNAUTHORIZED" }` |

Use Given / When / Then format for all integration and middleware test cases.

Ask: "Do these test scenarios cover all the AC? Approve to write them to docs."
**Do not write any test files until approved. Exit Plan Mode after approval.**

### 3.4 Write scenario doc

Append the approved scenarios to `Backend/backend.test.scenario.md`:

```markdown
## Feature: <issue title>

### Unit Tests
| ID | Description | Input | Expected |
...

### API Integration Tests (Given/When/Then)
**I1 — <description>**
- Given: <precondition>
- When: <action>
- Then: <expected result>

### Middleware Tests (Given/When/Then)
**M1 — <description>**
- Given: ...
- When: ...
- Then: ...
```

### 3.5 Verify test file locations

Confirm each new test file path follows the naming pattern from Step 2.2 (`__tests__/<feature>/<feature>.api.test.ts`, etc.) before writing any files.

---

## Step 4 — Sub-Issue Decomposition

### 4.1 Identify improvements

Scan the existing code files from Step 2.1 for:
- Typos in variable or file names (e.g., `sechemas/` directory)
- Missing error handling
- Inconsistent naming patterns
- Stale TODO comments

Group these into one **"[Improve]"** sub-issue. This sub-issue is always first so the codebase is clean before new API code lands.

### 4.2 Group APIs into sub-issues

Using the endpoint table from Step 1.3, group related endpoints into logical sub-issues. Guidelines:
- Single complex endpoints (with multiple error cases) → their own sub-issue
- Simple paired endpoints (GET list + GET detail) → one sub-issue
- Each sub-issue maps to the test IDs from Step 3 that cover it

### 4.3 Plan Mode — sub-issue table

Enter Plan Mode and present the sub-issue breakdown:

| # | Title | Scope | Test IDs | Depends on |
|---|-------|-------|----------|------------|
| 1 | [Improve] <description> | refactor/backend | — | — |
| 2 | <feature> model + schema | models/schemas | U1–U3 | #1 |
| 3 | GET /api/... | routes/controllers | I1–I4 | #2 |
| 4 | POST /api/... | routes/controllers | I5–I8, M1 | #2 |

### 4.4 Gate

Ask: "Does this sub-issue breakdown look correct? You can merge, split, or rename any item."
**Do not create any GitHub issues until approved. Exit Plan Mode after approval.**

### 4.5 Create sub-issues on GitHub

For each approved sub-issue:

```bash
gh issue create \
  --repo Pravin671231/LeafFlow \
  --title "[Sub #<N>] <title> (Issue #<parent>)" \
  --body "Part of #<parent>.\n\n## Scope\n<scope>\n\n## Tests\n<test IDs>" \
  --label "sub-issue"
```

Report all created sub-issue numbers before continuing.

---

## Step 5 — Implementation Loop

Repeat the following for **each sub-issue** in order from Step 4. Work on one sub-issue at a time.

---

### 5.1 Announce current sub-issue

Print a header:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sub-issue #<N> — <title>
Tests to cover: <test IDs from Step 4>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5.2 Plan Mode — implementation plan

Enter Plan Mode and produce a file-by-file plan:
1. Each file to implement, with the functions/exports it must provide.
2. New npm dependencies if any.
3. Environment variable or config changes.
4. Order of implementation (dependencies first).

Ask: "Does this implementation plan look correct? Should I proceed?"
**Do not write any implementation code until approved. Exit Plan Mode after approval.**

### 5.3 Verify branch

```bash
git branch --show-current
```

Confirm the output is `feature/<issue-number>-<scope>`. If not, stop and ask the user.

### 5.4 Write failing tests (RED phase)

Scaffold the test file for this sub-issue and write all test cases from the scenario doc. Import only from the file stubs (no real logic yet).

### 5.5 Run tests — verify RED

```bash
npm run test:backend
```

All new tests for this sub-issue must FAIL. If any pass unexpectedly, investigate before continuing — the stub may already have logic or the test is not asserting correctly.

Report the failure count to the user.

### 5.6 Implement

With the plan approved, implement all code in the approved order. Follow CLAUDE.md conventions:
- TypeScript + CommonJS for Backend
- Error shape: `{ success: false, code: string, message: string }`
- ESLint flat config, Prettier (100-char, trailing commas, 2-space indent)

### 5.7 Run tests + build — verify GREEN

```bash
npm run test:backend
npm run build
```

All tests must pass and the build must be clean. List any still-failing tests with their error output.

### 5.8 Error loop (max 3 rounds)

If 5.7 fails:
1. Enter Plan Mode — list every failure with root cause.
2. Ask: "Here are the failures. Confirm to apply fixes."
3. After confirmation, implement fixes and re-run 5.7.
4. Repeat up to 3 times. If still failing after 3 rounds, stop and ask the user how to proceed.

### 5.9 Commit

Stage only files relevant to this sub-issue and commit:

```bash
git add <specific files>
git commit -m "feat(backend): implement <sub-issue scope> (Issue #<parent-N>)"
```

### 5.10 Close sub-issue

```bash
gh issue close <sub-issue-number> \
  --repo Pravin671231/LeafFlow \
  --comment "Implemented in commit $(git rev-parse --short HEAD)."
```

---

*Loop back to 5.1 for the next sub-issue.*

---

**Gate (after all sub-issues complete):** "All sub-issues implemented and committed. Proceed to manual verification?"
**Wait for confirmation before continuing.**

---

## Step 6 — Manual Verification

### 6.1 Sub-issue checklist

Print a completion summary:

```
Sub-issue completion:
  [✓] #N — <title>   (commit <sha>)
  [✓] #N — <title>   (commit <sha>)
  ...
```

### 6.2 Health check

```powershell
npm run build --workspace backend
$proc = Start-Process -NoNewWindow -PassThru npm -ArgumentList 'run','start','--workspace','backend'
Start-Sleep 4
$code = (Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing -ErrorAction SilentlyContinue).StatusCode
Stop-Process -Id $proc.Id -Force
if ($code -ne 200) { Write-Error "Health check FAILED — HTTP $code"; exit 1 }
Write-Host "Health check passed (HTTP 200)"
```

### 6.3 Guided manual API test

For each endpoint from Step 1.3, print the exact curl command and the expected response. Ask the user to run each one and confirm before proceeding to the next:

```
▶ Test: <Method> <Path>
  curl -s <url> [headers] [body] | jq .
  Expected HTTP: <status>
  Expected body: <shape or example>

Run this and confirm: pass / fail?
```

Wait for the user to confirm each endpoint before printing the next.

### 6.4 Final run

```bash
npm run test:backend
npm run build
```

Both must pass. Do not continue if either fails.

**Gate:** "All manual checks passed. Proceed to create the PR?"
**Wait for confirmation before continuing.**

---

## Step 7 — PR, CI, Merge

### 7.1 Coverage report

```bash
npm run test:coverage:backend
```

Report: Statements X% | Branches X% | Functions X% | Lines X%

If any critical path (controller, service, middleware) is below 80%, flag the uncovered lines and ask the user whether to add tests or accept the gap before creating the PR.

### 7.2 Push and create PR

```bash
git push -u origin <branch-name>
```

```bash
gh pr create \
  --base develop \
  --title "feat(backend): <description> (Issue #<N>)" \
  --body "$(cat <<'EOF'
## Summary
- <bullet>

## Sub-issues
- #N — <title> ✓
- #N — <title> ✓

## Changes
- <file — what and why>

## Test Coverage
- Statements: X%  Branches: X%  Functions: X%  Lines: X%
- Unit: X passed  |  API Integration: X passed  |  Middleware: X passed

## Issue
Closes #<issue-number>

## Test plan
- [ ] All unit tests pass
- [ ] All API integration tests pass
- [ ] All middleware tests pass
- [ ] `npm run build` clean
- [ ] `GET /health` returns HTTP 200
- [ ] Coverage on critical paths ≥ 80%
- [ ] All sub-issues closed
EOF
)"
```

### 7.3 Watch CI

```bash
gh pr checks --watch
```

Do not merge if any CI check is red. Report the failing check name and URL and wait for user instruction.

### 7.4 Merge

```bash
gh pr merge --squash --delete-branch
```

### 7.5 Cleanup

```bash
git checkout develop
git pull origin develop
git branch -d <branch-name>
```

If `-d` fails after squash merge, use `-D`. Verify remote branch is gone:

```bash
git fetch --prune
git branch -r | grep <branch-name>
```

### 7.6 Close parent issue

If not auto-closed by `Closes #N` in the PR body:

```bash
gh issue close <issue-number> --repo Pravin671231/LeafFlow --comment "Implemented in PR #<pr-number>."
```

### 7.7 Final report

```
TDD Partitioned Workflow Complete — Issue #<N>

PR:            #<pr> — <url>
Merge:         squash commit <sha> on develop
Sub-issues:    #N ✓  #N ✓  #N ✓  (all closed)
Coverage:      Statements X% | Branches X% | Functions X% | Lines X%
Tests:         Unit X | API X | Middleware X — all passed
Branch:        deleted locally and remotely
Issue:         #<N> closed
```

---

## Example Walkthrough — Issue #45 "Product Catalog API"

Below is a concrete preview of what each key step produces for a hypothetical M5 issue.

### Step 1 output

```
Goal: Expose product + category read/write endpoints for the admin and buyer apps.

Problem: Today buyers cannot browse the plant catalog and admins cannot manage inventory
because all /api/buyer/products and /api/admin/products routes are unimplemented. This
blocks the buyer storefront (buyer-app) and the admin dashboard (admin-app) from doing
anything useful after login.

SRS Features:
  §4.2 Product Browse — filter, sort, paginate public product list
  §5.1 Admin Product Management — CRUD for products and categories
  §10  Data Models — Product, Category schemas

APIs (6 endpoints):
  Method | Path                           | Description               | Auth?
  GET    | /api/buyer/products            | Paginated product list    | No
  GET    | /api/buyer/products/:id        | Single product detail     | No
  GET    | /api/buyer/categories          | All categories            | No
  POST   | /api/admin/products            | Create product            | Admin JWT
  PUT    | /api/admin/products/:id        | Update product            | Admin JWT
  DELETE | /api/admin/products/:id        | Delete product            | Admin JWT

Branch: feature/45-product-catalog-api
```

### Step 4 sub-issue table (Plan Mode)

```
# | Title                                   | Scope              | Test IDs       | Depends on
1 | [Improve] Rename sechemas → schemas dir | refactor/backend   | —              | —
2 | Product + Category models & Zod schemas | models/schemas     | U1–U4          | #1
3 | GET /api/buyer/products + categories    | routes/controllers | I1–I6          | #2
4 | GET /api/buyer/products/:id             | routes/controllers | I7–I10         | #2
5 | POST /api/admin/products                | routes/controllers | I11–I15, M1    | #2
6 | PUT + DELETE /api/admin/products/:id    | routes/controllers | I16–I21, M2    | #5
```

### Step 5 sub-issue header

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sub-issue #82 — Product + Category models & Zod schemas
Tests to cover: U1 (Product schema required fields), U2 (Category schema),
                U3 (Zod Product validation), U4 (Zod Category validation)
Branch: feature/45-product-catalog-api ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 6 curl examples

```
▶ Test: GET /api/buyer/products
  curl -s http://localhost:3000/api/buyer/products | jq .
  Expected HTTP: 200
  Expected body: { "success": true, "data": [], "total": 0 }

  Run this and confirm: pass / fail?

▶ Test: POST /api/admin/products (missing auth)
  curl -s -X POST http://localhost:3000/api/admin/products \
    -H "Content-Type: application/json" -d '{"name":"Rose"}'
  Expected HTTP: 401
  Expected body: { "success": false, "code": "UNAUTHORIZED", "message": "..." }

  Run this and confirm: pass / fail?
```

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Branch already exists | Check it out with `git checkout <branch-name>`, inform user |
| Blocked-by issue is open | Warn the user, ask whether to continue or pause |
| Tests not all red in Step 5.5 | Investigate — stub may already have logic, or test is not asserting; fix before continuing |
| Test / build failure in Step 5.7 | Enter error loop (max 3 rounds); show full output; escalate to user if unresolved |
| Sub-issue close fails | Warn the user, skip and continue — do not block the implementation loop |
| Coverage below 80% on critical path | Flag uncovered lines, ask user to add tests or accept gap — never silently skip |
| CI check red | Do not merge; report failing check name and URL; wait for user instruction |
| Health check fails | Show HTTP status; stop; do not create PR until resolved |
| Manual test fails | Mark the curl test as failed, stop, ask the user whether to fix or accept |
