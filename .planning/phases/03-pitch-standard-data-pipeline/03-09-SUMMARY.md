---
phase: 03-pitch-standard-data-pipeline
plan: "09"
subsystem: ui
tags: [pointer-capture, drag, keyboard-nudge, accessibility, converter-probe, provider-landmarks]

requires:
  - phase: 03-pitch-standard-data-pipeline
    provides: Pitch, usePitch, view matrix, canonical-root group (03-01); toCanonical, providerBounds, landmarks fixture (03-03); PlayerGlyph, SceneLayer, PointGlyph (03-04); stage key handler that ignores data-draggable (03-07)
provides:
  - clampToRunoff, roundTenth, dragPosition, nudge, nudgePosition (pure, tested)
  - useDraggableEntity (pointer capture, canonical-root inverse CTM, Escape cancel, arrow nudge with a 500 ms settle)
  - DraggableHandle (22 px hit circle, focusable group) and SceneLayer props positions, draggable, onEntityMove, onEntityEnd
  - /dev/pitch board spike: drag, ghost, Reset positions, announcement
  - probeConvert, PROBE_PROVIDERS, landmarkMarks, ConverterProbe panel and LandmarksLayer overlay
affects: [03-11 browser checks, ADR 0009, phase-06 tap-to-answer, phase-08 Tactics Board]

actuals:
  tokens: 34000
  tasks: 3
  commits: 3
plan_head_before: c3936f0b8aa02daebd77b5ddd74bd16ec73a1b08
plan_head_after: b113e1757e6e07c5da9e475dfb2d955d3ed97583

tech-stack:
  added: []
  patterns:
    - "The interactive handle and the visible disc are separate elements: the handle never moves in the DOM (a move drops pointer capture), only the visual reorders so the dragged disc paints last"
    - "Screen to canonical goes through the inverse screen CTM of [data-canonical-root], so one code path is right in both orientations"
    - "Arrow keys map the screen unit vector through the inverse linear part of the view matrix, then normalise to exactly 1 m or 5 m"
    - "Overlays convert live with toCanonical from the fixture inputs, never from the stored expected values"

key-files:
  created:
    - src/pitch/drag.ts
    - src/pitch/drag.test.ts
    - src/pitch/useDraggableEntity.ts
    - src/routes/dev-pitch/probe.ts
    - src/routes/dev-pitch/probe.test.ts
    - src/routes/dev-pitch/ConverterProbe.tsx
    - src/routes/dev-pitch/LandmarksLayer.tsx
  modified:
    - src/pitch/glyphs/PlayerGlyph.tsx
    - src/pitch/glyphs/SceneLayer.tsx
    - src/pitch/glyphs/MarkGlyphs.tsx
    - src/pitch/legend/Legend.tsx
    - src/routes/dev-pitch.tsx
    - src/index.css

key-decisions:
  - "Grab offset is kept on pointer-down so the player does not jump to the pointer; the result is still clamped and rounded"
  - "Draggable players are a hit circle plus focus rings in a separate interaction layer above the scene; the visible disc stays in the players layer (needed so capture survives the dragged-on-top reorder)"
  - "The announcement for the board has no playback bar to live in, so the dev page shows a visible role=status line beside Reset positions"
  - "Landmarks overlay follows the chosen pitch size using the fixture cases whose targetPitch matches (Fulham 100 x 65 works, 101 x 68 shows nothing); run-off and source-pitch cases are skipped"
  - "Empty probe fields show no error (an untouched field is not an error); probeConvert itself still returns ok false for them"

patterns-established:
  - "Escape works through both a key handler on the player and a window listener that exists only while a drag runs"
  - "Legend takes extraGlyphs for dev overlays instead of faking a scene"

requirements-completed: [PITCH-01, PITCH-02]

coverage:
  - id: D1
    description: "Board players drag in canonical metres under the pointer in both orientations, clamp to the run-off, Escape returns to the start, Reset restores the fixture, the drop is announced"
    requirement: PITCH-01
    verification:
      - kind: unit
        ref: "src/pitch/drag.test.ts (clampToRunoff, roundTenth, dragPosition)"
        status: pass
      - kind: other
        ref: "manual CDP check in headless Edge, horizontal and vertical (see Manual checks)"
        status: pass
    human_judgment: true
    rationale: "Real pointer events are automated in 03-11; Vitest here is Node-only"
  - id: D2
    description: "Keyboard: Tab reaches each outfield player in team A then team B order, two-tone focus ring on :focus-visible, 1 m and 5 m (Shift) nudges in screen directions, one announcement 500 ms after the last nudge"
    requirement: PITCH-01
    verification:
      - kind: unit
        ref: "src/pitch/drag.test.ts (nudge, nudgePosition, both orientations)"
        status: pass
      - kind: other
        ref: "manual CDP check: tab order, aria-label, nudges, debounce (see Manual checks)"
        status: pass
    human_judgment: true
    rationale: "A real screen reader was not used; the label and live-region text were read from the DOM"
  - id: D3
    description: "Entering x 130 for StatsBomb shows the exact inline range error and draws no probe point; valid input converts and draws a point glyph"
    requirement: PITCH-02
    verification:
      - kind: unit
        ref: "src/routes/dev-pitch/probe.test.ts"
        status: pass
      - kind: other
        ref: "manual CDP check: error text, aria-invalid, no point glyph in range, point glyph and legend entry when valid"
        status: pass
    human_judgment: false
  - id: D4
    description: "Provider landmarks overlay draws every shared fixture landmark per provider with chips S, O, W, T; the four points of a shared landmark coincide; the two penalty marks form separate clusters"
    requirement: PITCH-02
    verification:
      - kind: unit
        ref: "src/routes/dev-pitch/probe.test.ts#landmarkMarks"
        status: pass
      - kind: other
        ref: "screenshots at 1440 and 375 px reviewed (59 marks, chips SOWT)"
        status: pass
    human_judgment: true
    rationale: "Visual coincidence and clutter were judged from screenshots"

duration: 40min
completed: 2026-11-28
status: complete
---

# Phase 3 Plan 09: Drag Spike, Converter Probe and Provider Landmarks Summary

**Board players drag with pointer capture and move with arrow keys in screen directions in both orientations, and the converter probe plus a provider-landmarks overlay make the TS-to-kloppy converters visible on /dev/pitch.**

## Performance

- **Duration:** about 40 min
- **Tasks:** 3
- **Files modified:** 13 (7 created, 6 modified)

## Accomplishments
- `drag.ts`: `clampToRunoff` (3 m run-off, edges inclusive), `roundTenth` (no negative zero), `dragPosition`, `nudge` and `nudgePosition`; 18 tests.
- `useDraggableEntity`: `setPointerCapture`, inverse CTM of `[data-canonical-root]`, grab offset, Escape cancel (handler on the player plus a window listener only while dragging), cancel on `pointercancel`, drop on `pointerup` or lost capture, `user-select: none` on the body during a drag, arrow nudges settled by one `onEnd` 500 ms after the last key.
- `DraggableHandle`: invisible 22 px hit circle (`touch-action: none`, cursor grab / grabbing) in a focusable `<g tabindex="0" role="button" aria-roledescription="draggable player" aria-label="{team}, number {n}, {role}, x {x} metres, y {y} metres">`; two-tone ring (2 px `--label-bg` inner, 2 px `--ink` outer) shown through CSS on `:focus-visible` only.
- `SceneLayer`: `positions`, `draggable`, `onEntityMove`, `onEntityEnd`; ghost at 0.3 opacity at the start position; dragged disc painted last; handles sorted team A by shirt number then team B.
- `/dev/pitch?scene=board`: 20 outfield players draggable (goalkeepers and ball not), "Reset positions" quiet button, visible polite status line "Number 9 moved to x 76.4 m, y 40.2 m.", top SVG `role="group"`; nothing persisted.
- `probe.ts`: StatsBomb, Opta, Wyscout, Tracking; exact range copy "x must be between 0 and 120 for StatsBomb (120 × 80)."; decimal-only parsing (rejects exponent, hex, Infinity); 17 tests including conversions (60, 40 gives 52.5, 34; Opta 11.5, 50 gives 11, 34; Wyscout 90, 50 gives 94, 34; Tracking 0, 0 gives 52.5, 34).
- `ConverterProbe` panel (h2 "Converter probe") with `aria-invalid` and `aria-describedby` errors in `--danger`, mono readout; `LandmarksLayer` overlay behind the "Provider landmarks" checkbox (default off); Legend gained `extraGlyphs` so the `point` entry shows when an overlay is on.

## Task Commits

1. **Task 1 (tracer): pointer drag of board players** - `8d12402` (feat)
2. **Task 2: keyboard nudge, focus ring, debounced announcement** - `e67c2ae` (feat)
3. **Task 3: converter probe and provider landmarks overlay** - `b113e17` (feat)

Tracer gate: the Task 1 verify (`vitest run src/pitch`, `tsc --noEmit`, `biome ci src`) was green and the drag, Escape, clamp and Reset were exercised in headless Edge before Task 2.

## TDD Gate Compliance

- **Task 1:** `drag.test.ts` was written before `drag.ts`; the first run failed at import (module missing), then 11 passed.
- **Task 2 RED:** `npx vitest run src/pitch/drag.test.ts` failed 7 of 18 tests (`nudge` and `nudgePosition` not exported yet), then 18 passed after the implementation.
- **Task 3:** `probe.test.ts` was written before `probe.ts`; the first run failed at import, then all passed. The RED-evidence classifier was not run for any of these (all RED runs are import or missing-export failures).

## Manual checks (headless Edge over CDP, dev server on 5173)
- Board drag at 1440 px, 100 px right and 50 px down moved home-9 from (64, 34) to (76.4, 40.2) (about 8.06 px per metre); ghost present during the drag, cursor `grabbing`, announcement "Number 9 moved to x 76.4 m, y 40.2 m.", ghost gone after the drop.
- Escape mid-drag restored (76.4, 40.2) and the later pointer release did nothing. Dragging 2000 px outside clamped to (108, 71). Reset restored (64, 34).
- Tab order from the DOM: home-2 to home-11 then away-2 to away-11 (20 handles); the label read "Home 4-3-3, number 3, Left back, x 25.0 metres, y 10.0 metres"; ring `visibility: visible` after Tab.
- Horizontal ArrowRight then ArrowDown moved (25, 10) to (26, 11); no announcement immediately, "Number 3 moved to x 26.0 m, y 11.0 m." after 700 ms; Shift + ArrowLeft moved 5 m.
- Vertical orientation: ArrowUp moved x +1 (up the screen), ArrowRight moved y +1; a 80 px upward pointer drag moved x +6.6 and left y unchanged.
- Probe: StatsBomb x 130 showed the exact error, `aria-invalid` true, `aria-describedby` set, no point glyph; x 60, y 40 gave "Canonical x 52.50 m · y 34.00 m" and one point glyph and the legend entry "point"; Opta 11.5, 50 gave "x 11.00 m · y 34.00 m".
- Landmarks overlay: 59 marks, chips S O W T; screenshots at 1440 and 375 px (vertical, chip text upright, no horizontal scroll: scrollWidth 360). Chips near the right edge run leftwards so none is clipped.
- Not done: no real screen reader, no touch device (touch-action is set but no touch event was dispatched), Firefox and Safari not checked.

## Package legitimacy
No packages installed (T-03-SC accepted).

## Deviations from Plan

**1. [Rule 1 - Bug avoided] Visual and handle split**
- The plan puts a hit circle "behind the disc" inside PlayerGlyph and renders the dragged player last. Re-ordering a keyed SVG element moves it in the DOM and drops its pointer capture, so the hit circle and focus ring live in a separate interaction layer (`DraggableHandle`) while only the visible disc reorders. Behaviour matches the contract (hit target 44 px, dragged disc on top, ghost at the start position).

**2. [Plan wording] Hook API**
- `useDraggableEntity` takes `view` (needed for the nudge) and returns `{ hit, onKeyDown, dragging, start, cancel }`; callbacks are per entity (`onMove(p)`, `onEnd(p)`, `onDragChange(start | null)`) rather than carrying the id. `onEnd` also fires 500 ms after the last nudge so one callback drives the announcement.

**3. [Rule 2 - Missing critical] Visible announcement line**
- The board has no playback bar and so no existing live region; added a `role="status"` line beside Reset positions (visible, muted 14 px).

**4. [Rule 2 - Missing critical] CSS for the focus ring**
- The two rings must show on `:focus-visible` only and the group's default outline must go; five rules added to `src/index.css` (no colour literals).

**5. [Plan wording] Landmarks overlay follows the pitch size**
- The plan names the 105 x 68 cases. Passing the live pitch to `landmarkMarks` lets the Fulham 100 x 65 size show its own cases instead of drawing wrong points on a different pitch.

**6. [Process] Design skill files not read**
- Read `web-design-guidelines/SKILL.md` (it defers to a rules file I did not open) and listed the headings of `design-taste-frontend/SKILL.md`; applied 03-UI-SPEC directly (flat panels, one quiet button style, danger only for the probe error, no new colours).

**Total deviations:** 6, none changing a frozen contract.

## Issues Encountered
- Several bash heredocs carrying Python with quotes failed to parse in this harness; edits were redone through scripts written with the Write tool.
- Biome `useExhaustiveDependencies` flagged the Escape effect; `cancel` and `finish` became `useCallback` over refs only.
- `ci.yml` has no trigger for a branch without a pull request, so no CI run existed for pushes. Added `workflow_dispatch` (committed as `chore(03-08)`, `fb0307c`) with a `origin/main` fallback for the immutability base, and dispatched a run on the branch.

## Known Stubs
None.

## User Setup Required
None.

## Next Phase Readiness
- 03-11 can query `[data-entity]`, `[data-hit]`, `[data-ghost]`, `[data-readout="announcement"]`, `input[name="probe-x"|"probe-y"]`, `select[name="probe-provider"]`, `input[name="layer-landmarks"]`, `[data-landmark]` and `[data-part="provider-chip"]`.
- The Phase 8 Tactics Board can reuse `useDraggableEntity`, `nudge`, `DraggableHandle` and the `positions` override unchanged.

## Self-Check: PASSED
- All 7 created files exist; commits 8d12402, e67c2ae, b113e17 are ancestors of HEAD.

---
*Phase: 03-pitch-standard-data-pipeline*
*Completed: 2026-11-28*
