---
phase: 02-research-wave-1
plan: 14
subsystem: research
tags: [interactive-explainers, inspiration-audit, okabe-ito, accessibility]
requires: [02-01]
provides:
  - research/interactive-explainers/findings.md
  - research/interactive-explainers/sources.json
  - research/interactive-explainers/visual_ideas.md
affects: [phase-04-design, 02-15-registry-merge]
key-files:
  created:
    - research/interactive-explainers/findings.md
    - research/interactive-explainers/sources.json
    - research/interactive-explainers/visual_ideas.md
requirements-completed: [RSCH-01]
completed: 2026-11-27
---

# Phase 02 Plan 14: Interactive explainers audit Summary

Audit of 17 free explainers and related pages. Gate prints `research/interactive-explainers: ok (21 sources, 1479 findings words)`; domains test 19 passed, 1 skipped. Not committed (orchestrator override: no git).

## Counts
- Sources: 21 (cap 25). Findings 1479 words (cap 1500). Visual ideas 361 words, 9 mechanics.
- Stop reason: planned audit list exhausted before the cap; the last several sources (Setosa index, explorables hub, ASA) added little new.
- WebSearch calls: 5. WebFetch calls: 25. Raw curl fetches: about 10 (jfly page, R palette doc, rdrr, matplotlib, WCAG).
- Failed or empty: WebSearch for Karun Singh and The Pudding returned nothing relevant (fetched karun.in directly). R grDevices palette page and matplotlib page do not list hex values.

## Okabe-Ito deviation
The CUD page (jfly) shows the palette only as an image, with no hex values. `src-okabe-ito-cud` holds two hashed excerpts about the palette design. The hex values come from a second source, `src-see-okabeito-colors` (R package source that credits the CUD page), with hashed excerpts hex-seven and hex-black. Findings cite both.

## Unknown licence values
Most sources: automated_access unknown. Ncase polygons: redistribute and derivative unknown. src-see-okabeito-colors: redistribute and derivative unknown. Ncase home and remember: CC0 stated by author. All others: redistribute no, derivative no.

## Weak spots
- WebFetch uses a small model, so pages were read as text only; interaction details come from that summary, not from using the pages.
- Ciechanowski fetch cut at 100000 chars; Soccermatics page text appeared cut off; WCAG dragging and target-size criteria not read.
- Pudding, Friends of Tracking and FiveThirtyEight originals were not audited directly (award showcase pages used for two entries).
- Excerpt paraphrase for WCAG covers only 1.4.1 and 1.4.3.

## Deviations
None to the plan beyond skipping the commit and the Task 1 git-log criterion (orchestrator rule).
