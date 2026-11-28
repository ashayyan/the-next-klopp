# Phase 3: Pitch Standard & Data Pipeline - Context

**Gathered:** 2026-11-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers one canonical pitch and a reproducible open-data pipeline that feed a single Scene/Frame format:

- a `<Pitch>` React component with an SVG layer and a Canvas 2D layer sharing one metre-based transform, drawing Law 1 markings
- pure coordinate converters (StatsBomb, Opta, Wyscout, tracking) with landmark, round-trip and left/right asymmetry tests built from provider specs
- standard glyphs (player, ball, pass, carry, run, pressure, zone, shape) and an auto-generated notation legend that is always visible
- a versioned Scene/Frame format (JSON Schema + Zod) that holds an authored visual, a saved board, a quiz answer and a pipeline reconstruction, with one fixture of each rendering
- a `/dev/pitch` dev route showing all of it, plus playback of an open-data sequence
- the `/pipeline` kloppy pipeline (`npm run data`) that downloads only allow-listed open sources, standardises them, and writes small immutable versioned artifacts with a manifest
- CI gates that fail when raw or licensed data or an oversized file is staged or would enter the bundle (deny-manifest)

No design system (Phase 4 owns colours/type), no lessons, no Tactics Board drag UI beyond the layer-API spike.

Requirements: PITCH-01, PITCH-02, PITCH-03, PITCH-04, PIPE-01, PIPE-02, PIPE-03, PIPE-04.

</domain>

<decisions>
## Implementation Decisions

The learner delegated every grey area to Claude for this autonomous run ("choose all the recommended choices and close every grey area"). Each answer below is the recommended option.

### Canonical coordinate system
- Canonical space: metres, origin at the top-left corner of the pitch as drawn, x increases left→right along the touchline (0..length), y increases top→bottom (0..width), matching SVG `viewBox="0 0 {length} {width}"`. Default pitch 105 × 68 m (PL Handbook Rule K.17 convention); every scene carries its own `pitch: {length, width}` so non-standard pitches (Fulham 100 × 65) render true. — **Reversibility:** one-way once lessons and saved boards persist coordinates — every stored scene depends on it.
- Attacking direction is explicit per scene/period (`attack: "ltr" | "rtl"` per team), never implied by provider. Converters normalise provider data so the team in possession attacks left→right only when a recipe asks for it (`orient: "possession-ltr"`), otherwise keep provider orientation per period.
- Converters map provider coordinates to canonical metres with landmark-preserving piecewise-linear mapping (penalty-area lines, goal-area lines, centre line, penalty spots land exactly on the Law 1 landmarks of the target pitch), for fixed-landmark providers (StatsBomb 120 × 80, Opta 0–100, Wyscout 0–100). Tracking data already in metres (centred origin) maps by translation/flip only. Converter specs are encoded from provider docs and kloppy source pinned at kloppy 3.19.1 (not master). — **Reversibility:** costly — all data and quiz answers flow through it.
- Converters live in one TS module `src/pitch/coords.ts` (single place coordinate bugs can live) with a Python mirror only inside the pipeline via kloppy; a cross-language parity test compares a shared landmark fixture (JSON) between TS converters and kloppy output.

### Pitch renderer and layer API
- `<Pitch>` (React, SVG) renders markings from a pure geometry function `pitchGeometry(length, width)` built from IFAB 2026/27 Law 1 values in the research registry. Children render in canonical metres. A `<CanvasLayer>` child paints dense marks with the same transform (DPR-aware). — **Reversibility:** costly — every later visual consumes this API.
- Layer API spike (from roadmap research flag) against three consumers before freezing: static markings, draggable player (pointer capture, screen→pitch inverse transform, keyboard nudge), 22-player playback at 60 fps; spike outcome recorded in `docs/decisions/0009-pitch-layer-api.md`.
- Orientation prop: `horizontal` (default) or `vertical` (rotated 90°, for phone portrait), implemented as a view transform only — data stays canonical.
- Styling uses CSS variables with neutral placeholder values (`--pitch-*`, `--team-a`, `--team-b`, `--ball`) so Phase 4 tokens replace them without code changes. No final palette here; placeholder colours must still be colour-blind-distinguishable (Okabe-Ito from research) and never rely on colour alone (glyph shape/label differ per team).

### Glyphs and legend
- Glyph set (PITCH-03): player (circle + number/label; team A filled, team B ring), goalkeeper variant, ball, pass (solid arrow), carry (dashed/wavy arrow), run without ball (dotted arrow), pressure (wedge/halo), zone (filled translucent polygon/rect), shape/line (connector between players), plus highlight and annotation text. Each glyph is a component with a registry entry `{id, label, description, sample}`.
- Legend auto-generates from the glyph ids actually present in the rendered scene and is always visible (default: below/right of pitch; can collapse to an icon row but never hidden entirely). — **Reversibility:** costly — notation becomes learner vocabulary.

### Scene/Frame format (PITCH-04)
- One JSON format `scene.schema.json` (2020-12) + Zod mirror `src/scene/schema.ts`, versioned `schemaVersion: 1`. Top level: `id`, `schemaVersion`, `kind` (`authored | board | quiz-answer | reconstruction`), `pitch {length,width}`, `teams[]` (id, name, side, attack per period), `entities[]` (players/ball with stable ids, role/number/label), `frames[]` (time `t` in seconds, entity positions in canonical metres, optional `ballOwner`), `events[]` (typed: pass, carry, shot, pressure, run… with start/end positions and `t`), `annotations[]` (glyph overlays with time ranges), `source` (`{type, sourceIds[], licence, provider, matchId?, attribution}`). Playback state is `f(t)` with d3-interpolate between frames. — **Reversibility:** one-way once boards/answers persist — stored data depends on it; additive changes only after Phase 3 (frozen-ID rule CONT-06 applies later).
- Four fixtures in `src/scene/fixtures/`: authored visual, saved board, quiz answer, reconstruction (from the pipeline recipe). Each renders on `/dev/pitch` and validates in tests (ajv + Zod agree, mirroring the Phase 1 dual-validator pattern).

### Pipeline (PIPE-01..04)
- `pipeline/` (uv, Python 3.12, kloppy 3.19.1 pinned) gains Typer subcommands: `fetch <source>`, `standardise <source>`, `recipe <name>`, `publish`, `run-all`. `npm run data` = `uv run --project pipeline klopp-pipeline run-all`; `npm run data:fetch` = fetch only. No `make`, no bash-only syntax.
- Allow-list file `pipeline/sources.allow.json` names each source, URL pattern, licence id and `shippable` flag (from ADR 0008: Wyscout/Pappalardo and DFL/Sportec CC BY 4.0 shippable; StatsBomb, Last Row, Metrica, SkillCorner local-only). Fetch refuses anything not on the list.
- Raw downloads → `pipeline/data/raw/` (git-ignored). Outputs → `data/<dataset>/<version>/*.json|parquet` + `manifest.json` (`schemaVersion`, `sourceId`, `license`, `shippable`, `sha256`, `generatedAt`, `rowCounts`, `kloppyVersion`) — immutable: a new version directory per change, never overwritten (test enforces). Small outputs only (per-file cap 1 MB for shippable artifacts).
- `publish` copies only `shippable: true` artifacts into `public/data/`; everything else stays local in `data/` (git-ignored for local-only datasets).
- Deny-manifest `deploy/deny-manifest.json` (globs from ADR 0008 + provider ids) and a Node check `scripts/check-bundle.ts` run after `vite build` that fails if any `dist/` file matches the deny-manifest, exceeds the size budget, or lacks a shippable manifest entry. Wired into CI `build` job and `npm run guard:bundle`. Git guard (Phase 1) extended so local-only dataset folders cannot be staged.
- First recipe (PIPE-04): a Premier League 2017/18 goal sequence from the Wyscout public dataset (CC BY 4.0, shippable): events → canonical metres → Scene `kind: reconstruction` with event-derived ball path and possession chain (no off-ball tracking). Second, local-only: a StatsBomb 2015/16 PL shot with its freeze frame → reconstruction scene kept in `data/` and loaded on `/dev/pitch` only when present locally (local study build), never shipped. — **Reversibility:** reversible — recipes are additive.
- pydantic models mirror the Scene schema (emit JSON Schema; CI test round-trips a pipeline scene through the TS Zod schema).

### Testing
- Vitest: geometry (Law 1 values), converters (landmarks per provider, round-trip, left/right asymmetry: a point near the left penalty spot must not land near the right one), legend generation, scene schema dual-validation.
- pytest: allow-list refusal, manifest immutability, recipe output schema, kloppy standardisation on a recorded small fixture (no network in tests).
- Playwright is not yet required here (walker is Phase 5); a dev-route render smoke can use the existing smoke script pattern or a headless Edge check.

### Decided autonomously
- [Layout] Q: "Where do pitch modules live?" → Selected: "src/pitch/ (geometry, coords, Pitch.tsx, CanvasLayer.tsx, glyphs/, legend/) and src/scene/ (schema, fixtures, playback)" — cheap to move.
- [Tooling] Q: "State for playback clock?" → Selected: "Zustand store holding t and playing, one rAF loop" — CLAUDE.md stack decision.
- [Tooling] Q: "New npm deps?" → Selected: "d3-interpolate, d3-ease, zustand (exact pins); no visx/konva" — CLAUDE.md stack.
- [Process] Q: "Dev route?" → Selected: "/dev/pitch under the existing dev-only router gate" — dev only.

### Claude's Discretion
- Exact glyph drawing details and placeholder neutral palette values (Phase 4 replaces them).
- Which exact Wyscout goal sequence the recipe uses (any PL 2017/18 goal with a clean possession chain).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 1: Vite 8 + React 19 + TS 7 + Tailwind 4 skeleton, `src/routes.ts` with dev-only gating (`includeDev && import.meta.env.DEV`), Vitest, Biome, guard + husky hooks, CI workflow, ajv/Zod dual-validator pattern (`schemas/schemas.test.ts`), `src/schemas/contracts.ts`.
- Phase 2: `pipeline/` package with Typer CLI, `net.py` allow-list fetcher (https, port 443, redirects re-checked, size caps, cache under `pipeline/data/raw`), pydantic models, pytest fixtures; coverage matrix (`research/pl-data-sources/coverage-matrix.json`); ADR 0008 deny-manifest globs; research findings on pitch geometry (Law 1 values with page refs, provider coordinate frames) in `research/pitch-geometry/findings.md`; registry ids for IFAB, StatsBomb spec, kloppy docs.

### Established Patterns
- Node scripts run as `node file.ts` (no tsx); generated files have `--check` modes; tests skip on missing artefacts only behind gates.
- Conventional commits, hooks live, branch per phase.

### Integration Points
- `/dev/pitch` route in `src/routes.ts` dev table.
- `public/data/` for shippable artifacts; deny-manifest check in CI build job.
- Scene format consumed by Tactics Board (Phase 8), quizzes (Phase 6), Watch Gym (Phase 8), golden lesson (Phase 7).

</code_context>

<specifics>
## Specific Ideas

- Brief §9.4: one canonical pitch renderer with converters and standard glyphs, notation legend everywhere.
- Research: Opta frame rests on kloppy's description (Opta page 403); Wyscout origin/y inferred — verify against kloppy 3.19.1 source before freezing; StatsBomb 120×80 top-left y-down; Tracab centre/cm; Sportec centre/m.
- PL coverage: StatsBomb 418 PL matches (events, freeze frames on shots, no 360), Wyscout 380 (2017/18 events, CC BY 4.0), no PL tracking.

</specifics>

<deferred>
## Deferred Ideas

- Pitch control / xT surfaces (worker + ImageData) — later data tracks.
- WebGL — only if Canvas drops below 60 fps.
- Full Tactics Board UI — Phase 8.
- Learner's local big-5/Wyscout data — data-path checkpoint before Track 15/18.

</deferred>

## Post-research decisions (2026-11-28, after 03-RESEARCH.md)

- Frame sampling (A7): entities are hidden outside their first/last sample; reconstructions use `presence: "sampled"`; authored scenes default to `presence: "always"`. Reversibility: one-way (stored scenes) — frozen in the first plan.
- Wyscout glyph text (A6): 2-letter surname initialism (e.g. "LS"), full name in the accessible label and legend tooltip; shirt number used when a provider supplies it.
- Browser checks: zero-dependency CDP script with headless Edge (Playwright arrives in Phase 5); assert work time and dropped frames, not mean rAF interval.
- Package legitimacy (zustand 5.1.0, d3-interpolate 3.0.2, d3-ease 3.0.2, kloppy 3.19.1 flagged too-new/unknown-downloads only): no human checkpoint in this autonomous run; record the audit in the plan SUMMARY and SECURITY.md accepted risks.
- ADR 0008 deny-manifest statsbomb globs are scoped to `public/**` and `dist/**` (not repo-wide).
- Opta/Wyscout fixed landmarks are documented as "as implemented by kloppy 3.19.1".
- CI gains a `pipeline` job (uv, setup-uv pinned by SHA) running pytest and the immutability check.

## Post-verification decisions (2026-11-28, after 03-VERIFICATION.md)

- WR-11 accepted: an artifact version whose bytes are unchanged but whose licence/attribution/shippable metadata changed is refused; publish a new version deliberately instead (immutability over convenience).
