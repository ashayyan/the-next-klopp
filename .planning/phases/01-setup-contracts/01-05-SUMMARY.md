---
phase: 01-setup-contracts
plan: 05
subsystem: contracts
tags: [json-schema, ajv, zod, fixtures, contracts]

requires:
  - phase: 01-03
    provides: Vitest and Biome config, tsconfig including schemas/
provides:
  - JSON Schema 2020-12 contracts for source, concept map, competency and role plus shared common defs
  - hand-written Zod 4 mirrors and inferred types in src/schemas/contracts.ts, registry contractSchemas
  - fixtures (valid and invalid) for all four contracts
  - dual-validator agreement test with schema-to-mirror and fixture-presence checks
affects: [Phase 2 research agents, Phase 5 content validator, 01-08 docs]

requirements-completed: [SETUP-07]

actuals:
  tokens: 22000
  tasks: 3
  commits: 3
plan_head_before: 12193d32025f64b3f0a4c1649c3b0d6284e28c72
plan_head_after: 3ed8e3bfd90e10a958c5842403f22a73cb962b48

tech-stack:
  added: []
  patterns:
    - "JSON Schema is the source of truth; Zod mirrors are hand-written and proven equal by fixtures"
    - "URL and UTC date-time rules are regex patterns shared by both validators, never format uri or the built-in Zod URL check"
    - "Cross-document integrity is deliberately left to Phase 2/5 validators and recorded in each schema's $comment"

key-files:
  created:
    - schemas/common.schema.json
    - schemas/source.schema.json
    - schemas/concept.schema.json
    - schemas/competency.schema.json
    - schemas/role.schema.json
    - schemas/fixtures/source.fixtures.json
    - schemas/fixtures/concept.fixtures.json
    - schemas/fixtures/competency.fixtures.json
    - schemas/fixtures/role.fixtures.json
    - src/schemas/contracts.ts
    - schemas/schemas.test.ts
  modified: []

key-decisions:
  - "Competency level tuple uses four small $defs (level1..level4) referenced from prefixItems, with items false and minItems 4, so ajv strictTuples passes"
  - "Fixtures were generated once from a throwaway Node script (not committed) and are committed as plain JSON"

status: complete
---

# Phase 1 Plan 05: Shared Contract Schemas Summary

Four costly-to-change contracts (source, concept map, competency, role) now exist as strict JSON Schema 2020-12 with hand-written Zod 4 mirrors, and one test proves ajv and Zod give the same verdict on every fixture.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | common defs, source schema, Zod mirror, 12 fixtures, dual-validator test | 5043ddc |
| 2 | concept-map schema, mirror, 1 valid and 6 invalid fixtures | 31a66c8 |
| 3 | competency and role schemas, mirrors, fixtures | 3ed8e3b |

## Verification

- `npx vitest run`: 5 files, 98 tests pass; `npm run validate:schemas`: 39 tests pass.
- `npx tsc --noEmit` and `npx biome ci .` clean.
- Fixture counts: source 2 valid / 10 invalid, concept 1 / 6, competency 1 / 4, role 1 / 4.
- The FBref advanced-stats case (status removed, no removed_reason) is rejected by both validators, as are a URL with a space, a date-time with a +03:00 offset, a 301-character paraphrase, quality 6, an impossible date (2026-02-30) and a 63-character sha256.
- Zod `z.iso.datetime()` and `z.iso.date()` were probed beforehand: they match the UTC-only pattern and ajv's date format on offsets, missing seconds, lowercase t/z and impossible dates.

## Deviations from Plan

None - plan executed exactly as written.

## Notes

- `maxLength` in ajv counts code points while Zod's `.max()` counts UTF-16 units. They differ only for astral characters (emoji); not covered by a fixture, not a concern for the current data.
- Tests for Task 1 and the code that satisfies them were committed together, not as separate RED and GREEN commits. The plan marks these tasks `tdd` but states no commit split.

## Known Stubs

None.

## Self-Check: PASSED

All schema, fixture, mirror and test files exist; commits 5043ddc, 31a66c8, 3ed8e3b are ancestors of HEAD.
