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

## From plan 04-14 (component gallery)

- The 22-player board scene (`board.json`, `/dev/pitch?scene=board`) fails the `tap-size` check at 375 px:
  the invisible 44 px drag targets of neighbouring players overlap (0 px apart, 8 px needed) because
  the pitch is only 343 px wide. The gallery `drag` primitive uses a six-player board whose targets stay
  clear of each other, so its review passes. A real board on a phone needs either fewer draggable
  players per screen, a zoom, or a smaller hit radius with a larger gap rule; that is a Phase 8
  (Tactics Board) decision, not a gallery fix.
- `PlaybackBar` controls sit 7.9 px apart when the bar is in a container narrower than about 640 px
  while the viewport is 768 px or wider (the transport label shows at `md:` by viewport, not by
  container). The gallery gives the playback cells two columns from 1280 px and one below, so each is
  at least 680 px wide. The lesson screens give the bar its full column, so they are not affected.
  - **Resolved in the 04-REVIEW fix pass (WR-02).** The tap-size check now judges unrounded boxes
    with a 1/64 px margin (no 0.15 px rounding allowance). Measured unrounded in Chrome at viewport
    1024 with the bar's container set to 480 to 639 px (plus fractional offsets), every pair of
    playback targets is at least 8.00 px apart: the 7.9 px reading came from the 0.1 px box
    rounding, not from the layout. The real narrow-container defect was the scrubber: with
    `min-w-0` it shrank to about 33 px wide at a 560 px container. It now has `min-w-11`, so the
    row wraps before the scrubber drops below 44 px.
