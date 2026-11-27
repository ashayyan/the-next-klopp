---
phase: 01-setup-contracts
plan: 09
subsystem: infra
tags: [ci, github-actions, branch-protection, gitleaks, windows-smoke]

requires:
  - phase: 01-08
    provides: docs/SETUP.md
provides:
  - .github/workflows/ci.yml with six jobs (lint, typecheck, test, build, guards, windows-smoke)
  - .github/branch-protection.json and .github/ruleset-main.json payloads
  - main protected on GitHub (classic protection, six required checks)
  - docs/decisions/0007-branch-protection.md and the SETUP.md GitHub section
  - open PR #1 gsd/phase-1-setup-contracts to main
affects: [phase end merge, every later phase PR]

requirements-completed: [SETUP-03 (protection, PR open), SETUP-04 (workflow written)]
requirements-blocked: [PLAT-01 CI proof (windows-smoke has not run)]

actuals:
  tokens: 14000
  tasks: 2
  commits: 2
plan_head_before: a1156e1b8ed6c67dad03d86ab24c49d957062131
plan_head_after: 4ddea0df9a6a2841e46bcfa2f4181fb48e6c3d2b

tech-stack:
  added: ["actions/checkout v7", "actions/setup-node v7", "gitleaks-action v3.0.0 (SHA e0c47f4f8be3)"]
  patterns:
    - "CI job keys equal the required-check contexts"
    - "Third-party action pinned by commit SHA; first-party actions on major tags"

key-files:
  created:
    - .github/workflows/ci.yml
    - .github/branch-protection.json
    - .github/ruleset-main.json
    - docs/decisions/0007-branch-protection.md
  modified:
    - docs/SETUP.md

key-decisions:
  - "GitHub accepted classic protection on the private repo (HTTP 200), so platform protection is in force, not the hook fallback"
  - "The ruleset created by mistake in the same run was deleted to avoid two overlapping rules"

status: partial
---

# Phase 1 Plan 09: CI, Branch Protection and Phase PR Summary

Status: PARTIAL. Tasks 1 and 2 are done. Task 3 is blocked: the PR is open but none of the six CI jobs can start because of a GitHub account billing problem that only the learner can fix.

CI workflow written and the full local suite passes, `main` is protected with the six required checks, and PR #1 is open. The CI jobs fail in 2 seconds with no steps: GitHub reports "The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings".

## Tasks

| # | Task | Commit | State |
|---|------|--------|-------|
| 1 | CI workflow, protection payloads, full local suite | `778a08c` | done |
| 2 | Protect main, ADR 0007, SETUP.md GitHub section | `4ddea0d` | done |
| 3 | Push, open PR, drive six checks green | n/a (no repo change needed) | PR open, checks blocked by billing |

## Task 1 evidence

Local suite, all passed: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run smoke`, `npm run smoke:dev`, `node scripts/verify-setup.ts all`, `node scripts/guard-files.ts --tracked` (102 files ok). The one `error` line in the log is the expected duplicate dev-server start rejection from `smoke:dev`. Acceptance greps: six job keys, `path: klopp checkout`, `fetch-depth: 0`, `contents: read`, gitleaks pinned by 40-hex SHA `e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e` (v3.0.0 tag, lightweight, resolves directly to a commit), `pull_request_target` count 0.

## Task 2 evidence (branch protection)

- `gh api --include -X PUT .../branches/main/protection --input .github/branch-protection.json`: `HTTP/2.0 200 OK`. Not refused. Account plan reads `null` in the API, yet GitHub accepted the rule.
- GET confirmation: required checks `build,guards,lint,test,typecheck,windows-smoke`, strict true, enforce_admins true, 0 approvals with PR required, force pushes off, deletions off.
- Repo still `PRIVATE`. Secret scanning (`security_and_analysis`) is `null`: gitleaks in CI plus the local guard are the controls.
- Token scopes: gist, read:org, repo, workflow.

## Task 3 evidence

- `git push -u origin gsd/phase-1-setup-contracts` succeeded.
- PR: https://github.com/ashayyan/the-next-klopp/pull/1 (base `main`, state OPEN, body ends with the Claude Code attribution line).
- Run 46055177347: all six jobs `failure` in 2 seconds with zero steps. Check-run annotation message: "The job was not started because recent account payments have failed or your spending limit needs to be increased." A rerun gave the same result, so it is not transient.
- No workflow log exists (`gh run view --log-failed` returns "log not found"), so the fix is not in the repo. No `fix(ci)` rounds were spent, because a code change cannot start a job that never launches.
- The `Devin Review` check on the PR passed (not part of the six).
- `gh api users/ashayyan/settings/billing/actions` needs the `user` scope, which the token lacks, so the exact limit could not be read.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Ruleset created although protection succeeded**
- **Found during:** Task 2
- **Issue:** both API calls ran in one command, so a ruleset (`protect-main`, id 28257248) was created on top of the working classic protection. The plan only calls for the ruleset after a refusal.
- **Fix:** deleted the ruleset (`HTTP/2.0 204`); `GET /rulesets` returns an empty list. Recorded in ADR 0007 and SETUP.md.
- **Files modified:** none
- **Commit:** n/a

## Blocker for the learner

Fix GitHub billing: open GitHub, Settings, Billing & plans, update the failed payment method or raise the Actions spending limit (private repos need Actions minutes; the Windows job costs more minutes than Linux). Then re-run: `gh run rerun 46055177347` (or push any commit). Expected result: six green checks. If any job then fails for a code reason, fix it with `fix(ci)` commits (the workflow is unrun on GitHub, so small fixes are plausible, RESEARCH A8).

## Open items after billing is fixed

- Confirm `gh pr checks gsd/phase-1-setup-contracts` shows `build,guards,lint,test,typecheck,windows-smoke` all SUCCESS.
- PR stays open; merge at phase end with `gh pr merge --merge` after the final docs commits go green.
- Because protection is enforced with admins and `strict`, `main` cannot be merged until all six checks pass, so the billing fix is required for the phase to close.

## Known Stubs

None.

## Threat Flags

None. T-01-35 (read-only token, plain `pull_request`), T-01-36 (gitleaks pinned by SHA), T-01-37 (platform protection active), T-01-38 (full-history gitleaks plus guard in the workflow, unrun), T-01-39 (no token text in docs or PR body) mitigations applied.

## Self-Check: PASSED (for tasks 1 and 2)

- FOUND: .github/workflows/ci.yml, .github/branch-protection.json, .github/ruleset-main.json, docs/decisions/0007-branch-protection.md
- Commits `778a08c` and `4ddea0d` are ancestors of HEAD.
- NOT MET: six green CI checks (billing block).
