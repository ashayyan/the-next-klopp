---
phase: 04-design-direction-system
plan: "09"
subsystem: data-lesson-screen
tags: [data-screen, derived-values, chart, data-table, stat-card, review-screens]
requires: ["04-08"]
provides:
  - "derived.ts: deriveGoal, formatMetres, formatSeconds (every number on the data screen)"
  - "DataScreen in floodlit, programme and notebook compositions at 375, 768 and 1440"
  - "StatCard, DataTable and chart primitives (linear, ticks, Gridlines, Axis, Bars, DirectLabel, ChartTooltip)"
  - "linked pitch, chart and table: active event from the clock, highlight ring on hover or focus, Enter seeks and pauses"
  - "loading line and error panel for the data screen"
  - "six direction routes passing review:screens with states (tactics state=with, data t=11.48)"
affects: [04-10, 04-13, 04-16]
actuals:
  tokens: 16500
  tasks: 3
  commits: 3
plan_head_before: 94d119b1ee99a81d333d12d928e7fb213785b643
plan_head_after: 0bb23e4c4a4ca109b75733da91d0bf1224186ba4
tech-stack:
  added: []
  patterns:
    - "numbers on screen come from one pure function tested against the published scene file"
    - "chart bars: a visual rect plus a separate focusable hit group (44 px tall, 10 px apart) with a [data-focus-ring] rect"
    - "focusable table rows in a grid role with aria-selected on the row that matches the clock"
key-files:
  created:
    - src/routes/dev-directions/derived.ts
    - src/routes/dev-directions/derived.test.ts
    - src/routes/dev-directions/DataScreen.tsx
    - src/routes/dev-directions/shared.ts
    - src/ui/data/StatCard.tsx
    - src/ui/data/DataTable.tsx
    - src/ui/data/chart.tsx
  modified:
    - src/routes/dev-directions.tsx
    - src/routes/dev-directions/TacticsScreen.tsx
    - src/ui/ui.test.tsx
    - src/scene/playback/PlaybackBar.tsx
    - tests/functional/directions.spec.ts
    - scripts/review/browser.ts
key-decisions:
  - "The notebook note '1–5 … net −1.9 m' sums the rounded table values, as the UI-SPEC states; the raw sum of the five passes is −1.98 m (−2.0)"
  - "Surnames are everything after the first given name, so Kevin De Bruyne reads 'De Bruyne'; da-silva reads 'Danilo'"
  - "floodlit data uses 2 / 6 / 4 of the 12 columns at 1440 (reading column about 437 px) instead of a 360 px column, so the five-column table fits"
  - "programme's header band leads with the score line in the condensed display and keeps the lesson title as the h1 at Heading size"
requirements-completed: []  # DSGN-01 and QA-02 advance; DSGN-01 completes with the pick (04-10)
duration: 35min
completed: 2026-11-28
status: complete
---

# Phase 4 Plan 09: Data lesson screen and clean reviews Summary

**The data lesson (Sané's goal, Manchester City 5–0 Liverpool, 9 September 2017) now renders on the published Wyscout scene in all three directions with computed stat figures, a "Metres forward, per action" chart and a ten-row event table linked to the playback clock, and all six direction routes pass `review:screens` in both themes at 375, 768 and 1440 including the stated states.**

## Performance
- **Duration:** about 35 min
- **Tasks:** 3 (3 commits)
- **Files modified:** 13 (7 created, 6 modified)

## Accomplishments
- `deriveGoal` recomputes from the scene file: times 0.0 to 18.4 s, players with "Danilo", "Shot, goal" flagged approximate, metres +14.4, −15.3, −4.9, +4.9, −1.0, +31.5, +12.9, +12.8, +4.1, +5.5 (U+2212 minus), 18.4 s first pass to shot, 59.3 m upfield, 7 players, and the notes −1.9 m, +31.5 m, 5.5 m. The test reads the scene named in `public/data/catalog.json` through `parseScene`.
- Data screen: shell "About 8 min", rail current "See it", title, context, 34-word body (the 18.4 inside it is computed), stat card, pitch with `PlaybackBar` from a store per loaded scene (paused at `?t=`, never autoplays, Stepped under reduced motion), chart, table "All ten actions" (3 columns below 768 with "Pass, 9.7 s" on a second line), legend, source rendered from `scene.source` attribution and licence, CTA "Continue to Touch it".
- Chart: bars around a zero baseline (−20 to +35, gridlines every 10 m, ink zero line) in `--team-a`, 2 px gaps, data-end radius from `--radius-sm`, active bar outlined in ink, direct label "+31.5 m, Mangala to De Bruyne" on bar 6 only, y label "Metres toward Liverpool's goal", x label "Action", tooltip "Action 6 / Mangala to De Bruyne, pass / +31.5 m at 9.7 s". From 768 the bars are focusable; below 768 the chart is a labelled image.
- Linking: the active event (eventState window) is outlined on its bar, `aria-selected` with panel tone on its row and full opacity on the pitch; hover or focus on a bar or row draws the highlight ring at the event start; Enter seeks and pauses.
- Compositions: floodlit stage (rail, pitch, playback and chart; reading column with stat card and table); programme match header band between ink rules, pitch in an ink frame with legend, team-sheet table with 3 px row rules, chart beside the yellow stat block with an ink edge; notebook sheet with a stat row between rules, 720 + 280 with three badge-numbered margin notes and the legend, full-width table.
- States: "Loading the goal…" under the drawn pitch markings while the scene loads; when the file is missing or invalid, the "The goal data didn't load" panel with a 4 px `--danger` left edge and no stat card, chart or table.
- Verification: `npx vitest run` 1040 passed (6 skipped, pre-existing); `tsc --noEmit` and `biome ci .` clean; Playwright functional project 19 passed (directions spec 18); `npm run build && npm run smoke` pass; all six `test-results/review/dev-directions-*/report.md` start with `REVIEW: PASS — 0 fail, 1 warn`.

## Task Commits
1. **Task 1: floodlit data tracer, derived values, StatCard, DataTable** - `ca75297`
2. **Task 2: chart and linked views** - `9630871`
3. **Task 3: programme and notebook compositions, notes, error state, six reviews** - `0bb23e4`

## Decisions & Deviations

### Auto-fixed Issues

**1. [Rule 1 - Bug] The review measured a select by its separate label**
- **Found during:** Task 1 review. The collector used `labels[0]` for any control, so the playback "Speed" select was judged by the 20 px "Speed" label (the cause of the long-deferred `/dev/pitch` select finding).
- **Fix:** only a checkbox or radio wrapped by its label is measured through the label.
- **Files modified:** `scripts/review/browser.ts` - **Commit:** `ca75297`

**2. [Rule 1 - Bug] PlaybackBar controls below the bar's own contract**
- **Fix:** the speed select is `h-11`; the scrubber shows the focus ring; the transport button carries the programme ink edge (`data-fill-edge`).
- **Files modified:** `src/scene/playback/PlaybackBar.tsx` - **Commits:** `ca75297`, `0bb23e4`

**3. [Rule 1 - Bug] 8 px gaps read 7.9 px after box rounding**
- **Fix:** table rows are 12 px apart and chart hit areas 10 px apart (both above the 8 px rule).
- **Commits:** `ca75297`, `0bb23e4`

**4. [Rule 3 - Blocking] Tracer built at all widths**
- Same reason as 04-07: the taste-skill layout check runs at 375 and 768 even with `--widths 1440`, so floodlit was built responsive in Task 1.

**Derived-value definition note:** with the interface definitions every number matched the scene except the first notebook note, which the UI-SPEC computes from the rounded table values (14.4 − 15.3 − 4.9 + 4.9 − 1.0 = −1.9); the code does the same and says so in a comment.

**Total deviations:** 4 auto-fixed (1 blocking, 3 bugs). **Impact:** no threshold changed.

### WARNs kept
- Data routes: `taste-copy` `copy-stat-strip` (the stat card the UI-SPEC asks for). Tactics routes: `copy-contrast` from contract copy. All six reports: 0 FAIL.

## Known Stubs
- "Continue to Touch it" has no action (no next step in this preview).

## Threat Flags
None. T-04-17: `loadDevScene` checks the content type and runs `parseScene`; anything but ready renders the error panel and no derived values (functional test with a 404). T-04-18: the source line is built from `scene.source.attribution` and `licence` (CC-BY-4.0); only the shippable Wyscout artifact is read.

## Screens for the pick (04-10)
`test-results/review/dev-directions-{floodlit,programme,notebook}-{tactics,data}/` each hold `375|768|1440-{light,dark}.png` (36 default screenshots), the state captures (`-state-with`, `-t-11-48`), `375-{light,dark}-{deuteranopia,achromatopsia}.png`, `report.json` and `report.md`.

## Self-Check: PASSED
