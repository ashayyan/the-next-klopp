# Project Research Summary

**Project:** The Next Klopp (repo slug `the-next-klopp`)
**Domain:** Interactive, visual-first football learning web app for one ADHD learner. Content-as-data lessons, local-first progress, a Python data pipeline. Windows, localhost-first, Vercel behind protection. Scope: Milestone 0 + 1.
**Researched:** 2026-11-27
**Confidence:** MEDIUM-HIGH (stack HIGH, architecture MEDIUM-HIGH, features/pitfalls MEDIUM)

## Executive Summary

This is a content-as-data learning product, not a content site. Every lesson is an MDX file plus a JSON spec. A custom script validates each lesson, and a generic runtime renders it from a registry of typed interactions. All interactions draw on one canonical pitch: 105×68 m, with one Scene/Frame language. Learner actions are an append-only event log in IndexedDB. A dev/study-server plugin mirrors that log to disk so build agents can read feedback.

Experts build this kind of app with strict contracts first: schemas, the pitch core and the interaction contract. A tracer lesson then runs through every layer, and the polished golden lesson follows. Components are built just before the first lesson that needs them.

**Recommended stack:**
- **App:** a client-only **Vite 8 + React 19 SPA**, not Next.js.
- **Language and tooling:** TypeScript 7 for type-checking only, and Biome for linting.
- **UI and state:** Tailwind 4 `@theme` tokens, Dexie, ts-fsrs, and D3 maths with React-owned SVG.
- **Pipeline:** a separate Python 3.12 pipeline (uv, kloppy, socceraction) that writes small, immutable, versioned artifacts with manifests.
- **Lazy loading:** DuckDB-WASM and Pyodide load lazily and stay out of M0/M1.

The ADHD profile sets the product rules:
- One idea per screen, 60 words max.
- Predict before reveal.
- A capped, quiet review queue.
- Low-energy mode and a welcome-back flow.
- No losable streaks, overdue counters or guilt copy.

**Main risks, most serious first:**
1. **Watch Gym L1 has no legal video supply, and open tracking data has no PL matches.** M1 must be deliverable from reconstruction plus the learner's local clips.
2. **The research sprint may never converge** and delay the learner for months.
3. **Licensing and data hygiene.** FBref lost its Opta advanced stats on 2026-01-20. Scraped sites are read-only. Licensed data must never reach git or Vercel.
4. **Hallucinated facts and stale regulations.** For example, the PL Squad Cost Ratio cap is 85%, not UEFA's 70%.
5. **Coordinate and direction bugs** across data providers.

Each risk has a mechanical prevention: the validator, manifest gates, converter fixtures, and `<Fact>`/`<Rule>` components. Build these before content scales.

## Key Findings

### Recommended Stack

Versions were read from npm and PyPI on 2026-11-27 and smoke-built on this Windows machine. Details are in `STACK.md`.

**Core technologies:**
- **Vite 8.4 + React 19.3 SPA.** The app has no server work: IndexedDB, WASM, workers and local files all run in the browser. A SPA avoids hydration mismatches. Vite has first-class module workers, which Pyodide 314 needs. Its dev/preview middleware hook carries the feedback bridge.
- **TypeScript 7.0.2 (tsc only) + Biome 2.6.9.** typescript-eslint does not support TS 7 yet. The fallback is TS 6.0.3.
- **Tailwind 4.3 (`@theme` tokens), `motion` 14, d3 sub-modules.** CSS tokens map to DESIGN.md. The Phase Animator computes `state = f(t)` from a Zustand store driven by rAF, not a tween timeline.
- **React Router 8 (library mode), Zod 4, `@mdx-js/rollup` 3.1.** Each lesson route loads lazily. A custom validator replaces Velite and similar tools.
- **Dexie 4.4 (IndexedDB) + ts-fsrs 6.0.1.** Typed tables, audio stored as Blobs, JSON export/import. Select FSRS-6 explicitly and store `modelVersion` on every card and log.
- **Python 3.12 + uv, kloppy 3.19, socceraction 1.5.3, pyarrow, duckdb, pydantic, Typer, pytest, ruff.** socceraction pins Python `<3.13`, pandas `<3` and numpy `<2`.
- **Playwright 1.65 + Vitest 5 + axe.** E2E tests run against `vite preview`. Visual baselines are generated only on CI Linux.
- **Lazy, exact-pinned, not needed for M1:** `@duckdb/duckdb-wasm@1.33.1-dev57.0`, `pyodide@314.0.8`.

**Critical constraints:**
- No COOP/COEP headers, because they break YouTube embeds.
- Set Vercel protection scope to **All Deployments**. Standard protection leaves production public.
- Use npm scripts only, no `make`.
- Use a fixed dev port, because IndexedDB storage is per origin.

### Expected Features

**Must have (table stakes, M0 + M1):**
- **Lesson engine:** lesson spec schema and validator, plus the Lesson Loop engine: stepper, resumable checkpoints, time estimates, focus mode.
- **Pitch:** the Pitch Standard renderer, its legend, and tap-on-pitch and arrange-the-shape primitives. These have the highest reuse.
- **Progress:** local persistence with JSON export/import, a capped and quiet SRS queue, progress rings, and a "days learned" count that is never shown resetting.
- **Learner support:** low-energy mode, the welcome-back flow, an "I'm confused here" button wired to the feedback path, and a home screen with one obvious next action.
- **Reference:** glossary cards, a minimal concept map, a source-traceability drawer, and an accessibility baseline.
- **Onboarding:** a placement diagnostic (results are provisional, and "not sure yet" is a first-class answer), a Role Map overview, a goals page, and an app tour.
- **M1 content:** the golden lesson; Track 1 (laws, pitch geometry, positions, formations, tactics timeline); and Tactics Board v1.
- **Watch Gym L1:** a mission card, answers given on a side pitch panel, and skill-tagged events.

**Should have (differentiators):**
- **Predict-then-reveal on a pitch** as the default interaction. It draws on the pretesting effect. Record every prediction.
- **"Eye improving" history** per skill, adjusted for difficulty. Capture the data in M1 and ship the chart after about 20 attempts.
- **Role tags on every lesson**, a concept map with "Connect it" links, and labels for contested claims.
- **Closed-loop confusion feedback** to the build agents.

**Defer (v2+):**
- The eye-improving chart, the weekly weak-spot review, and Watch Gym L2–L5.
- Write/Speak scaffolds, and the role readiness meter and exams.
- Python, ML and pitch-control labs, simulators, an AI tutor, and accounts or cloud sync.

**Anti-features (hard no):** losable streaks, hearts/XP/leaderboards, overdue counters, "you missed X days" messages, timed quizzes, hard locks, autoplay, placement scores, and copyrighted video in the repo.

### Architecture Approach

Three one-way flows that never mix:
- **Data:** sources → pipeline → versioned artifacts → DataClient → interactions.
- **Content:** spec + MDX → validator → lazy chunks → runtime.
- **Learner:** UI → typed event → local log → derived state, mirrored to `/feedback` for build agents.

Once a lesson ships, its lesson, step and item IDs and its artifact versions are frozen. Later changes are additive or get a new component ID.

**Major components:**
1. **Schemas (`/schemas`).** Zod/JSON Schema for source, concept, competency, role, lesson spec, Scene/Frame, event and manifest. The validator, app and pipeline all share them.
2. **Pitch core (pure TS) and renderer.** Canonical metres, branded coordinate types, converters, SVG and Canvas layers, and an auto-generated legend.
3. **Interaction registry.** `defineInteraction({propsSchema, Component, a11yFallback, testOracle})`, which lets one generic Playwright walker cover every lesson.
4. **Lesson runtime and validator.** A step state machine, checkpoints, the 60-word gate, and citation, prerequisite and data-reference checks.
5. **Learning engine (pure TS).** Event reducers, mastery, an FSRS wrapper, queue caps, and low-energy and welcome-back selection.
6. **Local store (Dexie), ServerMirror and dev/study-server plugin.** The mirror is absent on Vercel and is feature-detected.
7. **Pipeline (Python).** kloppy standardisation, derived data, size and licence gates, and immutable artifacts with a manifest.

### Critical Pitfalls

1. **Watch Gym has no legal footage supply.** Decide the clip strategy during research.
   - Primary: reconstruction on the canonical pitch from open event/360 data.
   - Secondary: the learner's local clips.
   - Tertiary: a plain YouTube embed with a link out.
   - Never overlay anything on an iframe, and never store video.
2. **"PL everywhere" clashes with free-data reality.** Open tracking data has no PL matches, and StatsBomb 360 covers only some tournaments. StatsBomb's open PL data is believed to be 2015/16 only; this is unverified. Generate a data-coverage matrix by script. The validator blocks a "Premier League" claim tied to a non-PL dataset unless it is labelled.
3. **Hallucinated facts and stale regulations.**
   - No bare numbers in prose: use `<Fact>`, `<Rule>` and `<Stat>` components bound to the registry or to pipeline artifacts.
   - The verifier must fetch source text, not rely on memory.
   - Regulation values carry an effective-from date, a status and an as-of date. SCR is 85% (PL) versus 70% (UEFA). PSR is history.
4. **Licensing and data in git.**
   - The registry gets four licence fields: `read`, `automated_access`, `redistribute`, `derivative_ok`.
   - The pipeline auto-downloads only from an explicit allow-list.
   - FBref advanced stats are gone as of 2026-01-20.
   - CI checks StatsBomb attribution.
   - The first commit carries `.gitignore`, a size/path guard and gitleaks.
5. **Coordinate and direction bugs.** Metres are canonical. Use branded types, landmark-fixture and round-trip tests per provider, and a left/right asymmetry test. Provider axis details are unverified, so encode them from the provider specs, not from memory.
6. **The research sprint never converges.** Give each domain a cap and a stop rule. Split the sprint into Wave 1 plus just-in-time research.
7. **Windows and ops.**
   - The project path contains spaces.
   - CRLF line endings and case-sensitivity break Linux builds.
   - Playwright baselines differ across operating systems.
   - The Vercel protection scope can be misconfigured; prove it with `curl -I`.

## Implications for Roadmap

### Cross-cutting decisions to surface

| # | Decision | Recommendation | Where it bites |
|---|----------|----------------|----------------|
| D1 | Vite SPA over Next.js | Use a Vite 8 SPA. Log it in `docs/decisions/` along with the router choice (React Router vs TanStack). | Setup |
| D2 | Watch Gym L1 clip supply | Make M1 deliverable from reconstruction plus the learner's local clips. YouTube is link-out only. Every clip declares a reconstruction fallback. | Research spike → Watch Gym |
| D3 | Data-coverage spike | Build a matrix of provider × competition × season × data type before promising any PL reconstruction. | Wave 1 research; gates D2 |
| D4 | FBref lost Opta stats on 2026-01-20 | Remove FBref from plans and the seed list, and record it as a removed source. | Research registry |
| D5 | Vercel protection set to All Deployments | Verify with `curl -I` on production and a preview, every milestone. | Platform / deploy |
| D6 | Study vs dev server split | `npm run study` serves shipped content only, on a fixed port. `npm run dev` is for agents and drafts. **Needs the learner's confirmation.** | Platform |
| D7 | Phase 0 research split (conflicts with brief §2.1/§6) | Wave 1 covers what M0/M1 need. Later domains are researched just in time, at the start of each track. **This is the learner's decision.** | Roadmap structure |
| D8 | Machine-readable concept map and role matrix | Research emits `concept-map.json`, `competencies.json`, `roles.json` and `SOURCE_REGISTRY.json` against schemas pinned before research agents spawn. Markdown is a view of these files. | Setup → Research |
| D9 | Tracer lesson before the golden lesson | An unpolished but complete lesson goes through every layer, then gets polished into the golden lesson. | Content engine → Golden |
| D10 | Project path has spaces | Quote every path, use Node/tsx scripts, and test a clean clone. A move is the learner's decision. | Setup |

### Suggested Phase Structure (provisional)

Each phase is listed with what it delivers and the pitfalls it prevents.

1. **Setup and contracts.**
   - Repo guards: `.gitignore`, `.gitattributes` with `eol=lf`, a size/path check, and gitleaks.
   - npm scripts and a CI skeleton with a Windows smoke job.
   - SETUP.md and decision records.
   - Stub schemas for source, concept, competency and role.
   - Project-local skills.
   - Avoids pitfalls 6, 17 and 19.
2. **Research Wave 1 (box-capped).**
   - Findings, sources and visual ideas for Tracks 0–1, Watch Gym L1 and roles.
   - The data-coverage matrix and the clip-strategy decision.
   - Machine-readable concept-map skeleton, role matrix and merged registry.
   - `GAPS.md`.
   - Learner checkpoint.
   - Resolves D2, D3, D4, D7 and D8.
3. **Pitch core and pipeline scaffold**, in parallel with the end of Phase 2.
   - `PitchSpace`, branded coordinates, converters, the Scene/Frame schema and fixtures.
   - The uv project, pydantic models, manifest writer and gates.
   - One StatsBomb recipe.
   - `reference_values.json`.
4. **Design directions and DESIGN.md.**
   - 2–3 directions, each with one tactics lesson and one data lesson at 3 widths; the learner picks one.
   - DESIGN.md, `tokens.css`, and a colour-blind check script.
5. **Design system, pitch renderer and app shell.**
   - The pitch layer API, built against three consumers: static markings, Tactics Board drag, and 22-player playback.
   - The shell, routing, DataClient and the dev/study plugin skeleton.
   - `/dev/gallery` and visual baselines generated on CI Linux.
6. **Content engine.**
   - Spec schema, MDX pipeline, validator, interaction registry, the generic walker, and `<Fact>`/`<Rule>`/`<Stat>`/`<Contested>` components.
7. **Progress system.**
   - Event schema, Dexie store, ServerMirror and reducers.
   - The ts-fsrs adapter and a capped queue.
   - Low-energy mode, welcome-back, and days learned.
   - Export/import with migrations, and the confusion button with its digest.
   - A schema test that bans `streak`.
8. **Tracer lesson, then golden lesson.**
9. **Deploy and protection proof.**
   - SPA rewrite, All Deployments protection and `.vercelignore`.
   - A `curl -I` smoke test and a dist deny-manifest.
10. **M1 Track 0 and Track 1, with components built just in time.**
    - Track 1 concepts, quiz types, Tactics Board v1, the timeline and the lessons.
    - Then the app tour, placement (3–4 chunks, confidence plus correctness), the goals page and Role Map v1.
11. **Watch Gym L1 and M1 hardening.**
    - `WatchGymPlayer`, the clip bank and mission cards, and a data model that anticipates L2–L5.
    - The low-energy clip, the coverage report, the shipped-content freeze, the release tag and What's New.

### Research Flags

Phases that need deeper research:
- **Phase 2:** Watch Gym supply, PL coverage, and per-source terms of service.
- **Phase 3:** Provider coordinate specs and metric reference values.
- **Phase 5:** A spike on the pitch layer API.
- **Phase 7:** FSRS-6 vs FSRS-7, and review-cap tuning.
- **Phase 9:** Vercel plan availability.
- **Phase 10:** Placement pedagogy.

Phases 1, 4, 6 and 8 follow standard patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions read live and smoke-built on Windows. MEDIUM on the DuckDB-WASM version, the FSRS model and Pyodide hosting. |
| Features | MEDIUM | The learning-science backbone is solid. ADHD-specific evidence is thin. |
| Architecture | MEDIUM-HIGH | The patterns are established. The provider coordinate table is unverified. |
| Pitfalls | MEDIUM | PL regulations, Vercel scopes, StatsBomb attribution and the FBref removal are verified. Third-party ToS and FIFA rules are not. |

**Overall confidence:** MEDIUM-HIGH. The technical path is clear. The real uncertainty is content supply (video, PL data) and research scope.

### Gaps to Address

- **PL coverage in open data:** build the coverage matrix in Phase 2.
- **Provider coordinate conventions:** encode them from the specs as fixtures in Phase 3.
- **Unread ToS and licences:** Transfermarkt, Understat, Capology, Wyscout, the StatsBomb LICENSE.pdf, and YouTube embed terms. Treat these sources as read-and-link only until cleared.
- **Learner decisions pending:** D6, D7 and D10.
- **Vercel plan:** verify the protection scope in the dashboard.
- **Starting defaults to tune with the learner:** review caps, placement length and queue settings.
- **Local data paths:** ask at the data-pipeline checkpoint.
- **Verifier design:** define the format of the registry excerpts the verifier works from, in Phase 2.

## Sources

### Primary (HIGH confidence)
- **Package versions:** npm registry and PyPI, read 2026-11-27.
- **Local smoke builds:** Windows 11, Node 24.21, uv, Python 3.12.10.
- **PL rules:** the official Premier League page on the new financial system.
- **Docs and releases:** Vercel Deployment Protection docs, Vite docs, the Pyodide 314 release post and the Vite 8 announcement.
- **Licensing:** the StatsBomb open-data README (attribution).
- **SRS:** the ts-fsrs README and guides.

### Secondary (MEDIUM confidence)
- **Learning science:** Dunlosky 2013, summaries of Mayer's multimedia principles, pretesting-effect papers, Zhao 2022 (football video training), gamification meta-analyses, and fading-scaffold studies.
- **Coordinates:** kloppy and mplsoccer coordinate docs.
- **FBref removal:** reports of the FBref/Opta removal.
- **Tooling:** TypeScript 7 announcement coverage, and DuckDB-Wasm docs vs its releases.

### Tertiary (LOW confidence)
- **Vendor and community:** the Duolingo streak blog, Anki backlog community posts, ADHD practitioner pages, and an arXiv preprint.
- **Unverified:** third-party ToS (not retrieved), dated Pyodide load-time figures, and tool feature pages.

Detail and links: `STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md`.

---
*Research completed: 2026-11-27*
*Ready for roadmap: yes (pending learner decisions D6, D7, D10)*
