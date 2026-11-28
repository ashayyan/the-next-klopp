---
phase: 02-research-wave-1
plan: 18
subsystem: research
tags: [concept-map, derive-links, curriculum-config, band-1, rsch-04]
status: complete
requires: [02-03, 02-16, 02-17]
provides:
  - research/concept-map.json (Band 1, Tracks 0-4, 68 concepts, frozen-at-approval ids)
  - research/curriculum-config.json (Role Map and Watch Gym starters, Milestone 1 tracks, max_starter_layer 5)
  - scripts/research/lib/derive.ts (pure deriveLinks)
  - scripts/research/derive-links.ts (write or --check by parsed value)
  - research/competencies.json (competency.concepts now derived)
affects: [02-19, 02-20, 02-21, phase-07-placement, phase-07-role-map, phase-08-lessons]
tech-stack:
  added: []
  patterns:
    - "prerequisites[] is the single source of truth; prerequisite edges, concept.roles and competency.concepts are derived by derive-links.ts and gated by --check in synthesis.test.ts"
    - "derive-links writes only when the parsed value changes, so biome/lint-staged formatting of research JSON never churns"
key-files:
  created:
    - scripts/research/lib/derive.ts
    - scripts/research/lib/derive.test.ts
    - scripts/research/derive-links.ts
    - research/concept-map.json
    - research/curriculum-config.json
  modified:
    - scripts/research/synthesis.test.ts
    - research/competencies.json
decisions:
  - "Band 1 holds 68 concepts (t00 12, t01 32, t02 8, t03 7, t04 9), inside the 45-70 bound; Track 0 introduces seven role-family concepts (coaching, analysis, data, recruitment, academy, performance, club leadership) under the Role Map"
  - "Thread starters: role-map (layer 1) for t00 and one-question-clips (layer 2, after the-lesson-loop) for t04; max_starter_layer 5"
  - "History of tactics is seven era anchors kept off the main spine (only pyramid-to-wm needs formation-notation and offside-position), so later tracks never wait on history"
  - "Watch Gym Level 1 concepts follow ADR 0008: one-question-clips names reconstructions or local clips; reading-a-reconstruction requires each clip to name its dataset and league"
  - "Derived edge order: authored related and contrasts edges first, then generated prerequisite edges, each sorted by from, to, kind"
requirements-completed: []
requirements-partial: [RSCH-04]
duration: 8 min
completed: 2026-11-28
actuals:
  tokens: 19600
  tasks: 3
  commits: 5
plan_head_before: 7f9eb64707d8102f9e578f3cf563e665164e21a7
plan_head_after: 9d490cd17ac8071190849b357bcfa6500a9308c2
---

# Phase 02 Plan 18: Band 1 concept map Summary

The Band 1 concept map (Tracks 0-4, 68 concepts, the Milestone 0 and 1 content) is in `research/concept-map.json`. Every concept cites registry sources from the Wave 1 domain it came from. A pure `deriveLinks` keeps prerequisite edges, `concept.roles` and `competency.concepts` in sync, and the synthesis gate checks schema, Part, graph, bounds, sources, derive sync and the Band 1 rules.

## Results

| Track | Concepts | Content |
|---|---|---|
| t00-start-here | 12 | how-the-app-works, the-lesson-loop, placement-diagnostic, personal-goals-page, role-map, seven role families |
| t01-the-game | 32 | 17 laws and restarts, 3 positions and numbering, 5 formations, 7 era anchors |
| t02-language-of-space | 8 | thirds and zones, 18-zone grid, five lanes, half-spaces, between the lines, width and depth, numerical and four superiorities |
| t03-phases-of-play | 7 | four phases, in and out of possession, both transitions, set-piece phase, how phases connect |
| t04-watch-gym | 9 | one-question clips, pitch-panel answers, reading a reconstruction, watch one player / unit / phase, blocks, short sessions, story then structure |

- Edges: 89 (82 generated prerequisite edges plus 7 hand-authored related/contrasts edges).
- Longest prerequisite chain: 8 layers (ends at `possession-and-gegenpressing`).
- Thread starters: `role-map` at layer 1, `one-question-clips` at layer 2. `watch-one-player` is at layer 3, ready for the Scouting I starter in 02-19.
- All concepts are `status: "draft"`. The gate blocks `approved` until `research/APPROVAL.md` holds a `Status: approved` line.

### Concepts citing only unverified sources (for 02-20 GAPS.md)

Track 2 is a deferred research domain (brief 6.2 item 2). These four cite only the just-in-time seeds `src-spielverlagerung` and `src-coaches-voice`:
- `eighteen-zone-grid`
- `five-vertical-lanes`
- `half-spaces`
- `four-superiorities`

`lines-and-between-the-lines` and `width-and-depth` also cite `src-coaches-voice`, but each has one verified formations source too (`src-pl-442-explained`, `src-coachesvoice-formations-explained`).

### Competencies with no Band 1 concept yet (expected; Bands 2 and 3 in 02-19)

player-development-planning, seasonal-planning, video-analysis-tooling, loan-player-monitoring, model-deployment, uncertainty-quantification, football-data-programming, data-led-target-ranking, scouting-network-management, character-and-fit-assessment, transfer-negotiation, contract-structuring, agent-and-club-relationships, commercial-strategy, staff-appointment, department-leadership, high-performance-culture, stakeholder-presentation, cross-discipline-translation, player-communication, player-welfare-and-safeguarding (21 of 49).

## Task Commits

1. **Task 1 (tracer): derive library, CLI, five Track 1 concepts, integrity gate** - `8db670c` (feat)
2. **Task 2: derive unit tests** - `5e23e17` (test); **all Track 0 and Track 1 concepts** - `59fce56` (feat)
3. **Task 3: band 1 gate (RED)** - `4537e13` (test); **Tracks 2-4 and curriculum-config (GREEN)** - `9d490cd` (feat)

## Verification

- `node scripts/research/derive-links.ts --check`: exit 0.
- `npx vitest run scripts/research`: 10 files, 185 passed, 6 skipped. `RESEARCH_GATE=1` synthesis run: 34 passed, 3 skipped (the skipped cases are the "exists under gate" checks, which skip because the files exist).
- `npx tsc --noEmit`: exit 0. `npx biome ci scripts research`: no errors.
- Tracer gate after Task 1: the `<verify>` command was re-run end to end and passed before expansion.

## TDD Gate Compliance

- Task 2: `derive.test.ts` was written after Task 1's tracer had already shipped `deriveLinks`, so the 10 cases passed on first run. No RED commit was possible for code the tracer task required. The cases cover every behaviour line in the plan.
- Task 3: RED commit `4537e13` (4 failing cases: count, curriculum-config, starter layer, ADR 0008), GREEN commit `9d490cd`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] derive-links writes only on a parsed-value change**
- **Found during:** Task 1
- **Issue:** lint-staged runs `biome check --write` on staged JSON, which reflows arrays. Without a change check, an unconditional `JSON.stringify` write after every derive would churn the formatting.
- **Fix:** `derive-links.ts` compares parsed values (`isDeepStrictEqual`) and writes only stale files. `--check` uses the same comparison.
- **Files modified:** scripts/research/derive-links.ts
- **Commit:** 8db670c

**2. [Rule 2 - Correctness] Added `--root` to derive-links**
- **Found during:** Task 1
- **Issue:** the CLI could not be pointed at a fixture folder.
- **Fix:** an optional `--root <dir>` flag; the default stays `<repo>/research`.
- **Commit:** 8db670c

Otherwise the plan ran as written. Task 1 shipped five tracer concepts; Task 2 then added `pitch-dimensions` as the root before `pitch-markings`. No ids were renamed.

## Known Stubs

None. Track 0 role-family concepts are complete Band 1 nodes; their lessons come in later phases.

## Self-Check: PASSED

- FOUND: scripts/research/lib/derive.ts, scripts/research/lib/derive.test.ts, scripts/research/derive-links.ts, research/concept-map.json, research/curriculum-config.json
- FOUND commits: 8db670c, 5e23e17, 59fce56, 4537e13, 9d490cd
