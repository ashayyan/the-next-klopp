---
phase: 04-design-direction-system
plan: "10"
subsystem: design
tags: [adr, visual-direction, independent-review, review-screens, palette, vitest]
status: complete

requires:
  - phase: 04-design-direction-system
    provides: "three direction routes (/dev/directions/<id>/<screen>), review:screens, check-palette"
provides:
  - "ADR 0010: floodlit picked by an independent reviewer under learner delegation, with gates, scores, evidence and hashed screenshots"
  - "scripts/design/adr-0010.test.ts: recomputes totals and the winner from the ADR tables"
  - "ADR keyword guard for 0010 and a non-blocking learner override todo in STATE.md"
affects: [04-11 DESIGN.md, 04-13 direction collapse, phase 5 lessons]

actuals:
  tokens: 8800
  tasks: 3
  commits: 4
plan_head_before: f6e513df6cbf0c72bfdef89d036bbf59a7b6cd9a
plan_head_after: d2340896b21cee98e361be0a6be1f8807b321f99

tech-stack:
  added: []
  patterns:
    - "ADR arithmetic test: parse markdown tables, recompute weighted totals and the tie-break winner"

key-files:
  created:
    - docs/decisions/0010-visual-direction.md
    - scripts/design/adr-0010.test.ts
  modified:
    - scripts/adr.test.ts
    - .planning/STATE.md

key-decisions:
  - "Visual direction floodlit picked (81.25) over programme (73.75) and notebook (73.75); lead 7.5 points, tie-break not needed"
  - "All three directions pass gates G1-G3 at route commit f6e513d"
  - "Shared pitch-layer defects (badge cluster at 375, ball over disc label, initials vs 'shirt number' legend, team B rule not shown) recorded against the directions, not fixed"
  - "DSGN-01 not marked complete: 04-11 and 04-13 also carry it and the learner's own look is still an open follow-up"

patterns-established:
  - "Fresh-reviewer pick: evidence regenerated at a recorded commit, hashes re-checked against disk, one evidence line per score"

requirements-completed: []

duration: 25min
completed: 2026-11-28
---

# Phase 4 Plan 10: Visual direction pick Summary

**An independent reviewer picked floodlit (81.25 of 100) over programme and notebook (73.75 each) from 36 rendered screens and 24 colour-vision captures. ADR 0010 records the pick and an arithmetic test checks it.**

## Performance

- **Duration:** about 25 min
- **Started:** 2026-11-28T07:29Z (approx.)
- **Completed:** 2026-11-28T07:54Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Regenerated all six direction reviews at route commit `f6e513d`, using port 5184 and the existing dev server. Every report shows 234 pass, 0 fail and 1 warn (the warn is `taste-copy`). `npm run palette -- --json` passed in all six direction-theme pairs.
- Gates: floodlit, programme and notebook all pass G1, G2 and G3.
- Weighted scores (calm, pitch, readability, visual-first, anti-slop, colour-blind, PL):
  - floodlit 3/3/4/4/2/4/3 = 81.25
  - programme 2/3/3/3/3/4/4 = 73.75
  - notebook 3/3/3/2/3/4/3 = 73.75
- ADR 0010 holds the gate table, the score table with totals, one evidence line per score, `Picked: floodlit`, the delegation line, 60 screenshot paths with their SHA-256 (each re-checked against the file), the route commit, Consequences and Alternatives.
- Filled the `reviewer` block in all six local `report.json` files: `status: pass`, `by: "fresh-reviewer 04-10"`, plus notes. These files are git-ignored.
- `adr.test.ts` now requires ADR 0010 and its keywords. STATE.md has the learner's non-blocking override todo with the route commit, and the decision line.

## Task Commits

1. **Task 1: evidence, gates, ADR skeleton and structure test:** `ec6e89a` (feat)
2. **Task 2: independent scoring and the pick:** `6e83fe2` (feat)
3. **Task 3: ADR keyword guard and STATE.md follow-up:** `2422634` (test)
4. **tsc fix for the ADR test:** `d234089` (fix)

## Files Created/Modified

- `docs/decisions/0010-visual-direction.md`: the decision record.
- `scripts/design/adr-0010.test.ts`: parses the gate, score, evidence and screenshot tables, then recomputes the totals and the tie-break winner.
- `scripts/adr.test.ts`: adds the 0010 keyword entry.
- `.planning/STATE.md`: adds the Pending Todo and Decision lines.

## Decisions Made

- I gave each reviewer status the value `pass`, because the UI-SPEC `report.json` contract allows only `pass | fail`. Whether a direction was picked or not is written in `notes`.
- I did not mark DSGN-01 complete. Plans 04-11 and 04-13 also carry it, and the learner has not yet looked at the directions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ADR test failed `tsc --noEmit` under `noUncheckedIndexedAccess`**
- **Found during:** final verification
- **Issue:** destructured markdown table cells and `picked[0]` were typed `string | undefined`.
- **Fix:** default them to empty strings, and stop treating an empty score cell as a 0.
- **Files modified:** scripts/design/adr-0010.test.ts
- **Commit:** d234089

### Other notes

- The plan says the working tree must be clean. The only untracked path was `.gsd/`, which this plan does not touch, and there were no tracked changes.
- The plan says to look at every screenshot. I read all 36 default captures. Of the 24 colour-vision captures I read 15: all 12 in each direction's primary theme, plus 3 in the other theme. I also read the `t=11.48` state captures at 375 in each primary theme. The ADR Context states this coverage.
- The must-have about the team B ring disc cannot be checked from this evidence. Both sample screens show only Manchester City. The ADR records this as a gap for the 04-11 gallery.

**Total deviations:** 1 auto-fixed (Rule 1). **Impact:** none on the pick.

## Issues Encountered

None.

## Defects recorded against the directions (for 04-11, not fixed)

These come from the shared pitch layer and copy, so they appear in all three directions:

- At 375 in the `t=11.48` data state, badges 1, 3 and 6 touch each other and Mangala's disc.
- At `t=0` the ball circle overlaps the "EM" disc label at 768 and 1440.
- The discs show position initials, but the notation says "Filled disc with shirt number".
- The team B ring disc is not shown on either screen.

Floodlit only: the accent is also used on the toggle and the Play button. Anti-slop scored 2 because the dark navy ground with a single mint accent sits near frontend-design clichés 2 and 5.

## User Setup Required

None. The learner can optionally look at the three directions and override the pick. This is a non-blocking todo in STATE.md.

## Next Phase Readiness

- 04-11 can write DESIGN.md on the floodlit token set, using the defect list above as inputs.
- 04-13 removes programme, notebook and the direction token files after DESIGN.md is locked.

## Self-Check: PASSED

- FOUND: docs/decisions/0010-visual-direction.md
- FOUND: scripts/design/adr-0010.test.ts
- FOUND commits: ec6e89a, 6e83fe2, 2422634, d234089
- `npx vitest run scripts/design scripts/adr.test.ts`: 121 passed. `npx tsc --noEmit`: 0 errors. `npx biome ci .`: clean. `npm run guard`: ok.
