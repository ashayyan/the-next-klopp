---
phase: 04-design-direction-system
plan: "13"
subsystem: design
tags: [direction-collapse, design-tokens, fonts, dev-routes, vitest, playwright]
status: complete

requires:
  - phase: 04-design-direction-system
    provides: "locked DESIGN.md with the floodlit tokens block (04-11, 04-12); ADR 0010 pick and route commit (04-10); font copy tool with --prune and --check (04-04)"
provides:
  - "One token source: docs/DESIGN.md generates src/styles/tokens.css, and no direction token file or scoped CSS is left"
  - "/dev/directions/floodlit/{tactics,data} render from the system tokens; the index lists them in both themes and names ADR 0010 with its route commit"
  - "public/fonts holds only Mona Sans and Geist Mono; LICENSES.md lists only those two"
affects: [04-14 and 04-15 gallery, 04-16 baselines, 04-17 phase gate review, Phase 7 golden lesson]

actuals:
  tokens: 40000
  tasks: 2
  commits: 2
plan_head_before: 146486e8d2b4a88692f2498e82cf4359e92fa0a3
plan_head_after: 98a20285f4cf191b18b614c0c3a4b9be1371712e

tech-stack:
  added: []
  patterns:
    - "Dev screen reads its primary theme from the DESIGN.md tokens block through a ?raw import and extractTokensBlock; the module lives in the dev-only chunk"

key-files:
  created: []
  modified:
    - src/routes/dev-directions.tsx
    - src/routes/dev-directions/DirectionScope.tsx
    - src/routes/dev-directions/TacticsScreen.tsx
    - src/routes/dev-directions/DataScreen.tsx
    - src/routes/dev-directions/derived.ts
    - src/routes/dev-directions/derived.test.ts
    - src/routes/dev-directions/shared.ts
    - scripts/design/build-tokens.test.ts
    - scripts/design/check-palette.test.ts
    - scripts/design/copy-fonts.test.ts
    - tests/functional/directions.spec.ts
    - public/fonts/LICENSES.md
    - biome.json

key-decisions:
  - "The picked direction's two screens stay as the concept and data-lab reference screens (DESIGN.md section 6 cites them); only the three token sources, the two losing layouts and the five losing font families are removed"
  - "The generator code (generateScopedCss, --scope, listTokenInputs direction discovery) stays: it is unit tested with inline fixtures and costs nothing, and a later direction or theme experiment can use it"
  - "The Fontsource devDependencies of the losing families stay pinned in package.json, as the plan's threat register states"

patterns-established:
  - "A deleted token folder is a valid state: listTokenInputs returns no direction sets and build-tokens --check reports one output"

requirements-completed: [DSGN-01, DSGN-03]

duration: 20min
completed: 2026-11-28
---

# Phase 4 Plan 13: Direction collapse Summary

**The tree now holds one design system. The three direction token files and scoped CSS are deleted, the two losing layouts and five losing font families are gone, and the floodlit tactics and data screens render from the DESIGN.md tokens and pass the review.**

## Accomplishments

- Deleted `src/routes/dev-directions/tokens/` (3 JSON files, 3 CSS files) and the programme-only `directions.css`. `node scripts/design/build-tokens.ts --check` prints `tokens ok: 1 file(s)`.
- `DirectionScope` imports `docs/DESIGN.md?raw` and reads `meta.primaryTheme` through `extractTokensBlock`. It keeps `data-direction="floodlit"`, `data-theme`, the theme resolution and `data-ready`.
- `/dev/directions` lists the floodlit tactics and data screens in light and dark, with a sentence naming ADR 0010 and the route commit. An unknown id shows `No direction called “{id}”. Pick floodlit.` with one link.
- `TacticsScreen` and `DataScreen` lost `ProgrammeLayout`, `NotebookLayout`, the score line and the margin notes. The notes values left `derived.ts` and its test with them.
- `copy-fonts --prune` removed Archivo, Atkinson Hyperlegible Mono and Next, Martian Mono and Newsreader. `public/fonts` has 2 family folders, equal to the 2 families in the DESIGN.md block.
- `directions.spec.ts` loops over floodlit only (13 tests pass) and asserts the new unknown-direction copy and the index.

## Task Commits

1. **Task 1 (tracer): delete direction token sets, render from system tokens:** `6401102` (refactor)
2. **Task 2: remove losing compositions, picked-only functional tests:** `98a2028` (refactor)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Font prune moved into Task 1**
- **Found during:** Task 1 (`npx vitest run` is that task's gate)
- **Issue:** `copy-fonts.test.ts` read the deleted token folder and then asserted seven families, so the full suite could not pass at the end of Task 1.
- **Fix:** Ran `copy-fonts --prune` and updated `copy-fonts.test.ts` in the Task 1 commit. It now asserts the two system families, one folder per family, and two licence sections. Task 2 kept the composition removal and the functional spec.
- **Files modified:** `scripts/design/copy-fonts.test.ts`, `public/fonts/**`
- **Commit:** `6401102`

**2. [Rule 1 - Bug] check-palette CLI tests assumed three sets**
- **Found during:** Task 1
- **Issue:** `--json` expected 6 entries and `--markdown` rows for programme and notebook; with the files gone only floodlit remains.
- **Fix:** Expect 2 entries and the two floodlit rows. The programme and notebook recorded-evidence fixtures stay inline and still run.
- **Commit:** `6401102`

**3. [Rule 2 - cleanup] Dead code removed with the layouts**
- `derived.ts` `notes`/`GoalNote` and its test, the `numbered` rail argument in both screens, the `!!src/routes/dev-directions/tokens/*.css` biome glob, and the Archivo/Newsreader wording in `shared.ts` went with the removed layouts.
- **Commit:** `98a2028`

The design-md test "is the picked direction's set, verbatim, while the direction file exists" returns early once the file is gone, as intended. The lock is now the generated-CSS byte test plus the picked-id test.

## Check results

- `npm test`: 1134 passed, 6 skipped. `npx tsc --noEmit`, `npx biome ci .`, `npm run guard`: clean.
- `node scripts/design/build-tokens.ts --check`: `tokens ok: 1 file(s)`. `node scripts/design/copy-fonts.ts --check`: `fonts ok`.
- `npm run build`, `guard:bundle` (11 files), `smoke` (no dev route code in dist): ok.
- `REVIEW_PORT=5184 npx playwright test --project=functional tests/functional/directions.spec.ts`: 13 passed.
- Review (port 5184): floodlit tactics `--states state=with` and data `--states t=11.48`: `REVIEW: PASS — 0 fail, 1 warn` (the warn is the existing `taste-copy` WARN). `token-colours` ran against the system token set.

## Known Stubs

None.

## Threat Flags

None. T-04-24: `copy-fonts --check` and `guard:bundle` pass on the pruned tree.

## Open for later plans

- Pitch-layer gaps in `deferred-items.md` are unchanged and still unowned.
- The Fontsource devDependencies for the five removed families are still in `package.json`.

## Self-Check: PASSED

- `src/routes/dev-directions/tokens` absent; `public/fonts` holds `geist-mono` and `mona-sans` only.
- Commits `6401102` and `98a2028` are ancestors of HEAD.
