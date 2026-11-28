---
phase: 04-design-direction-system
plan: "11"
subsystem: design
tags: [design-md, tokens, theme, palette, typography, motion, vitest, playwright]
status: complete

requires:
  - phase: 04-design-direction-system
    provides: "ADR 0010 (floodlit picked), token generator (04-01), check-palette (04-03), theme storage helpers (04-08)"
provides:
  - "docs/DESIGN.md: 8-section constitution with the single tokens block (floodlit, verbatim) and complete sections 2 and 3"
  - "SYSTEM_INPUT = docs/DESIGN.md; DESIGN_HEADINGS and checkDesignHeadings; build-tokens refuses a Markdown input with wrong sections"
  - "src/styles/tokens.css generated from DESIGN.md"
  - "index.html pre-paint theme script (tnk:theme, light/dark only, try/catch) and the Mona Sans font preload"
  - "applyDocumentTheme(choice) in src/ui/theme.ts"
  - "tests/functional/theme.spec.ts: default, stored light before app scripts, unknown value, blocked storage, pitch follows the theme"
affects: [04-12 DESIGN.md sections 1 and 4-8, 04-13 direction collapse, 04-14..04-17 gallery and visual baselines, phase 5 lessons]

actuals:
  tokens: 15600
  tasks: 3
  commits: 3
plan_head_before: 0f6accdf85cf4764329d3c75bcd2d9bef4737814
plan_head_after: 57f4e980d0b463f03b2ef7b7d7ff60efe057cd80

tech-stack:
  added: []
  patterns:
    - "Generated evidence embedded between HTML comment markers in Markdown, with a test that it equals the generator output"
    - "Markdown token source guarded by a section-structure check in the same loader every tool uses"

key-files:
  created:
    - docs/DESIGN.md
    - scripts/design/design-md.test.ts
    - tests/functional/theme.spec.ts
  modified:
    - scripts/design/tokens.ts
    - scripts/design/build-tokens.ts
    - scripts/design/build-tokens.test.ts
    - scripts/design/check-palette.ts
    - scripts/design/check-palette.test.ts
    - scripts/design/copy-fonts.test.ts
    - src/styles/tokens.css
    - index.html
    - src/ui/theme.ts
    - src/ui/ui.test.tsx

key-decisions:
  - "The DESIGN.md tokens block is the floodlit set verbatim; the review's anti-slop concern is answered with rules in section 2, not new colours, so the validated palette is unchanged"
  - "The heading check lives in loadTokens, so build-tokens, check-palette, copy-fonts and review:screens all refuse a DESIGN.md with missing or out-of-order sections"
  - "A Markdown input always generates system CSS (also with a custom --out), so --check against a temp file is a real drift check"
  - "check-palette with no file reports a direction once when DESIGN.md repeats its set (6 results, not 8)"
  - "Accent reserved list kept as in 04-UI-SPEC; at rest a screen shows one accent fill, a second accent-filled button is never allowed"
  - "DSGN-02 and DSGN-03 not marked complete: 04-12 writes sections 1 and 4-8 (DSGN-02) and 04-13 locks the token source (DSGN-03)"

patterns-established:
  - "Pre-paint theme: one inline classic script compares the stored string with two literals and sets one data attribute"

requirements-completed: []

duration: 11min
completed: 2026-11-28
---

# Phase 4 Plan 11: DESIGN.md as token source, app theme, foundations Summary

**`docs/DESIGN.md` now holds the one floodlit tokens block that generates `src/styles/tokens.css`. Its section 2 records the pick and section 3 the foundations, including a palette table that a test regenerates. The app theme follows the system, remembers a choice and never flashes.**

## Performance

- **Duration:** about 11 min
- **Started:** 2026-11-28T07:57Z
- **Completed:** 2026-11-28T08:08Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- `docs/DESIGN.md` has the 8 `##` sections of the outline in order and exactly one `tokens` block. The block's `meta.direction` is `floodlit`, the id on the ADR 0010 "Picked:" line, and it deep-equals `floodlit.tokens.json` (checked while that file exists).
- `SYSTEM_INPUT` is now `docs/DESIGN.md`. `node scripts/design/build-tokens.ts` regenerated `tokens.css`; only the header comment changed. `--check` exits 1 on drift, on a missing or repeated block and on missing, duplicate or out-of-order headings. It runs in `npm test` through the CLI tests.
- `tests/functional/tokens.spec.ts` now reads DESIGN.md and still passes: a regenerated `--team-a` and `--surface-page` reach a `player-a` disc and `body`.
- `index.html` has an inline classic script in `<head>`, before the module script. It sets `data-theme` only for a stored `light` or `dark`, inside try/catch. The file also preloads the one Mona Sans WOFF2 that serves both display and body text.
- `applyDocumentTheme(choice)` stores the choice and sets or removes `data-theme`. If storage is blocked, the attribute still changes.
- Section 2 covers the pick, idea, mood and composition, the totals of all three directions (81.25 / 73.75 / 73.75), the ADR 0010 link, the override note, and how the document answers the review's inputs.
- Section 3 covers 3.1 to 3.7:
  - 3.1: colour roles for both themes, the reserved accent list and the never-accent rules, team, ball and zone tokens with the four shape rules, and data scales by job. The generated validation table sits between `<!-- palette:start -->` and `<!-- palette:end -->`.
  - 3.2 to 3.6: typography, spacing and grid, radius and elevation, icons, and the motion language.
  - 3.7: the tokens block, with a note on where it deviates from DTCG.

## Task Commits

1. **Task 1 (tracer): DESIGN.md as token source:** `3f2679c` (feat)
2. **Task 2: app-wide theme, pre-paint script, font preload:** `7049300` (feat)
3. **Task 3: DESIGN.md sections 2 and 3:** `57f4e98` (docs)

## Files Created/Modified

- `docs/DESIGN.md`: the design constitution (sections 2, 3 and the tokens block complete; 1 and 4 to 8 hold one sentence each for 04-12).
- `scripts/design/design-md.test.ts`: tests for the headings, the single block, the picked id, the verbatim set, drift, the embedded palette table, the section 2 content, the 3.x order, and that every quoted hex value exists in the block.
- `scripts/design/tokens.ts`: `SYSTEM_INPUT`, `DESIGN_HEADINGS`, `checkDesignHeadings`.
- `scripts/design/build-tokens.ts`: heading check for Markdown inputs; Markdown always generates system CSS.
- `scripts/design/check-palette.ts`: when no file is given, a direction is reported only once.
- `scripts/design/{build-tokens,check-palette,copy-fonts}.test.ts`: fixtures read the block from DESIGN.md; the copy-fonts temp root also gets DESIGN.md.
- `src/styles/tokens.css`: regenerated (header line).
- `index.html`, `src/ui/theme.ts`, `src/ui/ui.test.tsx`, `tests/functional/theme.spec.ts`: theme behaviour and its tests.

## Decisions Made

See `key-decisions` above. The main call: ADR 0010 asks DESIGN.md to make floodlit read as football rather than a generic dark app. I answered with layout and usage rules: the pitch is the only lit object, match screens use the scoreline as the title, and only one accent fill shows at rest. I did not change any colour or type token. The plan says to copy the set verbatim, and the palette was validated as reviewed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Existing tests and tools read `SYSTEM_INPUT` as JSON**
- **Found during:** Task 1
- **Issue:** `build-tokens.test.ts` and `check-palette.test.ts` called `JSON.parse` on the system input. The `copy-fonts` temp root did not contain DESIGN.md. The default run of `check-palette` printed floodlit twice (8 results).
- **Fix:** the fixtures now extract the block. The temp root copies `docs/DESIGN.md`. `check-palette` skips a direction it has already reported when no file is given.
- **Files modified:** scripts/design/build-tokens.test.ts, check-palette.test.ts, copy-fonts.test.ts, check-palette.ts
- **Commit:** 3f2679c

**2. [Rule 1 - Bug] `--check` with a Markdown input and a custom `--out` compared scoped CSS**
- **Found during:** Task 1 (writing the drift test)
- **Issue:** `renderPair` generated system CSS only when `out` was `src/styles/tokens.css`. A DESIGN.md input checked against any other file produced scoped CSS, so the drift check would always report drift, for the wrong reason.
- **Fix:** a `.md` input always generates system CSS.
- **Files modified:** scripts/design/build-tokens.ts
- **Commit:** 3f2679c

**3. [Rule 3 - Blocking] Biome lints `index.html`**
- **Found during:** Task 2
- **Issue:** `noInnerDeclarations` flagged a `var` inside the `try` block.
- **Fix:** changed it to `const` (block-scoped; classic scripts support it).
- **Commit:** 7049300

**Total deviations:** 3 auto-fixed. **Impact:** none on scope.

## Issues Encountered

None.

## Threat Flags

None. T-04-21: the script only compares the stored value with `light` and `dark`, and a unit test asserts there is no `innerHTML`, `eval(` or `document.write`. T-04-22: `checkDesignHeadings` and the single-block rule run in the loader that every tool uses.

## Open for later plans

- 04-12: the content of sections 1 and 4 to 8, including the Pitch Standard fixes from ADR 0010 (badge overlap at 375, ball over the disc label at `t=0`, initials versus "shirt number").
- Gallery (04-14 to 04-16): show team B (ring disc, hollow arrowheads) in both themes and in the achromatopsia capture. No reviewed capture showed it.
- 04-13: remove the direction files. The design-md "verbatim" test then skips on its own, because it is guarded by `existsSync`.

## User Setup Required

None.

## Self-Check: PASSED

- FOUND: docs/DESIGN.md, scripts/design/design-md.test.ts, tests/functional/theme.spec.ts
- FOUND commits: 3f2679c, 7049300, 57f4e98
- `npm test`: 1075 passed, 6 skipped. `npx tsc --noEmit`: clean. `npx biome ci .`: clean. `npm run guard`: ok. `npm run palette`: all PASS. `build-tokens --check`: ok.
- `REVIEW_PORT=5184 npx playwright test --project=functional`: 26 passed (tokens.spec 1, theme.spec 7, directions 18).
- `npm run build && npm run smoke`: smoke ok (preview).
