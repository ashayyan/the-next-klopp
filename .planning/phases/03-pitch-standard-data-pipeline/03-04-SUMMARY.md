---
phase: 03-pitch-standard-data-pipeline
plan: "04"
subsystem: ui
tags: [react, svg, canvas, glyphs, legend, notation, scene, dev-route]

requires:
  - phase: 03-pitch-standard-data-pipeline
    provides: Pitch, CanvasLayer, view matrix, sizeInMetres (03-01); Scene format, sampler, fixtures (03-02)
provides:
  - 17-id glyph registry in legend order with glyph() that throws on an unknown id
  - PlayerGlyph, BallGlyph, EventGlyphs (pass, carry, run, shot, pressure), MarkGlyphs (zone, shape, highlight, note, point, sequence badge)
  - SceneLayer (03-UI-SPEC layer order) and drawDensity for CanvasLayer
  - glyphIdsForScene and describeScene (pure), auto-generated always-visible Legend
  - glyph-sheet fixture, DEV_SCENES registry and findDevScene
  - /dev/pitch with scene select, ?scene= deep links, density layer, inspector, attribution and validation panel
affects: [03-07 playback, 03-09 drag spike, 03-10 reconstruction scene, 03-11 browser checks, phase-04 gallery and tokens, phase-08 lessons]

actuals:
  tokens: 19000
  tasks: 3
  commits: 4
plan_head_before: b2025f45d33cb2c3ea12dbd23213d0cdc40ff815
plan_head_after: 5701d33880e123bcc0ae7eb84b3e916442d51360

tech-stack:
  added: []
  patterns:
    - "Glyph primitives take user-unit sizes (u = user units per screen pixel); the pitch passes 1/pxPerMetre, legend swatches pass 1, so the swatch is the real glyph"
    - "Text chips are drawn in screen axes inside a group that undoes the vertical rotation"
    - "?scene= is only ever looked up in a fixed registry, never used as a path or import specifier"
    - "Rendered data-glyph ids are asserted against glyphIdsForScene over every keyframe time"

key-files:
  created:
    - src/pitch/glyphs/registry.ts
    - src/pitch/glyphs/glyphSize.ts
    - src/pitch/glyphs/Swatch.tsx
    - src/pitch/glyphs/PlayerGlyph.tsx
    - src/pitch/glyphs/BallGlyph.tsx
    - src/pitch/glyphs/EventGlyphs.tsx
    - src/pitch/glyphs/MarkGlyphs.tsx
    - src/pitch/glyphs/SceneLayer.tsx
    - src/pitch/glyphs/glyphs.test.tsx
    - src/pitch/legend/glyphIds.ts
    - src/pitch/legend/Legend.tsx
    - src/pitch/legend/legend.test.tsx
    - src/scene/fixtures/glyph-sheet.json
    - src/scene/fixtures/index.ts
  modified:
    - src/routes/dev-pitch.tsx

key-decisions:
  - "Notes truncate to 39 characters plus an ellipsis (40 in total); the full text stays in the SVG desc via describeScene"
  - "Pressure wedge points from event.start toward event.end (the pressed player's position); radius is the distance clamped to 2..6 m"
  - "Legend collapses to a wrapping row of swatch plus label; descriptions are the only thing hidden"
  - "Unknown ?scene= selects the glyph sheet; a missing param selects Pitch only"
  - "Sequence badges sit exactly on each event start point per 03-UI-SPEC, so a badge covers the passer's disc number when the start equals the player position; the glyph-sheet fixture is laid out to avoid it"

patterns-established:
  - "Scene fixtures register once in src/scene/fixtures/index.ts; dev pages consume DEV_SCENES"
  - "Opening-tag regex helpers in tests read data-part / data-event attributes from SSR markup"

requirements-completed: [PITCH-03, PITCH-04]

coverage:
  - id: D1
    description: "17 registry ids render from scene data with data-glyph; glyph sheet reaches all 17 (16 in SVG, density on Canvas)"
    requirement: PITCH-03
    verification:
      - kind: unit
        ref: "src/pitch/glyphs/glyphs.test.tsx#glyph sheet"
        status: pass
      - kind: unit
        ref: "src/pitch/glyphs/glyphs.test.tsx#registry coverage"
        status: pass
    human_judgment: false
  - id: D2
    description: "Legend ids equal rendered ids for authored, board, quiz-answer, reconstruction and glyph-sheet over every keyframe"
    requirement: PITCH-03
    verification:
      - kind: unit
        ref: "src/pitch/glyphs/glyphs.test.tsx#legend union over every keyframe"
        status: pass
      - kind: unit
        ref: "src/pitch/legend/legend.test.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "Teams separate without colour: team A filled disc and arrowhead and wedge, team B ring, hollow arrowhead, unfilled wedge"
    requirement: PITCH-03
    verification:
      - kind: unit
        ref: "src/pitch/glyphs/glyphs.test.tsx#team notation without colour"
        status: pass
    human_judgment: false
  - id: D4
    description: "Event timing and opacity, note truncation, shot ends, approximate-end description, density arcs"
    requirement: PITCH-04
    verification:
      - kind: unit
        ref: "src/pitch/glyphs/glyphs.test.tsx"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every fixture kind renders on /dev/pitch without a validation error; unknown id falls back to the glyph sheet; 375 px Auto is vertical with upright numbers; legend visible; canvas width equals CSS width x dpr"
    requirement: PITCH-04
    verification:
      - kind: other
        ref: "manual CDP check in headless Edge (see Manual check); npm run build and npm run smoke pass"
        status: pass
    human_judgment: true
    rationale: "Real-browser assertions are automated in 03-11; here they were observed once by hand"

duration: 12min
completed: 2026-11-28
status: complete
---

# Phase 3 Plan 04: Glyph Set, Notation Legend and Scene Rendering Summary

**17-glyph registry with an auto-generated always-visible legend, a SceneLayer that draws every Scene kind in the 03-UI-SPEC layer order with a Canvas density layer, and a deep-linkable /dev/pitch scene select, with tests proving the legend equals what is drawn.**

## Performance

- **Duration:** about 12 min
- **Started:** 2026-11-28T01:20:17Z
- **Completed:** 2026-11-28T01:32Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- Registry of 17 ids in legend order with labels and descriptions verbatim from 03-UI-SPEC; `glyph("nope")` throws.
- Player (A filled, B ringed, goalkeepers rounded squares), ball (owned ball 0.6 disc diameters toward the owner's attack), event, and mark glyphs; all sizes in screen pixels converted with `pxPerMetre`, all strokes non-scaling, text counter-rotated in vertical.
- `glyphIdsForScene` and `describeScene` are pure; `Legend` expanded and collapsed (swatch plus label kept), "No marks to explain yet." when empty.
- `drawDensity` paints 3 px dots at event starts with the colour read from `--density-mark`.
- `/dev/pitch`: Scene select from `DEV_SCENES`, `?scene=` deep link, size select for Pitch only and Glyph sheet, "Density layer (Canvas)" checkbox, inspector fields, attribution and still-scene lines, validation panel (up to 5 issues).

## Task Commits

1. **Task 1: Tracer, registry, player and ball glyphs, SceneLayer, legend, scene select** - `c4350be` (feat)
2. **Task 2: Event and mark glyphs, density, glyph sheet** - `a180beb` (test, RED), `a1e712c` (feat, GREEN)
3. **Task 3: Scene options, deep links, density toggle, inspector** - `5701d33` (feat)

Tracer gate: the Task 1 `<verify>` (vitest src/pitch, tsc, biome ci) was re-run green before Task 2; expansion proceeded.

## TDD Gate Compliance

- **Task 2 RED:** `npx vitest run src/pitch/glyphs --reporter=tap-flat -t "calls arc once per event"`, exit 1, `drawDensity` stub made no `arc` call ("expected [] to have a length of 5"). First attempt was `INVALID_RED` (`invalid_record`, multi-line diff in TAP); a scalar length assertion was placed ahead of the array comparison, then the classifier returned `RED_EVIDENCE_OK` (`target_test_failed`). Semantic assessment: the module loaded, the target ran and failed on the planned density assertion; the full file showed 14 of 16 tests failing against the Task 1 SceneLayer.
- **Task 2 GREEN:** `a1e712c`, 16 glyph tests pass; whole `src` run 222 passed.

## Manual check (headless Edge over CDP, dev server on 5173)
- `?scene=glyph-sheet` 1440 px: 17 distinct `data-glyph` ids in the page, 17 legend entries, `<canvas>` present with backing width 896 equal to CSS width 896 at dpr 1; screenshot reviewed.
- `?scene=board`, `authored`, `quiz-answer`, `reconstruction`: no validation panel; legend entries 5, 10, 6, 6.
- `?scene=nope`: 17 legend entries (glyph sheet) and status "No scene called “nope”. Showing the glyph sheet instead."
- 375 px Auto: pitch vertical (`transform` on the canonical root), attack up the screen, numbers upright, no horizontal scroll (scrollWidth 360 at 375), Notation panel visible under the stage.
- Not checked here (planned for 03-11): pointer readout x 11.00 m at the left penalty mark, 768 px layout, collapsed legend box measurements.

## Package legitimacy
No package installs in this plan (threat T-03-SC accepted as planned).

## Deviations from Plan

**1. [Rule 3 - Blocking] Biome `noAriaHiddenOnFocusable` on SVG groups and shapes**
- Found during: Task 1. Biome flags `aria-hidden` on SVG elements without tabindex. Fix: one `aria-hidden` group per glyph with a reasoned `biome-ignore`, titles kept outside it. Same pattern as the 03-01 canvas ignore.

**2. [Rule 3 - Blocking] Biome `noComponentHookFactories`**
- A swatch factory returned a component defined inside a function. Replaced with module-level components.

**3. [Tooling] TDD evidence format** - scalar assertion first (see TDD Gate Compliance).

**4. [Plan wording] Glyph sheet laid out around the badges**
- Sequence badges sit exactly on event start points, which covered the numbers of the passers in the first layout. The fixture's event starts are 2 to 3 m from the discs and the note sits at the pitch centre line (a 40-character chip clipped at the right edge in vertical orientation when placed near y 62). Not a change to the contract.

**Total deviations:** 4, none changing a frozen contract. **Impact:** none.

## Issues Encountered
- A wide note chip clips at the pitch edge when its anchor is near a touchline in vertical orientation; chips are sized from a 7.2 px per character estimate, not measured. Recorded for 03-11 and Phase 4 (not fixed here).
- Real Wyscout badges will cover the passer's number; revisit in Phase 4 if it hurts reading.

## Known Stubs
None. The reconstruction option loads the 03-02 fixture until 03-10 swaps it for the recipe artifact, as the plan states.

## User Setup Required
None.

## Next Phase Readiness
- 03-07 can render `<SceneLayer scene t mode>` with the playback clock and reuse `Legend`.
- 03-09 can reuse `PlayerShape` and the `upright` handling for draggable glyphs.
- 03-10 changes the `reconstruction` loader in `src/scene/fixtures/index.ts`.

## Self-Check: PASSED
- All 14 created files exist; commits c4350be, a180beb, a1e712c, 5701d33 are ancestors of HEAD.

---
*Phase: 03-pitch-standard-data-pipeline*
*Completed: 2026-11-28*
