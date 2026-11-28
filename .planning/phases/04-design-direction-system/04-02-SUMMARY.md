---
phase: 04-design-direction-system
plan: "02"
subsystem: pitch-legibility
tags: [pitch, svg, placement, glyphs, accessibility]
requires: []
provides:
  - "placeBadge: sequence badge placed disc radius + 8 px from the event start, clear of every disc"
  - "placeChip and chipSizePx: note and point-label chips placed in screen space, mirrored then clamped inside the SVG"
  - "22 px minimum player disc (clamp(22 px, 2.0 m, 28 px))"
affects: [04-07, 04-08, 04-12, 04-17]
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
plan_head_before: 4fb26df2e03ac0944ea3e136b0b4fcb668d6da26
plan_head_after: c38096216202db3608c688cbae30a883fbe27bf7
tech-stack:
  added: []
  patterns:
    - "placement in screen pixels after the orientation transform, result converted back to canonical metres"
    - "tests render the real SceneLayer to markup and measure circles and chip rects through the view matrix"
key-files:
  created:
    - src/pitch/glyphs/placement.ts
    - src/pitch/glyphs/placement.test.ts
  modified:
    - src/pitch/glyphs/SceneLayer.tsx
    - src/pitch/glyphs/MarkGlyphs.tsx
    - src/pitch/glyphs/glyphSize.ts
    - src/pitch/glyphs/glyphs.test.tsx
key-decisions:
  - "Badge candidates are retried at x1.42 and x2 of the base distance: a sloping travel direction puts the badge's square box on the corner of the start disc's box at exactly disc radius + 8 px, so only an axis-aligned side clears the box test at the base distance"
  - "placeChip takes an optional screen offset so label chips that sit beside their point (PointGlyph) mirror to the other side instead of centring"
  - "Chip size constants (CHAR_PX, CHIP_PAD_PX) moved from MarkGlyphs to placement.ts so the component and the placement share one source"
requirements-completed: [DSGN-01]
duration: 15min
completed: 2026-11-28
status: complete
---

# Phase 4 Plan 02: Pitch legibility fixes Summary

**Sequence badges now sit beside the passer instead of on the disc number, note and label chips cannot cross the SVG edge in either orientation, and player discs are at least 22 px, all proven by rendering the published Wyscout scene at 343 px vertical and 840 px horizontal.**

## Performance
- **Duration:** 15 min (4 min of commit-to-commit work after reading the pitch code)
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- `placeBadge` tries left of travel, right of travel, behind and ahead of the start; no badge box meets any disc box and every badge lies inside the SVG at 375 (vertical) and 1440 (horizontal) at t = 0 and at every event start.
- `placeChip` keeps a chip where the old code drew it unless it would cross an edge, then mirrors it to the other side of the anchor and clamps; tested for horizontal and vertical views and for rendered chips (glyph sheet plus edge-case notes and a point label).
- Player disc minimum rises from 20 to 22 px; the ball-ownership test now expects the 22 px offset.
- An SSR test pins the visible "Play sequence" label (`hidden md:inline`) next to the aria-label, since no earlier test asserted it.
- `npm run check:pitch` (real Edge, port 5183): 49 ok, 0 failed.

## Task Commits
1. **Task 1: badge placement (tracer)** - `bde07c5`
2. **Task 2: chip placement and 22 px discs** - `c380962`

## Files Created/Modified
- `src/pitch/glyphs/placement.ts` - `boxesIntersect`, `chipSizePx`, `placeBadge`, `placeChip`
- `src/pitch/glyphs/placement.test.ts` - badge, chip and disc-size tests (23 cases)
- `src/pitch/glyphs/SceneLayer.tsx` - badges drawn at placed positions, memoised per sampled t
- `src/pitch/glyphs/MarkGlyphs.tsx` - `NoteGlyph` and `PointGlyph` labels placed with `placeChip`
- `src/pitch/glyphs/glyphSize.ts` - 22 px disc minimum
- `src/pitch/glyphs/glyphs.test.tsx` - 22 px ball offset, Play label test

## Decisions & Deviations

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's four-candidate rule cannot satisfy its own box assertion for sloping events**
- **Found during:** Task 1
- **Issue:** at distance disc radius + 8 px, a badge on any side that is not axis-aligned on screen has a box that overlaps the start disc's box (only the circles are tangent), so "first clear candidate, else left of travel" would fail the "no badge box meets a disc box" acceptance on diagonal passes.
- **Fix:** after the four base candidates, the same four sides are tried at x1.42 and x2 of the base distance; the left-of-travel base position remains the last resort, as the plan says.
- **Files modified:** `src/pitch/glyphs/placement.ts`
- **Commit:** `bde07c5`

**Total deviations:** 1 auto-fixed (1 bug in the planned rule). **Impact:** badges can sit up to 2x the base distance (about 38 px) from the start point on busy frames; still beside the passer.

## Known Stubs
None.

## Threat Flags
None. T-04-03 holds: four sides times three distances per badge, scenes are Zod-bounded, placement memoised per sampled t.

## Next Phase Readiness
The direction screens (04-07, 04-08) can render the Wyscout and authored scenes with legible badges and chips; DESIGN.md section 4 (04-12) can cite `placement.ts`.

## Self-Check: PASSED
