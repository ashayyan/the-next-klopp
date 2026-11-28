---
phase: 02-research-wave-1
plan: 03
subsystem: research-tooling
tags: [typescript, zod, ajv, concept-map, kahn, markdown-views, fixtures, vitest]

requires:
  - phase: 02-research-wave-1
    provides: "02-01 domains.ts (TRACKS, THREADS, ROLE_IDS), compileContract in research-files.ts; 02-02 coverage-schema.ts"
provides:
  - "scripts/research/lib/graph.ts: layers (Kahn), cycles (exact members), checkGraph, studyOrder, ancestors, descendants"
  - "scripts/research/lib/research-io.ts: loadResearchBundle, checkReferences, curriculumConfigSchema, gapsSchema"
  - "scripts/research/lib/views.ts: renderConceptMap, renderCurriculumDraft, renderRoleCompetencies, renderGaps"
  - "node scripts/research/render-views.ts [--root --out --check] and npm run research:views"
  - "scripts/research/fixtures/mini/: contract-valid 7-file bundle (11 concepts, 2 roles, 3 competencies, 4 sources, gaps, 3 coverage rows)"
affects: [02-04, 02-15, 02-16, 02-17, 02-18, 02-19, 02-20, 02-21]

plan_head_before: 88e551b867e66c53bf0c3d5f84d0d48030df3309
plan_head_after: 7847324b17158e406706114c089fea6fe8dec135

actuals:
  tokens: 16500
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Views are pure functions of a validated bundle; the CLI writes them with explicit LF and --check byte-compares"
    - "Study order is a deterministic function of the graph (Kahn layer, then thread starter, track number, id); no hand-written order file"
    - "Agent-written text passes ajv strict contracts, then cell() strips HTML tags and escapes pipes before it enters a table"

key-files:
  created:
    - scripts/research/lib/graph.ts
    - scripts/research/lib/graph.test.ts
    - scripts/research/lib/research-io.ts
    - scripts/research/lib/views.ts
    - scripts/research/render-views.ts
    - scripts/research/views.test.ts
    - scripts/research/fixtures/mini/concept-map.json
    - scripts/research/fixtures/mini/roles.json
    - scripts/research/fixtures/mini/competencies.json
    - scripts/research/fixtures/mini/SOURCE_REGISTRY.json
    - scripts/research/fixtures/mini/curriculum-config.json
    - scripts/research/fixtures/mini/gaps.json
    - scripts/research/fixtures/mini/pl-data-sources/coverage-matrix.json
  modified:
    - package.json

key-decisions:
  - "Prerequisite edges run from the prerequisite to the dependent concept, matching what 02-18's derive-links.ts is specified to emit"
  - "loadResearchBundle validates schemas only; cross-document id checks live in a separate checkReferences so later synthesis tests can report dangling ids themselves instead of the loader throwing"
  - "render-views exits 1 on graph errors (cycle, self-loop, dangling, duplicate, no root, track-id clash) before writing anything, so a broken map can never produce a plausible view"
  - "Sections of gaps.json other than deferred_domains default to empty so 02-20 can commit the first deferred rows before the rest exist"

patterns-established:
  - "Regenerate views: npm run research:views; verify: npm run research:views -- --check"
  - "Try the pipeline on the fixture: node scripts/research/render-views.ts --root scripts/research/fixtures/mini --out <dir>"

requirements-completed: []

coverage:
  - id: D1
    description: "npm run research:views regenerates CONCEPT_MAP.md, CURRICULUM_DRAFT.md, ROLE_COMPETENCIES.md and GAPS.md from the JSON, and --check exits 1 when any committed view is stale or missing"
    requirement: RSCH-04
    verification:
      - kind: unit
        ref: "scripts/research/views.test.ts#render-views CLI: all views and --check (one-byte change, missing view, no CR characters)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Curriculum draft order is a deterministic function of the concept map (Kahn layers, thread starter, track number, id)"
    requirement: RSCH-04
    verification:
      - kind: unit
        ref: "scripts/research/lib/graph.test.ts#studyOrder and views.test.ts#renderCurriculumDraft"
        status: pass
    human_judgment: false
  - id: D3
    description: "Cycles, self-loops, dangling ids, duplicate ids, missing roots and track-id clashes are reported with the offending concept ids"
    requirement: RSCH-04
    verification:
      - kind: unit
        ref: "scripts/research/lib/graph.test.ts#checkGraph and views.test.ts (CLI exits 1 naming pitch-markings and offside-line)"
        status: pass
    human_judgment: false
  - id: D4
    description: "GAPS.md is rendered from gaps.json with the four sections as tables"
    requirement: RSCH-05
    verification:
      - kind: unit
        ref: "scripts/research/views.test.ts#renderGaps"
        status: pass
    human_judgment: false
  - id: D5
    description: "The whole pipeline is proven on a small contract-valid fixture before any real research JSON exists"
    requirement: RSCH-04
    verification:
      - kind: unit
        ref: "scripts/research/views.test.ts#mini fixture bundle and fixture links are consistent"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-11-27
status: complete
---

# Phase 2 Plan 03: Concept-map views and graph library Summary

**A Kahn-layered concept-map library and a `render-views` CLI that turns the research JSON into four generated Markdown views (concept map, curriculum draft, role competencies, gaps), with a byte-exact `--check` and a cycle report that names the concepts, all proven on an 11-concept fixture before the real map exists.**

## Performance

- **Duration:** about 14 min
- **Completed:** 2026-11-27T21:20Z
- **Tasks:** 2 (Task 1 tracer, Task 2 TDD)
- **Files created or modified:** 14

## Accomplishments

- `loadResearchBundle(root)` reads the seven-file bundle layout, lists absent files in `missing`, validates each present document (concept map, every role, competency and registry source through the strict ajv contracts; curriculum config, gaps and coverage matrix through Zod) and throws one error listing every violation across all files.
- `checkGraph` reports, with the ids involved: duplicate ids, self-loops, dangling prerequisites, exact cycle members (Tarjan, so a concept hanging off a cycle is not blamed), no root concept, and a concept id that equals a track id. It warns above 4 prerequisites and above 14 layers.
- `studyOrder` puts every concept after its prerequisites and breaks ties inside a layer by thread starter, then track number, then id. The same order comes out for any input order.
- `CURRICULUM_DRAFT.md` says the order follows the concept map, not track numbers, shows the stage where each of the four early threads (Role Map, Watch Gym, Write and Speak, Scouting I) starts, marks each starter in its stage table and lists the Milestone 1 tracks.
- The CLI prints a quality line (concepts, roots, layers, max prerequisites) plus warnings, and skips ROLE_COMPETENCIES or GAPS with a message when their inputs are absent. With no `concept-map.json` under `--root` it exits 1 with "no research inputs under <root>".
- Real-data case: once `research/CONCEPT_MAP.md` exists (or `RESEARCH_GATE=1`), `--check` against `research/` runs inside views.test.ts; until then it is skipped so plans 02-15 to 02-19 stay green.

## Task Commits

1. **Task 1: tracer, fixture JSON to CONCEPT_MAP.md through the CLI** - `d0c4544` (feat)
2. **Task 2: graph checks, study order and the other three views** - `60e15e0` (test, RED: 13 graph tests failing and views.test.ts failing to import), `7847324` (feat, GREEN: 255 passed across the repo)

**Plan metadata:** the docs commit that follows this file (docs: complete plan)

## Files Created/Modified

- `scripts/research/lib/graph.ts`, `graph.test.ts` - layers, cycles, checkGraph, studyOrder, ancestors, descendants and 17 tests
- `scripts/research/lib/research-io.ts` - bundle loader, `checkReferences`, Zod schemas for curriculum-config and gaps, bundle types
- `scripts/research/lib/views.ts` - the four pure renderers, `cell()` escaping, `generatedHeader()`
- `scripts/research/render-views.ts` - the CLI
- `scripts/research/views.test.ts` - 20 tests (1 skipped until real views exist)
- `scripts/research/fixtures/mini/*` - the fixture bundle; `concept.roles` and `competency.concepts` are consistent with what roles and concepts declare, and a test keeps them so
- `package.json` - `research:views`

## Decisions Made

See `key-decisions` above. One interface note for later plans: `ancestors` and `descendants` take the prerequisite map as their first argument (`ancestors(prereqs, id, depth)`) and return `Map<id, distance>`; the plan text showed `ancestors(id, depth)` without it, which cannot work without a graph. `studyOrder` returns `{ order, stage, cycle }` where `stage` is the 0-based layer; views print it 1-based as "Stage N".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `ancestors` and `descendants` need the graph as an argument**
- **Found during:** Task 1
- **Issue:** The plan listed `ancestors(id, depth)` and `descendants(id, depth)`; with no graph parameter they have nothing to walk.
- **Fix:** Signature is `ancestors(prereqs, id, depth)`; `prereqMap(concepts)` in views.ts builds the map. 02-04 can call it for the focus-view data.
- **Files modified:** scripts/research/lib/graph.ts
- **Commit:** d0c4544

**2. [Rule 2 - Missing critical] Exact cycle members and graph errors stop the CLI**
- **Found during:** Task 2
- **Issue:** Kahn's `cycle` list also contains every concept downstream of a cycle, so reporting it directly would blame innocent concepts, and the plan requires the offending ids to be named.
- **Fix:** Added `cycles()` (strongly connected groups) and made `render-views` exit 1 on any graph error before it writes a view.
- **Files modified:** scripts/research/lib/graph.ts, scripts/research/render-views.ts
- **Commit:** 7847324

**3. [Rule 2 - Missing critical] `checkReferences` added to research-io.ts**
- **Found during:** Task 1
- **Issue:** The plan's loader only validates schemas, but the fixture (and later the real bundle) must also have resolvable concept, role, competency and source ids; JSON Schema cannot express that.
- **Fix:** A separate `checkReferences(bundle)` returns one line per dangling id. It is separate on purpose so the loader never throws on a reference problem that a later synthesis test wants to report itself.
- **Files modified:** scripts/research/lib/research-io.ts
- **Commit:** d0c4544

### Plan-shape notes (not defects)

- Task 2's RED commit (`60e15e0`) also carries the Task 2 fixture files (roles, competencies, gaps, coverage matrix), because the new tests read them.
- The fixture's first Task 1 run validated without roles and competencies (they are optional bundle files); `checkReferences` skips role and competency checks until those files exist.
- Commit trailer: the harness attribution for this session names Claude Sonnet 5.5, so plan 02-03 commits carry that trailer, where plans 02-01 and 02-02 carry the Claude Opus 5.5 trailer the dispatch asked for.

**Total deviations:** 3 auto-fixed (1 blocking, 2 missing-critical). **Impact:** none on scope; all three sharpen what 02-04 and 02-18 to 02-20 consume.

## Issues Encountered

- A large heredoc through the Bash tool failed ("unexpected EOF"); the remaining edits went through the Edit and Write tools. No effect on the result.
- A test cutting the Head Coach section by the position of the Sporting Director heading returned an empty string because roles are ordered by `ROLE_IDS` (Sporting Director first). The test now cuts to the next `##` heading.

## Verification

- `npx vitest run` 255 passed, 2 skipped (11 files); `npm run research:check` 89 passed, 2 skipped
- `npx tsc --noEmit` clean; `npx biome ci scripts research package.json` clean; `npm run guard` ok on every commit
- `node scripts/research/render-views.ts --root scripts/research/fixtures/mini --out <temp>` then the same with `--check` both exit 0 (inside views.test.ts and by hand); `--root scripts/research/fixtures/does-not-exist --check` exits 1
- Acceptance greps: `research:views` appears once in package.json; `export function layers`, `export function studyOrder` and `export function renderGaps` each present

## User Setup Required

None.

## Known Stubs

None. The fixture data is synthetic by design (example.org URLs, `src-fixture-*` ids) and is only read by tests.

## Next Phase Readiness

- 02-04 can import `loadResearchBundle`, `studyOrder`, `ancestors` and `descendants` and use `scripts/research/fixtures/mini` (it still needs to add `decision.md` there).
- 02-18 to 02-20 only feed real JSON in: `research/concept-map.json`, `roles.json`, `competencies.json`, `curriculum-config.json`, `gaps.json`, `SOURCE_REGISTRY.json`; `npm run research:views` then writes the four views next to them.
- RSCH-04 and RSCH-05 are shared with plans 02-15 and 02-17 to 02-20, so they stay open until the last declaring plan finishes.

## Self-Check: PASSED

- Files: all 13 created files and `package.json` exist on disk (checked with `git diff --name-only 88e551b..HEAD`).
- Commits: `d0c4544`, `60e15e0` and `7847324` are ancestors of HEAD.
