---
phase: 01-setup-contracts
plan: 04
subsystem: infra
tags: [husky, git-hooks, guard, conventional-commits, vitest]

requires:
  - phase: 01-01
    provides: scripts/lib/guard.ts, scripts/guard-files.ts, .gitignore, .gitattributes, .env.example
  - phase: 01-03
    provides: Biome, Vitest config, lint-staged key in package.json
provides:
  - guard rejection tests (raw paths, oversize, runtime-built fake secrets, allowlist, self-scan, CLI exit codes)
  - ignore-file contract tests through git check-ignore
  - isConventionalCommit rule plus commit-msg CLI, tested against the repo's own history
  - husky pre-commit (guard then lint-staged), pre-push (main block, ALLOW_MAIN_PUSH override), commit-msg hooks
  - scripts/verify-setup.ts dispatcher and scripts/verify/hook.ts live hook proof
affects: [01-05, 01-06, 01-08 docs/SETUP.md, 01-09 CI guards job, ADR 0007]

requirements-completed: [SETUP-03, SETUP-04]

actuals:
  tokens: 14000
  tasks: 3
  commits: 3
plan_head_before: 4b533d1831ef4a2bdca53bfb07c79ffc3154c4fe
plan_head_after: d43f22e723ecd7182935500c988198f0d5bc307a

tech-stack:
  added: []
  patterns:
    - "Fake secrets are assembled at runtime from fragments so the guard and gitleaks never flag test files"
    - "verify-setup sections are discovered from scripts/verify/*.ts at run time; the directory listing is the only allowlist"
    - "Hook probes use `git hook run` with --to-stdin and never create a commit"

key-files:
  created:
    - scripts/guard.test.ts
    - scripts/repo-files.test.ts
    - scripts/lib/commit-msg.ts
    - scripts/commit-msg.ts
    - scripts/commit-msg.test.ts
    - .husky/pre-commit
    - .husky/pre-push
    - .husky/commit-msg
    - scripts/verify-setup.ts
    - scripts/verify/hook.ts
  modified: []

key-decisions:
  - "No change to scripts/lib/guard.ts was needed; every behaviour in the plan already held"
  - "hook.ts deletes HUSKY from the child env so an inherited HUSKY=0 cannot make the probes pass or fail for the wrong reason"
  - "Git version is parsed from `git --version` to decide on `git hook run` vs `sh .husky/<hook>` (running --help could open a pager or browser)"

status: complete
---

# Phase 1 Plan 04: Guard Tests and Husky Hooks Summary

The guard is proven to reject raw-data paths, oversized files and fake secrets, and three husky hooks (guard + lint-staged, main-push block, conventional-commit check) are installed and verified live without creating any commit.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | Guard and ignore-file tests (36 tests) | 60cf530 |
| 2 | Conventional-commit rule, CLI and tests (20 tests, includes full git-log regression) | d34e9b4 |
| 3 | Husky hooks, verify-setup dispatcher, hook verifier | d43f22e |

## Verification

- `npx vitest run`: 4 files, 59 tests pass.
- `node scripts/verify-setup.ts hook`: six probes pass, `verify hook: ok`; index clean and no `raw/` folder afterwards.
- `node scripts/verify-setup.ts all` runs hook, routing and skills sections, all ok (dispatcher picks up the 01-07 sections without edits).
- `node scripts/verify-setup.ts nope` exits 2 and lists `hook, routing, skills`.
- The Task 3 commit itself went through the live pre-commit and commit-msg hooks.
- `git ls-files -s .husky/*` shows mode 100755 for all three hooks; `core.hooksPath` is `.husky/_`.

## Deviations from Plan

None - plan executed exactly as written. The plan's acceptance commands use `${TMPDIR:-/tmp}`; on this Windows machine the commit-msg exit codes (1 for `added stuff`, 0 for `chore: probe`) were checked with a message file in the repo root that was deleted afterwards.

## Notes

- Hooks are skippable with `--no-verify` or `HUSKY=0`; the CI guards job (Plan 09) is the non-bypassable copy (threat T-01-14).
- Earlier installs in this phase used `HUSKY=0`; `npx husky` was run now to activate `core.hooksPath`. Later commits in this run execute the hooks.

## Known Stubs

None.

## Self-Check: PASSED

Files and commits 60cf530, d34e9b4, d43f22e verified present.
