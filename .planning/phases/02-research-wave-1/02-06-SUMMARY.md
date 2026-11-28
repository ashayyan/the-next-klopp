---
phase: 02-research-wave-1
plan: 06
subsystem: research
tags: [research, pitch-geometry, coordinates]
requirements-completed: []
completed: 2026-11-28
---

# Phase 2 Plan 06: pitch-geometry domain Summary

Researched Law 1 pitch geometry (IFAB 2026/27), the 105 x 68 m convention, registered Premier League pitch sizes, and provider coordinate frames for `research/pitch-geometry/`.

## Outcome

- `sources.json`: 14 sources, 70 hashed excerpts (seed `src-ifab-laws-2026-27` reused; seed hashes re-derived identically).
- `findings.md`: 1,460 words, 4 `Contested:` paragraphs. `visual_ideas.md`: 447 words, 6 ideas.
- Gate: `node scripts/research/check-domain.ts pitch-geometry` → ok (14 sources, 1460 findings words).
- Stop reason: all planned questions answered; last sources only confirmed earlier findings; cap not reached.
- Calls: 9 WebSearch, ~10 WebFetch, curl + pypdf reads of 8 PDFs.

## Key findings

- Law 1 values with page numbers (IFAB 2026/27 pp.45–50): touchline 90–120 m, goal line 45–90 m (international 100–110 / 64–75), centre circle 9.15 m, goal area 5.5 m, penalty area 16.5 m, mark 11 m, goal 7.32 x 2.44 m.
- 105 x 68 m is a convention: PL Handbook 2026/27 Rule K.17 (K.18 in 2025/26), FIFA recommendation, UEFA categories 3–4.
- 14 of 20 PL clubs register 105 x 68 m; six differ (Chelsea 103 x 67.5, Crystal Palace 101.5 x 68, Fulham 100 x 65, Hull 104.8 x 67.2, Ipswich 105 x 66, Liverpool 101 x 68). Club-to-page matching inferred from directory order and capacity.
- Coordinate frames: StatsBomb 120 x 80 top-left y-down; Opta 0–100 bottom-left y-up; Wyscout percent; Tracab centre/cm; Sportec centre/m; kloppy default 0–1 assuming 105 x 68.

## Deviations

- The harness refused the researcher's Write of `findings.md`, `visual_ideas.md` and this SUMMARY; the orchestrator copied the researcher's validated drafts in unchanged and wrote this SUMMARY.

## Weak spots / open questions

- No surveyed stadium dimensions (registered figures only); FourFourTwo disagrees for Chelsea, Palace and Forest.
- Opta frame rests on kloppy's description (Opta page 403). Wyscout origin/y-direction inferred.
- kloppy docstrings read from master, not the pinned 3.19.1 tag — recheck before freezing the Pitch Standard (Phase 3).
- Handbook date uncertain (21 Oct 2026 used).
