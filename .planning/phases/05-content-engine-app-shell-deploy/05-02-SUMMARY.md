---
phase: 05-content-engine-app-shell-deploy
plan: "02"
subsystem: content
tags: [json-schema, zod, contracts, lesson-spec, verification, whats-new, virtual-module, curriculum, adr]
status: complete

requires:
  - phase: 05-content-engine-app-shell-deploy
    provides: "05-01 virtual:tnk-lessons (lessons + loaders), discoverLessons, selectLessons, fixture lesson"
provides:
  - frozen lesson spec v1 (schemas/lesson.schema.json + lessonSchema), enforced at build
  - verification record v1 and What's new v1 schemas with Zod mirrors, all in contractSchemas
  - content/whats-new.json seed entry
  - virtual:tnk-lessons exports curriculum, sources, conceptSummaries, order, whatsNew, buildDate
  - src/content/tracks.ts shared track list (re-exported by scripts/research/lib/domains.ts)
  - typed accessors trackById, lessonsInChapter, sourceById
  - ADR 0011 lessons as data
affects: [05-03, 05-05, 05-06, 05-09, 05-10, 05-11, 05-13, 05-17]

actuals:
  tokens: 23900
  tasks: 3
  commits: 5
plan_head_before: d3bdd070d11996b9beb65f960fe3902e97e4ed8f
plan_head_after: 2f253eda8f15fc7cd9350ff30c710090b9aad03c

tech-stack:
  added: []
  patterns:
    - "Content contracts follow the Scene pattern: JSON Schema 2020-12 source of truth, hand-written Zod mirror, dual-validator fixtures with expect_path"
    - "Build-time data slice: the plugin reads research files once per build and emits only what included lessons need"
    - "Ambient module types reference real types through import(\"./schemas/lesson.ts\") type queries"

key-files:
  created:
    - schemas/lesson.schema.json
    - schemas/verification.schema.json
    - schemas/whats-new.schema.json
    - schemas/fixtures/lesson.fixtures.json
    - schemas/fixtures/verification.fixtures.json
    - schemas/fixtures/whats-new.fixtures.json
    - src/schemas/lesson.ts
    - src/content/tracks.ts
    - src/content/lessons.test.ts
    - scripts/lib/content/curriculum.ts
    - scripts/lib/content/curriculum.test.ts
    - content/whats-new.json
    - docs/decisions/0011-lessons-as-data.md
  modified:
    - src/schemas/contracts.ts
    - scripts/lib/content/vite-plugin.ts
    - scripts/lib/content/vite-plugin.test.ts
    - scripts/research/lib/domains.ts
    - src/content/lessons.ts
    - src/mdx.d.ts
    - src/routes/learn/LessonPage.tsx
    - content/_fixtures/fx-a-goal-in-ten-actions/lesson.json
    - scripts/adr.test.ts

key-decisions:
  - "steps[].dataRefs is required (empty array when none); the fixture lesson gained dataRefs: [] on its nine steps"
  - "concepts[] needs at least one id (concept summaries and study order key on the first concept)"
  - "Verification claimId pattern is <stepId>/<component>-<n> with optional .side-<n> (05-RESEARCH Pattern 7)"
  - "sources slice is keyed by the id as cited; an alias key carries its target entry; an unknown id is left out for the validator's citation rule to report"
  - "A track with no concepts still gets its own part with conceptCount 0, so every track has a chapter to show as coming next"
  - "buildDate is the local calendar date of the build (learner is UTC+3)"

patterns-established:
  - "Every content file the build reads is schema-parsed in the plugin; a failure throws `<root-relative path>: <json-pointer>: <message>`"
  - "App code imports curriculum facts only from src/content/lessons.ts, never from research/"

requirements-completed: []

coverage:
  - id: D1
    description: "Lesson spec v1: ajv and Zod agree on 3 valid and 10 invalid fixtures with expect_path"
    requirement: CONT-01
    verification:
      - kind: unit
        ref: "schemas/schemas.test.ts"
        status: pass
  - id: D2
    description: "A lesson.json that breaks the schema stops vite build with the file path and the first issue"
    requirement: CONT-01
    verification:
      - kind: unit
        ref: "scripts/lib/content/vite-plugin.test.ts#stops on a lesson.json that breaks spec v1"
        status: pass
      - kind: manual
        ref: "temporary content/_fixtures/zz-tmp-broken with chapter part-z: vite build exit 1, message names the file and /chapter"
        status: pass
  - id: D3
    description: "Verification and What's new schemas dual-validated; contractSchemas keys lesson, verification, whats-new"
    requirement: QA-01
    verification:
      - kind: unit
        ref: "schemas/schemas.test.ts"
        status: pass
  - id: D4
    description: "virtual:tnk-lessons exports curriculum (29 tracks), cited sources slice, conceptSummaries, order, whatsNew, buildDate with no absolute path"
    requirement: PLAT-02
    verification:
      - kind: unit
        ref: "scripts/lib/content/curriculum.test.ts"
        status: pass
      - kind: unit
        ref: "src/content/lessons.test.ts"
        status: pass
  - id: D5
    description: "Every concept-map track id has a TRACKS title; research tests pass unchanged after the move"
    requirement: PLAT-02
    verification:
      - kind: unit
        ref: "scripts/lib/content/curriculum.test.ts#TRACKS"
        status: pass
      - kind: unit
        ref: "scripts/research"
        status: pass
  - id: D6
    description: "ADR 0011 present with every section and the MDX, lesson.json, virtual:tnk-lessons keywords"
    verification:
      - kind: unit
        ref: "scripts/adr.test.ts"
        status: pass

duration: 12min
completed: 2026-11-28
---

# Phase 5 Plan 02: Content contracts and curriculum data Summary

**Lesson spec v1, the verification record and What's new are frozen as JSON Schema with Zod mirrors that agree on every fixture, a malformed lesson stops the build, and `virtual:tnk-lessons` now gives the app tracks, cited sources, concept summaries, study order and What's new without bundling the research files.**

## Performance

- **Duration:** about 12 min (2026-11-28T15:51Z to 16:04Z)
- **Tasks:** 3 (tracer, TDD, TDD)
- **Files:** 22 changed

## Accomplishments

- `schemas/lesson.schema.json`: the CONTEXT spec fields, strict everywhere, closed enums for the eight stages, seven templates and four statuses, `chapter` `^part-[a-g]$`, pinned data refs, choice quiz items with 2 to 4 options, interaction `{ id, props: object }`. `lessonSchema` mirrors it.
- `schemas/verification.schema.json` and `schemas/whats-new.schema.json` with `verificationSchema` and `whatsNewSchema`; `contractSchemas` keys `lesson`, `verification`, `"whats-new"`.
- The plugin parses every `lesson.json` with `lessonSchema.safeParse`. A failure throws `/content/.../lesson.json: /chapter: Invalid string: must match pattern /^part-[a-g]$/` and `vite build` exits 1 (checked with a temporary broken fixture, then removed).
- `LessonEntry` is now `LessonSpec & { fixture; dir }` from the Zod type. The provisional hand-written type from 05-01 is gone.
- `content/whats-new.json` seed entry, ADR 0011, and `0011` added to the ADR coverage list.
- `src/content/tracks.ts` holds the 29 tracks. `scripts/research/lib/domains.ts` re-exports the same objects, and research tests pass unchanged (238 passed, 11 skipped).
- `scripts/lib/content/curriculum.ts` has these pure builders: `buildCurriculum`, `buildSourcesSlice`, `buildConceptSummaries`, `studyOrder` and `unknownTracks`. The plugin reads the four data files once per build, watches them in dev and emits six new exports. `src/content/lessons.ts` adds `trackById`, `lessonsInChapter` and `sourceById`.

## Task Commits

1. **Task 1 (tracer): lesson spec v1, contractSchemas, build enforcement** - `d33f91c` (feat)
2. **Task 2 RED: verification and What's new schemas, fixtures, ADR 0011 requirement** - `c790471` (test)
3. **Task 2 GREEN: Zod mirrors, seed What's new, ADR 0011** - `86409b6` (feat)
4. **Task 3 RED: curriculum, slice, summaries, order tests** - `305354b` (test)
5. **Task 3 GREEN: curriculum builders, TRACKS move, module exports, accessors** - `2f253ed` (feat)

Tracer gate: after Task 1, `<verify>` was re-run end to end (vitest schemas and learn, tsc, vite build) and passed before Task 2.

## Verification

- `npx vitest run schemas scripts/adr.test.ts scripts/lib/content scripts/research src/routes/learn src/content`: 20 files, 390 passed, 11 skipped
- Full suite: 60 files, 1357 passed, 11 skipped
- `npx tsc --noEmit` ok, `npx biome ci .` exit 0, `npx vite build` ok, `node scripts/content/build-fixtures.ts` ok, `node scripts/check-bundle.ts` "bundle ok: 12 files"
- No registry entry id found in `dist/assets/*.js` (the study build includes no lesson, so its sources slice is empty)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Step helpers typed against the new strict step type**
- **Found during:** Task 1
- **Issue:** `LessonStepSpec` is now the Zod type, which needs `stage` and `dataRefs`. The step-helper test passes `{ id, stage: string }` and failed typecheck.
- **Fix:** `resolveStepId` and `nextStepId` take `readonly Pick<LessonStepSpec, "id">[]`, because they only read `id`.
- **Files:** src/routes/learn/LessonPage.tsx. **Commit:** d33f91c

**2. [Rule 1 - Bug] Two plugin tests silently missing from the Task 1 commit**
- **Found during:** Task 3
- **Issue:** A scripted edit meant to add "stops on a lesson.json that breaks spec v1" and "reports an unknown top-level key" to `vite-plugin.test.ts` did not match its anchor, so Task 1 shipped without them. The build check itself was in place and checked by hand.
- **Fix:** Both tests were added in Task 3, with `readDataFiles`, `isDataFile`, `localDate` and real-repo `buildModuleData` tests.
- **Files:** scripts/lib/content/vite-plugin.test.ts. **Commit:** 2f253ed

**3. [Rule 1 - Bug] Absolute-path assertion matched `https://`**
- **Found during:** Task 3 GREEN
- **Issue:** `/[A-Za-z]:[\\/]/` matched the `s:/` in a source URL.
- **Fix:** Changed to `/(?<![A-Za-z])[A-Za-z]:[\\/]/`, and the test still asserts the repo path is absent.
- **Files:** scripts/lib/content/curriculum.test.ts. **Commit:** 2f253ed

**4. [Rule 2 - Correctness] Extra accessor test**
- Added `src/content/lessons.test.ts`. It checks the accessors over the real virtual module in test mode, including `sourceById("constructor")` returning undefined (`Object.hasOwn`). **Commit:** 2f253ed

## Known Stubs

None. The study build ships no lesson yet, so `sources`, `conceptSummaries` and `order` are empty there by design. The fixtures build fills them.

## Threat Flags

None beyond the plan's register. T-05-16: strict schemas, ajv and Zod parity, build stops on an invalid lesson or What's new file. T-05-17: the slice carries only cited ids and the seven display fields plus `effective_date`, and the test asserts registry notes do not appear in the module text. T-05-SC: no package installed.

## Next Phase Readiness

05-03 can build validator rules on `lessonSchema` and `verificationSchema`. 05-05, 05-10 and 05-17 can read `curriculum`, `order`, `sources` and `whatsNew` through `src/content/lessons.ts`.

## Self-Check: PASSED
