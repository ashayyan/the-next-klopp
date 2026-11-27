# The Next Klopp

## What This Is

The Next Klopp (repo slug `the-next-klopp`) is a living, interactive, localhost-first web app that teaches one learner football from A to Z: the game, tactics, coaching, watching and analysing matches, scouting, data and AI, transfers, money, club strategy and governance. It is built for a Saudi-based data-science graduate with ADHD who wants a senior football career (long-term target: sporting director), and it uses the Premier League as the default reference league everywhere. It ships chapter by chapter, so the learner studies early chapters while later ones are still being built.

The full original brief is `NEW_PROJECT_INPUT.md` at the repo root (sections 0–16). This file condenses it; when in doubt, the brief is the authority, and section 16 ("Kickoff answers") overrides earlier sections where they conflict.

## Core Value

Every concept is **shown, then touched, then practised** in a short visual lesson grounded in real Premier League examples and traceable free sources, so a visual, ADHD learner actually builds professional-level football understanding, not just reads about it.

If everything else slips, this must hold: shipped lessons follow the Lesson Loop, are factually traceable, and are genuinely interactive.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Toolchain and project setup**
- [ ] GSD Core, agentmemory (rohitg00), K-Dense Scientific Agent Skills and the design skills (taste-skill v2, Anthropic frontend-design, Vercel web-design-guidelines, ui-ux-pro-max, a dataviz skill) are installed, verified against their current READMEs, and recorded in `docs/SETUP.md`
- [ ] Model routing (brief §5) is configured and logged in `docs/SETUP.md`; Fable usage follows the 4-step escalation protocol and is logged in `docs/FABLE_LOG.md` (max 3 Fable tasks per milestone)
- [ ] Private GitHub repo `the-next-klopp` exists (`gh repo create --private`), with branch-per-phase, PRs, CI on GitHub Actions, protected `main`, conventional commits and release tags per milestone
- [ ] The learner profile and project rules are stored in agentmemory; raw research dumps are not

**Phase 0 research sprint (before any lesson content)**
- [ ] Parallel research sub-agents cover every domain in brief §6.2 (1–22, including 12b stats by position, 14a–f scouting, 14b how analysts watch, 14c writing/speaking analysis, 15a–f transfers/valuation/salaries, 20–20h PL ecosystem and every senior role)
- [ ] Each domain writes `research/<domain>/findings.md`, `sources.json` (title, url, type, free, license, quality 1–5, recency, best-for, notes) and `visual_ideas.md`
- [ ] Opus synthesis produces `research/SOURCE_REGISTRY.json`, `research/CONCEPT_MAP.md`, `research/CURRICULUM_DRAFT.md`, `research/GAPS.md` and `research/ROLE_COMPETENCIES.md`
- [ ] Learner checkpoint: a short visual summary of concept map + curriculum draft is approved before DESIGN.md

**Design system**
- [ ] 2–3 distinct visual directions are rendered (one tactics lesson + one data lesson each, screenshots at 3 widths) and the learner picks one
- [ ] `docs/DESIGN.md` covers brief §9.1–9.8: anti-slop rules, foundations (colour-blind-safe colours, type, spacing, motion language), the Pitch Standard, the interaction component catalogue, lesson templates, data-viz standards and the quality bar
- [ ] One canonical pitch renderer with coordinate converters (StatsBomb, Opta, Wyscout, tracking) and a notation legend shown everywhere

**App platform**
- [ ] App runs on Windows localhost with one command (e.g. `npm run dev`), documented in the README
- [ ] Lessons are content-as-data (MDX + JSON spec: steps, components, data refs, quiz items, sources, prerequisites) and are validated before shipping
- [ ] Local progress, spaced-repetition queue, notes and feedback are stored locally (IndexedDB or local SQLite) with JSON export/import
- [ ] Vercel deployment with Deployment Protection on, preview deployments per PR, and no licensed raw data in the bundle
- [ ] Separate `/pipeline` Python package downloads open data, standardises it (kloppy), writes small versioned outputs; raw data is git-ignored; a Windows-friendly `make data` equivalent exists

**Learning experience (brief §8)**
- [ ] Every micro-lesson (5–12 min) follows the Lesson Loop: Hook → See it → Touch it → Predict → reveal → Do it → Lock it in → Connect it
- [ ] Max 60 words per screen, one idea per screen, tappable glossary terms, focus mode, time estimates, resumable checkpoints
- [ ] Honest gamification: mastery rings, badges, "eye improving" history, "days learned this month" — no losable streaks, no guilt mechanics, capped review queue after breaks
- [ ] Low-energy mode (one tap, 3–5 min session counts as a full day) and a warm welcome-back flow after any gap
- [ ] "I'm confused here" button on every screen saves location + note to a local feedback file the build agents read
- [ ] Accessibility: keyboard navigation, reduced motion, colour-blind-safe palettes, captions

**Milestone 0 and 1 deliverables (brief §11)**
- [ ] One fully polished "golden lesson" sets the quality bar
- [ ] Track 0 (Start here: app tour, placement diagnostic, goals page, Role Map, learning loop) is shipped
- [ ] Track 1 (The game: laws, pitch geometry, positions, formations, history-of-tactics timeline) is shipped
- [ ] Watch Gym Level 1 (10–30 s clips, one question each, answered on a pitch overlay) is shipped — the learner starts studying here

**Quality gates (brief §12) — every lesson**
- [ ] Facts: every claim maps to the source registry and is checked by a separate verifier sub-agent that did not write it (Opus for metrics, regulations, finance)
- [ ] Pedagogy, design (taste-skill screenshot review at 3 widths), data reproducibility, accessibility/performance, regulation date-stamps, licensing and role-coverage tags all pass
- [ ] Playwright E2E tests pass for every shipped lesson; shipped chapters never break

### Out of Scope

- Lesson content before the Phase 0 research checkpoint is approved — brief rule §2.1 / §15
- Pirated or copied paid material (books, PFSA paid courses) — legal and licensing rule §2.2; summarise ideas in own words and link instead
- Committing the learner's local datasets, licensed data, large raw data or secrets — rule §2.3; use download scripts + `.gitignore`
- Storing copyrighted video in the repo — use local files, legal YouTube embeds, official highlights, or animated reconstructions from open data
- A general data-science/ML course — a separate course covers it; only football-relevant stats/ML are taught, just in time
- Translation / non-English UI — English only
- Mental-health or therapy content — this is a learning tool, not a therapy tool
- Public deployment — Vercel Deployment Protection must stay on
- Using Fable 5.2 for code, components, lessons, design, tests, pipelines, routine research or parallel waves — §5.1

## Context

- **Learner:** lives in Saudi Arabia; long-term goal sporting director; also targets head coach, head of performance analysis, head of data science, head of recruitment, academy director, CEO/GM readiness (brief §7.1). Data-science graduate whose practical stats/ML basics are weak. Has worked with event data. Has a side project: a player-role / scouting model.
- **PFSA baseline (corrected in brief §16):** only Introduction and Level 1, long ago, rusty. The placement diagnostic must test basics, not skip them; at placement, ask once whether any specialist course was started.
- **Watching football is a core problem:** the learner can no longer sit through a match, often doesn't understand what they see, and can't turn a rewatch into analysis or a spoken talk. Watch Gym (Track 4) and Write & Speak (Track 14) rebuild this progressively and run through every chapter.
- **ADHD and visual learning:** learns by doing, seeing and touching. Energy varies day to day; always offer a 3–5 minute small win; never shame or pressure.
- **Never assume tactical vocabulary.** Define every term visually the first time it appears.
- **Premier League first:** PL teams, matches, players, finances and rules are the default examples and datasets. Other leagues only when they teach something the PL can't. A closing module applies it to the Saudi Pro League.
- **PL rules change often:** the new financial system (Squad Cost Ratio and Sustainability and Systemic Resilience, replacing PSR from 2026/27), EPPP, homegrown and work-permit rules must be verified against current official sources and date-stamped.
- **Curriculum spine:** Parts A–G, Tracks 0–28 (brief §7). Three threads never finish: Watch Gym, Write & Speak, Scouting. Study and build order follows the concept map, not track numbers. Watch Gym, Write & Speak, Scouting I and the Role Map start early.
- **Local data:** the learner has big-5 event data (2023, 2024; possibly StatsBomb/Opta) and ~5 seasons of Wyscout data on their Windows PC. Paths not given yet — ask at the data-pipeline checkpoint (before Track 15/18 work). Never commit it.
- **Seed sources:** brief §6.3 (StatsBomb open data incl. 360, Metrica, SkillCorner, DFL/Sportec, Wyscout public dataset, transfermarkt-datasets, kloppy, mplsoccer, socceraction, Soccermatics, Friends of Tracking, IFAB, FIFA RSTP, PL Handbook, Companies House accounts, etc.). Verify each license and current status.
- **Toolchain state at init (2026-11-27):** GSD Core 1.23.0 installed globally and working; Node v24, git 2.53, gh 2.102 present. An earlier claude.ai session could not install GSD (no network). The taste skill (`design-taste-frontend`) is a symlink into `~/.agents/skills`, which GSD's `agent_skills` path check rejects — reinstall it project-locally during setup.

## Constraints

- **Platform:** Windows PC, localhost first, one-command run — the learner's machine
- **Tech stack (suggested, lock via decision record):** TypeScript, React, Next.js or Vite, Tailwind with tokens from DESIGN.md; SVG/Canvas with D3 or visx; a motion library; WebGL only where needed; DuckDB-WASM and/or Parquet/JSON; Pyodide for the Python lab; Python 3.11+ with uv/venv for the pipeline; Playwright for E2E and screenshots — any change is justified in `docs/decisions/`
- **Sources:** free and legal only; respect each dataset's license and ToS (e.g. StatsBomb attribution); paraphrase, credit, link; record license in the registry
- **Traceability:** every factual claim traceable to the source registry; contested topics labelled contested with both sides shown
- **Design:** no AI-slop (no generic gradient heroes, default card grids, emoji bullets); follow DESIGN.md strictly
- **Model routing:** Opus 5.5 for architecture, curriculum spine, DESIGN.md, complex components, hard fact verification; Sonnet 5.5 for research sub-agents, lessons, most components, pipelines, tests; Haiku 5.5 for link checks, tagging, glossary, quiz variants, housekeeping; Fable 5.2 only by the §5.1 escalation protocol
- **Rolling release:** keep at least 2 chapters ahead of the learner; never break a shipped chapter; E2E must pass before merging
- **Communication:** ask the learner only at checkpoints (research approval, design-direction choice, data paths, Vercel login, irreversible decisions); otherwise decide, log in `docs/decisions/`, continue. Keep messages short and visual
- **Security:** never handle the learner's passwords; learner logs into Vercel/gh themselves; no secrets in repo (`.env.example` only)
- **Required tools:** GSD Core, agentmemory and K-Dense Scientific Agent Skills are mandatory; disable promotional skills like `offer-k-dense-web`

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Run `/gsd-new-project` in auto mode | Brief §16: skip GSD's interactive questioning; ask only at §14 checkpoints | — Pending |
| GSD model profile `balanced` | Closest to brief §5: Opus for planning/synthesis, Sonnet for research/execution | — Pending |
| Granularity `standard`, parallel execution, YOLO mode | Milestone 0+1 is large; brief asks for parallel waves | — Pending |
| UI phase, UI safety gate, design skills on UI agents and executor | Learner asked for UI/UX, frontend, motion and graphics agents to be active | — Pending |
| Premier League as default reference league | Most free data, writing, video and official documents | — Pending |
| Research before any lesson content | Brief rule §2.1; curriculum and DESIGN.md depend on it | — Pending |
| PFSA baseline treated as Intro + Level 1, rusty | Brief §16 correction | — Pending |
| Phase 0 research split: Wave 1 (what M0/M1 need) + just-in-time research at the start of each later track | Learner chose this on 2026-11-27 over the brief's full-sprint rule (§2.1/§6); full sprint risked a multi-month wait before first lesson. Rule "no lesson content before its research is approved" still holds per track | — Pending |
| Vite 8 SPA over Next.js (to confirm in `docs/decisions/`) | No server work; avoids hydration issues with local state; first-class workers/WASM (research STACK.md) | — Pending |
| Research outputs machine-readable (`concept-map.json`, `roles.json`, `competencies.json`, `SOURCE_REGISTRY.json`) with Markdown as views | Placement, mastery, Role Map and coverage checks need them (research ARCHITECTURE.md); amends brief §6 `.md`-only outputs | — Pending |
| Watch Gym L1 supply: reconstructions from open data + learner local clips; YouTube link-out only; no video stored | No legal clip supply otherwise; no overlay on iframes (research PITFALLS.md) | — Pending |
| Open questions for learner at checkpoints: study vs dev server split (D6), moving project to a path without spaces (D10) | Change the "one command" expectation / setup | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-27 after initialization*
