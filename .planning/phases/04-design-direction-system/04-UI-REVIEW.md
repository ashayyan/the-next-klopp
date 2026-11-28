# Phase 4 — UI Review

**Audited:** 2026-11-28
**Baseline:** 04-UI-SPEC.md + docs/DESIGN.md (floodlit, ADR 0010)
**Screenshots:** captured (`npm run review:screens`, port 5184, 375/768/1440, light + dark, plus deuteranopia/achromatopsia at 375) in `test-results/review/`
**Interaction captures:** off (workflow.ui_interaction_capture is false). Interaction findings are code-derived.

Routes reviewed: `/dev/directions/floodlit/tactics`, `/dev/directions/floodlit/data`, `/dev/gallery`, `/dev/gallery/{pitch,glyphs,quiz-option,data-table,playback,colour}?bare=1`. All 9 reports: `REVIEW: PASS`, 0 FAIL; warnings = taste-copy `copy-stat-strip` on the data screen and pitch/glyph primitives.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Specific, PL-grounded copy; legend says "shirt number" while discs show position codes (deferred, still wrong) |
| 2. Visuals | 2/4 | Two-letter position codes overflow the player disc at 1440 and 375; pitch is mostly empty space on both screens |
| 3. Color | 3/4 | Accent restricted to CTA, current step, selected segment; dark-theme shape lines same blue as discs |
| 4. Typography | 3/4 | 14/16/24/36 steps hold; glyph text (12 px) on ~16 px discs is cramped |
| 5. Spacing | 3/4 | No arbitrary values; tokens used; 1440 tactics leaves a dead band under the pitch |
| 6. Experience Design | 3/4 | States covered in gallery; badge-vs-badge overlap and ball-over-label remain (deferred) |

**Overall: 17/24**

---

## Top 3 Priority Fixes

1. **WARNING — Position-code labels spill out of player discs** (CM, DM, RW, LW in `1440-dark.png` and `375-light.png` of the tactics screen). Users cannot read the code cleanly; this was the Phase 3 "numbers covered/readable" concern in a new form. Fix: in `src/pitch/glyphs/PlayerGlyph.tsx:71` scale text to fit (`textLength`/`lengthAdjust="spacingAndGlyphs"` when label length > 1) or raise disc radius for two-character labels; add a glyph-sheet assertion that label bbox fits inside the disc.
2. **WARNING — Legend says "Filled disc with shirt number" but scenes show position codes** (`src/pitch/glyphs/registry.ts:55` and `:61`). Contradicts DESIGN.md section 4, which requires the legend to name what is shown. Fix: make the description derive from the scene (`"…with position code"` when any player in the scene uses `label` and no `number`).
3. **WARNING — Sequence badges can still collide with each other** (`src/pitch/glyphs/placement.ts` `placeBadge`; Wyscout scene, 375, t=11.48, badges 1/3/6). Phase 3 observation 1 is only half-fixed (badge vs disc). Fix: pass already-placed badge boxes to `placeBadge` as obstacles and extend the 04-17 test to badge-vs-badge.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)
- Strong: "One team, two shapes", "Flip the shape", "Shape now: 4-4-2", "Continue to Predict", sourced captions (The Analyst 2023; Pappalardo et al. 2019, CC-BY-4.0). No generic Submit/OK.
- WARNING: legend copy mismatch (fix 2, deferred item 04-12).
- WARNING: data screen stat block triggers taste-copy `copy-stat-strip` (3 stats "18.4 s / 59.3 m / 7 City players"), a template-ish stat strip pattern.

### Pillar 2: Visuals (2/4)
- WARNING: disc label overflow (fix 1). At 1440 the disc renders ~16 px, so codes bleed past the edge on both themes.
- WARNING: data screen at 375 t=0 shows a full vertical pitch with one event in the lower half; the visual leads by size but carries almost nothing until Play. Consider an initial frame with the first 2-3 actions or a zoomed half-pitch.
- WARNING: tactics 1440 pitch occupies ~55% width with large empty halves; the team occupies one half. A half-pitch crop or larger scale would help focal point.
- Pass: clear focal hierarchy (title, pitch, control, CTA); icon-only buttons at 375 have labels in code (shell bar).

### Pillar 3: Color (3/4)
- Pass: no hardcoded hex in `src/**/*.tsx`; accent green only on primary CTA, current step marker/rail and selected segment (spec "Accent reserved for").
- Phase 3 obs 3 (page/panel tone): fixed — panels visibly separate in both themes (notation, stat block).
- WARNING: dark theme shape lines and team discs share one blue; lines read as part of the discs at 1440. Use a lower-alpha or muted line token.

### Pillar 4: Typography (3/4)
- Phase 3 obs 4: fixed — 14/16/24/36 visible (caption, body, h2 "Flip the shape", h1).
- WARNING: 12 px glyph text in small discs is the weakest legibility point (ties to fix 1).
- Mono numerals on time readout and table metres: consistent.

### Pillar 5: Spacing (3/4)
- No arbitrary `p-[..]`, `gap-[..]`, `text-[..]` values found in `src/**/*.tsx`.
- WARNING: tactics 1440 has a dead band below the segmented control while the right column runs to the CTA; columns end unevenly.
- Pass: 375 stacks cleanly; controls 44 px (tap-size checks pass on all 9 routes).

### Pillar 6: Experience Design (3/4)
- Pass: gallery covers default/hover/focus/disabled/loading/empty/error states; playback has paused/playing/end/1-frame; quiz-option has correct/incorrect with icon + text.
- Phase 3 obs 2 (note chips clip vertical): no clipping in 375 captures; review checks pass.
- WARNING: badge-vs-badge overlap (fix 3) and ball over "EM" disc label at t=0 on data screen (768/1440) — deferred items, still open. Visible at 375 too: ball and badge "1" crowd the EM disc.
- Deferred, scored not re-counted: 22-player board tap-size at 375 (Phase 8), `/dev/pitch` select heights.

Registry audit: skipped (no third-party registries in UI-SPEC).

---

## Files Audited
- test-results/review/dev-directions-floodlit-tactics/*, dev-directions-floodlit-data/*, dev-gallery*/* (screenshots + report.md)
- src/pitch/glyphs/PlayerGlyph.tsx, registry.ts, placement.ts, MarkGlyphs.tsx
- .planning/phases/04-design-direction-system/04-UI-SPEC.md, deferred-items.md

---

## UI fixes

Applied 2026-11-28 on `gsd/phase-04-design-direction-system` (from HEAD `f757e7b`), one commit per item, normal hooks.

| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Position-code labels spill out of the player discs | Fixed. A label of two or more letters uses Mona Sans' condensed width (`font-stretch: 75%`); one too long even then is squeezed to the disc's inner chord (`textLength`). Shirt numbers keep the normal width. Functional test measures each label's ink box against the disc minus half its outline (tactics both shapes, data screen, glyph sheet; 375 and 1440); unit tests for `fitLabel` | `ee958e3` |
| 2 | Legend says "shirt number" while discs show position codes | Fixed. Registry descriptions carry a `{disc-text}` slot filled from the scene data: "position code" (label + role) on the City shapes, "player initials" (label + name, no role) on the Wyscout goal, "shirt number" for numbers. Unit and functional tests | `22fdcd1` |
| 3 | Sequence badges collide with each other; vacuous note-chip check | Fixed. `placeBadge` takes earlier badges as obstacles (2 px gap) and falls back to a disc-only clear side before giving up; SceneLayer places in sequence order. Unit test (both orientations) and Chrome test at 375/1440 assert no badge-badge overlap and require a frame with 3+ badges. Note-chip test now runs on glyph sheet, authored, quiz-answer and tactics-with-ball and requires at least one chip on each | `799f8e5` |
| 4 | Ball covers the "EM" disc label at `t=0` | Fixed. An owned ball sits disc radius plus ball radius from its owner (toward the attack), touching the disc edge. Unit test plus Chrome test at 375/768/1440 (ball ring vs EM label ink and disc fill) | `f13c8d5` |
| 5 | DESIGN.md section 2 contradicts section 4 | Fixed. Section 2 names the rules that keep the defects fixed; the section 4 "Known gaps" bullet is replaced by what the functional spec checks; deferred-items.md marks the 04-12 items resolved | `59b30ce` |
| 6 | Gallery shows "1 states" | Fixed (singular for one state); functional and unit tests updated | `4d2dcbe`, `d6c3dfd` |
| 7 | `/dev` index links have no visible focus ring | Fixed. Links carry the focus-token outline; `review:screens /dev` PASS (was 6 fail) | `b78dfff` |
| 8 | Five unused losing-direction font packages | Removed with `npm uninstall` after `git grep` found no reference outside package.json (no source, script, token set or copy-fonts config); `npm run fonts -- --check` ok; remaining pins exact | `b40b6d9` |
| opt | Dark-theme shape lines share the disc blue | Not done. DESIGN.md has no distinct shape-line token, and the palette is validated, so no colour was invented. Lines stay `teamColour` at 0.6 opacity | none |

Checks before this commit: `npm test` 53 files, 1261 passed (6 skipped); `npx tsc --noEmit` ok; `npx biome ci .` exit 0 (1 pre-existing info in `src/ui/Dialog.tsx`); `npm run guard` ok; `npm run tokens:check` ok; `npm run palette` PASS both themes; `npm run build && npm run guard:bundle && npm run smoke` ok; functional Playwright (REVIEW_PORT=5184, reused dev server) 109 passed; `CHECK_PITCH_PORT=5183 npm run check:pitch` 49 ok, 0 failed; `npm run review:screens` PASS on `/dev` (0 warn), `/dev/directions/floodlit/tactics` (1 warn: taste-copy copy-contrast), `/dev/directions/floodlit/data` (1 warn: taste-copy), `/dev/gallery` (0 warn). Gates ran in the main checkout, not a worktree.

Residual, not in scope: the player legend swatch still draws the number "7" when the description says position code or initials.

