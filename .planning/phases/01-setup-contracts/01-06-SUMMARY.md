---
phase: 01-setup-contracts
plan: 06
subsystem: docs
tags: [adr, decisions, madr, vitest]

requires:
  - phase: 01-03
    provides: Vitest config that includes scripts/**/*.test.ts
provides:
  - ADRs 0001-0006 in docs/decisions (framework, router, storage, Vercel scope, study/dev ports, spaced path)
  - generic ADR structure and coverage test that also covers future records such as 0007
affects: [01-08 docs/SETUP.md, 01-09 ADR 0007 and CI, Phase 5 deploy, Phase 6 Dexie schema]

requirements-completed: [SETUP-06]

actuals:
  tokens: 11000
  tasks: 2
  commits: 2
plan_head_before: 4f47cf8e911c143777ee29fc7976321240c5c07d
plan_head_after: 34fa2146c451192d69049c229689910489dc98c0

tech-stack:
  added: []
  patterns:
    - "MADR-lite records: Status, Context, Decision, Consequences, Alternatives, Reversibility line, sources line"
    - "adr.test.ts is generic over docs/decisions/*.md; a required-number table lists topic keywords"

key-files:
  created:
    - scripts/adr.test.ts
    - docs/decisions/0001-vite-spa-not-nextjs.md
    - docs/decisions/0002-react-router-data-router.md
    - docs/decisions/0003-dexie-indexeddb-storage.md
    - docs/decisions/0004-vercel-protection-all-deployments.md
    - docs/decisions/0005-study-dev-server-split.md
    - docs/decisions/0006-path-with-spaces.md
  modified: []

key-decisions:
  - "All six ADRs are recorded as Accepted because the learner delegated them for this autonomous run"
  - "ADR 0002 carries Reversibility: costly; the one-way nature of the URL shape is stated in the line's reason"

status: complete
---

# Phase 1 Plan 06: Architecture Decision Records Summary

Six MADR-lite ADRs record the Phase 1 decisions (Vite SPA, React Router 8, Dexie, Vercel All Deployments scope, fixed study/dev ports, spaced project path), and a generic test fails when a record is missing, mis-named or lacks a section.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | ADR test plus ADRs 0001-0003 | 2f3cae2 |
| 2 | ADRs 0004-0006 and extended coverage table | 34fa214 |

## Verification

- `npx vitest run scripts/adr.test.ts`: 21 tests pass (structure per file, unique numbers, six topic rows).
- Full suite: 6 files, 119 tests pass. `npx biome ci .` clean.
- `ls docs/decisions` lists 0001-0006.

## Deviations from Plan

None - plan executed exactly as written. ADR 0006 states `core.longpaths true` and the machine's `core.autocrlf=true`; both were confirmed with `git config` before committing.

## Notes

- The commit ledger for this plan was written after the Task 1 commit by mistake. `plan_head_before` above is the correct base (the 01-05 docs commit 4f47cf8) and `commits: 2` was measured against it.
- ADR 0007 (branch protection) is written by Plan 09; the generic test will check it automatically.

## Known Stubs

None.

## Self-Check: PASSED

All six ADR files and scripts/adr.test.ts exist; commits 2f3cae2 and 34fa214 are ancestors of HEAD.
