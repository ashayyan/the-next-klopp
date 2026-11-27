<!-- GSD:project-start source:PROJECT.md -->

## Project

**The Next Klopp**

The Next Klopp (repo slug `the-next-klopp`) is a living, interactive, localhost-first web app that teaches one learner football from A to Z: the game, tactics, coaching, watching and analysing matches, scouting, data and AI, transfers, money, club strategy and governance. It is built for a Saudi-based data-science graduate with ADHD who wants a senior football career (long-term target: sporting director), and it uses the Premier League as the default reference league everywhere. It ships chapter by chapter, so the learner studies early chapters while later ones are still being built.

The full original brief is `NEW_PROJECT_INPUT.md` at the repo root (sections 0–16). This file condenses it; when in doubt, the brief is the authority, and section 16 ("Kickoff answers") overrides earlier sections where they conflict.

**Core Value:** Every concept is **shown, then touched, then practised** in a short visual lesson grounded in real Premier League examples and traceable free sources, so a visual, ADHD learner actually builds professional-level football understanding, not just reads about it.

If everything else slips, this must hold: shipped lessons follow the Lesson Loop, are factually traceable, and are genuinely interactive.

### Constraints

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

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## How this was verified

- All npm versions below were read from the live npm registry on 2026-11-27, not from training data. All Python versions came from PyPI the same day.
- Smoke test on this Windows 11 machine (Node 24.21, npm 11.19). A throwaway project built clean with: Vite 8.4.0, React 19.3.1, `@vitejs/plugin-react` 6.3.0, Tailwind 4.3.5 (`@tailwindcss/vite`), `@mdx-js/rollup` 3.1.1 with frontmatter, `@duckdb/duckdb-wasm` worker and wasm imported as `?url`, and a module-worker Pyodide 314.0.8 import. `typescript@7.0.2` typechecked it in under 1 s. Biome 2.6.9 installed.
- A second throwaway project resolved the whole Python pipeline set with `uv` on Python 3.12 on Windows (kloppy, mplsoccer, socceraction, statsbombpy, pyarrow, duckdb, pydantic, typer, pytest, ruff).
- Vercel, Pyodide and ts-fsrs claims come from the official docs or README (links in Sources).

## The big decision: Vite SPA, not Next.js

| Factor | Why Vite wins here |
|--------|--------------------|
| No server work | App is static plus client logic: IndexedDB, WASM, workers, local files. Nothing needs SSR, RSC, API routes or ISR. |
| Hydration risk | Date-, storage- and media-dependent UI (queue "due today", progress rings, video time) causes hydration mismatches under SSR. A pure SPA has none. |
| Workers and WASM | Module workers, `?url` wasm assets and `new Worker(new URL(...), { type: 'module' })` are first-class in Vite. Verified in the smoke build. Pyodide 314 dropped classic workers, so module workers are mandatory. |
| One-command run | `npm run dev` starts in well under a second. No server/client component boundary to teach to build agents. |
| Vercel | Vite is a native Vercel framework preset. SPA deep links need one `vercel.json` rewrite. Preview deployments per PR work. |
| Dev-only middleware | A Vite plugin can add dev-server endpoints (write `feedback/*.jsonl`, serve local video from a disk folder). Next has no equivalent that is as light. |
| Escape hatch | If a server need appears later (auth, signed uploads), add Vercel Functions or Nitro. Do not pay for it now. |

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Windows | Confidence |
|------------|---------|---------|-----------------|---------|------------|
| Node.js | 24 LTS (installed: 24.21.0) | Runtime, tooling | Already installed. `ts-fsrs` 6 declares `engines.node >=24`. Vitest 5 needs `^22.12 / ^24 / >=26`. Vite 8 needs `^20.19 / >=22.12`. Pin `.nvmrc` and `engines` to `>=24`. | Native | HIGH |
| npm | 11.19 (installed) | Package manager | Brief says `npm run dev`. No extra install. Commit `package-lock.json`. pnpm gives no needed benefit for a single app. | Native | HIGH |
| TypeScript | 7.0.2 (native compiler, `tsc`) | Typecheck only | Stable since 2026-07-08. Typechecked the smoke project in about 1 s on Windows. Vite and Vitest transpile with Oxc, so they never call the TS API. See the TS 7 caveat below. | `@typescript/typescript-win32-x64` ships | MEDIUM-HIGH |
| React | 19.3.1 | UI | Standard. All chosen libraries declare React 19 support. | n/a | HIGH |
| Vite | 8.4.0 | Dev server, bundler (Rolldown) | Stable since 2026-03-12. Rolldown 1.0 stable since May 2026. Smoke build in about 0.5 s. | Native | HIGH |
| `@vitejs/plugin-react` | 6.3.0 | JSX transform, fast refresh | Required pairing for Vite 8 (peer `vite ^8`). | n/a | HIGH |
| React Router | 8.5.3 (data router, library mode) | Routing, lazy lesson routes | Mature, small, `lazy` route modules code-split each lesson. Needs React `>=19.2.7`. Do NOT use its framework mode (that is a Next-like SSR layer). | n/a | MEDIUM-HIGH |
| Tailwind CSS | 4.3.5 + `@tailwindcss/vite` 4.3.5 | Styling, design tokens | v4 is CSS-first: design tokens live in `@theme { --color-team-a: ... }` in a CSS file, which maps directly to DESIGN.md. No `tailwind.config.js` and no PostCSS needed. Verified in the smoke build. | Native | HIGH |
| `motion` | 14.14.0 (`import { motion } from "motion/react"`) | UI motion, layout animation, gestures | Successor to Framer Motion, React 19 compatible, actively published (2026-11-13). See motion decision below. | n/a | HIGH |
| D3 sub-modules | `d3-scale` 4.0.3, `d3-shape` 3.2.1, `d3-array`, `d3-interpolate`, `d3-delaunay` 6.0.6, `d3-contour` 4.0.3, `d3-ease`, `d3-color`, `d3-zoom` | Scales, paths, contours, Voronoi, interpolation | Use D3 for math only; React owns the DOM. Import sub-modules, not the `d3` bundle. | n/a | HIGH |
| Zod | 4.6.7 | Schemas for lesson JSON, pipeline manifests, export/import files | Runtime validation plus inferred TS types plus `z.toJSONSchema()` for editor and agent hints. See content pipeline. | n/a | HIGH |
| `@mdx-js/rollup` | 3.1.1 (+ `@mdx-js/react` 3.1.1, `@mdx-js/mdx` 3.1.1, `remark-frontmatter` 5, `remark-mdx-frontmatter` 6, `@types/mdx`) | MDX compile in the Vite build | Verified working under Vite 8 / Rolldown. Register with `enforce: 'pre'`. Map lesson components through `MDXProvider` so lessons say `<PitchBoard />` without imports. | n/a | HIGH |
| Dexie | 4.4.7 + `dexie-react-hooks` 4.4.0 + `dexie-export-import` 4.4.2 | Local DB (IndexedDB) | See local DB decision. Typed tables, live queries, Blob storage for audio, JSON/Blob export-import add-on. | n/a | HIGH |
| ts-fsrs | 6.0.1 | Spaced repetition scheduler | See SRS decision. | n/a | HIGH on library, MEDIUM on model version |
| `@duckdb/duckdb-wasm` | pin exactly `1.33.1-dev57.0` | In-browser SQL over Parquet/JSON | Only for the data-lab components, lazy-loaded. Pin exact. See DuckDB flag. | Chromium/Edge OK | MEDIUM |
| Pyodide | 314.0.8 (Python 3.14.2) | Python lab | Version now equals the Python version. Ships numpy 2.4.6, pandas 3.0.2, scikit-learn 1.8.0, matplotlib 3.10.8, scipy 1.18.0, statsmodels 0.14.6, polars 1.33.1, pyarrow 22.0.0, duckdb 1.5.1. mplsoccer, kloppy and socceraction are NOT bundled. | Browser-side, no Windows issue | HIGH |
| Playwright | `@playwright/test` 1.65.1 | E2E and screenshots | Standard. Runs on Windows with `npx playwright install chromium`. | Native | HIGH |
| Vitest | 5.1.2 | Unit tests (metric maths, schema tests) | Vite-native, shares `vite.config.ts`. | Native | HIGH |

### Python pipeline (separate `/pipeline` package)

| Technology | Version | Purpose | Why Recommended | Windows | Confidence |
|------------|---------|---------|-----------------|---------|------------|
| Python | **3.12** (pin `requires-python = ">=3.11,<3.13"`, `.python-version` = `3.12`) | Pipeline runtime | `socceraction` 1.5.3 declares `<3.13`. 3.12 is the newest that satisfies the whole set. Installed here: 3.12.10. | Native; uv can also fetch it | HIGH |
| uv | 0.13.10 (installed 0.12.5, run `uv self update`) | Env, lockfile, runner | One tool for venv, lock, `uv run`. Resolved the full set on Windows in the smoke test. Commit `uv.lock`. | Native | HIGH |
| kloppy | 3.19.1 | Standardise StatsBomb/Opta/Wyscout/tracking | Brief-mandated. Requires Python `>=3.9`. | Pure Python | HIGH |
| mplsoccer | 1.8.1 | Offline analysis plots, pitch coordinate reference | Use for pipeline QA and for checking the app's pitch renderer coordinates. Not shipped in the app. | Pure Python + matplotlib wheels | HIGH |
| socceraction | 1.5.3 | SPADL, xT, VAEP | Brief-mandated. It pins `pandas<3`, `numpy<2` (smoke resolved pandas 2.3.3, numpy 1.26.4), which is why the pipeline cannot use pandas 3. | Wheels available | HIGH |
| statsbombpy | 1.22.0 | StatsBomb open data client | Brief-mandated. | Pure Python | HIGH |
| pyarrow | 26.0.1 | Write Parquet | Needed for versioned Parquet outputs. | Wheels available | HIGH |
| duckdb (Python) | 2.0.1 | Aggregate, build derived tables, validate outputs | Fast SQL over Parquet in the pipeline. | Wheels available | HIGH |
| pydantic | 2.14.4 | Pipeline output models and manifest | Emits JSON Schema; validate outputs the same way the app does with zod. | Wheels available | HIGH |
| Typer | 0.29.3 | Pipeline CLI | `uv run klopp-pipeline fetch statsbomb`, clean subcommands. | Pure Python | HIGH |
| pytest | 9.2.0 | Metric tests against known values | Brief requires unit tests against source values. | Native | HIGH |
| ruff | 0.17.6 | Lint and format | One tool. | Native | HIGH |

### Supporting Libraries (web)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Biome | 2.6.9 | Format and lint (replaces ESLint + Prettier) | Always. No dependence on the TS compiler API, so it is safe under TS 7. Includes a11y and React-hooks rules. |
| `@axe-core/playwright` | 4.14.1 | Accessibility assertions in E2E | Every shipped lesson (brief gate: accessibility). |
| `@base-ui/react` | 1.9.0 | Headless accessible primitives (dialog, popover, tooltip, tabs, slider) | Unstyled, style with Tailwind tokens. Avoids default-card-grid look. Alternative: `radix-ui` 1.8.1. Pick one, do not mix. |
| `@visx/*` | 4.0.0 | Axis, legend, tooltip, brush, annotation primitives only | Optional, per package, e.g. `@visx/axis`, `@visx/tooltip`. Declares React 18/19 peers. Do not adopt `@visx/xychart` as the chart system. |
| Zustand | 5.1.0 | Ephemeral UI state (tactics board scene, animator clock, focus mode) | Small store outside React for 60 fps drag and playback. Persistent state goes in Dexie. |
| `hyparquet` | 1.33.2 (+ `hyparquet-writer` 0.18.1 if browser export needed) | Read Parquet in the main thread without DuckDB | Default Parquet path for small tables. Pure JS, no WASM cost. Use DuckDB only when SQL is the lesson. |
| Comlink | 4.4.2 | RPC to Pyodide / DuckDB / pitch-control workers | Stable, small (last release 2024-11, no churn). Works with module workers. |
| `@tanstack/react-virtual` | 3.14.28 | Virtualise long event tables (Event Inspector) | Tables above about 500 rows. |
| `react-hotkeys-hook` | 5.4.0 | Keyboard shortcuts | Brief requires full keyboard navigation. |
| `@tailwindcss/typography` | 0.5.20 | MDX prose base | Optional, restyle fully from tokens. |
| `wavesurfer.js` | 8.1.1 | Waveform for recorded audio | Optional, Speak-It Coach polish only. Not needed for MVP. |
| `rollup-plugin-visualizer` | 7.3.0 | Bundle size budget | Performance budget gate. |
| `@open-spaced-repetition/binding` | 0.6.3 | Train FSRS weights from review logs | Later, not v1 (needs Node >=24, browser/WASI setup is extra work). |
| `style-dictionary` | 5.8.0 | DTCG tokens to CSS/Figma | Only if a Figma sync is wanted. Default: hand-authored `@theme` CSS is the single source of truth. |
| `msw` | 3.0.8, `@testing-library/react` 16.3.3, `jsdom` 31.0.1 | Component tests | Only for logic-heavy components. Prefer Playwright for interaction. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `tsx` 4.23.15 | Run TS scripts (content validator, asset copy) | `npx tsx scripts/validate-content.ts`. Works on Windows. |
| `tinyglobby` 0.2.17 | Globbing in scripts | Already a Vite dependency. Forward-slash patterns work on Windows. |
| `knip` 6.48.0 | Dead export and dependency detection | Optional CI gate. |
| `husky` 9.1.7 + `lint-staged` 17.6.2 | Pre-commit validation | Optional. Works with Git for Windows. |
| Docker / Playwright image | Linux screenshot baselines | Optional locally. CI is the baseline source (see Testing). |
| `gh`, Vercel CLI | Repo and deploy | Learner logs in themselves. |

## Decisions with rationale

### 1. Motion: `motion` for UI, your own clock for the Phase Animator

- Use `motion` 14 (`motion/react`) for UI transitions, layout animation, drag gestures on non-pitch elements, `prefers-reduced-motion` handling via `useReducedMotion`, and the "motion language" (durations and easings as tokens).
- Do NOT drive the Phase Animator or Tactics Board scrubber with a tween timeline. Model them as `state = f(t)`: a Zustand store holds `t` and `playing`, one `requestAnimationFrame` loop advances it, and player positions come from keyframe data via `d3-interpolate` plus `d3-ease`. This gives exact scrubbing, pause, reverse, annotation layers toggled per time range, and it is testable (assert positions at `t = 3.2 s`).
- GSAP 3.15.1 works but adds a second animation system. Not needed.
- Dragging players on the SVG pitch: custom pointer-capture hook (`setPointerCapture`, convert screen to pitch metres through the pitch's inverse transform, clamp to bounds, snap optional). It is about 60 lines, keyboard-operable (arrow keys nudge) and fully controlled. `@use-gesture/react` (last publish 2024-03) and `@dnd-kit/core` (2024-12) are stale and built for DOM lists, not SVG coordinate spaces. Use `@dnd-kit/react` 0.5.3 only for sortable lists (quiz ordering, "order the sequence").

### 2. Charts and pitch: D3 maths + React-owned SVG; Canvas for density; WebGL deferred

- Pitch Standard: one `<Pitch>` React component rendering SVG in a metre-based `viewBox` (105 x 68) with pure coordinate converter functions (StatsBomb 120x80, Opta 0-100, Wyscout 0-100, tracking metres/centred) in a plain TS module with Vitest tests. This is the single place coordinate bugs can live.
- SVG layer for anything interactive or under about 2,000 nodes (players, passes, shot maps for one match). Canvas 2D layer, same transform, for dense marks (season shot maps, heatmaps, pass networks across many matches).
- Pitch control and xT surfaces: compute the grid in a Web Worker (a 105 x 68 grid at 1 m is about 7,000 cells) and paint with `ImageData` on a Canvas 2D layer. This is enough for the "Pitch Control Live" drag-a-player demo. Only if a finer grid or full-frame animation drops below 60 fps, add raw WebGL2 or `twgl.js` 7.0.0 for one fragment shader. Do not add three.js, deck.gl or regl for this (regl last release is old). WebGL stays "where needed", as the brief says.
- visx 4.0.0 is fine but optional; D3 maths + own components gives the control the anti-slop design rules need. `@observablehq/plot` 0.6.19 is a good fit for fast exploratory facets inside the Python lab only, not for shipped lesson visuals.

### 3. Local DB: Dexie (IndexedDB), not SQLite-WASM

| Option | Verdict |
|--------|---------|
| **Dexie 4.4.7 on IndexedDB** | **Choose.** Typed tables, indexes, live queries, Blob storage (audio recordings), versioned migrations, `dexie-export-import` for JSON/Blob backup. No worker, no COOP/COEP, works in Chromium/Edge/Firefox. |
| `@sqlite.org/sqlite-wasm` 3.54.1 (OPFS) | Not needed. Adds worker plumbing and a persistence layer for data that is a few thousand rows. Revisit only if progress analytics need real SQL (then use DuckDB-WASM reading an exported snapshot instead). |
| PGlite 0.6.1 | Overkill. |
- IndexedDB is per origin. `localhost:5173` and `localhost:4173` and the Vercel URL are three separate databases. Set `server.port = 5173` and `strictPort: true` in Vite and `preview.port` to a fixed value, document it, and treat JSON export/import as the sync mechanism between dev and Vercel.
- Call `navigator.storage.persist()` once, and show an auto-export reminder. Clearing browser data wipes progress.
- Dev-only Vite plugin: add a middleware endpoint (`POST /__dev/feedback`) that appends the "I'm confused here" notes to `feedback/*.jsonl` on disk. Build agents can only read files, not IndexedDB. In the Vercel build the plugin is absent and the button falls back to Dexie plus export.

### 4. SRS: ts-fsrs 6.0.1 (FSRS)

- FSRS is the current state of the art (the default in Anki since 2024). `ts-fsrs` is the official TypeScript implementation, MIT, ESM/CJS/UMD, works in the browser (the Node >=24 `engines` field affects install on tooling, not browsers).
- API in v6 (from the README): `const scheduler = await DefaultScheduler(); scheduler.newCard({ now }); scheduler.preview({ card, now }); scheduler.review({ card, grade: Rating.Good, now })` returning `{ card, revlog }`. The legacy v5 `fsrs()` / `createEmptyCard` API is deprecated in the migration guide. Do not copy v5 tutorials.
- Model choice: v6 defaults to FSRS-7 (34 weights, fractional-day intervals, fast-stability trace). FSRS-6 (21 weights, whole-day intervals, in v5 and Anki) is the safer fit for a "due today" queue with no in-day learning steps. Recommendation: select FSRS-6 explicitly at implementation (library `version` option, confirm the exact option name in the API reference at that time) and store `modelVersion` on every card and log row. Keep all review logs; they let you re-derive FSRS-7 state later because the guide says to rebuild memory state from history. Confidence MEDIUM, FSRS-7 maturity was not independently verified.
- Product rules sit outside the library: cap the daily queue (for example 15 cards), hide overdue guilt (no "N overdue" counter, silently reschedule after a gap, "welcome back" flow), request retention about 0.85 to 0.9, count a 3-5 minute low-energy session as a full day. FSRS gives intervals; you decide what to show.
- Card dates serialise to ISO strings in Dexie. Wrap read/write in one adapter so a library change touches one file.

### 5. Content pipeline: MDX + JSON spec, validated by your own script

- Runtime: `@mdx-js/rollup` compiles MDX at build. Lessons load lazily via `import.meta.glob('/content/**/lesson.mdx')` behind React Router `lazy` routes. The spec JSON is loaded with `import.meta.glob(..., { eager: false })` and parsed with the zod schema at load time in dev.
- Validator: `scripts/validate-content.ts` (run by `npx tsx`, wired to `npm run validate`, a pre-commit and a CI gate). It does what generic content tools do not:
- Why not Velite 0.4.0, Content Collections 0.15.3, fumadocs-mdx or Contentlayer: they are documentation-site content layers. The value here is the cross-reference checks above, which you write anyway. Contentlayer is unmaintained. Fewer moving parts wins.
- Pipeline outputs follow the same rule: Python writes `data/<dataset>/<version>/*.parquet|json` plus `manifest.json` (`schemaVersion`, `sourceId`, `license`, `sha256`, `generatedAt`, `rowCounts`). The app validates the manifest with zod at load. Pydantic emits the JSON Schema, zod mirrors it; a CI test round-trips a sample.
- Do not use `gray-matter` (unmaintained since 2023). Frontmatter goes through `remark-frontmatter` + `remark-mdx-frontmatter`.
- TS typing gap found in the smoke test: `import Lesson, { frontmatter } from './x.mdx'` fails typecheck with `@types/mdx` alone. Add a local `mdx.d.ts` declaring `export const frontmatter: Record<string, unknown>` (or load the spec JSON instead and skip frontmatter).

### 6. TypeScript 7 and linting

- TypeScript 7.0.2 is stable and its `tsc` works on Windows. It ships without a stable programmatic API until 7.1, so tools that import `typescript` as a library (typescript-eslint 8.74 has a peer range of `<6.1.0`, `@mdx-js/typescript-plugin`, some IDE plugins) do not work with it.
- Recommendation: TypeScript 7.0.2 for `tsc --noEmit` and Biome 2.6.9 for lint/format. No typescript-eslint. This is the least-conflict set.
- Fallback if a needed tool requires the TS API: pin `typescript@6.0.3` (also verified in the smoke build) or use Microsoft's `@typescript/typescript6` compat package alongside 7.0. Revisit when 7.1 lands.
- Biome does not lint MDX. Lessons are checked by the content validator instead.

### 7. Video and audio

- Local clips: native `<video>` with `requestVideoFrameCallback` for frame-accurate overlay sync. Source from (a) a file picker + `URL.createObjectURL`, or (b) a dev-only Vite middleware that serves `LOCAL_MEDIA_DIR` (set in `.env.local`, git-ignored) with HTTP Range support so seeking works. The learner's disk paths never enter the repo. A persisted `FileSystemFileHandle` in Dexie is a Chromium-only convenience and needs a permission re-grant every session; make it optional.
- YouTube: official IFrame Player API on `youtube-nocookie.com/embed/...?enablejsapi=1`, wrapped in a small `<YouTubePlayer>` (poll `getCurrentTime()` about every 250 ms for tagging, `seekTo`, `pauseVideo`). Write the wrapper yourself (about 150 lines). `react-player` 3.4.0 is acceptable if the wrapper becomes a time sink, but precise timestamp notes and overlays favour owning it.
- Both players expose the same interface `{ currentTime, seek, play, pause, duration }` so `Video Note Player` and `Watch Gym Player` do not care about the source.
- Audio: `navigator.mediaDevices.getUserMedia({ audio: true })` + `MediaRecorder` (`audio/webm;codecs=opus` in Chrome/Edge), store the Blob in Dexie, play through `<audio>`. Works on `http://localhost` and on Vercel https (both are secure contexts).
- Do NOT enable cross-origin isolation (COOP/COEP headers). It would block YouTube iframes and is not needed for single-thread DuckDB-WASM or Pyodide.

### 8. In-browser data and Python

- Default data path: pipeline pre-aggregates to small Parquet or JSON. Read it with `hyparquet` or plain `fetch().json()`. Most lessons never need SQL.
- DuckDB-WASM only for lessons where SQL or big joins are the point (Event Inspector over a full match, Metric Noise Lab, Python lab queries). Load lazily, one instance in a worker, `?url` imports as proven in the smoke build (wasm 36 MB raw, 8.2 MB gzip; worker 0.77 MB).
- DuckDB-WASM versioning flag (MEDIUM): npm `latest` is `1.33.1-dev57.0` (published 2026-06-22), a dev-suffixed build, while the newest GitHub release tag is v1.33.0 (2025-12-16, DuckDB core 1.4.x era) and the official docs describe a newer 2.0.x line. The registry and the docs disagree. Pin the exact npm version above, record it in the decision log, and re-check at the first data-lab phase. Do not use `@next`.
- Pyodide: module worker only. Wrap with Comlink. Features:

### 9. Design tokens

### 10. Testing

- Unit (Vitest 5.1.2): pitch coordinate converters, xG/xT/pitch-control maths against known values, FSRS adapter, content validator, import/export round-trip.
- E2E (Playwright 1.65.1): run against `vite build && vite preview` (the production bundle), not the dev server. Set `webServer.command` to start preview on the fixed port. Chromium only is enough for a Chromium/Edge-targeted tool; add Firefox later if wanted.
- Accessibility: `@axe-core/playwright` on every lesson page, plus keyboard-only paths for the Tactics Board and quizzes.
- Visual regression: Playwright names baselines per OS (`-win32`, `-linux`), and fonts and anti-aliasing differ, so a Windows baseline fails on GitHub Actions Linux. Make the CI job the single baseline source: tag screenshot tests `@visual`, run them only in the GitHub Actions ubuntu job (or the official Playwright Docker image pinned to the same 1.65.1), and provide a manual `update-snapshots` workflow that commits new baselines. Locally on Windows run the functional E2E set and generate review screenshots (the taste-skill 3-width review) as artefacts, not assertions.
- Preview deployments behind protection: Playwright against a protected Vercel preview needs the Protection Bypass for Automation secret sent as a header. Prefer running E2E against the local `vite preview` in CI and use the Vercel preview only for human review.

### 11. Deploy: Vercel with the correct protection scope

- Vite is a first-class Vercel framework. Add `vercel.json` with the SPA rewrite `{"source": "/(.*)", "destination": "/index.html"}` (if `cleanUrls` is ever enabled, drop the file extension). Output dir `dist`.
- Brief: "Deployment Protection stays on", public deployment out of scope. In Vercel, **Standard Protection protects everything except production domains**, so production would be public. Set the scope to **All Deployments** with **Vercel Authentication** (available on all plans, no paid add-on) so the production domain and generated URLs are all gated. Password Protection is paid (Pro, $20/month per project, not on Hobby), so do not rely on it.
- Keep licensed or raw data out of `dist`: only `data/**/*.parquet|json` produced by the pipeline's "publishable" step may be in `public/`. Add a CI check that fails if any file in `dist/` is listed in a deny manifest or exceeds a size limit. `no raw data in git` is enforced by `.gitignore` plus a CI path check.
- The DuckDB-WASM binary (36 MB) is an asset, not a function bundle, so Vercel size limits do not bite; it is lazy-loaded anyway.
- Learner logs into Vercel and `gh` themselves.

### 12. Windows-friendly tasks (no `make`)

- Root `package.json` scripts call everything, so the learner and agents use one entry point: `npm run dev`, `npm run build`, `npm run validate`, `npm run test`, `npm run e2e`, `npm run data` (= `uv run --project pipeline klopp-pipeline run-all`), `npm run data:fetch`, `npm run lint`, `npm run typecheck`.
- `make` is not on a stock Windows machine. Do not depend on it. If a task runner is wanted beyond npm scripts, `just` (winget) works, but npm scripts already cover it.
- Use forward slashes and `node`/`tsx` scripts instead of bash in `package.json`. Avoid shell-specific `cp`/`rm`/`&&` chains that differ across cmd, PowerShell and Git Bash; if a script needs file ops, write it in TS.
- Keep paths short. The project path `E:\To become new klop` contains spaces, so quote every path in scripts and avoid string-concatenated shell commands. Pyodide and Playwright browser caches live under the user profile, not the repo.
- `.gitattributes` with `* text=auto eol=lf` to stop CRLF churn and snapshot differences.
- Git ignore: `pipeline/data/raw/`, `.venv/`, `feedback/`, `.env.local`, `public/pyodide/`, Playwright `test-results/`.

## Installation

# App scaffold (Vite 8 + React + TS template, then pin)

# Core runtime

# Heavy, lazy-loaded (pin exact)

# Build and quality

# Pipeline (from the repo root, Python 3.12, uv >= 0.13)

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vite 8 SPA | Next.js 16.4.6 | Need server rendering, API routes, public SEO pages or server secrets. Not in scope. |
| Vite 8 SPA | Astro 7.4.13 + React islands | Content-heavy site with little cross-page state. Here progress, queue and tactics state persist across pages, which favours a SPA. |
| React Router 8 (library) | `@tanstack/react-router` 1.170.46 | Want type-safe search params for lesson-step deep links. Good option; both work. Router is easy to swap early, hard later, so decide in the architecture phase. |
| Dexie / IndexedDB | `@sqlite.org/sqlite-wasm` OPFS | Real SQL on progress data and willingness to run a worker and manage OPFS persistence. |
| ts-fsrs | SM-2 hand-rolled | Never for new work. FSRS fits the same data shape and is more accurate. |
| `motion` | GSAP 3.15.1 | Timeline-heavy marketing animation. Not this app. |
| D3 maths + React SVG | visx 4.0.0 charts, Observable Plot 0.6.19, Recharts | Quick throwaway charts. They fight a bespoke design system and the Pitch Standard. |
| Custom content validator | Velite 0.4.0, Content Collections, fumadocs-mdx 15 | A docs-style site with only frontmatter validation. |
| Biome | ESLint 10.16 + typescript-eslint 8.74 + Prettier | Need type-aware lint rules. Requires TypeScript 6.0.3 until typescript-eslint supports 7. |
| TypeScript 7.0.2 | TypeScript 6.0.3 | A required tool needs the TS API. |
| Own Pitch + pointer drag | `react-konva` 19.3.2 / Konva 10.11.0, PixiJS 8.23.0 | Thousands of draggable sprites. Not the case; SVG gives crisp scaling, CSS styling, accessibility and testability by DOM selector. |
| Canvas 2D `ImageData` for surfaces | three.js 0.187.0, deck.gl 9.4.2, regl | A 3D view or millions of points. |
| Workers + Comlink | Pyodide on the main thread | Never; it blocks the UI for seconds on load. |
| uv + Python 3.12 | pip/venv, poetry, conda | Only if uv fails on a machine. `uv pip install -r` is the fallback. |
| npm scripts | `make`, `just`, `poethepoet` | Make needs extra install on Windows. Just is fine if wanted. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Next.js for this app | SSR/RSC boundary, hydration mismatches with local state, no benefit without a server | Vite 8 SPA |
| Python 3.13 or 3.14 for the pipeline | `socceraction` 1.5.3 requires `<3.13` | Python 3.12 via uv |
| pandas 3 in the pipeline | `socceraction` pins pandas below 3 (resolved 2.3.3) | Let uv resolve; do not force pandas 3 |
| Cross-origin isolation (COOP/COEP) | Breaks YouTube embeds | Worker-terminate for stopping Python, single-thread DuckDB |
| Classic (non-module) workers | Pyodide 314 removed support | `new Worker(url, { type: 'module' })` |
| `fsrs()` / `createEmptyCard` v5 API | Deprecated in ts-fsrs v6 | `DefaultScheduler()`, `newCard`, `review` |
| Vercel "Standard Protection" | Leaves the production domain public | "All Deployments" + Vercel Authentication |
| `typescript-eslint` with TS 7 | Peer range `<6.1.0`; needs the TS API 7.0 lacks | Biome + `tsc` 7, or TS 6.0.3 if type-aware lint is required |
| Contentlayer, `gray-matter` | Unmaintained | Own validator, `remark-frontmatter` |
| `@use-gesture/react`, `@dnd-kit/core` for SVG pitch drag | Last release 2024, DOM-oriented | Custom pointer-capture hook |
| `@duckdb/duckdb-wasm@next` | Tracks main branch | Pin the exact stable-tagged version |
| Next-style `tailwind.config.js` | Tailwind 4 is CSS-first | `@theme` in CSS |
| Committing Playwright Windows screenshots as the baseline | CI on Linux will fail on font and anti-aliasing differences | CI-generated Linux baselines |
| Shipping mplsoccer, kloppy or socceraction to the browser | Not in Pyodide's package set; heavy | Run in pipeline, ship data |
| Storing progress only in IndexedDB with no export | Clearing browser data, or a changed port, loses everything | JSON export/import, `storage.persist()`, fixed port |
| `make` | Not on Windows by default | npm scripts calling `uv run` |
| Full `d3` bundle and `three`/`deck.gl` by default | Bundle weight; unneeded | D3 sub-modules, Canvas 2D |

## Stack Patterns by Variant

- Keep it in Parquet, load into Pyodide FS in chunks per match or per window, never the whole season.
- Because Pyodide and DuckDB-WASM share the 4 GB WASM address-space cap and browsers enforce lower limits.
- Move the shading to a single raw WebGL2 (or `twgl.js`) fragment shader on the existing canvas; keep the grid maths in the worker.
- Because Canvas `ImageData` repaint becomes the bottleneck first.
- Add `vite-plugin-pwa` 2.0.0 for caching shell and Pyodide files. Defer; it adds cache-invalidation risk to a rolling release.
- Store the automation bypass secret as a GitHub Actions secret and send it via header in Playwright `extraHTTPHeaders`. Never commit it.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `vite@8.4.0` | `@vitejs/plugin-react@6.3.0` (peer `vite ^8`), `@tailwindcss/vite@4.3.5` (peer `vite ^5.2 \|\| ^6 \|\| ^7 \|\| ^8`), `vitest@5.1.2` (peer `vite ^6.4 \|\| ^7 \|\| ^8`) | All verified from registry peer ranges. |
| `vite@8.4.0` | `@mdx-js/rollup@3.1.1` | Built and rendered in smoke test under Rolldown. Register with `enforce: 'pre'`. |
| `react@19.3.1` | `react-router@8.5.3` (needs `>=19.2.7`), `motion@14.14.0` (`^18 \|\| ^19`), `@visx/*@4.0.0` (`^18 \|\| ^19`) | OK. |
| `typescript@7.0.2` | Vite 8, Vitest 5, Biome 2.6.9, Playwright | OK (no TS API use). Not OK: typescript-eslint 8.74 (`<6.1.0`), MDX TS plugin. |
| `ts-fsrs@6.0.1` | Node `>=24` (tooling) | Browser runtime unaffected. |
| `pyodide@314.0.8` | module workers only; Python 3.14.2 inside the browser | Browser Python 3.14, pipeline Python 3.12. Do not share code that depends on version-specific syntax or pandas versions (browser pandas 3.0.2, pipeline pandas 2.3.3). Lab snippets must be tested in Pyodide. |
| `socceraction@1.5.3` | Python `>=3.9,<3.13`, pandas `<3`, numpy `<2` | Drives the pipeline Python and pandas pins. |
| `@playwright/test@1.65.1` | Docker image pinned to the same version | Required for stable screenshot baselines. |
| `@duckdb/duckdb-wasm@1.33.1-dev57.0` | Vite 8 `?url` imports | Verified build. Core DuckDB inside is older than the Python `duckdb` 2.0.1; keep SQL portable and only query data, do not exchange DuckDB database files. |

## Open flags for later phases

## Sources

- npm registry, read 2026-11-27: versions, peer dependencies, `engines` and modification dates for every package listed (HIGH).
- PyPI JSON API, read 2026-11-27: kloppy 3.19.1, mplsoccer 1.8.1, socceraction 1.5.3 (`<3.13`), statsbombpy 1.22.0, pyarrow 26.0.1, duckdb 2.0.1, pydantic 2.14.4, typer 0.29.3, pytest 9.2.0, ruff 0.17.6, uv 0.13.10 (HIGH).
- Local smoke tests (Windows 11, Node 24.21.0, uv 0.12.5, Python 3.12.10): Vite 8.4.0 build with MDX, Tailwind, DuckDB-WASM and Pyodide worker; `tsc` 6.0.3 and 7.0.2; Biome 2.6.9 install; `uv add` of the full pipeline set (HIGH).
- Vite 8 announcement and migration pages, https://vite.dev/blog/announcing-vite8 (Vite 8 stable 2026-03-12, Rolldown 1.0 May 2026) (HIGH).
- TypeScript 7.0 announcement, https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ and InfoQ coverage (no stable programmatic API until 7.1; `@typescript/typescript6` compat package) (MEDIUM-HIGH, via search summaries).
- Pyodide 314.0 release post, https://blog.pyodide.org/posts/314-release/ and package list https://pyodide.org/en/stable/usage/packages-in-pyodide.html (Python 3.14.2, no classic workers, package versions) (HIGH).
- DuckDB-Wasm docs, https://duckdb.org/docs/2.0/clients/wasm/overview.html and https://github.com/duckdb/duckdb-wasm/releases (4 GB cap, single thread default; version discrepancy noted) (MEDIUM).
- ts-fsrs README, https://github.com/open-spaced-repetition/ts-fsrs and guides https://open-spaced-repetition.github.io/ts-fsrs/guide/migration , /guide/model (v6 API, FSRS-3 to 7, Node >=24, default FSRS-7) (HIGH on API, MEDIUM on model guidance).
- Vercel Deployment Protection, https://vercel.com/docs/deployment-protection (last updated 2026-09-15; scopes, plan availability) (HIGH).
- Vercel on Vite, https://vercel.com/docs/frameworks/frontend/vite (SPA rewrite) (HIGH).
- Playwright cross-OS baseline guidance (secondary sources: Argos CI, adequatica, testquality blogs) (MEDIUM; consistent across sources).

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
