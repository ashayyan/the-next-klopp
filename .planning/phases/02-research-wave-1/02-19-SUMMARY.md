---
phase: 02-research-wave-1
plan: 19
subsystem: research
tags: [concept-map, band-2, band-3, thread-starters, role-reach, rsch-04]
status: complete
requires: [02-18]
provides:
  - research/concept-map.json (all 29 tracks, 164 concepts, 255 edges)
  - research/curriculum-config.json (all four thread starters)
  - research/competencies.json (derived concepts; no orphan competency)
  - scripts/research/synthesis.test.ts (concepts: threads and concepts: full map gates)
affects: [02-20, 02-21, phase-05, phase-07-placement, phase-07-role-map, phase-08-lessons]
tech-stack:
  added: []
  patterns:
    - "Band 2 and 3 concepts are chapter-level umbrellas; just-in-time research later adds children that list them as prerequisites, with no renames"
    - "The capstone joins every Part through two seat concepts, so no concept needs more than 4 prerequisites"
key-files:
  created:
    - .planning/phases/02-research-wave-1/02-19-SUMMARY.md
  modified:
    - research/concept-map.json
    - research/curriculum-config.json
    - research/competencies.json
    - scripts/research/synthesis.test.ts
decisions:
  - "Thread starters: match-note-basics (t14, layer 2, after the-lesson-loop) and the-scouts-eye (t21, layer 4, after watch-one-player and position-vs-role); all four starters sit at layer 4 or lower"
  - "164 concepts in total (Band 1 68, Band 2 48 incl. t14 and t21, Band 3 48); longest prerequisite chain 13 layers, under the 14-layer warning"
  - "The capstone is two seat concepts (football department seats, club leadership seats) so it can follow one concept of every Part within the 4-prerequisite limit"
  - "Data-track concepts name their dataset and league: xG on open StatsBomb PL 2015/16 events; pitch control and the tracking lab on labelled non-PL open tracking (DFL Bundesliga)"
requirements-completed: []
requirements-partial: [RSCH-04]
duration: 6 min
completed: 2026-11-28
actuals:
  tokens: 25500
  tasks: 3
  commits: 4
plan_head_before: b9f29cff812a7374b3e2c6e1226fcd2d090cbfb2
plan_head_after: 6d811e45ae9569b1a4e4740a870fbbe29a37af1b
---

# Phase 02 Plan 19: Full concept map (Bands 2 and 3) Summary

`research/concept-map.json` now covers all 29 tracks of brief section 7 with 164 concepts. It is acyclic, schema-valid, fully resolving and derive-consistent. All four thread starters are in `curriculum-config.json` at layer 4 or lower. Every role reaches at least 9 concepts, and no competency is an orphan. Band 1 is unchanged: only new concepts and new links into Band 1 were added.

## Results

### Concepts per Part

| Part | Tracks | Concepts |
|---|---|---|
| A | t00-t04 | 68 (Band 1, from 02-18) |
| B | t05-t12 | 32 (t05 4, t06 4, t07 3, t08 3, t09 4, t10 4, t11 6, t12 4) |
| C | t13-t14 | 11 (t13 6, t14 5) |
| D | t15-t20 | 23 (t15 4, t16 4, t17 3, t18 3, t19 4, t20 5) |
| E | t21-t23 | 13 (t21 5, t22 4, t23 4) |
| F | t24-t27 | 15 (t24 3, t25 6, t26 3, t27 3) |
| G | t28 | 2 |
| **Total** | 29 tracks | **164** (bound 80-170) |

- Edges: 255 (239 generated prerequisite edges plus 16 hand-authored related/contrasts edges).
- Longest prerequisite chain: **13 layers**, ending at `simulator-club-seats`. This is under the 14-layer warning and the 20-layer failure.
- Thread starters:

| Thread | Starter | Layer |
|---|---|---|
| Role Map (t00) | `role-map` | 1 |
| Watch Gym (t04) | `one-question-clips` | 2 |
| Write and Speak (t14) | `match-note-basics` | 2 |
| Scouting I (t21) | `the-scouts-eye` | 4 |

- Lowest role reach: loan-manager 9, data-engineer 15, chief-scout 17 (minimum 3).

### Orphan competencies (for 02-20 gaps.json)

None. All 49 competencies have at least one concept. The 21 Band 1 orphans listed in 02-18 are now covered.

### Concepts citing only unverified sources (for 02-20 GAPS.md)

| Concept | Track | Unverified seeds cited |
|---|---|---|
| eighteen-zone-grid | t02 | src-coaches-voice, src-spielverlagerung |
| five-vertical-lanes | t02 | src-spielverlagerung, src-coaches-voice |
| half-spaces | t02 | src-spielverlagerung, src-coaches-voice |
| four-superiorities | t02 | src-spielverlagerung, src-coaches-voice |
| rest-defence | t07 | src-spielverlagerung, src-coaches-voice |
| tactical-periodization | t10 | src-fifa-training-centre, src-coaches-voice |
| session-design-and-methods | t10 | src-fa-coaching-courses, src-fifa-training-centre |
| relative-age-effect | t21 | src-fifa-training-centre, src-uefa-technical-reports |
| multi-club-ownership | t25 | src-uefa-documents-portal, src-commons-library |
| reading-club-accounts | t26 | src-companies-house-search, src-deloitte-football-money-league |

Many other Band 2 and 3 concepts mix verified Wave 1 sources with unverified seeds (for example src-coaches-voice, src-book-the-numbers-game, src-fifa-rules-and-reports, src-socceraction-docs). They stay `draft` until their just-in-time research.

**Extra gap for 02-20:** `saudi-pro-league-context` (t27) cites only general sources (`src-cies-football-observatory`, `src-fifa-rules-and-reports`). The registry has no Saudi Pro League-specific source yet. Its research must add one before that chapter is written.

## Task Commits

1. **Task 1 (tracer): threads gate, t14 and t21 chapters, all four starters** - `60ad17d` (feat)
2. **Task 2: Band 2, Tracks 5-13** - `6154ebf` (feat)
3. **Task 3: full-map gate (RED)** - `533b898` (test); **Band 3, Tracks 15-28 (GREEN)** - `6d811e4` (feat)

## Verification

- `node scripts/research/derive-links.ts --check`: exit 0.
- `npx vitest run scripts/research` (`npm run research:check`): 10 files, 194 passed, 6 skipped. `RESEARCH_GATE=1` synthesis run: 43 passed, 3 skipped (the "exists under gate" checks skip because the files exist).
- `npx tsc --noEmit`: exit 0. `npx biome ci scripts research`: no errors.
- All acceptance one-liners exit 0: four thread starters, t05-t13 at 3-6, total 80-170 across 29 tracks.
- Band 1 check: every authored field of the 68 Band 1 concepts is unchanged from `b9f29cf`.
- Tracer gate after Task 1: the `<verify>` command was re-run end to end and passed before Band 2.

## TDD Gate Compliance

- Task 1 (tracer): the threads test was run RED first (2 failing cases, for t14 and t21) and committed together with the content that turned it green. Tracer tasks commit as one slice.
- Task 3: RED commit `533b898` (3 failing cases: coverage and total, band bounds, role reach), GREEN commit `6d811e4`.

## Deviations from Plan

None. The plan ran as written. Task 1 included the threads test in the tracer commit instead of a separate RED commit, as noted above.

## Known Stubs

None. Chapter-level umbrellas are intended at Bands 2 and 3 (02-RESEARCH.md Pattern 5). Just-in-time research splits them later by adding children.

## Self-Check: PASSED

- FOUND: research/concept-map.json (164 concepts, 29 tracks), research/curriculum-config.json (4 starters)
- FOUND commits: 60ad17d, 6154ebf, 533b898, 6d811e4
