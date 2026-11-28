---
phase: 03-pitch-standard-data-pipeline
verified: 2026-11-28T07:10:00Z
status: passed
score: 20/20 must-haves verified
covered_files:
  - ".github/workflows/ci.yml"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-01-PLAN.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-01-SUMMARY.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-02-PLAN.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-02-SUMMARY.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-03-PLAN.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-03-SUMMARY.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-04-PLAN.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-04-SUMMARY.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-05-PLAN.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-05-SUMMARY.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-06-PLAN.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-06-SUMMARY.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-07-PLAN.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-07-SUMMARY.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-08-PLAN.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-08-SUMMARY.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-09-PLAN.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-09-SUMMARY.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-10-PLAN.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-10-SUMMARY.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-11-PLAN.md"
  - ".planning/phases/03-pitch-standard-data-pipeline/03-11-SUMMARY.md"
  - "deploy/deny-manifest.json"
  - "docs/decisions/0009-pitch-layer-api.md"
  - "package.json"
  - "pipeline/sources.allow.json"
  - "pipeline/src/klopp_pipeline/fetch.py"
  - "pipeline/src/klopp_pipeline/manifest.py"
  - "pipeline/src/klopp_pipeline/publish.py"
  - "pipeline/src/klopp_pipeline/recipes/wyscout_goal.py"
  - "public/data/catalog.json"
  - "scripts/check-bundle.ts"
  - "scripts/check-immutable.ts"
  - "scripts/check-pitch-browser.ts"
  - "scripts/lib/guard.ts"
  - "src/pitch/CanvasLayer.tsx"
  - "src/pitch/Pitch.tsx"
  - "src/pitch/coords.ts"
  - "src/pitch/geometry.ts"
  - "src/pitch/glyphs/SceneLayer.tsx"
  - "src/pitch/glyphs/registry.ts"
  - "src/pitch/legend/Legend.tsx"
  - "src/pitch/nudgeTracker.test.ts"
  - "src/pitch/nudgeTracker.ts"
  - "src/pitch/useDraggableEntity.ts"
  - "src/pitch/view.ts"
  - "src/routes/dev-pitch.tsx"
  - "src/routes/dev-pitch/ConverterProbe.tsx"
  - "src/scene/playback/PlaybackBar.tsx"
  - "src/scene/playback/sample.ts"
  - "src/scene/playback/store.ts"
  - "src/scene/schema.ts"
  - "src/scene/validate.ts"
covered_digest: "v4:sha256:bee96b8b6fb25bbb0dadbcae6700d3c6e0d2a06e40b6a3d7a06ea73f60f48f28"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 19/20
  gaps_closed:
    - "WR-06 stale nudge: now covered by pure nudgeTracker + passing unit tests (was PRESENT_BEHAVIOR_UNVERIFIED)"
    - "Visual/anti-slop warnings: toolbar one row at 1440 (asserted), disabled Motion/density reasons (asserted), probe idle prompt"
    - "Play label contradiction: UI-SPEC rows and code agree on 'Play sequence' / 'Replay sequence' at 768 px and up"
    - "WR-11 policy: accepted under learner delegation, recorded in 03-CONTEXT.md and 03-SECURITY.md AR-03-03"
  gaps_remaining: []
  regressions: []
---

# Phase 3: Pitch Standard & Data Pipeline Verification Report

**Phase Goal:** As a learner, I want one canonical pitch and a reproducible open-data pipeline that feed the same Scene/Frame format, so that every board, quiz and replay I see is geometrically correct and traceable to data.
**Verified:** 2026-11-28
**Status:** passed
**Re-verification:** Yes. The previous report was `human_needed` (19/20, one behavior-unverified truth plus four decisions). Each closure was checked in code and by running the gates, not from SUMMARY text.

## Closure of previous human items

| # | Previous item | Evidence now | Result |
|---|---------------|--------------|--------|
| 1 | WR-06 stale nudge, no test | `src/pitch/nudgeTracker.ts` is a pure React-free tracker (`from`, `push`, `sync`, `clear`). `useDraggableEntity.ts` drives it (`createNudgeTracker` line 16, `tracker.sync` line 100, `tracker.from`/`tracker.push` lines 213/223, `clear` at drag start, cancel and unmount). `nudgeTracker.test.ts` has 5 fake-timer tests including "nudge, Reset within 500 ms, nudge" (no stale announcement; next nudge starts at reset position + 1 m = 31, not 33), "another drag", "keeps pending nudge when position is the one the nudge produced", and "clear". All pass in `npm test`. The truth is now behaviorally exercised: VERIFIED. | Closed |
| 2 | Visual/anti-slop warnings | `check:pitch` (real Edge) now asserts `data-toolbar` is one row at 1440 for pitch-only, glyph-sheet, reconstruction and board scenes ("4 groups", 4 ok). Disabled Motion group and density checkbox show reasons via `aria-describedby` (`dev-pitch.tsx` lines 86, 347; asserted: "Still scene: no motion to play", "No events to draw in this scene"). `ConverterProbe.tsx` shows an idle prompt (commit 74f70e3, test added). 03-UI-REVIEW.md scores 19/24, advisory. No must-have truth is unmet, so taste review is not a blocker. | Closed |
| 3 | Play label contradiction | `PlaybackBar.tsx` lines 28 and 33: `aria-label` and a `hidden md:inline` span both carry "Play sequence" / "Pause sequence" / "Replay sequence" (visible from 768 px). 03-UI-SPEC.md lines 314, 326 and 411 now agree. `check:pitch` reads "playback reaches Replay sequence". | Closed |
| 4 | WR-11 policy | Recorded in 03-CONTEXT.md "Post-verification decisions" and 03-SECURITY.md AR-03-03 (accepted by Claude under learner delegation, 2026-11-28). Treated as resolved per delegation. | Closed |

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | SC1: dev route draws the full pitch with SVG and Canvas layers, standard glyphs and an always-visible auto-generated legend | VERIFIED | `src/pitch/{Pitch,CanvasLayer,geometry,view}`, 17 glyph ids in `glyphs/registry.ts`, `Legend.tsx`. `check:pitch` legend visible at 320/375/768/1440, canvas backing = CSS width x DPR. Dev route only in the `import.meta.env.DEV` branch. Regression check: files unchanged except fixes listed above; 49 browser checks pass. |
| 2  | SC2: StatsBomb, Opta, Wyscout and tracking converters pass landmark and round-trip tests incl. left/right asymmetry | VERIFIED | `coords.ts` vs kloppy-generated `fixtures/landmarks.json`; `coords.test.ts` passes inside the 844 passing Vitest tests. |
| 3  | SC3: `npm run data` runs on Windows without `make`, allow-listed sources only, kloppy standardise, immutable versioned artifacts with manifest; raw data git-ignored; CI gates raw/licensed/oversized data | VERIFIED | `npm run data` run here: "statsbomb: 3 file(s) verified ... wyscout-goal: already present v1-809b8aff1fda ... statsbomb-shot: already present v1-99d3aeeb8b2b ... not shippable, kept local ... done: no new files"; `git status` shows no new data files. `npm run guard` "389 file(s) ok (tracked)". `npm run guard:bundle` "bundle ok: 8 files". `pipeline:test` 174 passed. |
| 4  | SC4: an open-data recipe yields a Scene/Frame sequence that plays on the canonical pitch; same format holds authored, board, quiz and reconstruction | VERIFIED | `check:pitch` reconstruction: starts 0.0 s, nothing moves before Play, ball moves (41.71,19.34 to 51.37,21.24), ends "19.0 s / 19.0 s" with Replay sequence. `scene.test.ts` and `pipeline-output.test.ts` pass. |
| 5  | Pitch geometry Law 1 exact, redraws for non-standard sizes | VERIFIED | `geometry.test.ts` passes. |
| 6  | One view matrix; vertical orientation is a view transform; pointer inverse reads the same canonical x | VERIFIED | `check:pitch` "375 px vertical: pointer readout at the left penalty mark (Pointer x 11.00 m . y 34.00 m)". |
| 7  | Scene/Frame v1: JSON Schema, Zod mirror, integrity checks, f(t) sampler; Pydantic parity | VERIFIED | `scene.test.ts`, `sample.test.ts`, `test_scene_parity.py` all green. |
| 8  | No hex literals in pitch/scene/dev-pitch TS; colours from CSS variables | VERIFIED | `biome ci` clean over 181 files; prior grep result unchanged (no colour edits since). |
| 9  | Legend ids equal rendered `data-glyph` ids; unknown glyph id fails | VERIFIED | `glyphs.test.tsx` passes. |
| 10 | Playback transport: paused at 0, Play, stop at end as Replay, keys, scrubber, "Still scene" | VERIFIED | `keys.test.ts` passes; browser run confirms reach-end and Replay. |
| 11 | Dev route and local-only code absent from production bundle | VERIFIED | `npm run smoke`: "smoke ok (preview): http://localhost:4173/, SPA fallback, no dev route code in dist/assets". |
| 12 | Drag spike: pointer capture, clamp, Escape restores, keyboard nudge 1 m/5 m, live announcement | VERIFIED | `check:pitch`: 60 px drag moves home-2, Escape restores, ArrowRight +1.0 m, "Number 2 moved to x 33.4 m, y 58.0 m." `drag.test.ts` passes. |
| 13 | Converter probe and landmarks layer draw converted points; out-of-range shows an error and draws nothing | VERIFIED | `ConverterProbe.test.tsx` (includes new idle-prompt test) passes. |
| 14 | State panels: empty, loading, invalid, missing local-only data, unknown scene id | VERIFIED | `sceneSources.test.ts` passes; `check:pitch` "all scenes: no console error or exception". |
| 15 | Licence gates: bundle gate, git guard on local-only dirs, immutable version dirs, CI wiring | VERIFIED | Gates run green locally (above). Latest CI run 46105259536 on branch (`workflow_dispatch`): success, head `314b9a9`. Two later commits changed only `scripts/guard.test.ts`, `scripts/lib/guard.ts` (2 lines, deny the learner brief by name) and docs; the guard and its tests pass locally on HEAD. See Warning W1. |
| 16 | BACKSTOP: `?scene=stress` 22 players + ball at or under 16.7 ms | VERIFIED (observed) | Measured this run: 302 frames, mean work 3.780 ms, 60.0 fps, p95 interval 16.80 ms, 0 gaps over 50 ms, "Frame time 3.8 ms . 60 fps" (Ryzen 9 7900X, Edge 158). |
| 17 | BACKSTOP: reduced motion gives Stepped, nothing moves before Play, UI transitions 0 ms | VERIFIED (observed) | `check:pitch`: Stepped checked, ball unmoved after 500 ms, 0 elements with a transition. |
| 18 | BACKSTOP: layout at 320/375/768/1440 has no horizontal scroll or overlap, controls at least 44 px, legend adjacent | VERIFIED (observed) | `check:pitch` 49 ok, 0 failed. |
| 19 | ADR 0009 records the layer-API spike with measured numbers and render strategy | VERIFIED | `docs/decisions/0009-pitch-layer-api.md`; `scripts/adr.test.ts` passes. |
| 20 | Pending arrow-nudge resets on external position change; second pointer-down ignored during a drag (WR-06) | VERIFIED | `nudgeTracker.test.ts` exercises the ordering invariant with fake timers (see closure item 1). Behavior-dependent truth now has a passing behavioral test. The second-pointer-down half is covered by the guard in `useDraggableEntity.ts` and the drag run in `check:pitch`. |

**Score:** 20/20 truths verified (0 behavior-unverified)

### Deferred Items

None.

### Required Artifacts and Key Links

Unchanged from the prior verification (all 11 plans' artifacts exist, substantive, wired; two key-link pattern misses were plan-pattern issues, wiring confirmed manually). Spot re-check: `nudgeTracker.ts` is imported and driven by `useDraggableEntity.ts`; `check:pitch`, `build` and `tsc` confirm nothing is orphaned or broken.

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| Reconstruction scene on `/dev/pitch` | frames | `/data/catalog.json` to published Wyscout scene from the `wyscout_goal` recipe, hashes match manifest | Yes | FLOWING |
| Legend | glyph ids | `glyphIdsForScene(scene)` | Yes | FLOWING |
| Landmark overlay | landmark cases | kloppy `landmarks.json` through `toCanonical` | Yes | FLOWING |

### Gate Runs (this session)

| Check | Result |
|-------|--------|
| `npm test` | 40 files, 844 passed, 6 skipped (Phase 2 conditional tests, not Phase 3) |
| `npm run pipeline:test` | 174 passed |
| `npx tsc --noEmit` | exit 0 |
| `npx biome ci .` | Checked 181 files, no fixes |
| `npm run build && npm run guard:bundle` | built in 544 ms; "bundle ok: 8 files" |
| `npm run guard` | "guard: 389 file(s) ok (tracked)" |
| `npm run smoke` | "smoke ok (preview) ... no dev route code in dist/assets" |
| `npm run data` | "done: no new files"; `git status` shows only `.gsd/` and this report untracked |
| `CHECK_PITCH_PORT=5183 npm run check:pitch` | 49 ok, 0 failed |
| `gh run list` (latest on branch) | 46105259536 success (head `314b9a9`) |

### Probe Execution

No `probe-*.sh` declared or present. Skipped.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| PITCH-01 | SATISFIED | Truths 1, 5, 6 |
| PITCH-02 | SATISFIED | Truth 2 |
| PITCH-03 | SATISFIED | Truths 1, 8, 9 |
| PITCH-04 | SATISFIED | Truths 4, 7 |
| PIPE-01 | SATISFIED | Truth 3 |
| PIPE-02 | SATISFIED | Truth 3 |
| PIPE-03 | SATISFIED | Truths 3, 11, 15 |
| PIPE-04 | SATISFIED | Truth 4 |

No orphaned requirements.

### Anti-Patterns Found

None blocking. No TBD/FIXME/XXX in phase files. The previous Warnings (Play label, disabled Motion reason, orphaned Layers group at 1440) are closed by code and by `check:pitch` assertions. Remaining advisory notes live in 03-UI-REVIEW.md (19/24).

### Warnings (non-blocking)

- W1: CI has not run on HEAD `9941227`. Last green run is on `314b9a9`; the two later commits touch only the guard (2 lines plus a test) and docs, and the guard passes locally. Re-run CI before merge as routine.
- W2: Visual taste remains advisory (03-UI-REVIEW.md, 19/24). No must-have depends on it.

### Human Verification Required

None. All previous items are closed or delegated and recorded.

### Gaps Summary

None. All 20 truths, 4 ROADMAP success criteria and 8 requirements hold, and every named gate passed on this checkout.

---

_Verified: 2026-11-28T07:10:00Z_
_Verifier: Claude (gsd-verifier)_
