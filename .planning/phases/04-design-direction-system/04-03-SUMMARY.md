---
phase: 04-design-direction-system
plan: "03"
subsystem: palette-gate
tags: [color, wcag, oklab, cvd, accessibility, ci-gate]
requires: ["04-01"]
provides:
  - "scripts/design/lib/color.ts: WCAG contrast, OKLab/OKLCH, Machado 2009 CVD delta E, colour string parsing, compositing"
  - "scripts/design/check-palette.ts: checkPalette, checkTheme, renderMarkdown and the palette gate CLI"
  - "npm run palette, npm run tokens, npm run tokens:check"
affects: [04-05, 04-06, 04-10, 04-11, 04-14]
actuals:
  tokens: 21000
  tasks: 2
  commits: 2
plan_head_before: 2c6fbb4c3e84fcbb053b3112a6a7a6fba6ae6cba
plan_head_after: 772ecda6414dbe1b79220e60aaf4f5b2fdad2582
tech-stack:
  added: []
  patterns:
    - "thresholds are constants in one table (THRESHOLDS, CONTRAST_ROWS); the gate never relaxes them"
    - "golden fixtures are inline copies of the UI-SPEC evidence so they outlive the direction token files"
    - "the CI gate is a Vitest test inside npx vitest run (the required test job)"
key-files:
  created:
    - scripts/design/lib/color.ts
    - scripts/design/lib/color.test.ts
    - scripts/design/check-palette.ts
    - scripts/design/check-palette.test.ts
  modified:
    - package.json
    - src/routes/dev-directions/tokens/notebook.tokens.json
    - src/routes/dev-directions/tokens/notebook.css
key-decisions:
  - "Gate rows cover the 15 UI-SPEC contrast pairs plus highlight-ink / highlight and team-b-ink / team-b-fill; the focus row measures focus-ring (ink on programme light), not accent"
  - "Sequential ordinal check runs on steps 2-5 only; step 1 may recede to the surface"
  - "notebook dark control-border changed from #6A7770 to #6B7871 (3.04:1 on the panel instead of 2.99:1)"
requirements-completed: [DSGN-02]
duration: 14min
completed: 2026-11-28
status: complete
---

# Phase 4 Plan 03: Palette gate Summary

**A dependency-free colour library and `check-palette.ts` now gate every token set in both themes (teams, categorical, diverging, ordinal and 17 contrast rows) with Machado 2009 colour-blind simulation, reproducing the UI-SPEC evidence numbers within 0.2 and failing CI on a regression.**

## Performance
- **Duration:** 14 min
- **Tasks:** 2
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments
- `color.ts`: WCAG 2.2 contrast, OKLab and OKLCH, Machado 2009 protan, deutan and tritan matrices on linear RGB, hue distance, `parseCssColor` for hex, `rgb()` (comma and space), `color(srgb)`, `oklab()` and `oklch()`, `composite` and `toHex`; 15 tests.
- Golden numbers reproduce exactly to the printed precision for all six sets (teams, categorical, diverging, and every contrast row); notebook dark categorical worst case is protan 9.9, as recorded.
- Negative cases fail as required: team B `#00A000`, a non-monotone ramp, and a muted text pair under 4.5:1; the CLI exits 1 for a token file with team B `#00A000`.
- `--json` prints 6 entries (3 sets x 2 themes); `--markdown` prints the two tables DESIGN.md section 3.1 will embed.
- Full suite: 44 files, 925 tests pass; `npx biome ci .` and `tsc --noEmit` clean.

## Task Commits
1. **Task 1: colour maths and team check (tracer)** - `daa8315`
2. **Task 2: full gate, markdown/JSON, npm scripts, notebook border fix** - `772ecda`

## Files Created/Modified
- `scripts/design/lib/color.ts`, `color.test.ts` - colour maths and tests
- `scripts/design/check-palette.ts`, `check-palette.test.ts` - gate, golden fixtures, negative and CLI tests
- `package.json` - `tokens`, `tokens:check`, `palette` scripts
- `src/routes/dev-directions/tokens/notebook.tokens.json`, `notebook.css` - control border fix

## Decisions & Deviations

### Auto-fixed Issues

**1. [Rule 1 - Bug] notebook dark control border missed 3:1 on the panel**
- **Found during:** Task 2 (first full run of the gate)
- **Issue:** `--control-border` `#6A7770` on `--surface-panel` `#242E2A` is 2.992:1; the UI-SPEC table printed 3.0 (rounded), but the rule is 3:1 for UI components (WCAG 1.4.11). The plan says never loosen a threshold and to report a failing set as a deviation, because token files belong to 04-01.
- **Fix:** moved the value to `#6B7871` (3.035:1 on the panel, 3.78:1 on the page); no other token changed. Regenerated `notebook.css`; `--check` stays clean. The inline golden fixture records 3.04 for that row.
- **Files modified:** `src/routes/dev-directions/tokens/notebook.tokens.json`, `notebook.css`
- **Commit:** `772ecda`

**Total deviations:** 1 auto-fixed (1 bug in a recorded colour value). **Impact:** one hex of one direction changes by 1 step per channel; the UI-SPEC "Validation evidence" row for notebook dark control border / panel reads 3.04 instead of 3.0 (04-12 DESIGN.md embeds the generated table).

## Known Stubs
None.

## Threat Flags
None. T-04-04 is implemented: inline golden fixtures, a negative fixture, thresholds in one table, gate inside `npx vitest run`.

## Next Phase Readiness
04-04 (fonts) and 04-05 (review CLI) can import `lib/color.ts` (`parseCssColor`, `composite`, `contrast`); gate G1 of the pick (04-10) is `npm run palette`.

## Self-Check: PASSED
