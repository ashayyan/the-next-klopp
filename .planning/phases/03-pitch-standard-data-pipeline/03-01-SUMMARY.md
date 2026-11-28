---
phase: 03-pitch-standard-data-pipeline
plan: "01"
subsystem: ui
tags: [react, svg, canvas, tailwind, pitch, law-1, view-matrix]

requires:
  - phase: 01-setup-contracts
    provides: Vite 8 + React 19 skeleton, dev-only route gate in buildRoutes, smoke script, Biome, Vitest
  - phase: 02-research
    provides: Law 1 values and registry locators (research/pitch-geometry/findings.md)
provides:
  - LAW1 constants and pure pitchGeometry(length, width) in canonical metres
  - makeView one view matrix (viewBox, group transform, cssMatrix) plus screenToCanonical, canonicalToScreen, canvasMatrix, sizeInMetres, autoOrientation
  - <Pitch> layered renderer (bottom SVG, canvas slot, top SVG canonical root) and usePitch() context with upright()
  - <CanvasLayer> painting in canonical metres at device resolution
  - placeholder 03-UI-SPEC tokens in src/index.css with Tailwind @theme inline colour mapping
  - dev-only /dev/pitch page (scene select, pitch size, orientation, pointer readout) linked from /dev
  - smoke marker proving the dev-pitch page is absent from dist/assets
affects: [03-04 glyphs, 03-07 playback, 03-09 drag spike, 03-10, 03-11 browser checks, phase-04 design tokens, phase-08 pitch lessons]

actuals:
  tokens: 13261
  tasks: 3
  commits: 4
plan_head_before: 8a1803f9296d000c37595d82c57e42c78ae3ce7d
plan_head_after: bbdb59834f89ed244d95121a977294955c30a8cf

tech-stack:
  added: []
  patterns:
    - "Canonical metres everywhere; orientation is a group matrix inside a swapped viewBox"
    - "Own 6-number matrix helpers (node has no DOMMatrix); pointer inverse via canonical-root getScreenCTM"
    - "SSR static-markup tests (react-dom/server) instead of jsdom"
    - "Colour only via CSS variables; palette scan test forbids hex in pitch/scene TypeScript"

key-files:
  created:
    - src/pitch/geometry.ts
    - src/pitch/geometry.test.ts
    - src/pitch/view.ts
    - src/pitch/view.test.ts
    - src/pitch/Pitch.tsx
    - src/pitch/CanvasLayer.tsx
    - src/pitch/pitch.test.tsx
    - src/routes/dev-pitch.tsx
  modified:
    - src/index.css
    - src/routes.ts
    - src/routes.test.ts
    - src/routes/dev.tsx
    - scripts/smoke.ts
    - biome.json

key-decisions:
  - "Pitch stage is a <section aria-label=\"Pitch stage\" data-stage> (implicit role region) because Biome noRedundantRoles rejects role=\"region\" on section"
  - "Fonts are not re-mapped in @theme: Tailwind's font-sans/font-mono utilities already read --font-sans/--font-mono, and a self-referencing mapping would be circular"
  - "Biome CSS parser has tailwindDirectives enabled so @theme in src/index.css parses"
  - "Markings carry data-marking ids including field-boundary (18 elements) for tests and later queries"

patterns-established:
  - "Pitch children draw in canonical metres inside <g data-canonical-root>"
  - "Screen-pixel glyph sizes convert to metres with sizeInMetres(min, metres, max, pxPerMetre)"
  - "Dev pages put a unique copy phrase in their subline and smoke.ts asserts it is absent from dist/assets"

requirements-completed: [PITCH-01]

coverage:
  - id: D1
    description: "Law 1 markings from pitchGeometry at 105x68, 100x65 and 101x68 (areas 16.5 deep / 40.32 wide, arcs only outside the area, corner arcs r 1)"
    requirement: PITCH-01
    verification:
      - kind: unit
        ref: "src/pitch/geometry.test.ts"
        status: pass
      - kind: unit
        ref: "src/pitch/pitch.test.tsx#draws the full Law 1 marking set"
        status: pass
    human_judgment: false
  - id: D2
    description: "One view matrix: viewBox/group transform/cssMatrix in both orientations; left penalty mark reads 11.00/34.00; canvasMatrix = cssMatrix x dpr"
    requirement: PITCH-01
    verification:
      - kind: unit
        ref: "src/pitch/view.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Layer stack bottom svg, canvas[data-layer=canvas], titled top svg; canvas aria-hidden and pointer-events none"
    requirement: PITCH-01
    verification:
      - kind: unit
        ref: "src/pitch/pitch.test.tsx#<CanvasLayer> in the layer stack"
        status: pass
    human_judgment: false
  - id: D4
    description: "Palette only in src/index.css; every 03-UI-SPEC token declared"
    requirement: PITCH-01
    verification:
      - kind: unit
        ref: "src/pitch/pitch.test.tsx#palette lives only in src/index.css"
        status: pass
    human_judgment: false
  - id: D5
    description: "/dev/pitch is dev-only and absent from the study build"
    requirement: PITCH-01
    verification:
      - kind: unit
        ref: "src/routes.test.ts"
        status: pass
      - kind: integration
        ref: "npm run smoke (smoke ok (preview))"
        status: pass
    human_judgment: false
  - id: D6
    description: "Live pointer readout and ResizeObserver behaviour in a real browser (getScreenCTM inverse, vertical Auto below 480 px, canvas backing store = CSS x dpr)"
    requirement: PITCH-01
    verification: []
    human_judgment: true
    rationale: "Node Vitest cannot run getScreenCTM, ResizeObserver or canvas; real-browser assertions are planned in 03-11 (CDP headless Edge)"

duration: 10min
completed: 2026-11-28
status: complete
---

# Phase 3 Plan 01: Canonical Pitch Renderer Summary

**Law 1 pitch drawn from a pure `pitchGeometry(length, width)` through one `makeView` matrix shared by the SVG viewBox, the vertical group transform, the Canvas `setTransform` and the pointer inverse, shown on a dev-only `/dev/pitch` page.**

## Performance

- **Duration:** about 10 min
- **Started:** 2026-11-28T00:48:24Z
- **Completed:** 2026-11-28T00:58:00Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- `LAW1` (IFAB 2026/27 locators in comments; `goalDrawDepth` flagged as a drawing convention) and `pitchGeometry` returning field, halfway line, centre circle and mark, goal and penalty areas, marks, arcs (`{cx, cy, r, from, to, mid, d}`, sweep 1), four corner arcs and 2 m schematic goals.
- `view.ts` frozen to the interfaces block: horizontal `-3 -3 L+6 W+6`, vertical swapped viewBox with `matrix(0 -1 1 0 0 L)`; own matrix helpers; `sizeInMetres`, `autoOrientation` (vertical below 480 px).
- `<Pitch>`: bottom `aria-hidden` SVG (run-off, field), `canvas` slot, transparent top SVG with `<title>` "Pitch, {L} by {W} metres — {title}", `role="img"`/`"group"`, `<g data-canonical-root>` holding markings then children; ResizeObserver width; pointer readout through the group's inverse screen CTM.
- `<CanvasLayer>`: backing store `floor(css × dpr)`, identity clear, then `setTransform(...canvasMatrix(view, dpr))`; dpr tracked by a re-created `(resolution: Ndppx)` query.
- Tokens: one `:root` block with every 03-UI-SPEC placeholder plus `@theme inline` colour mapping; reduced-motion rule zeroes transitions and animations.
- `/dev/pitch`: header and subline copy, toolbar (Scene, Pitch size with the three registered sizes, orientation radios Auto/Horizontal/Vertical, 44 px controls with accent focus ring), stage, Inspector with mono "Pointer x 52.50 m · y 34.00 m" / "Pointer off pitch".

## Task Commits

1. **Task 1: End-to-end Law 1 pitch on /dev/pitch (tracer)** - `9673d59` (feat)
2. **Task 2: Orientation, registered pitch sizes and pointer readout** - `7c298f7` (feat)
3. **Task 3: CanvasLayer, /dev link, study-build marker** - `e2784c7` (test, RED), `bbdb598` (feat, GREEN)

## TDD Gate Compliance

- **Task 2 RED:** unexpected green. The Task 1 tracer already implemented `geometry.ts` and `view.ts` to the frozen interfaces block, so the new behaviour tests passed on first run. Semantic check instead: two mutations were applied and reverted (arc sweep flag 1 to 0: 2 geometry tests fail; vertical `f` term `L + r` to `L - r`: 1 view test fails), so the tests discriminate. No separate RED commit for Task 2.
- **Task 3 RED:** `npx vitest run src/pitch/pitch.test.tsx --reporter=tap-flat`, exit 1; target "<CanvasLayer> in the layer stack > orders bottom svg, then the canvas layer, then the titled top svg" failed with "expected -1 to be greater than 77" against a `CanvasLayer` stub that renders null. Classifier: `RED_EVIDENCE_OK` (target_test_failed). Semantic assessment: the target ran and failed on the planned layer-order assertion; the module loaded.
- **Task 3 GREEN:** `bbdb598`, 36 tests pass in `src/pitch` + routes.

## Files Created/Modified
- `src/pitch/geometry.ts` - LAW1 and pitchGeometry
- `src/pitch/view.ts` - view matrix and helpers
- `src/pitch/Pitch.tsx` - layered pitch and usePitch
- `src/pitch/CanvasLayer.tsx` - DPR-aware canvas layer
- `src/pitch/{geometry,view}.test.ts`, `src/pitch/pitch.test.tsx` - geometry, matrices, SSR markup, layer order, palette scan
- `src/routes/dev-pitch.tsx` - dev page
- `src/index.css` - tokens
- `src/routes.ts`, `src/routes.test.ts`, `src/routes/dev.tsx` - route and link
- `scripts/smoke.ts` - dev-pitch marker
- `biome.json` - CSS parser `tailwindDirectives`

## Decisions Made
See `key-decisions` in the frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Biome could not parse Tailwind `@theme`**
- **Found during:** Task 1
- **Issue:** `biome check` failed on `src/index.css`: "Tailwind-specific syntax is disabled".
- **Fix:** `css.parser.tailwindDirectives: true` in `biome.json`; `!important` in the reduced-motion rule kept with per-line `biome-ignore` reasons.
- **Files modified:** biome.json, src/index.css
- **Committed in:** 9673d59

**2. [Rule 3 - Blocking] Biome noRedundantRoles on the stage section**
- **Found during:** Task 1
- **Issue:** `role="region"` on `<section>` is a Biome error.
- **Fix:** `<section aria-label="Pitch stage" data-stage>`; the accessible role is still region. Later plans that need the stage should query `[data-stage]` or `section[aria-label="Pitch stage"]`.
- **Committed in:** 9673d59

**3. [Rule 3 - Blocking] Biome noAriaHiddenOnFocusable false positive on `<canvas>`**
- **Found during:** Task 3
- **Fix:** `biome-ignore` with reason (a canvas without tabindex is not focusable); `aria-hidden` is required by the plan.
- **Committed in:** bbdb598

**4. [Plan wording] Font mapping in `@theme inline`**
- The plan asked to map fonts to `--font-sans`/`--font-mono` in `@theme inline`; the root tokens already have those names, so the mapping would be self-referencing. Tailwind's default `font-sans`/`font-mono` utilities read the same variables and the unlayered `:root` value wins (checked in the built CSS).

---

**Total deviations:** 4 (3 blocking lint/parser fixes, 1 wording adjustment). **Impact:** none on behaviour or contracts.

## Issues Encountered
- Headless Edge `--dump-dom` printed nothing on this machine, so no live DOM check was done here; real-browser assertions are planned for 03-11.

## User Setup Required
None.

## Next Phase Readiness
- 03-04 (glyphs) can draw inside `<Pitch>` children with `usePitch().view.pxPerMetre`, `sizeInMetres` and `upright()`.
- 03-09 (drag) reuses the canonical-root inverse CTM path.

## Self-Check: PASSED
- All 8 created files exist; commits 9673d59, 7c298f7, e2784c7, bbdb598 are ancestors of HEAD.

---
*Phase: 03-pitch-standard-data-pipeline*
*Completed: 2026-11-28*
