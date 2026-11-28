# Phase 4: Design Direction & System - Context

**Gathered:** 2026-11-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 turns the approved research and the Phase 3 pitch into a locked visual system:

- 2–3 distinct visual directions, each rendered as a real tactics-lesson screen and a real data-lesson screen (using the Phase 3 `<Pitch>`, glyphs, legend and the published Wyscout scene), screenshotted at 375 / 768 / 1440
- the pick recorded in `docs/decisions/` (ADR 0010)
- `docs/DESIGN.md` covering brief §9.1–9.8 (anti-slop rules, foundations incl. colour system validated for colour-blind safety, typography, spacing/grid/radius/elevation/iconography, motion language, Pitch Standard, interaction component catalogue spec, lesson templates, data-viz standards, quality bar)
- design tokens generated from DESIGN.md that drive the Tailwind 4 `@theme` and the pitch tokens (change a token → regenerate → app and pitch change)
- a dev gallery `/dev/gallery` showing every primitive and interaction at 3 widths, with visual baselines generated only in CI on Linux
- a screenshot-review command that captures any screen at 3 widths and runs the taste-skill review against DESIGN.md, producing a pass/fail report (QA-02 mechanism)

No lessons, no content engine, no app shell beyond what the gallery and direction screens need.

Requirements: DSGN-01, DSGN-02, DSGN-03, DSGN-04, QA-02.

</domain>

<decisions>
## Implementation Decisions

The learner delegated every grey area and every checkpoint to Claude for this autonomous run ("choose all the recommended choices and close every grey area… even if there is human need you need to do it by yourself"). Each answer below is the recommended option.

### Visual directions and the pick (DSGN-01)
- Render exactly 3 directions, each on the same two real screens (tactics lesson: formation/shape scene on the canonical pitch with legend and a Lesson Loop step; data lesson: the Wyscout PL 2017/18 goal sequence with an event table/chart and a stat card). Directions are built with the taste-skill v2 direction library (`.claude/skills/design-taste-frontend/library`) and must each be genuinely distinct in idea, type, palette and composition — not three tints of one layout. Working names (final names chosen by the UI researcher): a dark "tactics room" direction, a light editorial "matchday print" direction, and a calm "analyst notebook" direction.
- Each direction lives behind a dev route `/dev/directions/:id/{tactics,data}` using a direction-scoped token set, so the same components render under each.
- Screenshots at 375, 768 and 1440 for all 6 screens are produced by the screenshot-review command (below) and reviewed by the taste-skill rubric.
- The pick: an independent Opus reviewer (a fresh agent that did not build the directions) scores the three against the brief (ADHD-friendly calm and focus, visual-first, anti-slop, PL-first, colour-blind safety, readability at 375) and the taste-skill rubric, and picks one. Recorded as `docs/decisions/0010-visual-direction.md` with the scores, screenshots paths and the line "picked by Claude under learner delegation; learner may override by asking". The learner's own look is a non-blocking follow-up in STATE.md. — **Reversibility:** costly — DESIGN.md, tokens and every later screen depend on it; override before Phase 5 lessons is cheap, after is expensive.
- Losing directions are kept as dev routes only until DESIGN.md is locked, then removed (gallery keeps only the chosen system).

### DESIGN.md and token source (DSGN-02, DSGN-03)
- `docs/DESIGN.md` is the human constitution; tokens live in a single fenced ```tokens JSON block inside DESIGN.md (DTCG-style: colour, typography, space, radius, elevation, motion, pitch, data scales, light + dark). — **Reversibility:** costly — every component consumes the generated variables.
- `scripts/design/build-tokens.ts` (Node, no tsx) parses that block and writes `src/styles/tokens.css` (Tailwind 4 `@theme` + `:root` / `[data-theme=dark]` custom properties, including the Phase 3 `--pitch-*`, `--team-a`, `--team-b`, `--ball-*`, `--zone-*` names so the pitch changes with no code edits). `--check` mode fails on drift; wired into `npm test`/CI. A test changes one token in a temp copy, regenerates, and asserts both an app element and a pitch element change computed style (headless check).
- Theme: light and dark both first-class; default follows `prefers-color-scheme`; a learner toggle persists per device (localStorage, wrapped in try/catch). — **Reversibility:** reversible.
- Colour-blind safety: `scripts/design/check-palette.ts` validates every categorical and sequential/diverging scale and team/ball/zone tokens in both themes (CVD simulation deuteranopia/protanopia/tritanopia minimum ΔE, WCAG contrast for text and UI ≥ 4.5:1 / 3:1), using the dataviz skill's validator approach; CI gate. Team distinction never relies on colour alone (Phase 3 shape rule stays).
- Fonts: self-hosted (no runtime CDN), open licence (OFL), WOFF2 subset; display + body + mono per DESIGN.md; licences recorded.
- Motion language: durations/easings as tokens; meaning table (player run, ball path, pressing arrow, UI transition); `prefers-reduced-motion` respected everywhere.

### Gallery and visual baselines (DSGN-04)
- `/dev/gallery` (dev-only, existing router gate) lists every primitive (buttons, inputs, toggles, cards/surfaces, tabs, dialogs, tooltip, stat card, chart primitives, legend, glyphs, pitch variants) and every interaction available so far (playback bar, drag, converter probe) with their states, at 3 widths via a width switcher and deep links.
- Visual regression with `@playwright/test` 1.65.1 (exact pin): tests tagged `@visual`, run only in a CI ubuntu job (or the official Playwright Docker image pinned to 1.65.1); Playwright config sets `updateSnapshots: 'none'` unless `CI` and an explicit `UPDATE_BASELINES=1` env from a manual `update-snapshots` workflow that commits Linux baselines. Local Windows runs never write baselines. — **Reversibility:** costly (new dependency).
- Component primitives: headless `@base-ui/react` 1.9.0 (per CLAUDE.md stack) styled with tokens — **Reversibility:** costly (new dependency; pick one, never mix with radix).

### Screenshot-review command (QA-02)
- `npm run review:screens -- <route> [--widths 375,768,1440]` starts/uses the preview server, captures each width (Playwright locally), and runs the taste-skill inspector/look-and-fix review scripts plus DESIGN.md rule checks (no hex outside tokens, banned patterns list, contrast, focus visible, no horizontal overflow, 44px targets) → `test-results/review/<route>/report.{md,json}` with pass/fail; non-zero exit on fail. Screenshots are artefacts, not committed.

### Decided autonomously
- [Layout] Q: "Where do design files live?" → Selected: "docs/DESIGN.md, scripts/design/, src/styles/tokens.css (generated), src/ui/ (primitives), src/routes/dev-gallery/, src/routes/dev-directions/" — cheap to move.
- [Tooling] Q: "Font files location?" → Selected: "public/fonts/ with a LICENSES.md" — static assets.
- [Process] Q: "Order?" → Selected: "directions → pick → DESIGN.md + tokens → primitives + gallery → baselines + review command" — natural dependency order.

### Claude's Discretion
- Direction names, exact palettes, type pairings and compositions (within DESIGN.md anti-slop rules and taste-skill v2 guidance).
- Which primitives are needed now vs later (cover everything Phases 5–8 obviously need: shell nav, lesson step frame, quiz option, glossary card, focus-mode toggle, confusion button, progress ring, badge).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 3: `<Pitch>`, `CanvasLayer`, glyph registry (17 ids), `Legend`, `SceneLayer`, playback bar + Zustand clock, drag hook, converter probe, `/dev/pitch`, placeholder tokens in `src/index.css` (`--pitch-*`, `--team-a #0072B2`, `--team-b #D55E00`, `--ball-*`, `--zone-*`, `--accent`), published Wyscout scene in `public/data/`, CDP browser-check harness `scripts/lib/cdp.ts` + `scripts/check-pitch-browser.ts`, screenshots at 320/375/768/1440.
- Phase 3 UI-SPEC + UI-REVIEW (19/24): open observations for Phase 4 — sequence badges cover numbers, note chips clip in vertical orientation, page/panel tones too close, type steps 12/14/16 close.
- Research: `research/interactive-explainers/findings.md` (teaching patterns, WCAG, Okabe-Ito), `research/learning-science-adhd/findings.md` (low-load, focus, no guilt), `research/how-analysts-watch/visual_ideas.md`.
- Skills: `.claude/skills/design-taste-frontend` (direction library, inspector, look-and-fix), `web-design-guidelines`, `ui-ux-pro-max`, global `frontend-design`, `dataviz` (palette validator).

### Established Patterns
- Generated files have `--check` mode and CI gates; dev-only routes behind `import.meta.env.DEV`; Node scripts run as `node file.ts`; CDP harness for headless Edge; `CHECK_PITCH_PORT` override (port 5173 may be held by a stray learner-owned dev server).

### Integration Points
- `src/index.css` placeholder tokens → replaced by generated `src/styles/tokens.css`.
- CI workflow gains a `visual` job (ubuntu, Playwright) and a manual `update-snapshots` workflow; branch protection's six required checks stay unchanged.

</code_context>

<specifics>
## Specific Ideas

- Brief §9.1: explicit do/don't lists with banned patterns (no generic gradient heroes, default card grids, emoji bullets, glassmorphism, stock striped pitches, default chart palettes).
- Brief §9.3: distinctive display family, highly readable body, mono for numbers.
- Brief §9.5 catalogue: specify purpose, inputs, learning goal, states, data, accessibility fallback per component (spec now; build later).
- Brief §9.6 lesson templates: concept, simulation, data lab, case study (scrollytelling), regulation, review, capstone.
- Pitfall from research: agents satisfy anti-slop lists literally yet look generic; same-agent screenshot review rubber-stamps → the pick and the QA-02 review use an independent reviewer.

</specifics>

<deferred>
## Deferred Ideas

- Figma sync / style-dictionary — only if wanted later.
- Building the §9.5 interaction components — Phases 5–8 and later tracks (Phase 4 specifies them).
- Learner's own visual review of the pick — non-blocking follow-up.

</deferred>
