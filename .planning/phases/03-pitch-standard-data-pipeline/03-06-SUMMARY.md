---
phase: 03-pitch-standard-data-pipeline
plan: "06"
subsystem: pipeline
tags: [python, manifest, immutable, publish, catalog, vitest, wyscout]

requires:
  - phase: 03-pitch-standard-data-pipeline
    provides: allow-list, fetch_source, RECIPES, dump_scene, wyscout-goal recipe (03-05); Scene schema and Zod mirror (03-02)
provides:
  - manifest.py content-hash version ids, refuse-to-overwrite writer, Manifest model, read_version verifier, write_scene_version
  - publish.py shippable-only copy to public/data and timestamp-free catalog.json
  - CLI recipe (versioned output, optional --out preview), publish, run-all
  - npm run data and npm run data:fetch
  - committed data/wyscout/v1-809b8aff1fda and its public/data copy plus public/data/catalog.json
  - src/scene/pipeline-output.test.ts Python to TypeScript round trip
  - src/scene/fixtures/reconstruction.json now equal to the published pipeline scene
affects: [03-07 playback, 03-08 bundle gate and immutability check, 03-10 reconstruction dev page, phase-05 lessons]

actuals:
  tokens: 22000
  tasks: 3
  commits: 4
plan_head_before: 8dac702e173919569b11d99db55783834b78902f
plan_head_after: b2f42d843f90ec1f7d897141b5ea0eb5b7ec25d2

tech-stack:
  added: []
  patterns:
    - "Dataset versions are content-addressed (v1- plus 12 hex of sha256 over sorted path:sha256 lines) and written to a staging folder then renamed, never overwritten"
    - "An existing version must hold byte-identical files (no-op) or the write is refused; generatedAt is outside the hash"
    - "public/data holds shippable copies only, both manifest and allow-list must say shippable; catalog.json is the single mutable file"
    - "Generated data folders are excluded from Biome so formatters cannot rewrite hash-pinned bytes"

key-files:
  created:
    - pipeline/src/klopp_pipeline/manifest.py
    - pipeline/src/klopp_pipeline/publish.py
    - pipeline/tests/test_manifest_immutable.py
    - pipeline/tests/test_run_all.py
    - src/scene/pipeline-output.test.ts
    - data/wyscout/v1-809b8aff1fda/manifest.json
    - data/wyscout/v1-809b8aff1fda/scene-wyscout-2499754-sane-goal.json
    - public/data/catalog.json
    - public/data/wyscout/v1-809b8aff1fda/manifest.json
    - public/data/wyscout/v1-809b8aff1fda/scene-wyscout-2499754-sane-goal.json
  modified:
    - pipeline/src/klopp_pipeline/cli.py
    - package.json
    - biome.json
    - src/scene/fixtures/reconstruction.json

key-decisions:
  - "Manifest keys follow the plan: license (American spelling) beside licenceUrl, as written in the interface block"
  - "Catalog file lists include manifest.json itself, so every file served under public/data/<dataset>/<version>/ is listed with sha256 and bytes (what the 03-08 bundle gate needs)"
  - "run-all fetches only sources that a registered recipe reads, so StatsBomb (local only) is not downloaded until its recipe exists"
  - "A scene's own source.shippable must equal the allow-list's flag for its source, or the version is refused"

patterns-established:
  - "write_scene_version(scene, source=, recipe=, dataset=, raw_root=, data_root=) is the one path from a recipe to disk"
  - "Vitest enumerates every data/*/* and public/data/*/* version, so a local-only dataset added later is validated the same way"

requirements-completed: [PIPE-01, PIPE-02]

coverage:
  - id: D1
    description: "Each recipe output lands in data/<dataset>/<version>/ with a complete manifest and a content-hash version id; same inputs give the same directory"
    requirement: PIPE-02
    verification:
      - kind: unit
        ref: "pipeline/tests/test_manifest_immutable.py"
        status: pass
      - kind: other
        ref: "clean-folder rebuild reproduced v1-809b8aff1fda (see Live runs)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Versions are immutable: identical rewrite is a no-op, a changed or extra byte is refused and the directory is untouched, bad names and paths outside the root are rejected, a shippable file over 1 MB is refused"
    requirement: PIPE-02
    verification:
      - kind: unit
        ref: "pipeline/tests/test_manifest_immutable.py"
        status: pass
    human_judgment: false
  - id: D3
    description: "publish copies only shippable versions (manifest and allow-list agree), regenerates catalog.json without timestamps, and a second publish changes nothing"
    requirement: PIPE-02
    verification:
      - kind: unit
        ref: "pipeline/tests/test_manifest_immutable.py#publish"
        status: pass
    human_judgment: false
  - id: D4
    description: "npm run data runs the whole pipeline at a path with spaces on Windows with no make, and a second run writes nothing"
    requirement: PIPE-02
    verification:
      - kind: unit
        ref: "pipeline/tests/test_run_all.py"
        status: pass
      - kind: other
        ref: "live npm run data twice, git status clean (see Live runs)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The committed Wyscout artifact passes ajv, Zod and checkSceneIntegrity; its sha256 values match its manifest and the catalog; the reconstruction fixture equals the published scene"
    requirement: PIPE-04
    verification:
      - kind: unit
        ref: "src/scene/pipeline-output.test.ts"
        status: pass
    human_judgment: false

duration: 9min
completed: 2026-11-28
status: complete
---

# Phase 3 Plan 06: Versioned Immutable Output, Publish and Catalog Summary

**Recipe output is now written as content-addressed, never-overwritten dataset versions with full manifests, the shippable ones are published to public/data with a hash-listing catalog, one `npm run data` runs it all idempotently on Windows, and the real Sané goal is committed and round-tripped through the TypeScript validators.**

## Performance

- **Duration:** about 9 min
- **Tasks:** 3
- **Files modified:** 14 (10 created, 4 modified)

## Accomplishments
- `manifest.py`: `version_id`, `write_version` (names validated, resolved path must stay under `data_root`, staging folder then atomic rename, existing directory compared byte for byte), `Manifest` (extra forbid), `read_version` verifying every hash and the version id, `write_scene_version` taking licence facts from the allow-list.
- `publish.py`: copies a version only when manifest and allow-list both say shippable, refuses to change an existing public version, writes `catalog.json` (sorted, files with sha256 and bytes, scenes with id and label, no timestamps) only when its bytes change.
- CLI: `recipe` writes versioned output (`--out` kept as a preview), `publish`, `run-all [--sources] [--offline] [--raw-dir] [--data-dir] [--public-dir]` ending in "done: N new file(s)" or "done: no new files".
- `package.json`: `data` and `data:fetch`; `biome.json` ignores `data/` and `public/data/`.
- Committed `data/wyscout/v1-809b8aff1fda/` and `public/data/wyscout/v1-809b8aff1fda/` (scene 8910 bytes, manifest 1308 bytes) plus `public/data/catalog.json` (CC BY 4.0, shippable per ADR 0008; nothing from `pipeline/data/raw/` staged).
- `src/scene/pipeline-output.test.ts` (10 tests): per version manifest/sha256/bytes/version id/no CR, scenes through ajv strict, Zod and `checkSceneIntegrity`, public equals data byte for byte, catalog equals disk, Wyscout facts (10 events, "Leroy Sané", Manchester City, CC-BY-4.0, Pappalardo), fixture equals the published scene.
- `src/scene/fixtures/reconstruction.json` replaced by the published scene; this also fixes the earlier mojibake in "Sané".

## Task Commits

1. **Task 1 (tracer): writer, manifest, publish, catalog, Vitest round trip** - `ee5edea` (feat)
2. **Task 2: immutability and publish tests, run-all** - `d9feed4` (test, RED), `8b90cba` (feat, GREEN)
3. **Task 3: reconstruction fixture from the recipe** - `b2f42d8` (feat)

Tracer gate: the Task 1 verify (`npx vitest run src/scene`, `npx biome ci .`, `npm run guard`) passed (61 scene tests, 9 in the new file at that point) before Task 2 started; expansion proceeded.

## Live runs (PIPE-02 evidence, Windows, repo path with spaces)

- `klopp-pipeline recipe wyscout-goal --offline` then `publish`: wrote `data/wyscout/v1-809b8aff1fda`, published it, wrote the catalog.
- `npm run data` (first run, artifact already committed): `wyscout: 4 file(s) verified`, `wyscout-goal: already present v1-809b8aff1fda`, `done: no new files`; `git status --porcelain data public/data` empty.
- `npm run data` (second run): identical output, `git status` empty.
- Determinism: `run-all --offline` into an empty scratch data and public folder wrote `v1-809b8aff1fda` again (5 new files); `diff -r` against the committed version differs only in `generatedAt`, which is excluded from the hash.
- Verification: `npx vitest run` 652 passed, 6 skipped (29 files); `npx tsc --noEmit` clean; `npx biome ci .` clean; `npm run guard` ok; `uv run --project pipeline pytest pipeline/tests -q` 147 passed.

## TDD Gate Compliance

- **Task 2 RED:** `pytest pipeline/tests/test_run_all.py -k test_run_all_writes_one_version --junitxml=...`, exit 1, `assert 2 == 0` (Typer: "No such command 'run-all'"). Classifier `RED_EVIDENCE_OK` (`target_test_failed`).
- **Task 2 GREEN:** `8b90cba`, pipeline suite 147 passed.
- The immutability and publish tests (28) passed on arrival because the tracer task had to implement `manifest.py` and `publish.py` in full to commit the real artifact; they were written afterwards against that implementation and are the regression net for it. Only the `run-all` tests were genuinely red first.

## Package legitimacy
No packages installed (threat T-03-SC accepted as planned).

## Deviations from Plan

**1. [Rule 3 - Blocking] Windows line endings from a Python rewrite**
- Found during Task 1: a one-off script that edited `biome.json` wrote CRLF, so `biome ci` failed on formatting. Fixed by stripping the carriage returns (git normalises to LF). Not a code change; later edits used the Edit tool or LF-safe commands.

**2. [Plan wording] `run-all` fetches only sources a recipe needs**
- The interface text says "fetch every source that has files"; the Task 3 precondition says StatsBomb is fetched only once 03-10 adds its recipe. Implemented as: fetch each source that has files and is the `source_id` of a registered recipe. A test covers a listed source with no recipe being skipped.

**3. [Rule 2 - Missing critical] Scene versus allow-list shippable check**
- `write_scene_version` refuses a scene whose `source.shippable` differs from the allow-list flag, so a recipe cannot publish a local-only provider by mistake (T-03-16).

**4. [Plan wording] Task 1 was implemented in full, not as a thin slice**
- See TDD Gate Compliance.

**Total deviations:** 4, none changing a frozen contract.

## Issues Encountered
- `git status` keeps listing a few Python files as modified although `git diff` is empty (stat noise after line-ending normalisation); content is identical to HEAD.

## Known Stubs
None.

## User Setup Required
None.

## Next Phase Readiness
- 03-07 can load the real 10-event scene from `src/scene/fixtures/reconstruction.json` (or `public/data/catalog.json`) for playback.
- 03-08 can add the deny-manifest bundle gate and the git-level immutability check over `data/` and `public/data/`; the catalog already lists every shipped file with sha256 and bytes.
- 03-10 adds the StatsBomb recipe (local only; `.gitignore` for `data/statsbomb/` and `public/data/statsbomb/` still to be added there or in 03-08, since no local-only dataset exists yet).

## Self-Check: PASSED
- All 10 created files exist; commits ee5edea, d9feed4, 8b90cba, b2f42d8 are ancestors of HEAD.

---
*Phase: 03-pitch-standard-data-pipeline*
*Completed: 2026-11-28*
