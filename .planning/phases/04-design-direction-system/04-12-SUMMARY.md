---
phase: 04-design-direction-system
plan: "12"
subsystem: design
tags: [design-md, anti-slop, pitch-standard, component-catalogue, lesson-templates, dataviz, quality-bar, vitest]
status: complete

requires:
  - phase: 04-design-direction-system
    provides: "DESIGN.md skeleton with sections 2, 3 and the tokens block (04-11); CHECKS and TASTE_IGNORED (04-05, 04-06); glyph registry (Phase 3)"
provides:
  - "docs/DESIGN.md complete: sections 1 to 8, every section at least 80 words"
  - "Section 5 catalogue: 37 gallery primitives with links, and 50 brief 9.5 components with the six fields and the building phase"
  - "Section 8 quality bar locked to the review CLI registry (22 checks with severity, 12 ignored taste ids with reason)"
  - "design-md.test.ts coverage locks for sections 1, 4, 5, 6, 7 and 8"
affects: [04-13 direction collapse and DESIGN.md lock, 04-14..04-17 gallery and visual baselines, phases 5-8 lessons and components, every review:screens run]

actuals:
  tokens: 22500
  tasks: 3
  commits: 3
plan_head_before: c2caf617bd013f5dbd1a5fa0489adad542a8924e
plan_head_after: a7c9453da405e1005d381461b93674b4e918ae22

tech-stack:
  added: []
  patterns:
    - "Documentation locked to a code registry: a test reads CHECKS, TASTE_IGNORED and GLYPH_IDS and requires each id in the matching DESIGN.md table"
    - "Specification catalogue with fixed field labels that a test parses per heading"

key-files:
  created: []
  modified:
    - docs/DESIGN.md
    - scripts/design/design-md.test.ts
    - .planning/phases/04-design-direction-system/deferred-items.md

key-decisions:
  - "The catalogue names come from the brief's bold text, exactly, including 'Player Price Lab (\"set the number\")'. They are hardcoded in the test because the brief is git-ignored and absent in CI."
  - "Built-in phases taken from the roadmap: Tactics Board and Watch Gym Player in Phase 8, Quiz/Flashcards/SRS in Phase 6, Role Map overview in Phase 7; everything else 'later track'"
  - "Component data rules follow the licence research: only CC BY data (Wyscout 2017/18 events, DFL/Sportec) is deployable, StatsBomb/Metrica/SkillCorner/Last Row stay local, wages and valuations are typed by hand; drawings never sit on a YouTube embed (API policy)"
  - "Case study template: scrolling alone never reveals or animates; each step changes the visual through a button or Next, to keep the 'no scroll-triggered reveals' ban"
  - "Review template: no step rail, a capped queue, no backlog count, a welcome-back card after a break"
  - "DSGN-02 marked complete: this plan finishes the last DESIGN.md sections, and no later plan carries DSGN-02. QA-02 stays open for 04-17."

patterns-established:
  - "Pitch-layer defects found by a review are written into DESIGN.md as 'Known gaps' and logged in deferred-items.md until a plan fixes them"

requirements-completed: [DSGN-02]

duration: 10min
completed: 2026-11-28
---

# Phase 4 Plan 12: DESIGN.md sections 1 and 4 to 8 Summary

**`docs/DESIGN.md` is now complete. It holds the anti-slop rules, the Pitch Standard, a catalogue of 50 components with six fields each, seven lesson templates, the data-viz standards and the quality bar. Tests tie these sections to the brief's component list and the review command's registry.**

## Performance

- **Duration:** about 10 min
- **Started:** 2026-11-28T08:11Z
- **Completed:** 2026-11-28T08:21Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Section 1: a Do list and a Don't table. Each banned pattern names the `review:screens` check that catches it: every `banned-*` id, plus `card-grid`, `arrow-suffix`, `no-hex-in-source` and `token-colours`. Patterns no machine can catch go to the independent reviewer's rubric criteria. The section ends with the voice rules.
- Section 4: the Pitch Standard. It covers canonical metres, the provider converters, one view matrix, the three layers, the Scene/Frame format and a flat field. It has the 17-glyph registry table in registry order, the sizing table (disc `clamp(22px, 2.0 m, 28px)`), the legend rules, and the badge and chip placement rules. It links ADR 0009 and lists the known gaps from ADR 0010.
- Section 5: 37 gallery primitives, each with its `/dev/gallery/<id>` link. Then the shared rules, and one `####` entry for each of the 50 brief 9.5 components. Each entry has Purpose, Inputs and controls, Learning goal, States, Data needed, Accessibility fallback, and the phase that builds it.
- Section 6: seven templates, each with the steps it hosts and its region order at 375, 768 and 1440. The concept and data-lab templates cite `/dev/directions/floodlit/tactics` and `/data`. Regulation has an "Effective from … · As of …" line. Review has a capped queue with no backlog count. Case study has no scroll-triggered motion.
- Section 7: form choice, colour by job, one axis, zero baselines, direct labels on at most two marks, intervals and "n =", the hover layer and the table view. The worked example is the data screen's chart.
- Section 8: the command and its flags, exit codes 0/1/2, and a table of all 22 checks with severity and pass condition. Also the taste-skill mapping (FAIL `overflow-x` and `spill`, 12 ignored ids with the reason, everything else WARN, primary theme only, local only), the reviewer step, accessibility now and in Phase 5, the performance budget, the CI-only Linux baselines, and seven environment variables.

## Task Commits

1. **Task 1 (tracer): section 5 catalogue with its coverage test:** `a875890` (docs)
2. **Task 2: sections 1, 4 and 7:** `8ea73a4` (docs)
3. **Task 3: sections 6 and 8, locked to the review registry:** `a7c9453` (docs)

## Files Created/Modified

- `docs/DESIGN.md`: sections 1 and 4 to 8 written (1690 lines in total).
- `scripts/design/design-md.test.ts`:
  - `CATALOGUE` (50 names), the six fields per entry, and `GALLERY_IDS` (37) in Primitives.
  - `BANNED_IDS` from `CHECKS` in section 1, and `GLYPH_IDS` rows in section 4.
  - The section 7 topics, the 7 templates at three widths, and the reference routes.
  - `CHECKS` ids with severities and `TASTE_IGNORED` patterns with the reason in section 8, plus the exit codes, budget, baselines and environment variables.
  - At least 80 words and no lone stub under every heading.
- `.planning/phases/04-design-direction-system/deferred-items.md`: the three pitch-layer defects from ADR 0010 that no Phase 4 plan fixes.

## Decisions Made

See `key-decisions` above.

## Deviations from Plan

None. The plan was executed as written. The only extra was the deferred-items entry, a planning note that changes no code.

## Issues Encountered

- The first run of `biome ci` after the Task 3 test edit reported a format error in `design-md.test.ts`. `biome check --write` fixed it before the commit.

## Threat Flags

None. T-04-23: the brief's design content is paraphrased and cited by section number. The only learner detail is the one ADR 0010 and CLAUDE.md already state (a visual, hands-on learner with ADHD). A grep for profile details found none, and `npm run guard` passed.

## Open for later plans

- 04-13: lock DESIGN.md and remove the programme and notebook directions. The floodlit tactics and data routes must stay, because section 6 cites them.
- Pitch-layer gaps (deferred-items.md): badges can touch one another, the ball can sit over a disc label at `t=0`, and some screens show position codes where the legend says shirt number.
- QA-02 completes with 04-17.

## User Setup Required

None.

## Self-Check: PASSED

- FOUND: docs/DESIGN.md (8 sections, 50 `#### ` catalogue entries, 50 `**Accessibility fallback**`)
- FOUND commits: a875890, 8ea73a4, a7c9453
- `npx vitest run scripts/design`: 171 passed. `npm test`: 1140 passed, 6 skipped. `node scripts/design/build-tokens.ts --check`: ok. `npm run palette`: 6 PASS. `npx tsc --noEmit`: clean. `npx biome ci .`: clean. `npm run guard`: ok (492 files).
- Acceptance: `#### Tactics Board` = 1; `**Accessibility fallback**` = 50; `banned-transition-all` >= 1; `sequence-badge` >= 1; "landing-page rule, not an app-screen rule" = 12; `### Case study (scrollytelling)` = 1.
