---
phase: 03-pitch-standard-data-pipeline
plan: "08"
subsystem: infra
tags: [licence-gate, deny-manifest, ci, bundle-check, immutability, git-guard]

requires:
  - phase: 03-pitch-standard-data-pipeline
    provides: pipeline/sources.allow.json (03-01/03-03), published wyscout version directory and public/data/catalog.json (03-06), scripts/lib/guard.ts (phase 1)
provides:
  - deploy/deny-manifest.json (the single licence gate config)
  - checkBundle() pure checker, scripts/check-bundle.ts CLI and npm run guard:bundle
  - guard rules and a .gitignore block for local-only datasets
  - scripts/check-immutable.ts (add-only version directories, --staged and --base)
  - CI wiring: build and windows-smoke run check-bundle, guards runs check-immutable, windows-smoke runs the pipeline tests, new pipeline job
affects: [03-10 (StatsBomb local recipe must write under data/statsbomb/, now ignored and guard-rejected), 03-11, phase-05 Vercel deploy gate, phase-08 clip supply]

actuals:
  tokens: 26000
  tasks: 3
  commits: 3
plan_head_before: 45a1c0c2560d03d0ca9190b35fb926933aa955f1
plan_head_after: 1b83ddcb7bc5014aa98aad1def3cb9efead8e802

tech-stack:
  added: []
  patterns:
    - "One manifest feeds the bundle gate, the git guard and the tests; sync with sources.allow.json and ADR 0008 is test enforced"
    - "Glob matching is lowercase and path.posix.matchesGlob on both sides, so Windows and Linux agree"
    - "Gate scripts are pure functions plus a thin CLI (import.meta.main guard) so vitest can import them"

key-files:
  created:
    - deploy/deny-manifest.json
    - scripts/lib/globs.ts
    - scripts/lib/bundle.ts
    - scripts/check-bundle.ts
    - scripts/check-bundle.test.ts
    - scripts/check-immutable.ts
    - scripts/check-immutable.test.ts
    - scripts/deny-manifest.test.ts
  modified:
    - scripts/lib/guard.ts
    - scripts/guard.test.ts
    - .gitignore
    - .husky/pre-commit
    - package.json
    - .github/workflows/ci.yml

key-decisions:
  - "path.posix.matchesGlob printed no ExperimentalWarning on Node 24.21, so no picomatch dependency and no new decision record"
  - "A denied file is reported as denied only, not also as unlisted-data, so one leak gives one line"
  - "setup-uv is pinned to the local uv version 0.12.5 in both CI jobs that use it"
  - "Rename of a file out of a version directory fails; a rename into one counts as an addition"

patterns-established:
  - "Deny globs apply only to public/** and dist/** (CONTEXT post-research decision), so recipe sources, tests and ADRs that mention StatsBomb stay committable"

requirements-completed: [PIPE-03]

coverage:
  - id: D1
    description: "check-bundle fails on denied names (case variants), unlisted data, oversize data or asset, catalog gaps or sha256 mismatch or non-open licence, and content markers; passes on the real build"
    requirement: PIPE-03
    verification:
      - kind: unit
        ref: "scripts/check-bundle.test.ts"
        status: pass
      - kind: other
        ref: "npm run build then npm run guard:bundle (green); planted public/data/statsbomb/planted.json (exit 1, names the file)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Guard rejects data/<local-only>/ at any depth and public/data/ outside the ship datasets; .gitignore ignores every local-only folder; manifest, allow-list, guard constants and ADR 0008 stay in sync"
    requirement: PIPE-03
    verification:
      - kind: unit
        ref: "scripts/guard.test.ts and scripts/deny-manifest.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "check-immutable fails on M, D and R inside version directories (add-only), exempts catalog.json, handles an all-zero base and an unknown ref"
    requirement: PIPE-03
    verification:
      - kind: unit
        ref: "scripts/check-immutable.test.ts (parser plus a throwaway git repo)"
        status: pass
      - kind: other
        ref: "node scripts/check-immutable.ts --base origin/main (ok)"
        status: pass
    human_judgment: false
  - id: D4
    description: "CI runs every gate and the pipeline job; workflow parses with the six required job names unchanged"
    requirement: PIPE-03
    verification:
      - kind: other
        ref: "yaml parse of ci.yml with all seven job keys; live run is the proof (see CI)"
        status: pass
    human_judgment: true
    rationale: "GitHub Actions behaviour is only proven by a real run on the pushed branch"

duration: 25min
completed: 2026-11-28
status: complete
---

# Phase 3 Plan 08: Licence and Bundle Gates Summary

**One deny-manifest now drives a dist bundle gate, a git guard with a .gitignore block, an add-only version-directory gate and a pipeline CI job, so StatsBomb-derived or other local-only data cannot reach git history or the Vercel bundle.**

## Performance

- **Duration:** about 25 min
- **Tasks:** 3
- **Files modified:** 14 (8 created, 6 modified)

## Accomplishments
- `deploy/deny-manifest.json` with the six ADR 0008 globs scoped to `public/**` and `dist/**`, ship dirs `public/data/wyscout/**` and `public/data/dfl/**`, `localOnlyDatasets`, content markers and limits (1 MiB per data file, 5 MiB data total, 5 MiB per asset).
- `checkBundle(files, manifest, catalog)` with rules `denied`, `unlisted-data`, `oversize`, `catalog`, `marker`; each path is tested as `p` and `public/p`; hashed `assets/*.js|css|map` are exempt from name globs but not from markers. Catalog check also demands the dataset licence be CC-BY-4.0.
- Real build: `npm run build` then `npm run guard:bundle` printed `bundle ok: 8 files`. Planted `public/data/statsbomb/planted.json` then rebuild: `bundle: denied: data/statsbomb/planted.json (matches a deny-manifest glob)`, exit 1. Planted file removed, rebuild green again, `git status --porcelain public/data` empty.
- `isDeniedPath` rejects `data/<local-only>/...` at any depth (reason text names ADR 0008), `public/data/<x>/...` for any non-ship `<x>`, and any `public/data/` top-level file except `catalog.json`. `LOCAL_ONLY_DATASETS` and `SHIP_DATASETS` constants equal the manifest and the allow-list by test.
- `.gitignore` block "Local-only datasets (ADR 0008): never committed" for the four datasets under `data/` and `public/data/`; `git check-ignore` verified per dataset by test.
- `scripts/check-immutable.ts` (`--staged`, `--base <ref>`), `npm run guard:immutable`, and a second line in `.husky/pre-commit`.
- `ci.yml`: build runs `check-bundle`; guards runs `check-immutable` with the base passed through `env: BASE` and quoted; windows-smoke gets setup-uv, `npm run pipeline:test` and `check-bundle` on the "klopp checkout" path; new `pipeline` job (pytest and `landmarks --check`) on ubuntu. setup-uv is pinned to `1db35dd8eee11c5894872e0b383ae6c406cf738d # v10.4.0`, uv version 0.12.5. Permissions stay `contents: read`; the six required job names are unchanged.

## Task Commits

1. **Task 1 (tracer): bundle gate** - `786b9e7` (feat)
2. **Task 2: git guard and .gitignore** - `e1d8f2b` (feat)
3. **Task 3: immutability gate and CI wiring** - `1b83ddc` (feat)

Tracer gate: the Task 1 verify (`vitest run scripts/check-bundle.test.ts`, `npm run build`, `npm run guard:bundle`) was green and the red planted-file run was observed before expanding.

## TDD Gate Compliance

- **Task 2 RED:** `npx vitest run scripts/guard.test.ts scripts/deny-manifest.test.ts` failed with 15 failing tests (local-only paths accepted, `LOCAL_ONLY_DATASETS` missing, `.gitignore` not ignoring); then GREEN after the guard rules and the `.gitignore` block (73 pass).
- **Task 1 and Task 3:** tests were written before the code but I did not run them red separately (the modules did not exist, so an import failure would have been the only signal). No RED-evidence classifier output exists for these two; Task 1 is a tracer and Task 3 has a throwaway-git-repo CLI suite that exercises real behaviour.

## Deviations from Plan

**1. [Rule 1 - Bug] Existing test conflicted with the new guard rule**
- The phase 1 test "allows parquet under public/data/" used `public/data/pl-2024/shots.parquet`, which the plan's own rule (any `public/data/` path outside the ship directories) now rejects. Changed the path to `public/data/wyscout/v1-abc/shots.parquet`; the intent (parquet allowed under public/data) is unchanged.

**2. [Rule 3 - Blocking] `import.meta.main` guard in check-immutable.ts**
- The parser is imported by its test, so the CLI only runs when the file is the entry point (`import.meta.main`, Node 24.2+; undefined and therefore skipped under vitest).

**3. [Process] Design skill files not applicable**
- No UI in this plan.

**4. [Rule 1 - Bug] CLI help test broke on coloured output in CI**
- The first live run (46098104070) failed `test_the_cli_fetch_help_lists_offline_and_all` in the `pipeline` and `windows-smoke` jobs: with colour on, the CLI help splits `--offline` across ANSI sequences. The test now strips ANSI escapes before asserting (`c0287c7`); checked locally with `FORCE_COLOR=1 GITHUB_ACTIONS=true` (147 passed).

**5. [Rule 3 - Blocking] No CI trigger for a branch without a pull request**
- `ci.yml` ran only on pull requests and pushes to main, so a branch push produced no run. Added `workflow_dispatch`, and the immutability base falls back to `origin/main` when the event is neither a pull request nor a push (`fb0307c`). The six required job names are unchanged.

**Total deviations:** 5, none changing a frozen contract.

## Issues Encountered
- A bash heredoc swallowed a backslash in `globs.ts` (a regex literal); caught by the first vitest run and rewritten with the Write tool.
- `lint-staged` creates and removes its own backup stash during commits; the working tree afterwards matched what it was before (unrelated pipeline file changes from earlier work stayed untouched and uncommitted).

## CI
Live runs on `gsd/phase-03-pitch-standard-data-pipeline` (manual dispatch): 46098104070 failed on the ANSI help test (deviation 4); 46098332647 passed after the fix; 46099928131 passed on the head after plan 03-10 (all seven jobs: lint, typecheck, test, build, guards, windows-smoke, pipeline). Local equivalents also pass: `npx vitest run scripts`, `npm run guard`, `node scripts/check-immutable.ts --base origin/main`, `npm run pipeline:test`, `klopp-pipeline landmarks --check`, `npx biome check .`, `npx tsc --noEmit`, yaml parse of `ci.yml`.

## Package legitimacy
No packages installed; `path.posix.matchesGlob` is built in (T-03-SC accepted).

## Known Stubs
None.

## User Setup Required
None.

## Next Phase Readiness
- 03-10 may write StatsBomb output only under `data/statsbomb/` (git-ignored and guard-rejected); nothing under `public/data/statsbomb/`.
- Phase 5 deploys through `node scripts/check-bundle.ts` against `dist/`.

## Self-Check: PASSED
- All 8 created files exist; commits 786b9e7, e1d8f2b, 1b83ddc are ancestors of HEAD.

---
*Phase: 03-pitch-standard-data-pipeline*
*Completed: 2026-11-28*
