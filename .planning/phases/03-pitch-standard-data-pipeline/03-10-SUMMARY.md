---
phase: 03-pitch-standard-data-pipeline
plan: "10"
subsystem: pipeline
tags: [dev-pitch, scene-loading, state-panels, statsbomb, local-only, kloppy, freeze-frame]

requires:
  - phase: 03-pitch-standard-data-pipeline
    provides: Scene/Frame format, parseScene and integrity checks (03-02); SceneLayer, glyphs, Legend (03-04, 03-07); versioned writer, publish, wyscout-goal recipe, RECIPES (03-05, 03-06); deny-manifest, git guard, bundle gate (03-08); /dev/pitch board and probe (03-09)
provides:
  - loadDevScene (fixture, published-catalog and local-only loaders returning ready, empty, invalid, missing-local, error, none), toPanelIssues, hasLocalStatsbomb, sceneOptionLabel, LOCAL_STATSBOMB
  - StatePanel (empty, invalid, missing-local, load-error copy from 03-UI-SPEC)
  - Empty scene and Invalid scene fixtures and options
  - Wyscout reconstruction option read end to end from public/data/catalog.json
  - standardise.load_statsbomb_match and the statsbomb-shot recipe (local-only, never published)
affects: [03-11 browser checks, ADR 0009, phase-05 scene authoring, phase-08 Tactics Board]

actuals:
  tokens: 15800
  tasks: 3
  commits: 3
plan_head_before: 24e8e4d35aeb114c749603b608083e23d7258c10
plan_head_after: 0bf9349f7d51e368a1dcbb2cbd46d95423da9057

tech-stack:
  added: []
  patterns:
    - "Every scene load ends in a LoadResult the page can draw; the loader never throws"
    - "Fetch, then check content type, then parse: a missing file behind an SPA fallback answers 200 with HTML and must not reach JSON.parse"
    - "Local-only data is read with a non-eager import.meta.glob inside the dev-only route chunk, so a production build never bundles it"
    - "kloppy warps a StatsBomb shot's freeze frame with the same transform as the event, so no second converter is written"

key-files:
  created:
    - src/routes/dev-pitch/sceneSources.ts
    - src/routes/dev-pitch/sceneSources.test.ts
    - src/routes/dev-pitch/StatePanels.tsx
    - src/routes/dev-pitch/StatePanels.test.tsx
    - src/scene/fixtures/empty.json
    - src/scene/fixtures/invalid/frames-out-of-order.json
    - pipeline/src/klopp_pipeline/recipes/statsbomb_shot.py
    - pipeline/tests/test_recipe_statsbomb.py
  modified:
    - src/routes/dev-pitch.tsx
    - src/scene/fixtures/index.ts
    - pipeline/src/klopp_pipeline/standardise.py
    - pipeline/src/klopp_pipeline/recipes/__init__.py
    - pipeline/tests/synthetic.py

key-decisions:
  - "DevScene gained published, local and blank fields so the registry stays plain data; the loader, not the registry, knows how to fetch or glob"
  - "Of several catalog versions for a dataset the loader takes the last, since versions are add-only"
  - "StatsBomb entity ids are the team prefix and jersey number (swa-17) and the scene id is statsbomb-<match>-<entity>-shot, so no player name is part of any id"
  - "The scene carries the allow-list licence and attribution strings verbatim so the scene, manifest and registry agree"
  - "cli.py was not changed: run-all already builds every registered recipe, and the standardise command only serves sources with an extract step"

patterns-established:
  - "A test that needs a StatsBomb-shaped match builds it in code (tests/synthetic.py); the real-data test is gated on the cached files"

requirements-completed: [PIPE-04, PIPE-03, PITCH-04]

coverage:
  - id: D1
    description: "The Wyscout reconstruction option fetches /data/catalog.json, checks the content type, validates with Zod and the integrity rules, and plays to Replay on the canonical pitch"
    requirement: PIPE-04
    verification:
      - kind: unit
        ref: "src/routes/dev-pitch/sceneSources.test.ts (catalog and scene fetch, HTML with 200, missing dataset, 404, network failure, integrity failure)"
        status: pass
      - kind: other
        ref: "manual CDP check in headless Edge: Inspector shows Shippable Yes and Licence CC-BY-4.0, Play reached Replay after 19.0 s"
        status: pass
    human_judgment: false
  - id: D2
    description: "Empty and invalid scenes show the frozen copy, at most five issues with the remainder counted, and the legend says No marks to explain yet"
    requirement: PITCH-04
    verification:
      - kind: unit
        ref: "src/routes/dev-pitch/StatePanels.test.tsx and sceneSources.test.ts (toPanelIssues 7 to 5 and 2, 3 to 3 and 0)"
        status: pass
      - kind: other
        ref: "manual CDP check: panel text, 4 px danger border (rgb 179, 38, 30), neutral border for empty, screenshots reviewed"
        status: pass
    human_judgment: true
    rationale: "Panel layout was judged from a 1440 px screenshot"
  - id: D3
    description: "The statsbomb-shot recipe turns the pinned shot into a local-only reconstruction under data/statsbomb with shippable false; publish skips it; the production bundle holds nothing from it"
    requirement: PIPE-03
    verification:
      - kind: unit
        ref: "pipeline/tests/test_recipe_statsbomb.py (synthetic data, writer refusal, publish skip) and the gated real-data test"
        status: pass
      - kind: other
        ref: "npm run build, npm run guard:bundle (bundle ok), npm run guard, grep of dist for statsbomb, git status clean for data/"
        status: pass
    human_judgment: false
  - id: D4
    description: "When the StatsBomb scene is absent the option says not on this machine and selecting it shows the Local data not on this machine panel"
    requirement: PIPE-03
    verification:
      - kind: unit
        ref: "src/routes/dev-pitch/sceneSources.test.ts (missing-local, sceneOptionLabel) and StatePanels.test.tsx (panel copy)"
        status: pass
    human_judgment: true
    rationale: "Not seen in the browser: the Vite dev server holds a lock on data/statsbomb, so the folder could not be moved away to hide it"

duration: 55min
completed: 2026-11-28
status: complete
---

# Phase 3 Plan 10: Scene States, Published Scene Loading and Local-only StatsBomb Recipe Summary

**/dev/pitch now loads the published Wyscout scene through the catalog, shows frozen empty, invalid, missing-local and error panels, and a local-only StatsBomb recipe turns a real shot with its freeze frame into a scene that never leaves the machine.**

## Performance

- **Duration:** about 55 min
- **Tasks:** 3
- **Files modified:** 13 (8 created, 5 modified)

## Accomplishments
- `sceneSources.ts`: `loadDevScene(entry, fetchImpl, localGlob)` returns `ready`, `empty`, `invalid`, `missing-local`, `error` or `none` and never throws. The published path fetches `/data/catalog.json`, takes the newest entry for the dataset, fetches its scene, and refuses any response whose content type does not include `json` before parsing (research Pitfall 8). Every scene goes through `parseScene`.
- `/dev/pitch` routes every load through `loadDevScene`; the pitch markings stay while the status line reads "Loading scene…". The Wyscout option no longer imports `reconstruction.json`; that file stays as the schema fixture the tests check.
- `StatePanel` with the Copywriting Contract text: "This scene has no marks", "Scene failed validation" (count, up to five mono `{path}: {message}` lines, "and {m} more"), "Local data not on this machine" and a load-error panel. Errors have a 4 px `--danger` left border; empty and missing-local use the control border. Panels are flat.
- `empty.json` (valid, no marks) and `invalid/frames-out-of-order.json` (first frame at 0.4 s, a frame that goes back in time, a position for an entity that does not exist: three integrity issues, all under `/frames/`). The invalid file sits in a subfolder, so `scene.test.ts` never treats it as a valid fixture.
- `standardise.load_statsbomb_match` (kloppy `statsbomb.load` over `BytesIO`, `coordinates="statsbomb"`, no 360 file, then the 105 x 68 transform) and the `statsbomb-shot` recipe. The pinned shot (match 3754047, event e6427836-c67b-4a24-8928-e0b81cbf2b24) comes out at (99.82, 38.90) with 14 freeze-frame players, a ball and a goalkeeper entity; Swansea is side A attacking left to right, Liverpool side B attacking right to left.
- `npm run data` now also builds the StatsBomb scene into `data/statsbomb/v1-99d3aeeb8b2b/` and reports "not shippable, kept local".

## Task Commits

1. **Task 1 (tracer): published Wyscout scene on /dev/pitch through the catalog** - `7a2c24d` (feat)
2. **Task 2: empty and invalid scene options with state panels** - `597d84c` (feat)
3. **Task 3: local-only StatsBomb shot recipe and /dev/pitch option** - `0bf9349` (feat)

Tracer gate: Task 1's `vitest run src/routes`, `tsc --noEmit` and `biome ci src` were green, and `?scene=reconstruction` was played to "Replay sequence" in headless Edge before Task 2 started.

## TDD Gate Compliance

- **Task 1:** `sceneSources.test.ts` was written before `sceneSources.ts` (the module did not exist, so the first run could not import it).
- **Task 2 RED:** `StatePanels.test.tsx` was written first; `npx vitest run src/routes/dev-pitch/StatePanels` failed with no tests collected because `StatePanels.tsx` and the registry entries did not exist, then all passed.
- **Task 3:** the synthetic builders and `test_recipe_statsbomb.py` were written together with the recipe; a first run caught two data mistakes in my synthetic match (a jersey number out of range, a player id mismatch), not recipe bugs. The RED-evidence classifier was not run.

## Live StatsBomb run
- Precondition held: `git check-ignore -q data/statsbomb/x.json` exit 0, and raw.githubusercontent.com answered 200.
- `klopp-pipeline fetch statsbomb` downloaded the three allow-listed files (698179, 3198595 and 20043 bytes) into the git-ignored `pipeline/data/raw/statsbomb/`.
- `npm run data` wrote `data/statsbomb/v1-99d3aeeb8b2b`, left the Wyscout version as "already present", and skipped publishing the StatsBomb one.
- `/dev/pitch?scene=statsbomb-local` rendered the shot: 16 glyphs (14 players, the ball and the shot line, Swansea number 17 holding the ball, Liverpool's goalkeeper as a rounded square), legend entries player-a, player-b, goalkeeper-b, ball, shot and density, Inspector Shippable No and Licence statsbomb-public-data-user-agreement, source line ending "Local only, not shipped".

## Leak proof
- `npm run build` then `npm run guard:bundle`: "bundle ok: 8 files". A grep of `dist` for `statsbomb`, `3754047` and `swa-17` found nothing, with the local file present on disk (the dev route chunk is behind `import.meta.env.DEV`, so the glob is never bundled).
- `npm run guard`: "375 file(s) ok (tracked)". `git add -f` of a `data/statsbomb/` file made `guard-files.ts --staged` exit 1 with `denied-path`; the path was unstaged again.
- `git status --porcelain` shows nothing under `data/`; `git check-ignore -v` names `.gitignore:24:data/statsbomb/`.

## Manual checks (headless Edge over CDP, dev server on 5173)
- `?scene=reconstruction`: no status line left, Inspector "Frames 11, Duration 19.0 s, Source wyscout, Licence CC-BY-4.0, Shippable Yes"; Play ran to 19.0 s and the button became "Replay sequence".
- `?scene=empty`: panel "This scene has no marks" with the frozen body, neutral 4 px border, legend "No marks to explain yet.", pitch markings drawn.
- `?scene=invalid`: panel "Scene failed validation" naming three problems with `/frames/0/t`, `/frames/2/t`, `/frames/2/positions/home-7` lines, left border rgb(179, 38, 30) 4 px; pitch drawn, no marks.
- Not done: the missing-local panel was not seen in a browser (see D4); no real screen reader; one browser only.

## Package legitimacy
No packages installed (T-03-SC accepted).

## Deviations from Plan

**1. [Plan wording] cli.py not modified**
- The plan lists `cli.py` in `files_modified`. `run-all` already builds every registered recipe and `recipe statsbomb-shot` works through the existing `recipe` command, so no change was needed. The `standardise` command remains Wyscout-only because StatsBomb has no extract step.

**2. [Plan wording] Registry gained fields**
- `DevScene` gained `published`, `local` and `blank` so the registry stays plain data. The Wyscout entry's `load` is now `() => null`.

**3. [Rule 1 - Bug avoided] Freeze-frame players are not scaled by hand**
- A linear 120 x 80 to 105 x 68 scale would put the shooter at (100.06, 38.59), not kloppy's (99.82, 38.90), because kloppy warps the standardised pitch piecewise. The recipe reads `event.freeze_frame`, which kloppy already transforms, and a test asserts the shot start equals kloppy's own event coordinate.

**4. [Rule 2 - Missing critical] Error panel for failed loads**
- The plan names empty, invalid and missing-local panels. A failed fetch needs somewhere to show its message, so `StatePanel` has a fourth "This scene could not be loaded" panel with a danger border.

**5. [Process] Missing-local not seen in a browser**
- Renaming `data/statsbomb` while Vite ran failed with "Permission denied" (the dev server watches it). The loader branch and the panel copy are covered by unit tests only.

**Total deviations:** 5, none changing a frozen contract.

## Issues Encountered
- Bash heredocs holding Python or test files with quotes failed to parse again; files were written with the Write tool instead.
- Biome reformatted several new files on first run; `biome check --write` was run before each commit.
- A recursive delete of my own scratch output under the git-ignored `scratch_tmp_review/` was refused by the permission layer; the folder was left in place (ignored by git).

## Known Stubs
None.

## User Setup Required
None. To see the local-only scene: `npm run data`, then reload `/dev/pitch`.

## Next Phase Readiness
- 03-11 can query `[data-state="empty-scene" | "invalid-scene" | "missing-local" | "load-error"]` and select options by id (`reconstruction`, `statsbomb-local`, `empty`, `invalid`).
- Phase 5 scene authoring can reuse `loadDevScene`'s fetch-guard-parse order for any published artifact.

## Self-Check: PASSED
- All 8 created files exist; commits 7a2c24d, 597d84c, 0bf9349 are ancestors of HEAD.

---
*Phase: 03-pitch-standard-data-pipeline*
*Completed: 2026-11-28*
