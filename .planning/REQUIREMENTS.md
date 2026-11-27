# Requirements: The Next Klopp

**Defined:** 2026-11-27
**Core Value:** Every concept is shown, then touched, then practised in a short visual lesson grounded in real Premier League examples and traceable free sources, so a visual, ADHD learner actually builds professional-level football understanding.

**Scope of this requirement set:** Milestone 0 (foundations, Wave 1 research, design system, platform, golden lesson) and Milestone 1 (Track 0, Track 1, Watch Gym Level 1 — the learner starts studying). Later tracks are v2+ and get just-in-time research before they are built.

## v1 Requirements

### Setup and Toolchain

- [ ] **SETUP-01**: GSD Core, agentmemory, K-Dense Scientific Agent Skills and design skills (taste-skill v2 installed project-locally, frontend-design, web-design-guidelines, ui-ux-pro-max, a dataviz skill) are installed and verified against current READMEs, recorded in `docs/SETUP.md`; promotional skills (e.g. `offer-k-dense-web`) are disabled
- [x] **SETUP-02**: Model routing (brief §5) is configured and logged in `docs/SETUP.md`; `docs/FABLE_LOG.md` exists with the 4-step escalation protocol and the 3-per-milestone cap
- [x] **SETUP-03**: Private GitHub repo `the-next-klopp` exists with protected `main`, branch-per-phase PRs, conventional commits, and CI on GitHub Actions (lint, typecheck, unit tests, build, Windows smoke job)
- [x] **SETUP-04**: The first commit carries repo guards: `.gitignore` for raw/licensed data and secrets, `.gitattributes` with `eol=lf`, a large-file/path guard, secret scanning, and `.env.example`
- [ ] **SETUP-05**: The learner profile and project rules are stored in agentmemory (no raw research dumps)
- [ ] **SETUP-06**: Architecture decisions are recorded in `docs/decisions/` (Vite SPA vs Next.js, router, storage engine, Vercel scope, study/dev split, path-with-spaces handling)
- [x] **SETUP-07**: Shared contract schemas (source, concept, competency, role) exist in `/schemas` before research agents spawn

### Research (Wave 1)

- [ ] **RSCH-01**: Parallel research sub-agents cover the domains Milestone 0/1 needs (laws, pitch geometry, positions, formations, tactics history, how analysts watch, learning science for ADHD, role definitions, PL data sources, interactive explainer inspiration), each writing `findings.md`, `sources.json` and `visual_ideas.md` in `research/<domain>/`
- [ ] **RSCH-02**: A script-generated data-coverage matrix (provider × competition × season × data type) shows which open data actually contains Premier League matches
- [ ] **RSCH-03**: A Watch Gym L1 clip-supply decision is recorded (reconstruction from open data, learner local clips, YouTube link-out) with licensing checked
- [ ] **RSCH-04**: Synthesis produces machine-readable `research/SOURCE_REGISTRY.json` (with read / automated_access / redistribute / derivative licence fields), `concept-map.json`, `roles.json` and `competencies.json`, plus Markdown views (`CONCEPT_MAP.md`, `CURRICULUM_DRAFT.md`, `ROLE_COMPETENCIES.md`)
- [ ] **RSCH-05**: `research/GAPS.md` lists every domain deferred to just-in-time research with the track it must precede
- [ ] **RSCH-06**: The learner approves a short visual summary of the concept map and curriculum draft before DESIGN.md work begins

### Design System

- [ ] **DSGN-01**: 2–3 distinct visual directions are rendered as real screens (one tactics lesson, one data lesson) and screenshotted at 3 widths; the learner picks one
- [ ] **DSGN-02**: `docs/DESIGN.md` covers anti-slop rules, colour system (dark/light, team A/B, ball, zones, data scales) validated for colour-blind safety, typography, spacing, motion language, lesson templates, data-viz standards and the quality bar
- [ ] **DSGN-03**: Design tokens generated from DESIGN.md drive the app's Tailwind theme
- [ ] **DSGN-04**: A dev component gallery shows every primitive and interaction at 3 widths, with visual baselines generated in CI only

### Pitch Standard

- [ ] **PITCH-01**: One canonical pitch renderer (SVG + Canvas layer) draws standard dimensions and markings in canonical metres
- [ ] **PITCH-02**: Coordinate converters for StatsBomb, Opta, Wyscout and tracking coordinates pass landmark and round-trip tests verified against provider specs
- [ ] **PITCH-03**: Standard glyphs for players, ball, passes, carries, runs, pressure, zones and shapes are used everywhere, with an auto-generated notation legend always visible
- [ ] **PITCH-04**: A single Scene/Frame format describes authored visuals, saved boards, quiz answers and pipeline reconstructions

### Data Pipeline

- [ ] **PIPE-01**: `/pipeline` (Python 3.12, uv) downloads only allow-listed open sources, standardises them with kloppy, and writes small immutable versioned artifacts with a manifest
- [ ] **PIPE-02**: One npm script (e.g. `npm run data`) runs the pipeline on Windows with no `make`
- [ ] **PIPE-03**: Raw and licensed data never enter git or the Vercel bundle (size/licence gates enforced in CI)
- [ ] **PIPE-04**: At least one recipe turns an open-data sequence into a canonical Scene/Frame sequence the app can play

### Platform and App Shell

- [x] **PLAT-01**: The app runs on Windows localhost with one documented command, on a fixed port
- [ ] **PLAT-02**: The app shell has a home screen with one obvious next action, navigation by track/chapter, and a "What's new" changelog page
- [ ] **PLAT-03**: The app is deployed to the learner's Vercel account with Deployment Protection scope "All Deployments"; a smoke script proves production and preview URLs are not public
- [ ] **PLAT-04**: The deployed bundle contains no licensed raw data (deny-manifest check)

### Content Engine

- [ ] **CONT-01**: Each lesson is an MDX file plus a JSON spec (steps, components, data refs, quiz items, sources, prerequisites, role tags, duration, effort)
- [ ] **CONT-02**: A validator blocks shipping when a screen exceeds 60 words, Lesson Loop stages are missing or out of order, citations don't resolve to the source registry, prerequisites form a cycle, data refs are missing, or prose contains bare unsourced numbers
- [ ] **CONT-03**: An interaction registry gives every interaction a props schema, an accessibility fallback and a test oracle
- [ ] **CONT-04**: A generic Playwright walker completes every shipped lesson end-to-end with no per-lesson test code
- [ ] **CONT-05**: `<Fact>`, `<Rule>`, `<Stat>` and `<Contested>` components bind claims to registry entries or pipeline outputs; regulations show effective date and as-of date
- [ ] **CONT-06**: Shipped lesson, step and item IDs and data artifact versions are frozen; changes are additive

### Lesson Experience

- [ ] **LRN-01**: Every micro-lesson runs the Lesson Loop: hook, see it, touch it, predict then reveal, do it, lock it in (2–4 retrieval questions), connect it
- [ ] **LRN-02**: Learner can tap any term to open a visual glossary card
- [ ] **LRN-03**: Learner can turn on focus mode to hide everything except the current step
- [ ] **LRN-04**: Learner sees a time estimate per lesson and can resume from the last checkpoint
- [ ] **LRN-05**: Learner can answer by tapping on a pitch or arranging a shape, not only by multiple choice
- [ ] **LRN-06**: Learner can press "I'm confused here" on any screen; the location and note are saved to a local feedback file the build agents read
- [ ] **LRN-07**: Learner can use keyboard navigation, reduced-motion mode, colour-blind-safe palettes and captions throughout

### Progress and Motivation

- [ ] **PROG-01**: Progress, review queue, notes and feedback are stored locally (IndexedDB) and survive restarts; learner can export and import everything as JSON
- [ ] **PROG-02**: Retrieval answers feed a spaced-repetition queue (FSRS) whose daily reviews are capped; overflow is quietly rescheduled with no visible backlog
- [ ] **PROG-03**: Learner sees mastery rings, track badges and "days learned this month" alongside an all-time total; no streak exists anywhere in the data model
- [ ] **PROG-04**: Learner can start a 3–5 minute low-energy session with one tap; finishing it counts as a full day
- [ ] **PROG-05**: After any gap, learner sees a warm recap of where they were and one easy first step, never "you missed X days"
- [ ] **PROG-06**: Every prediction and Watch Gym answer is recorded per skill so an "eye improving" history can be shown later

### Golden Lesson

- [ ] **GOLD-01**: A tracer lesson passes through every layer (spec, MDX, data artifact, scene, interaction, citation, event, SRS card, feedback mirror, walker)
- [ ] **GOLD-02**: One fully polished golden lesson passes all quality gates and becomes the reference template for later lessons

### Track 0 — Start Here

- [ ] **T0-01**: Learner can take a short app tour explaining how lessons, reviews and low-energy mode work
- [ ] **T0-02**: Learner can take a placement diagnostic in short resumable chunks that tests basics (including "not sure yet"), produces a provisional known / shaky / new map with no score, and asks once about specialist PFSA courses
- [ ] **T0-03**: Learner can set personal goals on a goals page
- [ ] **T0-04**: Learner can explore a Role Map overview with a role card for each senior role in brief §7.1
- [ ] **T0-05**: Learner sees the learning loop explained visually

### Track 1 — The Game

- [ ] **T1-01**: Learner can study the Laws of the Game visually (including an interactive offside demo), pinned to the current IFAB edition and date
- [ ] **T1-02**: Learner can explore pitch geometry and markings on the Pitch Standard
- [ ] **T1-03**: Learner can learn positions and numbering using Premier League examples
- [ ] **T1-04**: Learner can morph between formations on a Tactics Board v1 (drag players, save and load scenes)
- [ ] **T1-05**: Learner can scrub an interactive history-of-tactics timeline
- [ ] **T1-06**: Every Track 1 chapter ends with a Watch Gym mission, a small write/speak task, and a "what would a scout look for here?" prompt

### Watch Gym Level 1

- [ ] **WG-01**: Learner can watch 10–30 second clips (open-data reconstructions or their own local files), each with one question
- [ ] **WG-02**: Learner answers on a schematic pitch panel beside the clip and sees the answer revealed
- [ ] **WG-03**: Learner can do a single Watch Gym clip as a low-energy session
- [ ] **WG-04**: The Watch Gym data model supports Levels 2–5 without schema changes

### Quality Gates

- [ ] **QA-01**: A separate verifier sub-agent, which did not write the lesson, checks every factual claim against fetched source text (Opus for metrics, regulations, finance)
- [ ] **QA-02**: Every lesson passes a taste-skill screenshot review at 3 widths and follows DESIGN.md
- [ ] **QA-03**: Every lesson passes accessibility checks (axe, keyboard, reduced motion, contrast) and the performance budget
- [ ] **QA-04**: Every lesson is tagged with the roles and competencies it serves; role coverage is reported at each milestone
- [ ] **QA-05**: E2E tests for every shipped lesson pass before merging; shipped chapters never break

## v2 Requirements

Deferred to later milestones. Each track gets just-in-time research before it is built.

### Watching, Writing, Speaking
- **WG-L2**: Watch Gym Levels 2–5 (sequences, condensed matches, halves, full 90 minutes with live notes)
- **WRT-01**: Write & Speak track (Track 14) with fading scaffolds, Report Writer and Speak-It Coach
- **EYE-01**: "My eye is improving" chart (needs ~20 recorded attempts)
- **REV-01**: Weekly review generated from weak spots

### Tactics, Coaching, Analysis
- **TAC-01**: Tracks 2–8 (space, phases, attacking, defending, transitions, set pieces)
- **ROLE-01**: Tracks 9–13 (roles, coaching, head coach, sports science, performance analysis)

### Data and AI
- **DATA-01**: Tracks 15–20 (data, metrics, stats by position, Python lab with Pyodide/DuckDB-WASM, football AI/ML, head of data science)
- **LOCAL-01**: Pipeline support for the learner's local big-5 event and Wyscout data (paths asked at the data checkpoint)

### Recruitment, Money, Leadership
- **REC-01**: Tracks 21–27 (scouting I/II, transfers and valuation, academy, sporting director, CEO, PL system + Saudi Pro League module)
- **CAP-01**: Track 28 capstone Club Simulator and per-role portfolios
- **ROLE-02**: Role readiness meter, role exams and portfolio status

## Out of Scope

| Feature | Reason |
|---------|--------|
| Losable streaks, hearts, XP, leaderboards, overdue counters, guilt copy | ADHD anti-patterns; brief §8 |
| Timed quizzes, hard locks, autoplay, placement scores | Pressure and gating hurt this learner (research FEATURES.md) |
| Copyrighted video stored in the repo or overlays on YouTube iframes | Licensing; no camera homography on embeds |
| FBref advanced stats | Opta stats removed 2026-01-20 (research PITFALLS.md) |
| Scraping sites whose ToS forbid it | Brief §2.2 |
| Accounts, cloud sync, multi-user | Single learner, local-first |
| Translation / non-English UI | English only (brief §1) |
| Mental-health content | Learning tool, not therapy (brief §1) |
| General data-science course | Separate course covers it (brief §1) |
| Public deployment | Deployment Protection must cover all deployments |

## Traceability

Populated during roadmap creation (2026-11-27). Each requirement maps to exactly one phase: the phase that first builds and enforces it. QA-01 to QA-05 are standing gates for every lesson, so lessons in Phases 7 and 8 must pass them.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Pending |
| SETUP-02 | Phase 1 | Complete |
| SETUP-03 | Phase 1 | Complete |
| SETUP-04 | Phase 1 | Complete |
| SETUP-05 | Phase 1 | Pending |
| SETUP-06 | Phase 1 | Pending |
| SETUP-07 | Phase 1 | Complete |
| PLAT-01 | Phase 1 | Complete |
| RSCH-01 | Phase 2 | Pending |
| RSCH-02 | Phase 2 | Pending |
| RSCH-03 | Phase 2 | Pending |
| RSCH-04 | Phase 2 | Pending |
| RSCH-05 | Phase 2 | Pending |
| RSCH-06 | Phase 2 | Pending |
| PITCH-01 | Phase 3 | Pending |
| PITCH-02 | Phase 3 | Pending |
| PITCH-03 | Phase 3 | Pending |
| PITCH-04 | Phase 3 | Pending |
| PIPE-01 | Phase 3 | Pending |
| PIPE-02 | Phase 3 | Pending |
| PIPE-03 | Phase 3 | Pending |
| PIPE-04 | Phase 3 | Pending |
| DSGN-01 | Phase 4 | Pending |
| DSGN-02 | Phase 4 | Pending |
| DSGN-03 | Phase 4 | Pending |
| DSGN-04 | Phase 4 | Pending |
| QA-02 | Phase 4 | Pending |
| CONT-01 | Phase 5 | Pending |
| CONT-02 | Phase 5 | Pending |
| CONT-03 | Phase 5 | Pending |
| CONT-04 | Phase 5 | Pending |
| CONT-05 | Phase 5 | Pending |
| CONT-06 | Phase 5 | Pending |
| PLAT-02 | Phase 5 | Pending |
| PLAT-03 | Phase 5 | Pending |
| PLAT-04 | Phase 5 | Pending |
| QA-01 | Phase 5 | Pending |
| QA-03 | Phase 5 | Pending |
| QA-04 | Phase 5 | Pending |
| QA-05 | Phase 5 | Pending |
| LRN-01 | Phase 6 | Pending |
| LRN-02 | Phase 6 | Pending |
| LRN-03 | Phase 6 | Pending |
| LRN-04 | Phase 6 | Pending |
| LRN-05 | Phase 6 | Pending |
| LRN-06 | Phase 6 | Pending |
| LRN-07 | Phase 6 | Pending |
| PROG-01 | Phase 6 | Pending |
| PROG-02 | Phase 6 | Pending |
| PROG-03 | Phase 6 | Pending |
| PROG-04 | Phase 6 | Pending |
| PROG-05 | Phase 6 | Pending |
| PROG-06 | Phase 6 | Pending |
| GOLD-01 | Phase 7 | Pending |
| GOLD-02 | Phase 7 | Pending |
| T0-01 | Phase 7 | Pending |
| T0-02 | Phase 7 | Pending |
| T0-03 | Phase 7 | Pending |
| T0-04 | Phase 7 | Pending |
| T0-05 | Phase 7 | Pending |
| T1-01 | Phase 8 | Pending |
| T1-02 | Phase 8 | Pending |
| T1-03 | Phase 8 | Pending |
| T1-04 | Phase 8 | Pending |
| T1-05 | Phase 8 | Pending |
| T1-06 | Phase 8 | Pending |
| WG-01 | Phase 8 | Pending |
| WG-02 | Phase 8 | Pending |
| WG-03 | Phase 8 | Pending |
| WG-04 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 70 total
- Mapped to phases: 70 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-11-27*
*Last updated: 2026-11-27 after roadmap creation (traceability populated)*
