---
phase: 05-content-engine-app-shell-deploy
plan: "04"
subsystem: testing
tags: [playwright, walker, axe, ci, review-screens, manifest, fixtures]
status: complete

requires:
  - phase: 05-content-engine-app-shell-deploy
    provides: "05-03 content/lesson-manifest.json; 05-01 node scripts/content/build-fixtures.ts (dist-walker) and the LessonPage primary button"
provides:
  - "playwright.walker.config.ts: preview of dist-walker on 4174, testDir tests/walker"
  - "tests/walker/walker.spec.ts: one manifest-parametrised spec, heading check and axe (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa) at every screen"
  - "tests/walker/drivers.ts: PointerDriver, KeyboardDriver (tabTo, press, type, read), Oracle, QuizKey; tests/oracles/index.ts empty ORACLES map"
  - "npm run e2e (fixtures build, then the walker)"
  - "required CI build job runs the walker in mcr.microsoft.com/playwright:v1.65.1-noble, 20-minute timeout, walker-report artifact on failure"
  - "npm run review:screens -- <route> --fixtures (builds dist-walker, previews it on 4175)"
affects: [05-05, 05-11, 05-12, 05-14, 05-15, 05-17, 05-19]

actuals:
  tokens: 15800
  tasks: 3
  commits: 5
plan_head_before: 11f333b460ae0d269547aa4fdb2690772009fcc6
plan_head_after: 6ea5a23b5bdd89fa3fab8aa4a3454a986ea994c5

tech-stack:
  added: []
  patterns:
    - "One spec walks every lesson from the generated manifest; a lesson needs no test code"
    - "Oracle per interaction id (pointer and keyboard drivers), registered in tests/oracles/index.ts"
    - "CI shape locked by a config test that splits ci.yml by two-space job keys"

key-files:
  created:
    - playwright.walker.config.ts
    - tests/walker/walker.spec.ts
    - tests/walker/manifest.ts
    - tests/walker/drivers.ts
    - tests/oracles/index.ts
    - scripts/ci-walker.test.ts
    - .planning/phases/05-content-engine-app-shell-deploy/deferred-items.md
  modified:
    - playwright.config.ts
    - tsconfig.json
    - package.json
    - .github/workflows/ci.yml
    - scripts/design/baselines-guard.test.ts
    - scripts/review/browser.ts
    - scripts/review/lib.ts
    - scripts/review-screens.ts
    - scripts/review/review.test.ts
    - docs/DESIGN.md

key-decisions:
  - "Walker parks the pointer at (0, 0) and waits for CSS transitions before each axe run, so axe judges the resting screen, not the primary button's hover look"
  - "Walker finishes by asserting [data-lesson-complete] is visible, so a lesson that cannot be completed fails"
  - "A --fixtures review always passes --bypass-lock: its server is never the learner's"
  - "Unknown-option copy now lists --fixtures"

patterns-established:
  - "A walker failure message names the step (lesson id, index, step id) and each axe violation with its first node target"

requirements-completed: []

coverage:
  - id: D1
    description: "The fixture lesson is walked screen by screen from the manifest with the h2 checked against the manifest heading and axe (5 WCAG tags) returning zero violations"
    requirement: QA-05
    verification:
      - kind: e2e
        ref: "tests/walker/walker.spec.ts (npx playwright test -c playwright.walker.config.ts: 2 passed)"
        status: pass
  - id: D2
    description: "The required build job runs in the Playwright image with a 20-minute timeout and the steps in order; the six required job keys exist; the image appears in exactly the visual and build jobs"
    requirement: QA-05
    verification:
      - kind: unit
        ref: "scripts/ci-walker.test.ts, scripts/design/baselines-guard.test.ts"
        status: pass
  - id: D3
    description: "The main Playwright config ignores tests/walker/**"
    requirement: QA-05
    verification:
      - kind: manual
        ref: "grep -c 'walker/\\*\\*' playwright.config.ts = 1; the main config lists no walker test"
        status: pass
  - id: D4
    description: "review:screens --fixtures builds and previews dist-walker on 4175; the step-word collector skips [data-claim-meta], pre and code"
    requirement: QA-03
    verification:
      - kind: unit
        ref: "scripts/review/review.test.ts#parseArgs"
        status: pass
      - kind: manual
        ref: "npm run review:screens -- /learn/fx-a-goal-in-ten-actions --fixtures --widths 375 --theme dark --port 4175: REVIEW: PASS, exit 0"
        status: pass
  - id: D5
    description: "CONT-04 gate: a lesson that breaks fails the required build check"
    requirement: CONT-04
    verification:
      - kind: unit
        ref: "scripts/ci-walker.test.ts (config only; the job has not run on GitHub yet, no push was made)"
        status: pass

duration: 25min
completed: 2026-11-28
---

# Phase 5 Plan 04: Lesson walker and CI gate Summary

**One manifest-driven Playwright spec walks every fixture and shippable lesson in a real browser with axe at each screen, it runs inside the required `build` CI job in the pinned Playwright image, and `review:screens --fixtures` reviews the same fixtures build.**

## Performance

- **Duration:** about 25 min (2026-11-28)
- **Tasks:** 3 (tracer, two TDD)
- **Files:** 17 changed or created

## Accomplishments

- **Walker:** `tests/walker/walker.spec.ts` reads `content/lesson-manifest.json` at module load and makes one `test.describe` per walked lesson. Each screen checks the visible `h2` against the manifest heading, waits for transitions, runs axe with `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa`, calls the step's oracle (fails with "no oracle for <id>" when absent), then presses the primary button. The lesson must end in `[data-lesson-complete]`.
- **Oracle contract:** `tests/walker/drivers.ts` holds `PointerDriver`, `KeyboardDriver` (no click; `tabTo` fails after 60 Tab presses), `Oracle<P>` and `QuizKey`. `tests/oracles/index.ts` exports an empty `ORACLES`; 05-11 and 05-12 fill it.
- **Config:** `playwright.walker.config.ts` previews `dist-walker` on 4174 with `--strictPort --bypass-lock`, output in `test-results/walker`. The main config has `testIgnore: ["walker/**"]`, so the `visual` job never runs the walker. `npm run e2e` builds the fixtures then walks.
- **CI:** the `build` job now has the Playwright v1.65.1-noble container, `timeout-minutes: 20`, `runs-on: ubuntu-24.04`, and the steps `npm ci`, `npx vite build`, `node scripts/check-bundle.ts`, `node scripts/content/build-fixtures.ts`, the walker with `HOME: /root`, then a `walker-report` upload when not cancelled. The job key and the six required keys are unchanged. `scripts/ci-walker.test.ts` locks the shape and `baselines-guard.test.ts` now expects the image twice.
- **Review option:** `--fixtures` is a boolean flag. `ensureServer` runs `scripts/content/build-fixtures.ts` (no shell) and previews `--outDir dist-walker`, default port 4175. The in-page collector hides `[data-claim-meta]`, `pre` and `code`, reads `innerText`, and restores the inline styles. DESIGN.md section 8 documents the flag.

## Task Commits

1. **Task 1 (tracer): walker config, spec, drivers:** `0a2b9d9` (test)
2. **Task 2 (TDD): CI build job:** RED `d1381a3` (test, 6 of 7 failed), GREEN `07b310c` (feat)
3. **Task 3 (TDD): review --fixtures:** RED `82a00c1` (test, 4 failed), GREEN `6ea5a23` (feat)

## TDD Gate Compliance

- Task 2 RED `d1381a3`: `scripts/ci-walker.test.ts` failed 6 of 7 on the old `build` job. GREEN `07b310c` passed 28 of 28 across the three CI test files. No refactor commit.
- Task 3 RED `82a00c1`: four parseArgs cases failed. GREEN `6ea5a23` passed all 255 tests in `scripts/review` and `scripts/design`. No refactor commit.

## Verification

- `node scripts/content/build-fixtures.ts && npx playwright test -c playwright.walker.config.ts`: 2 passed (the manifest test and `fx-a-goal-in-ten-actions` pointer pass). `--list` shows the fixture lesson.
- `npx vitest run`: 64 files, 1392 passed, 11 skipped.
- `npx tsc --noEmit`: exit 0. `npx biome ci .`: no errors (one pre-existing info, `src/ui/Dialog.tsx`).
- `npm run review:screens -- /learn/fx-a-goal-in-ten-actions --fixtures --widths 375 --theme dark --port 4175`: `REVIEW: PASS — 0 fail, 0 warn`, exit 0; no server left on 4175.
- Acceptance greps: `walker/**` in playwright.config.ts 1, `4174` in the walker config 3, `"e2e"` 1, walker config named once in ci.yml, image twice, `timeout-minutes: 20` twice, `--fixtures` in DESIGN.md, `data-claim-meta` in browser.ts.
- Tracer gate: the verify was re-run end to end after Task 1 and passed, so expansion went ahead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pointer parked before axe**
- **Found during:** Task 1
- **Issue:** From step 2 on, axe reported `color-contrast` on the lesson's primary button: `#ebf4f1` on `#218268`, 4.2:1. The pointer rests on the button after the click, and `hov:opacity-90` blends the accent with the page in the light theme. At rest the colours pass.
- **Fix:** the walker moves the pointer to (0, 0) and waits for running animations (`a.finished.catch(...)`, because an interrupted transition rejects with AbortError) before each axe run. The hover look is a Phase 4 button concern and its visual baselines are Linux CI artefacts, so it is logged, not changed.
- **Files modified:** `tests/walker/walker.spec.ts`
- **Logged in:** `.planning/phases/05-content-engine-app-shell-deploy/deferred-items.md`
- **Commit:** `0a2b9d9`

**2. [Rule 1 - Bug] Manifest has no `answerLabel`**
- **Found during:** Task 1
- **Issue:** the plan's interface lists `quiz: [{ id, answer, answerLabel }]`, but 05-03's manifest writes `{ id, answer }` only.
- **Fix:** `tests/walker/manifest.ts` types `answerLabel` as optional and the walker builds `QuizKey` with `answerLabel ?? answer`. 05-11 can add the label to the manifest if oracles need display text.
- **Commit:** `0a2b9d9`

**3. [Rule 2 - Missing critical functionality] `--fixtures` always bypasses the Vite lock**
- **Found during:** Task 3
- **Issue:** the plan says to bypass the lock when the port is not the default. A fixtures server on its default port 4175 could still collide with the learner's dev server through Vite 8's per-project lock.
- **Fix:** a fixtures review always passes `--bypass-lock` (a superset of the plan's rule).
- **Commit:** `6ea5a23`

**4. Unknown-option copy** now reads "Use --widths, --theme, --port, --states or --fixtures." and its test expectation was updated.

## Deferred Issues

- Primary button hover fails WCAG AA contrast in the light theme (4.2:1). Details and a suggested fix are in `deferred-items.md`. Recorded for the design-system owner; the walker does not hide it from the review's own checks.

## Known Stubs

- `tests/oracles/index.ts` is an empty map by design; the fixture lesson has no interaction, so nothing needs an oracle yet. 05-11 and 05-12 add entries.

## Threat Flags

None. The CI change keeps `permissions: contents: read`, pins every action by SHA and puts no GitHub expression inside a `run:` script (T-05-12, T-05-19, T-05-20 mitigations held by `baselines-guard.test.ts` and `ci-walker.test.ts`).

## Next Phase Readiness

- 05-05 (lesson frame): the walker finds the heading in `[data-lesson-step] h2`, the advance control as `main [data-variant="primary"]` (first match) and the end state as `[data-lesson-complete]`. If the frame changes any of these, update `tests/walker/walker.spec.ts`.
- The `build` job has not run on GitHub: nothing was pushed. The first PR run is the proof of the container and `HOME` setup.
- Keyboard, reduced-motion and performance passes come in 05-14 and 05-15.

## Self-Check: PASSED

- FOUND: playwright.walker.config.ts, tests/walker/{walker.spec,manifest,drivers}.ts, tests/oracles/index.ts, scripts/ci-walker.test.ts, deferred-items.md
- FOUND commits: 0a2b9d9, d1381a3, 07b310c, 82a00c1, 6ea5a23
