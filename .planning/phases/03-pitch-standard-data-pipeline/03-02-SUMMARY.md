---
phase: 03-pitch-standard-data-pipeline
plan: "02"
subsystem: data-format
tags: [json-schema, zod, ajv, scene, playback, d3-interpolate, d3-ease, zustand]

requires:
  - phase: 01-setup-contracts
    provides: dual-validator harness (schemas/schemas.test.ts), common.schema.json, contractSchemas
provides:
  - Scene/Frame format v1 as schemas/scene.schema.json (2020-12) plus Zod mirror src/scene/schema.ts
  - harness fixtures schemas/fixtures/scene.fixtures.json (2 valid, 7 expect_path invalid)
  - checkSceneIntegrity / parseScene with JSON Pointer issues (src/scene/validate.ts)
  - pure f(t) sampler with frozen presence semantics (src/scene/playback/sample.ts)
  - four kind fixtures (authored, board, quiz-answer, reconstruction)
  - exact pins zustand 5.1.0, d3-interpolate 3.0.2, d3-ease 3.0.2 (+ types)
affects: [03-04 glyphs and legend, 03-05 pydantic parity, 03-06 recipe output, 03-07 playback bar, 03-09 drag spike, 03-10 dev page error panel, phase-06 quizzes, phase-08 tactics board]

actuals:
  tokens: 23307
  tasks: 3
  commits: 5
plan_head_before: 9734239e21f9fe567ddd1ca1fa1915de657fadb6
plan_head_after: a6c403e9c3409575eaa551a30c120bb6668e5222

tech-stack:
  added: [zustand@5.1.0, d3-interpolate@3.0.2, d3-ease@3.0.2, "@types/d3-interpolate@3.0.4", "@types/d3-ease@3.0.2"]
  patterns:
    - "oneOf branches with properties.type.const (ajv strict) mirrored by z.discriminatedUnion"
    - "Integrity issues as { path: JSON Pointer, message } shared by tests and UI"
    - "Sampling is a precomputed per-entity track plus binary search; f(t) is pure"

key-files:
  created:
    - schemas/scene.schema.json
    - schemas/fixtures/scene.fixtures.json
    - src/scene/schema.ts
    - src/scene/validate.ts
    - src/scene/scene.test.ts
    - src/scene/playback/sample.ts
    - src/scene/playback/sample.test.ts
    - src/scene/fixtures/authored.json
    - src/scene/fixtures/board.json
    - src/scene/fixtures/quiz-answer.json
    - src/scene/fixtures/reconstruction.json
  modified:
    - src/schemas/contracts.ts
    - package.json
    - package-lock.json

key-decisions:
  - "Presence rule frozen (A7): entity.presence ?? (kind reconstruction ? sampled : always); stated in the schema $comment and sample.ts"
  - "Reconstruction fixture holds 10 events (9 passes incl. Mendy's cross, then the shot) per the 03-RESEARCH table; the plan text said eight passes but the table and the acceptance check (events.length 10) both give 9 passes"
  - "eventState active window: [event.t, tEnd ?? next later event t ?? duration), inclusive at the scene end and at event.t; every event active in a 1-frame scene"
  - "A StatsBomb scene is rejected as shippable unless it is also localOnly; logoRequired true is always required for provider statsbomb"
  - "Wyscout Danilo label is DS (first-name initial plus last-name initial of 'da Silva'); 03-06 replaces the fixture with recipe output"

patterns-established:
  - "Scene fixtures live in src/scene/fixtures/*.json (top level only); scene.test.ts runs ajv, Zod and integrity on each"
  - "Integrity tests mutate a structuredClone of a fixture and assert the issue path"

requirements-completed: [PITCH-04]

coverage:
  - id: D1
    description: "Scene v1 JSON Schema and Zod mirror agree on every harness fixture (valid and expect_path invalid)"
    requirement: PITCH-04
    verification:
      - kind: unit
        ref: "schemas/schemas.test.ts#scene schema"
        status: pass
    human_judgment: false
  - id: D2
    description: "Four kind fixtures pass ajv, Zod and checkSceneIntegrity"
    requirement: PITCH-04
    verification:
      - kind: unit
        ref: "src/scene/scene.test.ts#scene fixtures"
        status: pass
    human_judgment: false
  - id: D3
    description: "Integrity rules report JSON Pointer issues (frames, entities, events, run-off bounds, annotations, ADR 0008 licence rules); parseScene maps Zod issues"
    requirement: PITCH-04
    verification:
      - kind: unit
        ref: "src/scene/scene.test.ts#checkSceneIntegrity"
        status: pass
    human_judgment: false
  - id: D4
    description: "f(t) sampler: t 3.2 interpolation and stepped hold, presence always/sampled, gap interpolation, ballOwner, clamping, eventState"
    requirement: PITCH-04
    verification:
      - kind: unit
        ref: "src/scene/playback/sample.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Playback dependencies pinned exactly with verified registry signatures"
    verification:
      - kind: other
        ref: "npm audit signatures; npm audit --omit=dev --audit-level=high"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-11-28
status: complete
---

# Phase 3 Plan 02: Scene/Frame Format v1 Summary

**Scene v1 frozen as one 2020-12 JSON Schema with a strict Zod mirror in the shared dual-validator harness, a JSON-Pointer integrity validator for the rules the schema cannot express, a pure f(t) sampler with the frozen presence semantics, and one fixture of each kind including the Wyscout Sané goal chain.**

## Performance

- **Duration:** about 10 min
- **Started:** 2026-11-28T00:58:59Z
- **Completed:** 2026-11-28T01:09:00Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- `schemas/scene.schema.json` with the exact interfaces field list: `$defs` for point, team, entity, frame, five event branches, six annotation branches and source; ajv `strict: true` compiles it; `scene: sceneSchema` registered in `contractSchemas`.
- Harness fixtures: valid minimal authored and minimal reconstruction (with presence); invalid at `/schemaVersion`, `/kind`, `/pitch/length`, `/extra`, `/events/0/type`, `/events/0/goal`, `/teams/0/side` — both validators report each path.
- `checkSceneIntegrity`: first frame at 0 and strictly increasing t; known position keys; ballOwner is a player; unique ids; team rules; one ball; one team per side; event team/player/receiver/target; tEnd ≥ t; sequence references; shape members in team; highlight target xor at; ordered time ranges; points within the pitch plus 3 m run-off (inclusive); every entity in a frame; local-only never shippable; open data needs provider and licenceUrl; StatsBomb local and logo-credited.
- `createSampler`, `sceneDuration`, `keyframeTimes`, `effectivePresence`, `eventState` per the interfaces block.
- Fixtures: authored (back four slide; home-4 at t 3.2 = (23.6, 24.0)), board (22 players, 4-3-3 v 4-4-2, goalkeepers as `goalkeeper`), quiz answer (zone, tapped point, note), reconstruction (Wyscout 2499754, 11 frames, t 0..18.97, `clock` {period 2, offsetSec 1852.91}, Pappalardo attribution, CC BY 4.0).

## Task Commits

1. **Task 1: Scene format tracer (schema, Zod, harness, authored fixture)** - `f50565b` (feat)
2. **Task 2: Integrity validator and three fixtures** - `df371ad` (test, RED), `4149f65` (feat, GREEN)
3. **Task 3: Pinned deps and f(t) sampler** - `d830ea4` (test, RED, with the installs), `a6c403e` (feat, GREEN)

## TDD Gate Compliance

- **Task 2 RED:** `npx vitest run src/scene/scene.test.ts --reporter=tap-flat`, exit 1; 27 behaviour tests failed against a `checkSceneIntegrity` stub returning `[]`; target "checkSceneIntegrity: frames > requires the first frame at t 0" — classifier `RED_EVIDENCE_OK`. Semantic: the targets ran and failed on their issue-path assertions; fixture tests passed, so modules loaded.
- **Task 3 RED:** full-file run had all 13 sampler tests failing against a stub, but Vitest's TAP output embeds multi-line diffs that the classifier rejects as malformed (`invalid_record`). Re-run isolated with `-t "interpolates defender 4"`: exit 1, "expected undefined to be close to 23.6" — classifier `RED_EVIDENCE_OK`.
- **GREEN:** `4149f65` (37 scene tests) and `a6c403e` (13 sampler tests); full suite 506 passed, 6 skipped.

## Package legitimacy

No human checkpoint (CONTEXT post-research decision). Evidence:

| Package | Pin | Repository | dist.integrity | Audit evidence (03-RESEARCH) |
|---------|-----|-----------|----------------|------------------------------|
| zustand | 5.1.0 | git+https://github.com/pmndrs/zustand.git | sha512-ciJZlP48M1PTQbVQq81CGVFxHTLpZNrFjKqwjtCU34AWuXTZT/jrF3p9+fI84Cf1eSCMLapxqBy/SNTfwOBuqA== | maintainers daishi, jeremyrh, drcmda; 91.8M/wk; SUS only by too-new heuristic; no install script |
| d3-interpolate | 3.0.2 | git+https://github.com/d3/d3-interpolate.git | sha512-IRzGU62DtxhvsnSTWMQIdnoZ6gA+BCWwBon1EJI6SjoN595799b6z/QRBzXfFhE8iupUPp3042yBNo0STPqnzQ== | maintainers mbostock, recifs; 109M/wk; SLSA provenance; dep d3-color 3.1.1; no install script |
| d3-ease | 3.0.2 | git+https://github.com/d3/d3-ease.git | sha512-B5znKqRmKROAN4oHWQ50W/qisVjA9GXh2WMsVKdFVp4DxWmcrOsweqgUOUVsv5th96kwaZlokU6SlV4J3gak1w== | maintainers mbostock, recifs; 97M/wk; no deps; no install script |
| @types/d3-interpolate | 3.0.4 | DefinitelyTyped | sha512-mgLPETlrpVV1YRJIglr4Ez47g7Yxjl1lj7YKsiMCb27VJH9W8NVM6Bb9d8kkpG/uAQS5AmbA48q2IAolKKo1MA== | OK verdict |
| @types/d3-ease | 3.0.2 | DefinitelyTyped | sha512-NcV1JjO5oDzoK26oMzbILE6HW7uVXOHLQvHshBUW4UMdZGfiY6v5BeQwh9a9tCzv+CeefZQHJt5SRgK154RtiA== | OK verdict |

`npm audit signatures`: 90 packages have verified registry signatures, 49 verified attestations, no invalid or missing. `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities. Installs ran with `HUSKY=0` (Phase 1 convention).

## Files Created/Modified
See `key-files` in the frontmatter.

## Decisions Made
See `key-decisions` in the frontmatter.

## Deviations from Plan

**1. [Plan wording] Reconstruction event count**
- The plan text says "eight passes (Mendy's cross is a pass), then the shot", but the 03-RESEARCH table lists nine non-shot events and the plan's acceptance check requires `events.length === 10`. The fixture follows the table: 9 passes + 1 shot, and the sequence annotation lists all 10 ids.

**2. [Rule 3 - Blocking] Biome useIterableCallbackReturn in validate.ts**
- A `forEach` arrow returned a value; changed to block bodies. Committed in 4149f65.

**3. [Tooling] TDD evidence for Task 3 isolated with `-t`**
- Vitest TAP output with multi-line diffs fails the evidence parser; the target test was re-run alone to produce a parseable report. No code impact.

**Total deviations:** 3, none changing the frozen contract.

## Issues Encountered
None beyond the deviations above.

## User Setup Required
None.

## Next Phase Readiness
- 03-04 can import `Scene` types, `createSampler` and `eventState`.
- 03-05 pydantic parity walker can read `schemas/scene.schema.json`; 03-06 replaces `src/scene/fixtures/reconstruction.json` with recipe output (tests look up actors from `events[]`, not hard-coded ids).

## Self-Check: PASSED
- All 11 created files exist; commits f50565b, df371ad, 4149f65, d830ea4, a6c403e are ancestors of HEAD.

---
*Phase: 03-pitch-standard-data-pipeline*
*Completed: 2026-11-28*
