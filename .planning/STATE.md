---
gsd_state_version: "1.0"
current_phase: 4
current_phase_name: Design Direction & System
status: executing
stopped_at: Completed 04-08-PLAN.md
last_updated: "2026-11-28T07:20:15.540Z"
last_activity: 2026-11-28
last_activity_desc: Phase 4 execution started
state_head: d3c18af4702cdbf9cac287143292cb82fdc81811
progress:
  total_phases: 8
  completed_phases: 3
  total_plans: 58
  completed_plans: 49
  percent: 38
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-27)

**Core value:** Every concept is shown, then touched, then practised in a short visual lesson grounded in real Premier League examples and traceable free sources, so a visual, ADHD learner builds professional-level football understanding.
**Current focus:** Phase 4 — Design Direction & System

## Current Position

Phase: 4 (Design Direction & System) — EXECUTING
Plan: 9 of 17
Status: Ready to execute
Last activity: 2026-11-28 — Phase 4 execution started

Progress: [████░░░░░░] 38%

## Performance Metrics

**Velocity:**
- Total plans completed: 41
- Average duration: - min
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 2 | 21 | - | - |
| 1 | 9 | - | - |
| 3 | 11 | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 1 P01 | 15min | 2 tasks | 7 files |
| Phase 1 P02 | 12min | 2 tasks | 11 files |
| Phase 1 P03 | 8min | 2 tasks | 12 files |
| Phase 1 P07 | 12min | 3 tasks | 9 files |
| Phase 1 P04 | 10min | 3 tasks | 10 files |
| Phase 1 P05 | 10min | 3 tasks | 11 files |
| Phase 1 P06 | 6min | 2 tasks | 7 files |
| Phase 1 P08 | 25min | 2 tasks | 3 files |
| Phase 2 P01 | 10 min | 3 tasks | 12 files |
| Phase 2 P02 | 10 min | 3 tasks | 15 files |
| Phase 2 P03 | 14 min | 2 tasks | 14 files |
| Phase 2 P04 | 45 min | 2 tasks | 10 files |
| Phase 2 P15 | 20 min | 3 tasks | 8 files |
| Phase 02 P16 | 9 min | 2 tasks | 3 files |
| Phase 02 P17 | 6 min | 2 tasks | 3 files |
| Phase 02 P18 | 8 min | 3 tasks | 7 files |
| Phase 02 P19 | 6 min | 3 tasks | 4 files |
| Phase 02 P20 | 25min | 3 tasks | 7 files |
| Phase 02 P21 | 45 min | 3 tasks | 9 files |
| Phase 3 P01 | 10 min | 3 tasks | 14 files |
| Phase 3 P02 | 10 min | 3 tasks | 14 files |
| Phase 3 P03 | 8 min | 3 tasks | 9 files |
| Phase 3 P04 | 12 min | 3 tasks | 15 files |
| Phase 03 P05 | 14min | 3 tasks | 14 files |
| Phase 03 P06 | 9min | 3 tasks | 14 files |
| Phase 03 P07 | 14min | 3 tasks | 12 files |
| Phase 03 P08 | 25min | 3 tasks | 14 files |
| Phase 03 P09 | 40min | 3 tasks | 13 files |
| Phase 03 P10 | 55min | 3 tasks | 13 files |
| Phase 3 P11 | 25min | 3 tasks | 7 files |
| Phase 4 P01 | 25 min | 2 tasks | 14 files |
| Phase 4 P02 | 15 min | 2 tasks | 6 files |
| Phase 4 P03 | 14 min | 2 tasks | 7 files |
| Phase 4 P04 | 22min | 2 tasks | 13 files |
| Phase 4 P05 | 38min | 3 tasks | 12 files |
| Phase 4 P06 | 52min | 3 tasks | 7 files |
| Phase 4 P07 | 30min | 3 tasks | 16 files |
| Phase 4 P08 | 35min | 3 tasks | 18 files |

## Accumulated Context

### Decisions

- [2026-11-28] Learner made the GitHub repo public (overrides SETUP-03 "private"); brief and learner profile are now publicly readable; no secrets in history (guard + gitleaks pass)

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Phase 0 research split into Wave 1 plus just-in-time research per later track (learner choice, 2026-11-27)
- [Init]: Vite 8 SPA over Next.js, to be confirmed in `docs/decisions/` (Phase 1)
- [Init]: Research outputs are machine-readable (`concept-map.json`, `roles.json`, `competencies.json`, `SOURCE_REGISTRY.json`); Markdown files are views
- [Init]: Watch Gym L1 clips come from open-data reconstructions plus the learner's local clips; YouTube is link-out only; no video stored
- [Roadmap]: Learner checkpoints are phase boundaries: research approval ends Phase 2, design-direction pick opens Phase 4
- [Phase 1]: Phase branch gsd/phase-1-setup-contracts; main renamed from master and fast-forwarded to guard commit; private repo ashayyan/the-next-klopp; branching_strategy=phase
- [Phase 1]: RouterProvider imported from react-router/dom; no react-router-dom; installs run with HUSKY=0 until Plan 04
- [Phase 1]: No allowScripts block: npm install-scripts ls reported no unreviewed install scripts (Vite 8 uses rolldown)
- [Phase 1]: 01-07: K-Dense curated 14-skill subset plus 3 design skills installed project-local (copy mode); offer-k-dense-web absent upstream v2.72.0; Opus overrides for research-synthesizer, ui-researcher, roadmapper; Fable manual only
- [Phase 1]: 01-08: agentmemory written via REST (MCP tools only appear in a new session); verify memory matches search hits by id against full memory content
- [Phase 2]: 02-15: SOURCE_REGISTRY.json frozen at 218 entries (5 id aliases); later phases only add sources
- [Phase 2]: 02-15: same_as overrides only for same work and edition (Bradbury PubMed=DOI, Pappalardo nature=PMC); jit seeds are unverified, licence unknown, type official-document not regulation
- [Phase 02]: ADR 0008: Watch Gym L1 supply is open-data reconstructions first, local files second, YouTube link-out only; every clip spec declares a reconstruction fallback
- [Phase 02]: ADR 0008: strict reading of StatsBomb 1.2.1, no StatsBomb-derived artifact ships; deny-manifest covers statsbomb, last-row, metrica, skillcorner; only Wyscout and DFL (CC BY) ship
- [Phase 02]: 02-17: roles.json frozen at the 15 canonical roles; competencies.json frozen at 49 role-neutral competencies over all 12 domains (scale 1 Aware to 4 Leads and teaches); concepts empty until 02-18 derive
- [Phase 02]: 02-18: Band 1 concept map holds 68 concepts (t00 12, t01 32, t02 8, t03 7, t04 9); Track 0 adds seven role-family concepts under role-map
- [Phase 02]: 02-18: prerequisites[] is the single source of truth; derive-links.ts fills prerequisite edges, concept.roles and competency.concepts and writes only on a parsed-value change
- [Phase 02]: 02-18: Thread starters role-map (layer 1) and one-question-clips (layer 2); max_starter_layer 5
- [Phase 02]: 02-19: Concept map covers all 29 tracks with 164 concepts (Band 2 at 3-6, Band 3 at 2-6 chapter umbrellas); longest chain 13 layers; no orphan competencies
- [Phase 02]: 02-19: Thread starters match-note-basics (t14, layer 2) and the-scouts-eye (t21, layer 4) complete the four early threads
- [Phase 02]: 02-19: Capstone split into football-department and club-leadership seat concepts so it follows every Part within 4 prerequisites
- [Phase 02]: 02-20: gaps.json splits domain 14 (a-c t21, d-f t22) and domain 20 (PL ecosystem, SPL pack); SPL row uses spl.com.sa and saff.com.sa URLs until a registry source exists
- [Phase 02]: 02-20: unknown_licence_sources lists all 82 unknown-licence sources cited by Tracks 0-4 or ADR 0008 plus 5 flagged later-track sources; gaps.test.ts derives the expected set
- [Phase 02]: 02-21: RSCH-06 approved under delegation, scoped to 64 Tracks 0-4 concepts; 4 seed-only Track 2 concepts (eighteen-zone-grid, five-vertical-lanes, half-spaces, four-superiorities) stay draft until domain 2 research
- [Phase 02]: 02-21: approval rule derived in approval.test.ts: approved iff APPROVAL.md approved, track t00-t04 and at least one verified cited source
- [Phase 3]: 03-01: Pitch stage is section[aria-label=Pitch stage][data-stage] (implicit region; Biome noRedundantRoles); Biome CSS tailwindDirectives on
- [Phase 3]: 03-01: canonical-root group carries orientation; pointer inverse via its getScreenCTM; tokens only in src/index.css (palette scan test)
- [Phase 3]: 03-02: Scene v1 frozen (schemas/scene.schema.json + Zod mirror); presence = entity.presence ?? (reconstruction ? sampled : always)
- [Phase 3]: 03-02: eventState window [t, tEnd ?? next event t ?? duration); StatsBomb scenes must be localOnly, not shippable, logoRequired
- [Phase 3]: 03-03: coords.ts ports kloppy 3.19.1 zone warp; landmarks.json (92 cases) generated by kloppy is the cross-language parity fixture; landmarks --check compares by parsed value
- [Phase 3]: 03-03: pipeline tests block sockets via autouse conftest; never call kloppy load_open_data
- [Phase 3]: Legend and glyph ids are derived from scene data; notes truncate to 40 characters with full text in the SVG desc
- [Phase 03]: Fetch keeps its own sha256-verified copy; a cached raw file is trusted only while it hashes to the pin, StatsBomb pinned by commit id in the URL
- [Phase 03]: Per-match extract cache stores input sha256 values and rebuilds when they differ; recipes declare extract_ids
- [Phase 03]: Dataset versions are content-addressed and never overwritten; publish copies only versions where manifest and allow-list both say shippable; run-all fetches only sources a registered recipe reads
- [Phase 03]: Playback clock is a per-scene vanilla zustand store with a pure tick; one rAF loop runs only while playing; keyboard map is a pure handler on the stage region; added --accent-ink token
- [Phase 03]: 03-08: deny-manifest is the single licence gate config; path.posix.matchesGlob used without picomatch (no warning on Node 24.21)
- [Phase 03]: 03-09: draggable handle lives in an interaction layer separate from the visible disc so pointer capture survives the dragged-on-top reorder
- [Phase 03]: 03-10: StatsBomb freeze-frame players are never scaled by hand; kloppy's event.freeze_frame carries the same piecewise 105 x 68 warp as the shot (linear scaling would be off by about 0.25 m)
- [Phase 03]: 03-10: dev scene loads end in a LoadResult and check the content type before parsing; local-only StatsBomb is read through a non-eager import.meta.glob inside the dev-only chunk
- [Phase 3]: 03-11: playback keeps the React selector render path (3.7-4.2 ms mean work, p95 16.8 ms in headless Edge on a Ryzen 9 7900X); imperative transforms are the escape hatch (ADR 0009)
- [Phase 3]: 03-11: ball owner offset fades over two disc diameters around the latest or next owner, so a ball in flight keeps its sampled path
- [Phase 3]: 03-11: npm run check:pitch is the real-browser gate for /dev/pitch until Playwright (Phase 5); CHECK_PITCH_PORT runs it beside a dev server holding 5173
- [Phase 4]: 04-01: duration.stagger-line emits --stagger-line; theme blocks reject unexpected keys; SYSTEM_INPUT is floodlit.tokens.json until 04-11
- [Phase 4]: 04-02: badge placement retries at 1.42x and 2x distance because a sloping travel puts the badge box on the start disc box corner at disc radius + 8 px; chip size constants live in placement.ts
- [Phase 4]: 04-03: palette gate adds highlight-ink and team-b-ink rows; notebook dark control-border is #6B7871 (3.04:1 on panel, was 2.99)
- [Phase 4]: Phase packages pinned only after an automated npm identity gate; fonts self-hosted byte for byte with generated OFL licence record
- [Phase 4]: review:screens judges thresholds in Node from plain page data; text on pitch glyphs is left to the palette gate; Git Bash route rewriting is undone via EXEPATH
- [Phase 4]: review:screens runs the taste skill with app-screen severities and all 22 rule checks; check.mjs gets a per-run Chrome profile closed through its DevTools port
- [Phase 4]: 04-07: floodlit 200/1fr/320 sits on the 12-column 32 px grid (2/7/3 columns) so the layout checker measures real column lines
- [Phase 4]: 04-07: DirectionScope mirrors data-direction and data-theme onto body so the page background and Base UI portals read the direction tokens
- [Phase 4]: 04-07: the formation morph is state = f(elapsed) in one rAF loop; readout, title and live region change at its end
- [Phase 4]: 04-08: ShellBar builds both theme menus from theme/onThemeChange; choosing a theme drops ?theme= so the choice shows
- [Phase 4]: 04-08: data-fill-edge plus one directions.css rule draws programme-light yellow fills with an ink edge, including portalled popups

### Pending Todos

- [Phase 2] Learner: open research/summary/index.html and confirm or re-open the research approval (non-blocking; approved by Claude under delegation 2026-11-27)

### Blockers/Concerns

- [Phase 2]: Open-data Premier League coverage and per-source terms of service are unverified; Watch Gym supply depends on the coverage matrix
- [Phase 5]: Vercel plan must support protection scope "All Deployments"; learner logs into Vercel and `gh` themselves
- [Later]: Local big-5 and Wyscout data paths not given; ask at the data-pipeline checkpoint before Track 15/18 work
- 01-09: GitHub Actions jobs do not start (account payment failed / spending limit). Learner must fix Billing & plans, then gh run rerun on PR #1; plan 01-09 task 3 pending

## Deferred Verification

| Phase | State | Resume |
|-------|-------|--------|

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-11-28T07:20:15.059Z
Stopped at: Completed 04-08-PLAN.md
Resume file: None
