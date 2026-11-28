---
phase: 02-research-wave-1
plan: 05
subsystem: research
tags: [laws-of-the-game, ifab, var, offside, premier-league]
requires:
  - phase: 02-research-wave-1
    provides: research contract, seed-sources.json, check-domain.ts (plan 02-01)
provides:
  - research/laws-of-the-game/sources.json (17 sources, 93 excerpts)
  - research/laws-of-the-game/visual_ideas.md (8 ideas)
  - findings.md draft validated in a scratch root (not written to the repo, see Issues)
affects: [02-15 registry merge, 02-18 concept map, Phase 4 DESIGN.md, Phase 8 laws lessons]
actuals:
  tokens: 40000
  tasks: 2
  commits: 0
requirements-completed: [RSCH-01]
duration: 70min
completed: 2026-11-27
status: partial
---

# Phase 2 Plan 05: Laws of the Game research Summary

**Laws research is cited and gate-clean in a scratch root: edition 2026/27 (effective 1 July 2026), offside, VAR protocol and PL variants, but findings.md could not be written to the repo because the harness blocks that file name for subagents.**

## Issues Encountered

- The Write tool refused `research/laws-of-the-game/findings.md` ("Subagents should return findings as text"). No workaround was used. The validated draft (1476 words) is at the scratchpad path given in the agent report; copy it to `research/laws-of-the-game/findings.md`, then run `node scripts/research/check-domain.ts laws-of-the-game`.
- In a scratch root with the same three files, the shared rule set returned ok (17 sources, 93 excerpts).
- No git add or commit was run (parallel-run rule).

## Research Record

- Stop reason: coverage reached before the 25-source cap; the last three new sources (FIFA daylight page, FA hub, PL VAR FAQs) added no new rule claims.
- Sources: 17 (5 seed ids reused, 12 new). Excerpts: 93, all hashed from raw text with the canonical hasher.
- Web calls: 7 WebSearch, 13 WebFetch, plus curl and pypdf reads of the Laws PDF, the offside, VAR protocol and law-changes pages, circulars 33 and 34.
- Failed or unusable fetches: WebFetch of circular 34 and the Rogerson PDF returned binary (read with pypdf instead); PubMed page returned only a cookie notice; PL handbook URLs were not retried (known 404).
- `unknown` licence values: PL pages and FIFA, FA, Inside World Football pages (automated_access), Rogerson repository copy (redistribute).
- Contested points: VAR accuracy versus goals and flow; on-field review overturn rate; daylight offside trial; corner review scope; mistaken identity for simulation.

## Orchestrator note (2026-11-28)

The harness refused the researcher's Write of `findings.md`; the orchestrator copied the researcher's validated draft in unchanged. Gate passes: `research/laws-of-the-game: ok (17 sources, 1476 findings words)`. Plan complete.
