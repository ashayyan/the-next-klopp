# Roadmap: The Next Klopp

## Overview

The Next Klopp is built in eight phases that take the project from an empty folder to a learner who is studying. Phase 1 fixes the toolchain, the guarded repo and the shared schemas. Phase 2 runs the Wave 1 research sprint and ends at the first learner checkpoint (approve the concept map and curriculum draft). Phase 3 builds the one canonical pitch and the open-data pipeline that feed a single Scene/Frame format. Phase 4 renders 2-3 visual directions, ends at the second learner checkpoint (pick one), then writes DESIGN.md, tokens and the component gallery. Phase 5 builds the content engine (MDX + JSON lessons, validator, claim components, Playwright walker, quality gates) and the app shell, and proves Vercel protection. Phase 6 builds the learner-facing runtime and the quiet, ADHD-safe progress system. Phase 7 pushes a tracer lesson through every layer, polishes it into the golden lesson, and ships Track 0 (Start Here). Phase 8 ships Track 1 (The Game) and Watch Gym Level 1, so the learner can study football and start training their eye.

Brief Milestone 0 ends with the golden lesson (first half of Phase 7). Brief Milestone 1 is Track 0 (second half of Phase 7), Track 1 and Watch Gym Level 1 (Phase 8). The learner can start studying as soon as Phase 7 ships.

The quality gates (QA-01 to QA-05) are standing gates for every lesson. Each is mapped to the phase that first builds its mechanism: QA-02 in Phase 4, QA-01, QA-03, QA-04 and QA-05 in Phase 5. Lessons in Phases 7 and 8 must pass all of them.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Setup & Contracts** - Verified toolchain, guarded private repo with CI, running app skeleton, decision records and shared schemas (completed 2026-11-28)
- [x] **Phase 2: Research Wave 1** - Parallel research, data-coverage matrix, clip-supply decision, machine-readable registry and concept map, learner approval checkpoint (completed 2026-11-28)
- [ ] **Phase 3: Pitch Standard & Data Pipeline** - Canonical pitch renderer, coordinate converters, glyphs and legend, Scene/Frame format, kloppy pipeline with licence gates
- [ ] **Phase 4: Design Direction & System** - 2-3 rendered directions, learner pick, DESIGN.md, tokens, component gallery, screenshot-review gate
- [ ] **Phase 5: Content Engine, App Shell & Deploy** - Lesson-as-data engine, validator, claim components, Playwright walker, quality gates, shell, protected Vercel deploy
- [ ] **Phase 6: Learner Experience & Progress** - Lesson Loop runtime, glossary, focus mode, confusion button, accessibility, local progress, capped FSRS queue, low-energy and welcome-back
- [ ] **Phase 7: Golden Lesson & Track 0** - Tracer lesson through every layer, polished golden lesson, app tour, placement diagnostic, goals page, Role Map
- [ ] **Phase 8: Track 1 & Watch Gym Level 1** - Laws, pitch geometry, positions, Tactics Board v1, tactics timeline, Watch Gym clips answered on a pitch panel

## Phase Details

### Phase 1: Setup & Contracts
**Goal:** As a learner who relies on Claude to build everything, I want to have a verified toolchain, a guarded private repo and a running app skeleton, so that every later phase builds on safe, reproducible foundations.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06, SETUP-07, PLAT-01
**Success Criteria** (what must be TRUE):
  1. `docs/SETUP.md` lists every required tool (GSD Core, agentmemory, K-Dense Scientific Agent Skills, taste-skill v2 installed project-locally, frontend-design, web-design-guidelines, ui-ux-pro-max, a dataviz skill) with the version verified against its current README, shows `offer-k-dense-web` as disabled, and records the model-routing table; `docs/FABLE_LOG.md` holds the 4-step escalation protocol and the 3-per-milestone cap.
  2. Learner runs one documented command (`npm run dev`) on Windows and opens the app skeleton at a fixed port; the same skeleton builds from a clean clone in CI, including a Windows smoke job.
  3. The private repo `the-next-klopp` exists with protected `main`, and a PR must pass lint, typecheck, unit tests, build and the Windows smoke job; a test commit containing a raw-data file, an oversized file or a fake secret is rejected by the repo guards (`.gitignore`, `.gitattributes` with `eol=lf`, size/path guard, secret scanning, `.env.example` present).
  4. Querying agentmemory returns the learner profile and the project rules, and no raw research dumps are stored in it.
  5. `docs/decisions/` holds a record for each of: Vite SPA vs Next.js, router, storage engine, Vercel scope, study/dev server split, path-with-spaces handling; `/schemas` holds source, concept, competency and role schemas that sample fixtures validate against, before any research agent is spawned.
**Plans**: 9/9 plans complete in 5 waves

Plans:
**Wave 1**
- [x] 01-01-PLAN.md — Guard-first commit on the phase branch, private repo created, branch-per-phase on (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — Pinned Vite/React/TS stack, home route on fixed ports 4173/5173, smoke script (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-03-PLAN.md — Biome + Vitest config, dev-only /dev and not-found routes, README one-command start (wave 3)
- [x] 01-07-PLAN.md — Project-local skills + K-Dense subset, agent_skills fix, model routing, FABLE_LOG, pipeline stub (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 01-04-PLAN.md — Guard tests, conventional-commit check, husky hooks proven by verify-setup (wave 4)
- [x] 01-05-PLAN.md — Source/concept/competency/role JSON Schemas, Zod mirrors, dual-validator fixtures test (wave 4)
- [x] 01-06-PLAN.md — ADRs 0001-0006 with a structure test (wave 4)
- [x] 01-08-PLAN.md — docs/SETUP.md toolchain record, learner profile and rules stored in agentmemory (wave 4)

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 01-09-PLAN.md — CI workflow, branch protection attempt + ADR 0007, Phase 1 PR with six green checks (wave 5)
**Research flag**: none (standard patterns). Two decisions need the learner's confirmation at the next checkpoint: study vs dev server split (D6) and moving the project to a path without spaces (D10).

### Phase 2: Research Wave 1
**Goal:** As a learner, I want to review and approve a short visual summary of the research Milestones 0 and 1 depend on, so that no design or lesson work starts on unverified football, licensing or learning-science ground.
**Mode:** mvp
**Depends on**: Phase 1 (schemas, repo, skills, agentmemory)
**Requirements**: RSCH-01, RSCH-02, RSCH-03, RSCH-04, RSCH-05, RSCH-06
**Success Criteria** (what must be TRUE):
  1. Every Wave 1 domain (laws, pitch geometry, positions, formations, tactics history, how analysts watch, learning science for ADHD, role definitions, PL data sources, interactive explainer inspiration) has `research/<domain>/findings.md`, `sources.json` and `visual_ideas.md`, and every `sources.json` entry validates against the source schema.
  2. A script-generated data-coverage matrix (provider x competition x season x data type) states for each cell whether Premier League matches exist, and a recorded Watch Gym L1 clip-supply decision names the chosen route (open-data reconstruction, learner local clips, YouTube link-out) with its licence evidence.
  3. `research/SOURCE_REGISTRY.json` (with read / automated_access / redistribute / derivative licence fields and a defined fetched-excerpt format the verifier can check), `concept-map.json`, `roles.json` and `competencies.json` validate against the schemas; `CONCEPT_MAP.md`, `CURRICULUM_DRAFT.md` and `ROLE_COMPETENCIES.md` regenerate from them; FBref advanced stats are recorded as a removed source.
  4. `research/GAPS.md` lists every domain deferred to just-in-time research together with the track it must precede.
  5. Learner reads a short visual summary of the concept map and curriculum draft and approves it (or sends feedback) before any DESIGN.md work begins.
**Plans**: 21/21 plans complete in 9 waves

Plans:
**Wave 1**
- [x] 02-01-PLAN.md — Research gate, seed source ids, excerpt hash CLI, research contract README (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02-02-PLAN.md — Coverage-matrix script (`klopp-pipeline coverage`), fixtures, committed PL matrix (wave 2)
- [x] 02-05-PLAN.md — Research: laws-of-the-game (wave 2)
- [x] 02-06-PLAN.md — Research: pitch-geometry (wave 2)
- [x] 02-07-PLAN.md — Research: positions-and-numbering (wave 2)
- [x] 02-08-PLAN.md — Research: formations (wave 2)
- [x] 02-09-PLAN.md — Research: tactics-history (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 02-03-PLAN.md — Graph library and Markdown view generator on fixtures (wave 3)
- [x] 02-10-PLAN.md — Research: how-analysts-watch (wave 3)
- [x] 02-11-PLAN.md — Research: learning-science-adhd (K-Dense skills) (wave 3)
- [x] 02-12-PLAN.md — Research: role-definitions (wave 3)
- [x] 02-13-PLAN.md — Research: pl-data-sources (licences, terms, coverage summary) (wave 3)
- [x] 02-14-PLAN.md — Research: interactive-explainers (inspiration audit, Okabe-Ito source) (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 02-04-PLAN.md — Self-contained summary page generator (dagre layout, CSP, five screens) (wave 4)
- [x] 02-15-PLAN.md — SOURCE_REGISTRY.json merge, aliases, just-in-time seeds (wave 4)

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 02-16-PLAN.md — ADR 0008 Watch Gym L1 clip supply with licence evidence (wave 5)
- [x] 02-17-PLAN.md — roles.json and competencies.json (wave 5)

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 02-18-PLAN.md — Concept map Band 1 (Tracks 0-4) and derive-links (wave 6)

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 02-19-PLAN.md — Concept map Bands 2-3 (Tracks 5-28) and thread starters (wave 7)

**Wave 8** *(blocked on Wave 7 completion)*
- [x] 02-20-PLAN.md — gaps.json and GAPS.md, generated views, real summary page, full gate (wave 8)

**Wave 9** *(blocked on Wave 8 completion)*
- [x] 02-21-PLAN.md — Independent Opus review, APPROVAL.md, Tracks 0-4 approved, memory verdicts (wave 9)

**Checkpoint**: learner approval (RSCH-06) gates Phase 4.
**Research flag**: needs deeper research on Watch Gym footage supply, Premier League coverage in open data, and per-source terms of service (Transfermarkt, Understat, Capology, Wyscout, StatsBomb LICENSE, YouTube embeds). Each domain gets a time/size cap and a stop rule so the sprint converges.

### Phase 3: Pitch Standard & Data Pipeline
**Goal:** As a learner, I want one canonical pitch and a reproducible open-data pipeline that feed the same Scene/Frame format, so that every board, quiz and replay I see is geometrically correct and traceable to data.
**Mode:** mvp
**Depends on**: Phase 1 (schemas, repo guards); consumes Phase 2 findings (provider specs, coverage matrix) but does not wait for the RSCH-06 approval, since it does not touch DESIGN.md. Phases 2 and 3 can run in parallel.
**Requirements**: PITCH-01, PITCH-02, PITCH-03, PITCH-04, PIPE-01, PIPE-02, PIPE-03, PIPE-04
**Success Criteria** (what must be TRUE):
  1. A dev route draws the full pitch (standard dimensions and markings, canonical metres) with an SVG layer and a Canvas layer, and shows players, ball, passes, carries, runs, pressure, zones and shapes with the standard glyphs next to an auto-generated notation legend that is always visible.
  2. StatsBomb, Opta, Wyscout and tracking coordinate converters pass landmark and round-trip tests built from the provider specs, including a left/right asymmetry test, so the same landmark lands on the same spot of the pitch whichever provider it came from.
  3. `npm run data` runs the pipeline on Windows with no `make`: it downloads only allow-listed open sources, standardises them with kloppy and writes small immutable versioned artifacts with a manifest; raw data stays git-ignored, and CI fails when raw or licensed data, or an oversized file, is staged or would enter the bundle.
  4. At least one open-data sequence recipe produces a Scene/Frame sequence that plays back on the canonical pitch, and the same Scene/Frame format also holds a hand-authored board, a quiz answer and a reconstruction (one fixture of each renders).
**Plans**: 5/11 plans executed in 6 waves

Plans:
**Wave 1**
- [x] 03-01-PLAN.md — Canonical pitch renderer: Law 1 geometry, one view matrix, Pitch + CanvasLayer, tokens, dev-only /dev/pitch (wave 1)
- [x] 03-02-PLAN.md — Scene/Frame format v1: JSON Schema + Zod + integrity, presence semantics, f(t) sampler, four kind fixtures, pinned deps (wave 1)
- [x] 03-03-PLAN.md — Provider converters ported from kloppy 3.19.1 with a kloppy-generated parity fixture and pytest network block (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 03-04-PLAN.md — Glyph registry and glyphs, always-visible auto legend, every fixture kind on /dev/pitch (wave 2)
- [x] 03-05-PLAN.md — Pipeline allow-list fetch, Wyscout standardise, wyscout-goal recipe, pydantic Scene parity (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 03-06-PLAN.md — Immutable versioned artifacts with manifests, publish + catalog, `npm run data`, committed Wyscout scene (wave 3)
- [ ] 03-07-PLAN.md — Playback: Zustand clock, rAF loop, playback bar, keyboard, motion modes, 22-player stress scene (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 03-08-PLAN.md — Licence and size gates: deny-manifest, check-bundle, check-immutable, guard + .gitignore, CI wiring and pipeline job (wave 4)
- [ ] 03-09-PLAN.md — Drag spike on the board, keyboard nudge, converter probe, provider landmarks overlay (wave 4)

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 03-10-PLAN.md — Published artifact on /dev/pitch, load states, local-only StatsBomb freeze-frame recipe (wave 5)

**Wave 6** *(blocked on Wave 5 completion)*
- [ ] 03-11-PLAN.md — Headless Edge browser checks (backstops, screenshots) and ADR 0009 pitch layer API (wave 6)
**UI hint**: yes
**Research flag**: needs deeper research on provider coordinate specs (encode from the specs, not from memory) and metric reference values. Includes a spike on the pitch layer API against three consumers: static markings, Tactics Board drag, 22-player playback.

### Phase 4: Design Direction & System
**Goal:** As a learner, I want to pick a visual direction from real rendered screens and get a design system that enforces it, so that every lesson looks designed, accessible and consistent instead of generic.
**Mode:** mvp
**Depends on**: Phase 2 (approved research, RSCH-06), Phase 3 (pitch renderer used to render the directions)
**Requirements**: DSGN-01, DSGN-02, DSGN-03, DSGN-04, QA-02
**Success Criteria** (what must be TRUE):
  1. Learner opens 2-3 distinct visual directions, each a real tactics-lesson screen and a real data-lesson screen with screenshots at 3 widths, picks one, and the pick is recorded in `docs/decisions/`.
  2. `docs/DESIGN.md` covers anti-slop rules, the colour system (dark/light, team A/B, ball, zones, data scales) with a colour-blind-safety script that passes, typography, spacing, motion language, lesson templates, data-viz standards and the quality bar.
  3. Design tokens are generated from DESIGN.md and drive the Tailwind theme: changing a token and regenerating visibly changes the app and the pitch.
  4. A dev gallery (`/dev/gallery`) shows every primitive and interaction at 3 widths, and visual baselines are generated only by CI on Linux, never overwritten by a local run.
  5. A screenshot-review command captures any screen at 3 widths and runs the taste-skill review against DESIGN.md, producing a pass/fail report.
**Plans**: TBD
**UI hint**: yes
**Checkpoint**: learner picks the direction (DSGN-01) before DESIGN.md is written.
**Research flag**: none (standard patterns).

### Phase 5: Content Engine, App Shell & Deploy
**Goal:** As a learner, I want lessons authored as validated data that render in a navigable app protected on Vercel, so that every shipped lesson is traceable, tested, never public and never broken.
**Mode:** mvp
**Depends on**: Phase 4 (DESIGN.md, tokens, gallery), Phase 3 (Scene/Frame, pipeline artifacts), Phase 2 (source registry, roles)
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, PLAT-02, PLAT-03, PLAT-04, QA-01, QA-03, QA-04, QA-05
**Success Criteria** (what must be TRUE):
  1. A lesson written as an MDX file plus a JSON spec renders in the app, and the validator blocks shipping with a clear message for each of: a screen over 60 words, a missing or out-of-order Lesson Loop stage, a citation not in the source registry, a prerequisite cycle, a missing data ref, a bare unsourced number in prose.
  2. `<Fact>`, `<Rule>`, `<Stat>` and `<Contested>` show their source (regulations also show effective date and as-of date), and each registered interaction ships with a props schema, an accessibility fallback and a test oracle.
  3. The generic Playwright walker completes a fixture lesson end-to-end with no per-lesson test code and runs axe, keyboard, reduced-motion, contrast and performance-budget checks; CI blocks merging when any fails or when a frozen lesson, step or item ID or data artifact version changes non-additively.
  4. A lesson cannot be marked shippable without a verification record from a verifier other than its author (checked against fetched source excerpts) and without role and competency tags; a role-coverage report generates.
  5. Learner opens the home screen with one obvious next action, navigates by track and chapter, and reads the "What's new" page; the app is deployed to the learner's Vercel account with protection scope "All Deployments", a smoke script proves the production URL and a PR preview URL are not public, and a deny-manifest check fails the build if licensed raw data is in the deployed bundle.
**Plans**: TBD
**UI hint**: yes
**Checkpoint**: learner logs into Vercel and `gh` themselves; Claude never handles their passwords.
**Research flag**: needs deeper research on Vercel plan availability for the "All Deployments" protection scope (verify in the dashboard, then with `curl -I`).

### Phase 6: Learner Experience & Progress
**Goal:** As a learner with ADHD, I want a lesson runtime that guides me through the Lesson Loop and a quiet, honest progress system, so that I can study at any energy level without guilt or pressure.
**Mode:** mvp
**Depends on**: Phase 5 (content engine, shell, walker)
**Requirements**: LRN-01, LRN-02, LRN-03, LRN-04, LRN-05, LRN-06, LRN-07, PROG-01, PROG-02, PROG-03, PROG-04, PROG-05, PROG-06
**Success Criteria** (what must be TRUE):
  1. A lesson plays hook, see it, touch it, predict then reveal, do it, lock it in (2-4 retrieval questions), connect it, in that order, with a time estimate shown; the learner can tap any term for a visual glossary card, turn on focus mode to hide everything but the current step, answer by tapping a pitch or arranging a shape, and close and reopen the lesson to resume from the last checkpoint.
  2. Learner presses "I'm confused here" on any screen, the note and location are saved, and they appear in the local feedback file the build agents read; keyboard-only navigation, reduced-motion mode, colour-blind-safe palettes and captions work throughout the lesson runtime.
  3. Progress, review queue, notes and feedback survive a restart (IndexedDB); exporting to JSON and importing into a fresh profile restores everything; the learner sees mastery rings, track badges and "days learned this month" beside an all-time total, and a schema test proves no streak field exists anywhere.
  4. Retrieval answers feed an FSRS review queue with a daily cap; after a long break the overflow is quietly rescheduled and no backlog count is shown; every prediction and Watch Gym answer is recorded per skill.
  5. Learner starts a 3-5 minute low-energy session with one tap and finishing it counts as a full day; after any gap the learner sees a warm recap of where they were and one easy first step, never "you missed X days".
**Plans**: TBD
**UI hint**: yes
**Research flag**: needs deeper research on FSRS-6 vs FSRS-7 (store `modelVersion` on every card and log) and on review-cap tuning defaults to confirm with the learner.

### Phase 7: Golden Lesson & Track 0
**Goal:** As a learner, I want one fully polished golden lesson and a Start Here track that finds my starting point, so that I begin studying on a trusted quality bar with a map of my own gaps and goals.
**Mode:** mvp
**Depends on**: Phase 6 (runtime and progress), Phase 3 (Scene/Frame, data recipe), Phase 2 (concept map, roles)
**Requirements**: GOLD-01, GOLD-02, T0-01, T0-02, T0-03, T0-04, T0-05
**Success Criteria** (what must be TRUE):
  1. A tracer lesson passes through every layer (spec, MDX, data artifact, scene, interaction, citation, event, SRS card, feedback mirror, walker), and the walker proves it in CI.
  2. Learner plays the golden lesson start to finish in one short session; it passes every quality gate (separate-verifier fact check, taste-skill review at 3 widths, accessibility and performance, role tags, regulation date-stamps) and is recorded as the reference template for later lessons.
  3. Learner takes an app tour that explains how lessons, reviews and low-energy mode work, and sees the learning loop explained visually.
  4. Learner takes a placement diagnostic in short resumable chunks that tests basics (including "not sure yet"), ends with a provisional known / shaky / new map and no score, asks once whether any specialist PFSA course was started, and sets personal goals on a goals page.
  5. Learner explores a Role Map overview with one role card for each senior role in brief section 7.1.
**Plans**: TBD
**UI hint**: yes
**Research flag**: needs deeper research on placement pedagogy (3-4 chunks, confidence plus correctness, no score). The golden lesson topic is chosen at plan time; the first Track 1 lesson is a good candidate.

### Phase 8: Track 1 & Watch Gym Level 1
**Goal:** As a learner, I want to study the laws, pitch, positions, formations and tactics history and then train my eye on short clips, so that I can start learning football properly and begin rebuilding how I watch matches.
**Mode:** mvp
**Depends on**: Phase 7 (golden lesson template, Track 0), Phase 3 (pitch recipe for reconstructions), Phase 6 (runtime)
**Requirements**: T1-01, T1-02, T1-03, T1-04, T1-05, T1-06, WG-01, WG-02, WG-03, WG-04
**Success Criteria** (what must be TRUE):
  1. Learner studies the Laws of the Game visually, including an interactive offside demo pinned to the current IFAB edition and its date, and explores pitch geometry and markings on the Pitch Standard.
  2. Learner studies positions and numbering with Premier League examples, morphs between formations on Tactics Board v1 by dragging players and saves and loads scenes, and scrubs an interactive history-of-tactics timeline.
  3. Learner watches a 10-30 second clip (an open-data reconstruction or their own local file), sees one question, answers it on a schematic pitch panel beside the clip, and sees the answer revealed; a single clip also runs as a one-tap low-energy session; a fixture mission for Levels 2-5 validates against the Watch Gym data model with no schema change.
  4. Every Track 1 chapter ends with a Watch Gym mission, a small write/speak task and a "what would a scout look for here?" prompt.
  5. Every shipped Milestone 1 lesson (Track 0, Track 1, Watch Gym) passes the walker, the separate-verifier fact check and the screenshot review; the role-coverage report is generated, and the "What's new" page announces the milestone so the learner can start studying.
**Plans**: TBD
**UI hint**: yes
**Research flag**: none new (depends on the Phase 2 clip-supply decision and Wave 1 findings).

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8. Phases 2 and 3 are independent after Phase 1 and may run in parallel; Phase 4 waits for both.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Setup & Contracts | 9/9 | Complete    | 2026-11-28 |
| 2. Research Wave 1 | 21/21 | Complete    | 2026-11-28 |
| 3. Pitch Standard & Data Pipeline | 5/11 | In Progress | - |
| 4. Design Direction & System | 0/TBD | Not started | - |
| 5. Content Engine, App Shell & Deploy | 0/TBD | Not started | - |
| 6. Learner Experience & Progress | 0/TBD | Not started | - |
| 7. Golden Lesson & Track 0 | 0/TBD | Not started | - |
| 8. Track 1 & Watch Gym Level 1 | 0/TBD | Not started | - |
