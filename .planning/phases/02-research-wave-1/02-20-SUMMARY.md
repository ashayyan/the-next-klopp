---
phase: 02-research-wave-1
plan: 20
subsystem: research
status: complete
tags: [gaps, rsch-04, rsch-05, rsch-06, views, summary-page, phase-gate]
requires:
  - phase: 02-research-wave-1
    provides: concept-map.json and curriculum-config.json (02-19), ADR 0008 (02-16), SOURCE_REGISTRY.json (02-15), view and summary generators (02-04)
provides:
  - research/gaps.json and generated research/GAPS.md (RSCH-05)
  - scripts/research/gaps.test.ts (gaps integrity and coverage gate)
  - generated CONCEPT_MAP.md, CURRICULUM_DRAFT.md, ROLE_COMPETENCIES.md (RSCH-04)
  - research/summary/index.html built from the real research (RSCH-06)
affects: [02-21, every just-in-time research trigger in later phases, phase-04-design, phase-07-role-map]
tech-stack:
  added: []
  patterns:
    - "Gap rows are derived-checked: gaps.test.ts computes the expected rows from BRIEF_DOMAINS, the registry, concept-map.json, competencies.json and ADR 0008 citations"
key-files:
  created:
    - research/gaps.json
    - research/GAPS.md
    - research/CONCEPT_MAP.md
    - research/CURRICULUM_DRAFT.md
    - research/ROLE_COMPETENCIES.md
    - research/summary/index.html
    - scripts/research/gaps.test.ts
  modified: []
key-decisions:
  - "Domain 14 is two rows (a-c before t21-scouting-1, d-f before t22-scouting-2); domain 20 is two rows (PL ecosystem, Saudi Pro League pack)"
  - "The SPL pack row uses two checked URLs (spl.com.sa, saff.com.sa) because the registry has no SPL source yet"
  - "unknown_licence_sources lists all 82 unknown-licence sources cited by Tracks 0-4 or ADR 0008, plus 5 flagged by 02-13/02-15 for later tracks (Transfermarkt, Understat, Capology, CIES, Pappalardo article)"
  - "JSON in research/ is Biome-formatted (short arrays inline), because `biome ci research` is part of the gate"
requirements-completed: [RSCH-04, RSCH-05, RSCH-06]
duration: ~25 min
completed: 2026-11-28
actuals:
  tokens: 112600
  tasks: 3
  commits: 4
plan_head_before: 2cb7d3565db75d3291bfa004f82c00c5e80d471d
plan_head_after: ac4dfeef9b84508e76f88d6ed242693a0190ed75
---

# Phase 2 Plan 20: Gaps, generated views and the real summary page Summary

The gap list is in `research/gaps.json`: 29 deferred-domain rows, 87 unknown-licence sources, 8 Premier League coverage gaps and 0 orphan competencies. It renders to GAPS.md. All four Markdown views and the 263 KB summary page are generated from the real research, and the full `RESEARCH_GATE=1` gate is green.

## Results

- **Deferred domains (29 rows):** brief 6.2 domains 2-10, 11 (the part beyond the open PL sources), 12, 12b, 13, 14 a-c (t21), 14 d-f (t22), 14c, 15-19, 20 (PL ecosystem), 20 (SPL pack), and 20b-20g. Each row gives why the domain is deferred ("Not needed for Milestones 0 and 1; ..."), the track or tracks it must precede, the trigger "start of <track>" and 4 starting sources. The sources are registry ids (just-in-time seeds or Wave 1 sources) or checked URLs.
- **Unknown-licence sources (87):** every source with an `unknown` licence field that a t00-t04 concept or ADR 0008 cites. That is 82 sources. 5 more come from the 02-13/02-15 handoffs. 72 of the 87 rows have only automated access unknown and carry the standard read-by-hand note. Notes carry the registry follow-ups from 02-15:
  - The Pappalardo article is CC BY but the merge made it over-cautious.
  - The PL Handbook type is undecided (official-document or regulation).
  - The Bradbury value is the conservative one.
- **PL coverage gaps (8):** no-pl-360, pl-tracking-last-row-only, no-pl-physical, statsbomb-redistribution, data-credit-logo, fbref-advanced-removed, transfermarkt-datasets-paused, understat-capology-terms-unknown. Each has its impact, mitigation and evidence ids from the registry.
- **Orphan competencies:** none (all 49 have concepts, as 02-19 reported).
- **Unverified-only concepts:** all 10 from 02-19 sit on deferred tracks (t02, t07, t10, t21, t25, t26). The test enforces this. `saudi-pro-league-context` is carried by the SPL row.
- **Summary page:** 263,428 bytes. It has 5 screens and 164 concept nodes, its CSP is `default-src 'none'` with a script hash, and it has no external references. The page script ran under its CSP in headless Edge (`msedge.exe`) with no browser errors. The 1440 px review screenshot is at `C:\Users\MRRIGH~1\AppData\Local\Temp\klopp-summary-1440.png`, outside the repo. The focus-view graph is readable, so the generator needed no fix.
- **Views:** CONCEPT_MAP.md, CURRICULUM_DRAFT.md, ROLE_COMPETENCIES.md and GAPS.md are generated. The renderer reports 164 concepts, 5 roots, 13 layers and at most 4 prerequisites. `npm run research:views -- --check` and `npm run research:summary -- --check` exit 0.

## Gate results

| Command | Result |
|---|---|
| `npm run research:gate` (RESEARCH_GATE=1) | 11 files, 210 passed, 4 skipped (the 4 "exists under gate" guards, which skip because the files exist); exit 0 |
| `npm test` | 17 files, 378 passed, 5 skipped; exit 0 |
| `npm run guard` | 249 tracked files ok |
| `npx tsc --noEmit` | exit 0 |
| `npx biome ci scripts research pipeline package.json biome.json` | 77 files, no findings |
| `npm run pipeline:test` | 24 passed |
| `node scripts/research/check-summary-browser.ts research/summary/index.html` | ok |

## Task Commits

1. **Task 1 (tracer): gaps.json tracer, integrity test, views:** `b59ca0a`
2. **Task 2 RED: failing coverage checks:** `407e694`
3. **Task 2 GREEN: complete gap list:** `f9e26c5`
4. **Task 3: real summary page:** `ac4dfee`

## TDD Gate Compliance

- RED: `407e694` added `describe("gaps: coverage")`, and 5 of its 7 checks failed:
  - missing domain rows
  - the domain 14 split
  - 82 unlisted unknown-licence sources
  - missing PL gap ids
  - 6 unverified-only concepts on non-deferred tracks
- GREEN: `f9e26c5`, 13 passed.
- No refactor was needed.

## Tracer gate

Task 1's `<verify>` (`npm run research:views && npx vitest run scripts/research/gaps.test.ts`) was re-run end to end before expansion and passed (6 passed, 1 skipped).

## Deviations from Plan

None. The plan was executed as written. A note on JSON formatting: the plan says to write JSON as `JSON.stringify(x, null, 2) + "\n"`. gaps.json was then passed through `biome format`, because `npx biome ci ... research` is a gate command and it collapses short arrays. This matches the existing `curriculum-config.json`.

## Observations for 02-21 (not fixed, out of scope)

- In the summary page's "Watch Gym clip decision" list, ADR 0008 citations show as raw text (for example `[src-metrica-sample-data#readme-legal-stuff]`). This is how the existing generator renders the ADR text. It is cosmetic only.
- Each deferred-domain "Why deferred" cell starts with the same phrase, "Not needed for Milestones 0 and 1". The plan asked for this, but the repetition makes the table harder to scan.

## Known Stubs

None. The gaps file lists research that is deliberately deferred. Nothing in it is a code stub.

## Threat Flags

None. No new network, auth or file-access surface. The summary page is produced only by build-summary.ts, and summary.test.ts checks it on real data under the gate (T-02-44). gaps.test.ts mitigates T-02-45 and T-02-46.

## Self-Check: PASSED

- FOUND: research/gaps.json, research/GAPS.md, research/CONCEPT_MAP.md, research/CURRICULUM_DRAFT.md, research/ROLE_COMPETENCIES.md, research/summary/index.html, scripts/research/gaps.test.ts
- FOUND commits: b59ca0a, 407e694, f9e26c5, ac4dfee
