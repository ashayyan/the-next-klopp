---
phase: 02-research-wave-1
plan: 15
subsystem: research
tags: [source-registry, dedup, licence-merge, aliases, jit-seeds, synthesis-gate]
status: complete
requires: [02-05, 02-06, 02-07, 02-08, 02-09, 02-10, 02-11, 02-12, 02-13, 02-14]
provides:
  - research/SOURCE_REGISTRY.json (218 entries, frozen ids)
  - research/SOURCE_ALIASES.json (5 id aliases, 0 excerpt aliases)
  - research/jit-seed-sources.json (24 unverified brief section 6.3 seeds)
  - research/registry-overrides.json (2 same_as groups)
  - scripts/research/lib/registry.ts (mergeSources)
  - scripts/research/build-registry.ts (write, --check, --report, --list)
  - scripts/research/synthesis.test.ts (registry section)
affects: [02-16, 02-17, 02-18, 02-19, 02-20, 02-21, phase-05-validator]
tech-stack:
  added: []
  patterns:
    - "Pure merge library plus thin CLI; --check compares by parsed JSON value (isDeepStrictEqual), so Biome reformatting of committed JSON never breaks the check"
    - "Union-find over entries: canonical URL joins first, then same_as override groups; first-seen entry is always the root"
key-files:
  created:
    - scripts/research/lib/registry.ts
    - scripts/research/lib/registry.test.ts
    - scripts/research/build-registry.ts
    - scripts/research/synthesis.test.ts
    - research/registry-overrides.json
    - research/jit-seed-sources.json
    - research/SOURCE_REGISTRY.json
    - research/SOURCE_ALIASES.json
  modified: []
decisions:
  - "Registry ids frozen at 218 entries; later phases only add (merge keeps the first-seen id, so appending inputs never renames an id)"
  - "same_as overrides only for the same work and edition: Bradbury 2016 PubMed record = DOI; Pappalardo 2019 nature.com = PMC copy. Handbook 2025/26 vs 2026/27, StatsBomb spec documents vs the repo, Explorables hub vs Victor essay stay separate"
  - "Just-in-time seeds use type official-document, not regulation, because they carry no excerpts yet; the one book seed records redistribute no (paid book, reference only) instead of unknown"
requirements-completed: []
requirements-partial: [RSCH-04]
duration: 20 min
completed: 2026-11-28
actuals:
  tokens: 106000
  tasks: 3
  commits: 3
plan_head_before: 24773b554374d5421d9b45f3913ae7db5bc196a2
plan_head_after: 3f1bbb7
---

# Phase 02 Plan 15: Source registry merge Summary

The Wave 1 sources are now one registry, `research/SOURCE_REGISTRY.json`, with 218 entries. It merges 241 input entries: the seed file (20), the ten domain files (197) and 24 just-in-time seeds. Each licence field takes the most restrictive value across copies. An alias file maps every old id to its registry id. `build-registry --check` confirms the committed files match a fresh merge.

## Results

- **Inputs:** seed=20, laws-of-the-game=17, pitch-geometry=14, positions-and-numbering=15, formations=20, tactics-history=25, how-analysts-watch=17, learning-science-adhd=25, role-definitions=25, pl-data-sources=18, interactive-explainers=21, jit-seed=24.
- **Registry size:** 218 entries (196 after Task 1, 220 after Task 2, 218 after the 2 overrides in Task 3).
- **Merges:** 21 groups. 17 are seed entries copied unchanged into a domain file (IFAB x4 plus the 3-way Laws PDF, PL laws, StatsBomb, Wyscout, DFL, SkillCorner, Metrica, Last Row, PFF, Transfermarkt datasets, FBref, Awful Announcing, YouTube terms, YouTube RMF). 3 are canonical-URL merges across domains (PL Handbook 2026/27, Pappalardo nature.com, StatsBomb events spec v4); the Pappalardo group also takes the PMC copy through an override. 1 is a pure override merge (Bradbury).
- **Aliases (5):** `src-bradbury-attention-span-2016` -> `src-aps-bradbury-attention-span`; `src-nature-wyscout-soccer-logs-paper` and `src-pappalardo-wyscout-dataset-paper` -> `src-nature-pappalardo-wyscout-events`; `src-premierleague-handbook-2026-27` -> `src-pl-handbook-2026-27`; `src-statsbomb-events-spec-v4` -> `src-statsbomb-open-events-spec-v4`.
- **Excerpt renames:** 0. Every shared excerpt id had the same hash.
- **FBref:** `src-fbref-advanced-stats` has status removed. Its removed_reason is "Opta advanced data removed from FBref on 2026-01-20 after the provider ended the data feed".
- **Regulation-type sources without an excerpt:** none.
- **Unverified:** 26 entries. These are the 24 jit seeds plus `src-parnell-sporting-director-emergence` and `src-understat`, which the domains already recorded as unverified.

## Overrides added (research/registry-overrides.json)

1. `["src-aps-bradbury-attention-span", "src-bradbury-attention-span-2016"]`: the PubMed record 28145268 and DOI 10.1152/advan.00109.2016 point to the same article.
2. `["src-nature-pappalardo-wyscout-events", "src-pappalardo-wyscout-dataset-paper"]`: the PMC6817871 full text and the nature.com article are the same published version of Pappalardo et al. 2019.

Candidates judged and left separate:
- PL Handbook 2025/26 and 2026/27: different editions.
- The StatsBomb open-data repo and its spec PDFs (v1.1, 360 frames, events v4): different documents.
- The IFAB documents hub and the Laws PDF: hub versus document.
- The IFAB circulars 33 and 34: different documents.
- The Explorables hub and Bret Victor's essay: different works.
- Similar-titled series pages (PL "tactics explained", UEFA "greatest teams", Liverpool and Newcastle job ads, Wikipedia articles): different works.

## Conflicts reviewed (19) and resolution

The merge applied the conservative result in every case. Neither file was edited by hand.

| Source | Field | Values | Result | Judgement |
|---|---|---|---|---|
| src-youtube-terms | recency | seed 2022-01-05, pl-data-sources 2023-12-15 | 2022-01-05 (first-seen) | Possibly stale: see Registry notes |
| src-pl-handbook-2026-27 | title, publisher | short vs "Section M" variant | first-seen | Correct (same PDF) |
| src-pl-handbook-2026-27 | type | official-document vs regulation | official-document | Acceptable: it has 21 excerpts anyway |
| src-nature-pappalardo-wyscout-events | title, url, publisher | nature.com vs PMC wording | first-seen nature.com | Correct |
| src-nature-pappalardo-wyscout-events | licence automated_access / redistribute / derivative | yes or unknown, yes or unknown, yes or conditional | unknown / unknown / conditional | Over-cautious: see Registry notes |
| src-statsbomb-open-events-spec-v4 | title | two wordings | first-seen | Correct |
| src-statsbomb-open-events-spec-v4 | recency | 2019-05-08 vs 2026-11-27 | 2019-05-08 | Correct: formations recorded the check date as recency |
| src-statsbomb-open-events-spec-v4 | quality | 4 vs 5 | 4 (minimum) | Correct |
| src-aps-bradbury-attention-span | title, url, publisher | PubMed vs DOI wording | first-seen PubMed | Correct |
| src-aps-bradbury-attention-span | recency, as_of | 2016-12-01 / 2016-01-01; 2026-11-27 / 2026-11-28 | 2016-12-01; as_of 2026-11-27 (earliest) | Correct (Dec 2016 issue) |
| src-aps-bradbury-attention-span | licence automated_access | unknown vs yes | unknown | Conservative, acceptable |

No status conflict occurred. FBref is removed in both the seed and the pl-data-sources copy.

## Registry notes (for 02-20 to carry into GAPS.md)

- `src-nature-pappalardo-wyscout-events`: the formations excerpt `cc-by-licence` says the article is CC BY 4.0. positions-and-numbering recorded redistribute as unknown and derivative as conditional, so the merged entry is more restrictive than the licence. Re-check and correct it in the domain file during just-in-time research.
- `src-youtube-terms`: the seed and pl-data-sources give different recency dates (2022-01-05 and 2023-12-15). Confirm the current effective date of the YouTube Terms of Service.
- `src-statsbomb-events-spec-v4` (formations copy) gives the check date 2026-11-27 as its recency. The real date is 2019-05-08. The merged entry is already right.
- `src-pl-handbook-2026-27`: positions-and-numbering typed it `regulation`, but the registry keeps the first-seen `official-document`. If later lessons treat the PL Rules as regulations, decide this in one place.

## Unknown-licence source ids (160)

- **automated_access only (108):** src-90min-nereo-rocco, src-aisa-chapman-new-formation-1925, src-aps-bradbury-attention-span, src-arsenal-newcastle-7-0-golden-era, src-asa-day-in-life-analyst, src-asa-home, src-awfulannouncing-fbref-removal, src-breakingthelines-watch-space, src-brentford-head-of-analysis-2021, src-bundesliga-klopp-dortmund-years, src-bundesliga-positions-explained, src-ciechanowski-moon, src-coachesvoice-formations-explained, src-distill-about, src-espn-head-coach-vs-manager, src-explorables-hub, src-fa-laws-and-rules, src-fifa-cpl-daylight-offside-trial, src-fifa-stadium-guidelines-pitch, src-flourish-pl-visualisation, src-football365-who-controls-transfers, src-footballbenchmark-ceo-profiles, src-fourfourtwo-england-1966-formation, src-fourfourtwo-formations-in-football, src-fourfourtwo-inverted-full-back, src-fourfourtwo-no10, src-fourfourtwo-pl-pitch-sizes, src-fourfourtwo-watch-like-analyst, src-fourfourtwo-who-invented-pressing, src-goal-squad-numbers-explained, src-hudl-marshall-head-of-recruitment, src-ifab-history-back-pass-law, src-ifab-history-offside-law, src-ifab-history-origins-modern-game, src-iib-538-doppelgangers, src-iib-futbolismo-legends, src-insideworldfootball-wenger-offside-trial, src-jobsinfootball-532, src-jobsinfootball-sporting-director-role, src-jobsinfootball-sporting-director-structure, src-karun-expected-threat, src-lcfc-squad-numbers-history, src-liverpool-data-engineer, src-liverpool-first-team-performance-analyst, src-liverpool-head-academy-medical-performance, src-liverpool-head-of-loan-management, src-liverpool-lead-data-scientist, src-liverpool-set-piece-coach, src-liverpool-women-head-of-recruitment, src-mastermindsite-how-i-watch, src-museumofjerseys-birth-of-squad-numbers-part-2, src-ncase-home, src-ncase-remember, src-newcastle-first-team-analyst-post-match, src-newcastle-head-recruitment-analysis-women, src-newcastle-lead-recruitment-data-analyst, src-newcastle-women-academy-manager, src-okabe-ito-cud, src-pl-352-explained, src-pl-442-explained, src-pl-451-explained, src-pl-assistant-manager-insights, src-pl-box-midfield-explained, src-pl-formation-trends-2024-25, src-pl-handbook-2025-26, src-pl-handbook-2026-27, src-pl-laws-2026-27, src-pl-pitch-standards-framework-2025, src-pl-saot-explainer, src-pl-slot-liverpool-shape-2024, src-pl-sporting-directors-explained, src-pl-var-accuracy-2024, src-pl-var-faqs, src-planetfootball-formations-whiteboard, src-premier-league-chelsea-2004-05, src-premier-league-counter-pressing-explained, src-premier-league-hall-of-fame-wenger, src-premier-league-history, src-premier-league-klopp-liverpool-2019-20, src-premier-league-leicester-2015-16, src-premier-league-man-city-evolution, src-premierleague-coachesvoice-no6-explained, src-redblobgames-astar, src-seeing-theory, src-setosa-explained-visually, src-setosa-markov-chains, src-sky-hammond-loans-manager, src-skysports-arteta-tactics-2023, src-skysports-conte-343-2017, src-slemen-director-high-performance, src-slemen-effective-sporting-director, src-soccermatics-pitch-control, src-squadnumbers-1-11-premier-league-era, src-statsbomb-blog-archive, src-theanalyst-what-is-xg, src-thefa-central-defenders-bootroom, src-thesefootballtimes-roots-of-xg, src-uefa-ac-milan-1988-90, src-uefa-ajax-1971-73, src-uefa-barcelona-2008-12, src-uefa-coaching-licences, src-uefa-hungary-1950-56, src-uefa-performance-analysis, src-uefa-stadium-infrastructure-2025, src-victor-explorable-explanations, src-worldrugby-halftime-analysis, src-worldrugby-postmatch-analysis, src-yahoo-keble-formations-2016
- **automated_access + redistribute (9):** src-cies-football-observatory, src-frontiers-cognition-elite-soccer, src-frontiers-vbt-football-review, src-frontiers-visual-search-meta, src-jssm-linke-effective-playing-time, src-mdpi-pct-team-sports-meta, src-nature-pappalardo-wyscout-events, src-springer-temporal-occlusion-meta, src-wyscout-data-glossary-pitch-coordinates
- **redistribute + derivative (10):** src-friends-of-tracking, src-ieee-bialkowski-team-structures, src-kloppy-coordinate-systems-source, src-kloppy-coordinates-docs, src-kloppy-docs, src-kloppy-positions-docs, src-mplsoccer-plot-formations, src-mplsoccer-standardize-docs, src-pff-fc-wc2022, src-soccermatics
- **redistribute only (3):** src-jarmac-pan-pretesting-video, src-metrica-sample-data, src-rogerson-var-meta-analysis
- **read + redistribute + derivative (2):** src-capology, src-transfermarkt-site
- **automated_access + redistribute + derivative (2):** src-ncase-polygons, src-see-okabeito-colors
- **Domain-unverified:** src-parnell-sporting-director-emergence (automated_access), src-understat (automated_access, redistribute, derivative)
- **Jit seeds, all four fields unknown (23):** src-coaches-voice, src-commons-library, src-companies-house-search, src-databallpy, src-deloitte-football-money-league, src-fa-coaching-courses, src-fifa-football-agents, src-fifa-rules-and-reports, src-fifa-training-centre, src-fifa-transfer-reports, src-floodlight, src-independent-football-regulator, src-mckay-johns-youtube, src-mit-sloan-research-papers, src-mplsoccer-docs, src-pysport, src-socceraction-docs, src-soccerdata, src-spielverlagerung, src-statsbombpy, src-uefa-documents-portal, src-uefa-technical-reports, src-unravelsports
- **Jit book (read, automated_access, derivative unknown; redistribute no):** src-book-the-numbers-game

## Just-in-time seeds (24, all checked 2026-11-28)

Every URL answered 2xx after redirects. transfer-reports and commons-library rejected HEAD, so they were retried with a GET of a 1-byte range. Where a URL redirected, the final URL is recorded.

Left out because the URL failed, or because a 200 response served the wrong content:
- FIFA RSTP pages: `https://inside.fifa.com/legal/football-regulatory/regulations` (HEAD 405, GET 404 after it redirected to /transfer-system/regulations) and `https://inside.fifa.com/transfer-system/regulations-on-the-status-and-transfer-of-players` (404). The FIFA "Rules & Reports" library page is used instead; its text names the RSTP.
- FIFA agent pages: `https://inside.fifa.com/legal/football-agents`, `/legal/football-agent-regulations` and `/legal/football-agents/regulations` (all 404). `/transfer-system/agents` is used instead.
- UEFA European Club Finance and Investment Landscape report: `https://www.uefa.com/`, `/news-media/news/`, `/insideuefa/` and `/insideuefa/football-development/uefa-intelligence-centre/` all gave no response to this client (curl 000, also with HTTP/1.1). `https://editorial.uefa.com/` redirected (302) to an error page. documents.uefa.com is used as the starting point instead.
- MIT Sloan: `https://www.sloansportsconference.com/research-papers` and `/content-type/research-paper` (404). `/research-paper-competition` is used instead.
- House of Commons Library football governance briefing: the search page `?s=football+governance` serves a Cloudflare challenge, so no briefing URL could be found. The home page is recorded with a note.
- Inverting the Pyramid (Orion): `https://www.orionbooks.co.uk/titles/jonathan-wilson/inverting-the-pyramid/9781409189855/` returned 200 but served a different book ("A Shadow on the Lens"). Left out because it is a soft 200 for the wrong work (threat T-02-35).
- Football Hackers: `https://www.bonnierbooks.co.uk/products/football-hackers` (404). The publisher search found no product page.
- Net Gains: `https://www.abramsbooks.com/product/net-gains_9781419754647/` (404).
- The Expected Goals Philosophy: the book is self-published, so there is no publisher page. The Open Library work page redirects to a verify_human page.
- `https://www.bloomsbury.com` (403). It was not used.
- PL Handbook: skipped because `src-pl-handbook-2026-27` is already a verified domain source. The old URL `https://www.premierleague.com/en/handbook` returns 404.

Skipped because a domain already has them: American Soccer Analysis, CIES Football Observatory, UEFA coaching licences, kloppy, Soccermatics, Friends of Tracking, Karun Singh xT, StatsBomb blog archive.

## Verification

- `node scripts/research/build-registry.ts --check`: "registry up to date (218 entries)", exit 0.
- `npm run research:check`: 8 files, 139 passed, 4 skipped.
- `npx vitest run scripts/research/lib/registry.test.ts scripts/research/synthesis.test.ts`: 18 passed, 1 skipped. The skipped case is the gate-only "exists" check.
- `npx tsc --noEmit` passes. `npx biome ci scripts research` passes (65 files). `npm run guard` passes (229 files).
- All ten `node scripts/research/check-domain.ts <slug>` runs print ok.
- All plan acceptance one-liners exit 0: registry has at least 60 entries and FBref is removed; jit has at least 15 entries, all unverified; registry has at least 15 unverified entries; overrides have schema_version 1; no regulation lacks an excerpt.
- Tracer gate: Task 1's `<verify>` was re-run end-to-end before expansion and passed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Generated JSON failed `biome ci`**
- **Found during:** Task 3
- **Issue:** The CLI writes `JSON.stringify(x, null, 2)`, but Biome folds short arrays onto one line. After a rebuild, `npx biome ci scripts research` reported a format difference. lint-staged had already reformatted the committed copy.
- **Fix:** Ran `npx biome check --write` on the generated JSON after the rebuild. `--check` compares parsed values, so both layouts pass (Pitfall 8).
- **Files modified:** research/SOURCE_REGISTRY.json, research/SOURCE_ALIASES.json
- **Commit:** 3f1bbb7

**2. [Rule 2 - Correctness] Jit seed licence and type choices**
- **Found during:** Task 2
- **Issue:** The plan says every jit licence field is `unknown`. A paid book is clearly not redistributable (brief section 6.3 and RESEARCH Seed URLs: books are `redistribute: no`). Typing a seed `regulation` would also fail the rule that every regulation has an excerpt, and an unchecked seed cannot have one.
- **Fix:** `src-book-the-numbers-game` records redistribute `no` with a note and has free false. Regulation seeds use type `official-document`.
- **Files modified:** research/jit-seed-sources.json
- **Commit:** dcef625

**3. [Rule 2 - Correctness] Jit seeds checked against verified sources**
- **Found during:** Task 1 and Task 2
- **Issue:** Under the most-restrictive rule, a jit seed (all fields unknown) that shared a URL with a verified domain source would downgrade that source's licence.
- **Fix:** synthesis.test.ts fails if any jit seed's canonical URL matches a seed or domain source, and checks that jit entries stay unverified in the registry.
- **Commit:** 38f65b9 (test), dcef625 (case activated)

**4. [Rule 1 - Bug] RSCH-04 not marked complete**
- **Found during:** state updates
- **Issue:** `requirements.mark-complete RSCH-04` ticked the whole requirement, but RSCH-04 also needs concept-map.json, roles.json, competencies.json and the Markdown views (02-17 to 02-19).
- **Fix:** Reverted REQUIREMENTS.md; this plan delivers the registry part of RSCH-04 only. The last plan producing RSCH-04 outputs should mark it.

### TDD note
Task 2 is `tdd="true"`, but the tracer Task 1 had already built `mergeSources`, so the new unit tests passed on their first run. A mutation check stood in for RED: inverting the restrictiveness order failed the licence test, and the code was then restored from git.

## Known Stubs

None. The jit seeds are deliberately unverified (status `unverified`, licence `unknown`). They feed 02-19 and 02-20 as just-in-time starting points.

## Self-Check: PASSED

- FOUND: scripts/research/lib/registry.ts, scripts/research/lib/registry.test.ts, scripts/research/build-registry.ts, scripts/research/synthesis.test.ts
- FOUND: research/SOURCE_REGISTRY.json, research/SOURCE_ALIASES.json, research/jit-seed-sources.json, research/registry-overrides.json
- FOUND commits: 38f65b9, dcef625, 3f1bbb7
