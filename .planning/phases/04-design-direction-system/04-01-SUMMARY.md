---
phase: 04-design-direction-system
plan: "01"
subsystem: design-tokens
tags: [tokens, tailwind, zod, css-generation, design-system]
requires: []
provides:
  - "Zod 4 token schema and required key lists (scripts/design/tokens-schema.ts)"
  - "Pure token library and byte-stable CSS generator (scripts/design/tokens.ts)"
  - "build-tokens CLI with --check drift mode and listTokenInputs (scripts/design/build-tokens.ts)"
  - "floodlit, programme and notebook token sets with scoped CSS"
  - "Generated system src/styles/tokens.css wired into src/index.css"
affects: [04-02, 04-03, 04-04, 04-05, 04-07, 04-08, 04-09, 04-10, 04-11, 04-13]
actuals:
  tokens: 24000
  tasks: 2
  commits: 2
plan_head_before: c2a3c903a710ae57339098259e51a046dc838e37
plan_head_after: 936c4a74672423b476f811f3b3c77dc0f03d69e6
tech-stack:
  added: []
  patterns:
    - "one generator, two output shapes: system (:root, [data-theme=dark], prefers-color-scheme media, @theme inline/static) and scoped ([data-direction=id])"
    - "@theme inline for themed colours so a direction scope redeclaring --ink reaches the utilities; @theme static for font, text, radius, shadow and easing"
    - "generated CSS excluded from Biome; drift caught by a Vitest CLI test inside npm test"
key-files:
  created:
    - scripts/design/tokens-schema.ts
    - scripts/design/tokens.ts
    - scripts/design/build-tokens.ts
    - scripts/design/build-tokens.test.ts
    - src/routes/dev-directions/tokens/floodlit.tokens.json
    - src/routes/dev-directions/tokens/programme.tokens.json
    - src/routes/dev-directions/tokens/notebook.tokens.json
    - src/routes/dev-directions/tokens/floodlit.css
    - src/routes/dev-directions/tokens/programme.css
    - src/routes/dev-directions/tokens/notebook.css
    - src/styles/tokens.css
  modified:
    - src/index.css
    - src/pitch/pitch.test.tsx
    - biome.json
key-decisions:
  - "duration.stagger-line is emitted as --stagger-line (not --duration-stagger-line) because later plans and the UI-SPEC motion table read that name"
  - "pitch.glyphText emits --pitch-glyph-text plus --pitch-glyph-text--font-weight and --pitch-glyph-text--line-height as plain variables, outside the Tailwind type scale"
  - "Theme blocks reject unexpected keys as well as missing ones, so only schema-listed names can reach CSS"
  - "SYSTEM_INPUT is floodlit.tokens.json until plan 04-11 switches it to the DESIGN.md block"
requirements-completed: [DSGN-03, DSGN-01]
duration: 25min
completed: 2026-11-28
status: complete
---

# Phase 4 Plan 01: Token pipeline Summary

**One Zod-validated generator turns three direction token sets into the system `src/styles/tokens.css` and three `[data-direction]`-scoped CSS files, with a `--check` drift mode, so the app and the pitch now read every colour, font and type value from generated tokens.**

## Performance
- **Duration:** 25 min
- **Tasks:** 2
- **Files modified:** 14 (11 created, 3 modified)

## Accomplishments
- Tracer: the floodlit set parses, generates `src/styles/tokens.css`, and a Tailwind `compile()` test proves `bg-surface-page`, `text-ink`, `text-label`, `font-display`, `rounded-md` and `bg-data-cat-1` read `var(--...)`.
- `src/index.css` imports the generated file, holds no colour value, paints `body` with `--surface-page` and `--ink`, isolates `#root` for Base UI portals and defines the `hov:`, `fv:`, `act:` custom variants.
- All three direction sets (floodlit dark-primary, programme and notebook light-primary) carry every required colour, pitch and data key in both themes with the 04-UI-SPEC values, plus `surface-highlight` and `surface-highlight-ink`.
- The generator refuses a bad hex, an alias cycle, an unknown alias, a missing or extra key, a font family outside letters, digits and spaces, a font src outside `/fonts/`, a scope other than `[data-direction="<kebab-id>"]`, and a Markdown input with zero or two `tokens` blocks.
- `--check` prints `tokens ok: 4 file(s)` on the clean tree and `tokens drift: <path> differs from <input>` with exit 1 after a one-byte edit.
- `npm run check:pitch` (49 ok) still passes: the pitch reads the same Phase 3 variable names from the generated file.

## Task Commits
1. **Task 1: floodlit tracer, schema, generator, system tokens.css, index.css swap** - `9c8e4b4`
2. **Task 2: programme and notebook sets, scoped CSS, validation and drift tests** - `936c4a7`

## Files Created/Modified
- `scripts/design/tokens-schema.ts` - Zod 4 schema and required key lists
- `scripts/design/tokens.ts` - block extraction, validation, alias resolution, CSS generation
- `scripts/design/build-tokens.ts` - CLI, `listTokenInputs`, `loadTokens`, `renderPair`
- `scripts/design/build-tokens.test.ts` - 29 tests (Tailwind compile proof, drift, refusal, CLI)
- `src/routes/dev-directions/tokens/*.tokens.json` and `*.css` - three sets and their scoped CSS
- `src/styles/tokens.css` - generated system tokens
- `src/index.css`, `src/pitch/pitch.test.tsx`, `biome.json` - swap to generated tokens, palette test reads `tokens.css`, Biome exclusions

## Decisions & Deviations
Deviations from Plan: none. The plan executed as written. Notes:
- The three token JSON files were produced by a scratch script from the 04-UI-SPEC tables (not committed) and then formatted by Biome; the JSON files are the source of truth from here.
- `floodlit.css` was created by the Task 1 `build-tokens` run but committed with Task 2, as the plan lists it under Task 2.
- Font files are not present yet (plan 04-04): the browser logs a 404 for `/fonts/...` and falls back, as planned.

## Known Stubs
None.

## Threat Flags
None. Threat T-04-01 and T-04-02 mitigations are implemented and tested (schema-typed values only, scope regex, `--check` test, Biome exclusion).

## Next Phase Readiness
Plan 04-02 can build on `listTokenInputs`, `loadTokens` and the resolved token values; plan 04-03 (palette gate) reads the same resolved themes.

## Self-Check: PASSED
