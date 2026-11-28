# Phase 4 deferred items

Out-of-scope findings logged during execution. Not fixed by the plan that found them.

## From plan 04-05 (review:screens)

- `/dev/pitch?scene=glyph-sheet` (Phase 3 dev page) reports `tap-size` FAIL at 375 and 1440 px in
  light theme: the scene `select` elements and the converter probe `select` and `input` fields are
  about 20 px tall and 256 to 369 px wide. Phase 3 only checked buttons against 44 px. The page is a
  dev tool, not a shipped lesson screen, so it is left alone; the 04-12 gallery and the direction
  screens must meet the rule, and the pick plan should confirm that `/dev/pitch` is replaced or
  fixed by then.

## From plan 04-12 (DESIGN.md sections 1 and 4 to 8)

These pitch-layer defects come from the ADR 0010 review. DESIGN.md section 4 records them as known
gaps. No Phase 4 plan fixes them: 04-17 asserts badge against disc only.

- `placeBadge` (`src/pitch/glyphs/placement.ts`) checks player discs and the pitch edge, but not
  badges it has already placed. In the Wyscout scene at 375 and `t=11.48`, badges 1, 3 and 6 touch
  each other. Fix: pass the boxes of earlier badges to the placer as obstacles.
- At `t=0` on the data screen, the ball sits over the right edge of the "EM" disc label (768 and
  1440).
- The direction screens label discs with position codes (GK, CB, ST), but the legend says "shirt
  number". Section 4 now requires the legend description to say which one is shown.
