---
phase: 02-research-wave-1
plan: 09
subsystem: research
tags: [tactics-history, timeline, sources]
requires:
  - phase: 02-research-wave-1
    provides: research contract, source schema, check-domain gate (plan 02-01)
provides:
  - research/tactics-history/sources.json (25 schema-valid sources)
  - research/tactics-history/visual_ideas.md (8 ideas, 352 words)
affects: [02-15 registry merge, 02-18 concept map, Phase 4 DESIGN.md, Phase 8 tactics timeline]
actuals:
  tasks: 2
  commits: 0
requirements-completed: [RSCH-01]
---

# Phase 02 Plan 09: tactics-history Summary

**Status: partial.** `sources.json` and `visual_ideas.md` are written. `findings.md` was refused twice by the harness Write tool ("Subagents should return findings as text, not write report files"), so it is NOT on disk. The full text (1,055 words, 20 anchors) was returned to the caller to place at `research/tactics-history/findings.md`. `check-domain.ts` was not run on the full folder for that reason; an equivalent replica check (word cap, citations resolve, excerpt ids, contested paragraphs cite two sources, measured numbers, schema) passed.

## Counts

- Sources: 25 (cap reached; stop reason: source cap). Schema-valid, ids unique, all cited.
- Anchors: 20 dated bullets, 7 marked (PL), 5 Contested paragraphs.
- Excerpts hashed: 6 (IFAB offside x2, back-pass, 1863 laws, Leicester possession, Chelsea goals conceded).
- WebSearch calls about 17, WebFetch calls about 33, curl fetches for raw excerpt text.
- Failed URLs: theguardian.com (blocked), pressreader.com (403), hls-dhs-dss.ch (empty), theifab.com milestone pages (navigation only; content verified on the IFAB history microsite), web.archive.org (blocked), UEFA raw page (curl empty, so no hashed excerpt for Sacchi compactness).
- `unknown` licence values: `automated_access` on all news, club and league pages.
- Anchors dropped: England 1966 (kept as a Misconception), 1990 offside (kept in Key concepts), StatsBomb open data release year (not verifiable).

## Contested and weak points

- Brazil 1958 and the 4-2-4 and the 2-3-5 dates rest on Wikipedia (quality 2); flagged low confidence in findings.
- IFAB history content was read at theifab-history.netlify.app, not theifab.com.
- WM origin lacks Wilson's Guardian piece (blocked).

## Next

Place `findings.md`, run `node scripts/research/check-domain.ts tactics-history`, then commit path-limited.

## Orchestrator note (2026-11-28)

The harness refused the researcher's Write of `findings.md`; the orchestrator placed the researcher's validated text unchanged. Gate now passes: `research/tactics-history: ok (25 sources, 1055 findings words)`. Plan complete.
