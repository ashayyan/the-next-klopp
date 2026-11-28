---
phase: 02-research-wave-1
plan: 12
subsystem: research
tags: [role-definitions, research, RSCH-01]
requires: [02-01]
provides: [research/role-definitions findings, sources, visual ideas]
key-files:
  created:
    - research/role-definitions/findings.md
    - research/role-definitions/sources.json
    - research/role-definitions/visual_ideas.md
requirements-completed: [RSCH-01]
---

# Phase 2 Plan 12: role-definitions Summary

All 15 canonical roles evidenced; gate prints `research/role-definitions: ok (25 sources, 1367 findings words)`. Not committed (orchestrator owns git).

## Counts
- Sources: 25 (cap reached). Findings 1,367 words; visual ideas 354 words, 7 ideas.
- Stop reason: source cap reached.
- Sources per role: sporting-director 5 (PL explainer, Parnell paper, two Jobs in Football pieces, Slemen); head-coach 3 (UEFA, ESPN, PL); head-of-performance-analysis 3; head-of-data-science 2; head-of-recruitment 3; academy-director 1; club-ceo 2; head-of-performance 2; supporting roles 1-2 each.
- Tool calls: about 25 WebSearch, about 40 WebFetch.

## Failed or blocked URLs
jobsinfootball job pages (404), uksport.gov.uk listing pages (return search results), irecruit.efl.com (expired), hiring.brentfordfc.com (DNS), trainingground.guru job pages (404), Burnley careers (500), repository.mmu.ac.uk (403), documents.uefa.com Article 47 (404), ESPN shift article (503). Plain-http archive.trainingground.guru was blocked by the permission classifier; the https archive host worked.

## Licence and verification flags
- All sources: automated_access `unknown` (site terms not checked), redistribute `no`, derivative `conditional`.
- `src-parnell-sporting-director-emergence` is status `unverified`: only the abstract was read through a search summary.
- No excerpts stored (no regulation sources, no measured numbers cited).

## Thin evidence (for 02-21 review)
- academy-director: one women's academy manager ad only; no men's Premier League ad or reporting line.
- chief-scout: no chief scout ad read; cited indirectly.
- head-of-data-science: one Lead Data Scientist ad, no "head" ad or line management.
- head-of-performance: consultant opinion plus an academy medical ad; no first-team head of performance ad.
- Reporting lines and KPIs are mostly "not stated" in ads; findings mark them inferred. A practitioner interview source is needed.
- Many ads are women's team or academy roles and expired; recency uses expiry dates.

## Contested points
Sporting director vs head coach boundary; sporting director under CEO vs on board; data leading vs supporting recruitment.

## Test note
`vitest domains.test.ts`: 20 passed, 1 failed (how-analysts-watch files-exist, another agent's concurrent domain); role-definitions passes.
