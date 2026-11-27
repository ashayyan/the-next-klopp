---
phase: 02-research-wave-1
plan: 07
subsystem: research
tags: [research, positions, numbering]
requirements-completed: []
completed: 2026-11-28
---

# Phase 2 Plan 07: positions-and-numbering domain Summary

Researched positions, position-vs-role and shirt-numbering history and rules (Premier League Handbook 2026/27 Section M) for `research/positions-and-numbering/`.

## Outcome

- `sources.json`: 15 schema-valid sources, 28 hashed excerpts.
- `findings.md`: 1,269 words, 4 `Contested:` paragraphs (5/6 meaning, South American usage, where the 10 plays, wingers as forwards or midfielders).
- `visual_ideas.md`: 7 ideas tagged Show / Touch / Practise.
- Gate: `node scripts/research/check-domain.ts positions-and-numbering` → ok (15 sources, 1269 findings words).
- Stop reason: all brief topics covered; last sources added nothing new; cap not reached.
- Calls: ~11 WebSearch, ~17 WebFetch, plus curl downloads for excerpt hashing.

## Key sources

- Premier League Handbook 2026/27 (published 21 Oct 2026), Section M rules M.1–M.5, M.7, M.8, M.10 (kit only; no reserved goalkeeper number).
- IFAB Laws of the Game 2026/27; StatsBomb open events spec v4.0.0 (2019); kloppy positions docs; Pappalardo Wyscout dataset paper.

## Deviations

- The harness refused the researcher's Write of `findings.md` and this SUMMARY ("Subagents should return findings as text"); the orchestrator copied the researcher's validated draft into place and wrote this SUMMARY. Content is unchanged.

## Known weak spots

- Country numbering schemes (Argentina, Brazil) rest mainly on Wikipedia (quality 3, "more citations needed").
- StatsBomb position table from the 2019 v4.0.0 spec; Wyscout role codes not verified.
- Many `automated_access` licence values are `unknown`.
- Failed fetches: premierleague.com/en/handbook (404), Wikipedia Number_10 page (404), tomkinstimes.com (503), a scisports.com article, a community.thefa.com article.

## Open questions (in findings)

Role catalogue (Track 9), Board consent under M.3, when names became compulsory, women's/non-PL numbering.
