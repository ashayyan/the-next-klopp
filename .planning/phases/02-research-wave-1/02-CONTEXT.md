# Phase 2: Research Wave 1 - Context

**Gathered:** 2026-11-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 runs the Wave 1 research sprint that Milestones 0 and 1 depend on, and ends at the RSCH-06 approval checkpoint. It delivers, under `research/`:

- one folder per Wave 1 domain with `findings.md`, `sources.json` (validated against `schemas/source.schema.json`) and `visual_ideas.md`
- a script-generated data-coverage matrix (provider × competition × season × data type) for Premier League open data
- a recorded Watch Gym Level 1 clip-supply decision with licence evidence
- the machine-readable synthesis (`SOURCE_REGISTRY.json`, `concept-map.json`, `roles.json`, `competencies.json`) validated against the Phase 1 schemas, plus generated Markdown views (`CONCEPT_MAP.md`, `CURRICULUM_DRAFT.md`, `ROLE_COMPETENCIES.md`)
- `GAPS.md` listing every domain deferred to just-in-time research and the track it must precede
- a short visual summary of the concept map and curriculum draft, with the approval outcome recorded

No lesson content, no DESIGN.md, no app UI beyond the summary page.

Requirements: RSCH-01, RSCH-02, RSCH-03, RSCH-04, RSCH-05, RSCH-06.

</domain>

<decisions>
## Implementation Decisions

The learner delegated every grey area to Claude for this autonomous run ("choose all the recommended choices and close every grey area"). They also made research the top priority and required the K-Dense Scientific Agent Skills and agentmemory to be used. Each answer below is the recommended option.

### Wave 1 domain list and folder slugs
- Ten Wave 1 domains, one research sub-agent each, with these folder slugs:
  - `laws-of-the-game` (IFAB current edition + date, offside, VAR protocol basics)
  - `pitch-geometry` (dimensions, markings, PL stadium pitch sizes)
  - `positions-and-numbering`
  - `formations` (incl. how formations are read in and out of possession)
  - `tactics-history` (timeline anchors for the history-of-tactics timeline)
  - `how-analysts-watch` (brief §6.2 item 14b)
  - `learning-science-adhd` (brief item 21; use the K-Dense `literature-review` and `scientific-critical-thinking` skills; peer-reviewed sources preferred)
  - `role-definitions` (brief 20h, every senior role in brief §7.1)
  - `pl-data-sources` (open data providers, licences, PL coverage, FBref/Understat/Transfermarkt/Capology terms)
  - `interactive-explainers` (brief item 22: inspiration audit, never copy code or visuals)
  — **Reversibility:** costly — the slugs become paths that concept-map and source IDs reference.
- All other brief §6.2 domains are deferred to just-in-time research and listed in `GAPS.md` with the track they must precede.

### Research method, caps and stop rules
- Research sub-agents run on Sonnet (brief §5), in parallel; synthesis runs on Opus. Fable is not used (no escalation condition met).
- Per domain cap: at most 25 sources in `sources.json`, `findings.md` ≤ 1,500 words, `visual_ideas.md` ≤ 600 words. Stop rule: stop when three consecutive new sources add no new concept or claim, or when the cap is reached.
- Each finding is written in the agent's own words (no copied passages). Each factual claim in `findings.md` cites a source ID from that domain's `sources.json`.
- Contested points are labelled `Contested:` with both sides and their sources.
- Every source records the licence fields (`read`, `automated_access`, `redistribute`, `derivative`) as `yes|no|unknown|conditional` with a note. `unknown` is allowed but must be flagged in GAPS.md if the source is needed for shipped content.
- The `excerpts[]` format (Phase 1 schema): `id`, `locator`, `fetched_at`, `sha256` of the fetched passage, `paraphrase` ≤ 300 chars. Each claim that a later lesson will make about regulations or numbers gets at least one excerpt, so the verifier can check it.

### Data-coverage matrix (RSCH-02)
- A Python script in the pipeline package (`uv run --project pipeline klopp-pipeline coverage`) reads each provider's public index (StatsBomb open-data `competitions.json` and `matches/`, Metrica sample-data repo listing, SkillCorner opendata `matches.json`, DFL/Sportec open data index via kloppy/databallpy docs, Wyscout public dataset figshare metadata, PFF FC availability) and writes `research/pl-data-sources/coverage-matrix.json` and `coverage-matrix.md`. Network fetches are read-only metadata, cached under `pipeline/data/raw/` (git-ignored). — **Reversibility:** reversible — a script and its output.
- Each cell states: provider, competition, season, data type (event / 360 / tracking / broadcast-tracking / physical), `pl_matches` count (0 when none), licence ID, source URL.
- Network failure for a provider: record `status: unreachable` for that row and continue; do not fabricate counts.

### Watch Gym L1 clip-supply decision (RSCH-03)
- Recommended route, recorded as `docs/decisions/0008-watch-gym-l1-clip-supply.md`: primary = animated reconstructions from open event/360/tracking data on the canonical pitch; secondary = the learner's own local clip files (never committed, never uploaded); YouTube = link-out only (no embed overlay, no download). Every clip spec declares a reconstruction fallback. The ADR cites the licence evidence (StatsBomb open-data licence/attribution, provider terms, YouTube ToS clause on downloading). — **Reversibility:** costly — Watch Gym data model and Phase 8 depend on it.
- If the coverage matrix shows no PL reconstruction source with permissive licence, the ADR still picks reconstruction from the best-licensed non-PL open data and flags the PL gap in GAPS.md.

### Synthesis outputs (RSCH-04)
- Opus synthesis agent deduplicates sources into `research/SOURCE_REGISTRY.json` (array of source objects per schema; stable IDs `src-<kebab>`), and writes `concept-map.json` (concept nodes + prerequisites per schema), `roles.json`, `competencies.json`. — **Reversibility:** costly — IDs become frozen references for lessons, placement and the Role Map.
- Concept IDs are kebab-case and stable; each concept has `track` and `part` from brief §7 (Tracks 0–28, Parts A–G) as refined by research.
- FBref advanced stats are recorded in the registry with `status: removed` and `removed_reason` (Opta data removed 2026-01-20).
- The Markdown views (`CONCEPT_MAP.md`, `CURRICULUM_DRAFT.md`, `ROLE_COMPETENCIES.md`) are generated by a Node script `scripts/research/render-views.ts` (run via `npm run research:views`) from the JSON files, never hand-edited; a Vitest test checks the views are up to date and that the JSON validates against the schemas, prerequisite graph is acyclic, and every referenced source/concept/competency ID resolves.
- Curriculum draft order follows the concept map (study/build order), not track numbers; Watch Gym, Write & Speak, Scouting I and the Role Map start early.

### GAPS.md (RSCH-05)
- Table: domain (brief §6.2 number + name), why deferred, the track it must precede, research trigger (start of that track), known starting sources. Also lists Wave 1 sources with `unknown` licence that later content needs, and the PL coverage gaps from the matrix.

### Visual summary and approval checkpoint (RSCH-06)
- The visual summary is a self-contained HTML page `research/summary/index.html` (no external network deps) generated from `concept-map.json` and the curriculum draft: an interactive concept-map graph (nodes coloured by Part, click a node to see prerequisites and sources), a track-by-track curriculum strip in study order, the coverage matrix, the clip-supply decision and the GAPS list. ≤ 5 screens of reading, ADHD-friendly (short labels, no walls of text).
- Approval: the learner instructed this run to make every human decision itself unless there is a hard block. So Claude reviews the summary against the brief (§7 spine, §7.1 roles, §8 learning design) as an independent Opus reviewer pass, records the approval in `research/APPROVAL.md` as "approved by Claude under learner delegation (autonomous run, 2026-11-27); learner may re-open at any time", and lists the review notes. The learner's own review is recorded as a non-blocking follow-up in STATE.md. — **Reversibility:** costly — DESIGN.md work in Phase 4 is gated on this.

### Memory
- Store in agentmemory only verdicts and decisions (source-quality verdicts such as "FBref advanced stats removed", the clip-supply decision, the Wave 1 domain list). Never store raw research text.

### Post-research decisions (2026-11-27, after 02-RESEARCH.md)
- Domain research plans are dispatched by the orchestrator to the  agent type (it has WebSearch/WebFetch/Write/Bash); synthesis and review plans go to Opus agents. No custom agent files are installed into  and no  routing is needed. Plans must not assume the default  can browse. — **Reversibility:** reversible — dispatch choice only.
- StatsBomb open data licence forbids providing data to external parties: StatsBomb-derived artifacts (and Last Row clips, which have no licence file) are generated locally by the pipeline for the learner's local study build only, carry StatsBomb attribution/logo, and are listed in the deploy deny-manifest so they never enter the Vercel bundle. Only CC BY sources (Wyscout/Pappalardo PL 2017/18 events, DFL/Sportec) may ship in the deployed bundle. ADR 0008 records this. — **Reversibility:** costly — Watch Gym supply and deploy gate depend on it.
- role-definitions stays one plan (15 roles, 25-source cap; prefer one high-quality source per role family).
- PL stadium pitch dimensions are researched inside .
-  3.1.4 is allowed as an exact-pinned devDependency for build-time layout of the summary page; Okabe-Ito palette hex values must be verified from a source, not memory.
- The research completeness test is skipped unless RESEARCH_GATE=1 until the final wave, so CI stays green mid-phase.

### Decided autonomously
- [Layout] Q: "Where do research files live?" → Selected: "research/ at repo root, one folder per domain slug, plus research/summary/" — moving folders is cheap before IDs freeze.
- [Validation] Q: "How are sources.json files validated?" → Selected: "Vitest test runs ajv against schemas/source.schema.json for every research/*/sources.json and the registry" — test-only.
- [Tooling] Q: "Coverage script language?" → Selected: "Python in the pipeline package (uv, Typer CLI subcommand `coverage`)" — the pipeline already owns data access.
- [Tooling] Q: "Concept-map graph rendering in the summary page?" → Selected: "inline SVG generated by the Node view script with a tiny vanilla-JS layer, no CDN" — throwaway page, replaced by app UI later.
- [Process] Q: "Parallel fan-out size?" → Selected: "10 research agents in two waves of 5" — keeps load and rate limits sane.

### Claude's Discretion
- Exact wording of findings and summaries.
- Layout details of the summary page (it is a research artefact, not app UI; DESIGN.md does not exist yet).
- Which extra free sources each domain adds beyond the seed list.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `schemas/source.schema.json`, `concept.schema.json`, `competency.schema.json`, `role.schema.json` and their Zod mirrors in `src/schemas/contracts.ts` (Phase 1). The dual-validator test pattern is in `schemas/schemas.test.ts`.
- `pipeline/` uv package stub (`klopp_pipeline`, Python 3.12) ready for a Typer CLI.
- `scripts/guard-files.ts` rejects raw data and oversized files; `pipeline/data/raw/` is git-ignored.
- K-Dense skills installed project-locally: `literature-review`, `citation-management`, `scientific-critical-thinking`, `peer-review`, `statistical-analysis`, `hypothesis-generation`, etc.

### Established Patterns
- Node scripts run as `node file.ts` (Node 24 type stripping, no tsx). Tests in Vitest, include globs `src/**`, `scripts/**`, `schemas/**` (add `research/**` if tests live there, or keep tests under `scripts/research/`).
- Conventional commits enforced by the commit-msg hook; guard runs on pre-commit.

### Integration Points
- `research/SOURCE_REGISTRY.json` is consumed by the Phase 5 validator (citations) and `<Fact>/<Rule>/<Stat>` components.
- `concept-map.json` feeds placement (Phase 7), mastery and the Role Map; `roles.json`/`competencies.json` feed the Role Map and role-coverage report.
- Coverage matrix + clip-supply ADR feed Phase 3 pipeline recipes and Phase 8 Watch Gym.

</code_context>

<specifics>
## Specific Ideas

- Brief §6.1 output contract: `findings.md` (key concepts, must-teach list, misconceptions, contested points), `sources.json`, `visual_ideas.md`.
- Brief §6.3 seed sources: StatsBomb open data (incl. 360), Metrica, SkillCorner, DFL/Sportec, Wyscout public dataset, PFF FC, transfermarkt-datasets, IFAB Laws, PL Handbook, Soccermatics, Friends of Tracking.
- Research SUMMARY.md D4: FBref lost Opta stats on 2026-01-20 → removed source.
- Premier League is the default reference league everywhere.

</specifics>

<deferred>
## Deferred Ideas

- All non-Wave-1 brief §6.2 domains (principles of play, positional play, defending, transitions, set pieces, role catalogue, coaching methodology, sports science, video analysis workflow, data types depth, metrics, Python ecosystem, scouting a–f, writing/speaking, transfers a–f, regulations, finance, club strategy, youth, PL ecosystem 20–20g, SPL pack) → just-in-time research per track, listed in GAPS.md.
- The learner's local datasets (paths unknown) — asked at the data-pipeline checkpoint before Track 15/18.

</deferred>
