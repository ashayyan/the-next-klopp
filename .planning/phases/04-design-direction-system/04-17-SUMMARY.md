---
phase: 04-design-direction-system
plan: "17"
subsystem: design
tags: [visual-regression, playwright, ci, github-actions, baselines, phase-gate, qa]
status: complete

requires:
  - phase: 04-design-direction-system
    provides: "inventory.json and the 37-id gallery (04-16); gallery bare pages with data-ready (04-14); playwright.config.ts projects and snapshotPathTemplate (04-05)"
provides:
  - "tests/visual/gallery.visual.spec.ts: 222 @visual tests (37 ids x 2 themes x 3 widths), skipped unless CI is set"
  - "scripts/design/baselines-guard.test.ts: baseline platform guard plus static checks of both workflows, run by the required `test` job"
  - "tests/functional/pitch-fixes.spec.ts: browser check of the Phase 3 pitch fixes"
  - "`visual` job in .github/workflows/ci.yml (Playwright 1.65.1 noble image, not a required check)"
  - ".github/workflows/update-snapshots.yml: manual workflow that generates and commits Linux baselines and dispatches ci"
affects: [phase 4 merge, every later PR (visual job), Phase 5+ lesson work]

actuals:
  tokens: 30000
  tasks: 3
  commits: 4
plan_head_before: abb04c27891fc9f6e5c0e5d0a2de021157168fd1
plan_head_after: 92f68bd5da08ab5d484c16e110e183b10eadf2b4

tech-stack:
  added: []
  patterns:
    - "Baselines are CI-only Linux artefacts: the visual tests skip without CI, playwright.config.ts writes only with CI and UPDATE_BASELINES=1, file names carry the platform, and a Vitest guard rejects any tracked non-Linux baseline"
    - "Workflow hardening is a unit test: triggers, permissions, image tag equal to the npm pin, SHA-pinned actions and no expression inside a run script are asserted in the required test job"
    - "Write token separated from third-party code: the generate job runs the Playwright image read-only, the commit job runs on the hosted runner"

key-files:
  created:
    - tests/visual/gallery.visual.spec.ts
    - tests/functional/pitch-fixes.spec.ts
    - scripts/design/baselines-guard.test.ts
    - .github/workflows/update-snapshots.yml
  modified:
    - .github/workflows/ci.yml
    - .planning/STATE.md

key-decisions:
  - "update-snapshots is two jobs (generate in the container, commit on the hosted runner) because the Playwright image has no gh CLI and the write token should not sit next to npm ci"
  - "ci.yml runs the functional and visual projects in one playwright invocation: a second step found the first step's dev server still holding the Vite lock inside the job container"
  - "The first baseline set is generated after Phase 4 merges: GitHub dispatches only workflow files that exist on the default branch (HTTP 404 on the phase branch); recorded in STATE.md Deferred Verification"
  - "Local Docker proof of the noble image was not run: the Docker Desktop daemon was not running; the CI run of the same image replaces it"

patterns-established:
  - "A baselines folder with only *-linux.png files, enforced by a guard; no screenshot is tracked until the manual workflow commits it"

requirements-completed: [DSGN-04, QA-02]

duration: 70min
completed: 2026-11-28
---

# Phase 4 Plan 17: Visual Baselines and Phase Gate Summary

**The visual suite (222 Linux-only screenshot tests over the gallery inventory), the baseline guard, the `visual` CI job and the manual update-snapshots workflow are in; the phase gate is green. The first baseline set is deferred until the update-snapshots workflow exists on `main`.**

## Accomplishments

- **Visual spec:** one test per inventory id, theme (`light`, `dark`) and width (375, 768, 1440), titled `<id> <theme> <width> @visual`, skipped when `CI` is unset (222 skipped locally, nothing written, `git status` clean). On Linux it waits for `[data-ready="1"]` and `document.fonts.ready`, asserts the display and mono families are loaded, blurs focus, moves the pointer away, waits two frames and takes a full-page `toHaveScreenshot` named `<id>-<theme>-<width>` (becomes `...-linux.png`). `animations: "disabled"` and `maxDiffPixelRatio: 0.002` come from the unchanged `playwright.config.ts`.
- **Guard:** `checkBaselineFiles` rejects any tracked `*-win32.png` or `*-darwin.png` and any non-`*-linux.png` file under `tests/visual/__baselines__/`; a second part of the same file checks the two workflows statically (14 tests).
- **Pitch fixes:** the Wyscout reconstruction at 375 and 1440 steps through every keyframe with "Next frame" and asserts no sequence badge box overlaps a player disc box and every note chip lies in the pitch SVG; "Play sequence" is visible at 768 and 1440 and keeps its accessible name at 375.
- **CI:** a `visual` job (`ubuntu-24.04`, `mcr.microsoft.com/playwright:v1.65.1-noble`, SHA-pinned actions, report artefact kept 14 days). Branch protection is unchanged: `gh api repos/{owner}/{repo}/branches/main/protection --jq .required_status_checks.contexts` prints `["lint","typecheck","test","build","guards","windows-smoke"]`.
- **Update workflow:** `workflow_dispatch` only, refuses `main`, `generate` (read-only, image, `CI=true UPDATE_BASELINES=1`, uploads the baselines folder) then `commit` (`contents: write`, `actions: write`; stages only `tests/visual/__baselines__/*-linux.png`, commits "test(visual): update Linux baselines", pushes, runs `gh workflow run ci --ref "$BRANCH"`). The branch name reaches the script only through `env:`.

## Task Commits

1. **Task 1 (tracer): visual spec with the CI-only skip:** `4971b40`
2. **Task 2: baseline platform guard and pitch-fixes spec:** `47eafb6`
3. **Task 3: visual job and update-snapshots workflow with static checks:** `14c15eb`
4. **Fix: one playwright invocation in the visual job:** `92f68bd`

## Tracer proof of the Linux path

- **Docker (generation and comparison in the pinned image):** not run. `docker info` answered the client block, but the server call failed: `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine ... The system cannot find the file specified`. The plan says to record this and rely on the CI job. No baseline was generated on Windows.
- **CI (dispatched `ci` run 46135577547 on the phase branch, same image tag as the npm pin):** the combined step ran `98 passed` (every functional spec on Linux, including the new gallery, pitch-fixes and direction specs) and `222 failed`, all 222 with the single message "A snapshot doesn't exist at tests/visual/__baselines__/<id>-<theme>-<width>-linux.png". No visual test failed for any other reason, so the font check, `data-ready` wait and screenshot step work on Linux for every id and state. All six required jobs (`lint`, `typecheck`, `test`, `build`, `guards`, `windows-smoke`) and `pipeline` passed in the same run; only `visual` failed, as expected until the baselines exist (it is not required).

## Baseline dispatch (deferred)

`gh workflow run update-snapshots.yml --ref gsd/phase-04-design-direction-system` answered `HTTP 404: workflow update-snapshots.yml not found on the default branch`. This is the GitHub limitation the plan names. No bot commit exists, so STATE.md "Deferred Verification" has the row: after Phase 4 merges, run `gh workflow run update-snapshots.yml --ref <next branch>` and confirm the `visual` job of the dispatched `ci` run is green. No PNG is tracked; the guard passes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `visual` job could not run two playwright steps**
- **Found during:** Task 3, first CI run (46135324638)
- **Issue:** the functional step passed, then the visual step failed to start: "Found another Vite dev process for this project (PID 272)". The first step's dev server still held the Vite command lock (and port 5173) in the job container.
- **Fix:** one step, `npx playwright test --project=functional --project=visual`. The static test still requires both project names.
- **Commit:** `92f68bd`

**2. [Rule 3 - Blocking] The Playwright image has no `gh` CLI**
- **Issue:** the plan runs the commit, push and `gh workflow run ci` inside the image job. The image is a Playwright and Node image, and the write token would also sit next to `npm ci`.
- **Fix:** `update-snapshots.yml` has two jobs. `generate` (container, `contents: read`, no persisted credentials) uploads the baselines as an artefact; `commit` (hosted runner, which has `gh`, `contents: write` and `actions: write`) downloads it and commits. `actions/download-artifact` is pinned to `v8.0.2` (`9000827c`). Static tests check the permission split. This follows the plan's own intent (T-04-29 to T-04-31) more tightly.
- **Commit:** `14c15eb`

**3. [Rule 1 - Bug] Biome `noExportsInTest` on the guard**
- `checkBaselineFiles` is a local function of the test file, not an export. **Commit:** `47eafb6`

### Plan-vs-spec notes

- The plan limits Task 1 to `--grep "button "` and removes the limit in Task 2; the spec was written with all 222 tests from the start (`--grep "button "` still selects one primitive), so Task 2 changed nothing in it. `playwright.config.ts` needed no change.
- Notes in the reconstruction scene: the spec checks every note chip it finds; the Wyscout scene may hold none, in which case that assertion is vacuous. Badge against disc is asserted for real (at least one badge appears in some frame).

## Phase gate (all run on the final tree)

- `npx vitest run`: 53 files, 1238 passed, 6 skipped. `npx tsc --noEmit` clean. `npx biome ci .`: 0 errors (1 info from 04-15's Dialog). `npm run guard`: 513 files ok.
- `npm run build && npm run guard:bundle && npm run smoke`: ok, no dev route code in `dist/assets`.
- `REVIEW_PORT=5184 npx playwright test --project=functional`: 98 passed locally (and 98 passed in CI on Linux).
- `CHECK_PITCH_PORT=5183 npm run check:pitch`: 49 ok, 0 failed (the first attempt timed out while a review run still held the browser profile, then passed).
- `review:screens`: `/dev/directions/floodlit/tactics` PASS (0 fail, 1 warn), `/dev/directions/floodlit/data` PASS (0 fail, 1 warn), `/dev/gallery` PASS (0 fail, 0 warn); the 37 bare gallery pages passed at 375 and 1440 in 04-16. The picked direction is `floodlit` (ADR 0010).
- `REVIEW_PORT=5184 npx playwright test --project=visual`: 222 skipped, nothing under `tests/visual` written. `--list` shows 222 tests.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-04-29 (no `${{` in a `run:` script, branch only via `env:`), T-04-30 (stage only `*-linux.png`, guard in the required `test` job), T-04-31 (`ci.yml` read-only, write permissions only on the manual commit job, no `pull_request_target`, refuses `main`) and T-04-32 (image tag equals the npm pin, actions SHA-pinned) are each covered by a static test.

## Open for the learner or the merge

- After Phase 4 merges: run `gh workflow run update-snapshots.yml --ref <next branch>`, confirm the bot commit holds only `tests/visual/__baselines__/*-linux.png`, and that the dispatched `ci` run's `visual` job is green.
- Optional: start Docker Desktop and run the in-container generation and comparison once for `button` (the Task 1 proof); not needed for the CI path.

## Self-Check: PASSED

- Created files exist (visual spec, pitch-fixes spec, guard test, update-snapshots.yml).
- Commits `4971b40`, `47eafb6`, `14c15eb`, `92f68bd` are ancestors of HEAD; the branch is pushed.
