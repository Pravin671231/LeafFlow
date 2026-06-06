---
name: dev-workflow
description: Issue-to-PR development workflow for LeafFlow. Triggered by /dev-workflow <issue-number>. Executes the full 6-step lifecycle: read issue → plan → implement → commit → PR → merge → cleanup.
---

# LeafFlow Dev Workflow

Execute the following six steps in order. Stop and wait for explicit user confirmation at each gate before continuing. Never skip a step or merge without all checks passing.

---

## Step 1 — Read the Issue

Run:
```bash
gh issue view <issue-number> --repo Pravin671231/LeafFlow
```

Then write a structured summary:
- **Goal**: One sentence on what the issue delivers.
- **Requirements**: Every task checkbox from the issue body.
- **Acceptance Criteria**: Copied verbatim from the issue's AC section.
- **Affected workspaces**: Which of `Backend`, `buyer-app`, `admin-app` are touched.

Ask: "Does this summary look correct? Should I proceed to planning?"
**Wait for confirmation before continuing.**

---

## Step 2 — Create Branch and Enter Plan Mode

### 2a. Derive branch name

Convention: `feature/<issue-number>-<scope>` where `<scope>` is 2–4 kebab-case words from the issue title.
Example: issue #62 "E2E CI Gate Activation" → `feature/62-e2e-ci-gate-activation`

Show the proposed name and ask for confirmation or a custom name.

### 2b. Create and checkout the branch

```bash
git fetch origin develop
git checkout develop
git pull origin develop
gh issue develop <issue-number> --base develop --name <branch-name> --checkout
```

`gh issue develop` registers the branch in the GitHub issue's "Development" sidebar (works even on closed issues) and checks it out locally. Verify with `git branch --show-current`.

If the branch already exists, check it out with `git checkout <branch-name>` and inform the user.

### 2c. Plan in Plan Mode

Enter Plan Mode and produce a step-by-step implementation plan:
1. Every file to create or modify, with what changes and why.
2. New npm dependencies if any.
3. Test files to write or update.
4. Environment variable or config changes.

Format as a numbered checklist with file paths and function names. Be specific.

Present and ask: "Does this plan look correct? Should I proceed with implementation?"
**Do not write any code until the user approves. Exit Plan Mode after approval.**

---

## Step 3 — Implement

With the plan approved and Plan Mode exited, implement all changes in the approved order. Follow CLAUDE.md conventions:
- TypeScript + CommonJS for Backend; Vitest + Supertest for backend tests.
- Vitest + Testing Library for frontend tests; MSW for API mocks.
- ESLint flat config, Prettier (100-char, trailing commas, 2-space indent).
- Error shape: `{ success: false, code: string, message: string }`.

After implementation, list every file created/modified.

---

## Step 4 — Commit

Stage specific files (never `git add -A` blindly) and commit:

```
<type>(<scope>): <description> (Issue #<N>)
```

Types: `feat`, `fix`, `test`, `chore`, `docs`, `refactor`
Scopes: `backend`, `buyer-app`, `admin-app`, `ci`, `infra`, `e2e`

If the changeset spans workspaces, use the primary scope and mention others in the commit body.

---

## Step 5 — Create PR and Verify

### 5a. Push
```bash
git push -u origin <branch-name>
```

### 5b. Create PR
```bash
gh pr create \
  --base develop \
  --title "<type>(<scope>): <same as commit subject>" \
  --body "$(cat <<'EOF'
## Summary
- <bullet>

## Changes
- <file/component and why>

## Issue
Closes #<issue-number>

## Test plan
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] Backend health check passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

`Closes #<N>` auto-closes the issue on merge.

### 5c. Pre-merge checks — run sequentially, stop on failure

**Tests:**
```bash
npm run test
```

**Build:**
```bash
npm run build
```

**Backend start check (PowerShell):**
```powershell
npm run build --workspace backend
$proc = Start-Process -NoNewWindow -PassThru npm -ArgumentList 'run','start','--workspace','backend'
Start-Sleep 4
$code = (Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing -ErrorAction SilentlyContinue).StatusCode
Stop-Process -Id $proc.Id -Force
if ($code -ne 200) { Write-Error "Health check FAILED — HTTP $code"; exit 1 }
Write-Host "Health check passed (HTTP 200)"
```

Report to the user if any check fails. **Do not merge until all three pass.**

### 5d. Watch CI
```bash
gh pr checks --watch
```

Do not merge if any CI check is red.

### 5e. Merge
```bash
gh pr merge --squash --delete-branch
```

`--squash` collapses commits (matching project strategy). `--delete-branch` removes the remote branch automatically.

---

## Step 6 — Cleanup

Switch back to `develop`, pull, and delete the local branch:

```bash
git checkout develop
git pull origin develop
git branch -d <branch-name>
```

If `-d` fails (squash merge divergence), use `-D`:
```bash
git branch -D <branch-name>
```

Verify remote branch is gone:
```bash
git fetch --prune
git branch -r | grep <branch-name>
```

If still present, delete manually:
```bash
gh api repos/Pravin671231/LeafFlow/git/refs/heads/<branch-name> --method DELETE
```

Final report to user:
- PR number and URL
- Issue number (now closed)
- Branch deleted locally and remotely
- Squash commit SHA on `develop`

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Branch already exists | Check it out with `git checkout <branch-name>`, inform user |
| Test/build failure | Stop, show full output, ask user how to proceed — never auto-fix silently |
| CI check fails | Do not merge; report failing check name and URL; wait for user instruction |
| `git branch -d` fails after squash merge | Use `-D` only after confirming PR was merged on GitHub |
