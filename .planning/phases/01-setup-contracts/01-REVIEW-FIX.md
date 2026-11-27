---
phase: 01-setup-contracts
fixed_at: 2026-11-27T22:35:00Z
review_path: E:/To become new klop/.planning/phases/01-setup-contracts/01-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 9
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-11-27
**Source review:** `.planning/phases/01-setup-contracts/01-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (0 critical, 9 warning; info findings out of scope for `critical_warning`)
- Fixed: 9
- Skipped: 0

**Verification location:** all gates ran in the main checkout (`workflow.use_worktrees` is `false`, so no worktree was created), on branch `gsd/phase-1-setup-contracts`. After the last fix: `npx tsc --noEmit` clean, `npx vitest run` 166/166 pass, `npm run build` ok, `npm run smoke` ok (and `npm run smoke:dev` ok earlier), `node scripts/guard-files.ts --tracked` ok (108 files). `npx biome ci .` is clean on the 42 project files; with the untracked reviewer folder `scratch_tmp_review/` present it fails on that folder only (see Notes).

## Fixed Issues

### WR-01: Guard path rules are case-sensitive and root-anchored

**Files modified:** `scripts/lib/guard.ts`, `scripts/guard.test.ts`
**Commit:** 5cd5931
**Applied fix:** `isDeniedPath` now lowercases the whole path before every rule and matches the denied prefixes both at the start and at any depth (`/<prefix>`). `.ENV`, `Raw/a.csv`, `data/RAW/a`, `Feedback/x`, `sub/node_modules/x.js` and `a/dist/x.js` are rejected; `.ENV.EXAMPLE` stays allowed. Added `.webm .m4v .wmv .sqlite3 .db-wal .db-shm` to the denied extensions. Added test cases for each variant.

### WR-02: Secret rules miss common token shapes, and NUL bytes disable scanning

**Files modified:** `scripts/lib/guard.ts`, `scripts/guard-files.ts`, `scripts/guard.test.ts`, `.planning/phases/01-setup-contracts/01-REVIEW.md`
**Commit:** 1e0b951
**Applied fix:** New rules: `aws-secret-key`, `stripe-key`, `google-api-key`, `npm-token`, `authorization-header`. The generic assignment rule now allows `api-key`, `passwd`, backtick quotes and any non-space, non-quote value of 16+ characters, and ignores template placeholders (`${...}`, `<...>`, `{{...}}`). New exported `decodeForScan` replaces the "binary means skip" logic: a file with a NUL in the first 8000 bytes is scanned as latin1 plus a NUL-stripped copy, so a leading NUL or UTF-16 text can no longer hide a secret. All new test secrets are assembled at runtime.
One side edit: the review text itself quoted a literal password example that the widened rule matched in the tracked scan, so that bullet in `01-REVIEW.md` was reworded (no finding content changed).

### WR-03: No `timeout-minutes` on any CI job

**Files modified:** `.github/workflows/ci.yml`
**Commit:** 1516560
**Applied fix:** `timeout-minutes: 10` on the five Linux jobs, `15` on `windows-smoke`.

### WR-04: gitleaks-action likely lacks the permission it needs on pull requests

**Files modified:** `.github/workflows/ci.yml`
**Commit:** fb1ea56
**Applied fix:** Job-level `permissions: contents: read, pull-requests: read` on the `guards` job only. Workflow-level permissions stay `contents: read`. Not runnable locally; confirm on the first real PR run (and set `GITLEAKS_LICENSE` if the repo is organisation-owned).

### WR-05: Smoke test can pass against a stale server

**Files modified:** `scripts/smoke.ts`
**Commit:** 62d4e4d
**Applied fix:** `portInUse` probe (1 s timeout) before the first spawn; the script exits 1 with "already in use; stop that server first" if the port answers. Verified by holding port 4173 with a manual `vite preview`: smoke failed as intended.

### WR-06: Smoke `fetch` has no timeout and no signal cleanup

**Files modified:** `scripts/smoke.ts`
**Commit:** 457079b
**Applied fix:** `AbortSignal.timeout(5000)` on both fetch call sites, `SIGINT`/`SIGTERM` handlers that stop every child and exit 130, and `spawnSync` for `taskkill` so teardown is synchronous. `smoke` and `smoke:dev` both pass and leave no listener on 4173 or 5173.

### WR-07: Smoke `/dev` assertion proves nothing

**Files modified:** `scripts/smoke.ts`
**Commit:** 82a6277
**Applied fix:** In preview mode the script now scans every `dist/assets/*.js` for the dev-page marker text ("left out of the study build") and fails if found. The success message no longer claims `/dev` coverage and says "SPA fallback, no dev route code in dist/assets". Verified with a planted leak file (smoke failed) and then without (smoke passed). The marker is copy from `src/routes/dev.tsx`; a comment in `smoke.ts` records that coupling.

### WR-08: Commit-msg "repo history" test is a time bomb

**Files modified:** `scripts/commit-msg.test.ts`
**Commit:** d1843b3
**Applied fix:** The test now checks only commits in `origin/main..HEAD` (falling back to `main..HEAD`), so unrelated historical subjects cannot break it. It is skipped (`it.skipIf`) on a shallow clone or when no base ref resolves, instead of testing something different. The pure-function tests above it are unchanged.

### WR-09: Zod mirror and JSON Schema disagree on leap-second timestamps

**Files modified:** `schemas/common.schema.json`, `src/schemas/contracts.ts`, `schemas/schemas.test.ts`, `schemas/fixtures/source.fixtures.json`, `schemas/fixtures/concept.fixtures.json`, `schemas/fixtures/competency.fixtures.json`, `schemas/fixtures/role.fixtures.json`
**Commit:** e1f2acc
**Applied fix:** `utcDateTime` pattern tightened to `T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?Z` in the JSON Schema, and the same regex added to the Zod mirror. Every invalid fixture now carries `expect_path`, and the test requires both ajv and Zod to report a failure at that JSON Pointer (missing and extra properties are reported at the property). New negative fixtures: leap second, hour 25, 81-character kebab id (source, concept, role), nested `additionalProperties` (excerpt, license, permission, concept, edge, level descriptor, role competency), empty `concepts`, empty role `sources`, and duplicate `sources`/`roles`/`competencies`/`concepts`. Schema tests went from 24 to 58 cases.
Status note: this is a validator-agreement change, so a quick human look at the new `expect_path` values is worthwhile, though the test now enforces them.

## Skipped Issues

None.

## Notes for the orchestrator

- Info findings (IN-01 to IN-09) were out of scope for `critical_warning` and are untouched.
- `scratch_tmp_review/` (untracked, created by the reviewer) was left in place and not committed. It makes `npx biome ci .` fail (lint warnings promoted to errors in its `drift.test.ts`). Run `rm -rf scratch_tmp_review` before the final check. With it moved aside, `npx biome ci .` reports "Checked 42 files. No fixes applied."
- `01-REVIEW.md` was edited once (WR-02 commit) to remove a literal password example that the stricter guard flags. REVIEW-FIX.md itself is not committed.
- Nothing was pushed.

---

_Fixed: 2026-11-27_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
