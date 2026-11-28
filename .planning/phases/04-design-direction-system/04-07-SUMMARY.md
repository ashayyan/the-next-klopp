---
phase: 04-design-direction-system
plan: "07"
subsystem: visual-directions
tags: [directions, tactics-screen, base-ui, morph, review-screens]
requires: ["04-02", "04-04", "04-06"]
provides:
  - "dev routes /dev/directions (index + rubric) and /dev/directions/:id/:screen with fixed-list lookup and fallback copy"
  - "DirectionScope: data-direction + data-theme root mirrored on <body>, scoped token CSS, ?theme= override, data-ready"
  - "authored City 2022/23 4-4-2 / 3-2-4-1 scene (city-2022-23-shapes.json)"
  - "TacticsScreen in floodlit stage, programme spread and notebook sheet compositions at 375, 768 and 1440"
  - "morph.ts: cubicBezier, lineOf, morphPositions (line-staggered), parseDurationMs, parseEase"
  - "Button (primary, quiet, icon) and Segmented primitives on Base UI"
  - "tests/functional/directions.spec.ts"
affects: [04-08, 04-09, 04-10, 04-13, 04-14]
actuals:
  tokens: 15700
  tasks: 3
  commits: 4
plan_head_before: 36212e228ed93cb56328db04ea1c068859386c53
plan_head_after: 1da27839df0dd9448796b124c778e7ad9ad12dfa
tech-stack:
  added: []
  patterns:
    - "one block tree per screen; a direction layout only places blocks (display: contents + order below 1280 px, real columns from 1280)"
    - "direction attributes mirrored on <body> so the page background and portalled popups read the direction tokens"
    - "formation morph as state = f(elapsed) in one rAF loop, motion tokens read from the computed style of the direction root"
key-files:
  created:
    - src/routes/dev-directions.tsx
    - src/routes/dev-directions/DirectionScope.tsx
    - src/routes/dev-directions/TacticsScreen.tsx
    - src/routes/dev-directions/morph.ts
    - src/routes/dev-directions/morph.test.ts
    - src/routes/dev-directions/scenes/city-2022-23-shapes.json
    - src/ui/Button.tsx
    - src/ui/Segmented.tsx
    - tests/functional/directions.spec.ts
  modified:
    - src/routes.ts
    - src/routes.test.ts
    - src/routes/dev.tsx
    - src/pitch/legend/Legend.tsx
    - src/scene/playback/PlaybackBar.tsx
    - src/index.css
    - scripts/review/browser.ts
key-decisions:
  - "The 1440 layouts sit on the 12-column / 32 px grid of the UI-SPEC: floodlit's 200 / 1fr / 320 becomes columns 2 / 7 / 3 (202.7 / 1fr / 320 px), so the taste-skill layout checker measures real column lines"
  - "floodlit's title runs across the top at 1440 instead of heading the centre column: with the title in the centre and the step heading in the right column the page has two extra text lines, which the layout checker fails"
  - "morphPositions takes an explicit lines map (from lineOf) because from/to position records carry no role codes"
  - "Readout, pitch title and live region change at the end of the morph; the toggle shows the new choice at once"
requirements-completed: []  # DSGN-01 advances; it completes with the pick (04-10)
duration: 30min
completed: 2026-11-28
status: complete
---

# Phase 4 Plan 07: Tactics screen in three directions Summary

**The real tactics lesson (City 2022/23 4-4-2 to 3-2-4-1 with Stones stepping into midfield) now renders on the canonical pitch in three distinct directions (floodlit stage, programme spread, notebook sheet) at 375, 768 and 1440 in both themes, with a line-staggered morph that uses each direction's own motion tokens, and all three routes pass `review:screens` with no FAIL.**

## Performance
- **Duration:** about 30 min
- **Tasks:** 3 (4 commits: tracer, compositions, TDD RED, TDD GREEN)
- **Files modified:** 16 (9 created, 7 modified)

## Accomplishments
- `/dev/directions` lists 3 directions x 2 screens x 2 themes and the rubric at `#rubric`; `/dev/directions/:id/:screen` looks `:id` and `:screen` up in fixed lists and renders "No direction called “nope”. Pick floodlit, programme or notebook." with links for anything else. The data screen slot says it is not built yet until 04-09.
- `DirectionScope` statically imports the three scoped token files, opens in the primary theme unless `?theme=light|dark`, and sets `data-ready="1"` after `document.fonts.ready`.
- City scene: 11 role-code discs (GK, RB, CB, LB, DM, CM, RW, LW, ST; no shirt numbers), 2 frames, 6 `shape` annotations (4-4-2 units at t 0, 3-2-4 units at t 1), Stones highlight, a `run` from his centre-back spot to beside the DM at t 1 only, the note "Stones steps into midfield", source `src-theanalyst-stones-hybrid-role` with "Positions are illustrative" in the attribution. Six fixture tests run it through `parseScene` and recount the formations from the shapes and positions.
- Compositions: floodlit dark stage (title across, rail column, pitch at 7 of 12 columns, reading column with the CTA at its foot); programme (3 px ink rules under the top bar and masthead, 4/8 team-sheet split, pitch in a 3 px ink frame, legend in 3 columns, readout on `--surface-highlight` with a 2 px ink edge in light, yellow fills carry an ink edge in light); notebook (raised sheet with `box-shadow: var(--shadow-sheet)` on sage, 720 + 280 margin with a quiet rule, CTA bottom right, flush text-first sheet at 375). Visual-first holds at 375 for floodlit and programme (pitch starts above 812 px); notebook leads with the body by design.
- Morph: `cubicBezier` (Newton with bisection fallback), `lineOf`, `morphPositions` with the goalkeeper moving with the back line and each further line one `--stagger-line` later; programme's 0 ms stagger moves the team at once. Shape lines fade out during the move over `--duration-ui`. Under reduced motion the frame swaps at once.
- Verification: `npx vitest run` 1018 passed (6 skipped, pre-existing); `tsc --noEmit` and `biome ci .` clean; `npm run build && npm run smoke` pass (no direction code in `dist/assets`); `directions.spec.ts` 7 passed; `review:screens` with `--states state=with` gives `REVIEW: PASS — 0 fail, 1 warn` for floodlit, programme and notebook.

## TDD Gate Compliance (Task 3)
- RED `1701828`: 6 behaviour tests against a loading stub (NaN, line 0, empty map). Evidence: `npx vitest run src/routes/dev-directions/morph.test.ts --reporter=tap-flat -t "maps 0 to 0"`, exit 1, target "cubicBezier > maps 0 to 0, 1 to 1 and 0.5 to 0.5 for a symmetric curve" failed with "expected NaN to be close to +0"; classifier `RED_EVIDENCE_OK`. Semantic assessment: the target ran and failed on its planned assertion; a full run had all 6 new tests failing on assertions and the 6 fixture tests passing; no load or syntax fault. (A first record with a vitest JSON report was refused as unsupported, and a TAP run of all tests was refused as malformed TAP because Vitest prints multi-line `expected` values; the single-line target run is the accepted record.)
- GREEN `1da2783`: 12 of 12 tests pass. No refactor commit was needed.

## Task Commits
1. **Task 1: floodlit tracer, routes, scope, scene, Button, Segmented** - `fa26510`
2. **Task 2: programme and notebook compositions** - `34a3175`
3. **Task 3 RED: morph tests** - `1701828`
4. **Task 3 GREEN: morph, rAF wiring, functional spec** - `1da2783`

## Decisions & Deviations

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The Task 1 review cannot pass with only the 1440 layout**
- **Found during:** Task 1 verify. `review:screens --widths 1440` still runs the taste-skill layout checker at 375 and 768, which failed (overflow, bleed) on a 1440-only layout.
- **Fix:** Task 1 built floodlit at all three widths; Task 2 added programme and notebook.
- **Commit:** `fa26510`

**2. [Rule 1 - Bug] The page background and portals ignored the direction tokens**
- **Issue:** `body` paints `--surface-page` from the system tokens, so `token-colours` would fail any direction other than floodlit, and Base UI popups (portalled into `<body>`) would render outside `[data-direction]`.
- **Fix:** `DirectionScope` mirrors `data-direction` and `data-theme` onto `<body>` while mounted and removes them on unmount.
- **Commit:** `fa26510`

**3. [Rule 1 - Bug] Shared Phase 3 controls rang in `--accent`**
- **Issue:** the Legend toggle and the PlaybackBar rang focus in `outline-accent`; in programme light the accent is 1.4:1 on the page, so `focus-visible` would fail.
- **Fix:** both use `outline-focus-ring` (the system `--focus-ring` equals the accent, so nothing changes outside programme).
- **Files modified:** `src/pitch/legend/Legend.tsx`, `src/scene/playback/PlaybackBar.tsx`
- **Commit:** `fa26510`

**4. [Rule 1 - Bug] `token-colours` reported the fill of an SVG `<line>`**
- **Issue:** a `<line>` has no interior, but the collector read its default fill (black) and failed the legend swatch.
- **Fix:** the collector skips `fill` on `<line>`; strokes are still checked.
- **Files modified:** `scripts/review/browser.ts`
- **Commit:** `fa26510`

**5. [Rule 2 - Missing] Legend layout control**
- **Issue:** the Legend was fixed to "sticky from 1024 px" and 1/2/1 columns; programme needs 3 columns and a sticky legend would ride over the single-column 1024 layout.
- **Fix:** optional `sticky` (default true) and `columnsClassName` props; `/dev/pitch` keeps its defaults.
- **Commit:** `fa26510`

**6. [Rule 3 - Blocking] The layout checker measured a 24 px gutter**
- **Fix:** `--gutter` on `:root` (16 / 24 / 32 px at < 768 / 768 / 1280+) in `src/index.css`, the spacing-scale grid of the UI-SPEC.
- **Commit:** `fa26510`

**7. [Rule 1 - Bug] The note chip covered the RB disc in the vertical 375 pitch**
- **Fix:** note moved to (20, 60) with its leader to the run line at (34, 41); clear of every disc in both orientations.
- **Commit:** `1da2783`

**Layout notes (not deviations in behaviour):** floodlit title spans the top row at 1440 (see key decisions); the notebook sheet is 1144 px wide so the 720 + 48 + 280 columns fit inside 48 px padding (the UI-SPEC's 1120 max-width and 720/280 columns cannot both hold); programme's source and CTA follow the readout instead of being pinned to the bottom of the left block, which kept the action next to the toggle.

**Total deviations:** 7 auto-fixed (2 blocking, 4 bugs, 1 missing control). **Impact:** no threshold loosened; two shared Phase 3 components gained optional props and token-correct focus rings.

### WARNs kept
- `taste-copy` `copy-contrast` (all three routes): "Without the ball" and "without the" in the contract copy count as contrast frames (4, budget 2). The copy is fixed by the Copywriting Contract, so the WARN stays.

## Known Stubs
- The data screen route (`/dev/directions/:id/data`) shows "The data screen is not built yet." until plan 04-09 builds it.
- The 200 px rail column (floodlit) and the step strip slot (programme) are empty until plan 04-08 adds the step rail and shell bar.
- "Continue to Predict" is a primary button with no action: the next Lesson Loop step does not exist in this preview.

## Threat Flags
None. T-04-13: the scene passes `parseScene` in tests and at module load. T-04-14: `:id`, `:screen`, `?theme` and `?state` are looked up in fixed lists only.

## Next Phase Readiness
04-08 fills the rail and strip slots and replaces the plain top bar with `ShellBar`; `DirectionScope` already accepts a `ready` flag for 04-09's async scene load.

## Self-Check: PASSED
