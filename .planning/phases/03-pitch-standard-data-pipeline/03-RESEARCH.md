# Phase 3: Pitch Standard & Data Pipeline - Research

**Researched:** 2026-11-28
**Domain:** Canonical football pitch renderer (React SVG + Canvas), provider coordinate converters, Scene/Frame format, kloppy open-data pipeline, licence/bundle gates
**Confidence:** HIGH on converters, kloppy APIs, Wyscout data and gate design (read from pinned source and live data this session); MEDIUM on headless frame-time thresholds and Opta/Wyscout landmark values (kloppy is the only complete source)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

The learner delegated every grey area to Claude for this autonomous run ("choose all the recommended choices and close every grey area"). Each answer below is the recommended option.

**Canonical coordinate system**
- Canonical space: metres, origin at the top-left corner of the pitch as drawn, x increases left→right along the touchline (0..length), y increases top→bottom (0..width), matching SVG `viewBox="0 0 {length} {width}"`. Default pitch 105 × 68 m (PL Handbook Rule K.17 convention); every scene carries its own `pitch: {length, width}` so non-standard pitches (Fulham 100 × 65) render true. Reversibility: one-way once lessons and saved boards persist coordinates.
- Attacking direction is explicit per scene/period (`attack: "ltr" | "rtl"` per team), never implied by provider. Converters normalise provider data so the team in possession attacks left→right only when a recipe asks for it (`orient: "possession-ltr"`), otherwise keep provider orientation per period.
- Converters map provider coordinates to canonical metres with landmark-preserving piecewise-linear mapping (penalty-area lines, goal-area lines, centre line, penalty spots land exactly on the Law 1 landmarks of the target pitch), for fixed-landmark providers (StatsBomb 120 × 80, Opta 0–100, Wyscout 0–100). Tracking data already in metres (centred origin) maps by translation/flip only. Converter specs are encoded from provider docs and kloppy source pinned at kloppy 3.19.1 (not master). Reversibility: costly.
- Converters live in one TS module `src/pitch/coords.ts` with a Python mirror only inside the pipeline via kloppy; a cross-language parity test compares a shared landmark fixture (JSON) between TS converters and kloppy output.

**Pitch renderer and layer API**
- `<Pitch>` (React, SVG) renders markings from a pure geometry function `pitchGeometry(length, width)` built from IFAB 2026/27 Law 1 values in the research registry. Children render in canonical metres. A `<CanvasLayer>` child paints dense marks with the same transform (DPR-aware). Reversibility: costly.
- Layer API spike against three consumers before freezing: static markings, draggable player (pointer capture, screen→pitch inverse transform, keyboard nudge), 22-player playback at 60 fps; spike outcome recorded in `docs/decisions/0009-pitch-layer-api.md`.
- Orientation prop: `horizontal` (default) or `vertical` (rotated 90°, for phone portrait), implemented as a view transform only — data stays canonical.
- Styling uses CSS variables with neutral placeholder values (`--pitch-*`, `--team-a`, `--team-b`, `--ball`) so Phase 4 tokens replace them without code changes. Placeholder colours must still be colour-blind-distinguishable (Okabe-Ito) and never rely on colour alone.

**Glyphs and legend**
- Glyph set (PITCH-03): player (circle + number/label; team A filled, team B ring), goalkeeper variant, ball, pass (solid arrow), carry (dashed/wavy arrow), run without ball (dotted arrow), pressure (wedge/halo), zone (filled translucent polygon/rect), shape/line, plus highlight and annotation text. Each glyph is a component with a registry entry `{id, label, description, sample}`.
- Legend auto-generates from the glyph ids actually present in the rendered scene and is always visible (default: below/right of pitch; can collapse to an icon row but never hidden entirely). Reversibility: costly.

**Scene/Frame format (PITCH-04)**
- One JSON format `scene.schema.json` (2020-12) + Zod mirror `src/scene/schema.ts`, versioned `schemaVersion: 1`. Top level: `id`, `schemaVersion`, `kind` (`authored | board | quiz-answer | reconstruction`), `pitch {length,width}`, `teams[]` (id, name, side, attack per period), `entities[]` (players/ball with stable ids, role/number/label), `frames[]` (time `t` in seconds, entity positions in canonical metres, optional `ballOwner`), `events[]` (typed: pass, carry, shot, pressure, run… with start/end positions and `t`), `annotations[]` (glyph overlays with time ranges), `source` (`{type, sourceIds[], licence, provider, matchId?, attribution}`). Playback state is `f(t)` with d3-interpolate between frames. Reversibility: one-way once boards/answers persist; additive changes only after Phase 3.
- Four fixtures in `src/scene/fixtures/`: authored visual, saved board, quiz answer, reconstruction (from the pipeline recipe). Each renders on `/dev/pitch` and validates in tests (ajv + Zod agree, mirroring the Phase 1 dual-validator pattern).

**Pipeline (PIPE-01..04)**
- `pipeline/` (uv, Python 3.12, kloppy 3.19.1 pinned) gains Typer subcommands: `fetch <source>`, `standardise <source>`, `recipe <name>`, `publish`, `run-all`. `npm run data` = `uv run --project pipeline klopp-pipeline run-all`; `npm run data:fetch` = fetch only. No `make`, no bash-only syntax.
- Allow-list file `pipeline/sources.allow.json` names each source, URL pattern, licence id and `shippable` flag (from ADR 0008: Wyscout/Pappalardo and DFL/Sportec CC BY 4.0 shippable; StatsBomb, Last Row, Metrica, SkillCorner local-only). Fetch refuses anything not on the list.
- Raw downloads → `pipeline/data/raw/` (git-ignored). Outputs → `data/<dataset>/<version>/*.json|parquet` + `manifest.json` (`schemaVersion`, `sourceId`, `license`, `shippable`, `sha256`, `generatedAt`, `rowCounts`, `kloppyVersion`) — immutable: a new version directory per change, never overwritten (test enforces). Small outputs only (per-file cap 1 MB for shippable artifacts).
- `publish` copies only `shippable: true` artifacts into `public/data/`; everything else stays local in `data/` (git-ignored for local-only datasets).
- Deny-manifest `deploy/deny-manifest.json` (globs from ADR 0008 + provider ids) and a Node check `scripts/check-bundle.ts` run after `vite build` that fails if any `dist/` file matches the deny-manifest, exceeds the size budget, or lacks a shippable manifest entry. Wired into CI `build` job and `npm run guard:bundle`. Git guard (Phase 1) extended so local-only dataset folders cannot be staged.
- First recipe (PIPE-04): a Premier League 2017/18 goal sequence from the Wyscout public dataset (CC BY 4.0, shippable): events → canonical metres → Scene `kind: reconstruction` with event-derived ball path and possession chain (no off-ball tracking). Second, local-only: a StatsBomb 2015/16 PL shot with its freeze frame → reconstruction scene kept in `data/` and loaded on `/dev/pitch` only when present locally, never shipped.
- pydantic models mirror the Scene schema (emit JSON Schema; CI test round-trips a pipeline scene through the TS Zod schema).

**Testing**
- Vitest: geometry (Law 1 values), converters (landmarks per provider, round-trip, left/right asymmetry), legend generation, scene schema dual-validation.
- pytest: allow-list refusal, manifest immutability, recipe output schema, kloppy standardisation on a recorded small fixture (no network in tests).
- Playwright is not yet required here (walker is Phase 5); a dev-route render smoke can use the existing smoke script pattern or a headless Edge check.

**Decided autonomously**
- Layout: `src/pitch/` (geometry, coords, Pitch.tsx, CanvasLayer.tsx, glyphs/, legend/) and `src/scene/` (schema, fixtures, playback).
- Playback clock: Zustand store holding `t` and `playing`, one rAF loop.
- New npm deps: d3-interpolate, d3-ease, zustand (exact pins); no visx/konva.
- Dev route: `/dev/pitch` under the existing dev-only router gate.

### Claude's Discretion
- Exact glyph drawing details and placeholder neutral palette values (Phase 4 replaces them).
- Which exact Wyscout goal sequence the recipe uses (any PL 2017/18 goal with a clean possession chain).

### Deferred Ideas (OUT OF SCOPE)
- Pitch control / xT surfaces (worker + ImageData) — later data tracks.
- WebGL — only if Canvas drops below 60 fps.
- Full Tactics Board UI — Phase 8.
- Learner's local big-5/Wyscout data — data-path checkpoint before Track 15/18.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PITCH-01 | One canonical pitch renderer (SVG + Canvas layer) draws standard dimensions and markings in canonical metres | Law 1 geometry numbers (incl. exact penalty-arc chord 7.3125 m), shared view matrix for SVG and Canvas, verified `getScreenCTM().inverse()` pattern for both orientations, DPR pattern from MDN |
| PITCH-02 | Coordinate converters for StatsBomb, Opta, Wyscout and tracking pass landmark and round-trip tests verified against provider specs | kloppy 3.19.1 zone algorithm read line by line, provider landmark tables, kloppy-generated expected values, round-trip error 1.4e-14, out-of-pitch fallback, shared fixture generator + parity design |
| PITCH-03 | Standard glyphs with an auto-generated notation legend always visible | Legend id set is derivable by a pure function and checked against SSR markup (`react-dom/server`) in node Vitest, no jsdom needed |
| PITCH-04 | A single Scene/Frame format describes authored visuals, saved boards, quiz answers and pipeline reconstructions | Schema layout inside the existing `schemas/` dual-validator harness, pydantic parity design, integrity validator, frame-sampling semantics decision |
| PIPE-01 | `/pipeline` downloads only allow-listed open sources, standardises with kloppy, writes small immutable versioned artifacts with a manifest | kloppy deps resolve with existing lock (34 packages), load from local files only, source pins (figshare md5/sha256, StatsBomb commit SHA), version-hash scheme |
| PIPE-02 | One npm script runs the pipeline on Windows with no `make` | `uv run --project pipeline klopp-pipeline run-all`; repo path has spaces; Typer commands |
| PIPE-03 | Raw and licensed data never enter git or the Vercel bundle (size/licence gates enforced in CI) | `deploy/deny-manifest.json` + `scripts/check-bundle.ts` design, glob case/platform pitfall, immutability check, CI wiring, guard extension |
| PIPE-04 | At least one recipe turns an open-data sequence into a canonical Scene/Frame sequence the app can play | Concrete Wyscout goal (Man City 5-0 Liverpool, 2017-09-09, event 185704194) with kloppy-converted values; StatsBomb freeze-frame example |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Stack is locked: Vite 8 SPA, React 19.3.1, TypeScript 7.0.2 (typecheck only), Tailwind 4 `@theme`, Biome 2.6.9, Vitest 5.1.2, zod 4.6.7, Python 3.12 + uv, kloppy brief-mandated. New deps limited to what CONTEXT locks (d3-interpolate, d3-ease, zustand); any change needs an ADR in `docs/decisions/`.
- Windows 11, repo path `E:\To become new klop` contains spaces: quote every path, use `node`/`tsx`-free scripts (`node file.ts`, erasable TS only), no `make`, no bash-only syntax in npm scripts, forward slashes, LF (`.gitattributes`).
- Sources free and legal only; record licence; StatsBomb attribution with logo; every factual claim traceable to the source registry; contested points labelled.
- No AI-slop design; follow DESIGN.md (not yet existing: Phase 4). UI-SPEC placeholders only.
- No secrets in repo. Never handle learner passwords.
- GSD workflow: all edits go through GSD commands; conventional commits; hooks live, no `--no-verify`.
- tsconfig flags that bite new code: `erasableSyntaxOnly` (no enums, namespaces, parameter properties), `verbatimModuleSyntax` (use `import type`), `noUncheckedIndexedAccess` (every `frames[i]` is `T | undefined`), `allowImportingTsExtensions` (import with `.ts`/`.tsx`).
- Model routing note from CLAUDE.md: Opus for the architecture-critical pieces (coords.ts, scene schema, layer API); Sonnet for pipeline/tests/glyphs.

## Summary

Everything the converter needs is a single algorithm in kloppy 3.19.1, and it is small. `PitchDimensions.to_metric_base` / `from_metric_base` (kloppy/domain/models/pitch.py) split each axis into zones bounded by fixed landmarks (goal line → six-yard line → penalty spot → penalty-area line → penalty-arc edge → centre-circle edge → halfway line along x; touchline → penalty-area edge → six-yard edge → goalpost → centre along y), map each zone linearly onto the same zone of an IFAB pitch, and mirror the far half. Origin and y direction are a separate step (`vertical_orientation` differs → `y = width − y`). I read the code, ran it for every provider, and have the expected canonical values for all landmarks (tables below), a left/right asymmetry case, an out-of-pitch fallback and a 2000-point round-trip (worst error 1.4e-14). The TS port is about 80 lines and the expected values come from a Python generator that writes a committed fixture, which both pytest (`--check`) and Vitest consume. That is the cross-language parity test CONTEXT asks for.

The pipeline fits the existing package without friction. `uv add kloppy==3.19.1` resolves against the current `uv.lock` in 374 ms to 34 packages (no pandas, no pyarrow needed). kloppy loads the two sources from local files or `BytesIO`, so the existing allow-listed `net.py` fetcher stays the only thing that touches the network; kloppy's own `load_open_data` bypasses the allow-list and must never be called. The Wyscout public dataset is a flat list of 643,150 England events (189 MB uncompressed, 77 MB zip); kloppy's V2 deserializer needs a per-match wrapper (`events`, `teams`, `players`) that the pipeline builds from `events_England.json`, `matches_England.json`, `players.json`, `teams.json`. I built and ran exactly that. A real, clean goal exists: Manchester City 5-0 Liverpool (2017-09-09), 2H, a 9-pass chain by one team ending in Sané's goal (event 185704194), 18.4 s, 10 events, all kloppy-converted values listed below.

The riskiest decisions are the one-way ones: Scene/Frame semantics and the layer API. For those I verified, in a real headless Edge 158 on this machine, that `group.getScreenCTM().inverse()` returns canonical metres in both orientations when vertical orientation is an SVG group matrix `matrix(0 -1 1 0 0 L)` inside a swapped `viewBox`; and that a zero-dependency CDP script (Node 24 global `WebSocket` + `msedge --headless=new`) can drive the page and read frame statistics. Bundle gates need two non-obvious fixes: the ADR 0008 `**/*statsbomb*` patterns must be scoped to `public/**` and `dist/**` (repo-wide they would block the recipe source files), and `path.matchesGlob` is case-insensitive on Windows but case-sensitive on the Linux CI runner, so lowercase both sides and use `path.posix`.

**Primary recommendation:** Port kloppy 3.19.1's zone algorithm into `src/pitch/coords.ts`, generate the expected-value fixture from kloppy (Python) and commit it; render with one shared view matrix (SVG group matrix for orientation, same six numbers for Canvas); build the Wyscout recipe on `kloppy.wyscout.load(..., data_version="V2")` over a pipeline-built per-match wrapper and the pinned goal 2499754/185704194; write `deploy/deny-manifest.json` + `scripts/check-bundle.ts` with lowercase `path.posix.matchesGlob`; freeze the Scene schema inside the existing `schemas/` ajv+Zod harness, with pydantic parity by round-tripping fixtures both ways.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Law 1 markings geometry | Browser / Client (pure TS module) | — | `pitchGeometry(length,width)` is pure; tested in node |
| Provider → canonical conversion (runtime probe, landmarks layer) | Browser / Client (`src/pitch/coords.ts`) | Python pipeline (kloppy, build time) | Both tiers must agree; fixture generated by kloppy proves it |
| Provider → canonical conversion for shipped data | Python pipeline (offline) | — | Artifacts are written already in canonical metres; the browser never converts shipped data |
| SVG + Canvas layered rendering, orientation, DPR | Browser / Client | — | View matrix pure function; ResizeObserver and matchMedia only in effects |
| Playback clock `f(t)` | Browser / Client (vanilla Zustand store + rAF) | — | State lives outside React for 60 fps |
| Drag / keyboard nudge | Browser / Client | — | Pointer capture + inverse CTM |
| Scene validation | Browser (Zod) and Node/CI (ajv) | Python (pydantic) | Three validators, one verdict, enforced by fixtures |
| Raw download, standardise, recipe, manifest | Python pipeline (offline, learner machine + CI) | — | Network only here, allow-listed |
| Shippable data serving | CDN / Static (`public/data` → `dist/data`) | — | Static JSON; SPA fallback caveat |
| Licence and size gate | Build-time Node scripts + CI | git hooks | `check-bundle.ts` after `vite build`; guard on staged files |
| Local-only data (StatsBomb) loading | Dev server only (`import.meta.glob` in dev chunk) | — | Never reaches `dist/` |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.1.0 (published 2026-11-06) | Playback clock store (vanilla `createStore` + `useStore`) | CONTEXT lock; `create`, `createStore`, `zustand/middleware`, `zustand/react/shallow` verified in the 5.1.0 tarball; peer React >=18 [VERIFIED: npm pack zustand@5.1.0 inspected] |
| d3-interpolate | 3.0.2 (2026-11-03, SLSA provenance, maintainers mbostock, recifs) | `interpolateNumber` between keyframes | CONTEXT lock; depends only on d3-color [VERIFIED: npm registry] |
| d3-ease | 3.0.2 (2026-11-03) | `easeLinear` and friends | CONTEXT lock; no deps [VERIFIED: npm registry] |
| @types/d3-interpolate / @types/d3-ease | 3.0.4 / 3.0.2 | Types (these JS packages ship none) | Needed under `strict` [VERIFIED: npm registry] |
| kloppy | 3.19.1 (PyPI 2026-10-03, BSD-3, repo github.com/PySport/kloppy) | Standardise Wyscout/StatsBomb, coordinate transform | Brief-mandated; pinned tag per CONTEXT [VERIFIED: PyPI JSON, wheel read] |
| pydantic | 2.14.4 (already pinned) | Scene models, manifest models | existing |
| typer | 0.29.3 (already pinned) | CLI subcommands | existing |

Already present and reused: react 19.3.1, react-dom 19.3.1 (`react-dom/server` for legend tests), zod 4.6.7, ajv 8.20.0 + ajv-formats 3.0.1, vitest 5.1.2, pytest 9.2.0.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:path` `posix.matchesGlob` | Node 24.21 built in, no ExperimentalWarning seen | Deny-manifest glob matching | `scripts/check-bundle.ts` and guard; lowercase both sides first |
| `node:` global `WebSocket` + Chrome DevTools Protocol | Node 24 built in | Headless Edge checks (frame time, DPR canvas, reduced motion, orientation) | `scripts/check-pitch-browser.ts`, zero deps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CDP script on installed Edge | `@playwright/test` 1.65.1 (planned for Phase 5) | Playwright gives drag/touch helpers and screenshots but is a heavy dev dependency whose browser build must be installed; CONTEXT says Playwright is not yet required. Use CDP now; reuse the same page URLs in Phase 5 |
| Own 40-line glob matcher | picomatch 4.0.7 (legitimacy OK) | `path.posix.matchesGlob` already matches the ADR patterns on Node 24; add picomatch only if the experimental API warns |
| JSON-only outputs | parquet via pyarrow 26.0.1 | Phase 3 artifacts are a few KB of scene JSON. Parquet and pyarrow add a 30+ MB wheel for no need; defer to the first data-lab phase. The existing `.gitignore` already handles `*.parquet` |
| kloppy `load_open_data` | — | Never. It fetches via fsspec/aiohttp from GitHub, bypassing `net.py` host/size/redirect rules, and prints a licence warning |

**Installation:**
```bash
# repo root (exact pins, no ^)
npm install --save-exact zustand@5.1.0 d3-interpolate@3.0.2 d3-ease@3.0.2
npm install --save-dev --save-exact @types/d3-interpolate@3.0.4 @types/d3-ease@3.0.2
# pipeline
uv add --project pipeline kloppy==3.19.1
```

**Version verification:** versions above read from the live npm registry and PyPI on 2026-11-28. `uv add --no-sync kloppy==3.19.1` on a copy of the real `pipeline/pyproject.toml` + `uv.lock` printed `Resolved 34 packages in 374ms`. New transitive Python packages: fsspec[http] (aiohttp, aiosignal, frozenlist, multidict, yarl, attrs, idna, propcache, aiohappyeyeballs), lxml, python-dateutil, pytz, sortedcontainers, tzdata. All have Windows wheels (installed in a scratch venv on this machine). `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities today.

## Package Legitimacy Audit

Run with `gsd-tools query package-legitimacy check`. The tool's `SUS` verdicts below all come from the `too-new` heuristic (latest version published within 30 days) or `unknown-downloads`/`no-repository` (PyPI exposes no download counts and the registry field for repo is empty), not from low usage or a missing source repo. I recorded the evidence beside each verdict. Per protocol the planner still adds one `checkpoint:human-verify` before installing the SUS items; the check is cheap (confirm the pinned version, `npm audit signatures`, which CI already runs).

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| zustand 5.1.0 | npm | 5+ yrs (latest 2026-11-06) | 91.8M/wk | github.com/pmndrs/zustand | SUS (too-new) | Approved, `[WARNING: flagged as suspicious — verify before using.]` human-verify checkpoint before install; evidence: huge usage, official repo, no postinstall, CONTEXT lock |
| d3-interpolate 3.0.2 | npm | 10+ yrs (3.0.2 on 2026-11-03) | 109M/wk | github.com/d3/d3-interpolate | SUS (too-new) | Approved with checkpoint; re-publish with SLSA provenance by the same maintainers (mbostock, recifs); previous 3.0.1 was 2021 |
| d3-ease 3.0.2 | npm | 10+ yrs (2026-11-03) | 97M/wk | github.com/d3/d3-ease | SUS (too-new) | Approved with checkpoint; same as above |
| @types/d3-interpolate 3.0.4 | npm | DefinitelyTyped | 100M/wk | github.com/DefinitelyTyped/DefinitelyTyped | OK | Approved |
| @types/d3-ease 3.0.2 | npm | DefinitelyTyped | 81M/wk | github.com/DefinitelyTyped/DefinitelyTyped | OK | Approved |
| kloppy 3.19.1 | PyPI | 5+ yrs (3.19.1 on 2026-10-03) | n/a on PyPI | github.com/PySport/kloppy (PyPI `project_urls`) | SUS (unknown-downloads, no-repository in the tool's metadata) | Approved with checkpoint; brief-mandated, official docs kloppy.pysport.org, BSD-3 licence file, installed and exercised this session |
| fsspec, aiohttp, lxml and the rest of kloppy's transitive set | PyPI | years | n/a | official repos (fsspec/filesystem_spec, aio-libs/aiohttp, lxml/lxml) | SUS (unknown-downloads; lxml also too-new 2026-11-27) | Transitive, locked by `uv.lock` hashes; no direct install by the plan |

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious SUS:** zustand, d3-interpolate, d3-ease, kloppy (planner inserts `checkpoint:human-verify` before the install tasks)

## Architecture Patterns

### System Architecture Diagram

```
 OFFLINE (learner machine / CI), `npm run data`
 ─────────────────────────────────────────────
 pipeline/sources.allow.json ──► fetch <source> ──► net.fetch_bytes (https, host+redirect allow-list, size cap)
        (url pattern, licence,                       │   cache: pipeline/data/raw/<source>/  (git-ignored, sha256-pinned)
         shippable, sha256 pin)                      ▼
                                              standardise <source>
                                   Wyscout: zip member ► wrapper{events,teams,players} ► kloppy.wyscout.load(V2)
                                   StatsBomb: local event+lineup json ► kloppy.statsbomb.load
                                                     │  dataset.transform(to_pitch_dimensions=Metric 105x68, to_orientation=...)
                                                     ▼
                                              recipe <name>  (pinned match/event ids)
                                                     │  pick chain ► frames/events ► pydantic Scene(kind=reconstruction)
                                                     ▼
                              data/<dataset>/<version>/scene-*.json + manifest.json   (immutable, version = hash)
                                                     │
                                  publish (shippable:true only) ──► public/data/<dataset>/<version>/ + public/data/catalog.json
                                                     │
 BUILD / CI ─────────────────────────────────────────┼───────────────────────────────────────────
   vite build ──► dist/ ──► scripts/check-bundle.ts (deny globs, size budget, catalog entry, content markers)
   git guard (staged/tracked) ◄── deploy/deny-manifest.json ──► check-immutable (no M/D/R under data/ and public/data/ version dirs)

 BROWSER ────────────────────────────────────────────
  /dev/pitch?scene=… ──► scene source: fixtures (src/scene/fixtures/*.json, glob) | fetch /data/wyscout/<v>/scene.json
                         | local StatsBomb (import.meta.glob in dev chunk only)
        │ Zod parse + checkSceneIntegrity()  ──► invalid? → error panel (≤5 issues)
        ▼
   playback store (vanilla zustand: t, playing, speed, motion) ◄─ one rAF loop ─ PlaybackBar / keys
        │ sampleScene(scene, t) = d3-interpolate between frames
        ▼
   <Pitch> container (aspect = viewBox)
      ├─ bottom SVG  (run-off + field rects, aria-hidden)
      ├─ <canvas>    (density dots; ctx.setTransform(dpr·view))
      └─ top SVG     (<g matrix = orientation>  markings → … → players → focus rings; pointer events)
        │ glyphIdsForScene(scene,layers) ─► <Legend> (always visible)
        │ pointer: group.getScreenCTM().inverse() ─► canonical metres ─► drag / readout / probe
```

### Recommended Project Structure
```
src/pitch/
  geometry.ts          # pitchGeometry(length,width): pure Law 1 primitives (metres)
  coords.ts            # providers table + toCanonical/fromCanonical (kloppy zone algorithm)
  coords.test.ts       # landmarks.json fixture, round-trip, asymmetry, out-of-pitch
  view.ts              # makeView(): 2x3 matrix for SVG group + Canvas, screenToCanonical()
  Pitch.tsx  CanvasLayer.tsx  useDraggableEntity.ts
  glyphs/*.tsx  glyphs/registry.ts
  legend/Legend.tsx  legend/glyphIds.ts
  fixtures/landmarks.json        # generated by `klopp-pipeline landmarks`, committed
src/scene/
  schema.ts            # Zod mirror
  validate.ts          # checkSceneIntegrity() semantic checks (shared by tests and the dev page)
  fixtures/{authored,board,quiz-answer,reconstruction}.json  fixtures/invalid/*.json
  playback/store.ts  playback/sample.ts  playback/PlaybackBar.tsx  playback/icons.tsx
src/routes/dev-pitch.tsx
schemas/scene.schema.json  schemas/fixtures/scene.fixtures.json   # picked up by existing schemas.test.ts
deploy/deny-manifest.json
scripts/check-bundle.ts  scripts/check-immutable.ts  scripts/check-pitch-browser.ts  scripts/lib/globs.ts
pipeline/sources.allow.json
pipeline/src/klopp_pipeline/{sources.py,fetch.py,standardise.py,recipes/wyscout_goal.py,recipes/statsbomb_shot.py,
                             scene.py,manifest.py,publish.py,landmarks.py}
pipeline/tests/{conftest.py (socket block),test_*.py,fixtures/*}
data/wyscout/<version>/   public/data/wyscout/<version>/   public/data/catalog.json
docs/decisions/0009-pitch-layer-api.md
```

### Pattern 1: kloppy zone algorithm in TypeScript (the converter core)
**What:** For one axis, source landmarks (provider constants) and target landmarks (IFAB constants for the scene pitch) define zone breakpoints. A value is mirrored into the first half, located in a zone, interpolated linearly, mirrored back. Outside every zone, scale globally.
**When to use:** StatsBomb, Opta, Wyscout, and tracking whose pitch size differs from the scene pitch.
**Source of truth:** `kloppy/domain/models/pitch.py` in the 3.19.1 wheel.

Verbatim from `pitch.py:231-287` (zones) [VERIFIED: kloppy 3.19.1 wheel, kloppy/domain/models/pitch.py:231-287]:
```python
def _transformation_zones_x(self, length: float):
    penalty_arc = self.penalty_spot_distance + self.penalty_arc_radius
    return [
        (self.x_dim.min, self.x_dim.min + self.six_yard_length),                         # goal line to 6 yard box
        (self.x_dim.min + self.six_yard_length, self.x_dim.min + self.penalty_spot_distance),  # 6 yard box to penalty spot
        (self.x_dim.min + self.penalty_spot_distance, self.x_dim.min + self.penalty_area_length), # spot to penalty area
        (self.x_dim.min + self.penalty_area_length, self.x_dim.min + penalty_arc),       # penalty area to penalty arc
        (self.x_dim.min + penalty_arc, self.x_dim.min + length / 2 - self.circle_radius), # arc to center circle
        (self.x_dim.min + length / 2 - self.circle_radius, self.x_dim.min + length / 2),  # circle to center line
    ]
def _transformation_zones_y(self, width: float):
    return [
        (self.y_dim.min, self.y_dim.min + (width - self.penalty_area_width) / 2),                     # side line to penalty area
        (self.y_dim.min + (width - self.penalty_area_width) / 2, self.y_dim.min + (width - self.six_yard_width) / 2), # PA to six yard box
        (self.y_dim.min + (width - self.six_yard_width) / 2, self.y_dim.min + (width - self.goal_width) / 2),        # six yard box to inside goalpost
        (self.y_dim.min + (width - self.goal_width) / 2, self.y_dim.min + width / 2),                 # inside goalpost to center
    ]
```
The transform (`pitch.py:330-359`): if `v > from_zones[-1][1]` then `v = from_length - (v - from_zones[0][0]) + from_zones[0][0]` and `mirror = True`; find the first zone with `zone[0] <= v <= zone[1]`; `ifab = ifab_zones[z][0] + (v - from_zones[z][0]) * (Δifab/Δfrom)`; on `StopIteration` (outside the pitch) `ifab = ifab_zones[0][0] + (v - from_zones[0][0]) * (ifab_length / from_length)`; if mirrored `ifab = ifab_length - ifab`. `from_metric_base` (lines 446-475) is the inverse with the same shape.

TS sketch (erasable syntax only; inputs are post-parse provider coordinates):
```typescript
// src/pitch/coords.ts — Source: kloppy 3.19.1 pitch.py:231-475, ported
export interface Landmarks { sixYardLength: number; sixYardWidth: number; goalWidth: number;
  penaltyAreaLength: number; penaltyAreaWidth: number; circleRadius: number;
  penaltySpotDistance: number; penaltyArcRadius: number }
type Zone = readonly [number, number];
const zonesX = (l: Landmarks, min: number, len: number): Zone[] => { /* six entries as above */ return []; };
const zonesY = (l: Landmarks, min: number, wid: number): Zone[] => { /* four entries as above */ return []; };
function warp(v: number, fromZones: Zone[], fromLen: number, toZones: Zone[], toLen: number): number {
  const f0 = fromZones[0]?.[0] ?? 0, t0 = toZones[0]?.[0] ?? 0;
  let mirror = false;
  const last = fromZones.at(-1)?.[1] ?? 0;
  if (v > last) { v = fromLen - (v - f0) + f0; mirror = true; }
  const z = fromZones.findIndex((zn) => zn[0] <= v && v <= zn[1]);
  let out: number;
  if (z === -1) out = t0 + (v - f0) * (toLen / fromLen);       // run-off fallback = global scale
  else { const [a, b] = fromZones[z]!; const [c, d] = toZones[z]!; out = c + (v - a) * ((d - c) / (b - a)); }
  return mirror ? toLen - out : out;                            // same mirror form kloppy uses for min = 0
}
```
Edge: kloppy's mirror algebra for `min != 0` (centred tracking) is `max + min − v`; for tracking whose size equals the scene size use translation/flip only (CONTEXT) and keep the zone warp for size changes, as the Sportec 100×65 → 105×68 case shows (it lands the left penalty spot exactly on (11, 34)).

### Pattern 2: Provider frame table (encode, then test)
All values read from the 3.19.1 wheel this session.

| Provider | Origin / y direction / unit | Axis range | Landmark constants (kloppy 3.19.1) |
|----------|------------------------------|-----------|-------------------------------------|
| StatsBomb | top-left, top→bottom, yards | x 0..120, y 0..80 | `ImperialPitchDimensions`: goal 8, six-yard width 20 / length 6, PA width 44 / length 18, circle r 10, spot 12, arc r 10 |
| Opta | bottom-left, bottom→top, 0..100 | 100 × 100 | PA 17.0 × 57.8, six-yard 5.8 × 26.4, goal 9.6, circle 9.00, spot 11.5, arc 8.9 |
| Wyscout (v2 and v3 share one class) | top-left, top→bottom, 0..100 | 100 × 100 | PA 16.0 × 62.0, six-yard 6.0 × 26.0, goal 12.0, spot 10.0, circle 8.84 and arc 7.74 (kloppy comments: `# inferred`) |
| Tracab tracking | centre, bottom→top, centimetres | ±L/2, ±W/2 (cm) | Metric dims converted to cm |
| Sportec/DFL tracking, SkillCorner, PFF, Second Spectrum | centre, bottom→top, metres | ±L/2, ±W/2 | Metric dims |
| Sportec/DFL events | bottom-left, `BOTTOM_TO_TOP`, metres | 0..L, 0..W | Metric dims. The class docstring says "top to bottom" but the code returns `VerticalOrientation.BOTTOM_TO_TOP`; the code wins |
| Metrica / kloppy default | top-left, top→bottom, 0..1 | 1 × 1 | Normalised IFAB landmarks, default pitch 105 × 68 when no size |

Quoted from `pitch.py` [VERIFIED: kloppy 3.19.1 wheel, kloppy/domain/models/pitch.py:654-672, 675-693, 580-604]:
```python
class OptaPitchDimensions(PitchDimensions):
    x_dim = Dimension(0, 100); y_dim = Dimension(0, 100); standardized = True; unit = Unit.NORMED
    goal_width = 9.6; goal_height = 38; six_yard_width = 26.4; six_yard_length = 5.8
    penalty_area_width = 57.8; penalty_area_length = 17.0; circle_radius = 9.00
    corner_radius = 0.97; penalty_spot_distance = 11.5; penalty_arc_radius = 8.9
class WyscoutPitchDimensions(PitchDimensions):
    goal_width = 12.0; goal_height = None; six_yard_width = 26.0; six_yard_length = 6.0
    penalty_area_width = 62.0; penalty_area_length = 16.0
    circle_radius = 8.84  # inferred
    corner_radius = 0.97  # inferred
    penalty_spot_distance = 10.0
    penalty_arc_radius = 7.74  # inferred
class ImperialPitchDimensions(PitchDimensions):   # used by StatsBomb
    goal_width = 8; goal_height = 2.66; six_yard_width = 20; six_yard_length = 6
    penalty_area_width = 44; penalty_area_length = 18; circle_radius = 10
    corner_radius = 1; penalty_spot_distance = 12; penalty_arc_radius = 10
```
And from `common.py:1040-1069` `StatsBombCoordinateSystem`: `Dimension(0, 120)`, `Dimension(0, 80)`, `Origin.TOP_LEFT`, `VerticalOrientation.TOP_TO_BOTTOM`; `common.py:938-962` Opta `Origin.BOTTOM_LEFT`, `VerticalOrientation.BOTTOM_TO_TOP`; `common.py:1116-1140` Wyscout `Origin.TOP_LEFT`, `VerticalOrientation.TOP_TO_BOTTOM`; `common.py:850-891` Tracab `Origin.CENTER`, `BOTTOM_TO_TOP`, `.convert(to_unit=Unit.CENTIMETERS)`.

Independent corroboration of the Opta numbers: the `ggsoccer` package's Opta dimensions list `penalty_box_length 17`, `penalty_box_width 57.8`, `six_yard_box_length 5.8`, `six_yard_box_width 26.4` [CITED: rdrr.io/github/Torvaney/ggsoccer/src/R/dimensions.R via web search summary]. Opta's own definitions page is not readable (403 in Phase 2), so Opta and the Wyscout fixed-landmark values rest on kloppy plus one independent R package. See Assumptions A1, A2.

StatsBomb cell-centre quirk, `kloppy/infra/serializers/event/statsbomb/helpers.py:62-91` [VERIFIED: kloppy 3.19.1 wheel]:
```python
def parse_coordinates(coordinates: list[float], fidelity_version: int) -> Point:
    """Coordinates are cell-based, so 1,1 (low-granularity) or 0.1,0.1 (high-granularity) is the
    top-left square 'yard' of the field (in landscape), even though 0,0 is the true coordinate of the corner flag."""
    cell_side = 0.1 if fidelity_version == 2 else 1.0
    cell_relative_center = cell_side / 2
    ... x=coordinates[0] - cell_relative_center, y=coordinates[1] - cell_relative_center
```
So kloppy subtracts 0.5 (v1 data) or 0.05 (v2, 0.1 granularity). The TS converter takes post-parse coordinates (the 0..120 × 0..80 frame). Expose `statsBombCellCentre(raw, fidelity)` separately and document it; never apply the offset twice.

Orientation: all three event providers load as `Orientation.ACTION_EXECUTING_TEAM` (each event shown with the acting team attacking left→right) [VERIFIED: ran kloppy; `ds.metadata.orientation` printed `Orientation.ACTION_EXECUTING_TEAM` for StatsBomb and Wyscout]. A static view is `dataset.transform(to_orientation=Orientation.STATIC_HOME_AWAY)`.

### Pattern 3: Landmark test table (generated by kloppy 3.19.1 today, target pitch 105 × 68)
Provider-native (post-parse) → canonical metres. Generate this file with the pipeline (`klopp-pipeline landmarks`) and commit; the numbers below are the expected content.

| Landmark | StatsBomb | Opta | Wyscout | Canonical (x, y) |
|----------|-----------|------|---------|------------------|
| centre spot | (60, 40) | (50, 50) | (50, 50) | (52.5, 34) |
| left penalty spot | (12, 40) | (11.5, 50) | (10, 50) | (11, 34) |
| right penalty spot | (108, 40) | (88.5, 50) | (90, 50) | (94, 34) |
| left PA corner, top (small y) | (18, 18) | (17, 78.9) | (16, 19) | (16.5, 13.84) |
| left PA corner, bottom | (18, 62) | (17, 21.1) | (16, 81) | (16.5, 54.16) |
| right PA corner, top | (102, 18) | (83, 78.9) | (84, 19) | (88.5, 13.84) |
| right PA corner, bottom | (102, 62) | (83, 21.1) | (84, 81) | (88.5, 54.16) |
| left goal-area corner, top | (6, 30) | (5.8, 63.2) | (6, 37) | (5.5, 24.84) |
| left goal-area corner, bottom | (6, 50) | (5.8, 36.8) | (6, 63) | (5.5, 43.16) |
| right goal-area corner, top | (114, 30) | (94.2, 63.2) | (94, 37) | (99.5, 24.84) |
| right goal-area corner, bottom | (114, 50) | (94.2, 36.8) | (94, 63) | (99.5, 43.16) |
| corner flag, top-left | (0, 0) | (0, 100) | (0, 0) | (0, 0) |
| corner flag, bottom-left | (0, 80) | (0, 0) | (0, 100) | (0, 68) |
| corner flag, top-right | (120, 0) | (100, 100) | (100, 0) | (105, 0) |
| corner flag, bottom-right | (120, 80) | (100, 0) | (100, 100) | (105, 68) |
| left goalposts (StatsBomb only) | (0, 36), (0, 44) | | | (0, 30.34), (0, 37.66) |

Tracking (kloppy transformer, canonical y is down): Tracab centimetres, pitch 105 × 68, centre origin y up: (0, 0) → (52.5, 34); (−4150, 0) → (11, 34); (4150, 0) → (94, 34); (−3600, 2016) → (16.5, 13.84); (−5250, −3400) → (0, 68); (5250, 3400) → (105, 0). Sportec/DFL tracking identical in metres. Metrica 0..1: (0.5, 0.5) → (52.5, 34); (11/105, 0.5) → (11, 34); (1, 1) → (105, 68).

Left/right and top/bottom asymmetry cases (a point near the left spot must not land near the right):
- StatsBomb (14, 40) → (12.8333, 34) and (106, 40) → (92.1667, 34).
- Opta (20, 80) → (19.7206, 13.1185) top; Opta (20, 20) → (19.7206, 54.8815) bottom (y flips).
- Wyscout (20, 80) → (22.3888, 53.5489) bottom; (20, 20) → (22.3888, 14.4511) top (no y flip).
- Tracab (−3000, 2000) cm → (22.5, 14.0).

Non-standard scene pitch, Fulham 100 × 65: StatsBomb (12, 40) → (11, 32.5); (108, 40) → (89, 32.5); (18, 18) → (16.5, 12.34); (102, 62) → (83.5, 52.66); (120, 80) → (100, 65); Opta and Wyscout give the same spot and PA values. Sportec tracking from a 100 × 65 pitch placed in a 105 × 68 scene: (−39, 0) → (11, 34); (−50, −32.5) → (0, 68).

Out-of-pitch run-off falls back to the global per-axis scale: StatsBomb (−2, −2) → (−1.75, −1.7); (122, 82) → (106.75, 69.7). Opta (−2, −2) → (−2.1, 69.36); (102, 102) → (107.1, −1.36). Wyscout (−2, −2) → (−2.1, −1.36); (102, 102) → (107.1, 69.36).

Round trip: 2000 random in-pitch points per provider through `to` then `from`: worst absolute error 1.42e-14 for all three. Use tolerance 1e-9 in Vitest.

How the generator calls kloppy (the only non-public step): `DatasetTransformer(from_coordinate_system=build_coordinate_system(provider, dataset_type=..., pitch_length=..., pitch_width=...), to_coordinate_system=CustomCoordinateSystem(Origin.TOP_LEFT, VerticalOrientation.TOP_TO_BOTTOM, MetricPitchDimensions(x_dim=Dimension(0,L), y_dim=Dimension(0,W), pitch_length=L, pitch_width=W, standardized=False)))` then the name-mangled `_DatasetTransformer__change_point_coordinate_system(Point(x, y))`. Pin kloppy exactly and have pytest assert the generator output equals the committed file, so a kloppy upgrade that changes behaviour shows up as a failing diff.

### Pattern 4: One view matrix for SVG, Canvas and the inverse
**What:** A pure `makeView({length, width, runoff, orientation, cssWidth})` returns the 2×3 matrix `[a b c d e f]` mapping canonical metres to CSS pixels, plus `viewBox` string and `screenToCanonical`. SVG applies the orientation as a group transform inside a swapped `viewBox`; Canvas uses the same six numbers times DPR.

- Horizontal: `viewBox = "-r -r L+2r W+2r"` (r = runoff 3). Group transform none. CSS-pixel matrix: `s = cssW/(L+2r)`, `[s 0 0 s s·r s·r]`.
- Vertical: `viewBox = "-r -r W+2r L+2r"`, group `transform="matrix(0 -1 1 0 0 L)"` (canonical `(x, y)` → view `(y, L − x)`, exactly UI-SPEC). CSS-pixel matrix: `s = cssW/(W+2r)`, `[0 −s s 0 s·r s·(L+r)]`.
- Canvas: `ctx.setTransform(dpr·a, dpr·b, dpr·c, dpr·d, dpr·e, dpr·f)`; backing store `canvas.width = Math.floor(cssW·dpr)`; DPR change by `matchMedia("(resolution: ${dpr}dppx)")` re-created on each change [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio].
- Inverse: take the canonical-space group (`<g data-canonical-root>`) and call `g.getScreenCTM()?.inverse()`, then `new DOMPoint(e.clientX, e.clientY).matrixTransform(inv)`. Do not use the root `<svg>` CTM: the group matrix is what makes it orientation-agnostic.

Verified in headless Edge 158 on this machine [VERIFIED: ran `ctm.html` through CDP this session]: for a circle at canonical (11, 34) in a 105 × 68 pitch, the probe read screen (90, 205) → canonical `[11, 34]` in horizontal and screen (205, 879) → canonical `[11, 34]` in vertical (viewBox `-3 -3 74 111`, group `matrix(0 -1 1 0 0 105)`). MDN documents `getScreenCTM` and `inverse()` but does not state that ancestor transforms and `viewBox` are included, so the test above is the evidence [CITED: developer.mozilla.org/en-US/docs/Web/API/SVGGraphicsElement/getScreenCTM].

Unit-test `makeView` and `screenToCanonical` in node (no DOMMatrix in node: write the 6-number matrix helpers yourself), including "left penalty mark at the screen position of canonical (11, 34) reads x 11.00 in both orientations" from UI-SPEC.

### Pattern 5: Pointer-capture drag
`pointerdown` on the 22 px hit circle: `el.setPointerCapture(e.pointerId)`; on `pointermove` convert with the inverse above, clamp to `[-3, L+3] × [-3, W+3]`, round to 0.1; `pointerup`/`pointercancel`/`lostpointercapture` end the drag; `keydown` Escape restores the start position. Only draggable glyphs set `touch-action: none` (UI-SPEC). Keyboard nudge is in screen directions: map the arrow vector through the inverse linear part (`c, d` of the view matrix) so arrows feel right in vertical orientation, then clamp. Use the store position (canonical, 0.1 m) as the single source; render the ghost from the start snapshot.

### Pattern 6: Playback as `f(t)`
- `sampleScene(scene, t)` is pure: binary search over `frames` (sorted, strictly increasing `t`), `interpolateNumber` for x and y per entity present in both bracketing frames. With `noUncheckedIndexedAccess`, guard every index.
- The store is a vanilla `createStore` factory (`createPlaybackStore()`), not a module singleton, so Vitest can drive it in node without React. One module-level rAF loop calls `store.setState({ t })`. Components subscribe with `useStore(store, selector)`; for the 22-player stress scene start with a single `<PlaybackLayer>` selector on `t` and measure; if React render time per frame is above budget, switch players to imperative `transform` writes from `store.subscribe` (the plain-DOM baseline is 0.06 ms for 23 SVG groups, see below). Record the choice in ADR 0009.
- `Stepped` mode skips interpolation: positions hold the keyframe for `0.5 s ÷ speed`.
- Time and state must be testable: assert positions at `t = 3.2 s` (STACK).

### Pattern 7: Headless measurement with no new dependency
Node 24 has a global `WebSocket`. A 40-line script spawns `msedge.exe --headless=new --remote-debugging-port=9333 --user-data-dir=<tmp> about:blank` (argument array, no shell; the profile path is one argv element, so spaces in the repo path are safe; keep the profile under the OS temp dir, not the repo), polls `http://127.0.0.1:9333/json/list`, opens the page target's `webSocketDebuggerUrl`, and sends `Page.navigate`, `Runtime.evaluate` (read counters, click `[aria-label="Play sequence"]`), `Emulation.setDeviceMetricsOverride` (width 375/768/1440, `deviceScaleFactor` 2 for the canvas check), `Emulation.setEmulatedMedia` (`prefers-reduced-motion: reduce`), `Page.captureScreenshot`. Kill with `taskkill /pid <pid> /T /F` exactly as `scripts/smoke.ts` does.

Baseline measured today in headless Edge 158 [VERIFIED: ran `stress.html` through the script]: 374 frames in 3 s, mean rAF interval 6.74 ms (about 148 Hz on this display, not 60), p95 6.2 ms, mean JS work per frame 0.064 ms for 23 SVG `transform` writes. Consequence: the "≤ 16.7 ms" backstop must be asserted on the page's own work time and on the count of intervals above 20 ms, not on the mean rAF interval, because headless cadence follows the display. Suggested assertion for the stress scene: mean per-frame work ≤ 6 ms, p95 rAF interval ≤ 20 ms, zero intervals above 50 ms after a 5-frame warm-up. These thresholds are my proposal (Assumption A5), recorded with machine info in ADR 0009.

### Pattern 8: Wyscout → kloppy → Scene (recipe)
1. Fetch (allow-listed, size-capped, sha256-pinned, cached under `pipeline/data/raw/wyscout/`): `events.zip` (77,323,413 bytes), `matches.zip` (645,097), `players.json` (1,737,347), `teams.json` (27,404).
2. Read the member `events_England.json` (188,888,614 bytes uncompressed, ratio about 12:1) straight out of the zip; cap the member at 250 MB and refuse above. `json.loads` took 2.1 s and a peak working set of 1,416 MB on this machine [VERIFIED: ran `mem.py`]; filter to the pinned `matchId` immediately and drop the rest. This is acceptable for a one-time offline step; do not add `ijson`.
3. Build the kloppy V2 wrapper: `{"events": [<match events>], "teams": {homeId: {"team": {"officialName": ...}}, awayId: {...}}, "players": {teamId: [{"player": {"wyId", "firstName", "lastName"}} ...]}}`. `teams` key order is home then away (kloppy does `home_team_id, away_team_id = raw_events["teams"].keys()`); take sides from `matches_England.json` `teamsData[...].side`; players from the lineup plus bench of that match joined to `players.json`.
4. `kloppy.wyscout.load(event_data=io.BytesIO(...), data_version="V2", coordinates="wyscout")` then `dataset.transform(to_pitch_dimensions=MetricPitchDimensions(x_dim=Dimension(0,105), y_dim=Dimension(0,68), pitch_length=105, pitch_width=68, standardized=False))`. Run on match 2499754: 1,749 kloppy events, orientation `ACTION_EXECUTING_TEAM`, origin `top-left`, `VerticalOrientation.TOP_TO_BOTTOM`.
5. Recipe selects by config `(matchId, shotEventId)` and walks backwards over same-team, same-period events until an opponent event, `Interruption`, `Foul`, `Offside` or `Save attempt`.
6. Emit a `reconstruction` Scene (frames from event start/end, ball path, `ballOwner`, typed `events[]`), rounded to 2 decimals, `json.dumps(..., sort_keys=True, ensure_ascii=False, separators=(",", ":"))`, LF line endings.

**The pinned goal** [VERIFIED: ran against the downloaded dataset, kloppy-converted]: match `2499754`, "Manchester City - Liverpool, 5 - 0", 2017-09-09 11:30 UTC, 2H, Manchester City attacking left to right. Chain after Liverpool's inaccurate launch (event 185704089, tag 1802):

| event id | t (s, period clock) | kind | player | start (m) | end (m) | raw start→end (0..100) |
|----------|--------------------|------|--------|-----------|---------|-------------------------|
| 185704173 | 1852.91 | pass | Mangala | (40.22, 19.34) | (54.57, 21.78) | (38,28)→(52,32) |
| 185704174 | 1854.24 | pass | Danilo (kloppy `da Silva`) | (54.57, 21.78) | (39.23, 19.34) | (52,32)→(37,28) |
| 185704175 | 1856.60 | pass | Mangala | (39.23, 19.34) | (34.28, 32.17) | (37,28)→(32,47) |
| 185704176 | 1858.19 | pass | Stones | (34.28, 32.17) | (39.23, 44.99) | (32,47)→(37,66) |
| 185704177 | 1860.57 | pass | Walker | (39.23, 44.99) | (38.24, 20.56) | (37,66)→(36,30) |
| 185704179 | 1862.65 | pass | Mangala | (38.24, 20.56) | (69.73, 23.62) | (36,30)→(67,35) |
| 185704180 | 1864.39 | pass | De Bruyne | (69.73, 23.62) | (82.61, 19.95) | (67,35)→(80,29) |
| 185704187 | 1867.35 | pass | Sané | (82.61, 19.95) | (95.38, 13.84) | (80,29)→(91,19) |
| 185704192 | 1868.89 | cross | Mendy | (95.38, 13.84) | (99.50, 24.84) | (91,19)→(94,37) |
| 185704194 | 1871.28 | shot, goal (tags 101, 401, 201, 1205, 1801) | Sané | (99.50, 24.84) | (105.00, 30.95) | (94,37)→(0,0) |

Duration 18.4 s, 10 events, 7 City players (Mangala, Danilo, Stones, Walker, De Bruyne, Sané, Mendy), no opponent event inside the chain. The shot's raw end `(0,0)` is a placeholder: kloppy derives `result_coordinates` from the zone tag (1205 "Goal low left" maps to y 45 in Wyscout units, `deserializer_v2.py`), so draw the shot end as approximate and say so in the `<desc>`. Candidate scan over all 914 goal-tagged shots in the England file found longer chains (the longest has 22 passes), but 2499754/185704194 is short, readable, and attributed.

Wyscout facts the recipe needs (event ids from `wyscout_events.py`: Duel 1, Foul 2, Free Kick 3, Goalkeeper 4, Interruption 5, Offside 6, Others on the ball 7, Pass 8, Save 9, Shot 10; tags from `wyscout_tags.py`: Goal 101, Own goal 102, Opportunity 201, Assist 301, Key pass 302, Left foot 401, Right foot 402, Head/body 403, Accurate 1801, Not accurate 1802, Counter attack 1901, Goal zones 1201–1209) [VERIFIED: kloppy 3.19.1 wheel, infra/serializers/event/wyscout/wyscout_events.py and wyscout_tags.py read]. The raw record shape is `{eventId, subEventName, tags:[{id}], playerId, positions:[{y,x},{y,x}], matchId, eventName, teamId, matchPeriod:"1H"|"2H"|..., eventSec, subEventId, id}`.

y direction cross-check [VERIFIED: statistical test run this session on events_England.json; corroboration, not proof]: mean origin y (x ≥ 80) of shots tagged "goal low right" (1202, n=362) 51.3 versus "goal low left" (1205, n=363) 46.5; "goal centre right" (1206, n=203) 54.8 versus "centre left" (1204, n=201) 46.1. Higher y goes with the "right" tag, consistent with kloppy's frame (y increases toward the attacker's right, which is down the screen when the attack runs left to right) and with the Pappalardo paper sentence in the registry [CITED: registry src-nature-pappalardo-wyscout-events#coords-axes via research/pitch-geometry/findings.md]. This resolves the Phase 2 open question about Wyscout origin and y direction in favour of kloppy's description.

Data gotcha: `players.json` names are double-escaped (`lastName` holds the literal text `San\u00e9`, not `Sané`); kloppy returns it unchanged. Decode with `re.sub(r"\\u([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), s)` once in the pipeline. Wyscout players have no shirt numbers; `role.code2` (GK, DF, MD, FW) is available. The Scene entity `number` must therefore be optional and the glyph text falls back to a 2-letter surname initialism (planner decision, A6).

### Pattern 9: StatsBomb (local-only) recipe
- Pin source by commit: open-data head today is `4b73468fc5b0f1950f9f66fada70ad3a4f9327cb` (2026-09-07) [VERIFIED: gh api]. URL pattern `https://raw.githubusercontent.com/statsbomb/open-data/<sha>/data/...` so a force-push or new data cannot change a build silently. Fetch `matches/2/27.json` (2015/16 Premier League, 380 matches, 698,179 bytes), the match's `events/<id>.json` (3,198,595 bytes for 3754047) and `lineups/<id>.json` (20,043 bytes).
- Load with `kloppy.statsbomb.load(event_data=<path>, lineup_data=<path>, coordinates="statsbomb")` (no 360 argument; this season has none). Example shot with a freeze frame: match 3754047 (Liverpool 1-0 Swansea City, 2015-11-29), event `e6427836-c67b-4a24-8928-e0b81cbf2b24`, Swansea's number 17 (Éderzito António Macedo Lopes), 0:07:19.689, off target, xG 0.0984, 14 freeze-frame players. After `transform(to_pitch_dimensions=<105x68 metric>)` the shot is at (99.82, 38.90) with end `Point3D (104.95, 41.28, z 0.688)`; static home-away orientation moves it to (5.18, 29.10) because Swansea are the away team. 18 of the 19 shots in that match carry freeze frames (the penalty goal does not).
- kloppy parses freeze frames into `event.freeze_frame.players_data` keyed by `Player` with `jersey_no`, `team`, `position` (including `Goalkeeper`), so StatsBomb scenes get real shirt numbers (a difference from Wyscout).
- Licence: agreement 1.2.1 bars providing the data to any third party, 1.4 requires credit with logo [CITED: docs/decisions/0008-watch-gym-l1-clip-supply.md]. Output stays under `data/statsbomb/`, `source.shippable = false`, attribution string carries "StatsBomb", and the manifest carries `logoRequired: true`.

### Pattern 10: Scene schema inside the existing harness
`schemas/schemas.test.ts` already enumerates every `schemas/*.schema.json` except `common`, requires a Zod mirror in `contractSchemas` (`src/schemas/contracts.ts:153-158`) and a `schemas/fixtures/<name>.fixtures.json` with `valid[]`/`invalid[]` entries where each invalid entry has an `expect_path` that both validators must report. Place `schemas/scene.schema.json`, add `scene: sceneSchema` to `contractSchemas` (import from `src/scene/schema.ts`), and add `schemas/fixtures/scene.fixtures.json` with small inline docs. The four full fixtures in `src/scene/fixtures/` get a second test (`src/scene/scene.test.ts`) running ajv, Zod, and `checkSceneIntegrity`. Reuse `common.schema.json#/$defs/kebabId`, `httpUrl`, `utcDateTime`, `sha256`; ajv is `strict: true`, so no `discriminator` keyword: model `events[]` as `oneOf` branches each with `required: ["type"]`, `properties.type.const`, `additionalProperties: false`; mirror in Zod with `z.discriminatedUnion("type", ...)` and `z.strictObject`.
Schema content (proposal consistent with CONTEXT): `kind` enum; `pitch {length 90..120, width 45..90}` (Law 1 ranges); `teams[] {id, name, side: "home"|"away"|"a"|"b", attack: {"1": "ltr"|"rtl", ...}}`; `entities[] {id, type: "player"|"goalkeeper"|"ball", team?, number?: int, label?: string, role?: string}`; `frames[] {t >= 0, positions: {<entityId>: {x, y}}, ballOwner?}`; `events[]` typed union with `t`, `team`, `player?`, `start`, `end?`, plus `goal?: boolean` on shot; `annotations[]`; `source {type, provider, sourceIds[], licence, licenceUrl, attribution, matchId?, shippable, localOnly?}`. All coordinates canonical metres, finite numbers, bounded to `[-runoff, length+runoff]` by the integrity validator (JSON Schema can only bound by constants).
Integrity checks JSON Schema cannot express (put in `src/scene/validate.ts`, reused by the dev page error panel which needs `{json path}: {message}`): frame `t` strictly increasing; every `positions` key is an entity id; `ballOwner`, event `team`/`player` exist; positions inside the pitch plus run-off; annotation time ranges ordered; `source.shippable === false` when `localOnly`.

**Frame sampling semantics must be frozen in the first plan (one-way decision).** Recommendation: `positions` is a partial map; an entity is drawn only between its first and last sampled frame (it is hidden before and after), and interpolated linearly between its own consecutive samples, so event-derived reconstructions never show a player frozen where he last touched the ball. Add optional `entities[].presence: "always" | "sampled"` defaulting to `"always"` only if the planner prefers hold-last; `"sampled"` is the default for `kind: reconstruction` in this recommendation (A7).

### Pattern 11: Pydantic parity without new dependencies
Pydantic's `model_json_schema()` is JSON Schema 2020-12 shaped but not byte-compatible with a hand-authored file: it emits `$defs`, `title` on everything, `anyOf [..., {"type":"null"}]` + `default` for optionals, and `oneOf` plus a `discriminator` keyword for tagged unions (verified by running a mini model), which ajv `strict: true` rejects. So do not diff the schemas textually. Use three checks:
1. pytest loads every `src/scene/fixtures/*.json` into the pydantic `Scene` model and requires `model_dump(mode="json", exclude_none=True)` to equal the fixture (TS → Python).
2. One Vitest test reads every committed pipeline output (`data/*/*/scene-*.json` and `public/data/*/*/scene-*.json`) and validates it with ajv, Zod and `checkSceneIntegrity` (Python → TS). The committed Wyscout artifact is a real pydantic-written scene, so this is the cross-language round trip with no subprocess. Local-only outputs (StatsBomb) are validated the same way when present on the machine.
3. A property-name parity walker (about 30 lines, pytest): collect `{object path → set(properties), set(required)}` from `schemas/scene.schema.json` (resolving `$ref` to `$defs`) and from `Scene.model_json_schema()`; assert equal. It catches a field added on one side only.
Set `model_config = ConfigDict(extra="forbid")` on every model to match `additionalProperties: false`.

### Pattern 12: Deny-manifest and bundle gate
**`deploy/deny-manifest.json`** (single source for the bundle gate and the git guard):
```json
{
  "schemaVersion": 1,
  "scope": ["public/**", "dist/**"],
  "denyGlobs": [
    "public/data/statsbomb/**", "**/*statsbomb*",
    "public/data/last-row/**", "**/*last-row*",
    "public/data/metrica/**", "public/data/skillcorner/**"
  ],
  "shipDirs": ["public/data/wyscout/**", "public/data/dfl/**"],
  "localOnlyDatasets": ["statsbomb", "last-row", "metrica", "skillcorner"],
  "contentMarkers": ["data/statsbomb/", "data/last-row/", "data/metrica/", "data/skillcorner/"],
  "limits": { "dataFileBytes": 1048576, "dataTotalBytes": 5242880, "assetFileBytes": 5242880 }
}
```
(The ADR 0008 patterns are the first six globs; `shipDirs`, `limits` and `contentMarkers` are additions.) `localOnlyDatasets` should be generated from `pipeline/sources.allow.json` (`shippable: false`) and checked for equality in a test, so adding a source cannot skip the gate.

**Scope matters.** The ADR text says "any file in `dist/`", and `**/*statsbomb*` applied to the whole repository would reject `pipeline/src/klopp_pipeline/recipes/statsbomb_shot.py`, test files and the ADR. Apply denial globs only to `public/**` (tracked-file guard) and `dist/**` (bundle gate), as the `scope` field says. In `dist/` public files appear without the `public/` prefix, so test each file path both as `p` and as `public/${p}`.

**`scripts/check-bundle.ts`** (erasable TS, dependency-free, `node scripts/check-bundle.ts [--dist dist] [--manifest deploy/deny-manifest.json]`):
1. Walk `dist/` recursively; normalise `\` to `/`; lowercase path and pattern; `path.posix.matchesGlob`. Windows `path.matchesGlob` is case-insensitive and the Ubuntu runner's is not, so lowercasing and using `posix` makes both behave the same. Verified: `matchesGlob("x/Statsbomb.json", "**/*statsbomb*")` true on this Windows box, `matchesGlob("data/StatsBomb/a.json", "**/*statsbomb*")` false (the pattern tests the file name, so the directory form needs the `public/data/statsbomb/**` glob, which is why both are in the manifest) [VERIFIED: ran on Node 24.21].
2. Files matching `denyGlobs`, or any non-`shipDirs` file under `dist/data/`: fail. Exempt hashed code chunks `assets/*.js|css|map` from the file-name token globs (a chunk named after a source module would be a false positive) but still apply `contentMarkers` to them.
3. Size: every file under `dist/data/` ≤ `dataFileBytes`; total ≤ `dataTotalBytes`; any `dist` file ≤ `assetFileBytes` (matches the 5 MiB `MAX_FILE_BYTES` in `scripts/lib/guard.ts`).
4. Catalog: `dist/data/catalog.json` must exist if `dist/data/` has anything else; every file under `dist/data/<dataset>/<version>/` must be listed with matching `sha256` and byte count, and its dataset manifest must say `"shippable": true` and a licence in `{CC-BY-4.0}`. Unlisted file: fail.
5. Content: scan `dist/**/*.{js,html,css,json}` for `contentMarkers`; the dev-pitch chunk is dead-code-eliminated in study builds (`import.meta.env.DEV` is `false`), so a hit means the local-only `import.meta.glob` leaked.
Pure functions (`checkBundle(files, manifest, catalog)`) with a thin CLI, tested with a temp `dist` (fixtures: clean, statsbomb json, upper-case `Last-Row`, oversize json, unlisted json, bad sha, leaked marker).

**CI wiring** (`ci.yml`): in the existing `build` job add `- run: node scripts/check-bundle.ts` after `npx vite build`; in `windows-smoke` add it after `npm run build`; npm scripts `"guard:bundle": "node scripts/check-bundle.ts"`, `"guard:immutable": "node scripts/check-immutable.ts"`, `"data": "uv run --project pipeline klopp-pipeline run-all"`, `"data:fetch": "uv run --project pipeline klopp-pipeline fetch --all"`. There is currently no Python job in CI: add a `pipeline` job (ubuntu, `astral-sh/setup-uv@1db35dd8eee11c5894872e0b383ae6c406cf738d # v10.4.0`, `uv sync --project pipeline --frozen`, `uv run --project pipeline pytest pipeline/tests -q`, `uv run --project pipeline klopp-pipeline landmarks --check`) [VERIFIED: gh api: setup-uv latest v10.4.0, tag SHA 1db35dd8...; checkout v7.0.1, setup-node v7.1.0 already pinned by tag in the file].

**Git guard extension** (`scripts/lib/guard.ts` stays pure): extend `isDeniedPath` with prefix rules fed from the manifest: `data/<local-only>/` and `public/data/<local-only>/` anywhere, plus "any path under `public/data/` whose first segment is not in `shipDirs`". Keep the lowercase and any-depth behaviour. Add `data/statsbomb/`, `data/last-row/`, `data/metrica/`, `data/skillcorner/` to `.gitignore` (generated block, with a test that `git check-ignore` agrees for each non-shippable source in `sources.allow.json`). Existing rules already deny any `raw` segment and `.parquet` outside `public/data/`.

**Immutability.** (a) Pipeline: `publish`/`recipe` refuse to write into an existing `<version>` directory unless every file has the same sha256 (idempotent re-run), never overwrite. (b) Version string is derived, not dated: `v<schemaVersion>-<first 12 hex of sha256 over sorted "path:sha256" lines>`; `generatedAt` lives in the manifest but is excluded from the hash, so re-running with the same source yields the same directory. (c) `scripts/check-immutable.ts`: `git diff --name-status --diff-filter=MDR <base>...HEAD -- data public/data` must list nothing under a version directory (only `A`); in CI use `fetch-depth: 0` (the `guards` job already has it), locally compare against `origin/main`, with `--staged` for the hook. (d) Vitest/pytest recompute every committed version directory's file hashes against its `manifest.json`. `public/data/catalog.json` is the only mutable file and is regenerated by `publish`.

### Anti-Patterns to Avoid
- **Calling `kloppy.*.load_open_data`:** bypasses the allow-list, host and redirect checks, and caps. Always `net.fetch_bytes` first, then pass local paths/`BytesIO`.
- **Treating kloppy normalised 0..1 output as canonical metres:** `x*105` puts the penalty area at 15.7 m on a 100 m pitch. Always transform to a `MetricPitchDimensions` target of the scene's own size.
- **Computing the inverse transform from the root `<svg>`:** use the canonical-space group's CTM.
- **React state for `t` at 60 fps across all glyphs without measuring:** use the vanilla store and decide per the spike.
- **Repo-wide application of the ADR token globs:** see Pattern 12.
- **Hand-diffing pydantic JSON Schema against the authored schema:** compare property sets, and round-trip data both ways.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Provider parsing (Wyscout V2 tags to events, StatsBomb freeze frames, cell offsets) | Custom Wyscout/StatsBomb parsers | `kloppy.wyscout.load(..., data_version="V2")`, `kloppy.statsbomb.load` | Tag semantics, interceptions merged into events, cell-centre offsets and fidelity detection are already encoded and versioned |
| Python-side coordinate conversion in the pipeline | A second Python converter | `DatasetTransformer`/`dataset.transform(to_pitch_dimensions=...)` | One authority; the TS port is the only second implementation and is fixture-tested against it |
| Frame interpolation | Custom easing library | d3-interpolate `interpolateNumber` + d3-ease `easeLinear` | CONTEXT lock; tiny |
| Glob matching for the gate | Custom regex converter | `path.posix.matchesGlob` after lowercasing | Built in; fall back to picomatch 4.0.7 (OK verdict) only if it warns |
| SHA-256, zip reading, JSON parse | Anything custom | `hashlib`, `zipfile`, `json` (Python); `node:crypto` (Node) | Standard library |
| Headless browser driving for Phase 3 | A new test framework | Node 24 `WebSocket` + CDP on installed Edge | No dependency; Playwright arrives in Phase 5 |
| JSON Schema validation in Python | Adding `jsonschema` | pydantic models + the parity checks above | The TS side already runs ajv; no new dependency needed |
| HTTP fetch with allow-list | A new downloader | Existing `net.fetch_bytes` (add a thin `fetch.py` that adds sha256 pinning and a never-expiring cache) | Host, port, redirect, size and timeout rules already tested in Phase 2 |

**Key insight:** the expensive mistakes here are semantic (which frame a coordinate is in, which orientation a provider assumes, which side a licence allows), not mechanical. Every one of them has a single place that owns it: kloppy for provider frames, `coords.ts` + fixture for the browser, `sources.allow.json` + `deny-manifest.json` for licences.

## Runtime State Inventory

Not a rename/refactor/migration phase. Greenfield additions only; nothing stored under an old name. The only existing runtime-adjacent state touched: `.gitignore` gains local-only data directories, `ci.yml` gains jobs, `package.json` gains scripts. None — verified by reading `.gitignore`, `package.json`, `ci.yml`.

## Common Pitfalls

### Pitfall 1: Raw cache never expires, or expires too soon
**What goes wrong:** `net.fetch_bytes` caches with a 24 h TTL by default. A day later the 77 MB `events.zip` is fetched again, and a changed upstream file would silently change artifacts.
**Why it happens:** the Phase 2 fetcher was built for small metadata responses.
**How to avoid:** `fetch.py` wraps it with `ttl_hours=float("inf")` and verifies the allow-list `sha256` pin on every read (and on download); mismatch deletes the cache entry and raises. Pins verified today: events.zip sha256 `877e015b716ffdeea18f04418e3f24fed307ed03c37ff305cabe1f47c4822a45`, matches.zip `c8f92bb7533e5c127e043cee764c991b5c25b4f5e70a65be931baae0b1765ce9`, players.json `877a111cb1005b73df5645e9338bd74fb4b496bace2fbc545a72abb3b73efa2e`, teams.json `9f7a4a3b3d92c0be33f40613ad6e6eb4316c3b9771ec74c61a22c9b8ece23a4d` (md5s equal figshare's `computed_md5`) [VERIFIED: downloaded and hashed]. Update `USER_AGENT` text (it says "coverage check").
**Warning signs:** manifest `sha256` of an input changes without a version bump.

### Pitfall 2: The figshare redirect host rotates
**What goes wrong:** downloads redirect to a Cloudflare R2 host.
**Why it happens:** presigned URL.
**How to avoid:** the exact host `44c1cec316ec56bca76dfd65d2882b20.r2.cloudflarestorage.com` is already in `ALLOWED_HOSTS`; confirmed today for file 14464685. If it changes, the fetch fails closed with `refused host`; the fix is a deliberate allow-list edit plus a test, never a wildcard.

### Pitfall 3: Memory spike on `events_England.json`
**What goes wrong:** about 1.4 GB working set to parse 189 MB.
**How to avoid:** parse once in `standardise`, filter to the pinned match, free the list; run it once and cache the per-match extract (`pipeline/data/raw/wyscout/extract/<matchId>.json`) so later runs are instant. Note the cap on the zip member size.

### Pitfall 4: Orientation confusion
**What goes wrong:** the opposing team's events appear mirrored, or the possessing team attacks right to left.
**Why it happens:** all providers load as `ACTION_EXECUTING_TEAM`; flipping to a static orientation needs `to_orientation=STATIC_HOME_AWAY` and flips per event.
**How to avoid:** the recipe's chain contains one team only, so it is already left to right; record `attack: "ltr"` per period for that team in the scene. Do not call `transform(to_orientation=...)` unless the recipe needs both teams. A StatsBomb freeze-frame scene needs the static form (shooter team left to right is `ACTION_EXECUTING_TEAM`; keep it, set `attack` accordingly).

### Pitfall 5: Applying the StatsBomb cell offset twice
**What goes wrong:** every point 0.5 yd off, landmarks fail.
**How to avoid:** offset only in kloppy's loader; TS `coords.ts` assumes 0..120 × 0..80 post-parse; separate helper for raw cell coordinates, tested.

### Pitfall 6: Shot end `(0,0)` drawn as a real location
**What goes wrong:** a shot arrow to the corner flag.
**How to avoid:** use kloppy's `result_coordinates` (derived from the goal-zone tag, approximate y 45/50/55 in Wyscout units); mark approximate.

### Pitfall 7: Double-escaped player names
See Pattern 8. Test with Sané.

### Pitfall 8: `vite preview` and Vercel SPA fallback return `index.html` for a missing JSON
**What goes wrong:** `fetch("/data/wyscout/<v>/scene.json")` for a wrong version returns 200 HTML; `res.json()` throws a confusing error.
**How to avoid:** check `content-type` includes `json` before parsing; route all scene loads through Zod; the loading/error panels from UI-SPEC cover the failure. Same trap `scripts/smoke.ts` already documents.

### Pitfall 9: Node-only Vitest cannot exercise DOM behaviour
**What goes wrong:** assumptions about `getScreenCTM`, `ResizeObserver`, canvas and pointer capture are untested.
**How to avoid:** keep geometry, view matrix, sampling, store, legend ids, converters and integrity checks pure and node-tested; render components with `renderToStaticMarkup` from `react-dom/server` (effects never run, so `ResizeObserver` is not needed) to assert `data-glyph` ids equal legend ids; leave real-DOM behaviours to the CDP script. Do not add jsdom for this phase.

### Pitfall 10: Glob semantics differ by OS
See Pattern 12 (case, separators, file-name versus directory patterns).

### Pitfall 11: Headless frame cadence is the display rate
Mean rAF interval was 6.7 ms (about 148 Hz) in headless Edge. A "≤ 16.7 ms average" assertion proves nothing; assert work time and dropped-frame counts.

### Pitfall 12: Biome and a11y rules on SVG
Biome 2.6.9 `recommended` includes a11y rules such as SVG title checks; glyph SVG fragments that are decorative need `aria-hidden="true"`, the top SVG needs `<title>`/`role`. Run `npx biome check` on the first glyph file before writing twenty.

### Pitfall 13: Scene fixtures are lint/format targets
`biome.json` includes `**` except listed excludes and honours `.gitignore`; JSON fixtures under `src/scene/fixtures/` are formatted by Biome (`pipeline/tests/fixtures` is excluded). Pipeline output written with compact separators will fail `biome check` if committed under `data/` or `public/data/`. Either add `"!!data"` and `"!!public/data"` to the biome excludes (recommended: generated, immutable, hash-pinned) or write pretty-printed JSON with 2-space indent and trailing newline that already passes. Pick one and test it.

### Pitfall 14: kloppy's network capability
kloppy depends on fsspec[http]/aiohttp and will open URLs. In pytest add an autouse fixture in `conftest.py` that monkeypatches `socket.socket.connect` (and `socket.create_connection`) to raise, so a test or a code path that tries the network fails loudly. Only allow `net.fetch_bytes` to be exercised through injected fakes, as `test_coverage.py` already does.

### Pitfall 15: Moving upstream branch
StatsBomb `master` changes (the 2015/16 matches list was updated 2025-12-16). Pin the commit SHA in the allow-list URL pattern and the manifest.

## Code Examples

### kloppy Wyscout V2 wrapper (verified end to end on match 2499754)
```python
# Source: written and run this session against kloppy 3.19.1 and the Pappalardo files
order = sorted(match["teamsData"], key=lambda k: 0 if match["teamsData"][k]["side"] == "home" else 1)
wrapper = {"events": match_events, "teams": {}, "players": {}}
for tid in order:
    td = match["teamsData"][tid]
    wrapper["teams"][tid] = {"team": {"officialName": teams[int(tid)]["officialName"]}}
    ids = [p["playerId"] for p in td["formation"]["lineup"] + td["formation"]["bench"]]
    wrapper["players"][tid] = [{"player": {"wyId": pid, "firstName": fix(players[pid]["firstName"]),
                                           "lastName": fix(players[pid]["lastName"])}} for pid in ids]
ds = wyscout.load(event_data=io.BytesIO(json.dumps(wrapper).encode()), data_version="V2", coordinates="wyscout")
metric = MetricPitchDimensions(x_dim=Dimension(0, 105), y_dim=Dimension(0, 68),
                               pitch_length=105, pitch_width=68, standardized=False)
ds_m = ds.transform(to_pitch_dimensions=metric)          # canonical metres, origin top-left, y down
for e in ds_m.events:
    end = getattr(e, "receiver_coordinates", None) or getattr(e, "result_coordinates", None)
```
`coordinates="wyscout"` keeps provider units so the single `to_pitch_dimensions` transform is the only warp (the default `"kloppy"` also works, but then the zone warp happens twice).

### Pure legend id set and SSR check
```typescript
// src/pitch/legend/glyphIds.ts — pure; Pitch rendering uses the same function, so they cannot drift
export function glyphIdsForScene(scene: Scene, layers: { density: boolean }): GlyphId[] { /* registry order */ return []; }

// legend.test.ts (node environment)
import { renderToStaticMarkup } from "react-dom/server";
const html = renderToStaticMarkup(<Pitch {...props}>{/* scene glyphs */}</Pitch>);
const rendered = new Set([...html.matchAll(/data-glyph="([a-z-]+)"/g)].map((m) => m[1]));
expect(rendered).toEqual(new Set(glyphIdsForScene(scene, { density: false })));
```

### Pytest network block
```python
# pipeline/tests/conftest.py
import socket, pytest
@pytest.fixture(autouse=True)
def _no_network(monkeypatch):
    def refuse(*_a, **_k): raise RuntimeError("network access is blocked in tests")
    monkeypatch.setattr(socket.socket, "connect", refuse)
    monkeypatch.setattr(socket, "create_connection", refuse)
```

### Penalty-arc chord (geometry exactness)
```text
Penalty mark 11 m from the goal line, arc radius 9.15, penalty-area line 16.5 m from the goal line.
dx = 16.5 - 11 = 5.5; half-chord = sqrt(9.15^2 - 5.5^2) = 7.312489...; angle = acos(5.5/9.15) = 53.0518 deg.
Left arc (68 m wide): from (16.5, 26.6875) to (16.5, 41.3125) bulging toward the centre: "M 16.5 26.6875 A 9.15 9.15 0 0 1 16.5 41.3125" (check sweep flag against orientation in a unit test).
Law 1 values (registry): centre circle r 9.15, goal area 5.5 m deep, 18.32 wide, penalty area 16.5 deep, 40.32 wide,
penalty mark 11, corner arc r 1, goal 7.32 wide. y extents on a 68 m pitch: penalty area 13.84..54.16, goal area 24.84..43.16, posts 30.34..37.66.
```
[CITED: research/pitch-geometry/findings.md, registry ids src-ifab-laws-2026-27#law1-*]

### Wyscout allow-list entry (shape)
```json
{
  "id": "wyscout",
  "licence": "CC-BY-4.0",
  "licenceUrl": "https://creativecommons.org/licenses/by/4.0/",
  "shippable": true,
  "attribution": "Pappalardo, L. et al. A public data set of spatio-temporal match events in soccer competitions. Sci Data 6, 236 (2019). doi:10.1038/s41597-019-0247-7",
  "files": [
    { "name": "events.zip",  "url": "https://ndownloader.figshare.com/files/14464685", "bytes": 77323413, "maxBytes": 100000000,
      "sha256": "877e015b716ffdeea18f04418e3f24fed307ed03c37ff305cabe1f47c4822a45", "figshareMd5": "7c20e8647e7eda58d7838a0c7b1ec6ab" },
    { "name": "matches.zip", "url": "https://ndownloader.figshare.com/files/14464622", "bytes": 645097,
      "sha256": "c8f92bb7533e5c127e043cee764c991b5c25b4f5e70a65be931baae0b1765ce9" },
    { "name": "players.json","url": "https://ndownloader.figshare.com/files/15073721", "bytes": 1737347,
      "sha256": "877a111cb1005b73df5645e9338bd74fb4b496bace2fbc545a72abb3b73efa2e" },
    { "name": "teams.json",  "url": "https://ndownloader.figshare.com/files/15073697", "bytes": 27404,
      "sha256": "9f7a4a3b3d92c0be33f40613ad6e6eb4316c3b9771ec74c61a22c9b8ece23a4d" }
  ]
}
```
Licence for each file confirmed CC BY 4.0 on its figshare article (Events 7770599, Matches 7770422, Players 7765196, Teams 7765310) [VERIFIED: figshare API 2026-11-28].

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Read kloppy master docstrings for frames (Phase 2 findings) | Read the pinned 3.19.1 wheel source | this phase | Phase 2 open items "Wyscout origin/y inferred" and "recheck 3.19.1" are closed; the Opta frame has a second independent source (ggsoccer) but still no official Opta page |
| Phase 2 findings: kloppy "default frame is a 0..1 unit square" | Metric target via `to_pitch_dimensions` | n/a | Normalised output is landmark-correct only for 105 × 68 |
| Pappalardo events as one flat file | Per-match wrapper for kloppy V2 | n/a | kloppy's V2 reads `{"events","teams","players"}` per match |
| Playwright for every browser check | CDP over built-in `WebSocket` for Phase 3 checks | Node 22+/24 | No dependency until Phase 5 |

**Deprecated/outdated:**
- `kloppy.*.load_open_data` for this pipeline: bypasses project network controls.
- Kloppy docstring for `SportecEventDataCoordinateSystem` ("top to bottom") contradicts its code (`BOTTOM_TO_TOP`); trust the code.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Opta landmark values (17 × 57.8, six-yard 5.8 × 26.4, spot 11.5, circle 9.0, arc 8.9) match Opta's own frame | Pattern 2 | Opta-converted points drift slightly; tests would still pass (they come from kloppy). Confirmed only by kloppy source and the `ggsoccer` R package; Opta's page is 403. Flag as "kloppy 3.19.1 interpretation" in any lesson copy |
| A2 | Wyscout fixed landmarks (PA 16 × 62, six-yard 6 × 26, spot 10, goal 12) match Wyscout's frame; circle 8.84 and arc 7.74 are marked "inferred" by kloppy's authors | Pattern 2 | Mid-pitch warp slightly off (zones 5-6); penalty-area geometry unaffected if PA values hold. Wyscout's glossary does not state them |
| A3 | `path.posix.matchesGlob` stays stable enough in Node 24 (no warning seen on 24.21.0) | Pattern 12 | Gate breaks on a Node upgrade; fallback is picomatch 4.0.7 |
| A4 | Headless Edge frame statistics on this machine represent the learner's Windows PC | Pattern 7 | ADR 0009 numbers wrong for slower hardware; mitigate by also recording a human check in `/dev/pitch?scene=stress` |
| A5 | Proposed stress thresholds (mean work ≤ 6 ms, p95 interval ≤ 20 ms, no gap above 50 ms) | Pattern 7 | Too strict or too lax; adjust after the first measurement |
| A6 | Wyscout reconstructions show a 2-letter surname initialism on discs because no shirt numbers exist | Pattern 8 | Planner or UI reviewer may prefer role code or sequence number |
| A7 | Reconstruction entities are hidden outside their first/last sample (`presence: "sampled"`) | Pattern 10 | One-way schema semantics; if wrong, additive field can add hold-last later |
| A8 | `npm run` scripts on Windows execute through cmd.exe and find `uv` on PATH | Pattern 12 | `npm run data` fails on a machine without uv on PATH; documented in the verify-setup script |
| A9 | Pipeline output committed under `data/` is excluded from Biome (`!!data`, `!!public/data`) | Pitfall 13 | Lint failures on generated files; either exclusion or pretty-printing fixes it |
| A10 | The Wyscout PL 2017/18 `competitionId` 364 / 380 matches count from the coverage matrix still holds; goal 2499754/185704194 attribution (Sané) comes from the dataset's player table | Pattern 8 | Recipe pins ids and asserts team/player names in a test; wrong name would fail it |

**Needs user confirmation:** none of these block planning; A6 and A7 are the ones the planner should surface in the discuss/plan check because they shape the frozen Scene format and the learner-visible glyph text.

## Open Questions

1. **Frame sampling semantics for partial positions (A7).**
   - Known: event-derived scenes only know a player's position when he acts.
   - Unclear: hide outside samples versus hold last.
   - Recommendation: hide (draw only between first and last sample), decided and tested in the first plan because it is one-way.
2. **Playwright now or CDP script?**
   - Known: CDP works on installed Edge with zero deps (measured). Playwright 1.65.1 is planned for Phase 5.
   - Recommendation: CDP script now; revisit at Phase 5.
3. **Do Opta/Wyscout converters need provider-official confirmation before lesson copy cites them?**
   - Recommendation: keep copy at "as implemented by kloppy 3.19.1" until Opta/Stats Perform documentation can be read.
4. **Where do shippable artifacts live in git: `data/` and `public/data/` (duplicate) or only `public/data/`?**
   - CONTEXT says outputs go to `data/` and `publish` copies shippable ones to `public/data/`. The duplicate is 2 × a few KB and the `data/` copy is the immutable source; the plan should state that both are tracked for shippable datasets, with the immutability check on both.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, Vitest | ✓ | 24.21.0 | — |
| npm | installs | ✓ | 11.x (via Node) | — |
| uv | pipeline | ✓ | 0.12.5 (build backend pinned `uv_build >=0.12,<0.13`; do not change in this phase) | — |
| Python | pipeline | ✓ | 3.12.10 (uv also fetched CPython 3.12.14 for a scratch project) | — |
| kloppy 3.19.1 wheel | pipeline | ✓ installs on Windows | 30 MB wheel | — |
| Microsoft Edge | headless checks | ✓ | 158.0.4370.45 at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` | Chrome present at `C:\Program Files\Google\Chrome\Application\chrome.exe`; Playwright chromium cache exists under the user profile |
| git, gh | immutability check, SHA lookups | ✓ | gh authenticated | — |
| Network: figshare, raw.githubusercontent.com | fetch | ✓ | live downloads succeeded today | `--offline` cache |
| Playwright | Phase 5 | ✗ not in `package.json` | — | CDP script |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** Playwright (CDP script).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.1.2 (node env; `include` already covers `src/**/*.test.{ts,tsx}`, `scripts/**/*.test.ts`, `schemas/**/*.test.ts`), pytest 9.2.0 (`pipeline/tests`), CDP script for browser behaviour |
| Config file | `vitest.config.ts` (merges `vite.config.ts`), `pipeline/pyproject.toml` `[tool.pytest.ini_options]` |
| Quick run command | `npx vitest run src/pitch src/scene scripts/lib` and `uv run --project pipeline pytest pipeline/tests -q -x` |
| Full suite command | `npm test` + `npm run pipeline:test` + `npm run validate:schemas` + `npm run build && node scripts/check-bundle.ts` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PITCH-01 | `pitchGeometry` returns Law 1 values for 105×68 and 100×65 (PA 16.5/40.32, GA 5.5/18.32, spot 11, circle 9.15, arc chord 7.3125, goal 7.32) | unit | `npx vitest run src/pitch/geometry.test.ts` | ❌ Wave 0 |
| PITCH-01 | `makeView` matrix and `screenToCanonical`: left spot reads (11.00, 34.00) in both orientations; canvas matrix equals SVG matrix × DPR | unit | `npx vitest run src/pitch/view.test.ts` | ❌ Wave 0 |
| PITCH-01 | Real DOM: canvas backing width = css × DPR (DPR 2), `getScreenCTM` inverse agrees, no horizontal scroll at 320/375/768/1440 | browser | `node scripts/check-pitch-browser.ts` | ❌ Wave 0 |
| PITCH-02 | Landmark table for StatsBomb/Opta/Wyscout/tracking against `fixtures/landmarks.json` (tolerance 1e-9) | unit | `npx vitest run src/pitch/coords.test.ts` | ❌ Wave 0 |
| PITCH-02 | Round trip 2000 random points per provider (tol 1e-9), asymmetry cases, out-of-pitch fallback, Fulham 100×65 | unit | same | ❌ Wave 0 |
| PITCH-02 | Fixture equals regenerated kloppy output (`landmarks --check`) | pytest | `uv run --project pipeline klopp-pipeline landmarks --check` and `pipeline/tests/test_landmarks.py` | ❌ Wave 0 |
| PITCH-03 | Registry ids unique and every glyph renders `data-glyph`; unknown id fails; glyph sheet lists 17 legend entries; legend ids = rendered ids per fixture | unit (SSR) | `npx vitest run src/pitch/legend src/pitch/glyphs` | ❌ Wave 0 |
| PITCH-03 | Legend visible (non-zero box, not display:none) expanded and collapsed at 375/768/1440 | browser | `node scripts/check-pitch-browser.ts` | ❌ Wave 0 |
| PITCH-04 | ajv and Zod agree on valid/invalid scene fixtures with `expect_path` | unit | `npx vitest run schemas` | ❌ Wave 0 (`schemas/scene.schema.json`, `schemas/fixtures/scene.fixtures.json`) |
| PITCH-04 | Four fixtures + committed pipeline output pass ajv, Zod, `checkSceneIntegrity` | unit | `npx vitest run src/scene` | ❌ Wave 0 |
| PITCH-04 | pydantic round-trips every TS fixture; property-set parity with the JSON Schema | pytest | `uv run --project pipeline pytest pipeline/tests/test_scene_parity.py -q` | ❌ Wave 0 |
| PITCH-04 | `sampleScene` at `t = 3.2 s` equals expected positions; stepped mode holds; store pause/replay state machine | unit | `npx vitest run src/scene/playback` | ❌ Wave 0 |
| PIPE-01 | Allow-list refusal (unknown host, non-https, redirect off-list, sha256 mismatch, oversize) | pytest | `uv run --project pipeline pytest pipeline/tests/test_sources.py -q` | ❌ Wave 0 |
| PIPE-01 | Wyscout recipe on a recorded small fixture (one match slice) produces the pinned scene; Sané name decoded; no network (socket blocked) | pytest | `uv run --project pipeline pytest pipeline/tests/test_recipe_wyscout.py -q` | ❌ Wave 0 |
| PIPE-01 | Manifest fields complete; version = hash; second run writes nothing new; existing version dir never overwritten | pytest | `.../test_manifest_immutable.py` | ❌ Wave 0 |
| PIPE-02 | `npm run data` runs on Windows with no `make`: `klopp-pipeline run-all --offline` against the committed raw-cache fixture exits 0 (CI `windows-smoke`, repo path with spaces) | smoke | `uv run --project pipeline klopp-pipeline run-all --offline` | ❌ Wave 0 |
| PIPE-03 | `checkBundle` on temp dists: clean passes; statsbomb json, `Last-Row` case variant, oversize, unlisted, bad sha, leaked marker each fail | unit | `npx vitest run scripts/check-bundle.test.ts` | ❌ Wave 0 |
| PIPE-03 | Real build: `vite build && node scripts/check-bundle.ts` green; planted `public/data/statsbomb/x.json` makes it red | integration | CI `build` job; one-off script test | ❌ Wave 0 |
| PIPE-03 | Guard rejects staged `data/statsbomb/**`, `public/data/metrica/**`; `.gitignore` covers every non-shippable source | unit | `npx vitest run scripts/guard.test.ts` | extends existing file |
| PIPE-03 | No M/D/R under data version directories vs base | integration | `node scripts/check-immutable.ts` (CI `guards`) | ❌ Wave 0 |
| PIPE-04 | `/dev/pitch?scene=wyscout` loads the shippable reconstruction, opens paused at 0.0 s, Play advances ball, stops at last frame with "Replay" | browser | `node scripts/check-pitch-browser.ts --scene reconstruction` | ❌ Wave 0 |
| PIPE-04 | Stress scene frame statistics within thresholds; reduced motion defaults to Stepped | browser | `node scripts/check-pitch-browser.ts --scene stress` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** the quick run command for the touched area (< 30 s each).
- **Per wave merge:** full suite command.
- **Phase gate:** full suite green, `check-bundle` green on a fresh `vite build`, `check-pitch-browser` run once with screenshots at 320/375/768/1440 attached, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `src/pitch/fixtures/landmarks.json` plus `pipeline/src/klopp_pipeline/landmarks.py` (generator with `--check`)
- [ ] `schemas/scene.schema.json`, `schemas/fixtures/scene.fixtures.json`, `src/scene/schema.ts`, registration in `contractSchemas`
- [ ] `pipeline/tests/conftest.py` (network block), recorded Wyscout slice fixture (one match, compact) and StatsBomb slice
- [ ] `deploy/deny-manifest.json`, `scripts/lib/globs.ts`, `scripts/check-bundle.ts`, `scripts/check-immutable.ts` and their tests
- [ ] `scripts/check-pitch-browser.ts` (CDP) with the three width screenshots
- [ ] Framework installs: `npm install` of the five packages above, `uv add kloppy==3.19.1`

## Security Domain

Applicable to this phase (security_enforcement is on, ASVS level 1).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | no accounts, no secrets |
| V3 Session Management | no | — |
| V4 Access Control | partly | deploy protection is Vercel "All Deployments" (ADR 0004); licence gate stops licensed data reaching the bundle |
| V5 Input Validation | yes | Zod and ajv on every scene; `?scene=` looked up in a fixed registry map, never used as a path; dataset/version names validated `^[a-z0-9][a-z0-9.-]*$` before any filesystem write; React text rendering only (no `dangerouslySetInnerHTML`); `licenceUrl` constrained by the `httpUrl` pattern (blocks `javascript:`) |
| V6 Cryptography | yes (integrity only) | sha256 pins for downloads and manifests via `hashlib`/`node:crypto`; no custom crypto |
| V10 Malicious code / supply chain | yes | exact version pins, `uv.lock` hashes, `npm audit signatures` (already in CI), legitimacy audit above |
| V12 Files and resources | yes | zip handling in memory only (no extraction, no zip-slip), uncompressed member cap, per-file and total size caps, path normalisation in gates |
| V14 Configuration | yes | no raw or licensed data in git or `dist`; CI gates |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SSRF or redirect to an unlisted host during fetch | Tampering / Information disclosure | Existing https-only, port 443, host allow-list re-checked on every redirect; add per-source URL patterns and sha256 pins |
| Zip bomb / oversized member (events member expands 12×) | Denial of service | Member size cap (250 MB) checked from `ZipInfo.file_size` and re-checked while reading |
| Path traversal in dataset/version names or scene ids used in file paths | Tampering | Strict name regex; resolve and assert the output path stays under the repo `data/` root |
| Licensed data reaching a public deploy | Information disclosure / legal | deny-manifest gate on `dist/`, guard on staged files, `localOnlyDatasets` generated from the allow-list, content-marker scan |
| Malicious or malformed scene JSON (huge arrays, NaN) | Denial of service | Zod bounds (max frames, entities, events), finite-number checks, integrity validator; 1 MB cap for shipped files |
| Tampered upstream dataset | Tampering | sha256 pin per file, StatsBomb commit-SHA pin; mismatch fails closed |
| kloppy making its own network calls | Tampering | Socket-blocking pytest fixture; never call `load_open_data`; only local paths/BytesIO |
| Attribution stripped from CC BY data | Repudiation (licence) | `source.attribution`/`licenceUrl` required by schema; manifest carries them; UI-SPEC renders the line verbatim |

## Sources

### Primary (HIGH confidence)
- kloppy 3.19.1 wheel source, read this session: `domain/models/pitch.py` (lines 231-287, 289-403, 405-519, 553-693), `domain/models/common.py` (lines 549-745, 787-1140, 1381-1430), `domain/services/transformers/dataset.py`, `infra/serializers/event/statsbomb/helpers.py:62-91`, `infra/serializers/event/wyscout/{deserializer_v2.py,wyscout_events.py,wyscout_tags.py}`, `_providers/{wyscout,statsbomb}.py`.
- PyPI JSON for kloppy 3.19.1 (licence BSD-3, `project_urls`); npm registry for zustand, d3-interpolate, d3-ease, @types/*, picomatch, tinyglobby; `npm pack zustand@5.1.0` inspected.
- Live data: figshare API (articles 7770599, 7770422, 7765196, 7765310; collection 4415000), downloaded events.zip/matches.zip/players.json/teams.json and hashed; `statsbomb/open-data` matches 2/27 and events/lineups for 3754047; `gh api` for the open-data head SHA and action versions.
- Executed code this session: kloppy landmark and round-trip scripts, Wyscout V2 end-to-end load, StatsBomb load and transform, headless Edge CDP runs (rAF cadence, `getScreenCTM` inverse), memory measurement, goal-chain scan, y-direction statistic, pydantic JSON Schema probe, `uv add --no-sync kloppy==3.19.1` on a copy of the real lock.
- In-repo files read: `03-CONTEXT.md`, `03-UI-SPEC.md`, `research/pitch-geometry/findings.md`, `docs/decisions/0008-watch-gym-l1-clip-supply.md`, `package.json`, `ci.yml`, `src/routes.ts`, `src/routes.test.ts`, `schemas/schemas.test.ts`, `src/schemas/contracts.ts`, `schemas/common.schema.json`, `scripts/lib/guard.ts`, `scripts/guard-files.ts`, `scripts/smoke.ts`, `pipeline/src/klopp_pipeline/{net.py,cli.py}`, `pipeline/pyproject.toml`, `.gitignore`, `biome.json`, `tsconfig.json`, `vitest.config.ts`.

### Secondary (MEDIUM confidence)
- MDN: `Window.devicePixelRatio` (matchMedia pattern, canvas scaling) and `SVGGraphicsElement.getScreenCTM` (return value; ancestor/viewBox inclusion not stated, confirmed by test).
- `ggsoccer` Opta pitch dimensions (rdrr.io/github/Torvaney/ggsoccer/src/R/dimensions.R) via web search summary: 17, 57.8, 5.8, 26.4.

### Tertiary (LOW confidence)
- None used as a basis for a recommendation. Opta's official definitions page (403) and Wyscout's glossary were not available for the fixed-landmark values.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Versions from registries today; kloppy resolved against the real lock; SUS verdicts explained.
- Architecture (converters, view matrix, bundle gate): HIGH for converters and CTM (ran code), MEDIUM for gate globbing portability (Node API stability) and frame-time thresholds.
- Pitfalls: HIGH; most were hit while running the code.
- Opta/Wyscout fixed landmarks: MEDIUM (kloppy plus one independent R package; no official page).

**Research date:** 2026-11-28
**Valid until:** 2026-12-28 for stack versions (kloppy and zustand moved within the last 60 days); the kloppy source facts are pinned to 3.19.1 and do not expire until the pin is changed.
