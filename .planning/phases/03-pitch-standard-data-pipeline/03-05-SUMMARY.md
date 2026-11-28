---
phase: 03-pitch-standard-data-pipeline
plan: "05"
subsystem: pipeline
tags: [python, kloppy, pydantic, wyscout, allow-list, sha256, recipe, scene]

requires:
  - phase: 03-pitch-standard-data-pipeline
    provides: Scene/Frame v1 JSON Schema and fixtures (03-02); pipeline package, net.py and the socket-blocked test conftest (03-03)
provides:
  - pipeline/sources.allow.json with six sources (ADR 0008 shippable flags, sha256 and commit pins)
  - sources.py validated allow-list model, fetch.py hash-verified fetch_source
  - net.fetch_bytes cache and total_timeout_seconds keywords
  - standardise.py Wyscout per-match extract over kloppy (zip never extracted, member cap) with a hash-keyed extract cache
  - scene.py pydantic mirror of scene.schema.json with canonical dump_scene bytes
  - recipes/ registry and the wyscout-goal recipe (real Manchester City v Liverpool goal)
  - CLI commands fetch, standardise, recipe
affects: [03-06 versioned write and manifests, 03-07 playback, 03-10 reconstruction scene, 03-11 browser checks]

actuals:
  tokens: 24000
  tasks: 3
  commits: 4
plan_head_before: b00fd28bfa964ef240730d800e4c9f59635eb162
plan_head_after: aa55cc2a50decfdc8b3e22bacd6d99bc96b937d8

tech-stack:
  added: []
  patterns:
    - "kloppy receives BytesIO only; one to_pitch_dimensions transform is the only coordinate warp"
    - "Raw files enter pipeline/data/raw/<source>/ only after their sha256 matches the pin; a bad cached file is deleted"
    - "Per-match extract cached beside the raw files with the sha256 of each input; rebuilt when any input hash differs"
    - "JSON Schema and pydantic parity by a property/required walker with union branches keyed by the type const"

key-files:
  created:
    - pipeline/sources.allow.json
    - pipeline/src/klopp_pipeline/sources.py
    - pipeline/src/klopp_pipeline/fetch.py
    - pipeline/src/klopp_pipeline/standardise.py
    - pipeline/src/klopp_pipeline/scene.py
    - pipeline/src/klopp_pipeline/recipes/__init__.py
    - pipeline/src/klopp_pipeline/recipes/wyscout_goal.py
    - pipeline/tests/synthetic.py
    - pipeline/tests/test_sources.py
    - pipeline/tests/test_recipe_wyscout.py
    - pipeline/tests/test_scene_parity.py
  modified:
    - pipeline/src/klopp_pipeline/net.py
    - pipeline/src/klopp_pipeline/cli.py
    - .gitignore

key-decisions:
  - "Fetch keeps its own hash-verified copy (cache=False in net); a cached raw file is trusted only while it still hashes to the pin"
  - "StatsBomb files are pinned by the commit id in the URL (sha256 null); the validator accepts a missing sha256 only for a 40-hex commit path"
  - "The per-match extract cache stores the input sha256 values and is rebuilt when they differ, so a changed pin never serves a stale extract"
  - "Recipe frame rule: a frame per pass start (actor, ball, previous actor) plus the shot frame and a final frame 0.6 s after the shot with the ball at the (approximate) shot end"
  - "Recipes declare extract_ids so the standardise command builds exactly what registered recipes read"

patterns-established:
  - "Recipes are registered by name in recipes/__init__.py and build(raw_root, offline) -> Scene"
  - "Real-data tests are gated on the cache file and skip with the command that creates it; all other tests use in-code synthetic data"

requirements-completed: [PIPE-01, PIPE-04]

coverage:
  - id: D1
    description: "Fetch is allow-list-only and hash-verified: unknown source, http, unlisted host, port, missing pin, bad file name, wrong hash and oversize body are all refused and keep no file"
    requirement: PIPE-01
    verification:
      - kind: unit
        ref: "pipeline/tests/test_sources.py"
        status: pass
    human_judgment: false
  - id: D2
    description: "The allow-list names every ADR 0008 source with its licence id and shippable flag (wyscout, dfl true; statsbomb, last-row, metrica, skillcorner false; statsbomb logoRequired)"
    requirement: PIPE-01
    verification:
      - kind: unit
        ref: "pipeline/tests/test_sources.py#test_the_committed_allow_list_follows_adr_0008"
        status: pass
    human_judgment: false
  - id: D3
    description: "Wyscout standardiser decodes names once, caps zip members, keeps one match, converts coordinates with a single warp"
    requirement: PIPE-01
    verification:
      - kind: unit
        ref: "pipeline/tests/test_recipe_wyscout.py"
        status: pass
    human_judgment: false
  - id: D4
    description: "Pydantic Scene and scene.schema.json agree: property and required sets equal, every fixture round-trips, extra properties rejected at nine levels"
    requirement: PIPE-04
    verification:
      - kind: unit
        ref: "pipeline/tests/test_scene_parity.py"
        status: pass
    human_judgment: false
  - id: D5
    description: "Real data: the pinned Sané goal (match 2499754, shot 185704194) comes out as a valid 10-event reconstruction scene on this machine"
    requirement: PIPE-04
    verification:
      - kind: unit
        ref: "pipeline/tests/test_recipe_wyscout.py#test_the_real_pinned_goal_comes_out_as_a_valid_reconstruction_scene"
        status: pass
      - kind: other
        ref: "live run of klopp-pipeline fetch, standardise and recipe (see Live run)"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-11-28
status: complete
---

# Phase 3 Plan 05: Allow-listed Fetch, Wyscout Standardiser and the Sané Goal Recipe Summary

**An allow-list-only, sha256-pinned fetch path, a kloppy-based Wyscout standardiser and a pydantic Scene that matches the JSON Schema turn the real Manchester City v Liverpool 2017/18 goal into a valid reconstruction scene, proven on synthetic data in tests and on the real data on this machine.**

## Performance

- **Duration:** about 14 min (commit timestamps 04:31 to 04:45 local)
- **Tasks:** 3
- **Files modified:** 14 (11 created, 3 modified)

## Accomplishments
- `pipeline/sources.allow.json`: wyscout (4 files, sha256 pins), statsbomb (3 files pinned by commit `4b73468f...`), dfl, last-row, metrica, skillcorner (no files, licence record only).
- `fetch_source`: https plus `ALLOWED_HOSTS` (re-checked on every redirect by the existing handler), `maxBytes` cap, sha256 check before an atomic write, bad cache entry deleted, `--offline` never downloads.
- `standardise.py`: reads `events_England.json` straight from the zip with a 250 MiB member cap checked on the header and while reading, decodes the double-escaped names once, builds kloppy's V2 wrapper (home team first), caches the extract keyed by input hashes.
- `recipes/wyscout_goal.py` plus `scene.py`: possession chain walked back from the shot (stops at an opponent event or a period change, skips duels and touches), frames per pass start, approximate shot end from kloppy's goal-zone, sequence annotation, CC BY attribution and clock offset.
- CLI: `fetch <source> | --all [--offline] [--raw-dir]`, `standardise <source>`, `recipe <name> --out <file>`; `coverage` and `landmarks` unchanged.
- `net.fetch_bytes` gained `cache` and `total_timeout_seconds` (defaults keep Phase 2 behaviour); user agent text is now "(open-data pipeline)".

## Task Commits

1. **Task 1: Wyscout recipe on synthetic data, standardise, pydantic Scene** - `0f82a0d` (feat)
2. **Task 2: allow-list and fetcher** - `42528c2` (test, RED), `4be0c6f` (feat, GREEN)
3. **Task 3: parity tests and the real pinned goal** - `aa55cc2` (test)

## Live run (real Wyscout data, this machine, 2026-11-28)

`klopp-pipeline fetch wyscout` took about 4 s over the allow-listed `ndownloader.figshare.com` host and its already allow-listed R2 redirect host (no new host was needed).

| File | Bytes | sha256 (equals the pin) |
|------|-------|------------------------|
| events.zip | 77323413 | 877e015b716ffdeea18f04418e3f24fed307ed03c37ff305cabe1f47c4822a45 |
| matches.zip | 645097 | c8f92bb7533e5c127e043cee764c991b5c25b4f5e70a65be931baae0b1765ce9 |
| players.json | 1737347 | 877a111cb1005b73df5645e9338bd74fb4b496bace2fbc545a72abb3b73efa2e |
| teams.json | 27404 | 9f7a4a3b3d92c0be33f40613ad6e6eb4316c3b9771ec74c61a22c9b8ece23a4d |

`standardise wyscout` produced the match 2499754 extract (1695 events). `recipe wyscout-goal --out pipeline/data/raw/wyscout/preview-scene.json --offline` wrote scene `wyscout-2499754-sane-goal`:
- label "Manchester City 5-0 Liverpool, 9 Sep 2017: Sané goal, second half"
- 10 events (pass x9 then the shot), ids `ev-185704173` to `ev-185704194`, first pass start (40.22, 19.34)
- 11 frames, last at 18.97 s (chain plus the 0.6 s shot frame)
- 8 entities: Mangala, Danilo, Stones, Walker, De Bruyne, Sané, Mendy and the ball; team Manchester City attacking ltr in period 2 (clock offset 1852.91 s)
- source: CC-BY-4.0, shippable, Pappalardo et al. attribution; 5613 bytes of canonical JSON
Peak memory while parsing the England file was not measured. The preview scene and all raw files are in git-ignored `pipeline/data/raw/`; `git status` shows nothing under `pipeline/data/` and `npm run guard` passes.

## TDD Gate Compliance

- **Task 2 RED:** `uv run --project pipeline pytest pipeline/tests/test_sources.py -q -k test_the_committed_allow_list_has_six_sources --junitxml=...`, exit 1, `assert 0 == 6` (stub `load_allow_list` returns an empty list). Classifier: `RED_EVIDENCE_OK` (`target_test_failed`). Semantic assessment: the module imported and the target ran and failed on the planned assertion; 29 of 30 tests in the file failed against the stubs.
- **Task 2 GREEN:** `4be0c6f`; whole pipeline suite 96 passed.
- **Task 1** was `tdd` in spirit but its tests and implementation were committed together as the plan's tracer slice; **Task 3** parity tests passed on arrival because `scene.py` was authored in Task 1 to mirror the schema. Sensitivity was verified by a mutation check instead (removing `tEnd` from the schema's passEvent and adding a required `ballOwner` to frame made the walker report `$.frames[]` and `$.events[]|pass`). The gated real-data test skipped (not failed) before the live run and passed after.

## Package legitimacy
No packages were installed in this plan (pydantic, kloppy, typer and pytest were already pinned in 03-03). Threat T-03-SC accepted as planned.

## Deviations from Plan

**1. [Rule 2 - Missing critical] Strict allow-list validation beyond the plan text**
- The validators also refuse non-443 ports, file names that are not plain names, duplicate ids and unknown fields, and require 64-hex lowercase sha256 when present. Same intent as T-03-10 and T-03-12.

**2. [Plan wording] StatsBomb file names**
- The plan did not name the stored files; they are `matches-2-27.json`, `events-3754047.json`, `lineups-3754047.json` (flat names, because the validator allows no path separators).

**3. [Plan wording] `fetch --all` fetches every source that lists files**
- That includes StatsBomb (local only, git-ignored raw folder). It is the learner's local cache; nothing from it is published (ADR 0008).

**4. [Tooling] `.gitignore` gained `__pycache__/` and `*.pyc`**
- Python bytecode appeared as untracked files after running the pipeline; ignored rather than committed.

**5. [Plan wording] Task 3 parity tests had no RED phase** (see TDD Gate Compliance).

**6. [Environment] Commit trailer** - the harness instruction said "Claude Sonnet 5.5", the orchestrator brief said "Claude Opus 5.5". All commits carry Sonnet 5.5, matching the model that did the work. Flagged for the orchestrator.

**Total deviations:** 6, none changing a frozen contract.

## Issues Encountered
- `src/scene/fixtures/reconstruction.json` (03-02 fixture) still has mojibake in "Sané". The real recipe output decodes correctly; 03-06 and 03-10 replace the fixture with the published artifact. Not touched here.
- `ruff format --check` would reformat 16 pipeline files, including pre-existing ones; the repo does not enforce it, so the new files follow the existing style and `ruff check` is clean.

## Known Stubs
None.

## User Setup Required
None.

## Next Phase Readiness
- 03-06 can call `RECIPES["wyscout-goal"].build(RAW_ROOT, offline)` and `dump_scene` for the versioned writer, and read `recipe.dataset` for the output folder.
- The real scene is already in `pipeline/data/raw/wyscout/preview-scene.json` for a first look; it is not committed.

## Self-Check: PASSED
- All 11 created files exist; commits 0f82a0d, 42528c2, 4be0c6f, aa55cc2 are ancestors of HEAD.

---
*Phase: 03-pitch-standard-data-pipeline*
*Completed: 2026-11-28*
