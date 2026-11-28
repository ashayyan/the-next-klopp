---
phase: 04-design-direction-system
plan: "16"
subsystem: design
tags: [gallery, inventory, lesson-primitives, data-primitives, quiz, progress-ring, charts, base-ui, playwright, vitest]
status: complete

requires:
  - phase: 04-design-direction-system
    provides: "Gallery route, registry, bare state matrix, review CLI (04-14); controls and overlays on Base UI (04-15); shell bar, step rail, confusion button, glossary card, stat card, chart and table primitives (04-08, 04-09)"
provides:
  - "src/routes/dev-gallery/inventory.json: the 37 primitives of the 04-UI-SPEC gallery table with their states; the inventory test and the 04-17 visual spec read it"
  - "QuizOption (seven states, icon plus words for the revealed answers), ProgressRing (Base UI Meter), Badge (neutral, done, new), Surface (page, panel, raised, sheet)"
  - "Chart additions Line, Marker, ChartLegend, TableViewToggle, formatNumber; StatCard loading and missing; DataTable forced row look"
  - "The Lesson group (9 ids) and the Data group (4 ids) in /dev/gallery, so GALLERY holds all 37 ids"
affects: [04-17 visual baselines and phase gate]

actuals:
  tokens: 36000
  tasks: 3
  commits: 4
plan_head_before: 7ba2d58787c07ada0b3cb9f08445b6555c5f7b5b
plan_head_after: cc75d62f55aab42ffd77fcd6dac61323ea9203ea

tech-stack:
  added: []
  patterns:
    - "A static open popup for a screenshot: ShellBar, ConfusionButton and RadioMenu take open state plus a portal container, the cell clips it (overflow-x-clip) so a repositioning popup cannot widen the page"
    - "One number formatter (formatNumber) for every chart and table figure; labels are React text nodes only"
    - "Series differ by colour, marker shape and a direct label; a legend draws only for two or more series"

key-files:
  created:
    - src/routes/dev-gallery/inventory.json
    - src/routes/dev-gallery/demos/lesson.tsx
    - src/routes/dev-gallery/demos/data.tsx
    - src/ui/lesson/QuizOption.tsx
    - src/ui/lesson/ProgressRing.tsx
    - src/ui/lesson/Badge.tsx
    - src/ui/Surface.tsx
  modified:
    - src/routes/dev-gallery/registry.ts
    - src/routes/dev-gallery/gallery.test.tsx
    - src/ui/ui.test.tsx
    - src/ui/data/chart.tsx
    - src/ui/data/DataTable.tsx
    - src/ui/data/StatCard.tsx
    - src/ui/Menu.tsx
    - src/ui/lesson/ShellBar.tsx
    - src/ui/lesson/ConfusionButton.tsx
    - scripts/review/browser.ts
    - tests/functional/gallery.spec.ts

key-decisions:
  - "The playback 1-frame state keeps the registry name `still` (04-14 and its tests use it); the copy it shows is the contract's \"Still scene — 1 frame\""
  - "Revealed quiz answers (correct, incorrect) stay focusable with aria-disabled so a screen reader reads the feedback; only the `disabled` state leaves the tab order"
  - "Quiz and badge use ink, a dashed or 2 px border, an icon and words; accent appears only on the selected marker and the ring fill, danger not at all"
  - "Gallery chart data is labelled \"Example numbers for the gallery.\" so no demo number reads as a real fact"
  - "DSGN-04 is not marked complete here: 04-17 (visual baselines) also carries it and closes it"

patterns-established:
  - "inventory.json is the single list of gallery ids and states: registry, inventory test, functional spec and the visual spec all derive from it"

requirements-completed: []

duration: 150min
completed: 2026-11-28
---

# Phase 4 Plan 16: Lesson and Data Groups Summary

**The gallery now holds all 37 primitives of the 04-UI-SPEC table with every state, tested against `inventory.json`. The Lesson group adds the quiz option, progress ring, badge and surface; the Data group adds line, marker, legend, table-view toggle, stat-card states, table states and the scales on an 18-zone pitch grid. Every bare page passes the review.**

## Accomplishments

- **Tracer:** `inventory.json` (37 entries, kebab-case states) and an inventory test that checks every id once, its group, its exact states and that each state cell renders with `data-gallery-state="<id>/<state>"`. The quiz option went through it end to end: component, SSR test, registry, bare page, review.
- **Lesson:** `shell-bar` (default, focus mode on, overflow menu open), `step-rail` (each of the seven steps, compact form), `focus-toggle`, `confusion-button` (idle, note open, note typed), `glossary-card` (short, long, with a mini pitch and its legend), `quiz-option`, `progress-ring` (0, 40, 100 percent, stacked "4 of 10 concepts"), `badge`, `surface` (page, panel, raised, sheet, stat card).
- **Data:** `stat-card` (1 figure, 3 figures, loading "…", missing "—" with reason), `chart-primitives` (axis and gridlines, bars with plus and minus around a zero baseline, line with markers, direct label and tooltip, 2-series and 3-series legends, table view toggle), `data-table` (default, active row, hover row, empty, 3-column), `scales` (categorical 1-3 plus Other with shapes, sequential 1-5 on an 18-zone pitch grid with the number in each zone, diverging bar).
- The ProgressRing exposes `role="meter"` with `aria-valuenow` 4, `aria-valuemax` 10 and the label as its name; Badge has three kinds and no lost-streak state.

## Task Commits

1. **Task 1 (tracer): inventory test and quiz option:** `fd8a114`
2. **Task 2: Lesson group:** `a2d21b6`
3. **Task 3: Data group, full 37-id inventory, functional checks:** `9795fee`
4. **Fix: clip a static open menu inside its gallery cell:** `cc75d62`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The review's tab walk stopped on Base UI focus guards**
- **Found during:** Task 2, review of `shell-bar` with its overflow menu open
- **Issue:** the invisible `data-base-ui-focus-guard` spans around an open popup are real tab stops, so the walk counted a 1 px "control" with no ring.
- **Fix:** `collectFocusStops` in `scripts/review/browser.ts` steps past a guard without recording it (04-15 had only dropped guards from the target list).
- **Commit:** `a2d21b6`

**2. [Rule 1 - Bug] Gallery cells too narrow**
- `shell-bar` and `step-rail` need a full row (the bar is about 700 px wide, the strip form seven columns), so both are `wide: true`; `chart-primitives` too.
- `confusion-button` note-open popup ran 40 px into the next cell at 375, so the cell is `min-h-[32rem]`.
- `glossary-card` mini pitch had no legend, so the review's `legend-present` failed; the state draws the Legend under the card.
- **Commits:** `a2d21b6`, `9795fee`

**3. [Rule 1 - Bug] Chart and table overflow at 320 px**
- The tooltip used a fixed 360 px container width, direct labels ran past the plot, and the "Metres forward" header made the table 305 px wide. Fix: the tooltip takes the measured width, 104 px of right room for labels, header "Metres". Chart direct labels are also spread 16 px apart so the 3-series end labels do not touch.
- **Commit:** `9795fee`

**4. [Rule 1 - Bug] Copy lint: seven "X, not Y" frames**
- "Example data, not a real match." repeated per state. Reworded to "Example numbers for the gallery." **Commit:** `9795fee`

**5. [Rule 1 - Bug] Intermittent 320 px overflow in the open shell bar menu**
- While the viewport shrinks from 375 to 320 the open popup is still at its old position for a moment, which widened the page in two of the runs. Fix: the open cells clip horizontally. Reviewed clean afterwards. **Commit:** `cc75d62`

### Plan-vs-spec notes

- Additive props only: `RadioMenu` (`open`, `portalContainer`), `ShellBar` (`openMenu`, `menuContainer`), `ConfusionButton` (`initialOpen`, `initialNote`, `portalContainer`, `initialFocus`), `StatCard` figures (`status`, `reason`), `DataTable` (`rowState`). Existing callers are unchanged and their tests pass.
- Task 1 marked the not-yet-built ids as `it.todo` (not a failing test) so no commit leaves the suite red; Task 3 removed the pending list and the test now covers all 37.
- The plan's acceptance grep `grep -c "@base-ui/react/meter" ProgressRing.tsx` is 1; `"4 of 10 concepts"` appears in `demos/lesson.tsx` 3 times; `"No events in this window"` in `demos/data.tsx` once.

## Check results

- `npm test`: 1238 passed, 6 skipped (includes the 14 new baseline-guard tests of 04-17 work in the tree; at the Task 3 commit it was 1224 passed). `npx tsc --noEmit`, `npx biome ci .` (1 info from 04-15's Dialog, no error), `npm run guard` clean.
- `npm run build && npm run guard:bundle && npm run smoke`: ok; no dev route code in `dist/assets`.
- `REVIEW_PORT=5184 npx playwright test --project=functional`: 98 passed (gallery.spec 72 including one test per inventory id; the rest earlier specs and the 04-17 pitch-fixes spec).
- Reviews at 375 and 1440 on all 37 bare pages: `REVIEW: PASS` with 0 fail for every id (WARN lines remain on stat-card and others for `copy-stat-strip` and `taste-copy`, warn by design). A first `shell-bar` run failed once at 320 px (deviation 5) and passes after the fix; Windows EPERM temp-folder errors in the review CLI were retried.
- Acceptance: `inventory.json` has 37 entries; the inventory test passes with all 37.

## Known Stubs

None. The gallery is dev-only and its demo numbers say they are examples.

## Threat Flags

None. No network access, storage or untrusted parsing was added; chart and table text are React text nodes and all numbers go through `formatNumber` (T-04-28).

## Open for later plans

- 04-17 loops over `inventory.json` for the Linux visual baselines. The open-popup cells already use a non-modal popup in their cell with `initialFocus={false}`, and the `interactive` states are closed triggers, so a screenshot has no live focus.
- Docs: nothing for DESIGN.md. The 04-12 pitch-layer defects in `deferred-items.md` are unchanged.

## Self-Check: PASSED

- Created files exist (inventory.json, QuizOption, ProgressRing, Badge, Surface, demos/lesson.tsx, demos/data.tsx).
- Commits `fd8a114`, `a2d21b6`, `9795fee`, `cc75d62` are ancestors of HEAD.
