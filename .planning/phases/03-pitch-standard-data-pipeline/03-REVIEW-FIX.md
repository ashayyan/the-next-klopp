---
phase: 03-pitch-standard-data-pipeline
fixed_at: 2026-11-28T03:45:00Z
review_path: .planning/phases/03-pitch-standard-data-pipeline/03-REVIEW.md
iteration: 1
findings_in_scope: 15
fixed: 15
skipped: 0
status: all_fixed
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-11-28
**Source review:** .planning/phases/03-pitch-standard-data-pipeline/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 15 (WR-01 to WR-13, plus IN-02 and IN-05 added by the orchestrator)
- Fixed: 15
- Skipped: 0

Scope note: `workflow.use_worktrees` is `false`, so every edit and commit landed directly on branch `gsd/phase-03-pitch-standard-data-pipeline` in the main checkout. Verification gates ran in the main checkout. IN-01, IN-03, IN-04 (necessity), IN-06 and IN-07 were out of scope and remain open in REVIEW.md.

## Fixed Issues

### WR-01: `cancel-in-progress` on push to main skips guards
**Files modified:** `.github/workflows/ci.yml`
**Commit:** bb37804
**Applied fix:** `cancel-in-progress` is now `${{ github.event_name == 'pull_request' }}`, with a comment saying why.

### WR-02: Actions pinned inconsistently
**Files modified:** `.github/workflows/ci.yml`
**Commit:** 4831a65
**Applied fix:** `actions/checkout` pinned to `3d3c42e5aac5ba805825da76410c181273ba90b1 # v7` and `actions/setup-node` to `949feb2413d6458794dcd2491c4babbbce0c15c1 # v7` in all jobs. SHAs resolved with `gh api repos/<owner>/<repo>/git/ref/tags/v7` (both are commit objects, not annotated tags). The six required job names are unchanged.

### WR-03: Bundle gate coverage and asymmetric deny globs
**Files modified:** `deploy/deny-manifest.json`, `scripts/check-bundle.ts`, `scripts/lib/bundle.ts`, `scripts/lib/guard.ts`, `scripts/check-bundle.test.ts`, `scripts/guard.test.ts`
**Commit:** 49d279c (shared with IN-05)
**Applied fix:**
- Text scan now covers `.mjs .map .svg .txt .csv .tsv .xml .webmanifest .ndjson .jsonl` as well as js/html/css/json.
- Data-like extensions (`parquet csv tsv zip ndjson jsonl xml arrow feather`) anywhere outside `data/` raise `unlisted-data`.
- Symlinks in `dist/` now fail the gate (new `symlink` rule) instead of being skipped.
- Deny globs now include `**/*metrica*`, `**/*skillcorner*` and directory globs `**/<id>/**` for all four local-only datasets.
- Git guard `isDeniedPath` rejects any path under `public/` whose segment or file name contains a local-only dataset id.
- Tests added for each case.

### WR-04: "Newest version" is the lexicographically greatest hash
**Files modified:** `pipeline/src/klopp_pipeline/publish.py`, `pipeline/tests/test_manifest_immutable.py`, `public/data/catalog.json`, `src/routes/dev-pitch/sceneSources.ts`, `src/routes/dev-pitch/sceneSources.test.ts`, `src/scene/pipeline-output.test.ts`
**Commit:** 5ead722
**Status:** fixed: requires human verification (ordering logic)
**Applied fix:** Each catalog dataset entry now carries its manifest's stored `generatedAt` (never the current time) and the catalog sorts by `(dataset, generatedAt, version)`. `/dev/pitch` picks the newest published version by `generatedAt`, and the newest local StatsBomb version by its `manifest.json` `generatedAt` (the local glob now also matches manifests). `public/data/catalog.json` was regenerated through `klopp-pipeline publish`; the only diff is the added `generatedAt` line. No version directory changed. The old "catalog has no timestamp" assertions were replaced with "the only time is the manifest's stored value".

### WR-05: Licence integrity rules cover StatsBomb only
**Files modified:** `src/scene/validate.ts`, `src/scene/scene.test.ts`
**Commit:** ce835be
**Applied fix:** `LOCAL_ONLY_PROVIDERS` (statsbomb, metrica, skillcorner, last-row) now rejects `shippable: true` for any of them. The generic "local-only scene" rule skips these providers so one problem is not reported twice. StatsBomb logo rule kept. Tests added for the three other providers. The pydantic model has no cross-field rules by design, so it was not changed; `publish.py` still re-checks the allow-list.

### WR-06: Stale arrow-nudge state
**Files modified:** `src/pitch/useDraggableEntity.ts`
**Commit:** e2099b8
**Status:** fixed: requires human verification (event-order logic; no unit harness for this hook)
**Applied fix:** New `clearNudge` resets the nudge position and timer. It runs at the start of a pointer drag, in `cancel`, on unmount, and whenever `position` differs from the pending nudge value (external change). `onPointerDown` now returns early if a drag is already active (multi-touch). `npm run check:pitch` (real Edge, 42 checks) passes, including drag, Escape, ArrowRight nudge and the announcement.

### WR-07: `check:pitch` signal handler leaks Edge
**Files modified:** `scripts/check-pitch-browser.ts`
**Commit:** ae95394
**Applied fix:** SIGINT/SIGTERM handler now awaits `browser.close()` (bounded by a 10 s race) before `process.exit(130)`.

### WR-08: Commit-pinned cached files trusted by size only
**Files modified:** `pipeline/sources.allow.json`, `pipeline/src/klopp_pipeline/fetch.py`, `pipeline/tests/test_sources.py`
**Commit:** d387ae9
**Applied fix:** The three StatsBomb files now carry a sha256. Hashes were computed from the commit-pinned URLs and compared with the local cache (identical). A tampered cached file is now deleted and refused. `run-all --offline` still reports "already present" for both versions, so no data artifact changed. The commit-only form stays valid for new sources; the docstring says so.

### WR-09: Leftover `.tmp` staging directory breaks publish
**Files modified:** `.gitignore`, `pipeline/src/klopp_pipeline/publish.py`, `pipeline/tests/test_manifest_immutable.py`
**Commit:** 24e98ba
**Applied fix:** `_versions` skips dot-prefixed dataset and version folders. `.gitignore` gains `.*.tmp/`. Regression test plants a staging copy in both data and public roots. The writer already clears its own stale staging folder.

### WR-10: Inconsistent CLI error handling and allow-list handling
**Files modified:** `pipeline/src/klopp_pipeline/cli.py`, `pipeline/src/klopp_pipeline/recipes/__init__.py`, `pipeline/src/klopp_pipeline/recipes/wyscout_goal.py`, `pipeline/src/klopp_pipeline/recipes/statsbomb_shot.py`, `pipeline/tests/test_run_all.py`
**Commit:** 98afc58
**Applied fix:** `recipe` and `run-all` catch `RecipeError` and pydantic `ValidationError` too (shared `RECIPE_ERRORS`). `Recipe.build` is now `build(raw_root, offline, allow=None)` and both CLI commands pass the run's allow-list through, so `--sources` can no longer mix lists. Two-argument calls in existing tests still work. The synthetic test recipe now uses only the allow-list handed down, which proves threading; a new test checks a `RecipeError` becomes one clean line with exit code 1.

### WR-11: Version id ignores metadata
**Files modified:** `pipeline/src/klopp_pipeline/manifest.py`, `pipeline/tests/test_manifest_immutable.py`
**Commit:** 3cf5ae7
**Status:** fixed: requires human verification (policy choice)
**Applied fix:** When the version directory already exists with the same bytes, `write_version` compares the stored manifest's `sourceId`, `license`, `licenceUrl`, `attribution`, `shippable` and `logoRequired` with the new metadata and raises `ImmutableVersionError` naming the changed fields. `generatedAt`, `kloppyVersion`, row counts and inputs may still differ. The alternative (hash the metadata into `version_id`) was rejected because it would rename the committed, hash-pinned versions. Consequence to know: a later attribution edit in the allow-list will fail `run-all` until the scene content changes (new version) or an unpublished local copy is deleted on purpose.

### WR-12: `uv run` without `--locked`
**Files modified:** `package.json`, `.github/workflows/ci.yml`
**Commit:** 94b9b57
**Applied fix:** `--locked` added to `data`, `data:fetch`, `data:coverage`, `pipeline:test` and to both `uv run` steps in the pipeline job. The `windows-smoke` job inherits it through `npm run pipeline:test`. `.claude/CLAUDE.md` still shows the old `npm run data` expansion (left unchanged, documentation only).

### WR-13: Draggable player `role="button"` without behaviour
**Files modified:** `src/pitch/glyphs/PlayerGlyph.tsx`, `src/pitch/useDraggableEntity.ts`, `src/pitch/glyphs/glyphs.test.tsx`
**Commit:** 81d71a0
**Applied fix:** Role is now `group` with `aria-roledescription="draggable player"` and `aria-describedby` pointing at an SVG `<desc>` that states the keyboard contract (arrows 1 m, Shift 5 m, pointer drag, Escape cancels). `onKeyDown` calls `preventDefault` on Space and on arrows during an active pointer drag, so the page no longer scrolls. Two Biome suppressions added with reasons (`noInteractiveElementToNoninteractiveRole`, `useSemanticElements`). Test checks role, roledescription and a resolvable describedby id.

### IN-02: `check-immutable` diff filter omits type changes
**Files modified:** `scripts/check-immutable.ts`
**Commit:** b9bb281
**Applied fix:** `--diff-filter=MDRT`. `findImmutableViolations` already treats any status other than A and C as a violation, so a `T` entry now fails inside a version directory.

### IN-05: Deny-glob matching ignores dotfiles
**Files modified:** `scripts/lib/globs.ts` (plus tests in `scripts/check-bundle.test.ts`)
**Commit:** 49d279c (shared with WR-03)
**Applied fix:** `matches()` tests each path as written and again with leading dots stripped from every segment, so `.cache/statsbomb.json` and `data/statsbomb/.hidden.json` are denied. Both cases are in the test list.

## Verification (run in the main checkout, no worktree)

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | pass |
| `npx biome ci .` | pass (178 files) |
| `npm test` | 835 passed, 6 skipped |
| `npm run pipeline:test` | 174 passed |
| `npm run build && npm run guard:bundle` | pass (`bundle ok: 8 files`) |
| `npm run guard` | pass (383 files) |
| `npm run smoke` | pass |
| `npm run check:pitch` (extra, real Edge, port 5199) | 42 ok, 0 failed |
| `klopp-pipeline run-all --offline` | "no new files": versions and hashes unchanged |

CI: pushed to `gsd/phase-03-pitch-standard-data-pipeline`, dispatched `gh workflow run ci` (run 46103893280). All seven jobs succeeded: build, test, pipeline, typecheck, windows-smoke, lint, guards.

---

_Fixed: 2026-11-28_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
