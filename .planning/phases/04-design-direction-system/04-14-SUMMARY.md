---
phase: 04-design-direction-system
plan: "14"
subsystem: design
tags: [gallery, dev-route, iframe, state-matrix, foundations, pitch, interactions, playwright, vitest]
status: complete

requires:
  - phase: 04-design-direction-system
    provides: "DESIGN.md token source and the picked-only dev routes (04-13); Button, Segmented and icons (04-07, 04-08); review CLI (04-05, 04-06); Phase 3 pitch, glyph, legend and playback components"
provides:
  - "/dev/gallery and /dev/gallery/:primitiveId (dev only): index, primitive page, bare state matrix, Width and Theme switchers over real same-origin iframes, deep links, fallbacks"
  - "src/routes/dev-gallery/registry.ts: GROUPS, GALLERY, findPrimitive, groupedPrimitives, stateFromHash"
  - "Foundations (colour, type, space-radius, icons, motion), Pitch (pitch, glyphs, legend), Interactions (playback, drag, converter-probe) and the Controls tracer (button) with every listed state"
  - "Button loading state (label kept, aria-busy, static dots, stays focusable)"
affects: [04-15 Controls and Overlays, 04-16 Lesson and Data, 04-17 visual baselines and phase gate, later phases that add primitives]

actuals:
  tokens: 18000
  tasks: 3
  commits: 3
plan_head_before: 2eb5d064af266f729d83c59f76e6ec1c29dc2a9a
plan_head_after: 58283040c92a93b684729f377fad9a6a003448db

tech-stack:
  added: []
  patterns:
    - "Gallery registry: a URL id is only matched against a fixed list; a frame URL is built from a registry id, a fixed theme pair and a state that the primitive lists"
    - "Bare state matrix: one wrapper per theme with data-theme, one StateCell per state with id state-<state> and data-gallery-state, data-ready after document.fonts.ready"
    - "Real-width frames: iframes at 375, 768 and 1440 CSS px, height from a ResizeObserver in the frame's own window, the first measurement that finds the deep-linked cell scrolls the page"

key-files:
  created:
    - src/routes/dev-gallery.tsx
    - src/routes/dev-gallery/registry.ts
    - src/routes/dev-gallery/Frames.tsx
    - src/routes/dev-gallery/StateCell.tsx
    - src/routes/dev-gallery/demos/controls.tsx
    - src/routes/dev-gallery/demos/foundations.tsx
    - src/routes/dev-gallery/demos/pitch.tsx
    - src/routes/dev-gallery/gallery.test.tsx
    - tests/functional/gallery.spec.ts
  modified:
    - src/routes.ts
    - src/routes.test.ts
    - src/routes/dev.tsx
    - src/ui/Button.tsx
    - src/index.css
    - .planning/phases/04-design-direction-system/deferred-items.md

key-decisions:
  - "Primitive pages use one iframe per width and theme; theme=both on a bare page renders both themes in one document with the state ids on the first copy only, so an id stays unique"
  - "Colour, type, space, radius, motion and elevation values are read from the DESIGN.md tokens block at run time (?raw import, extractTokensBlock, parseTokens), so the gallery cannot drift from the system"
  - "The glyph sheet is a gallery-only scene in two states: team A draws all 17 registry glyphs; team B repeats every event with ring discs, hollow arrowheads and the amber line, so team B is visible and reviewable in both themes"
  - "Wide primitives (glyphs, playback, drag) get one column below 1280 px and two above, so a cell is never narrower than about 680 px next to a wide viewport's media queries"
  - "The drag primitive uses a six-player board; the 22-player board cannot keep 44 px targets apart on a 343 px pitch (logged in deferred-items.md)"
  - "DSGN-04 is not marked complete: 04-15, 04-16 and 04-17 also carry it"

patterns-established:
  - "State-forcing for a pitch element: an attribute rule next to the real :focus-visible rule in index.css, set from the gallery demo"

requirements-completed: []

duration: 75min
completed: 2026-11-28
---

# Phase 4 Plan 14: Component gallery Summary

**`/dev/gallery` renders every primitive and state in real 375, 768 and 1440 px frames in either theme, with deep links and fallbacks. Foundations, Pitch and Interactions are built from the DESIGN.md tokens, and the team B rendering is shown in both themes.**

## Accomplishments

- **Tracer (button):** route, registry, bare matrix, Width and Theme switchers, iframes at exact widths whose media queries fire, a 1440 frame that scrolls inside its wrapper and never widens the page, and the `#state-disabled` deep link that scrolls the first frame's cell to the top of the page.
- **Index and fallbacks:** a plain grouped list with state counts and no card grid. `No primitive called “nope”. Pick one from the list.` and `No state called “nope” for Button. Showing all states.` A native `Primitive` select below 1280 px.
- **Foundations:** `colour` (every token of the DESIGN.md block with name, hex and contrast against the page to one decimal), `type`, `space-radius`, `icons`, `motion` (paused demos driven by a Progress range, plus a reduced-motion state).
- **Pitch and Interactions:** `pitch` (horizontal, vertical, 100 x 65 m, Canvas density), `glyphs`, `legend`, `playback` (paused, playing at a fixed time with no loop, at end with "Replay sequence", still scene with no bar), `drag` (board, forced focus ring, forced ghost), `converter-probe` (idle, valid, range error).
- **Team B:** the `glyphs` primitive has a `team-b` state next to `team-a`. The functional spec asserts ring discs, the goalkeeper square and hollow arrowheads in the light and the dark theme, and I read the 1440 captures of both themes: the amber ring discs and hollow arrowheads are clear against the pitch in each.

## Task Commits

1. **Task 1 (tracer): route, registry, frames, switchers, deep link, button:** `6bdae4c`
2. **Task 2: index, fallbacks, Foundations group, `gallery.test.tsx`:** `89c254f`
3. **Task 3: Pitch and Interactions groups, reviews fixed:** `5828304`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Range input had no visible focus ring**
- **Found during:** Task 2 review of `/dev/gallery/motion?bare=1`
- **Fix:** 2 px outline with the `focus-ring` token on the Progress input. **Commit:** `89c254f`

**2. [Rule 1 - Bug] Deep link scrolled before the route had rendered**
- **Found during:** Task 1 functional spec
- **Issue:** the iframe `load` event fires before React mounts, so the cell did not exist yet.
- **Fix:** the ResizeObserver measure looks for the cell and scrolls the page once, on the first measurement that finds it. **Commit:** `6bdae4c`

**3. [Rule 1 - Bug] Review FAILs on the first Pitch and Interactions pages**
- `playback`: `tap-size` at 1440, because the bar sat in a one-third column. Fix: wide primitives get one or two columns.
- `drag`: `tap-size` at 375, because 22 draggable 44 px targets overlap on a 343 px pitch. Fix: a six-player gallery board, and the finding logged in `deferred-items.md`.
- `glyphs`: `taste-copy` FAIL from the expanded legend text. Fix: collapsed legends in the cells (swatch and label stay).
- **Commit:** `5828304`

**4. [Rule 2 - cleanup] The loading mark is one SVG**
- Three span dots tripped the `card-grid` WARN ("3 identical boxes"); one `<svg>` with three circles keeps the check quiet. **Commit:** `6bdae4c`

### Plan-vs-spec notes

- 04-UI-SPEC lists a `Primitive` select "native" below 1280 px; the gallery shows the sticky list from 1280 px (`xl`), not from 1440 px, because the Tailwind step is 1280.
- The plan's Task 1 registers `button` under Controls while 04-15 adds the other Controls; the registry is ordered by `GROUPS`, so 04-15 only appends.

## Check results

- `npm test`: 1158 passed, 6 skipped (one run showed one failed test that did not repeat in three further runs; the failing name was not captured). `npx tsc --noEmit`, `npx biome ci .`, `npm run guard`: clean.
- `REVIEW_PORT=5184 npx playwright test --project=functional`: 41 passed (28 gallery tests and the 13 directions tests).
- `npm run build && npm run guard:bundle && npm run smoke`: ok; no gallery code in `dist/assets`.
- Reviews (port 5184), all `REVIEW: PASS` with 0 fail: `/dev/gallery`, and `?bare=1` for button, colour, type, space-radius, icons, motion, pitch, glyphs, legend, playback, drag and converter-probe. WARN lines remain on some pages (`taste-copy`, `card-grid`, `banned-eyebrow`, `arrow-suffix`, `taste-layout` at the 768 edge rule): they are WARN by design and not FAIL.

## Known Stubs

None. The gallery is a dev-only route; nothing in it is a placeholder for shipped content.

## Threat Flags

None. T-04-25 and T-04-26: frame URLs come from a registry id, the fixed `light`/`dark` pair and a listed state; `frameSrc` throws on an unknown id and drops a state the primitive does not list (unit tests cover both). The route is in the dev branch only, so it is absent from the build.

## Open for later plans

- 04-15 adds Controls (link, input, select, checkbox-radio-switch, segmented, slider, tabs) and Overlays; 04-16 adds Lesson and Data; 04-17 adds the visual baselines that loop over `GALLERY`.
- The two items in `deferred-items.md` under "From plan 04-14".
- The deferred `/dev/pitch` `tap-size` item (selects and inputs of 20 px) still stands.

## Self-Check: PASSED

- FOUND: `src/routes/dev-gallery.tsx`, `src/routes/dev-gallery/{registry,Frames,StateCell}.ts(x)`, `demos/{controls,foundations,pitch}.tsx`, `gallery.test.tsx`, `tests/functional/gallery.spec.ts`
- FOUND commits: 6bdae4c, 89c254f, 5828304
- Acceptance: `grep -c "/dev/gallery" src/routes.ts` = 3; `grep -c "Component gallery" src/routes/dev.tsx` = 1; `grep -c "converter-probe" src/routes/dev-gallery/registry.ts` = 1; `gallery.test.tsx` has 24 tests; `grep -c "No primitive called" src/routes/dev-gallery.tsx` = 1.
