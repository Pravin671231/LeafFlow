---
name: tdd-workflow
description: TDD-first issue-to-PR workflow for LeafFlow. Triggered by /tdd-workflow <issue-number>. Executes a 7-step gated sequence:> read issue → branch → scaffold → test scenarios (red) → implement (green) → verify → commit/PR/close.
---

# LeafFlow TDD Workflow

Execute the following seven steps in order. Stop and wait for explicit user confirmation at each gate before continuing. Never skip a step or merge without all checks passing.

---

## Step 1 — Read the Issue

Run:
```bash
gh issue view <issue-number> --repo Pravin671231/LeafFlow
```

Write a structured summary:
- **Goal**: One sentence on what the issue delivers.
- **Requirements**: Every task checkbox from the issue body.
- **Acceptance Criteria**: Copied verbatim from the issue's AC section.
- **Affected workspaces**: Which of `Backend`, `buyer-app`, `admin-app` are touched.

Ask: "Does this summary look correct? Should I proceed to create the branch?"
**Wait for confirmation before continuing.**

---

## Step 2 — Create Branch

### 2a. Derive branch name

Convention: `feature/<issue-number>-<scope>` where `<scope>` is 2–4 kebab-case words from the issue title.
Example: issue #57 "Structured Logging" → `feature/57-structured-logging`

Show the proposed name and ask for confirmation or a custom name.

### 2b. Create and checkout the branch

```bash
git fetch origin develop
git checkout develop
git pull origin develop
gh issue develop <issue-number> --base develop --name <branch-name> --checkout
```

`gh issue develop` registers the branch in the GitHub issue's "Development" sidebar and checks it out locally. Verify with `git branch --show-current`.

If the branch already exists, check it out with `git checkout <branch-name>` and inform the user.

---

## Step 3 — Architecture Review & Scaffold

### 3a. Read relevant SRS section

Read `docs/SRS.md` — find the section(s) relevant to this issue (search by feature name or §reference from the issue body). Extract:
- What routes/endpoints are needed
- What models/schemas are involved
- What middleware applies
- Any NFRs (performance, security, observability)

### 3b. Identify files to create

Based on the SRS and issue tasks, list every file to create or modify:
- `src/models/` — Mongoose schemas
- `src/routes/` — Express routers
- `src/controllers/` — request handlers
- `src/services/` — business logic
- `src/schemas/` — Zod validation schemas
- `src/middleware/` — auth, validate, error handlers
- `src/lib/` or `src/utils/` — shared utilities
- `__tests__/` — test files (unit + integration)

### 3c. Scaffold empty files

Create each file with the correct path and a minimal export stub (no logic). This establishes the module graph before tests are written.

Present the full file list and ask: "Does this scaffold look correct? Proceed to test scenarios?"
**Wait for confirmation before continuing.**

---

## Step 4 — Test Scenarios

### 4a. Reference SRS

Extract from `docs/SRS.md` all functional and non-functional requirements for this feature. Map each requirement to one or more test cases.

### 4b. Split into unit and integration test cases

Build a feature-based test case list:

**Unit tests (TDD)** — isolated, no HTTP, no DB:
- Utils, pure functions
- Service layer logic
- Helper functions
- Middleware in isolation (mock req/res)

**Integration tests (TDD + BDD)** — two categories:

*API tests* — full request → response cycle via Supertest:
- Happy path per endpoint (correct status code + body shape)
- Error cases (invalid input, missing auth, not found)
- Edge cases from AC

*Middleware tests* — middleware wired into a minimal test Express app:
- Auth middleware: valid token, expired token, missing token
- Validate middleware: valid body, invalid body, missing fields
- Error handler: correct error shape `{ success: false, code, message }`

### 4c. Plan Mode — present test case list

Enter Plan Mode and present the complete test case table:

| ID | Description | Category | Method | Input | Expected |
|----|-------------|----------|--------|-------|----------|
| U1 | ... | Unit | TDD | ... | ... |
| I1 | ... | API | TDD+BDD | Given... When... Then... | ... |
| M1 | ... | Middleware | TDD+BDD | Given... When... Then... | ... |

Use Given / When / Then format for all integration and middleware test cases.

Ask: "Do these test scenarios cover all the AC? Approve to write them to docs."
**Do not write any test files until approved. Exit Plan Mode after approval.**

### 4d. Write scenario doc

Write all approved test scenarios to `Backend/backend.test.scenario.md` in the format:

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

### 4e. Implement test files (red phase)

Write all test files based on the approved scenarios. Follow the scaffolded file locations:
- Unit tests → `Backend/__tests__/<feature>.unit.test.ts`
- API integration tests → `Backend/__tests__/<feature>.api.test.ts`
- Middleware tests → `Backend/__tests__/<feature>.middleware.test.ts`

Use Vitest + Supertest. Import only from the scaffolded stubs — no real logic exists yet.

### 4f. Run tests — verify RED

```bash
npm run test:backend
```

All tests must fail. If any test passes unexpectedly, investigate before continuing — it likely means the stub already has logic or the test is not asserting correctly.

Report the failure count to the user. Ask: "All tests are red. Proceed to implementation?"
**Wait for confirmation before continuing.**

---

## Step 5 — Implementation

### 5a. Plan in Plan Mode

Enter Plan Mode and produce a file-by-file implementation plan to make every red test pass:
1. Each file to implement, with the functions/exports it must provide.
2. New npm dependencies if any.
3. Environment variable or config changes.
4. Order of implementation (dependencies first).

Ask: "Does this implementation plan look correct? Should I proceed?"
**Do not write any implementation code until approved. Exit Plan Mode after approval.**

### 5b. Implement

With the plan approved, implement all code in the approved order. Follow CLAUDE.md conventions:
- TypeScript + CommonJS for Backend
- Error shape: `{ success: false, code: string, message: string }`
- ESLint flat config, Prettier (100-char, trailing commas, 2-space indent)

### 5c. Run tests — verify GREEN

```bash
npm run test:backend
```

All tests must pass. List any still-failing tests and their error output.

### 5d. Run build

```bash
npm run build
```

No TypeScript errors allowed.

### 5e. Bug fix loop (max 3 rounds)

If 5c or 5d fails:
1. Enter Plan Mode — list every failure with root cause.
2. Ask: "Here are the failures. Confirm to apply fixes."
3. After confirmation, implement fixes and re-run 5c + 5d.
4. Repeat up to 3 times. If still failing after 3 rounds, stop and ask the user how to proceed.

### 5f. Gate

Ask: "All tests are green and build is clean. Proceed to verification?"
**Wait for confirmation before continuing.**

---

## Step 6 — Verification

### 6a. Plan Mode — verification checklist

Enter Plan Mode and produce a checklist mapping every AC item to a passing test:

```
[ ] AC: <item from issue> → Test I1 ✓
[ ] AC: <item> → Test U3 ✓
[ ] NFR: <item> → Test M2 ✓
```

Identify any AC item with no corresponding test. If found, flag it and ask whether to add a test or accept the gap.

Ask: "Does the verification checklist look complete?"
**Exit Plan Mode after confirmation.**

### 6b. Review AC coverage

Confirm every acceptance criterion from the issue is covered by at least one passing test.

### 6c. Health check (PowerShell)

```powershell
npm run build --workspace backend
$proc = Start-Process -NoNewWindow -PassThru npm -ArgumentList 'run','start','--workspace','backend'
Start-Sleep 4
$code = (Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing -ErrorAction SilentlyContinue).StatusCode
Stop-Process -Id $proc.Id -Force
if ($code -ne 200) { Write-Error "Health check FAILED — HTTP $code"; exit 1 }
Write-Host "Health check passed (HTTP 200)"
```

### 6d. Final run

```bash
npm run test:backend
npm run build
```

Both must pass before proceeding. Do not continue if either fails.

---

## Step 7 — Commit, PR, Close

### 7a. Step-wise commits

Stage and commit in logical units — do not bundle everything into one commit:

```
test(<scope>): add unit and integration test scenarios for <feature> (Issue #<N>)
feat(<scope>): scaffold <feature> files and types (Issue #<N>)
feat(<scope>): implement <feature> logic (Issue #<N>)
feat(<scope>): wire <feature> routes and middleware (Issue #<N>)
docs(<scope>): add test scenarios to backend.test.scenario.md (Issue #<N>)
```

Types: `feat`, `fix`, `test`, `chore`, `docs`, `refactor`
Scopes: `backend`, `buyer-app`, `admin-app`, `ci`, `infra`

### 7b. Check untracked files

```bash
git status
```

Review every untracked or modified file. Stage only files relevant to this issue. Do not stage `.env`, build artifacts, or unrelated changes.

### 7c. Run coverage

```bash
npm run test:coverage:backend
```

Report the coverage summary (statements %, branches %, functions %, lines %). If any critical path (controller, service, middleware) is below 80%, flag it and ask the user whether to add tests or accept the gap before creating the PR.

### 7d. Push and create PR

```bash
git push -u origin <branch-name>
```

```bash
gh pr create \
  --base develop \
  --title "<type>(<scope>): <description> (Issue #<N>)" \
  --body "$(cat <<'EOF'
## Summary
- <bullet>

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


EOF
)"
```

### 7e. Watch CI

```bash
gh pr checks --watch
```

Do not merge if any CI check is red. Report the failing check name and URL and wait for user instruction.

### 7f. Merge

```bash
gh pr merge --squash --delete-branch
```

### 7g. Cleanup

```bash
git checkout develop
git pull origin develop
git branch -d <branch-name>
```

If `-d` fails after squash merge, use `-D`:
```bash
git branch -D <branch-name>
```

Verify remote branch is gone:
```bash
git fetch --prune
git branch -r | grep <branch-name>
```

### 7h. Close issue

If the issue was not auto-closed by `Closes #N` in the PR body, close it manually:
```bash
gh issue close <issue-number> --repo Pravin671231/LeafFlow --comment "Implemented in PR #<pr-number>."
```

### 7i. Final report

```
TDD Workflow Complete — Issue #<N>

PR:        #<pr> — <url>
Merge:     squash commit <sha> on develop
Coverage:  Statements X% | Branches X% | Functions X% | Lines X%
Tests:     Unit X | API X | Middleware X — all passed
Branch:    deleted locally and remotely
Issue:     #<N> closed
```

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Branch already exists | Check it out with `git checkout <branch-name>`, inform user |
| Tests not all red in Step 4f | Investigate — stub may already have logic, or test is not asserting; fix before continuing |
| Test / build failure in Step 5 | Stop, show full output, enter bug fix loop (max 3×); escalate to user if unresolved |
| Coverage below 80% on critical path | Flag uncovered lines, ask user to add tests or accept gap — never silently skip |
| CI check red | Do not merge; report failing check name and URL; wait for user instruction |
| Health check fails | Show HTTP status; stop; do not create PR until resolved |
