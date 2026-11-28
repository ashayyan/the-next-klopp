# Phase 4 deferred items

Out-of-scope findings logged during execution. Not fixed by the plan that found them.

## From plan 04-05 (review:screens)

- `/dev/pitch?scene=glyph-sheet` (Phase 3 dev page) reports `tap-size` FAIL at 375 and 1440 px in
  light theme: the scene `select` elements and the converter probe `select` and `input` fields are
  about 20 px tall and 256 to 369 px wide. Phase 3 only checked buttons against 44 px. The page is a
  dev tool, not a shipped lesson screen, so it is left alone; the 04-12 gallery and the direction
  screens must meet the rule, and the pick plan should confirm that `/dev/pitch` is replaced or
  fixed by then.
