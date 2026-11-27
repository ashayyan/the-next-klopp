# Architecture Research

**Domain:** Interactive, visual-first, content-as-data learning web app (football), localhost-first, rolling release, single learner
**Researched:** 2026-11-27
**Confidence:** MEDIUM-HIGH. The structural patterns (content-as-data, registry plus lazy loading, event-sourced local state, schema-owned data contracts) are well established and chosen from first principles against the brief. Provider coordinate-system details and a few library facts are MEDIUM (see Sources and "Gaps"). Library version pins are deliberately left to STACK.md.

The one-line thesis: **everything the learner sees is a typed JSON document validated against a schema, rendered by a small set of registered components that all draw on one pitch, and everything the learner does is an append-only event in a local log.** Shipped chapters never break because IDs, data versions and event formats are immutable and every change is checked by a generic validator plus a generic E2E walker.

---

## Standard Architecture

### System Overview

```
 AUTHORING TIME (build agents, Windows, Claude Code)               RUN TIME (learner, browser on localhost)
 ==================================================               =========================================

 /research/<domain>/sources.json ─┐
 /research/SOURCE_REGISTRY.json ◄─┘ (merge + stable IDs)
 /research/concept-map.json, roles/competencies (machine-readable)
          │ (cited by ID)                                           ┌────────────────────────────────────┐
          ▼                                                          │ APP SHELL (Vite + React SPA)       │
 ┌──────────────────┐   ┌─────────────────────┐                     │ routes: Home, Map, Lesson, Review, │
 │ /content          │   │ /pipeline (Python)  │                     │ WatchGym, RoleMap, Notes, Sources, │
 │ lesson.mdx        │   │ sources → kloppy →  │                     │ What's New, Settings, /dev gallery │
 │ lesson.spec.json  │   │ derived → artifacts │                     └──────┬──────────────┬──────────────┘
 │ concepts/glossary │   │ + manifest.json     │                            │              │
 └────────┬─────────┘   └─────────┬───────────┘                            ▼              ▼
          │                       │ /data/artifacts/<id>/<ver>/   ┌──────────────────┐ ┌───────────────────┐
          ▼                       ▼ (small, committed, immutable) │ LESSON RUNTIME   │ │ LEARNING ENGINE   │
 ┌─────────────────────────────────────────────┐                  │ spec+MDX → steps │ │ (pure TS, no React)│
 │ CONTENT VALIDATOR  (npm run validate)        │                  │ loop-stage state │ │ events → progress, │
 │ schema · MDX↔spec join · ≤60 words · cites   │  ── gates ──►    │ machine, check-  │ │ mastery, FSRS queue,│
 │ resolve · data refs · prereq DAG · tags ·    │  CI + pre-merge  │ points, focus    │ │ low-energy, welcome │
 │ licence/redistribution · regulation as-of    │                  └───────┬──────────┘ └─────────┬─────────┘
 └─────────────────────────────────────────────┘                          │ renders              │ reads/writes
                                                                          ▼                      ▼
                                                      ┌──────────────────────────────┐   ┌────────────────────┐
                                                      │ INTERACTION CATALOGUE         │   │ LOCAL STATE (Dexie/ │
                                                      │ registry: id→{schema,Comp,    │   │ IndexedDB)          │
                                                      │ a11yFallback,testOracle}      │   │ append-only events  │
                                                      │ quiz types, Tactics Board,    │   │ + derived tables    │
                                                      │ Phase Animator, Zone Explorer │   │ + notes/settings    │
                                                      └──────────────┬───────────────┘   └─────────┬──────────┘
                                                                     │ draws on                      │ mirror (dev/study server only)
                                                                     ▼                               ▼
                                                      ┌──────────────────────────────┐   ┌────────────────────┐
                                                      │ PITCH STANDARD (@klopp/pitch) │   │ /feedback/*.jsonl   │
                                                      │ core: PitchSpace, converters, │   │ events mirror,      │
                                                      │ Scene/Frame schema, geometry  │   │ confusions, progress│
                                                      │ renderer: SVG + Canvas layers │   │ snapshot, DIGEST.md │
                                                      │ legend (always on)            │   └─────────┬──────────┘
                                                      └──────────────▲───────────────┘             │ read by
                                                                     │                              ▼
                                       DataClient (manifest-resolved fetch, validated in dev)   BUILD AGENTS
                                                                     ▲                         (plan next phase)
                                            /data/artifacts → copied to dist (redistributable only)
```

Three one-way flows, never mixed:

1. **Data flow:** sources → pipeline → versioned artifacts (+ manifest) → DataClient → interactions.
2. **Content flow:** author (agent) → spec+MDX → validator → content index + lazy lesson chunks → runtime.
3. **Learner flow:** UI action → typed event → local event log → derived progress/mastery/SRS → UI, plus a mirror to disk → feedback digest → build agents → new content.

### Component Boundaries

| Component | Owns | Must NOT | Talks to |
|-----------|------|----------|----------|
| **Source Registry** (`research/SOURCE_REGISTRY.json`) | Stable source IDs, licence, redistribution rule, attribution text, quality, status | Contain lesson text | Read by validator, pipeline manifests, app (slim `sources.index.json`) |
| **Schemas** (`/schemas`) | Zod/JSON-Schema for lesson spec, scene/frame, concept, competency, source entry, feedback entry, learner event, data manifest | Import React | Imported by validator, app, tools; pipeline exports data schemas here |
| **Pipeline** (`/pipeline`, Python) | Download, standardise (kloppy), derive, size-budget, manifest, licence gating | Know about lessons or React | Writes `/data/artifacts`; reads registry for licence |
| **Data artifacts** (`/data/artifacts/<id>/<version>/`) | Small immutable JSON/Parquet + `manifest.json` | Be edited by hand | Read by DataClient and validator |
| **Content** (`/content`) | MDX prose per step, JSON spec per lesson, concepts, glossary, track/chapter manifests, quiz items | Contain React code, hand-typed metrics, raw provider coords without a system tag | Validator, Vite content plugin |
| **Validator** (`/tools/validate`) | The quality gates that can be automated (see below) | Mutate content | CI, pre-commit, agents |
| **Pitch core** (`/components/pitch/core`, pure TS) | `PitchSpace` (canonical metres), branded coordinate types, converters, geometry, Scene/Frame types | Touch DOM | Everything visual, pipeline fixtures |
| **Pitch renderer** (`/components/pitch`) | SVG base pitch, layer API, Canvas layer for dense data, WebGL overlay slot, notation legend | Own game logic | Interactions |
| **Interaction catalogue** (`/components/interactions/*`) | One component per catalogue entry, its props schema, a11y fallback, test oracle | Read/write the store directly | Lesson runtime (props in, typed events out), DataClient |
| **Design system** (`/components/ui` + tokens) | Tokens (CSS vars from `tokens.json`), primitives, glossary card, step chrome | Contain football logic | App shell, interactions |
| **Lesson runtime** (`/app/runtime`) | Joins spec+MDX, loop-stage state machine, checkpoints, focus mode, resolves interactions, emits events | Compute mastery | Interactions, learning engine, store |
| **Learning engine** (`/packages/learning`, pure TS) | Event schema, reducers for progress, mastery, FSRS (ts-fsrs), queue caps, low-energy and welcome-back selection, days-learned | Know about React or Dexie | Store adapter, runtime, Home/Review UI |
| **Local store** (`/app/store`) | `StateStore` interface; `IndexedDbStore` (Dexie) + optional `ServerMirror` | Hold business rules | Learning engine, dev/study server |
| **Dev/Study server plugin** (`/tools/vite-klopp`) | `/__klopp/*` endpoints: ping, event append, feedback append, snapshot, local media, local data; **dev and preview only** | Exist in the Vercel build | Browser, `/feedback`, `/data/local`, `/media/local` |
| **Feedback digest** (`/tools/feedback-digest`) | Dedupe/aggregate raw feedback and progress snapshot into a short `DIGEST.md` | Read secrets | Build agents before each phase |
| **Test harness** (`/tests`) | Generic lesson walker (uses interaction oracles), per-component visual tests, metric parity tests | Hand-write one E2E per lesson | CI |

### Recommended Project Structure

```
/app                      Vite + React SPA (routes, shell, runtime, store wiring)
  /src/routes
  /src/runtime            lesson runner, step state machine, checkpoint logic
  /src/store              StateStore interface, Dexie impl, server-mirror impl
  /src/data               DataClient (manifest resolve, cache, dev-time schema check)
  vite.config.ts          uses /tools/vite-klopp (content index, dev server, static copy)
/components
  /pitch                  core/ (pure TS) + renderer/ + legend/ + fixtures/
  /interactions           one folder per catalogue entry: index.tsx, schema.ts, a11y.tsx, oracle.ts
  /ui                     design-system primitives, tokens/ (tokens.json -> CSS vars + Tailwind theme)
/packages/learning        pure TS: events, reducers, mastery, FSRS wrapper, queue builder (vitest only)
/schemas                  zod schemas + generated JSON Schema + generated types from pipeline schemas
/content
  /tracks/<nn-slug>/track.json
    /<nn-slug>/chapter.json
      /<lesson-slug>/lesson.mdx + lesson.spec.json (+ items/*.json optional)
  /concepts.json  /competencies.json  /roles.json  /glossary.json  /changelog.json
/data
  /artifacts/<id>/<version>/  committed, immutable, with manifest.json
  /local/                     git-ignored; learner's licensed data, dev/study server only
/media/local/                 git-ignored; learner's local clips, dev/study server only
/pipeline                     Python 3.11+, uv project, pydantic models, recipes, CLI, pytest
/research                     Phase 0 outputs, SOURCE_REGISTRY.json, concept-map.json, role matrix
/tools                        validate/, build-registry/, feedback-digest/, coverage-report/, vite-klopp/
/tests                        unit/, e2e/ (generic walker), visual/, parity/ (TS vs pipeline vectors)
/docs                         DESIGN.md, decisions/, SETUP.md, CONTRIBUTING.md
/feedback                     git-ignored: events.jsonl, confusions.jsonl, progress-snapshot.json, DIGEST.md, backup/
```

### Structure Rationale

- **`/packages/learning` and `/components/pitch/core` are pure TypeScript with no React or DOM.** These are the two places where correctness bugs hide silently (mastery maths, coordinate conversion). Pure packages are unit-testable in milliseconds and reusable by validator tooling.
- **`/schemas` is its own folder** because five different actors (validator, app, pipeline, tools, agents writing content) share it. Putting schemas in `/app` would make the pipeline and validator depend on the app.
- **Order lives in manifests, identity lives in IDs.** Lesson IDs are explicit slugs in the spec, never derived from path or file order, so chapters can be reordered or moved without orphaning learner data.
- **Artifacts and local data are separate trees.** `/data/artifacts` is committed and redistributable; `/data/local` is the learner's licensed data and is only ever served by the dev/study server. The validator enforces that nothing under `local` can appear in a production build.
- **No symlinks anywhere.** The project already hit a symlink rejection on Windows (taste skill). Artifacts reach the app via a Vite static-copy plugin, not a link.

---

## Architectural Patterns

### Pattern 1: Spec-driven lessons (MDX for prose, JSON for structure, joined by step ID)

**What:** `lesson.spec.json` is the source of truth for structure: ordered steps, each with a `loopStage`, an `mdx` block ID, an optional `interaction` binding, data refs, items, claims, concepts, prerequisites, role/competency tags, estimated minutes, `status`. `lesson.mdx` contains only prose wrapped in `<Step id="...">` blocks plus inline `<Term id>` and `<Cite claim>` components. The validator joins the two by step ID. Prose lives where agents write best (Markdown); behaviour lives where it can be schema-checked (JSON).

**When to use:** every lesson, assessment and Watch Gym session. Lessons are never React code.

**Trade-offs:** two files per lesson can drift, so the validator must fail on orphans in either direction. In return you get: a generic runtime, generic E2E, automatable gates (word count, citations, loop completeness), and agents that can generate lessons without touching app code.

**Example:**
```jsonc
// lesson.spec.json (abridged)
{
  "id": "pitch-geometry",              // stable forever
  "kind": "lesson",                    // lesson | practice | assessment | watch-session
  "status": "shipped",                 // draft | review | shipped (shipped = frozen, PR-only)
  "contentVersion": 1,
  "minutes": 8,
  "prereqs": ["laws-of-the-game"],
  "concepts": ["pitch-dimensions", "penalty-area"],
  "serves": [{ "role": "head-coach", "competency": "game-literacy" }],
  "steps": [
    { "id": "hook",  "loopStage": "hook",  "mdx": "hook" },
    { "id": "see",   "loopStage": "see",   "mdx": "see",
      "interaction": { "id": "pitch.static", "props": { "scene": "scene:pitch-markings-v1" } } },
    { "id": "touch", "loopStage": "touch", "mdx": "touch",
      "interaction": { "id": "zone-explorer", "props": { "grid": "5-lane", "data": "artifact:sb-zone-density@1" } } },
    { "id": "predict","loopStage": "predict","mdx": "predict",
      "interaction": { "id": "quiz.tap-on-pitch", "props": { "itemId": "q.pitch-geometry.1" } } }
    // do, lock, connect ...
  ],
  "items": [ { "id": "q.pitch-geometry.1", "type": "tap-on-pitch", "conceptIds": ["penalty-area"], "...": "..." } ],
  "claims": [ { "id": "c1", "text": "...", "sources": ["ifab-laws-2025"], "asOf": "2025-07-01", "volatility": "regulation" } ]
}
```

### Pattern 2: Interaction registry with a strict contract

**What:** Every catalogue entry is registered with `defineInteraction({ id, propsSchema, component, a11yFallback, testOracle, needs })`. The runtime resolves `interaction.id` through the registry, lazy-loads the chunk, validates props, loads declared data via `DataClient`, and passes `{ props, data, mode, reducedMotion, onEvent }`. Interactions emit typed events (`answered`, `manipulated`, `revealed`) and never touch the store.

**When to use:** all 40+ components in brief §9.5, including quiz types. The same quiz component renders inside a lesson and inside Review (`mode: "review"`), which is what makes tap-on-pitch cards possible in the SRS queue without a second implementation.

**Trade-offs:** the contract is rigid and costs a little per component. It pays back at the first generic E2E run: each `testOracle.solve(props, data)` returns a correct response, so one Playwright spec can walk every shipped lesson with no per-lesson test code.

**Example:**
```typescript
export const zoneExplorer = defineInteraction({
  id: "zone-explorer",
  propsSchema: z.object({ grid: z.enum(["18-zone", "5-lane", "half-spaces"]), data: dataRef.optional() }),
  needs: ["pitch"],
  loopStages: ["see", "touch"],
  Component: lazy(() => import("./ZoneExplorer")),
  A11yFallback: lazy(() => import("./ZoneExplorerList")),   // keyboard/list alternative
  testOracle: { solve: () => ({ kind: "manipulated", zone: "z7" }) },
});
```

### Pattern 3: One pitch, one Scene/Frame language

**What:** `@klopp/pitch` defines a single JSON vocabulary, `Scene` (entities, arrows/runs/lanes, zones, annotations) and `Frame`/`Sequence` (time series of the same entities). It is the lingua franca between four things that otherwise would each invent a format: authored lesson visuals, Tactics Board save/load, quiz answers (a region or entity on the pitch), and pipeline reconstructions of real match moments. Phase Animator plays a `Sequence`; a Tactics Board scene is a one-frame `Sequence`.

**Canonical space:** metres, 105 x 68, origin top-left, x along the attacking direction (always attacking left to right), y downward (SVG-native). Brand every coordinate type (`SBPoint`, `OptaPoint`, `WyscoutPoint`, `MetresPoint`) so mixing systems is a compile error. Converters live in core and are round-trip property-tested plus landmark-fixture-tested (penalty spots, six-yard corners, goal posts, centre spot per provider).

**Renderer:** SVG for structure and up to a few hundred glyphs; a Canvas layer for dense layers (shot maps with thousands of points, tracking trails, heatmaps) that shares the same `scale` object so pixels line up with the SVG; a WebGL overlay slot reserved for pitch-control surfaces, added only when Pitch Control Live is built. Layers: `Markings`, `Zones`, `Heat`, `Events`, `Players`, `Annotations`, `Legend`. The legend is generated from the layers actually present and is on by default everywhere, which is how "notation legend appears everywhere" is enforced rather than remembered.

**When to use:** always. No component may draw its own pitch. A lint rule (no `<svg>` containing pitch-marking paths outside `/components/pitch`) is cheap insurance.

**Trade-offs:** the layer API must be designed before the third interaction needs it, or each new component will fork it. Spend design time on layers and the Scene schema in M0.

### Pattern 4: Immutable, versioned data artifacts with manifests

**What:** The pipeline writes `/data/artifacts/<id>/<version>/<files>` plus `manifest.json`: `{ id, version, schemaVersion, files[{name, sha256, bytes}], sources[registryIds], licence, attribution, redistributable, coordSystem: "canonical-m", assumedPitch, generatedBy{pipelineSha, kloppyVersion}, sizeBudgetOk }`. Versions are never edited. A change means `@2` next to `@1`; lessons pin `artifact:<id>@<version>`. The pipeline fails the build if an artifact exceeds its size budget or its source's registry entry is not redistributable.

**When to use:** every data product the app consumes. Start tiny (one StatsBomb open-data match sequence) in M0 to prove the whole path.

**Trade-offs:** repository growth (mitigate with per-artifact byte budgets, and no Git LFS needed at this scale). Benefit: shipped lessons can never see their numbers change underneath them, and gate #4 (reproducible numbers) becomes a mechanical CI job: a scheduled workflow re-runs the pipeline and compares SHA-256s.

### Pattern 5: Pipeline owns data shapes; contract goes through JSON Schema

**What:** Pydantic models in the pipeline are the source of truth for artifact shapes. `export-schemas` writes JSON Schema into `/schemas/data/`; the app generates TS types from it and the validator checks every artifact against it. The reverse (hand-written Zod mirrored in Python) drifts. A cross-language **parity test** covers shared logic: where the browser recomputes something (xG Playground, xT Grid Lab), the pipeline exports model coefficients plus test vectors (input to expected output) and a vitest test replays them.

**Trade-offs:** one extra generation step. It prevents the classic failure where the lesson says 0.12 xG and the playground says 0.14.

### Pattern 6: Event-sourced learner state with a disk mirror

**What:** The only primary write is an append-only `events` table (Dexie over IndexedDB). Every event: `{ id (ULID), ts, type, lessonId?, stepId?, itemId?, payload, appVersion, contentVersion }`. Types include `step.completed`, `item.answered`, `interaction.manipulated`, `confusion.flagged`, `session.started`, `placement.result`, `review.rated`, `note.saved`, `lowEnergy.completed`. Derived tables (`progress`, `cards` (FSRS), `mastery`, `daysLearned`) are rebuildable by replaying events through pure reducers in `/packages/learning`, so a bug fix in mastery maths can be re-applied to history, schema migrations are trivial, and "my eye is improving" (compare old vs new answers) is just a query over events that were never deleted.

A `ServerMirror` (dev/study server only) batches the same events to `/feedback/events.jsonl` (idempotent by event ID). On startup, if IndexedDB is empty and the mirror has events, restore. This solves three problems at once: build agents can read learner data from the filesystem, clearing browser data or changing origin does not lose progress, and rolling backups are free.

**Hard guard:** no field named `streak` anywhere; "days learned this month" is a count of distinct local dates. A schema test fails if a streak-like field appears.

**Trade-offs:** replaying large logs is slow in principle; at one learner the log reaches tens of thousands of events at most, and derived tables are cached with a replay watermark.

### Pattern 7: Frozen shipped content via stable IDs + golden snapshots

**What:** Shipped means: ID frozen, step IDs frozen, item IDs frozen (learner events and SRS cards key on them), data artifact versions pinned, interaction props schemas only additively changed. Renames use an `aliases` table in `content/aliases.json`. Breaking changes to a component create a new component ID (`tactics-board.v2`) and a codemod for specs, never an in-place break. CI rule: a PR touching `status: shipped` content or a component used by shipped content runs the full generic walker plus visual diffs for the affected lessons (affected set computed by scanning specs for interaction IDs).

**Trade-offs:** discipline overhead, but it is the only mechanism that makes "never break a shipped chapter" testable instead of aspirational.

---

## Data Flow

### Pipeline to app

```
raw download (StatsBomb open data, Metrica, ...)  [/pipeline/raw, git-ignored, hash-cached]
        ↓ kloppy standardise                       [/pipeline/interim, git-ignored]
        ↓ recipe (derive, downsample 25→5–10 Hz, convert to canonical metres)
        ↓ pydantic validate + size budget + licence gate (registry lookup)
/data/artifacts/<id>/<ver>/… + manifest.json       [committed, immutable]
        ↓ Vite static-copy (redistributable only; /data/local only in dev/study server)
DataClient.load("artifact:<id>@<ver>#file")        [fetch, immutable cache headers, validate in dev]
        ↓
Interaction props/data → Pitch layers
```

Rule: **the app only ever receives canonical-metre data.** Provider coordinates exist in raw/interim and in the Event Inspector's "raw view" (which shows original values next to converted ones, with the system named).

### Content to lesson runtime

```
content/**/lesson.spec.json + lesson.mdx
        ↓ validator (schema, join, gates)  ── fail → no merge
        ↓ Vite content plugin
content-index.json  (id, title, minutes, prereqs, concepts, status, serves — tiny, loaded at shell start)
lesson chunk (compiled MDX + spec, lazy import per lesson)
        ↓ runtime: build step list, resolve interactions via registry, load data refs
step state machine (hook→see→touch→predict→do→lock→connect), checkpoint after each step
        ↓ events
learning engine
```

`status` gating: the **study build** and production build include only `shipped` lessons; dev and Vercel previews include `draft` and `review`. This lets the build agents stay two chapters ahead without half-built content ever appearing to the learner.

### Learner actions to feedback

```
UI action → runtime/interaction emits typed event
        ↓ StateStore.append(event)         ← IndexedDB (truth)
        ↓ ServerMirror.append(event)       ← /feedback/events.jsonl (dev/study server; no-op on Vercel)
        ↓ reducers (pure): progress, mastery, FSRS cards, days-learned
        ↓ UI: rings, review queue (capped), welcome-back, low-energy session
session end / every N events → POST /__klopp/snapshot → /feedback/progress-snapshot.json
"I'm confused here" → event + /feedback/confusions.jsonl
tools/feedback-digest → /feedback/DIGEST.md  (deduped by lesson+step, ranked, weak concepts)
        ↓ read at the start of each phase by planning/build agents
```

On Vercel (read-only, protected) the mirror is absent; `GET /__klopp/ping` feature-detects it and Settings offers "Export feedback + progress" as a download to drop into `/feedback`.

### State Management

```
Persisted:  Dexie events ──reduce──► derived tables ──liveQuery──► React (dexie-react-hooks)
Ephemeral:  lesson runner reducer (current step, focus mode, local interaction state) — in-memory, checkpointed via events
UI prefs:   settings table (theme, reduced motion, focus mode, low-energy) — also events for audit
```

### Key Data Flows

1. **Placement diagnostic:** an `assessment` spec with items tagged by concept. Output is a `placement.result` event setting per-concept `placed` markers with confidence. The map suggests skipping but never hides, since PFSA knowledge is rusty and the diagnostic must test basics. Mastery for placed concepts decays into normal SRS.
2. **Watch Gym session:** a `watch-session` spec reusing the same runtime. Each clip is a step with `WatchGymPlayer`: `source` is `youtube-embed | local | reconstruction`, a mission card, a pause-and-predict timestamp, and a tap-on-pitch answer on a side pitch panel (not on broadcast pixels, which would need homography). Every clip declares a reconstruction fallback so CI and Vercel previews work with no footage. Local clips are served from git-ignored `/media/local` by the dev/study server. Answers are events tagged by `skill` so the "eye improving" graph is a query.
3. **Role readiness:** lesson `serves` tags → competency matrix → readiness is a pure function of mastery over the competency's concepts and items, shown on Role Map. The coverage report (`tools/coverage-report`) checks the "one lesson, one practice, one assessment" rule per competency at each milestone.
4. **Regulation freshness:** claims with `volatility: "regulation"` carry `asOf`; a scheduled job lists claims past a review date. Staleness is a warning and a backlog item, never a failed build, because failing builds on date would break shipped chapters.
5. **What's New:** generated from `shippedAt` in specs plus `content/changelog.json` notes.

---

## Interfaces Worth Pinning Early (decision-record candidates)

| Contract | Pin in | Why it must be early |
|----------|--------|----------------------|
| Source entry + registry ID stability rule | Setup, before research agents spawn | Research agents write `sources.json` that must merge mechanically; IDs are cited forever |
| Concept / competency / role JSON shape | Setup, same | Research synthesis must emit `concept-map.json` and role matrix machine-readably, not just Markdown |
| `Scene`/`Frame` schema and canonical `PitchSpace` | Pitch Standard phase | Every visual and every pipeline reconstruction depends on it |
| Lesson spec schema (steps, loop stages, items, claims, serves, status) | Content-engine phase | Every lesson depends on it; additive-only after M0 |
| Learner event schema and ID scheme | Progress phase | Events are permanent; renaming a type later means a migration of history |
| Artifact manifest schema | Pipeline scaffold | Licence gating and reproducibility depend on it |
| Interaction contract (props in, events out, oracle, a11y fallback) | Content-engine phase | 40+ components will be written against it |

---

## Suggested Build Order

Dependency spine: **schemas → (pitch core ‖ pipeline scaffold ‖ app shell) → content engine (validator, runtime, registry) → progress system → pitch renderer + first interactions → golden lesson**, with a thin "tracer lesson" proving the whole chain before polish.

### Milestone 0

1. **Setup and contracts.** Repo, CI skeleton (lint, typecheck, vitest, build), Windows one-command scripts, decision records. Also create `/schemas` stubs for source entry, concept, competency and role so the research sprint's output is machine-mergeable. *Depends on:* nothing. *Unblocks:* everything.
2. **Research sprint.** Parallel domain agents write `findings.md`, `sources.json`, `visual_ideas.md` against the pinned source schema; synthesis runs `tools/build-registry` (merge, dedupe by canonical URL, assign stable IDs, freeze) and emits `concept-map.json`, `ROLE_COMPETENCIES` in machine-readable form, and Markdown views. *Gate:* learner approval. Architecture work that does not depend on design (steps 3 and 4 below) can overlap with the tail of research.
3. **Pitch core (no visuals).** Pure TS: `PitchSpace`, branded coordinate types, converters (StatsBomb 120x80, Opta 100x100, Wyscout 100x100, tracking metres with centre-origin variants), geometry helpers, Scene/Frame schema, landmark fixtures. Can start in parallel with the research sprint because it needs no design decision.
4. **Pipeline scaffold.** `uv` project, pydantic models, CLI (`npm run data` wraps `uv run`, no `make` dependency on Windows), raw/interim/artifacts layout, manifest writer, size and licence gates, schema export, **one** recipe (a short StatsBomb open-data sequence converted to canonical `Sequence`). Proves the whole data path before any lesson needs data.
5. **Design directions and DESIGN.md** (needs research approval). Throwaway HTML sketches, learner picks, DESIGN.md including the Pitch Standard glyph set and component catalogue spec. `tokens.json` is the single output that code consumes.
6. **Design system and pitch renderer.** Tokens to CSS variables/Tailwind theme, primitives, glossary card, step chrome; pitch renderer layers, legend, Canvas layer, `/dev/gallery` route with every glyph and layer, visual regression baseline at 3 widths. *Depends on:* 3 and 5.
7. **App shell.** Routing, layout, theme, settings, `content-index` Vite plugin, `DataClient`, dev/study server plugin skeleton (`ping`), `/dev/gallery`. Can start alongside 5 with unstyled layout, then take tokens in 6.
8. **Content engine.** Lesson spec schema, MDX pipeline, validator (all automatable gates), runtime step machine, interaction registry with the contract, generic Playwright walker and oracle convention. *Depends on:* 1, 3, 7.
9. **Progress system.** Event schema, Dexie store, mirror, reducers, ts-fsrs wrapper, capped queue with quiet rescheduling, low-energy session builder, welcome-back, days-learned, export/import with versioned migrations, "I'm confused here" button and digest tool. *Depends on:* 8's event emission points; can be built in parallel with 6 using a stub lesson.
10. **Tracer lesson** (ugly but complete): one lesson through every layer: spec, MDX, one artifact, one pitch scene, one tap-on-pitch item, one cite, event log, SRS card, mirror, walker E2E. Written at the end of 9, before any polish. This is the architecture acceptance test and exposes contract mistakes while they are cheap to fix.
11. **Golden lesson.** The tracer, polished: all eight loop stages, a touch interaction, a predict-reveal, a data-backed visual, citations, glossary terms, accessibility fallback, reduced motion, visual snapshots at 3 widths, generic E2E. Its spec is the template agents copy.

### Milestone 1

Build components immediately before the first lesson that needs them, per brief §11.

1. **Track 0 foundation:** *Spotlight Tour* interaction (app tour), `assessment` kind plus the placement result event and map integration, goals page (profile in settings and events), Role Map v1 (read-only roles from `roles.json`, highlighted path, readiness meter fed by the competency matrix), and the learning-loop explainer lesson. Needs concept IDs for the items the diagnostic tests, so author Track 1 concept list first even if its lessons are not finished.
2. **Track 1 components and lessons:** quiz types (tap-on-pitch, arrange-the-shape, order-the-sequence), Tactics Board v1 (drag, formation morph presets, save/load Scene), Zone/line overlay basics, History Timeline interaction. Lessons: laws, pitch geometry, positions and numbering, formations, history timeline. Each chapter's spec includes the optional `threads` block (`watch`, `write`, `scout`) so later threads plug in without schema change.
3. **Watch Gym Level 1:** `WatchGymPlayer`, clip bank content type, reconstruction fallback from the pipeline's `Sequence`, mission card, skill-tagged answer events, "eye improving" view, low-energy integration (one clip, one question). Session length defaults short.
4. **Milestone hardening:** coverage report, full walker plus visual run over all shipped lessons, freeze (`status: shipped`), tag release, what's-new entry.

### Ordering rationale

- Schemas first because research agents, the validator, the pipeline and the runtime all read them, and additive-only evolution is only possible if the first version is sane.
- Pitch core and pipeline scaffold are design-independent, so they absorb the dead time while the learner is reviewing research and picking a visual direction.
- The tracer lesson sits between the progress system and the golden lesson on purpose. Skipping it means the golden lesson becomes the first integration test and its polish gets thrown away by contract changes.
- Placement diagnostic and Role Map are in M1 (not M0) because they need real concept and competency IDs and at least Track 1 item content to point at.

---

## Scaling Considerations

The scale axis is **content volume and time**, not users (one learner). Targets: M1 ~25 lessons, Parts A to G ~400 to 1000 lessons/items-sets.

| Concern | ~25 lessons (M1) | ~300 lessons | ~1000 lessons |
|---------|------------------|--------------|---------------|
| Validation time | Seconds, run on all | Incremental: only changed files plus dependents | Cache by file hash; cross-checks (prereq DAG, coverage) run on the index only |
| E2E walk | Full on every PR | Shard in CI; affected-set only unless shared component/runtime changed, full nightly | Same, plus a weekly full visual run |
| JS bundle | Shell + lazy chunks | Per-interaction chunks, per-lesson chunks | Same; `content-index.json` stays metadata-only (<~200 kB gz), glossary lazy-by-letter if needed |
| Event log | Hundreds of events | Tens of thousands, still instant | Snapshot derived tables with a replay watermark; compact old `interaction.manipulated` payloads, never answer events |
| Data artifacts in git | A few MB | Budget per artifact (e.g. ≤500 kB gz) and total; move large Parquet to a release asset fetched by `npm run data:fetch` | Same; app build only needs the small derived set |
| SRS queue | Trivial | Cap shown reviews (e.g. 8 to 12/day), quietly reschedule the rest | Same; mix by weakness, not by overdue age |

### Scaling Priorities

1. **First bottleneck:** E2E time. Fix by oracles plus affected-set selection plus sharding, designed in M0 rather than retrofitted.
2. **Second bottleneck:** repository weight from artifacts. Fix with per-artifact budgets enforced by the pipeline from day one.
3. **Third:** large-dataset labs (Track 15+). Introduce DuckDB-WASM and Parquet behind `DataClient` only then; Pyodide loads lazily in a worker and never in the main bundle. Neither is needed in M0 or M1, and `DataClient` hides the format so adopting them changes no lesson spec.

---

## Anti-Patterns

### Anti-Pattern 1: Lessons as React components

**What people do:** Hand-code each lesson as a page for speed.
**Why it's wrong:** No validation, no generic E2E, no agent-friendly generation, no way to compute prerequisites, coverage or what to re-test when a component changes.
**Do this instead:** Spec + MDX only. If a lesson needs something new, build a catalogue interaction, then use it.

### Anti-Pattern 2: A second pitch

**What people do:** Draw a quick custom SVG pitch inside a new component.
**Why it's wrong:** Different proportions, flipped axes, no legend, no converter, glyphs drift. Impossible to fix consistently later.
**Do this instead:** Everything draws through `@klopp/pitch` layers; lint for pitch-marking paths outside it.

### Anti-Pattern 3: Treating provider coordinates as metres

**What people do:** Compute distances and angles directly in StatsBomb (120x80) or Opta/Wyscout (100x100) space.
**Why it's wrong:** These are normalised pitches, not true metres. Scaling to 105x68 stretches x and y by different factors, so distances and angles are distorted. Only tracking data from Metrica, SkillCorner or DFL/Sportec is in real units.
**Do this instead:** Convert to canonical metres through the declared `assumedPitch`, record it in the manifest, and word any distance claim as approximate when it comes from event data. Branded types make accidental mixing a compile error.

### Anti-Pattern 4: IndexedDB as the only home of feedback and progress

**What people do:** Store everything in the browser and tell the agent to "read the feedback file".
**Why it's wrong:** Agents cannot read a browser's IndexedDB; Vercel's filesystem is read-only; a port change or cleared site data silently wipes progress, because origin `localhost:5173` and `localhost:5174` have separate databases.
**Do this instead:** Event log in IndexedDB plus the disk mirror, `strictPort` for the learner's origin, `navigator.storage.persist()`, restore-on-empty, export/import.

### Anti-Pattern 5: Learner and build agents sharing one dev server

**What people do:** Learner opens the same `npm run dev` that agents are hot-reloading.
**Why it's wrong:** Mid-edit breakage reaches the learner; draft content leaks into their map; the dev origin changes.
**Do this instead:** Two modes. `npm run study` serves the last shipped build (`shipped` content only) on a fixed port with the feedback middleware via Vite's preview-server hook; `npm run dev` on a different port is for agents. Document both in the README. Treat this as a recommendation to confirm with the learner's actual workflow.

### Anti-Pattern 6: Hand-typed numbers in prose

**What people do:** Write "Leicester averaged 41.2% possession" in MDX.
**Why it's wrong:** Not reproducible, silently stale, unverifiable.
**Do this instead:** `<Stat ref="artifact:...#path" fmt=".1f"/>` injects values at build time; the validator warns on bare numeric literals in prose outside an allow-list (years, counts of players, minutes).

### Anti-Pattern 7: Mutating shipped IDs, artifact versions or event types

**What people do:** Rename a lesson slug or retune an artifact in place.
**Why it's wrong:** Orphans learner events and SRS cards, changes numbers under already-verified claims.
**Do this instead:** Aliases for renames, new artifact version, new event type plus a reducer for the old one.

### Anti-Pattern 8: Building the whole catalogue up front

**What people do:** Implement all 40+ components during M0 because the brief lists them.
**Why it's wrong:** Designs go stale before use; M1 slips. The brief itself says to build components just before the first lesson that needs them.
**Do this instead:** Build the contracts, the registry and the legend/pitch layers in M0; implement interactions on demand.

### Anti-Pattern 9: Failing builds on content staleness or dead links

**What people do:** Make link checks and regulation as-of dates blocking.
**Why it's wrong:** A third-party site going down breaks a shipped chapter's CI.
**Do this instead:** Non-blocking scheduled jobs that produce a backlog report for the next phase.

### Anti-Pattern 10: Windows-hostile tooling

**What people do:** Require `make`, symlinks, Bash-only scripts, or long path trees.
**Why it's wrong:** Learner machine is Windows; the project already hit a symlink rejection.
**Do this instead:** npm scripts calling `uv run`, Node tools instead of shell scripts, copy instead of link, short paths for artifacts.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| StatsBomb open data (incl. 360), Metrica, SkillCorner, DFL/Sportec, Wyscout public set | Pipeline only, via kloppy and direct download; hash-cached in git-ignored raw | Licence and attribution flow through registry into manifests. Open tracking data is not Premier League; PL-first examples will lean on StatsBomb event data and 360 freeze frames where available. Verify what PL matches exist before promising reconstructions of PL moments (research flag). |
| YouTube embeds / official highlights | `WatchGymPlayer` `source: youtube-embed`, IFrame API for start/end and pause | Embeds can be removed or blocked; every clip needs a reconstruction fallback. Never download. |
| Learner's local clips and local datasets | Dev/study server serves git-ignored `/media/local` and `/data/local`; `local:` URIs in specs | Excluded from Vercel build by guard test. Browser File System Access handles are a poor fit for persistence; prefer the folder convention. |
| GitHub Actions | lint, typecheck, vitest, pytest, validate, build, E2E walker, scheduled reproducibility and link-check jobs | Python job caches `uv`; E2E uses `vite preview` of the production build |
| Vercel | Static `dist` only, Deployment Protection on, preview per PR (drafts visible), no serverless functions | Build must not require Python; therefore artifacts are committed. A guard test fails if any non-redistributable artifact or `/data/local` path appears in `dist`. |
| Model/LLM providers (verifier, agents) | Outside the app; they read `/content`, registry and `/feedback` | The verifier agent receives the spec's `claims[]` list and sources, not the writing transcript |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Content to Runtime | Build-time compiled chunks + content index | Runtime never reads files at run time |
| Runtime to Interaction | Props (validated) in, typed events out, data via DataClient | Interactions are store-ignorant |
| Runtime to Learning engine | Events appended; derived state read via live queries | Reducers are pure and shared with tools (digest, coverage) |
| Learning engine to Store | `StateStore` interface | Swap Dexie for SQLite-WASM later without touching engine |
| App to Dev/Study server | `/__klopp/*` HTTP, feature-detected | Never required for the app to function |
| Pipeline to App | Files only (artifacts + manifest + JSON Schema) | No shared runtime, no network between them |
| Research to App | Registry slim index, `concepts.json`, `competencies.json`, `roles.json` | Machine-readable outputs are first-class; Markdown is a view |
| Build agents to Learner data | `/feedback/DIGEST.md` and `progress-snapshot.json` | Agents read digest first, raw JSONL only on demand, to protect context |

---

## Quality Gates Mapped to Automation (brief §12)

| Gate | Automated by | Remaining human/agent step |
|------|--------------|----------------------------|
| 1 Facts | Validator: every claim has registry source IDs; verifier-agent sign-off recorded in spec (`verifiedBy`, `verifiedAt`) and required for `status: shipped` | Separate verifier agent (Opus for metrics, regulations, finance) |
| 2 Pedagogy | Validator: all loop stages present in order, ≤60 words per step, ≥1 interaction, ≥2 retrieval items | Review of teaching quality |
| 3 Design | Playwright screenshots at 3 widths, visual diff against baseline | Taste-skill review of new screens |
| 4 Data | Scheduled pipeline re-run and SHA compare; pytest metric tests; TS parity vectors; `<Stat>` injection | Choosing known-value references |
| 5 A11y/perf | axe in the walker, keyboard-only pass via oracle, reduced-motion run, bundle and artifact size budgets | Manual spot check |
| 6 Regulation | `asOf` required on regulation claims; staleness report | Re-verification |
| 7 Licensing | Manifest redistributable flag, quote-length lint, attribution surfaced in Sources drawer | Judgement on borderline use |
| 8 Role coverage | `tools/coverage-report` | Milestone review |

---

## Risks and Research Flags for the Roadmap

- **Concept map must be machine-readable at synthesis time.** If research emits only Markdown, placement, mastery, Role Map, Concept Map and coverage all stall. Put the JSON requirement into the research-sprint task definition.
- **Watch Gym footage rights.** Legal footage is scarce and fragile. M1 must be deliverable entirely from reconstruction; footage is an enhancement. Needs a dedicated spike on which open data actually contains PL matches.
- **Pitch Standard layer API** is the highest-leverage design decision. Flag Phase "Pitch Standard" for a deeper plan and a spike with three real consumers (static markings, Tactics Board drag, Phase Animator playback of 22 players).
- **Provider coordinate details** (axis direction, origin, whether Wyscout and Opta share orientation conventions) must be verified against provider spec documents and encoded as fixtures, not remembered. Treat the current table in this file as unverified.
- **Study vs dev server split** changes the learner's one-command expectation; decide with the learner at the Vercel/localhost checkpoint.
- **Storage engine** (IndexedDB via Dexie versus SQLite-WASM on OPFS): Dexie is simpler and sufficient for an event log plus FSRS cards; SQLite-WASM is a swap-in later behind `StateStore` if relational queries over history become painful. Decide in a decision record.
- **Placement diagnostic design** needs pedagogy research (adaptive versus fixed, confidence, how not to skip basics) before M1 Track 0 planning.
- **Versions** (Vite, React, ts-fsrs, Dexie, Playwright, velite vs custom MDX plugin) belong to STACK.md. This document assumes a Vite SPA because nothing here needs SSR, Vercel serves static output, workers (Pyodide, DuckDB-WASM) are simpler without a server framework, and the dev/preview middleware hook that powers the feedback bridge is first-class in Vite. A Next.js choice would work too but adds server concepts with no use. For content validation, the options are Velite (Zod-validated content layer; its MDX does not bundle imported components) or a custom Zod step beside the MDX Vite plugin; because validation here needs the cross-file join and registry lookups anyway, a custom validator is recommended regardless.

---

## Sources

- Project context: `E:/To become new klop/.planning/PROJECT.md`; `NEW_PROJECT_INPUT.md` §8 (Lesson Loop), §9.4–9.6 (Pitch Standard, catalogue, templates), §10 (technical architecture), §11 (rolling release), §12 (quality gates), §16 (kickoff answers). HIGH, authoritative for requirements.
- kloppy coordinates documentation, via fetch: Opta and Wyscout standardised 100x100, all common systems orient x left to right, y direction varies; origins configurable (top-left, bottom-left, centre). https://kloppy.pysport.org/user-guide/concepts/coordinates/ — MEDIUM (page body incomplete in fetch; provider-by-provider origin table not confirmed).
- mplsoccer pitch dimensions (StatsBomb 120x80, Wyscout 100x100 with inverted y, Opta 100x100) via search summaries: https://deepwiki.com/andrewRowlinson/mplsoccer/2.2-pitch-dimensions and https://mplsoccer.readthedocs.io/en/latest/_sources/gallery/pitch_plots/plot_standardize.rst.txt — MEDIUM (third-party summaries, verify against provider specs).
- fast-forward coordinate systems (Opta bottom-left origin, 0–100): https://fast-forward.readthedocs.io/en/latest/concepts/coordinate-systems/ — MEDIUM.
- ts-fsrs (FSRS v6 scheduler only, storage is up to the caller): https://github.com/open-spaced-repetition/ts-fsrs — MEDIUM (search summary).
- Dexie as a thin wrapper over IndexedDB; SQLite WASM with OPFS requires a Web Worker and shows higher small-write latency than raw IndexedDB in one third-party benchmark: https://dexie.org/docs/Dexie.js , https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html (vendor-biased), https://blog.openreplay.com/sqlite-browser-opfs/ — MEDIUM-LOW on the benchmark; the conclusion (Dexie suffices for an event log) rests on data size, not on that benchmark.
- Velite (Zod-validated content layer, MDX does not bundle imported components) and Astro content collections: https://github.com/zce/velite , https://docs.astro.build/en/guides/content-collections/ — MEDIUM.
- Patterns (event sourcing, registry-based plugin components, schema-owned data contracts, branded types): established engineering practice, applied from first principles to the brief; no single source. HIGH on soundness, untested in this project.

---
*Architecture research for: interactive visual-first football learning app (content-as-data, local-first, rolling release)*
*Researched: 2026-11-27*
