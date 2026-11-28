# Phase 4: Design Direction & System - Research

**Researched:** 2026-11-28
**Domain:** design tokens to Tailwind 4, headless Base UI primitives, Playwright visual baselines (CI-only), palette validation maths, taste-skill screenshot review
**Confidence:** HIGH on stack, tokens, palette maths, CI. MEDIUM on the taste-skill integration (the installed skill is website-oriented; see Open Question 1).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

The learner delegated every grey area and every checkpoint to Claude for this autonomous run. Each answer below is the recommended option.

**Visual directions and the pick (DSGN-01)**
- Render exactly 3 directions, each on the same two real screens (tactics lesson: formation/shape scene on the canonical pitch with legend and a Lesson Loop step; data lesson: the Wyscout PL 2017/18 goal sequence with an event table/chart and a stat card). Directions are built with the taste-skill v2 direction library (`.claude/skills/design-taste-frontend/library`) and must each be genuinely distinct in idea, type, palette and composition, not three tints of one layout. Working names (final names chosen by the UI researcher): a dark "tactics room" direction, a light editorial "matchday print" direction, and a calm "analyst notebook" direction.
- Each direction lives behind a dev route `/dev/directions/:id/{tactics,data}` using a direction-scoped token set, so the same components render under each.
- Screenshots at 375, 768 and 1440 for all 6 screens are produced by the screenshot-review command and reviewed by the taste-skill rubric.
- The pick: an independent Opus reviewer (a fresh agent that did not build the directions) scores the three against the brief and the taste-skill rubric, and picks one. Recorded as `docs/decisions/0010-visual-direction.md` with the scores, screenshot paths and the line "picked by Claude under learner delegation; learner may override by asking". Non-blocking follow-up in STATE.md. Reversibility: costly.
- Losing directions are kept as dev routes only until DESIGN.md is locked, then removed.

**DESIGN.md and token source (DSGN-02, DSGN-03)**
- `docs/DESIGN.md` is the human constitution; tokens live in a single fenced ```tokens JSON block inside DESIGN.md (DTCG-style: colour, typography, space, radius, elevation, motion, pitch, data scales, light + dark). Reversibility: costly.
- `scripts/design/build-tokens.ts` (Node, no tsx) parses that block and writes `src/styles/tokens.css` (Tailwind 4 `@theme` + `:root` / `[data-theme=dark]` custom properties, including the Phase 3 `--pitch-*`, `--team-a`, `--team-b`, `--ball-*`, `--zone-*` names so the pitch changes with no code edits). `--check` mode fails on drift; wired into `npm test`/CI. A test changes one token in a temp copy, regenerates, and asserts both an app element and a pitch element change computed style (headless check).
- Theme: light and dark both first-class; default follows `prefers-color-scheme`; a learner toggle persists per device (localStorage, wrapped in try/catch). Reversibility: reversible.
- Colour-blind safety: `scripts/design/check-palette.ts` validates every categorical and sequential/diverging scale and team/ball/zone tokens in both themes (CVD simulation deuteranopia/protanopia/tritanopia minimum delta E, WCAG contrast for text and UI at least 4.5:1 / 3:1), using the dataviz skill's validator approach; CI gate. Team distinction never relies on colour alone.
- Fonts: self-hosted (no runtime CDN), open licence (OFL), WOFF2 subset; display + body + mono per DESIGN.md; licences recorded.
- Motion language: durations/easings as tokens; meaning table; `prefers-reduced-motion` respected everywhere.

**Gallery and visual baselines (DSGN-04)**
- `/dev/gallery` (dev-only, existing router gate) lists every primitive and every interaction available so far with their states, at 3 widths via a width switcher and deep links.
- Visual regression with `@playwright/test` 1.65.1 (exact pin): tests tagged `@visual`, run only in a CI ubuntu job (or the official Playwright Docker image pinned to 1.65.1); Playwright config sets `updateSnapshots: 'none'` unless `CI` and an explicit `UPDATE_BASELINES=1` env from a manual `update-snapshots` workflow that commits Linux baselines. Local Windows runs never write baselines. Reversibility: costly.
- Component primitives: headless `@base-ui/react` 1.9.0 styled with tokens. Reversibility: costly (pick one, never mix with radix).

**Screenshot-review command (QA-02)**
- `npm run review:screens -- <route> [--widths 375,768,1440]` starts/uses the preview server, captures each width (Playwright locally), and runs the taste-skill inspector/look-and-fix review scripts plus DESIGN.md rule checks (no hex outside tokens, banned patterns list, contrast, focus visible, no horizontal overflow, 44px targets) to `test-results/review/<route>/report.{md,json}` with pass/fail; non-zero exit on fail. Screenshots are artefacts, not committed.

**Decided autonomously**
- Layout: `docs/DESIGN.md`, `scripts/design/`, `src/styles/tokens.css` (generated), `src/ui/` (primitives), `src/routes/dev-gallery/`, `src/routes/dev-directions/`.
- Font files in `public/fonts/` with a LICENSES.md.
- Order: directions, pick, DESIGN.md + tokens, primitives + gallery, baselines + review command.

### Claude's Discretion
- Direction names, exact palettes, type pairings and compositions (within DESIGN.md anti-slop rules and taste-skill v2 guidance).
- Which primitives are needed now vs later (cover everything Phases 5-8 obviously need: shell nav, lesson step frame, quiz option, glossary card, focus-mode toggle, confusion button, progress ring, badge).

### Deferred Ideas (OUT OF SCOPE)
- Figma sync / style-dictionary, only if wanted later.
- Building the section 9.5 interaction components (Phases 5-8 and later tracks; Phase 4 specifies them).
- Learner's own visual review of the pick (non-blocking follow-up).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DSGN-01 | 2-3 distinct directions rendered as real screens, screenshotted at 3 widths, one picked | Direction scoping via `[data-direction]` + `@theme inline` (Tokens section); font file sizes and budgets per direction; `review:screens` capture recipe; ADR format constraints (`scripts/adr.test.ts`) |
| DSGN-02 | `docs/DESIGN.md` with all sections and a CVD-validated colour system | Palette maths (formulas, golden values reproduced with the dataviz validator); DESIGN.md heading assertion; DTCG deviation note |
| DSGN-03 | Tokens generated from DESIGN.md drive the Tailwind theme | Verified `compile()` probe of `@theme inline` / `@theme static`; generator rules; drift test; computed-style test via Playwright |
| DSGN-04 | Gallery at 3 widths, visual baselines in CI only | Playwright 1.65.1 config facts (`updateSnapshots`, `snapshotPathTemplate`), Docker tag verified, commit-back workflow pitfalls |
| QA-02 | Screenshot-review command with pass/fail against DESIGN.md | Verified behaviour of `check.mjs` and `copy-lint.mjs` on this machine; 22-check implementation notes; spec conflict flagged |
</phase_requirements>

## Summary

Nothing in this phase needs a new architecture. It is five pieces of tooling plus a visual decision: a token generator (`build-tokens.ts`), a palette gate (`check-palette.ts`), a Playwright visual suite that only runs on Linux CI, a screenshot-review CLI (`review:screens`), and primitives built on `@base-ui/react`. All seven pinned packages are on the registry at exactly the pinned versions and every font package reports `OFL-1.1`. The palette maths in the UI-SPEC reproduces exactly when run through the dataviz validator (checked this session: floodlit dark teams 24.4 protan / 27.4 normal, floodlit light 21.9 / 31.2), so the golden test is safe to write.

Four findings change the plan and were not in the UI-SPEC. (1) The installed taste-skill layout checker (`check.mjs`, skill version 2.5.1) is written for landing pages: on any page without a `.wrap` or `.container` inside `main` it returns the single finding `container: no .wrap` at every width (run on `/dev/pitch` this session), and on a page that has one it fires `edge-left` on every multi-column grid. The `taste-layout` FAIL check as written cannot pass. (2) A commit pushed by `GITHUB_TOKEN` does not start workflows, so the `update-snapshots` workflow will leave the pull request's required checks pending unless it dispatches `ci` itself. (3) `schemas/schemas.test.ts` demands a Zod mirror for every `*.schema.json` in `schemas/`, so the token schema must not live there. (4) The tokens block uses plain hex strings, which DTCG 2025.10 does not allow, so it is "DTCG-style" and the UI-SPEC's `$schema` key is not a DTCG property.

**Primary recommendation:** build in this order: tokens generator + palette gate (pure TS, Vitest, no browser) first, then direction routes, then the independent pick, then DESIGN.md and the real `tokens.css`, then primitives and gallery, then Playwright baselines and the review CLI. Treat the taste-skill layout check as advisory evidence (WARN) with a short ignore list, and keep every hard FAIL in the project's own DOM checks.

## Project Constraints (from CLAUDE.md)

- Platform: Windows PC, localhost first, one-command run. Path `E:\To become new klop` contains spaces: pass paths as argv arrays, never concatenated shell strings.
- Stack is Vite 8 SPA, React 19.3.1, Tailwind 4 (`@theme` in CSS, no `tailwind.config.js`), `motion`, Playwright, Vitest, Biome 2.6.9 (no ESLint), TypeScript 7.0.2 `tsc --noEmit` only. Any change is justified in `docs/decisions/`.
- Design: no AI-slop (no generic gradient heroes, default card grids, emoji bullets, glassmorphism); follow DESIGN.md strictly.
- Visual regression: baselines come from CI Linux only; Windows runs generate review screenshots as artefacts, not assertions.
- Base UI: pick one headless library, do not mix with Radix. No shadcn.
- npm scripts are the single entry point; no `make`; scripts in TS run by `node file.ts` (erasable syntax only) or `tsx`.
- `.gitattributes` `* text=auto eol=lf`: generated files must be written with `\n`.
- Security: no secrets in repo; learner logs into Vercel/gh. Repo is PUBLIC (verified `gh repo view`: PUBLIC).
- Model routing: Opus for the independent pick and DESIGN.md; Sonnet for components/tests; Haiku for housekeeping.
- GSD workflow enforcement: file edits go through a GSD command.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Token source of truth (DESIGN.md block) | Build tooling (Node script) | Docs | Generated CSS is the only runtime artefact; the app never reads DESIGN.md |
| Light/dark switching | Browser / Client (CSS custom properties + `data-theme`) | Inline script in `index.html` | Must run before first paint; no server |
| Theme persistence | Browser / Client (`localStorage`, try/catch) | n/a | Per-device, no backend (Phase 5/6 may move it to Dexie) |
| Font delivery | CDN / Static (`public/fonts/`) | Build script copies from devDependency tarballs | No runtime CDN; same-origin only (`font-local` check) |
| Primitives | Browser / Client (React + Base UI) | Tokens CSS | Headless behaviour from Base UI, all styling from tokens |
| Gallery width switching | Browser / Client (same-origin iframes at exact CSS width) | n/a | Real media queries only fire inside an iframe of that width |
| Visual baselines | CI (Linux container) | Repo (PNG baselines) | Fonts and anti-aliasing differ per OS; one baseline source |
| Screenshot review | Local Node CLI (Playwright + taste-skill scripts) | Dev server | Skills are git-denied (`.claude/skills/`), so this cannot run in CI |
| Palette validation | Build tooling (pure TS, Vitest + CI) | n/a | Computable; no browser needed |

## Standard Stack

### Core (new in this phase, all exact pins, verified live 2026-11-28)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@base-ui/react` | 1.9.0 | Headless a11y primitives | CLAUDE.md pick. MIT, deps `@babel/runtime`, `@base-ui/utils`, `@floating-ui/*`, `use-sync-external-store`; peers `react ^17 \|\| ^18 \|\| ^19`; `date-fns` and `@date-fns/tz` peers are optional (`peerDependenciesMeta`). No `postinstall`. [VERIFIED: npm registry, `npm view @base-ui/react@1.9.0`] |
| `@playwright/test` | 1.65.1 | Visual baselines, functional token test, review capture | CLAUDE.md pick. Apache-2.0, engines `node >=20`, no `postinstall` (browsers are not downloaded by `npm ci`). Bundles Chromium 159.0.8154.6 [VERIFIED: playwright-core 1.65.1 `browsers.json`] |
| `motion` | 14.14.0 | UI transitions, `useReducedMotion` (`motion/react`) | CLAUDE.md pick. MIT, depends on `framer-motion` 14.14.0; peers react 18 or 19. [VERIFIED: npm registry] |
| `@fontsource-variable/{mona-sans,geist-mono,archivo,martian-mono,newsreader,atkinson-hyperlegible-next,atkinson-hyperlegible-mono}` | 5.3.0 each (devDependencies) | Source of WOFF2 files to copy to `public/fonts/` | All report `OFL-1.1`, `latest` = 5.3.0, published 2026-07-19, no postinstall [VERIFIED: npm registry + `package-legitimacy`] |

Existing and reused: `tailwindcss` 4.3.5 (has a public `compile()` API, probe below), `zod` 4.6.7, `vitest` 5.1.2, `react-dom/server` (existing tests use `renderToStaticMarkup`), the CDP harness `scripts/lib/cdp.ts`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright bundled Chromium locally | `channel: "chrome"` (installed Chrome 159.0.8154.33, matches the bundled major) | No ~280 MB download on this machine. `%LOCALAPPDATA%\ms-playwright` holds chromium-1208 and -1234 from other projects, not the revision 1.65.1 needs. Use `channel` from env, default `chrome`, for local review and functional tests; CI uses the image's bundled Chromium [CITED: playwright.dev/docs/browsers: branded Chrome/Edge are selected with `channel`, never downloaded] |
| `@fontsource-variable/*` imports | copy WOFF2 via script (UI-SPEC decision) | Keeps `dependencies` empty and avoids Fontsource's family names (`Mona Sans Variable`). Keep the copy script |
| `style-dictionary` | own generator | Deferred by CONTEXT; own generator is about 300 lines and fits the `--check` pattern |

**Installation (executor):**
```bash
npm install --save-exact --save-dev @playwright/test@1.65.1 \
  @fontsource-variable/mona-sans@5.3.0 @fontsource-variable/geist-mono@5.3.0 \
  @fontsource-variable/archivo@5.3.0 @fontsource-variable/martian-mono@5.3.0 \
  @fontsource-variable/newsreader@5.3.0 @fontsource-variable/atkinson-hyperlegible-next@5.3.0 \
  @fontsource-variable/atkinson-hyperlegible-mono@5.3.0
npm install --save-exact @base-ui/react@1.9.0 motion@14.14.0
```
Local browser: none needed (uses installed Chrome). If the learner prefers the bundled one: `npx playwright install chromium` (cache in `%USERPROFILE%\AppData\Local\ms-playwright`). Playwright is a devDependency, so `npm audit --omit=dev` in the `lint` job is unaffected.

**Version verification:** `npm view <pkg> version` for each, all equal the pins; `motion` published 2026-11-13, `@playwright/test` 2026-11-13, `@base-ui/react` 2026-10-09 (modified dates from the registry).

## Package Legitimacy Audit

Ran `gsd-tools query package-legitimacy check --ecosystem npm ...` this session; `npm view <pkg> scripts.postinstall` printed nothing for the four non-font packages.

| Package | Registry | Age (latest publish) | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|---------------------|--------------|-------------|---------|-------------|
| `@base-ui/react` | npm | 2026-10-09 | 30.0M | github.com/mui/base-ui | OK | Approved |
| `motion` | npm | 2026-11-13 | 38.3M | github.com/motiondivision/motion | SUS (`too-new`: latest version under 30 days old) | Flagged. Well-known package (38M/wk, official repo, named in CLAUDE.md). Planner adds a `checkpoint:human-verify` only if the autonomous run's policy requires it; otherwise record in the plan that the SUS reason is release recency, not identity |
| `@playwright/test` | npm | 2026-11-13 | 134.0M | github.com/microsoft/playwright | SUS (`too-new`, same reason) | Flagged, same treatment. Exact pin 1.65.1 is CLAUDE.md's choice |
| `@fontsource-variable/mona-sans` | npm | 2026-07-19 | 140K | github.com/fontsource/font-files | OK | Approved |
| `@fontsource-variable/geist-mono` | npm | 2026-07-19 | 4.5M | same | OK | Approved |
| `@fontsource-variable/archivo` | npm | 2026-07-19 | 971K | same | OK | Approved |
| `@fontsource-variable/martian-mono` | npm | 2026-07-19 | 94K | same | OK | Approved |
| `@fontsource-variable/newsreader` | npm | 2026-07-19 | 811K | same | OK | Approved |
| `@fontsource-variable/atkinson-hyperlegible-next` | npm | 2026-07-19 | 288K | same | OK | Approved |
| `@fontsource-variable/atkinson-hyperlegible-mono` | npm | 2026-07-19 | 98K | same | OK | Approved |

**Packages removed due to SLOP:** none. **Flagged SUS:** `motion`, `@playwright/test` (recency only).
All names came from CLAUDE.md / UI-SPEC (the project's authoritative stack document, which cites registry reads), then were re-confirmed by the seam this session.

## Architecture Patterns

### System Architecture Diagram

```
docs/DESIGN.md  (one ```tokens block)           src/routes/dev-directions/tokens/<id>.tokens.json (x3, temporary)
        │                                                       │
        └────────────► scripts/design/build-tokens.ts ◄─────────┘
                         │  zod schema (tokens-schema.ts), alias resolve, hex check
                         ├──► src/styles/tokens.css          (:root + [data-theme=dark] + @media + @theme inline/static + @font-face)
                         └──► <id>.css  (--scope '[data-direction="<id>"]')
                                │
   scripts/design/check-palette.ts ◄── same JSON (WCAG + OKLab + Machado) ──► CI gate / Vitest golden test
                                │
src/index.css  @import "tailwindcss"; @import "./styles/tokens.css";
        │
        ├─► Tailwind utilities (bg-surface-page, text-ink, font-sans, text-body ...)  ──┐
        └─► pitch components: var(--team-a), var(--pitch-line) ... (unchanged code)  ───┤
                                                                                         ▼
      Routes (dev only):  /dev/directions/:id/{tactics,data}   /dev/gallery[/:primitiveId]
                                │                                   │
        scripts/review-screens.ts (Playwright, channel chrome)      tests/visual/*.visual.spec.ts (CI Linux only)
          ├ DOM checks (20 own checks, 3 widths x themes)             └ baselines tests/visual/__baselines__/*-linux.png
          ├ check.mjs (Chrome, own process)  → advisory layout findings         ▲
          └ copy-lint.mjs on extracted text → FAIL/WARN                  update-snapshots.yml (workflow_dispatch)
                  ▼                                                       commits PNGs, then dispatches ci
        test-results/review/<slug>/report.{json,md} + PNGs (git-ignored)
```

### Recommended Project Structure
```
docs/DESIGN.md                      # constitution + one ```tokens block (written after the pick)
docs/decisions/0010-visual-direction.md
scripts/design/
  build-tokens.ts  tokens-schema.ts  check-palette.ts  copy-fonts.ts  lib/color.ts  (+ *.test.ts)
scripts/review-screens.ts           # QA-02 CLI; imports scripts/design/lib/color.ts for contrast
src/styles/tokens.css               # GENERATED, excluded from Biome
src/ui/                             # primitives + icons/
src/routes/dev-gallery/  src/routes/dev-directions/
public/fonts/<family>/*.woff2  public/fonts/LICENSES.md
playwright.config.ts
tests/visual/gallery.visual.spec.ts  tests/visual/__baselines__/  tests/functional/tokens.spec.ts
.github/workflows/ci.yml (+ visual job)  .github/workflows/update-snapshots.yml
```

### Pattern 1: Tokens to CSS to Tailwind (verified by compiling)

Probe run this session against the installed `tailwindcss` 4.3.5 (`import { compile } from "tailwindcss"`), input:
```css
@theme inline { --color-ink: var(--ink); }
@theme static { --font-sans: "Mona Sans", sans-serif; --text-label: 14px; --text-label--line-height: 1.4; --radius-sm: 2px; }
@tailwind utilities;
```
Output (quoted):
```css
:root, :host { --font-sans: "Mona Sans", sans-serif; --text-label: 14px; --text-label--line-height: 1.4; --radius-sm: 2px; }
.rounded-sm { border-radius: var(--radius-sm); }
.bg-ink\/50 { background-color: var(--ink); @supports (color: color-mix(in lab, red, red)) { background-color: color-mix(in oklab, var(--ink) 50%, transparent); } }
.font-sans { font-family: var(--font-sans); }
.text-label { font-size: var(--text-label); line-height: var(--tw-leading, var(--text-label--line-height)); }
.text-ink { color: var(--ink); }
```
[VERIFIED: probe on installed tailwindcss 4.3.5] and consistent with [CITED: tailwindcss.com/docs/theme: "`@theme inline` ... the utility class will use the theme variable value instead of referencing the actual theme variable"; "By default only used CSS variables will be generated ... `@theme static`"].

Recommended generator layout (refines UI-SPEC "Parsing and generation rules"):
1. **Colours** (themed; `color`, `pitch`, `data` groups): plain custom properties on `:root` (light), `[data-theme="dark"]`, and `@media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) {...} }`, each with `color-scheme: light|dark`. Map into Tailwind with `@theme inline { --color-<key>: var(--<key>); --color-data-<key>: var(--data-<key>); }`. `inline` is mandatory for direction scoping: without it, `--color-ink: var(--ink)` is resolved on `:root` and a `[data-direction]` redeclaration of `--ink` would not reach the utilities (the Tailwind docs' parent/child example).
2. **Non-themed tokens** (font, text, radius, shadow, ease, space, duration, icon): one `@theme static { ... }` block holding the system values (emits them on `:root` and creates utilities). Direction scopes override the same property names inside `[data-direction="<id>"] { ... }`; utilities reference `var(--font-sans)` at the element, so the scoped value wins. Do not write `--font-sans: var(--font-sans)` in `@theme inline`: a name cannot map to itself. The UI-SPEC sentence "a `@theme inline` block maps ... plus `--font-*`, `--text-*`, `--radius-*`" should be implemented as `@theme static` for those. [ASSUMED: scoped override of `@theme static` vars works as described; the planner's first task should add a Vitest that compiles a generated CSS and asserts the utility output, as in the probe above]
3. `--space-*` is not a Tailwind namespace (spacing is the single `--spacing` multiplier), `--duration-*` and `--stagger-*` have no utility namespace either. Emit them as plain custom properties on `:root`, inside the `@theme static` block or `:root`, either works; keep Tailwind's default `--spacing: 0.25rem` (UI-SPEC: "default 4 px spacing utilities are kept").
4. Do not set `--text-*: initial`. `src/routes/dev.tsx` and others use `text-3xl`/`text-base`; resetting the namespace would silently drop those utilities. New token names `--text-label|body|heading|display` coexist with Tailwind's defaults. Optionally reset after migrating the dev pages.
5. `--check`: generate in memory, compare to the file, exit 1 with a one-line diff summary. Output must be byte-stable: fixed key order from the zod schema (not object insertion order), `\n` line endings, trailing newline.
6. Exclude `src/styles/tokens.css` (and any `<id>.css`) from Biome (`"!!src/styles/tokens.css"` in `biome.json` `files.includes`), otherwise `biome ci .` in the `lint` job reformats-fails the generated file. Also add it to `lint-staged` exclusions or let Biome's ignore cover it.
7. Note on `bg-ink/50`: Tailwind emits `color-mix(in oklab, var(--ink) 50%, transparent)` for opacity modifiers, so the computed colour is not a plain token hex. The `token-colours` review check must normalise computed colours (parse `rgb()`/`color(srgb ...)`, compare with alpha ignored) or the project bans opacity modifiers on token colours in `src/ui`. [ASSUMED: Chrome's computed value format for color-mix results; verify in the first review-CLI task]

### Pattern 2: Theme switch before first paint
Inline classic `<script>` in `index.html` `<head>` reads `localStorage["tnk:theme"]` (try/catch) and sets `document.documentElement.dataset.theme` to `light` or `dark` only when the stored value is one of those; for `system` or any failure it sets nothing, so the `prefers-color-scheme` media block applies. Matches the Tailwind docs' FOUC advice ("inlined in head") [CITED: tailwindcss.com/docs/dark-mode]. Add `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));` only if some component wants a `dark:` variant; the variable-swap design needs none [CITED: same page, data-attribute form].

### Pattern 3: Gallery states shown statically
Base UI exposes state as data attributes such as `data-checked`, `data-highlighted`, `data-pressed`, `data-starting-style`, `data-ending-style` and className/style as a function of state [CITED: base-ui.com/react/handbook/styling]. `:hover` and `:focus-visible` cannot be forced by attribute, so the primitives' CSS must mirror them: `:is(:hover, [data-state~="hover"])` and `:is(:focus-visible, [data-state~="focus-visible"])`. Define these once as Tailwind `@custom-variant`s (for example `@custom-variant hov (&:is(:hover, [data-state~="hover"]));`) and use them in `src/ui` so the matrix screenshot and real interaction use one rule. [ASSUMED: design recommendation, not from docs]

Portal stacking: add `isolation: isolate` to the app root element so popups sit above page content; on iOS 26+ Safari dialog backdrops need `position: absolute` and `body { position: relative }` [CITED: base-ui.com/react/overview/quick-start]. Import per component (`@base-ui/react/dialog`), tree-shakable.

### Pattern 4: Token-drives-app-and-pitch test (no Vite rebuild)
Functional Playwright spec (runs everywhere, not `@visual`): read the DESIGN.md/tokens JSON, change `pitch.light.team-a` and `color.light.surface-page` in memory, call the generator function, `page.addStyleTag({ content })` AFTER loading `/dev/gallery/pitch?bare=1` from the dev server, then assert `getComputedStyle` of a `[data-glyph="player-a"]` disc `fill` and of `body` `background-color` changed to the new values. The injected `:root{}` block comes later in the cascade with equal specificity, so it wins; use the light theme. This exercises the real components and the real generator without rebuilding the app. Pair it with a pure Vitest test that asserts `tokens.css` equals the generator output and that every Phase 3 name in the UI-SPEC "Required keys" list is present in both themes.

### Anti-Patterns to Avoid
- **Putting the token schema in `schemas/`**: `schemas/schemas.test.ts` line 74-81 lists every `*.schema.json` (except `common`) and asserts each has a Zod mirror in `contractSchemas` plus a fixtures file. A `design-tokens.schema.json` there fails the existing test. Keep the schema as Zod in `scripts/design/tokens-schema.ts`, and drop the `$schema` key from the block (DTCG defines none, see below).
- **Hex literals in `src/**/*.{ts,tsx}`**: none exist today (grep this session: zero matches). Keep it that way; the `no-hex-in-source` check enforces it.
- **`transition: all`**, `backdrop-filter`, gradients, uppercase tracked eyebrows (banned list in UI-SPEC).
- **Running `check.mjs` as a hard gate** (see Open Question 1).
- **Trusting `networkidle` on the Vite dev server** for screenshots: first load can trigger dependency re-optimisation and a full reload. Wait for an explicit readiness marker instead (`data-ready="1"` set after `document.fonts.ready` and scene load), and list new deps in `optimizeDeps.include`. [ASSUMED: Vite dev behaviour; mitigation is cheap]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible dialog, popover, tooltip, tabs, switch, slider, toggle-group, toast | Custom ARIA widgets | `@base-ui/react/<component>` (38 components in 1.9.0) | Focus trapping, roving tabindex, typeahead, portal layering are exactly where hand-rolled widgets fail |
| Screenshot diffing and baselines | Pixel compare script | `expect(page).toHaveScreenshot()` with `maxDiffPixelRatio` | Built in; `animations: "disabled"`, `caret`, `mask`, `stylePath` exist [VERIFIED: playwright 1.65.1 `types/test.d.ts` lines 252-276] |
| Vision-deficiency captures | Own colour matrices for screenshots | CDP `Emulation.setEmulatedVisionDeficiency` types `none, blurredVision, reducedContrast, achromatopsia, deuteranopia, protanopia, tritanopia` via `context.newCDPSession(page)` [VERIFIED: playwright-core 1.65.1 `types/protocol.d.ts:7529`, `types.d.ts:10388`] | The emulation is Chromium's own; use it for the reviewer's captures only. The numeric palette gate still uses Machado matrices |
| Font subsetting | pyftsubset | Fontsource's pre-split `latin` files | Already Latin-subset WOFF2 (sizes below) |
| Server for gallery frames | Custom static server | Vite dev server (`webServer.command`) | `/dev/*` is compiled out of `vite preview` (routes.ts `import.meta.env.DEV`) |
| Process spawning/cleanup on Windows | New launcher | `scripts/lib/cdp.ts` `launchBrowser`/`killTree` pattern and `check-pitch-browser.ts` `startVite` (`--bypass-lock` when port is not 5173) | Already handles `taskkill /T`, temp profiles, paths with spaces |

**Key insight:** the only genuinely custom code is the token generator, the palette maths and the review checks. Everything else has an owner library.

## Fonts (verified from the tarballs, `npm pack` into a scratch folder)

| Direction | Files to copy (Latin subset) | Size | Notes |
|-----------|-----------------------------|------|-------|
| `floodlit` | `mona-sans-latin-wdth-normal.woff2` (98,124 B); `geist-mono-latin-wght-normal.woff2` (23,128 B) | 121 KB | One Mona file serves display (125%) and body (100%): `wdth` 75-125%, wght 200-900 |
| `programme` | `archivo-latin-wdth-normal.woff2` (90,104 B); `martian-mono-latin-wght-normal.woff2` (23,556 B) or `-wdth-` (38,492 B) | 114 KB or 129 KB | Archivo `wdth` range is **62-125%** (spec uses 75%, inside range). Martian `wdth` 75-112.5%; tabular numerals do not need the width axis, take the `wght` file |
| `notebook` | `newsreader-latin-opsz-normal.woff2` (132,000 B) or `-wght-` (58,084 B); `atkinson-hyperlegible-next-latin-wght-normal.woff2` (33,996 B); `atkinson-hyperlegible-mono-latin-wght-normal.woff2` (17,752 B) | 184 KB with opsz, 110 KB without | opsz axis 6-72. 184 KB leaves 16 KB under the 200 KB budget; the UI-SPEC says "opsz auto" so keep the opsz file and CSS `font-optical-sizing: auto` (browser default) |

- Fontsource family names are `Mona Sans Variable`, `Archivo Variable`, `Newsreader Variable`, etc. The UI-SPEC token block names `Mona Sans`; the generator writes its own `@font-face { font-family: "Mona Sans"; ... }` from `font.*.$extensions.tnk.files`, so the copy script must not copy Fontsource CSS. Each `@font-face` for a variable font needs `font-weight: <range>` and, for width axes, `font-stretch: <range>` descriptors, otherwise `font-stretch: 125%` is clamped to 100%. Copy the ranges from each package's `wdth.css`: Mona `200 900` + `75% 125%`; Archivo `100 900` + `62% 125%`; Martian `100 800` + `75% 112.5%`; Newsreader `200 800`; Atkinson Next/Mono `200 800`; Geist Mono `100 900`. [VERIFIED: package `wdth.css` / `metadata.json` read this session]
- Latin unicode-range in Fontsource covers U+0000-00FF, U+2000-206F (curly quotes, en dash, ellipsis), U+2212 (minus) [VERIFIED: Mona Sans `wght.css` unicode-range]. It does not cover `≤`, `→` or `✓`. UI copy must not use them (icons are SVG; `arrow-suffix` already warns on `→`).
- Licence text: each package ships `LICENSE` (OFL text with the copyright line) and `metadata.json` `license.attribution` (exact copyright string). `copy-fonts.ts` should copy `LICENSE` to `public/fonts/<family>/OFL.txt` and generate `LICENSES.md` from `metadata.json`. Mona Sans carries Reserved Font Name "Mona": do not rename or modify the font files (subsetting by Fontsource is upstream; ours is a straight copy). [VERIFIED: Mona Sans LICENSE header read]
- Fonts live in `public/`, so `dist/` carries them; `check-bundle.ts` `assetFileBytes` limit is 5 MB per file, far above 132 KB. No deny-glob matches `fonts`. `guard-files.ts` allows `.woff2` (listed in `.gitattributes` as binary).
- Keep `font-display: swap` (UI-SPEC) and add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the display+body file of the chosen direction to protect CLS < 0.1. [ASSUMED: standard practice, measure in the first review run]

## Palette maths for `check-palette.ts`

All formulas below are read from the dataviz skill's `scripts/validate_palette.js` (353 lines, read this session, lines 52-153) and reproduce the UI-SPEC numbers. The skill lives outside the repo, so re-implement; do not copy its APCA block (MIT, Color.js) unless APCA is wanted (it is not).

- **WCAG relative luminance and contrast** [CITED: w3.org WCAG 2.2 "relative luminance"]: `c <= 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4`; `L = 0.2126 R + 0.7152 G + 0.0722 B`; `ratio = (Lhi + 0.05) / (Llo + 0.05)`.
- **OKLab** [CITED: Ottosson 2020, bottosson.github.io/posts/oklab]: from linear sRGB `l = cbrt(0.4122214708 r + 0.5363325363 g + 0.0514459929 b)`, `m = cbrt(0.2119034982 r + 0.6806995451 g + 0.1073969566 b)`, `s = cbrt(0.0883024619 r + 0.2817188376 g + 0.6299787005 b)`; `L = 0.2104542553 l + 0.7936177850 m - 0.0040720468 s`; `a = 1.9779984951 l - 2.4285922050 m + 0.4505937099 s`; `b = 0.0259040371 l + 0.7827717662 m - 0.8086757660 s`. **ΔE = 100 x Euclidean distance in OKLab.**
- **CVD simulation** [CITED: Machado, Oliveira, Fernandes 2009, IEEE TVCG 15(6)], severity 1.0, applied to **linear** RGB then clamped to [0, 1]:
  - protan `[[0.152286, 1.052583, -0.204868],[0.114503, 0.786281, 0.099216],[-0.003882, -0.048116, 1.051998]]`
  - deutan `[[0.367322, 0.860646, -0.227968],[0.280085, 0.672501, 0.047413],[-0.011820, 0.042940, 0.968881]]`
  - tritan `[[1.255528, -0.076749, -0.178779],[-0.078411, 0.930809, 0.147602],[0.004733, 0.691367, 0.303900]]`
  The validator's thresholds are calibrated to this exact model; do not swap in Viénot 1999.
- **Gates used by the UI-SPEC** [VERIFIED: validator source]: lightness band OKLCH L 0.43-0.77 light / 0.48-0.67 dark; chroma >= 0.10; CVD target ΔE >= 8 (floor 6, floor band is legal only with secondary encoding), minimum over protan and deutan on the pair list (`adjacent` default, `all` for teams and scatter-like use), tritan reported only; normal-vision floor >= 15 on the same pair list; contrast >= 3:1 vs surface. Ordinal ramps: monotone OKLCH L in either direction, adjacent ΔL >= 0.06, one hue (spread <= 40 degrees), lightest step contrast >= 2:1 vs surface.
- **Ordinal pitfall:** running the ordinal check on all five sequential steps FAILS by design for step 1 (`#D3ECE6` on `#F3F5F7` = 1.14:1; reproduced this session). The UI-SPEC says step 1 "may recede to the surface; steps 2-5 are the ordinal set". `check-palette.ts` must run `validateOrdinal` on steps 2-5 only.
- **Golden values reproduced this session** (validator CLI with `--pairs all`):
  - floodlit dark teams `#3A97DA,#C77F00` on `#182431`: worst CVD 24.4 (protan), normal 27.4, tritan 25.0, all PASS.
  - floodlit light teams `#0072B2,#D55E00` on `#FFFFFF`: worst CVD 21.9 (protan), normal 31.2, tritan 30.9, all PASS. (The UI-SPEC's "teams on pitch surface" uses `--pitch-surface` `#E9EEF2`; the figure matches to the printed precision.)
  Pin tolerance ±0.2 as the UI-SPEC says. The negative test (team B `#00A000` must fail) is valid: it leaves the lightness/chroma/CVD bounds.
- **What the script reads:** the same token JSON (`pitch.*`, `color.*`, `data.*`, both themes), builds the pair lists (teams: all pairs on `pitch-surface`; categorical 1-3: all pairs on `surface-page`; diverging poles; sequential 2-5), and the contrast table rows from the UI-SPEC "WCAG contrast" table (15 pair types x 6 sets). Provide `--markdown` to emit the validation table that DESIGN.md section 3.1 embeds, and `--json` for the test.

## Taste-skill integration (QA-02): what it really does

Verified by running the installed scripts this session (Windows, Chrome 159.0.8154.33):

| Fact | Evidence |
|------|----------|
| `check.mjs` launches its own headless Chrome (looks for `C:/Program Files/Google/Chrome/...`, `CHROME_PATH` override; **Edge is not tried**), serves files or takes `http(s)` URLs, takes `--sizes WxH,...`, `--json` prints an **array, one object per size**: `{ vw, vh, findings: [{ rule, where, detail }], size, overflowX }`. Exit 1 when any finding, 2 on failure. `--profile` must be a folder in the OS temp dir or `.taste-skill/` | `check.mjs` header and source read; run on `/dev/pitch` took about 50 s for 3 sizes |
| Run on the existing `/dev/pitch` route it returned exactly `[{"rule":"container","where":"page","detail":"no .wrap"}]` at 375, 768 and 1440 | `layout-check.js` line 56-57: `document.querySelector('main :is(.wrap, .container)') || document.querySelector('.wrap, .container')`; none found, returns early |
| With a `.wrap` present on a simple two-column app-like page it returned `screen-short`, `hero-fold` (x2) and, at 768 and 1440, `edge-left` for the second column's heading and paragraph | scratch page run this session |
| Finding ids it can emit: `container, bleed-one-side, edge-left, edge-right, hero-fold, lines, neighbour, neighbour-ground, one-sided, screen-height, screen-short, sparse, spill`, plus `overflow-x` added by `check.mjs`, and `hero-maxchars`/`hero-lines` only without `--no-stress` | grep of `layout-check.js` and `check.mjs` |
| `copy-lint.mjs` accepts `.html`, `.md`, `.txt` files (not stdin), `--kind software --json` prints `{ files: [{ words, findings: [{ sev: "FAIL"\|"WARN"\|"INFO", id, count, msg, fix, examples, hits, budget }], file, kind }], cross }`; exit 0 no FAIL, 1 any FAIL, 2 usage | run on a `.txt` of the tactics copy: one INFO (`copy-contrast`, "Without the"), exit 0 |
| `.claude/skills/` is a **denied path** in git (`scripts/lib/guard.ts` `DENIED_PREFIXES`), `.taste-skill/` is git-ignored | so `review:screens` cannot run in CI; it must exit 2 with a clear message when the skill folder is missing |

Consequences for the plan:
1. The UI-SPEC check `taste-layout` ("`check.mjs` returns no finding outside the ignore list", severity fail) is unsatisfiable as written. Recommended replacement: run `check.mjs` once per route at the primary theme only, give each direction/gallery page a `<main><div class="wrap">` root so the checker proceeds instead of short-circuiting, and treat its output as follows: FAIL only for `overflow-x` and `spill` (real defects); WARN for `edge-left`, `edge-right`, `one-sided`, `bleed-one-side`, `lines`, `sparse`; ignore, with reason "landing-page rule, not an app-screen rule", `hero-fold`, `hero-maxchars`, `hero-lines`, `screen-short`, `screen-height`, `neighbour`, `neighbour-ground`. Record the decision in ADR 0010 or the DESIGN.md quality bar. This keeps the QA-02 wording ("runs the taste-skill review") true while making the gate meaningful. The independent reviewer still looks at the screenshots against the taste rubric.
2. Cost: about 50 s per `check.mjs` invocation. Running it for 3 directions x 2 screens x 2 themes is 12 invocations (10 minutes); run it for the primary theme only (6 runs, about 5 minutes), keep DOM checks for both themes.
3. `copy-lint`: extract visible text in Playwright (`document.body.innerText`, minus elements under `[data-ui-sample]` if any) into a temp `.txt`, run `--kind software --json`, parse `files[0].findings`. FAIL ids fail, WARN ids warn, INFO ignored. Pass the path as an argv element (spaces in the repo path).
4. Playwright captures (3 widths x themes x `--states`) are the screenshots; `check.mjs`'s own `--shots` is not needed.

### Implementing the 22 checks (DOM checks in `page.evaluate`, math in Node)
- Return plain data from the page (`[{ selector, text, box, color, bgChain[] }]`) and compute ratios in Node with `scripts/design/lib/color.ts`, the same WCAG function as `check-palette.ts`. One implementation, two uses.
- `text-contrast`: walk each text node's element up the ancestors collecting `background-color` until an opaque one; composite alpha layers in Node. SVG text uses `fill`. Images/gradients as backgrounds are banned anyway. Thresholds from the UI-SPEC (>= 4.5, or >= 3 at >= 24 px, or >= 18.66 px at weight 600).
- `tap-size`: all `a, button, input, select, textarea, [role=button|tab|switch|checkbox|radio|slider|option], [tabindex]:not([tabindex="-1"])` outside running text; rect >= 44 x 44; nearest-neighbour gap >= 8 px. Exempt `a` inside `p, li` running text per the contract.
- `focus-visible`: `page.keyboard.press("Tab")` x 40, read `outline-width/style/color` and `box-shadow` of `document.activeElement`; compute 3:1 against the adjacent surface colour.
- `reduced-motion`: new context/page with `reducedMotion: "reduce"` (Playwright `use.reducedMotion`/`page.emulateMedia({ reducedMotion: "reduce" })` [VERIFIED: playwright-core types `reducedMotion?: null|"reduce"|"no-preference"`]), then `document.getAnimations()` must be empty or zero-duration, and `[data-glyph]` bounding boxes must not change over 500 ms with no input.
- `font-local`: `page.on("request")` asserts every URL host is `localhost`/`127.0.0.1`; `document.fonts.check('16px "<family>"')` for each family in the active token set, after `await document.fonts.ready`.
- `token-colours`: build the allowed set from the generated token JSON for the active theme (convert hex to `rgb(r, g, b)` strings), compare computed `color`, `background-color`, `border-*-color`, `fill`, `stroke`; allow transparent and alpha variants. See the `color-mix` note above.
- `banned-*` checks read computed styles (`background-image`, `backdrop-filter`, `transition-property`, `text-transform`+`letter-spacing`); `banned-emoji` uses the regex `\p{Extended_Pictographic}` on `innerText` and `aria-label` attributes; `no-hex-in-source` is one static scan (not per width) over `src/**/*.{ts,tsx}` excluding tests.
- Server handling: copy the `check-pitch-browser.ts` pattern. 5173 may be held by the learner's server (it is on this machine right now: HTTP 200). Use `REVIEW_PORT`; when the port is not 5173 start Vite with `--bypass-lock` (Vite 8 refuses a second dev server per project otherwise) and never stop a server the script did not start. Exit codes 0/1/2 as specified. Slugify the route for the output folder (strip everything outside `[a-z0-9-]`), no `..` from user input.
- Browser: `chromium.launch({ channel: process.env.REVIEW_CHANNEL ?? "chrome" })`; if Chrome is absent try `msedge`, then bundled. Exit 2 with the install hint when none works.

## CI design

Current `ci.yml` (read this session): six jobs `lint, typecheck, test, build, guards, windows-smoke`, branch protection requires exactly these six [VERIFIED: `gh api .../protection --jq .required_status_checks.contexts` returned `["lint","typecheck","test","build","guards","windows-smoke"]`]. Actions are pinned by SHA. Default workflow permissions in the repo are `read` [VERIFIED: gh api].

Pins to reuse (verified this session): `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7`, `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7` (both from `ci.yml`), and `actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2` (latest release `v7.0.2`, tag resolves to that commit).

**`visual` job (added to `ci.yml`, not to branch protection):**
```yaml
  visual:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    container:
      image: mcr.microsoft.com/playwright:v1.65.1-noble
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx playwright test --project=visual
        env: { HOME: /root }
      - if: ${{ !cancelled() }}
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with: { name: playwright-report, path: "playwright-report/\ntest-results/", retention-days: 14 }
```
- Tag `v1.65.1-noble` exists on MCR [VERIFIED: `https://mcr.microsoft.com/v2/playwright/tags/list` lists `v1.65.1-noble`, `v1.65.1-jammy`, `v1.65.1-resolute`, and `-amd64` variants]. The docs page I fetched still showed 1.64.1 examples, so rely on the tag list, not the page. Pin the image tag to the same version as the npm package; a mismatch makes Playwright unable to find browsers [CITED: playwright.dev/docs/docker].
- Docs say use `--ipc=host` locally, `options: --user 1001` in the CI container example, and `workers: process.env.CI ? 1 : undefined` [CITED: playwright.dev/docs/ci, /docs/docker]. Whether `HOME: /root` and root user are needed for `npm ci`/cache in the container is not stated in the docs; keep the default root user (matches Chromium `--no-sandbox` behaviour documented for root) and test the first run. [ASSUMED]
- `setup-node` inside a container job needs the container's Node to be compatible; the image ships Node but `setup-node@v7` with 24 overrides it. [ASSUMED: first CI run confirms]
- The Playwright `webServer` is the Vite dev server: `command: "npm run dev -- --host localhost"`, `url: "http://localhost:5173"`, `reuseExistingServer: !process.env.CI`, `timeout: 120000`. `strictPort` is already true in `vite.config.ts`.
- Keep CI fonts deterministic: because both baseline generation and comparison run in the same image, system-font fallback differences cannot appear; local Windows runs skip with `test.skip(!process.env.CI, ...)`.
- Do not cache Playwright browsers (the image has them) [CITED: playwright.dev/docs/ci: "Caching browser binaries is not recommended"].

**`playwright.config.ts` facts** [VERIFIED: playwright 1.65.1 `types/test.d.ts`]:
- `updateSnapshots?: "all"|"changed"|"missing"|"none"|"default"`. `default` creates missing snapshots but fails those tests; `none` updates nothing; `changed` rewrites only mismatching snapshots (and creates missing ones). The UI-SPEC expression `process.env.CI && process.env.UPDATE_BASELINES === "1" ? "all" : "none"` is valid. Prefer `"changed"` in the update workflow: baseline PNG churn in a public repo is permanent history, and `changed` rewrites only what moved.
- `snapshotPathTemplate` tokens include `{testDir}`, `{testFilePath}`, `{arg}`, `{ext}`, `{platform}` (= `process.platform`, so `linux`), `{projectName}`, `{testName}`. Use `snapshotPathTemplate: "{testDir}/visual/__baselines__/{arg}-{platform}{ext}"` so files read `button-dark-375-linux.png` and a `win32` run could never collide with them. With `-{platform}` in the name, a Windows run that somehow wrote snapshots would create `-win32.png` files; guard with a Vitest/`guards` rule that fails if any `*-win32.png` or `*-darwin.png` is tracked.
- `toHaveScreenshot` options exist: `animations: "disabled"`, `caret: "hide"`, `maxDiffPixelRatio`, `stylePath`, `scale`, `mask`. Use `animations: "disabled"`, `maxDiffPixelRatio: 0.002` per UI-SPEC.
- Projects: `functional` (no `@visual` tag, runs anywhere, `use.channel` from env) and `visual` (`grep: /@visual/`, CI only). Set `reducedMotion: "no-preference"` explicitly in `visual`; `colorScheme` is chosen per test via `?theme=`.
- 216 baselines (about 36 primitives x 2 themes x 3 widths) at 20-100 KB each is roughly 4-20 MB per full regeneration. `guards` caps one file at 5 MB (`MAX_FILE_BYTES`), fine. Keep to one screenshot per primitive x theme x width of the `?bare=1` page, as the UI-SPEC says.

**`update-snapshots.yml` (manual):**
- `on: workflow_dispatch` only; `permissions: { contents: write, actions: write }`; job `if: github.ref != 'refs/heads/main'`; same container and steps as `visual` with `env: { CI: "true", UPDATE_BASELINES: "1" }`, then `git add tests/visual/__baselines__/*-linux.png`, commit as `github-actions[bot]` with message `test(visual): update Linux baselines`, `git push`.
- **Pitfall:** "events triggered by the `GITHUB_TOKEN` will not create a new workflow run, with the following exceptions: `workflow_dispatch` and `repository_dispatch`" [CITED: docs.github.com/en/actions/concepts/security/github_token]. The pushed commit will not start `ci`, so the pull request's six required checks stay "Expected" on the new head SHA. Fix: final step `gh workflow run ci --ref "$GITHUB_REF_NAME"` with `GH_TOKEN: ${{ github.token }}` (needs `actions: write`); `ci.yml` already has `workflow_dispatch` and its comment documents this exact use. Check runs from a dispatched run attach to the head SHA under the same job names, which satisfies required checks.
- Public repo: only users with write access can dispatch. No `${{ }}` interpolation of untrusted input into `run:` (use `env:`), as `ci.yml` already does for `BASE`.
- Never run baseline generation on `main` or from a fork; a first-time baseline set must come from this workflow, so the first PR with `@visual` tests will fail the `visual` job until it runs once (expected; not a required check).

**`test` job and the browser:** `vitest run` runs on `ubuntu-latest`. Anything needing a browser must not be in Vitest (the existing `cdp.ts` `BROWSERS` list holds Windows paths only). Keep generator, palette, drift, derived-numbers and DESIGN.md-structure tests in Vitest (pure Node), and put every browser assertion in Playwright specs (`functional` project in the `visual` job on Linux, locally via installed Chrome). This also means the CI `test` job needs no change besides new test files being picked up by the existing `include` globs (`scripts/**/*.test.ts` already covers `scripts/design/`).

**Other CI/tooling touch points:** add `tests`, `playwright.config.ts` to `tsconfig.json` `include`; Biome lints them automatically; `vitest.config.ts` `include` does not match `tests/**`, so Playwright specs are not picked up by Vitest.

## Common Pitfalls

### Pitfall 1: The layout checker fails every app page
**What goes wrong:** `taste-layout` as specified is red on day one. **Why:** `check.mjs` is a landing-page checker (see table). **How to avoid:** the recommendation under "Consequences for the plan". **Warning signs:** a report whose only finding is `container`.

### Pitfall 2: Commit-back leaves required checks pending
See `update-snapshots.yml`. Dispatch `ci` at the end of the workflow.

### Pitfall 3: Fonts not loaded at screenshot time
**What goes wrong:** diffs from fallback fonts. **How to avoid:** before every `toHaveScreenshot`, `await page.evaluate(() => document.fonts.ready)` and assert `document.fonts.check('16px "<display family>"')`; also wait for the readiness attribute. Variable fonts with width axes only render if `@font-face` declares `font-stretch`; confirm the 125% display look in the first direction screenshot. [VERIFIED: font descriptors from package CSS; the render check is ASSUMED]

### Pitfall 4: Windows vs Linux rendering
Never compare across OS: Chromium text anti-aliasing and font hinting differ [CITED: playwright.dev/docs/test-snapshots: "For consistent screenshots, run tests in the same environment where the baseline screenshots were generated"]. The `{platform}` token in the baseline name and the `!CI` skip are the guard. Docker Desktop 29.7.2 is installed here (`docker info` answered), so an optional local run of the `v1.65.1-noble` image is possible for debugging, never for committing baselines (Windows file ownership and line endings aside, CONTEXT says CI only).

### Pitfall 5: Reduced motion and animations in screenshots
Emulate `reducedMotion: "reduce"` for the review capture and `animations: "disabled"` for baselines. The motion gallery demo is "paused by default" per UI-SPEC; ensure its paused frame is deterministic (no rAF-driven state at capture time).

### Pitfall 6: Dev server only
`/dev/*` routes are absent from `vite preview` and `vite build`. Every gallery/direction test and the review CLI use the dev server. First-hit compilation is slow: warm the route in `globalSetup` or rely on `webServer.timeout`.

### Pitfall 7: Biome and generated CSS
Exclude `src/styles/tokens.css` and per-direction CSS from Biome or `biome ci .` fails the `lint` job. Also `docs/DESIGN.md` is already excluded (`!!**/*.md`).

### Pitfall 8: Existing `--font-sans`/`--font-mono` in `src/index.css`
They are plain `:root` vars today and Tailwind's `font-sans` reads them. When tokens.css replaces the placeholder block, keep the names identical or `font-sans` silently falls back to Tailwind's default stack.

### Pitfall 9: Variable names colliding with Tailwind namespaces
`--text-*` creates font-size utilities, so `--text-display` yields `text-display`; this is intended. `--color-ink` creates `text-ink`/`bg-ink`/`border-ink`. A token key named like a default colour (`--color-red-500` style) is not planned. Check generated names against the default theme once (`white`, `black`, `accent` are not default Tailwind v4 colours, but `--radius-sm|md|lg` and `--shadow-*`/`--ease-*` override defaults on purpose).

### Pitfall 10: DTCG conformance
DTCG 2025.10 requires colour `$value` to be an object `{ colorSpace, components, alpha?, hex? }`; a plain hex string is not allowed, and `$schema` is not a defined property [CITED: designtokens.org/tr/2025.10/color, /format]. Dimensions `{ value, unit: "px"|"rem" }`, durations `{ value, unit: "ms"|"s" }`, `cubicBezier` four numbers with x in [0, 1], and `{group.key}` aliases to whole tokens are conformant as the UI-SPEC writes them. Decision for the plan: keep hex strings (they are readable and nothing external consumes the block), call it "DTCG-style" in DESIGN.md, validate with the Zod schema, remove `$schema`, and note the deviation in ADR 0010 or DESIGN.md section 3.7 so a future style-dictionary import knows to add a colour transform.

### Pitfall 11: ADR format is enforced
`scripts/adr.test.ts` requires file name `NNNN-kebab-title.md`, title `# 0010. <Title>`, sections `## Status` (first value one of Proposed|Accepted|Superseded|Deprecated), `## Context`, `## Decision`, `## Consequences`, `## Alternatives`, and a line `Reversibility: reversible|costly|one-way`. ADR 0010 must follow it. The UI-SPEC's delegation line and score tables go inside `## Decision`. [VERIFIED: `scripts/adr.test.ts` lines 15-47]

### Pitfall 12: Dependency on `.claude/skills/` for QA-02
Skills are not in git. `review:screens` and `check.mjs`/`copy-lint.mjs` exist only locally; CI cannot run QA-02. The Vitest suite should still test the review module's pure parts (report schema, slugging, severity mapping, contrast maths) with fixtures so CI covers the logic without the skill.

## Code Examples

### Machado + OKLab core (reimplementation skeleton; formulas from the validator source)
```ts
// scripts/design/lib/color.ts  (erasable TS, no deps)
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const hexToLin = (h: string): [number, number, number] =>
  [1, 3, 5].map((i) => toLin(Number.parseInt(h.slice(i, i + 2), 16) / 255)) as [number, number, number];
export function luminance(h: string): number {
  const [r, g, b] = hexToLin(h);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const MACHADO = { /* the three matrices listed above */ } as const;
export function oklab([r, g, b]: [number, number, number]): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
export function deltaE(h1: string, h2: string, kind?: keyof typeof MACHADO): number {
  const f = (h: string) => {
    const lin = hexToLin(h);
    if (!kind) return oklab(lin);
    const M = MACHADO[kind];
    return oklab(M.map((row) => clamp01(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2])) as [number, number, number]);
  };
  const [a, b] = [f(h1), f(h2)];
  return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
```

### Playwright config skeleton (facts verified above)
```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";
const ci = Boolean(process.env.CI);
export default defineConfig({
  testDir: "tests",
  snapshotPathTemplate: "{testDir}/visual/__baselines__/{arg}-{platform}{ext}",
  updateSnapshots: ci && process.env.UPDATE_BASELINES === "1" ? "changed" : "none",
  workers: ci ? 1 : undefined,
  retries: 0,
  expect: { toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.002, caret: "hide" } },
  use: { baseURL: "http://localhost:5173", channel: ci ? undefined : (process.env.REVIEW_CHANNEL ?? "chrome") },
  webServer: { command: "npm run dev", url: "http://localhost:5173/dev", reuseExistingServer: !ci, timeout: 120_000 },
  projects: [
    { name: "functional", grepInvert: /@visual/ },
    { name: "visual", grep: /@visual/ },
  ],
});
```

### Vision-deficiency capture (review CLI)
```ts
const cdp = await context.newCDPSession(page);
await cdp.send("Emulation.setEmulatedVisionDeficiency", { type: "deuteranopia" }); // or "achromatopsia"
await page.screenshot({ path, fullPage: true });
await cdp.send("Emulation.setEmulatedVisionDeficiency", { type: "none" });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwind.config.js` theme | CSS-first `@theme` / `@theme inline` / `@theme static` | Tailwind 4 | Tokens generator writes CSS, no JS config |
| Fontsource CSS imports at runtime | copy the Latin WOFF2 and write own `@font-face` | project decision | Own family names, `font-local` check, no Fontsource CSS in the bundle |
| Playwright `updateSnapshots` implicit | explicit `"all"|"changed"|"missing"|"none"|"default"` | current in 1.65.1 | `default` creates-but-fails missing snapshots; use `none` to forbid local writes |
| `motion` vs `framer-motion` package | `motion` 14.14.0 depends on `framer-motion` 14.14.0, import from `motion/react` | current | One import path; `useReducedMotion` available |

**Deprecated/outdated:** DTCG drafts with hex strings (2025.10 requires colour objects); Base UI predecessor `@mui/base` (not used).

**`motion` scope note:** UI transitions are specified as CSS `transition` on `opacity`/`transform` with Base UI `data-starting-style`/`data-ending-style`, and the formation morph is Phase 3's `state = f(t)` clock. The phase therefore needs `motion` only for `useReducedMotion` in one or two components. Install it (it is in the UI-SPEC and CLAUDE.md), import only from `motion/react`, lazy where used, and watch the initial-route JS budget (180 KB gzip). [ASSUMED: planner may decide `matchMedia` suffices and skip it; that deviates from the UI-SPEC dependency list, so flag in the plan]

## Runtime State Inventory

Not a rename/migration phase. Two items resemble runtime state:

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `localStorage` key `tnk:theme` (new). No existing key is renamed | none |
| Live service config | None. Branch protection (six checks) must stay unchanged | do not add `visual` to required checks |
| OS-registered state | None | none |
| Secrets/env vars | `REVIEW_PORT`, `REVIEW_CHANNEL`, `CHROME_PATH`, `UPDATE_BASELINES` (new, not secrets) | document in `docs/DESIGN.md` quality bar / README |
| Build artifacts | `src/index.css` placeholder `:root` block is deleted; `dist/` unaffected | regenerate after the swap |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | all scripts (`node file.ts`) | yes | v24.21.0 | none needed |
| Google Chrome | review capture, `check.mjs`, functional Playwright | yes | 159.0.8154.33 at `C:/Program Files/Google/Chrome/Application/chrome.exe` | Edge for Playwright (`msedge`); `check.mjs` needs `CHROME_PATH` for anything else |
| Microsoft Edge | existing CDP harness | yes | present at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe` | n/a |
| Playwright bundled Chromium (revision for 1.65.1, Chromium 159.0.8154.6) | optional local | no (`ms-playwright` holds chromium-1208 and -1234 only) | none | use `channel: "chrome"`; or `npx playwright install chromium` |
| Docker Desktop | optional local reproduction of the CI image | yes (client 29.7.2, daemon context `desktop-linux` answered) | n/a | not required |
| `gh` CLI | verifying branch protection, SHA pins | yes | n/a | n/a |
| Port 5173 | dev server | **occupied** by a learner-owned dev server (HTTP 200 this session) | n/a | `REVIEW_PORT` / `CHECK_PITCH_PORT` + `--bypass-lock` |
| GitHub Actions `mcr.microsoft.com/playwright:v1.65.1-noble` | `visual` job | yes (tag exists) | n/a | `npx playwright install --with-deps chromium` on `ubuntu-24.04` [CITED: playwright.dev/docs/ci] |

**Missing with no fallback:** none. **Missing with fallback:** bundled Chromium (use installed Chrome).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.1.2 (pure Node: generator, palette, review module, DESIGN.md structure, derived numbers, ADR) + `@playwright/test` 1.65.1 (functional + visual) |
| Config file | `vitest.config.ts` (existing; includes `src/**`, `scripts/**`, `schemas/**` tests), `playwright.config.ts` (new, Wave 0) |
| Quick run command | `npx vitest run scripts/design src/ui src/routes` |
| Full suite command | `npm test` then `npx playwright test --project=functional` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DSGN-01 | Three direction routes render both screens, both themes, 6 token sets valid | unit + e2e | `npx vitest run scripts/design/directions.test.ts`; `npx playwright test tests/functional/directions.spec.ts` | Wave 0 |
| DSGN-01 | Derived numbers (18.4 s, 59.3 m, 7 players, ten metres-forward values, notebook notes -1.9 / +31.5 / 5.5) recomputed from the Wyscout scene | unit | `npx vitest run src/routes/dev-directions/derived.test.ts` | Wave 0 |
| DSGN-01 | ADR 0010 has gate results, 7 scored criteria per direction, totals, SHA-256 of screenshots, delegation line, ADR structure | unit | `npx vitest run scripts/adr.test.ts scripts/design/adr-0010.test.ts` | adr.test.ts exists; 0010 test Wave 0 |
| DSGN-02 | `docs/DESIGN.md` has the 8 `##` sections in order and exactly one `tokens` block | unit | `npx vitest run scripts/design/design-md.test.ts` | Wave 0 |
| DSGN-02 | Palette gate passes for every set; reproduces UI-SPEC numbers within ±0.2; `#00A000` team B fails | unit | `node scripts/design/check-palette.ts` and `npx vitest run scripts/design/check-palette.test.ts` | Wave 0 |
| DSGN-03 | `tokens.css` equals generator output (drift); required keys in both themes; alias cycles error; Tailwind `compile()` emits `bg-surface-page`, `text-label` etc. | unit | `node scripts/design/build-tokens.ts --check` and `npx vitest run scripts/design/build-tokens.test.ts` | Wave 0 |
| DSGN-03 | Changing `team-a` and `surface-page` in a temp copy changes computed fill of a pitch disc and body background | e2e (functional) | `npx playwright test tests/functional/tokens.spec.ts` | Wave 0 |
| DSGN-04 | Every gallery primitive id lists and renders every state with `data-gallery-state`; width switcher frames are exactly 375/768/1440 wide; deep link scrolls to `#state-disabled` | e2e (functional) | `npx playwright test tests/functional/gallery.spec.ts` | Wave 0 |
| DSGN-04 | `@visual` baselines match, generated only by CI; `@visual` skips without `CI`; no non-linux PNG tracked | e2e + guard | `npx playwright test --project=visual` (CI); `npx vitest run scripts/design/baselines-guard.test.ts` | Wave 0 |
| QA-02 | Review module: report schema v1, severity mapping, ignore list, slugging, contrast maths, exit codes 0/1/2 against fixture routes (clean, seeded `linear-gradient` FAIL, unreachable) | unit + e2e | `npx vitest run scripts/review-screens.test.ts`; `npm run review:screens -- /dev/directions/floodlit/data` | Wave 0 |
| QA-02 | Phase 3 fixes: no sequence badge box intersects a player disc at 375 and 1440; chips inside SVG box; "Play sequence" label at 768+ | e2e (functional) | `npx playwright test tests/functional/pitch-fixes.spec.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run scripts/design src/ui` (under 30 s, pure Node) plus `node scripts/design/build-tokens.ts --check`.
- **Per wave merge:** `npm test`, `npm run typecheck`, `npm run lint`, `npx playwright test --project=functional`.
- **Phase gate:** full suite green, `npm run review:screens` PASS on the chosen direction's two screens plus the gallery index, CI `visual` job green after the manual baseline workflow has run once, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `playwright.config.ts`, `tests/functional/*.spec.ts`, `tests/visual/gallery.visual.spec.ts`
- [ ] `scripts/design/*.test.ts` (build-tokens, tokens-schema, check-palette, design-md, baselines-guard, adr-0010)
- [ ] `scripts/review-screens.test.ts` and fixtures (a route with a gradient, a missing server)
- [ ] `tsconfig.json` include for `tests` and `playwright.config.ts`; `biome.json` exclusion of generated CSS
- [ ] `.github/workflows/update-snapshots.yml` and the `visual` job
- [ ] Framework install: `npm install --save-exact --save-dev @playwright/test@1.65.1`

## Security Domain

`security_enforcement` has no explicit `false` in the files read; treated as enabled. This phase is dev tooling, a static SPA and CI.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | no accounts |
| V3 Session Management | no | none |
| V4 Access Control | partly | `update-snapshots.yml` is `workflow_dispatch` (write-access users only), `contents: write` + `actions: write` scoped to that workflow, refuses `main` |
| V5 Input Validation | yes | Zod schema for the token block (hex regex `^#[0-9A-F]{6}([0-9A-F]{2})?$`, alias resolution, cycle error); `--scope` must match `^\[data-direction="[a-z-]+"\]$` before it is written into CSS; review CLI route argument validated (`/`-rooted path, slugged output folder, no `..`) and spawned with argv arrays, never a shell |
| V6 Cryptography | no | SHA-256 of screenshots via `node:crypto` for the report and ADR only |
| V10/V14 Supply chain and config | yes | exact pins; registry legitimacy audit above; actions pinned by SHA (checkout, setup-node, upload-artifact SHAs above); no `postinstall` in any new package; CI workflow gets least privilege and no `pull_request_target`; `${{ }}` never interpolated into `run:` |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Workflow injection through branch name or inputs in the commit-back workflow | Tampering / Elevation | pass `github.ref_name` via `env:`, quote in shell; no user inputs on `workflow_dispatch` |
| Commit-back pushing arbitrary files | Tampering | `git add` only `tests/visual/__baselines__/*-linux.png`; guards job (`guard-files.ts`, gitleaks, immutability) runs on the next `ci` |
| CSS injection through a token value or `--scope` | Tampering | schema allows only hex/number/dimension/cubicBezier/font-family-array forms; font family names must match `^[A-Za-z0-9 ]+$`; font `src` must start with `/fonts/` |
| Review CLI path traversal / shell injection through the route argument | Tampering | validate and slug; `spawn(cmd, argsArray)`; temp Chrome profile under the OS temp dir or `.taste-skill/` (skill requirement), killed by PID/profile |
| `localStorage` unavailable or hostile (throws, returns junk) | DoS (UI) | try/catch; accept only `system|light|dark` |
| Remote font/CDN request leaking learner data | Information disclosure | self-hosted fonts, `font-local` check blocks any non-localhost request |
| Debug port exposure by headless browsers | Info disclosure | existing harness binds `127.0.0.1` and uses throwaway profiles (cdp.ts comment T-03-28); Playwright manages its own pipe |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A scoped `[data-direction]` override of `@theme static` vars (font, text, radius) reaches utilities because utilities reference `var(--x)` at the element | Tokens to CSS to Tailwind | Directions would not change type/radius; first generator task proves it with a `compile()` + browser test |
| A2 | Chrome's computed value for a `color-mix()` token colour is not a plain token `rgb()` | Pattern 1 note 7, `token-colours` | Check needs a normaliser or a ban on opacity modifiers |
| A3 | Vite dev may reload after late dependency optimisation; an explicit `data-ready` marker avoids flaky screenshots | Anti-patterns | Flaky first screenshots |
| A4 | In the Playwright container job, root user and Chromium default behaviour work with `npm ci` and `setup-node` without extra `HOME` handling | CI design | First CI run fails; adjust `options: --user 1001` per the CI docs example |
| A5 | Preloading the display font prevents CLS regression | Fonts | CLS > 0.1; measure |
| A6 | Headless Chromium has no layout-affecting scrollbars, so viewport width equals layout width | Gallery iframes | 1-15 px layout difference at exact breakpoints |
| A7 | `motion` is needed only for `useReducedMotion` here; `matchMedia` could replace it | State of the Art | Skipping it deviates from UI-SPEC's dependency list |
| A8 | Mirrored `:hover`/`:focus-visible` custom variants are the right way to show forced states in the gallery | Pattern 3 | Gallery states diverge from real interaction styles |

## Open Questions

1. **The taste-skill layout check cannot be a hard FAIL for app screens (spec conflict).**
   - Known: `check.mjs` returns `container: no .wrap` on `/dev/pitch`; with `.wrap` it fires `edge-left`/`hero-fold`/`screen-short` on ordinary grids.
   - Unclear: whether the learner/Claude wants the UI-SPEC amended or the severity change recorded in ADR 0010.
   - Recommendation: planner implements `taste-layout` as WARN with FAIL only for `overflow-x` and `spill`, adds a `.wrap` root to direction/gallery pages, and logs the deviation in the DESIGN.md quality bar. The UI-SPEC "Checker Flags Resolved" section is not otherwise affected.
2. **Where do the browser-based tokens test and the gallery functional tests run in CI?**
   - Recommendation: in the `visual` job as the `functional` project (Linux container), plus locally with installed Chrome. They are not in the six required checks, so a regression there does not block merge; if blocking is wanted, the learner would have to change branch protection (ADR 0007), which CONTEXT says to leave unchanged.
3. **DTCG strictness.** Recommendation above (keep hex strings, "DTCG-style", note the deviation).
4. **Baseline volume in a public repo.** About 216 PNGs; recommendation `updateSnapshots: "changed"` in the manual workflow and one screenshot per primitive x theme x width.

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`, `npm pack` of the 7 font packages, `playwright@1.65.1`, `playwright-core@1.65.1`) read 2026-11-28: versions, licences, peers, file lists, `types/test.d.ts`, `types/types.d.ts`, `types/protocol.d.ts`, `browsers.json`.
- Installed `tailwindcss` 4.3.5 `compile()` probe (this session).
- `gsd-tools query package-legitimacy check` output (this session).
- Dataviz skill `scripts/validate_palette.js` (read, and run on three palettes this session).
- Taste-skill `check.mjs`, `layout-check.js`, `copy-lint.mjs` (read and run this session on `/dev/pitch`, a scratch page and a text file).
- Repo files read: `src/index.css`, `src/routes.ts`, `src/routes/dev.tsx`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `biome.json`, `package.json`, `.github/workflows/ci.yml`, `scripts/lib/cdp.ts`, `scripts/lib/guard.ts`, `scripts/lib/bundle.ts`, `deploy/deny-manifest.json`, `schemas/schemas.test.ts`, `scripts/adr.test.ts`, `.gitignore`, `.gitattributes`.
- GitHub API via `gh` (branch protection contexts, repo visibility PUBLIC, default workflow permissions `read`, action SHAs).
- MCR tag list `https://mcr.microsoft.com/v2/playwright/tags/list` (tag `v1.65.1-noble` present).

### Secondary (MEDIUM confidence, official docs fetched)
- https://tailwindcss.com/docs/theme, https://tailwindcss.com/docs/dark-mode
- https://base-ui.com/react/handbook/styling, https://base-ui.com/react/overview/quick-start
- https://playwright.dev/docs/ci, /docs/docker (page examples showed 1.64.1), /docs/browsers, /docs/test-snapshots
- https://docs.github.com/en/actions/concepts/security/github_token
- https://www.designtokens.org/tr/2025.10/color/ and /format/ (second page read to character 100,000 of 114,563)

### Tertiary (LOW confidence)
- None used for recommendations. Items resting only on training knowledge are tagged `[ASSUMED]` and listed in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, every version and licence read from the registry this session.
- Architecture (tokens, CI, Playwright): HIGH for facts quoted, MEDIUM for the scoped-override behaviour (A1) until the first generator test.
- Taste-skill integration: HIGH on observed behaviour, MEDIUM on the recommended severity mapping (a judgement call recorded as Open Question 1).
- Pitfalls: HIGH for the repo-specific ones (schemas test, ADR test, Biome, denied paths), MEDIUM for browser behaviour items tagged ASSUMED.

**Research date:** 2026-11-28
**Valid until:** 2026-12-28 (Playwright and motion release monthly; re-check `npm view` pins and the MCR tag before installing)
