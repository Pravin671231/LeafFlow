---
name: release-flow
description: Develop-to-master milestone release flow for LeafFlow. Triggered by /release-flow. Executes a 13-step gated sequence: milestone selection → open issue check → AC verification → diff preview → test/build/runtime validation → PR creation → self review → CI gate → merge → tag → close milestone → watch deploy → final report.
---

# LeafFlow Release Flow

Execute the following 13 steps in order. Stop and wait for explicit user confirmation at every gate. Never skip a step or merge without all checks passing.

---

## Step 1 — Milestone Selection

Ask the user to enter the milestone in the format: `M6-Commerce (Cart & Checkout)`

Then run:
```bash
gh milestone list --repo Pravin671231/LeafFlow
```

Confirm the entered milestone exists and is open. Display:
- Title
- Due date
- Open issue count
- Closed issue count

Ask: "Is this the correct milestone for this release? Proceed to open issue check?"
**Wait for confirmation before continuing.**

---

## Step 2 — Open Issue Check

Run:
```bash
gh issue list --milestone "<milestone-name>" --state open --repo Pravin671231/LeafFlow
```

**If any open issues are found:**
List them with `#N | Title | Assignee`. Then stop:
> "The following issues are still open. Close or re-scope them before this release can proceed."
**Do not continue until user resolves all open issues.**

**If all issues are closed:**
Run:
```bash
gh issue list --milestone "<milestone-name>" --state closed --repo Pravin671231/LeafFlow
```
Display the full list in `#N — Title` format and confirm the count.

---

## Step 3 — AC Verification

Run:
```bash
gh issue list --milestone "<milestone-name>" --state closed --repo Pravin671231/LeafFlow --json number,title,body
```

Parse and display a checklist table for every closed issue:

```
| #  | Title                        | AC Verified? |
|----|------------------------------|-------------|
| #42 | Add cart model              | [ ]         |
| #43 | Checkout flow               | [ ]         |
```

Instruct the user:
> "Open each issue on GitHub, verify its Acceptance Criteria were met, and confirm here."

Ask: "Have all Acceptance Criteria been verified? Type 'confirmed' to continue."
**Wait for 'confirmed' before continuing.**

---

## Step 4 — Diff Preview

Run:
```bash
git fetch origin
git log origin/master..origin/develop --oneline
```

Display the full commit list entering master.

Then run:
```bash
git diff --stat origin/master...origin/develop
```

Display the file-level change summary.

Ask: "Does this diff look correct for the milestone? Proceed to validation?"
**Wait for confirmation before continuing.**

---

## Step 5 — Validation (Test → Build → Runtime)

Run each check sequentially. **Stop immediately on failure** — never proceed to PR creation if any check fails.

### 5a. Tests
```bash
npm test
```

### 5b. Build
```bash
npm run build
```

### 5c. Runtime Health Check (PowerShell)
```powershell
npm run build --workspace backend
$proc = Start-Process -NoNewWindow -PassThru npm -ArgumentList 'run','start','--workspace','backend'
Start-Sleep 4
$code = (Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing -ErrorAction SilentlyContinue).StatusCode
Stop-Process -Id $proc.Id -Force
if ($code -ne 200) { Write-Error "Health check FAILED — HTTP $code"; exit 1 }
Write-Host "Health check passed (HTTP 200)"
```

Report pass/fail for each check. On failure: show the full output and ask the user how to proceed.
**Never auto-fix. All fixes must happen on `develop` — never on `master`.**

---

## Step 6 — PR Creation

```bash
gh pr create \
  --base master \
  --head develop \
  --title "chore(release): <milestone-name>" \
  --body "$(cat <<'EOF'
## Milestone
<milestone-name>

## Issues Included
- #N Title
- #N Title

## Pre-Merge Checklist
- [x] All milestone issues closed
- [x] All Acceptance Criteria verified
- [x] Diff reviewed
- [x] Tests passed
- [x] Build passed
- [x] Runtime health check passed (HTTP 200)

## Deploy
Render deploy triggers automatically on merge to master via `deploy-render.yml`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Display the PR URL to the user.

---

## Step 7 — Self Review

Print the PR URL and instruct:
> "Open the PR on GitHub and review the full diff. Confirm all changes are correct and nothing unexpected is included."

Ask: "Have you reviewed the PR and are satisfied with the changes? Type 'approved' to continue."
**Wait for 'approved' before continuing.**

---

## Step 8 — CI Green

```bash
gh pr checks --watch
```

Wait for all CI checks to pass.

If any check is red: stop, report the failing check name and its URL, and wait for user instruction.
**Do not merge until every check is green.**

---

## Step 9 — Merge

```bash
gh pr merge --squash
```

Do **not** use `--delete-branch` — the `develop` branch must be preserved.

Confirm merge:
```bash
gh pr view --json mergedAt,mergeCommit
```

Display the squash commit SHA.

---

## Step 10 — Tag Release

Ask: "What version tag for this release? (e.g. v0.6.0)"

Pull master and create an annotated tag:
```bash
git checkout master
git pull origin master
git tag -a <version> -m "<milestone-name>"
git push origin <version>
```

Confirm tag pushed:
```bash
gh release list --repo Pravin671231/LeafFlow --limit 3
```

---

## Step 11 — Close Milestone

Get the milestone number:
```bash
gh api repos/Pravin671231/LeafFlow/milestones --jq '.[] | select(.title=="<milestone-name>") | .number'
```

Close it:
```bash
gh api repos/Pravin671231/LeafFlow/milestones/<id> --method PATCH -f state=closed
```

Confirm: "Milestone `<milestone-name>` is now closed."

---

## Step 12 — Watch Deploy

List the latest deploy workflow run:
```bash
gh run list --workflow deploy-render.yml --repo Pravin671231/LeafFlow --limit 1
```

Watch it:
```bash
gh run watch <run-id> --repo Pravin671231/LeafFlow
```

Report success or failure. If the deploy fails: show the failed step URL and wait for user instruction before reporting done.

---

## Step 13 — Final Report

Switch back to develop and pull:
```bash
git checkout develop
git pull origin develop
```

Print a release summary:

```
Release Complete — <milestone-name>

PR:        #N — <url>
Merge:     squash commit <sha> on master
Tag:       <version> pushed to origin
Milestone: closed
Deploy:    Render deploy succeeded / FAILED (see <url>)

develop branch preserved and up to date.
```

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Open issues found in Step 2 | Stop, list blockers, do not continue until resolved |
| AC not confirmed in Step 3 | Do not proceed until user types 'confirmed' |
| Test / build / runtime failure in Step 5 | Stop, show full output, ask how to proceed — fix on `develop` only |
| CI check red in Step 8 | Do not merge; report check name and URL; wait for user instruction |
| Deploy fails in Step 12 | Report failed step URL; wait for user instruction before final report |
