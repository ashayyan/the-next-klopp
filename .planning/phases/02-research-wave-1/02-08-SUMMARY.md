---
phase: 02-research-wave-1
plan: 08
subsystem: research
tags: [formations, research, sources]
requires:
  - phase: 02-research-wave-1
    provides: plan 02-01 research contract and check-domain gate
provides:
  - research/formations/sources.json (20 schema-checked sources, 3 excerpts with hashes)
  - research/formations/visual_ideas.md (7 ideas, 489 words)
affects: [02-15 registry merge, 02-18 concept map, Tactics Board v1]
actuals:
  tasks: 2
  commits: 0
requirements-completed: [RSCH-01]
---

# Plan 02-08 Summary: formations research

## Status

PARTIAL. `sources.json` and `visual_ideas.md` are written. `findings.md` was NOT written: the Write tool refused every attempt ("Subagents should return findings as text, not write report files"), and I did not route around that with Bash. The full findings text (about 1,150 words, five required headings, three Contested paragraphs) is in the agent's return message for the orchestrator to place at `research/formations/findings.md`. `check-domain.ts formations` currently exits 1 with only `files-exist: research/formations/findings.md is missing`.

## Counts

- Sources: 20 (cap 25). Excerpts: 3 (StatsBomb Events spec x2, Frontiers survey x1) plus 1 licence excerpt on the Nature Wyscout paper.
- Stop reason: coverage complete across notation, common shapes, PL in/out-of-possession examples, data encoding and the debate; the last sources added nothing new.
- WebSearch calls: 9. WebFetch calls: 24. Failed or partial URLs: bundesliga.com (HTTP 410), sportskeeda Conte page (HTTP 405), nature.com (cookie redirect, solved with curl), theanalyst.com (HTTP 403 to a scripted client, fetch tool worked), kloppy formation-change table (blank provider cells, inconclusive).
- DOIs checked with validate_citations.py --check-dois: 10.1109/tkde.2016.2581158, 10.3389/fspor.2024.1512386, 10.1038/s41597-019-0247-7 (3 valid, 0 errors).
- `unknown` licence values: automated_access on 13 news and blog pages; redistribute and derivative on mplsoccer docs and the IEEE paper.

## Contested

- Formations as "telephone numbers" versus a useful reference.
- Whether neighbouring labels (4-2-3-1, 4-3-3, 4-4-1-1) differ in practice.
- Who owns the label: providers agreed on World Cup 2022 starting formations only about 65% of the time.

## Gaps for later

- 5-3-2 rests on one weak blog (quality 2); replace before a lesson ships.
- kloppy StatsBomb support for formation-change events is unconfirmed.
- Arsenal build-up label (2-3-5 versus 3-2-5) rests on Sky only in the files.
- No commits made (orchestrator override).

## Orchestrator note (2026-11-28)

The orchestrator placed the researcher's findings text unchanged; gate passes (20 sources, 1225 findings words). Plan complete.
