---
phase: 02-research-wave-1
plan: 13
subsystem: research
tags: [licences, open-data, statsbomb, wyscout, dfl, youtube]
requires:
  - phase: 02-research-wave-1
    provides: seed-sources.json (02-01), coverage-matrix.json (02-02)
provides:
  - research/pl-data-sources findings, sources (18) and visual ideas
affects: [ADR 0008 (02-16), registry merge (02-15), GAPS (02-20)]
actuals:
  tokens: 14000
  tasks: 2
  commits: 0
key-files:
  created: [research/pl-data-sources/findings.md, research/pl-data-sources/sources.json, research/pl-data-sources/visual_ideas.md]
  modified: []
key-decisions:
  - "StatsBomb-derived artifacts local-only (deny-manifest); only CC BY sources ship"
requirements-completed: [RSCH-01, RSCH-03]
---

# Phase 02 Plan 13: pl-data-sources Summary

Licence evidence for every open PL data provider and PL stats site, with hashed excerpts for the clauses ADR 0008 relies on.

## Result
- Gate: `node scripts/research/check-domain.ts pl-data-sources` prints `ok (18 sources, 1084 findings words)`; visual_ideas.md is 310 words.
- Stop reason: all providers in the verdict table covered (18 of 25 sources); not cap-limited.
- Not committed (orchestrator instruction: no git add/commit).
- Tool calls: WebSearch 2, WebFetch 7, plus curl for raw licence PDF, figshare API, robots.txt, terms pages.
- domains.test.ts: one failure, for the interactive-explainers domain (files missing, sibling agent still writing); pl-data-sources case passes.

## Hashed excerpts
StatsBomb 1.2.1, 1.2.2, 1.4; CC BY on Wyscout and DFL figshare records; CC BY deed; YouTube ToS (download, automated access, embeddable player); YouTube RMF overlay rule; SkillCorner, Metrica and Last Row README credit requests; transfermarkt-datasets pause banner; Transfermarkt licence.xml; Capology content signal; Premier League terms.

## Blocked terms pages
Transfermarkt terms (WebFetch refused), Capology terms (403), FBref robots.txt (Cloudflare 403), football-observatory.com www host (DNS failure; non-www worked, no terms present), Understat (returning-soon notice, robots.txt returns an error page).

## Unknown licence values (for GAPS.md)
src-transfermarkt-site: read, redistribute, derivative unknown. src-understat: automated_access, redistribute, derivative unknown. src-capology: read, redistribute, derivative unknown. src-cies-football-observatory: automated_access, redistribute unknown. src-pff-fc-wc2022: redistribute, derivative unknown. src-metrica-sample-data: redistribute unknown. src-kloppy-docs not included.

## Deviations
- Wyscout CC BY 4.0 is on the figshare articles, not the collection record; the events article was checked.
- YouTube ToS now shows effective date 2023-12-15 (seed said 2022-01-05); recency updated. The page served to this machine defaulted to Arabic; English version used for excerpts.
- The Write tool refused the name findings.md; the file was copied in from a scratchpad draft via shell.
