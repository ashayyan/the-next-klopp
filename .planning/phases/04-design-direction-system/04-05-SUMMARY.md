---
phase: 04-design-direction-system
plan: "05"
subsystem: review-command
tags: [qa-02, playwright, screenshots, accessibility, dsgn-03, ci]
requires: ["04-03", "04-04"]
provides:
  - "npm run review:screens: captures a route at 375, 768 and 1440 in both themes, runs 8 of the 22 checks, writes report.json (schemaVersion 1), report.md and PNGs, exits 0, 1 or 2"
  - "scripts/review/lib.ts: parseArgs, slugRoute, CHECKS (22 ids), evaluators, buildReport, renderReportMd, exitCodeFor"
  - "scripts/review/browser.ts: ensureServer (reuse or start, stop only what it started), launchChrome, capture, page-side collectors"
  - "playwright.config.ts with functional and visual projects and CI-only baseline writes"
  - "tests/functional/tokens.spec.ts: DSGN-03 proof in a real browser"
  - "/dev/review-fixture dev route with seeded defects (gradient, small-target, no-name)"
affects: [04-06, 04-07, 04-10, 04-11, 04-12, 04-17]
actuals:
  tokens: 42000
  tasks: 3
  commits: 3
plan_head_before: 4f289ddaa283df80b69d401c8e6779bd43cdde48
plan_head_after: 97f265d68f1b7509e003fd3c0e179ff9c6c721ed
tech-stack:
  added: []
  patterns:
    - "page-side functions return plain data; every threshold is applied in Node by lib.ts, so Vitest covers the rules in CI without a browser"
    - "a server the command did not start is never stopped; one it started is stopped in finally"
    - "every child process is spawned with an argument array; the route is slugged to [a-z0-9-] for the output folder"
key-files:
  created:
    - scripts/review-screens.ts
    - scripts/review/lib.ts
    - scripts/review/browser.ts
    - scripts/review/review.test.ts
    - src/routes/dev-review-fixture.tsx
    - playwright.config.ts
    - tests/functional/tokens.spec.ts
    - .planning/phases/04-design-direction-system/deferred-items.md
  modified:
    - package.json
    - tsconfig.json
    - src/routes.ts
    - src/routes.test.ts
key-decisions:
  - "A checkbox or radio wrapped by its label is measured by the label's box for tap-size, because the label is the hit area"
  - "Text inside [data-pitch] or [data-glyph] is exempt from the DOM text-contrast check: it sits on SVG shapes, and the palette gate (04-03) already covers player ink on team fills"
  - "Git Bash rewrites a leading-slash argument; the CLI undoes the rewrite using EXEPATH so the plan's own verify commands work"
requirements-completed: []
duration: 38min
completed: 2026-11-28
status: complete
---

# Phase 4 Plan 05: Screenshot-review command Summary

**`npm run review:screens -- <route>` now captures any screen at 375, 768 and 1440 in both themes in real Chrome, judges it with eight DOM rules (overflow, banned gradients, tap size, text contrast, heading order, control names, legend and step length), writes a schemaVersion 1 report and exits 0, 1 or 2, and a Playwright spec proves a regenerated token changes the app background and a pitch disc.**

## Performance
- **Duration:** 38 min
- **Tasks:** 3
- **Files modified:** 12 (8 created, 4 modified)

## Accomplishments
- Task 1 tracer: end-to-end on `/dev/review-fixture`: exit 0 with `REVIEW: PASS — 0 fail, 0 warn` and six PNGs plus `report.json` and `report.md`; the `?case=gradient` variant exits 1 with `REVIEW: FAIL`; an unreachable server (`REVIEW_START_TIMEOUT_MS=1 ... --port 5199`) exits 2 with "could not reach" and leaves nothing running on 5199.
- Task 2: pure evaluators with 32 behaviour tests (40 px button, 4 px gap, running-text link, 4.54:1 against 3.95:1, 3:1 for large text, alpha compositing, h2 to h4, icon-only button, 61 against 60 words); the `small-target` and `no-name` fixture cases fail tap-size and control-names through the real CLI.
- Task 3: Playwright config (functional and visual projects, `updateSnapshots` only in CI with `UPDATE_BASELINES=1`, `REVIEW_PORT` with `--bypass-lock`) and `tokens.spec.ts`: `team-a` to `#9E2A2B` and `surface-page` to `#FBF3E4` in memory, regenerated with the real generator and injected, change the `player-a` disc fill and the body background.
- The other 14 registered checks report `skipped` until 04-06; the registry already holds all 22 ids with their severities.
- Verification: `npx vitest run` 970 passed (6 skipped, pre-existing); `tsc --noEmit` and `biome ci .` clean; `npm run build` and `npm run smoke` pass (the fixture route stays out of the study build); the Playwright spec passes.

## Task Commits
1. **Task 1: review:screens tracer with overflow and gradient checks** - `260729d`
2. **Task 2: tap-size, text-contrast, heading-order, control-names, legend and step-word checks** - `e77a9b4`
3. **Task 3: Playwright config and the token spec** - `97f265d`

## Files Created/Modified
- `scripts/review-screens.ts`, `scripts/review/lib.ts`, `scripts/review/browser.ts`, `scripts/review/review.test.ts` - the command
- `src/routes/dev-review-fixture.tsx`, `src/routes.ts`, `src/routes.test.ts` - seeded fixture route
- `playwright.config.ts`, `tests/functional/tokens.spec.ts`, `tsconfig.json` - Playwright and the DSGN-03 spec
- `package.json` - `review:screens` script

## Decisions & Deviations

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Git Bash rewrote the route argument**
- **Found during:** Task 1, first run of the plan's verify command
- **Issue:** Under Git Bash on Windows, `node scripts/review-screens.ts /dev/review-fixture` delivers `C:/Program Files/Git/dev/review-fixture`, so the route check refused it and every verify command in the plan would exit 2.
- **Fix:** `undoMsysPathConversion` removes the Git install prefix (from `EXEPATH`) when the argument starts with it; a normal route, another drive path and a missing `EXEPATH` are left alone. Tests cover all four.
- **Files modified:** `scripts/review/lib.ts`, `scripts/review/review.test.ts`
- **Commit:** `260729d`

**2. [Rule 1 - Bug] Two false positives found by running the command on the real `/dev/pitch` page**
- **Found during:** Task 2 sanity run
- **Issue:** 16 px radio inputs inside 44 px labels were reported as undersized targets, and the digit inside a legend player swatch was measured against the page instead of its SVG disc (1.33:1).
- **Fix:** tap-size uses the label's box for a wrapped checkbox or radio; text in `[data-pitch]` or `[data-glyph]` is exempt from the DOM check (the palette gate covers those pairs).
- **Files modified:** `scripts/review/browser.ts`
- **Commit:** `e77a9b4`, `97f265d`

**3. [Rule 1 - Bug] Biome warning for `innerText`**
- **Fix:** `innerText` is intended (it skips hidden text), so a targeted `biome-ignore` with the reason was added.
- **Commit:** `97f265d`

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs). **Impact:** none on scope; the command is more usable under Git Bash and the first real page produces no false positives.

### Deferred
`/dev/pitch` still reports tap-size FAIL for its 20 px tall `select` and `input` controls (Phase 3 dev page). Logged in `deferred-items.md`; the gallery and direction screens must meet the rule.

## Known Stubs
None. The 14 unimplemented checks are registered and reported as `skipped`, which is the plan's contract until 04-06.

## Threat Flags
None. T-04-08: `slugRoute` and `isSafeRoute` refuse traversal, backslash, whitespace, scheme and a leading `//`; all spawns use argument arrays. T-04-09: a running server is reused and never stopped, only started processes are torn down in `finally` (and on SIGINT and SIGTERM). T-04-10: Playwright drives Chrome over its own pipe in throwaway contexts.

## Next Phase Readiness
04-06 adds the remaining checks (focus, token colours, banned patterns, reduced motion, local fonts, colour-vision captures) and the taste-skill half; `ReviewReport.tasteSkill` is `null` and the `reviewer` block is `pending`, ready for it. Anything that runs the command from Git Bash can pass `/dev/...` routes unquoted.

## Self-Check: PASSED
