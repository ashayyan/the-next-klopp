---
phase: 04-design-direction-system
plan: "06"
subsystem: review-command
tags: [qa-02, taste-skill, accessibility, colour-vision, playwright]
requires: ["04-05"]
provides:
  - "complete review:screens: all 22 checks run, none skipped; taste-skill layout and copy review; deuteranopia and achromatopsia captures at 375; --states captures"
  - "scripts/review/taste.ts: runLayoutCheck, runCopyLint, mapLayoutFindings, mapCopyFindings, TASTE_IGNORED, assertTasteSkill, tasteProfile"
  - "lib.ts evaluators for token-colours, no-hex-in-source, banned-glass, banned-emoji, banned-stripes, banned-transition-all, focus-visible, banned-eyebrow, card-grid, arrow-suffix, reduced-motion, font-local, plus loadActiveTokens"
  - "fixture cases transition-all and foreign-colour"
affects: [04-07, 04-08, 04-09, 04-10, 04-12, 04-14, 04-17]
actuals:
  tokens: 70000
  tasks: 3
  commits: 4
plan_head_before: 2d084ee20478e2f3f4d413b04efcd93a7808ecc2
plan_head_after: 917ff2d06a0b7735d6a2ab6aa3b7a8f4907f6ffb
tech-stack:
  added: []
  patterns:
    - "the taste skill is only executed, never edited or copied; its absence exits 2 before any capture, and taste.ts is import-safe in CI where the folder is git-denied"
    - "page-side collectors return plain data; every threshold stays in lib.ts and is covered by Vitest without a browser"
    - "once-per-review checks (no-hex-in-source, taste-layout, taste-copy) show their status under every width in the report table"
key-files:
  created:
    - scripts/review/taste.ts
  modified:
    - scripts/review/lib.ts
    - scripts/review/browser.ts
    - scripts/review-screens.ts
    - scripts/review/review.test.ts
    - src/routes/dev-review-fixture.tsx
    - playwright.config.ts
key-decisions:
  - "taste-layout: overflow-x and spill fail, the landing-page ids are ignored with the recorded reason, every other id warns (as the post-research decision says); copy-lint FAIL ids fail, WARN ids warn, INFO is dropped"
  - "banned-transition-all reads the authored rules (inline style and the CSSOM), because the computed value is `all` on every element by default and the reduced-motion rule zeroes durations in the emulated context"
  - "focus rings may be an outline, a solid unblurred box-shadow or a visible [data-focus-ring] stroke inside the focused element, each at 2 px and 3:1 against the parent surface"
requirements-completed: [QA-02]
duration: 52min
completed: 2026-11-28
status: complete
---

# Phase 4 Plan 06: Taste review and the full check set Summary

**`npm run review:screens` now runs the real taste-skill layout checker and copy linter with app-screen severities plus all 22 DESIGN.md rule checks, adds colour-vision and state captures, and reports a clean fixture as `REVIEW: PASS` with 119 passing checks, 0 skipped and 10 screenshots.**

## Performance
- **Duration:** 52 min
- **Tasks:** 3 (plus one fix commit)
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments
- Task 1 tracer: `taste.ts` runs `check.mjs` once at the primary theme (taken from the route's token file) and `copy-lint.mjs` on the primary-theme 1440 visible text; the report gains the `tasteSkill` block, the `taste-layout` and `taste-copy` rows and an "Ignored taste ids" section. A missing skill folder exits 2 before any capture, with a message naming the folder.
- Task 2: `token-colours` (allowed set from the active token file, `rgb`, `rgba`, `color(srgb)` and `oklab` forms, alpha ignored), `no-hex-in-source` (static, once per review), `banned-glass`, `banned-emoji`, `banned-stripes`, `banned-transition-all`, `focus-visible` over the first 40 Tab stops, and the warn-only `banned-eyebrow`, `card-grid` and `arrow-suffix`. Seeded fixture cases `transition-all` and `foreign-colour`, with `gradient` and `small-target` from 04-05, each exit 1 naming only their own check.
- Task 3: `reduced-motion` (animations, transitions and glyph boxes read twice 500 ms apart) and `font-local` (non-localhost requests, and every family of the active token set loaded through `document.fonts.load`), CDP `Emulation.setEmulatedVisionDeficiency` captures for deuteranopia and achromatopsia at 375 in both themes, and `--states` captures named `375-dark-state-with.png` and `375-dark-t-11-48.png`.
- A default run on the fixture writes 10 screenshots (6 normal, 4 colour-vision); I opened `375-dark-achromatopsia.png` and the emulation is applied.
- Verification: `review.test.ts` 68 tests pass; `npx vitest run` 1006 passed (6 skipped, pre-existing); `tsc --noEmit` and `biome ci .` clean; `npm run build` and `npm run smoke` pass; the Playwright token spec passes.

## Task Commits
1. **Task 1: taste-skill review, severity mapping, tasteSkill block (tracer)** - `d2ff589`
2. **Task 2: token, banned-pattern, focus and warn checks** - `d3dda02`
3. **Task 3: reduced-motion, font-local, colour-vision and state captures** - `1dd1dda`
4. **Fix: Playwright output kept apart from review artefacts** - `917ff2d`

## Files Created/Modified
- `scripts/review/taste.ts` - taste-skill runners, mapping, skill gate, per-run profile
- `scripts/review/lib.ts`, `browser.ts`, `review-screens.ts` - evaluators, page collectors, CLI wiring
- `scripts/review/review.test.ts` - 68 tests
- `src/routes/dev-review-fixture.tsx` - two more seeded cases, system focus ring on every control
- `playwright.config.ts` - `outputDir`

## Decisions & Deviations

### Auto-fixed Issues

**1. [Rule 3 - Blocking] check.mjs leaves Chrome running, so a fixed profile breaks the next review**
- **Found during:** Task 1, second run of the CLI ("check: Chrome did not start")
- **Issue:** On this Windows machine `check.mjs` leaves about 12 `chrome.exe` processes alive after it finishes (reproduced with a clean profile). A second Chrome on the same profile folder will not start, so the plan's fixed `--profile .taste-skill/chrome-review` fails from the second run on.
- **Fix:** each run uses its own folder `.taste-skill/chrome-review-<pid>-<time>` (still under the git-ignored `.taste-skill/` the skill requires), and `taste.ts` asks that run's Chrome to exit through its own DevTools port (`Browser.close` read from the profile's `DevToolsActivePort`) and removes the folder. Nothing outside this run's profile is touched.
- **Files modified:** `scripts/review/taste.ts`, test `taste profile folder`
- **Commit:** `d2ff589`

**2. [Rule 1 - Bug] `transition: all` cannot be read from computed style**
- **Found during:** Task 2
- **Issue:** every element computes `transition-property: all` by default, and the stylesheet's reduced-motion rule zeroes durations in the emulated context, so the plan's "computed value" test would either flag everything or nothing.
- **Fix:** the collector reads inline styles and the authored CSS rules (including nested and grouped rules) and reports the elements they match; the evaluator still tests the list for `all`.
- **Commit:** `d3dda02`

**3. [Rule 1 - Bug] The clean fixture failed its own checks**
- **Issue:** the fixture buttons had no focus ring, and two buttons sat side by side with no gap.
- **Fix:** the fixture controls carry the system focus ring (`outline-focus-ring`) and are block level, so each seeded case fails only its own check.
- **Commit:** `d3dda02`

**4. [Rule 1 - Bug] Playwright deletes the review artefacts**
- **Found during:** Task 3 gate run (`npx playwright test` emptied `test-results/`, including `test-results/review/`)
- **Fix:** `outputDir: "test-results/playwright"` in `playwright.config.ts` (a 04-05 file).
- **Commit:** `917ff2d`

**Total deviations:** 4 auto-fixed (1 blocking, 3 bugs). **Impact:** the review command keeps working across repeated runs; no threshold was loosened.

### Operational notes
- Two manual `check.mjs` probes run while diagnosing deviation 1 left headless Chrome processes on profiles `.taste-skill/chrome-review` and `.taste-skill/chrome-review-probe1`, and a Vite dev server started for the review runs is still listening on port 5184. Ending processes was not permitted in this session, so they were left running; they are harmless and can be closed by ending the `chrome.exe` processes whose command line contains `.taste-skill` and the `node` process on port 5184. New runs clean up after themselves.
- The `banned-emoji` check uses `\p{Extended_Pictographic}` as the plan says; that class includes the copyright and registered signs, so a footer using them would fail. No current screen does.
- `/dev/pitch` still fails `tap-size` (20 px selects), logged in `deferred-items.md` by 04-05.

## Known Stubs
None. No check reports `skipped` in a complete run.

## Threat Flags
None. T-04-11: both skill scripts run through `spawn(process.execPath, argsArray)` with the URL and a temp text path as single argv elements, the Chrome profile is under `.taste-skill/`, and the skill files are never edited. T-04-12: `font-local` fails on any request to a non-localhost host, so a runtime CDN cannot slip into a reviewed screen.

## Next Phase Readiness
The direction screens (04-07 to 04-09) can now be gated with `npm run review:screens -- /dev/directions/<id>/<screen>` (give each page a `<main><div class="wrap">` root so the layout checker proceeds); the report carries colour-vision captures and the taste block for the independent reviewer in 04-10. Each full run takes about 25 s on the fixture, more on the pitch pages.

## Self-Check: PASSED
