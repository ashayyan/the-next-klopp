# The Next Klopp design constitution

This document governs how every screen of The Next Klopp looks, moves and behaves: the anti-slop rules, the picked visual direction, the foundations (colour, type, spacing, icons, motion), the Pitch Standard, the interaction components, the lesson templates, the data-viz standards and the quality bar each screen must clear. It is the single source of the design tokens: `src/styles/tokens.css` is generated from the one `tokens` block in section 3.7 by `node scripts/design/build-tokens.ts`, and `npm test` fails when the two drift apart. Change a token here, never in the CSS.

## 1. Principles and anti-slop rules

This section covers brief section 9.1 (design principles, do and don't lists, banned patterns).

## 2. Visual direction

This section covers brief section 9.2 (the visual directions checkpoint and the picked direction).

**Picked: Floodlit.** The idea is the analysts' video room at night: the pitch is the one lit object on the screen and everything else steps back into dark slate. The mood is focused, quiet and steady, cinematic without neon. Dark is the primary theme and light is a full second theme, not an afterthought. The composition is a stage: a narrow step rail, the pitch in the middle at the largest size the width allows, and a reading column beside it (below it at 375 px). The type is one wide, firm family like a stadium board (Mona Sans) with a mono face only for numbers.

Three directions were built on the same two sample screens (a tactics lesson at Lesson Loop step 3 and a data lesson at step 2), rendered at 375, 768 and 1440 px in both themes, and scored by an independent reviewer against the 04-UI-SPEC rubric. All three passed the three gates.

| Direction | Idea | Primary theme | Weighted total (of 100) |
|-----------|------|---------------|-------------------------|
| `floodlit` (picked) | A night match under floodlights | dark | 81.25 |
| `programme` | A printed matchday programme | light | 73.75 |
| `notebook` | An analyst's notebook | light | 73.75 |

Floodlit won because the pitch leads at every width on both screens while the chrome stays quiet, and its text column stays inside the 70-character measure at 1440 px. The full scores, evidence and screenshot hashes are in [ADR 0010](decisions/0010-visual-direction.md) (`docs/decisions/0010-visual-direction.md`).

picked by Claude under learner delegation; the learner may override by asking. An override before the Phase 5 lessons ship is cheap: a new ADR supersedes 0010 and this section and the tokens block change with it.

**What this document does with the review's inputs.** Floodlit scored lowest on anti-slop (2 of 4): a near-black ground with one bright accent sits close to the generic dark dashboard. The answer is in rules, not in new colours, so the validated palette stays exactly as reviewed:

- The pitch is the only lit object. No other large surface uses the pitch tones, and no panel competes with it for size at any width.
- Match-based screens use the scoreline as the title ("Manchester City 5–0 Liverpool"), borrowed from `programme`, because it reads as football at once and costs no extra colour.
- The accent stays on the reserved list in 3.1. At rest a screen shows one accent fill (the primary button); the current step marker, the selected segment and the playback button carry the accent only as the state the learner is operating. A second accent-filled button is never allowed.
- Defects the review found in the shared pitch layer (sequence badges touching discs at 375 px, the ball over a disc label at `t=0`, discs labelled with position initials while the notation says shirt number) are fixed in the Pitch Standard (section 4). Team B (ring disc, hollow arrowheads) was not visible in any reviewed capture, so the gallery shows both teams in both themes and in the achromatopsia capture before DESIGN.md is locked.

## 3. Foundations

This section covers brief section 9.3 (colour, typography, spacing, grid, radius, elevation, iconography and the motion language). Every value below comes from the tokens block in 3.7; the tables repeat them for reading, and the CSS variable is named in each row.

### 3.1 Colour

**Roles.** Dark is listed first because it is the primary theme.

| Role | CSS variable | Dark (primary) | Light |
|------|--------------|----------------|-------|
| Page ground (about 60 % of the screen) | `--surface-page` | `#0E151D` | `#F3F5F7` |
| Panel (about 30 %) | `--surface-panel` | `#1C2834` | `#D8E0E7` |
| Raised: popover, dialog, table header | `--surface-raised` | `#243241` | `#FFFFFF` |
| Accent (about 10 %, reserved list only) | `--accent` | `#6FD0AE` (chalk mint) | `#0A7558` |
| Text on accent | `--accent-ink` | `#0E151D` | `#FFFFFF` |
| Text | `--ink` | `#E8EDF1` | `#111922` |
| Muted text | `--ink-muted` | `#9CA8B4` | `#4C5967` |
| Control border | `--control-border` | `#6A7B8B` | `#6B7987` |
| Error and destructive | `--danger` | `#F2857A` | `#B3261E` |
| Focus ring | `--focus-ring` | = accent | = accent |
| Highlight block (readout, stat block) | `--surface-highlight` | = surface-raised | = surface-raised |
| Text on the highlight block | `--surface-highlight-ink` | = ink | = ink |

**Accent is reserved for these, and nothing else:**

1. The one primary button per screen ("Continue to Predict"), as a fill.
2. The current step marker in the Lesson Loop step rail.
3. The selected option of a segmented control and the checked state of a switch, checkbox or radio.
4. Playback: the Play, Pause and Replay button fill, the scrubber's filled track and thumb.
5. The progress ring fill.
6. The focus ring.

**Never accent:** text of any kind, links (links are ink with a 1 px underline, 2 px on hover), chart marks, and anything on the pitch. Team colours never appear on UI controls. Danger appears only on inline errors, the error panel's 4 px left border and the destructive button of an alert dialog.

**Pitch, team, ball and zone.** These keep the Phase 3 names, so the pitch changes with the tokens and no code edit.

| CSS variable | Dark (primary) | Light |
|--------------|----------------|-------|
| `--pitch-runoff` | `#121B24` | `#DCE3E9` |
| `--pitch-surface` | `#182431` | `#E9EEF2` |
| `--pitch-line` | `#71859A` | `#66778A` |
| `--team-a` | `#3A97DA` | `#0072B2` |
| `--team-a-ink` (number on a team A disc) | `#0E151D` | `#FFFFFF` |
| `--team-b` (ring and arrowheads) | `#C77F00` | `#D55E00` |
| `--team-b-fill` (inside the team B ring) | `#0E151D` | `#FFFFFF` |
| `--team-b-ink` (number in a team B disc) | `#E8EDF1` | `#111922` |
| `--ball-fill` / `--ball-ring` | `#FFFFFF` / `#0E151D` | `#FFFFFF` / `#111922` |
| `--zone-fill` / `--zone-fill-opacity` | `#F0E442` / 0.2 | `#F0E442` / 0.45 |
| `--zone-line` | `#C9C27A` | `#4C5967` |
| `--highlight` (selection ring on the pitch) | `#E8EDF1` | `#111922` |
| `--density-mark` (dense Canvas marks) | `#E8EDF159` (ink at 0.35) | `#1119224D` (ink at 0.30) |
| `--label-bg` / `--label-border` | `#0E151D` / `#5E6E7D` | `#FFFFFF` / `#B8C3CC` |

Team identity is never colour alone. Every pitch keeps four shape rules, so a learner with any colour vision, or a greyscale print, still separates the teams and the events:

- Team A is a filled disc; team B is a ring disc filled with `--team-b-fill`.
- Team A arrows have filled arrowheads; team B arrows have hollow arrowheads.
- The goalkeeper of either team is a rounded square, not a disc.
- Event type is a line style: a pass is a solid line, a run is dotted, a carry is dashed, a shot ends in a circle.

The pitch is one flat fill: no grass stripes, no gradient, no texture and no shadow. In the dark theme the ball is found by its white fill (15:1 on the surface); in the light theme by its ink ring (at least 14:1).

**Data scales, assigned by job.** Categorical means identity, sequential means magnitude, diverging means polarity. Never use a scale for a job it was not made for.

| Scale | Dark (primary) | Light |
|-------|----------------|-------|
| Categorical 1, 2, 3 (`--data-cat-1..3`) | `#3A97DA` `#C77F00` `#3DAA6E` | `#0072B2` `#D55E00` `#009E73` |
| Categorical other (`--data-cat-other`) | `#9AA7B3` | `#6B7987` |
| Sequential 1 to 5, low to high (`--data-seq-1..5`, teal) | `#173A3A` `#1B5E57` `#24857A` `#4FB3A2` `#9EDCCF` | `#D3ECE6` `#62B5A3` `#3A9F8E` `#1B7A6C` `#0B4F47` |
| Diverging negative, middle, positive (`--data-div-neg`, `-mid`, `-pos`) | `#B0702A` `#3A3F45` `#26A896` | `#8C510A` `#EEF0F1` `#0A8F7F` |

- Categorical slots 1 and 2 are the two team colours, so a series about a team wears that team's colour. Slot 3 is a third hue. Beyond three series, fold the rest into "Other" (slot 4, neutral grey) or use small multiples.
- Sequential step 1 means "near zero" and may recede into the surface; steps 2 to 5 are the ordinal set and clear 2:1 against the page.
- Diverging runs brown to teal, so it never reads as team A against team B.

**Validation.** `node scripts/design/check-palette.ts` gates every token set: colour-blind distance between the team colours and between the categorical colours (Machado 2009 simulation, OKLab delta E times 100, at least 8 under protan and deutan and at least 15 for normal vision), the sequential order, and WCAG 2.2 contrast. The table below is generated, not typed: it is the output of `node scripts/design/check-palette.ts docs/DESIGN.md --markdown`, and a test fails when the two differ. Regenerate it after any colour change.

<!-- palette:start -->
| Set | Teams on pitch surface (all pairs): worst CVD ΔE / normal ΔE | Categorical 1-3 on page (all pairs): worst CVD ΔE / normal ΔE | Diverging poles CVD ΔE | Sequential ordinal |
|-----|------|------|------|------|
| floodlit dark | 24.4 protan / 27.4 | 9.1 deutan / 18.6 | 12.7 | PASS |
| floodlit light | 21.9 protan / 31.2 | 11.0 deutan / 18.7 | 13.5 | PASS |

| Set | ink / page | ink / panel | muted / page | muted / panel | accent-ink / accent | focus ring / page | control border / page | control border / panel | danger / page | panel / page (tone step) | pitch line / surface | pitch line / run-off | team A / surface | team B / surface | team-a-ink / team A | highlight-ink / highlight | team-b-ink / team-b-fill |
|-----|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|
| floodlit dark | 15.6 | 12.7 | 7.6 | 6.2 | 9.9 | 9.9 | 4.2 | 3.4 | 7.4 | 1.23 | 4.1 | 4.6 | 5.0 | 4.8 | 5.8 | 11.1 | 15.6 |
| floodlit light | 16.2 | 13.3 | 6.6 | 5.4 | 5.7 | 5.2 | 4.1 | 3.3 | 6.0 | 1.22 | 3.9 | 3.5 | 4.4 | 3.3 | 5.2 | 17.7 | 17.7 |
<!-- palette:end -->

Rules that follow from these numbers: accent is never text (the light accent on a panel is 4.3:1, under 4.5:1); text sits on page, panel or raised surfaces only; panel against page is at least 1.2:1 so the tone step is visible without a border.

### 3.2 Typography

Four sizes and two weights. Every step above body is about 1.5 times the one below, so the levels never blur.

| Role | Token | Size | Weight | Line height | Used for |
|------|-------|------|--------|-------------|----------|
| Label | `text-label` | 14 px | 400 (600 for the selected value) | 1.4 | Control labels, legend, step rail, table cells at 375 px, source line, axis labels, stat labels |
| Body | `text-body` | 16 px | 400 | 1.5 | Lesson body text (at most 60 words per step), table cells at 768 px and up, glossary card body |
| Heading | `text-heading` | 24 px | 600 | 1.25 | Step heading (`h2`), panel headings, the live shape readout |
| Display | `text-display` | 36 px | 600 | 1.1 | Lesson title (`h1`) and stat figures, at every width |

- **Families.** Display: Mona Sans at `font-stretch: 125%` (`--font-display`, `--font-display-stretch`). Body and labels: Mona Sans at 100 % (`--font-sans`). Numbers: Geist Mono (`--font-mono`). One Mona Sans variable file serves display and body; `index.html` preloads it. Both families are licensed OFL-1.1 and self-hosted from `public/fonts/`; the licence record is [`public/fonts/LICENSES.md`](../public/fonts/LICENSES.md). Mona Sans carries the Reserved Font Name "Mona": the files are straight copies and are never modified or renamed.
- **Mono rule.** Mono is only for numbers that change or align: time readouts, coordinates, numeric table columns, stat figures and the numerals of the shape readout. Never for labels, eyebrows or headings. Always with `font-variant-numeric: tabular-nums`.
- **Pitch glyph text** is the one exception to the four sizes: 12 px, weight 600, line height 1, from the token `pitch.glyphText` (`--pitch-glyph-text`). It is glyph geometry inside the pitch SVG, not a fifth type role, and it never appears outside the pitch.
- **Measure.** Body text runs 45 to 70 characters per line (`max-width: 65ch`).
- **Font budget.** At most 200 KB of WOFF2 in total. Floodlit uses 121 KB (Mona Sans 98,124 B and Geist Mono 23,128 B).
- **Latin subset.** The font files are Latin-subset. They cover curly quotes, the ellipsis, the en dash and the minus sign (U+2212), but not arrows (U+2192), check marks (U+2713) or the less-than-or-equal sign (U+2264). UI copy never uses those three characters; icons are SVG.
- **Copy typography.** Curly quotes, the ellipsis character, an en dash in scores ("5–0") and the minus sign (U+2212) for negative numbers. No all-caps labels, no letter-spaced eyebrows, no single accented word inside a headline.

### 3.3 Spacing and grid

All spacing is a multiple of 4 and comes from the scale (`--space-*`). Tailwind's 4 px spacing utilities map onto it (`p-4` is 16 px).

| Token | Value | Typical use |
|-------|-------|-------------|
| `xs` | 4 px | Icon to label, legend swatch to label, stat figure to label |
| `sm` | 8 px | Between controls in one group, table cell vertical padding, chip padding |
| `md` | 16 px | Page padding below 768 px, panel padding at 375 px, gap between regions at 375 px |
| `lg` | 24 px | Page padding from 768 to 1023 px, panel padding from 768 px, gap between regions at 768 px |
| `xl` | 32 px | Page padding from 1024 px, column gap at 1440 px |
| `2xl` | 48 px | Gap between the top bar and the lesson header at 1440 px |
| `3xl` | 64 px | Bottom page padding from 1024 px |

- **Grid.** 4 columns with a 16 px gutter at 375 px, 8 columns with a 24 px gutter at 768 px, 12 columns with a 32 px gutter at 1440 px. Content is at most 1280 px wide; the floodlit stage may run to the full 1440 px with 32 px padding. The root variable `--gutter` follows the same steps.
- **Targets.** Every control outside running text is at least 44 by 44 px and at least 8 px from the next target.
- **Pitch geometry** is in screen pixels and metres, not in the spacing scale: a player disc is `clamp(22px, 2.0 m, 28px)` so 12 px numbers fit, and a sequence badge sits the disc radius plus 8 px away from its event's start point.
- **Line weights are not spacing.** Chart bars keep a 2 px surface gap, chart lines are 2 px, markers at least 8 px; the border rule is `--border-rule` (1 px).

### 3.4 Radius and elevation

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 2 px | Chips, badges, focus ring corners |
| `--radius-md` | 4 px | Buttons, inputs, segmented controls, table cells |
| `--radius-lg` | 6 px | Panels, popovers, dialogs |

Elevation is tone only. The three surfaces step from page to panel to raised; floodlit has no shadow anywhere (`--shadow-sheet` is `none`). The raised surface is allowed for overlays (popover, dialog, tooltip, menu, toast), the table header and the highlight block; nothing else floats. Never a glass effect (`backdrop-filter`) and never a gradient.

### 3.5 Iconography

The project owns its icons as inline SVG; there is no icon library.

- **The set.** Interface icons in `src/ui/icons/`: check, cross, question, theme, more, close and chevron. Playback icons in `src/scene/playback/icons.tsx`: play, pause, replay, previous frame and next frame.
- **Grid and line.** Each icon is drawn on a 20 by 20 grid in `currentColor`. Stroke width is `--icon-stroke` (1.5 px), line cap `--icon-linecap` (square), joins round.
- **Accessibility.** Every icon is `aria-hidden="true"` and not focusable; it never carries meaning alone. An icon-only button has an `aria-label` and a tooltip with the same name. Correct and incorrect states pair an icon with a word ("Correct", "Not quite").
- **Never** emoji as icons, and never a filled icon set mixed with the line set.

### 3.6 Motion language

Durations and easings are tokens, and motion always means something.

| Token | Value | Used for |
|-------|-------|----------|
| `--duration-ui` | 160 ms | UI transitions, shape lines fading out and in |
| `--duration-draw` | 240 ms | An arrow or a reveal marker drawing in |
| `--duration-morph` | 640 ms | A formation change |
| `--stagger-line` | 60 ms | The delay per line in a formation change, from the back |
| `--ease-ui` | `cubic-bezier(0.2, 0, 0, 1)` | UI transitions |
| `--ease-morph` | `cubic-bezier(0.65, 0, 0.35, 1)` | Player runs and formation changes |

What motion means:

| Motion | Rule |
|--------|------|
| Player run (off the ball) | The disc moves along its dotted trail with `--ease-morph`; the trail stays at opacity 0.4 after the move. |
| Ball path (pass, shot) | Linear, at constant speed, never eased. The ball's speed is information. |
| Carry | Player and ball move together, linear. |
| Pressing arrow | The wedge grows from the presser over `--duration-draw`, then holds. It never loops. |
| Formation change | All outfield players move at once, staggered by line from the back (`--stagger-line`), so each line visibly feeds its digit. Shape lines fade out during the change and back in after it (`--duration-ui`). |
| Predict, then reveal | The answer marker draws in over `--duration-draw`. Correct and incorrect appear with no shake, bounce or confetti. |
| UI transition | `opacity` and `transform` only, `--duration-ui` with `--ease-ui`, properties listed one by one (never `transition: all`). Popover and dialog scale from 0.98 to 1 while fading in. |

**Never:** autoplay, loops, parallax, scroll-triggered reveals, elastic or bounce easing, or anything moving that the learner did not start.

**Reduced motion** (`prefers-reduced-motion: reduce`): every UI duration is 0 ms (a global rule in `src/index.css`), a formation change swaps at once, and playback defaults to Stepped. UI transitions use `motion` (`motion/react`) and its `useReducedMotion`; movement on the pitch is `state = f(t)` on the scene clock with `d3-interpolate` and `d3-ease` (ADR 0009), so it can be scrubbed, paused and tested at any time `t`.

### 3.7 Tokens

This block is the single source of every token. `node scripts/design/build-tokens.ts` turns it into `src/styles/tokens.css`; `node scripts/design/build-tokens.ts --check` (part of `npm test` and CI) fails when the CSS differs from it, when the block is missing or repeated, or when the eight `##` sections of this document are missing or out of order. Colours are upper-case `#RRGGBB` or `#RRGGBBAA`; an alias such as `{color.accent}` resolves inside the same theme.

The format is DTCG-style, not strict DTCG 2025.10, in two ways: a colour `$value` is a hex string instead of a colour object (`colorSpace`, `components`, `alpha`), and the block has no `$schema` key. The project's Zod schema (`scripts/design/tokens-schema.ts`) validates it instead. Nothing outside the repo reads this block today; a future style-dictionary or Figma import needs a transform from hex strings to DTCG colour objects.

```tokens
{
  "meta": {
    "direction": "floodlit",
    "tokensVersion": 1,
    "primaryTheme": "dark"
  },
  "color": {
    "light": {
      "surface-page": {
        "$type": "color",
        "$value": "#F3F5F7"
      },
      "surface-panel": {
        "$type": "color",
        "$value": "#D8E0E7"
      },
      "surface-raised": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "accent": {
        "$type": "color",
        "$value": "#0A7558"
      },
      "accent-ink": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "ink": {
        "$type": "color",
        "$value": "#111922"
      },
      "ink-muted": {
        "$type": "color",
        "$value": "#4C5967"
      },
      "control-border": {
        "$type": "color",
        "$value": "#6B7987"
      },
      "danger": {
        "$type": "color",
        "$value": "#B3261E"
      },
      "focus-ring": {
        "$type": "color",
        "$value": "{color.accent}"
      },
      "surface-highlight": {
        "$type": "color",
        "$value": "{color.surface-raised}"
      },
      "surface-highlight-ink": {
        "$type": "color",
        "$value": "{color.ink}"
      }
    },
    "dark": {
      "surface-page": {
        "$type": "color",
        "$value": "#0E151D"
      },
      "surface-panel": {
        "$type": "color",
        "$value": "#1C2834"
      },
      "surface-raised": {
        "$type": "color",
        "$value": "#243241"
      },
      "accent": {
        "$type": "color",
        "$value": "#6FD0AE"
      },
      "accent-ink": {
        "$type": "color",
        "$value": "#0E151D"
      },
      "ink": {
        "$type": "color",
        "$value": "#E8EDF1"
      },
      "ink-muted": {
        "$type": "color",
        "$value": "#9CA8B4"
      },
      "control-border": {
        "$type": "color",
        "$value": "#6A7B8B"
      },
      "danger": {
        "$type": "color",
        "$value": "#F2857A"
      },
      "focus-ring": {
        "$type": "color",
        "$value": "{color.accent}"
      },
      "surface-highlight": {
        "$type": "color",
        "$value": "{color.surface-raised}"
      },
      "surface-highlight-ink": {
        "$type": "color",
        "$value": "{color.ink}"
      }
    }
  },
  "pitch": {
    "light": {
      "pitch-runoff": {
        "$type": "color",
        "$value": "#DCE3E9"
      },
      "pitch-surface": {
        "$type": "color",
        "$value": "#E9EEF2"
      },
      "pitch-line": {
        "$type": "color",
        "$value": "#66778A"
      },
      "team-a": {
        "$type": "color",
        "$value": "#0072B2"
      },
      "team-a-ink": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "team-b": {
        "$type": "color",
        "$value": "#D55E00"
      },
      "team-b-fill": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "team-b-ink": {
        "$type": "color",
        "$value": "#111922"
      },
      "ball-fill": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "ball-ring": {
        "$type": "color",
        "$value": "#111922"
      },
      "zone-fill": {
        "$type": "color",
        "$value": "#F0E442"
      },
      "zone-fill-opacity": {
        "$type": "number",
        "$value": 0.45
      },
      "zone-line": {
        "$type": "color",
        "$value": "#4C5967"
      },
      "highlight": {
        "$type": "color",
        "$value": "#111922"
      },
      "density-mark": {
        "$type": "color",
        "$value": "#1119224D"
      },
      "label-bg": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "label-border": {
        "$type": "color",
        "$value": "#B8C3CC"
      }
    },
    "dark": {
      "pitch-runoff": {
        "$type": "color",
        "$value": "#121B24"
      },
      "pitch-surface": {
        "$type": "color",
        "$value": "#182431"
      },
      "pitch-line": {
        "$type": "color",
        "$value": "#71859A"
      },
      "team-a": {
        "$type": "color",
        "$value": "#3A97DA"
      },
      "team-a-ink": {
        "$type": "color",
        "$value": "#0E151D"
      },
      "team-b": {
        "$type": "color",
        "$value": "#C77F00"
      },
      "team-b-fill": {
        "$type": "color",
        "$value": "#0E151D"
      },
      "team-b-ink": {
        "$type": "color",
        "$value": "#E8EDF1"
      },
      "ball-fill": {
        "$type": "color",
        "$value": "#FFFFFF"
      },
      "ball-ring": {
        "$type": "color",
        "$value": "#0E151D"
      },
      "zone-fill": {
        "$type": "color",
        "$value": "#F0E442"
      },
      "zone-fill-opacity": {
        "$type": "number",
        "$value": 0.2
      },
      "zone-line": {
        "$type": "color",
        "$value": "#C9C27A"
      },
      "highlight": {
        "$type": "color",
        "$value": "#E8EDF1"
      },
      "density-mark": {
        "$type": "color",
        "$value": "#E8EDF159"
      },
      "label-bg": {
        "$type": "color",
        "$value": "#0E151D"
      },
      "label-border": {
        "$type": "color",
        "$value": "#5E6E7D"
      }
    },
    "glyphText": {
      "$type": "typography",
      "$value": {
        "fontFamily": "{font.sans}",
        "fontSize": {
          "value": 12,
          "unit": "px"
        },
        "fontWeight": 600,
        "lineHeight": 1
      }
    }
  },
  "data": {
    "light": {
      "cat-1": {
        "$type": "color",
        "$value": "#0072B2"
      },
      "cat-2": {
        "$type": "color",
        "$value": "#D55E00"
      },
      "cat-3": {
        "$type": "color",
        "$value": "#009E73"
      },
      "cat-other": {
        "$type": "color",
        "$value": "#6B7987"
      },
      "seq-1": {
        "$type": "color",
        "$value": "#D3ECE6"
      },
      "seq-2": {
        "$type": "color",
        "$value": "#62B5A3"
      },
      "seq-3": {
        "$type": "color",
        "$value": "#3A9F8E"
      },
      "seq-4": {
        "$type": "color",
        "$value": "#1B7A6C"
      },
      "seq-5": {
        "$type": "color",
        "$value": "#0B4F47"
      },
      "div-neg": {
        "$type": "color",
        "$value": "#8C510A"
      },
      "div-mid": {
        "$type": "color",
        "$value": "#EEF0F1"
      },
      "div-pos": {
        "$type": "color",
        "$value": "#0A8F7F"
      }
    },
    "dark": {
      "cat-1": {
        "$type": "color",
        "$value": "#3A97DA"
      },
      "cat-2": {
        "$type": "color",
        "$value": "#C77F00"
      },
      "cat-3": {
        "$type": "color",
        "$value": "#3DAA6E"
      },
      "cat-other": {
        "$type": "color",
        "$value": "#9AA7B3"
      },
      "seq-1": {
        "$type": "color",
        "$value": "#173A3A"
      },
      "seq-2": {
        "$type": "color",
        "$value": "#1B5E57"
      },
      "seq-3": {
        "$type": "color",
        "$value": "#24857A"
      },
      "seq-4": {
        "$type": "color",
        "$value": "#4FB3A2"
      },
      "seq-5": {
        "$type": "color",
        "$value": "#9EDCCF"
      },
      "div-neg": {
        "$type": "color",
        "$value": "#B0702A"
      },
      "div-mid": {
        "$type": "color",
        "$value": "#3A3F45"
      },
      "div-pos": {
        "$type": "color",
        "$value": "#26A896"
      }
    }
  },
  "font": {
    "display": {
      "$type": "fontFamily",
      "$value": ["Mona Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      "$extensions": {
        "tnk": {
          "stretch": "125%",
          "licence": "OFL-1.1",
          "files": [
            {
              "src": "/fonts/mona-sans/mona-sans-latin-wdth-normal.woff2",
              "weight": "200 900",
              "stretch": "75% 125%",
              "style": "normal"
            }
          ]
        }
      }
    },
    "sans": {
      "$type": "fontFamily",
      "$value": ["Mona Sans", "ui-sans-serif", "system-ui", "sans-serif"]
    },
    "mono": {
      "$type": "fontFamily",
      "$value": ["Geist Mono", "ui-monospace", "Consolas", "monospace"],
      "$extensions": {
        "tnk": {
          "licence": "OFL-1.1",
          "files": [
            {
              "src": "/fonts/geist-mono/geist-mono-latin-wght-normal.woff2",
              "weight": "100 900",
              "style": "normal"
            }
          ]
        }
      }
    }
  },
  "text": {
    "label": {
      "$type": "typography",
      "$value": {
        "fontFamily": "{font.sans}",
        "fontSize": {
          "value": 14,
          "unit": "px"
        },
        "fontWeight": 400,
        "lineHeight": 1.4
      }
    },
    "body": {
      "$type": "typography",
      "$value": {
        "fontFamily": "{font.sans}",
        "fontSize": {
          "value": 16,
          "unit": "px"
        },
        "fontWeight": 400,
        "lineHeight": 1.5
      }
    },
    "heading": {
      "$type": "typography",
      "$value": {
        "fontFamily": "{font.display}",
        "fontSize": {
          "value": 24,
          "unit": "px"
        },
        "fontWeight": 600,
        "lineHeight": 1.25
      }
    },
    "display": {
      "$type": "typography",
      "$value": {
        "fontFamily": "{font.display}",
        "fontSize": {
          "value": 36,
          "unit": "px"
        },
        "fontWeight": 600,
        "lineHeight": 1.1
      }
    }
  },
  "space": {
    "xs": {
      "$type": "dimension",
      "$value": {
        "value": 4,
        "unit": "px"
      }
    },
    "sm": {
      "$type": "dimension",
      "$value": {
        "value": 8,
        "unit": "px"
      }
    },
    "md": {
      "$type": "dimension",
      "$value": {
        "value": 16,
        "unit": "px"
      }
    },
    "lg": {
      "$type": "dimension",
      "$value": {
        "value": 24,
        "unit": "px"
      }
    },
    "xl": {
      "$type": "dimension",
      "$value": {
        "value": 32,
        "unit": "px"
      }
    },
    "2xl": {
      "$type": "dimension",
      "$value": {
        "value": 48,
        "unit": "px"
      }
    },
    "3xl": {
      "$type": "dimension",
      "$value": {
        "value": 64,
        "unit": "px"
      }
    }
  },
  "radius": {
    "sm": {
      "$type": "dimension",
      "$value": {
        "value": 2,
        "unit": "px"
      }
    },
    "md": {
      "$type": "dimension",
      "$value": {
        "value": 4,
        "unit": "px"
      }
    },
    "lg": {
      "$type": "dimension",
      "$value": {
        "value": 6,
        "unit": "px"
      }
    }
  },
  "shadow": {
    "sheet": {
      "$type": "shadow",
      "$value": []
    }
  },
  "border": {
    "rule": {
      "$type": "dimension",
      "$value": {
        "value": 1,
        "unit": "px"
      }
    }
  },
  "duration": {
    "ui": {
      "$type": "duration",
      "$value": {
        "value": 160,
        "unit": "ms"
      }
    },
    "draw": {
      "$type": "duration",
      "$value": {
        "value": 240,
        "unit": "ms"
      }
    },
    "morph": {
      "$type": "duration",
      "$value": {
        "value": 640,
        "unit": "ms"
      }
    },
    "stagger-line": {
      "$type": "duration",
      "$value": {
        "value": 60,
        "unit": "ms"
      }
    }
  },
  "easing": {
    "ui": {
      "$type": "cubicBezier",
      "$value": [0.2, 0, 0, 1]
    },
    "morph": {
      "$type": "cubicBezier",
      "$value": [0.65, 0, 0.35, 1]
    }
  },
  "icon": {
    "stroke": {
      "$type": "dimension",
      "$value": {
        "value": 1.5,
        "unit": "px"
      },
      "$extensions": {
        "tnk": {
          "linecap": "square"
        }
      }
    }
  }
}
```

## 4. Pitch Standard

This section covers brief section 9.4 (the canonical pitch renderer, coordinate systems, glyphs and the notation legend).

## 5. Interaction component catalogue

This section covers brief section 9.5 (every interaction component with its purpose, controls, learning goal, states, data and accessibility fallback).

## 6. Lesson templates

This section covers brief section 9.6 (page layouts for the concept, simulation, data lab, case study, regulation, review and capstone lessons).

## 7. Data-viz standards

This section covers brief section 9.7 (chart choice, axis and label rules, annotation style and uncertainty display).

## 8. Quality bar

This section covers brief section 9.8 (how every screen is reviewed: screenshots at 3 widths, the taste rubric, accessibility and the performance budget).
