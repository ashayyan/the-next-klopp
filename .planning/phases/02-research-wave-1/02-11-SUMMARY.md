---
phase: 02-research-wave-1
plan: 11
subsystem: research
tags: [learning-science, adhd, evidence-grading]
requirements-completed: [RSCH-01]
key-files:
  created:
    - research/learning-science-adhd/findings.md
    - research/learning-science-adhd/sources.json
    - research/learning-science-adhd/visual_ideas.md
---

# Phase 2 Plan 11: learning-science-adhd Summary

Graded, DOI-validated learning-science evidence base with ADHD-specific findings kept apart from general learning science extrapolated to ADHD. Gate: `research/learning-science-adhd: ok (25 sources, 1130 findings words)`.

## Counts
- Sources: 25 (24 papers, 1 NBER working paper), at the cap. Stop reason: source cap reached (25) after all eight topics were covered.
- Words: findings 1130, visual_ideas 259.
- Tool calls: WebSearch 4, WebFetch 5 (3 PubMed pages returned only a cookie notice, so abstracts came from NCBI E-utilities via Python; 1 PMC full text, 1 NBER page), K-Dense scripts: search_openalex.py about 27 queries, doi_to_bibtex.py 3 runs, validate_citations.py 2 runs with --check-dois. The Skill tool was not used; SKILL.md files were read and scripts run with system Python. `parallel-cli` and email env vars were not used.
- DOIs validated: all 26 checked resolved (25 cited, plus none failing). No DOI was dropped for failing validation. The OpenAlex hit for Marco 2009 (10.1037/a0014914) was validated but dropped for the cap.
- `unknown` licence values: none; licences are set conditional or no (paraphrase only).

## Contested points
Streaks (NBER randomised trial in children vs reward-undermining meta-analysis and inconsistent ADHD reward findings); gamification overall; cognitive training (unblinded vs blinded raters; small adult gain).

## Weak spots
- No ADHD sample for multimedia, worked-example, simulation or spacing evidence; all marked extrapolated.
- Abstracts for Barbieri and Gollwitzer were not machine-readable, so effect sizes come from secondary summaries (flagged in notes); Dunlosky utility ratings also from secondary summaries.
- WFADHD statements were read through a summarising fetch; re-check item numbers before shipping.
- NBER streaks paper is a working paper; peer-reviewed version unverified.
- Microlearning and low-energy-day evidence not appraised; listed under open questions.
- Not committed (orchestrator instruction). `domains.test.ts` fails only for sibling domains not yet written.
