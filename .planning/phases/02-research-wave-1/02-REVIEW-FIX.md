---
phase: 02-research-wave-1
fixed_at: 2026-11-28T02:35:00Z
review_path: .planning/phases/02-research-wave-1/02-REVIEW.md
iteration: 1
findings_in_scope: 12
fixed: 11
skipped: 1
status: partial
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-11-28
**Source review:** .planning/phases/02-research-wave-1/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 12 (WR-01 to WR-12; scope `critical_warning`, no critical findings)
- Fixed: 11
- Skipped: 1 (WR-12, learner-owned)

Verification ran in the main checkout (`workflow.use_worktrees` is `false`, no worktree was created). After the last fix: `npx tsc --noEmit`, `npx biome ci scripts research pipeline package.json biome.json`, `npm test` (412 passed), `RESEARCH_GATE=1 npm run research:gate` (244 passed), `npm run pipeline:test` (39 passed), `npm run guard`, `build-registry --check`, `derive-links --check`, `build-summary --check` and `render-views --check` all pass.

## Fixed Issues

### WR-01: `cell()` sanitiser can be bypassed and rebuilds a `<script>` tag

**Files modified:** `scripts/research/lib/views.ts`, `scripts/research/views.test.ts`
**Commit:** e4024b1
**Applied fix:** `cell()` now replaces every `<` and `>` with `&lt;` and `&gt;` instead of matching tags, and doubles a backslash that sits right before a pipe. Tests cover the nested-input case from the review and the `x\|` case. The existing expectation was updated. The generated views did not change (no angle brackets in the real data).

### WR-02: `main()` guard fails open through a junction or symlink

**Files modified:** `scripts/research/lib/is-main.ts` (new), `scripts/research/lib/is-main.test.ts` (new), `scripts/research/build-registry.ts`, `scripts/research/derive-links.ts`
**Commit:** a3db741
**Applied fix:** New `isMainModule()` compares `realpathSync` of both paths. Both CLIs use it. A unit test builds a real directory junction and checks the guard sees through it. I did not repeat the manual junction reproduction in the shell (the permission system denied that command), so the test is the evidence.

### WR-03: Coverage rows stamp `fetched_at = now` for cached data

**Files modified:** `pipeline/src/klopp_pipeline/net.py`, `pipeline/src/klopp_pipeline/coverage.py`, `pipeline/src/klopp_pipeline/cli.py`, `pipeline/tests/test_coverage.py`
**Commit:** 53f94f5
**Applied fix:** Added `net.cache_fetched_at()` (reads the meta file, falls back to the body mtime) and `net.RecordingFetch`, which the CLI now uses. `run_coverage` stamps each provider's rows with the oldest download time behind them and sets `generated_at` to the oldest row time. A plain fetch function keeps the old behaviour, so the existing tests are unchanged. The committed matrix was regenerated in the WR-04 commit.

### WR-04: Last Row counts goals (plays) as `matches_total` / `pl_matches`

**Files modified:** `pipeline/src/klopp_pipeline/models.py`, `pipeline/src/klopp_pipeline/coverage.py`, `pipeline/tests/test_coverage.py`, `scripts/research/lib/coverage-schema.ts`, `scripts/research/lib/summary-html.ts`, `scripts/research/coverage-matrix.test.ts`, `scripts/research/fixtures/mini/pl-data-sources/coverage-matrix.json`, `research/pl-data-sources/coverage-matrix.json`, `research/pl-data-sources/coverage-matrix.md`, `research/summary/index.html`
**Commit:** 0eab0e6
**Applied fix:** Took the review's second option. Added a `unit` field (`match` default, `play` for Last Row) to the pydantic model and the zod mirror. The headline table shows `13 plays`, the per-provider tables gained a Unit column, and the summary page labels play counts. Last Row notes are built from the `LASTROW_MANUAL_*` constants. Regenerated the matrix with `klopp-pipeline coverage --offline` (from the existing cache, no network) and the summary page. Counting distinct matches instead was not done: it would change the "13 Liverpool goals" figure cited in ADR 0008 and GAPS.

### WR-05: `fetch_bytes` cache write non-atomic, `OSError` escapes

**Files modified:** `pipeline/src/klopp_pipeline/net.py`, `pipeline/tests/test_coverage.py`
**Commit:** 00096a1
**Applied fix:** Body and meta are written through a temp file and `os.replace`. An unreadable cache entry is a miss. A cache write error is raised as `FetchError`. Three new tests cover atomic write, write failure cleanup and unreadable cache.

### WR-06: `run_coverage` does not catch `csv.Error`, `AttributeError`, `IndexError`, `OSError`

**Files modified:** `pipeline/src/klopp_pipeline/coverage.py`, `pipeline/tests/test_coverage.py`
**Commit:** acba7f9
**Applied fix:** `run_coverage` catches `Exception` per provider (it is the per-provider boundary). The Last Row deep handler also catches `csv.Error`. Three new tests.

### WR-07: `remember-verdicts.ts` never refreshes a stored approval verdict

**Files modified:** `scripts/research/remember-verdicts.ts`, `scripts/research/lib/verdict-sync.ts` (new), `scripts/research/lib/verdict-sync.test.ts` (new)
**Commit:** 1e138fe
**Status:** fixed: requires human verification (logic change)
**Applied fix:** A verdict is skipped only on an exact text match. When the title exists with different text, a superseding memory (prefixed) is posted, and the next run sees it as current. Reviewer and delegation wording now come from `research/APPROVAL.md`. The run fails when the list response looks truncated. I did not run the script against the live agentmemory server (writes external state, uses the secret); only `--dry-run` and unit tests ran. The approval verdict wording changed slightly ("independent Opus reviewer pass"), so the first real run will post one superseding memory. The server's delete API and paging fields are unknown, so the truncation check is a best guess across common field names.

### WR-08: Registry merge reports no conflict for licence name / terms URL; `type` first-seen drops `regulation`

**Files modified:** `scripts/research/lib/registry.ts`, `scripts/research/lib/registry.test.ts`, `research/SOURCE_REGISTRY.json`
**Commit:** b9474db
**Status:** fixed: requires human verification (logic change)
**Applied fix:** A differing `license.name` or `license.terms_url` is now a reported conflict. `regulation` wins over a looser type. An unrecognised permission value throws. `SOURCE_REGISTRY.json` was regenerated; the only data change is `src-pl-handbook-2026-27` becoming `regulation`. The "unknown rank" default was removed. Four new tests.

### WR-09: Excerpt alias can shadow a live excerpt id

**Files modified:** `scripts/research/lib/registry.ts`, `scripts/research/lib/registry.test.ts`
**Commit:** f47c4af
**Applied fix:** No alias is recorded when the renamed member shares the surviving source id. The old test asserted the buggy alias and was corrected. A second test covers the different-id case.

### WR-10: Browser check leaks the browser process and can mask the real error

**Files modified:** `scripts/research/check-summary-browser.ts`
**Commit:** d1db303
**Applied fix:** `child.kill()` runs in `finally`, the profile `rmSync` is guarded, and the CDP socket `close` event fails every waiting call. The real-browser check (`--interact`) still passes in Edge. The leak and crash paths have no automated test (they need a browser failure).

### WR-11: Fetcher rules not fully tested

**Files modified:** `pipeline/src/klopp_pipeline/net.py`, `pipeline/tests/test_coverage.py`
**Commit:** b2c1aa8
**Applied fix:** New tests for the token strip on redirect, the `Content-Length` cap, the timeout argument, the port rule and the wall-clock budget. `check_url` now rejects ports other than 443. The body is read in chunks under a 120 s total budget (`TOTAL_TIMEOUT_SECONDS`). The test fake response became a stream so the chunk loop terminates.

## Skipped Issues

### WR-12: Untracked `scratch_tmp_review/` in the repository root

**File:** `scratch_tmp_review/drift.test.ts:1-30`
**Reason:** skipped by instruction. The directory is the learner's to delete. It was not touched, deleted or committed. Do not `git add -A`.
**Original issue:** The untracked spike directory matches the Vitest default pattern and could be picked up by `npm test` and `npm run lint`.

---

_Fixed: 2026-11-28_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
