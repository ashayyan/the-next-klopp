# Phase 3 — UI Review

**Audited:** 2026-11-28
**Baseline:** 03-UI-SPEC.md (approved), plus a11y and anti-slop rules. Placeholder tokens judged as placeholders.
**Screenshots:** reused existing captures in `test-results/pitch/` (glyph-sheet 320/375/768/1440, pitch-only-1440). Only glyph-sheet 1440 and 375 were viewed in detail. No fresh capture run.
**Interaction captures:** off (not enabled). Interaction findings are code-derived, not observed.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Contract copy present; visible CTA says "Play", spec says "Play sequence"; unexplained disabled Motion group |
| 2. Visuals | 3/4 | Clear pitch focal point, flat anti-slop panels, shape-coded teams; glyph-sheet clutter and annotation chip occluding the centre circle |
| 3. Color | 3/4 | Zero hex in TSX, accent reserved correctly; disabled radios and muted text low emphasis |
| 4. Typography | 4/4 | Only text-sm/base/2xl and font-semibold; matches 12/14/16/24 contract |
| 5. Spacing | 3/4 | 44px targets and 4px-multiple scale held; toolbar wraps and orphans "Layers"; large dead column at 1440 |
| 6. Experience Design | 3/4 | State panels, reduced motion, keyboard and live regions present; unverified by capture; disabled Motion has no reason |

**Overall: 19/24**

---

## Top 3 Priority Fixes

1. **Visible Play label diverges from contract** — contract (Checker Recommendations) requires "Play sequence"/"Replay sequence" visible at 768px and up; code renders `Play` (`PlaybackBar.tsx:33`, `<span className="hidden md:inline">{label}</span>`). Fix: render `{label} sequence` in the span; keep icon-only below md. Label-in-name also then matches aria-label (WCAG 2.5.3 currently OK only because "Play" is a prefix, fragile for "Pause").
2. **Toolbar breaks the 1440 "one row" layout** — screenshot shows Scene, Pitch size, orientation, Motion on row 1 and "Layers" orphaned on row 2 with two stacked 44px checkbox rows, making the toolbar 200px tall. Fix: give the Scene select and Pitch size select fixed `sm:w-56`/`w-64`, put the Layers checkboxes in a `flex-row` group (`dev-pitch.tsx:319-344`), or shorten the pitch-size option labels.
3. **Disabled Motion group looks broken and is unexplained** — on still scenes `Smooth` shows as a washed-out selected radio with no reason (`dev-pitch.tsx:82`, `disabled={store === null}`). Fix: hide it for 1-frame scenes, or add muted hint "Applies to scenes with playback." Same applies to the disabled density checkbox.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)
- Contract strings match: h1 "Pitch Standard", subline, "Still scene — 1 frame", "Loading scene…", "No scene called “…”", "Reset positions", "Pointer off pitch", curly quotes and `…` used (`dev-pitch.tsx:243,403-406`).
- WARNING: visible CTA "Play" vs contract "Play sequence" (see fix 1).
- WARNING: converter probe idle output is `Canonical x — m · y — m` (`ConverterProbe.tsx:116`): reads as noise. Empty fields give no hint of the valid range until an error appears. Add placeholder/helper text "Enter a provider x and y" per provider range.
- Legend copy is per contract and each entry has a label plus description. Good.
- WARNING: annotation text truncated at 40 chars on the pitch ("The press forces the pass wide, then th…") by design; fine, full text in desc.

### Pillar 2: Visuals (3/4)
- Pitch is the dominant element at every width; accent Play is the single loud control. Flat panels, no gradient, shadow, card grid or emoji. Passes the anti-slop bar.
- Team distinction by fill vs ring, goalkeeper by shape, event type by line style: all visible in the 1440 sheet and legend swatches use real glyphs.
- WARNING: in the glyph sheet the annotation chip sits across the centre circle and the pass lines; the highlight ring, ball, pressure wedge, player 9 and sequence badge stack into an illegible knot near (30–40 m, 45 m). It is a demo, but it is the success-criterion-1 screenshot and the cluster hides the ball-owner offset rule. Spread fixture positions.
- WARNING: 12px numbers in 20px discs (small screens) are tight; the "9" with highlight ring is hard to read.
- Pitch icon-only buttons have aria-label and title. Good.
- WARNING: 1440 layout leaves ~1000px of empty column under the pitch while legend is tall; the sticky legend (`Legend.tsx:45`) helps but stage looks unbalanced. Minor.

### Pillar 3: Color (3/4)
- Grep: 0 hex/rgb literals in `src/pitch`, `src/scene`, `src/routes/dev-pitch*` (non-test). All colours via CSS variables in `src/index.css`. Contract met.
- Accent use: focus ring (`outline-accent`), checkbox/radio `accent-accent`, Play `bg-accent`, range `accent-accent`. Matches reserved list. Not on pitch.
- Split: page `#f7f7f4` dominant, panels `#ecede8` secondary; very low tonal difference (panel vs page ~1.1:1), so panels read as barely separated. Acceptable placeholder, flag for Phase 4.
- WARNING: disabled Smooth radio under `fieldset disabled` is rendered grey with no 3:1 contrast; unreadable as state.
- `--density-mark` uses 8-digit hex `#1a1a1a4d`; compliant (in CSS).

### Pillar 4: Typography (4/4)
- Sizes in use: `text-sm` (34), `text-base` (12), `text-2xl` (1). Weights: `font-semibold` only (11) plus default 400. Mono + `tabular-nums` on readouts. Glyph text 12px via `GLYPH_TEXT_PX` fixed. Matches the 12/14/16/24, 400/600 contract exactly.

### Pillar 5: Spacing (3/4)
- All spacing utilities map to the 4px multiples (p-4/6/8, gap-1/2/4/6/8, mt-12, pb-16). Arbitrary values only `max-w-[1280px]`, `lg:grid-cols-[minmax(0,1fr)_288px]`, `min-[600px]`, `basis-[calc(100%-9rem)]` (the last is a magic number tied to button widths; fragile).
- 44px targets: `min-h-11` on selects, buttons, radio/checkbox labels. Checkbox/radio inputs themselves are `size-4` but label is the 44px target. OK.
- WARNING: `lg:mt-12` (48px) header-to-toolbar matches; toolbar-to-grid uses `lg:mt-6`... contract 24px, ok.
- WARNING: toolbar wrap/orphan (fix 2); toolbar `gap-4` between groups but legend-label to control `gap-1` (4px) is tight against 44px controls.
- No horizontal scroll visible at 375 (screenshot 360px wide). 320 capture not inspected.

### Pillar 6: Experience Design (3/4)
- States: empty/invalid/missing-local/error panels via `StatePanel`, loading status line keeps pitch drawn, unknown-scene fallback, single-frame no bar, probe range errors. Good coverage.
- Playback: never autoplays (store opens paused), Replay at end, scoped keyboard handler on the stage region, polite live region only on pause/end, reduced-motion default Stepped and 0ms CSS override. Good.
- Drag: role/aria and focus ring handled via `[data-draggable]` CSS with `:focus-visible`. Not exercised in a capture.
- WARNING: disabled Motion/Density controls with no explanation (fix 3).
- WARNING: `setParams({ scene })` drops other params; fine now.
- No destructive actions; no confirmation needed per spec.
- Not verified: 60 fps backstop, reduced-motion emulation, hover/focus rings (no interaction capture).

---

## Files Audited
- `src/index.css`
- `src/routes/dev-pitch.tsx`
- `src/routes/dev-pitch/ConverterProbe.tsx` (excerpt)
- `src/scene/playback/PlaybackBar.tsx`
- `src/pitch/legend/Legend.tsx` (excerpt), `src/pitch/Pitch.tsx` (excerpt), glyph font size greps in `src/pitch/glyphs/*`
- Screenshots: `test-results/pitch/glyph-sheet-1440.png`, `glyph-sheet-375.png` (others not opened)
