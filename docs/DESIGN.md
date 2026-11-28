# The Next Klopp design constitution

This document governs how every screen of The Next Klopp looks, moves and behaves: the anti-slop rules, the picked visual direction, the foundations (colour, type, spacing, icons, motion), the Pitch Standard, the interaction components, the lesson templates, the data-viz standards and the quality bar each screen must clear. It is the single source of the design tokens: `src/styles/tokens.css` is generated from the one `tokens` block in section 3.7 by `node scripts/design/build-tokens.ts`, and `npm test` fails when the two drift apart. Change a token here, never in the CSS.

## 1. Principles and anti-slop rules

This section covers brief section 9.1 (design principles, do and don't lists, banned patterns). The rules serve one learner: an adult who learns by seeing and doing and studies with ADHD. Every screen has to make one idea obvious and leave nothing competing with it.

### Do

- **One focal point per screen.** At every width the learner knows where to look first. When it is a pitch lesson, that is the pitch.
- **Visual first.** The visual is the largest element and comes before the text that explains it; words sit next to the part of the visual they describe (multimedia research in `research/learning-science-adhd/findings.md`).
- **At most 60 words a step.** One idea per screen; add one layer at a time and reuse the controls the learner already knows.
- **Show, then touch, then practise.** Every concept follows the Lesson Loop: hook, see it, touch it, predict then reveal, do it, lock it in, connect it. Predict before the reveal, because a wrong guess still helps later recall.
- **Let the learner act.** Dragging, scrubbing and setting a value beat watching; a manual stepper beats an animation that plays itself.
- **Accent only on the reserved list** in section 3.1. Everything else is ink, muted ink or a surface tone.
- **Team identity by shape as well as colour.** Filled against ring discs, filled against hollow arrowheads, a square goalkeeper, line styles per event (section 3.1, section 4).
- **Real Premier League examples with sources.** Real clubs, seasons, matches and dates, each claim traceable to the source registry, contested topics labelled contested with both sides. No crests or logos.
- **Calm motion that the learner starts.** Nothing moves before input; motion carries meaning (section 3.6); reduced motion is honoured everywhere.
- **Quick feedback inside the lesson**, about competence and progress, never points, streaks or guilt.
- **Keyboard and screen reader first-class.** Every interaction has a keyboard path and a non-visual equivalent (section 5).

### Don't

Each banned pattern names the `review:screens` check that catches it (section 8). Where no machine check exists, the independent reviewer catches it.

| Banned pattern | Caught by |
|----------------|-----------|
| Gradients of any kind (linear, radial, conic), including the generic gradient hero | `banned-gradient` |
| Glass panels and backdrop blur | `banned-glass` |
| Emoji anywhere in the interface, including emoji bullets and emoji icons | `banned-emoji` |
| Striped, textured or shadowed pitches (the stock "grass" look) | `banned-stripes` |
| `transition: all` | `banned-transition-all` |
| Uppercase, letter-spaced eyebrow labels above headings | `banned-eyebrow` |
| Default card grids (three or more identical boxes in a row) | `card-grid` |
| Buttons and links whose text ends in an arrow | `arrow-suffix` |
| Colour literals outside the tokens (hex or `rgb(` in source) | `no-hex-in-source` |
| Any computed colour that is not a token of the active theme | `token-colours` |
| Default chart palettes from a library | `token-colours` and the palette gate (`npm run palette`) |
| Violet or indigo accents, neon on near-black, one accented word in a headline, decorative blobs | the independent reviewer (rubric criterion 5, anti-slop and taste) |
| Text crowded past the 70-character measure, or two elements competing for focus | the independent reviewer (rubric criteria 1 and 3) |
| Autoplay, loops, parallax and scroll-triggered reveals | `reduced-motion` and the independent reviewer |

### Voice

- Plain words, second person or the imperative ("Flip the switch and watch who moves").
- No exclamation marks, no "Oops", no blame, no hype.
- An error names what happened and the next step ("The goal data didn't load. Run npm run data, then reload this page.").
- Curly quotes, the ellipsis character, an en dash in scores ("5–0") and the minus sign (U+2212) for negative numbers.
- No arrows, check marks or less-than-or-equal signs in copy (they are outside the font subset; section 3.2).
- Copy is checked by `copy-lint` inside `review:screens` (check `taste-copy`).

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

This section covers brief section 9.4 (the canonical pitch renderer, coordinate systems, glyphs and the notation legend). It summarises the Phase 3 contract (`.planning/phases/03-pitch-standard-data-pipeline/03-UI-SPEC.md`) and [ADR 0009](decisions/0009-pitch-layer-api.md), which froze the layer API. When the two disagree, ADR 0009 and the code in `src/pitch/` win; change them only through a new decision record.

### One pitch, one coordinate space

- **Canonical metres.** Every visual draws on one `<Pitch>` component (`src/pitch/Pitch.tsx`). Its SVG user space is canonical metres: x from 0 to the pitch length along the touchline, y from 0 to the width, downward. The default pitch is 105 by 68 m; a scene with its own size (for example 100 by 65 m) draws that size.
- **Markings** come from the pure `pitchGeometry(length, width)` with the IFAB Law 1 values (centre circle 9.15 m, penalty area 16.5 m deep and 40.32 m wide, goal area 5.5 m, penalty mark 11 m). Lines are 1.5 px `--pitch-line`, not to scale, centred on the exact coordinate.
- **Provider converters.** StatsBomb (120 by 80), Opta and Wyscout (0 to 100), TRACAB, Metrica and centred tracking metres are converted to canonical metres in one tested module (`src/pitch/coords.ts`). Converted data never carries the provider's axes into a component.
- **One view matrix.** Horizontal is the identity. Vertical, used below 480 px of stage width, is a single group matrix (`matrix(0 -1 1 0 0 L)`) so canonical x runs bottom to top. Data is never rotated; text inside glyphs is counter-rotated to read upright.
- **Pointer input** goes through the inverse of the canonical-root group's screen matrix, so dragging is right in both orientations.
- **Three layers** in one container: a bottom SVG (run-off and field), an optional Canvas layer for dense marks with the same matrix times the device pixel ratio, and a top SVG with the markings and every glyph. Only the top SVG takes pointer events.
- **Scene/Frame format.** Every pitch view reads the same scene file (teams, entities, frames, events, source). Playback is `state = f(t)` on a clock kept outside React; Smooth interpolates, Stepped jumps keyframe to keyframe.
- **Flat field.** One fill (`--pitch-surface`) on a run-off (`--pitch-runoff`): no stripes, gradient, texture or shadow (check `banned-stripes`).

### Glyph registry

The registry (`src/pitch/glyphs/registry.ts`) is the learner's notation vocabulary. Its order is the legend order. An id that is not registered is an error, never a silent draw, and every glyph renders `data-glyph="<id>"`.

| Id | Legend label | Meaning and encoding |
|----|--------------|----------------------|
| `player-a` | Team A player | Filled disc in `--team-a` with the shirt number in `--team-a-ink`, and a 2 px surface-coloured outer ring that separates overlapping discs |
| `player-b` | Team B player | Ring disc: `--team-b-fill` inside a 3 px `--team-b` ring, number in `--team-b-ink` |
| `goalkeeper-a` | Goalkeeper (team A) | Rounded square instead of a disc, team A fill rules |
| `goalkeeper-b` | Goalkeeper (team B) | Rounded square instead of a disc, team B ring rules |
| `ball` | Ball | Small circle, `--ball-fill` with a 2 px `--ball-ring`, drawn above players and offset toward the attacking direction when a player has it |
| `pass` | Pass | 2 px solid line in the acting team's colour; arrowhead filled for team A, hollow for team B |
| `carry` | Carry | 2 px dashed line (`6 4`): the player runs with the ball; same arrowhead rule |
| `run` | Run without the ball | 2 px dotted line (round caps): movement off the ball; same arrowhead rule |
| `shot` | Shot | 3 px solid line ending in an 8 px circle at the target: filled for a goal, hollow for no goal |
| `pressure` | Pressure | 60-degree wedge from the presser toward the player pressed, filled for team A, outline for team B |
| `zone` | Zone | Shaded area in `--zone-fill` at `--zone-fill-opacity`, dashed `--zone-line` border, optional label chip |
| `shape` | Shape line | 2 px line joining the players of one unit, drawn under the players |
| `highlight` | Highlighted | Dashed `--highlight` ring at disc radius plus 4 px around a player or point to look at |
| `annotation` | Note | Short label (at most 40 characters) on a `--label-bg` chip with a `--label-border` edge |
| `point` | Point | A marked spot, such as a tapped answer: an ink cross on a small white circle |
| `density` | Event location (Canvas) | One 3 px dot per event in `--density-mark`, drawn on the Canvas layer |
| `sequence-badge` | Sequence order | The number of each action in a possession chain, 12 px on a 16 px circle with an ink ring |

Event glyphs follow the clock: an event appears once `t` reaches its time, the current event is at full opacity and earlier ones at 0.4. Discs carry the shirt number, as the legend says; a screen that shows position codes instead (GK, CB, ST) must say so in its legend description.

### Sizing

Glyph sizes are screen pixels converted to metres with the live pixels-per-metre and clamped, so a glyph stays legible at 320 px and does not balloon at 1440 px. Positions stay exact metres. Lines use `vector-effect: non-scaling-stroke`.

| Glyph | Rule |
|-------|------|
| Player disc diameter | `clamp(22px, 2.0 m, 28px)`; 22 px is the minimum that fits a 12 px number |
| Ball diameter | `clamp(10px, 1.0 m, 14px)` |
| Arrowhead | 8 px long, 8 px wide |
| Glyph text | 12 px, weight 600, line height 1 (`pitch.glyphText`, `--pitch-glyph-text`). A disc label of two or more letters (a position code or initials) uses the family's condensed width (`font-stretch: 75%`), and one too long even then is squeezed to the disc's inner chord (`textLength`), so the label never crosses the disc edge (`fitLabel` in `src/pitch/glyphs/glyphSize.ts`). Shirt numbers keep the normal width |
| Hit target for a draggable player | at least 22 px on the pitch; controls outside the pitch keep the 44 px rule |

### Legend

- **Always visible.** Every pitch has its Notation legend on the same screen (check `legend-present`). It is never hidden behind hover, never off-screen, and focus mode keeps it.
- **Generated from the scene.** It lists exactly the glyph ids present in the render, in registry order, with team names from the scene. Nobody types a legend by hand.
- **Two states:** expanded (swatch, label and description) and collapsed (swatch and label, never a swatch alone). The empty state reads "No marks to explain yet."
- **Placement:** beside the pitch from 1024 px (the Phase 3 default is a 288 px column; a lesson template may put it at the top of its reading column), and under the pitch or its playback bar below 1024 px.

### Placement rules for badges and chips

- **Sequence badges** (`sequence-badge`) sit the disc radius plus 8 px from their event's start point. The placer tries, in order, the left of the direction of travel, the right, behind the start and ahead of it, and takes the first side that is clear of every player disc and inside the pitch. If no side is clear, it steps further out (1.42 and then 2 times the distance) before falling back to the left side. Placement works in screen space, so the rule holds in both orientations (`src/pitch/glyphs/placement.ts`).
- **Note chips** (`annotation`) are placed in screen pixels after the orientation transform. A chip that would cross an edge of the pitch moves to the other side of its anchor and is then clamped, so it always lies inside the SVG.
- **Known gaps** from the ADR 0010 review, to close before Phase 5 lessons ship: at 375 px in a dense possession chain, badges can touch one another (the placer checks discs, not other badges), and at `t = 0` the ball can sit over a disc's number. The functional pitch-fixes spec (plan 04-17) asserts the badge-to-disc rule in a real browser.

## 5. Interaction component catalogue

This section covers brief section 9.5 (every interaction component with its purpose, controls, learning goal, states, data and accessibility fallback). Phase 4 specifies these components; later phases build them, and the "Built in" line names the phase when the roadmap does.

### Primitives

The building blocks every component reuses. Each has a gallery page showing all its states at 375, 768 and 1440 px in both themes. The gallery is a dev route, left out of the study build.

- Foundations: `colour` ([/dev/gallery/colour](/dev/gallery/colour)), `type` ([/dev/gallery/type](/dev/gallery/type)), `space-radius` ([/dev/gallery/space-radius](/dev/gallery/space-radius)), `icons` ([/dev/gallery/icons](/dev/gallery/icons)), `motion` ([/dev/gallery/motion](/dev/gallery/motion))
- Controls: `button` ([/dev/gallery/button](/dev/gallery/button)), `link` ([/dev/gallery/link](/dev/gallery/link)), `input` ([/dev/gallery/input](/dev/gallery/input)), `select` ([/dev/gallery/select](/dev/gallery/select)), `checkbox-radio-switch` ([/dev/gallery/checkbox-radio-switch](/dev/gallery/checkbox-radio-switch)), `segmented` ([/dev/gallery/segmented](/dev/gallery/segmented)), `slider` ([/dev/gallery/slider](/dev/gallery/slider)), `tabs` ([/dev/gallery/tabs](/dev/gallery/tabs))
- Overlays: `dialog` ([/dev/gallery/dialog](/dev/gallery/dialog)), `alert-dialog` ([/dev/gallery/alert-dialog](/dev/gallery/alert-dialog)), `popover` ([/dev/gallery/popover](/dev/gallery/popover)), `tooltip` ([/dev/gallery/tooltip](/dev/gallery/tooltip)), `toast` ([/dev/gallery/toast](/dev/gallery/toast))
- Lesson: `shell-bar` ([/dev/gallery/shell-bar](/dev/gallery/shell-bar)), `step-rail` ([/dev/gallery/step-rail](/dev/gallery/step-rail)), `focus-toggle` ([/dev/gallery/focus-toggle](/dev/gallery/focus-toggle)), `confusion-button` ([/dev/gallery/confusion-button](/dev/gallery/confusion-button)), `glossary-card` ([/dev/gallery/glossary-card](/dev/gallery/glossary-card)), `quiz-option` ([/dev/gallery/quiz-option](/dev/gallery/quiz-option)), `progress-ring` ([/dev/gallery/progress-ring](/dev/gallery/progress-ring)), `badge` ([/dev/gallery/badge](/dev/gallery/badge)), `surface` ([/dev/gallery/surface](/dev/gallery/surface))
- Data: `stat-card` ([/dev/gallery/stat-card](/dev/gallery/stat-card)), `chart-primitives` ([/dev/gallery/chart-primitives](/dev/gallery/chart-primitives)), `data-table` ([/dev/gallery/data-table](/dev/gallery/data-table)), `scales` ([/dev/gallery/scales](/dev/gallery/scales))
- Pitch: `pitch` ([/dev/gallery/pitch](/dev/gallery/pitch)), `glyphs` ([/dev/gallery/glyphs](/dev/gallery/glyphs)), `legend` ([/dev/gallery/legend](/dev/gallery/legend))
- Interactions: `playback` ([/dev/gallery/playback](/dev/gallery/playback)), `drag` ([/dev/gallery/drag](/dev/gallery/drag)), `converter-probe` ([/dev/gallery/converter-probe](/dev/gallery/converter-probe))

The headless parts (dialog, popover, tooltip, tabs, switch, slider, toggle group, menu, toast) come from `@base-ui/react`, and the generated tokens style them. Radix is never mixed in.

### Interaction components

These rules hold for every entry below:

- Each component is registered with a props schema, an accessibility fallback and a test oracle before a lesson may use it (Phase 5).
- Anything drawn on a pitch uses the Pitch Standard (section 4) and its legend.
- Anything that moves runs on the scene clock and never moves before the learner presses Play.
- Every component that loads data has a loading state (the frame drawn, a "Loading…" status), an empty state with a next step, and an error state that says what failed and how to fix it.
- Data comes from pipeline artifacts with a manifest (`public/data/<dataset>/<version>/`) or from a scene file. Deployable data is CC BY only (Wyscout 2017/18 events, DFL/Sportec). StatsBomb, Metrica, SkillCorner and Last Row stay in the local study build. Wages and valuations are typed in by hand with a source link, never scraped.

#### Tactics Board

- **Purpose**: A pitch the learner arranges by hand to build, compare and save a team shape.
- **Inputs and controls**: Drag players on the Pitch Standard (pointer capture), arrow keys to nudge 1 m and Shift plus arrow for 5 m, a formation picker that morphs the shape, draw tools for runs and passing lanes, and Save and Load buttons.
- **Learning goal**: See how a formation changes spaces and distances, and build a shape from a description.
- **States**: Empty board, preset formation, mid-drag (with a ghost at the start position), morphing, a drawing tool active, a saved scene, a load error ("This board file could not be read").
- **Data needed**: The Scene/Frame format for positions and drawn events, plus a local save slot (IndexedDB in Phase 6). Preset formations are authored scenes, and no provider data is needed.
- **Accessibility fallback**: Every player is a focusable button whose name gives the team, number and position in metres; moves are announced; a table view lists each player's x and y and can be edited.
- **Built in**: Phase 8 (Tactics Board v1).

#### Phase Animator

- **Purpose**: Plays a match sequence frame by frame so the learner can study it at their own speed.
- **Inputs and controls**: The Phase 3 playback bar (previous and next frame, Play, Pause and Replay, a scrubber, speed), plus toggles for the annotation layers (runs, passing lanes, shape lines, notes) that each show for a time range.
- **Learning goal**: Read a phase of play as a cause-and-effect sequence instead of a blur.
- **States**: Paused at the start, playing, paused mid-sequence, at the end (Replay), a single-frame scene ("Still scene — 1 frame"), layers on or off, and Stepped mode under reduced motion.
- **Data needed**: A scene with two or more frames (an open-data reconstruction or an authored scene) and the annotation time ranges.
- **Accessibility fallback**: Keyboard controls inside the stage region, a pause announcement ("Paused at 9.7 seconds") and a step list that describes each frame in text.
- **Built in**: later track; the Phase 3 playback bar is its clock.

#### Zone Explorer

- **Purpose**: Names the pitch zones analysts use and shows what happens in each one.
- **Inputs and controls**: Hover or tap a zone, and use a segmented control to switch the grid between the 18-zone grid, the 5 lanes and the half-spaces.
- **Learning goal**: Know the zone vocabulary and connect each zone to its typical actions.
- **States**: No zone selected, a zone selected (definition card and stats), the grid switched, stats loading, and no events in this zone.
- **Data needed**: Zone polygons in canonical metres, plus event counts per zone from the Wyscout 2017/18 events (shippable) or StatsBomb (local only).
- **Accessibility fallback**: Zones are reachable with Tab and arrow keys in grid order, and a table lists each zone with its definition and counts.
- **Built in**: later track.

#### Shape Comparator

- **Purpose**: Lays a team's in-possession shape over its out-of-possession shape.
- **Inputs and controls**: A Possession segmented control, an overlay switch to show both shapes at once, and toggles for line heights and the distances between lines.
- **Learning goal**: See how a team changes shape with and without the ball, and measure the change.
- **States**: In possession, out of possession, both overlaid, measurements on, and a team with only one shape recorded.
- **Data needed**: Two frames of average positions per phase, either authored from a cited description (as on the tactics sample screen) or derived from tracking where an open set covers it.
- **Accessibility fallback**: The readout states the shape ("Shape now: 3-2-4-1"), a change is announced, and a table gives line heights and gaps in metres.
- **Built in**: later track.

#### Pressing Trigger Trainer

- **Purpose**: Trains the learner to spot the moment a team should press and who should go.
- **Inputs and controls**: A short sequence that pauses itself at a decision point; the learner taps the moment on the scrubber and then taps the pressing player on the pitch.
- **Learning goal**: Recognise pressing triggers (a backward pass, a poor touch, a pass to the touchline) and the player whose job it is to press.
- **States**: Playing up to the pause, waiting for an answer, answered (correct shows a check and "Correct", incorrect shows a cross and "Not quite"), the reveal with the expert answer, and the next clip.
- **Data needed**: Sequences with an authored trigger time and pressing player, each with a source, built from open-data reconstructions.
- **Accessibility fallback**: The pause point is announced, players can be chosen from a list instead of tapped, and the reveal is written out in text.
- **Built in**: later track.

#### Event Inspector

- **Purpose**: Shows one match event three ways at once: the raw data, the pitch and a table.
- **Inputs and controls**: Select a row in the table, a mark on the pitch or a line of the JSON; the other two views follow. Filters by event type and team.
- **Learning goal**: Understand what event data records, and what it leaves out.
- **States**: No event selected, an event selected and linked in all three views, filtered, an empty filter result ("No events in this window"), and a file that failed validation.
- **Data needed**: Pipeline event tables (Wyscout shippable, StatsBomb local). Long matches use a virtualised table.
- **Accessibility fallback**: The table is the primary view with full keyboard support, and selecting a row announces the event in words.
- **Built in**: later track; the Phase 4 data sample screen links table, chart and pitch the same way.

#### Shot Map and xG Playground

- **Purpose**: Lets the learner change a shot and watch its expected-goals value change.
- **Inputs and controls**: Drag the shot location on the pitch, a slider for the angle, a body-part segmented control, a pressure switch, and a calibration explainer that opens in a panel.
- **Learning goal**: Know what drives xG, why it is a probability and not a verdict, and how calibration is checked.
- **States**: Default shot, a dragged shot with the value updating, calibration panel open, and an out-of-range input (clamped and explained).
- **Data needed**: A small xG model with published coefficients trained in the pipeline, the shots it was trained on with outcomes, and the model's calibration table.
- **Accessibility fallback**: Number inputs for x and y, an announced xG value after each change, and a table of the calibration bins.
- **Built in**: later track.

#### xT Grid Lab

- **Purpose**: Shows how much threat each pitch cell holds and how much a pass adds.
- **Inputs and controls**: Hover or tap a cell to read its value, and drag a pass from one cell to another to see the xT added.
- **Learning goal**: Understand expected threat as a value surface, and value a pass by where it moves the ball.
- **States**: Grid at rest, a cell selected, a pass being dragged, a pass completed with its value, and the grid recomputing.
- **Data needed**: An xT grid computed in the pipeline (socceraction) from open event data, with its grid size and data source in the manifest.
- **Accessibility fallback**: Cells are keyboard-reachable with their values read aloud, and the pass is set by choosing a start cell and an end cell from two lists.
- **Built in**: later track.

#### Pitch Control Live

- **Purpose**: Shows which team controls each part of the pitch, frame by frame, and how moving a player changes it.
- **Inputs and controls**: Drag a player on a tracking frame, step through frames with the playback bar, and a switch for the control surface.
- **Learning goal**: Understand space as something players create and take away, and why off-ball positioning matters.
- **States**: A frame with the surface, a player being dragged with the surface recomputing in a worker, the surface hidden, and a frame still computing.
- **Data needed**: Open tracking frames. The shippable choice is DFL/Sportec (Bundesliga, CC BY); Last Row's Liverpool goals stay local. No open Premier League tracking is shippable. The surface is computed in a Web Worker on a 1 m grid.
- **Accessibility fallback**: A text summary gives the share of the pitch each team controls and what changed after a move; players can be moved by keyboard.
- **Built in**: later track.

#### Pass Network Builder

- **Purpose**: Turns a team's passes in a match into a network of positions and links.
- **Inputs and controls**: Pick a match and a team, set a time window with a two-thumb slider, and set a minimum number of passes per link.
- **Learning goal**: Read a team's structure, its key connectors and its weak links from passing data.
- **States**: Network drawn, window changed, threshold too high ("No links at this threshold, lower it to see more"), and loading a match.
- **Data needed**: Pass events with passer and receiver (Wyscout 2017/18 Premier League, shippable), plus average positions per player for the window.
- **Accessibility fallback**: A table of pass counts between pairs of players, sorted by count, and a text summary of the strongest links.
- **Built in**: later track.

#### Radar/Pizza Builder

- **Purpose**: Builds a percentile radar for a player and shows how the comparison pool changes it.
- **Inputs and controls**: Pick a player, choose the metrics, choose the comparison pool (position, league, minimum minutes), and switch between a radar and a pizza chart.
- **Learning goal**: Read percentiles correctly and see why the comparison pool matters as much as the player.
- **States**: Chart drawn, pool changed with the shapes morphing, a pool too small ("Fewer than 30 players, so percentiles are unstable"), and a metric missing for the player.
- **Data needed**: Per-90 metric tables per player with minutes played, from open event data, and the pool definition in the manifest.
- **Accessibility fallback**: A table of metric, raw value and percentile, with the pool named above it.
- **Built in**: later track.

#### Metric Noise Lab

- **Purpose**: Shows how unstable a metric is when it rests on few minutes.
- **Inputs and controls**: A sample-size slider (minutes played) and a metric picker; the chart redraws repeated samples at that size.
- **Learning goal**: Know that small samples lie, and roughly how many minutes a metric needs before it means something.
- **States**: Small sample with a wide spread, large sample with a narrow spread, and metric changed.
- **Data needed**: Per-match player metrics from open event data, resampled in the browser or pre-computed in the pipeline.
- **Accessibility fallback**: The interval and "n =" are written under the chart and announced when the slider stops.
- **Built in**: later track.

#### Role Signature Explorer

- **Purpose**: Shows what a role looks like in actions on the pitch, and finds players who play it similarly.
- **Inputs and controls**: Pick a role and a player, toggle the action heatmap, and open "find similar players".
- **Learning goal**: Connect a role description to the actions and locations that define it.
- **States**: Role selected, a player's heatmap shown, similar players listed, and too few minutes for a reliable signature.
- **Data needed**: The role definitions from the research registry, per-player action locations, and a similarity model computed in the pipeline.
- **Accessibility fallback**: A list of the top action zones with counts, and the similar players as a ranked table with similarity scores.
- **Built in**: later track.

#### Role KPI Explorer

- **Purpose**: Gives each role its key stats, with a percentile scale and a pitch animation of what each stat looks like.
- **Inputs and controls**: Pick a role, tap a stat to open its percentile scale (good, elite, worrying), and play the short animation of the stat in a match.
- **Learning goal**: Know which numbers matter for which role, and why.
- **States**: Role overview, a stat opened, animation playing or paused, and a stat with no open-data source (labelled, not faked).
- **Data needed**: Role-to-KPI mapping from the role registry, percentile tables, and one authored or reconstructed scene per stat.
- **Accessibility fallback**: Each stat card has a text "why it matters" and the percentile bands as numbers; the animation has a step list.
- **Built in**: later track.

#### Stat Lie Detector

- **Purpose**: Gives the learner a player who looks great or terrible on one stat and asks whether that is real.
- **Inputs and controls**: Open evidence cards (context, team style, minutes, comparison pool), then choose "real" or "misleading" and give a reason.
- **Learning goal**: Question a headline number before trusting it.
- **States**: The claim shown, evidence cards opened one by one, a verdict submitted, and the reveal with the full reasoning.
- **Data needed**: Authored cases built on open-data numbers, each with its source and the hidden context.
- **Accessibility fallback**: The cards are a list of buttons, and the verdict is a radio group with a text box for the reason.
- **Built in**: later track.

#### Player vs Player Court

- **Purpose**: Puts two players in the same role side by side and asks the learner to argue for one.
- **Inputs and controls**: Pick two players, add numbers and pitch clips to a case board by dragging or with an "Add" button, write the argument, and submit it to a rubric.
- **Learning goal**: Build a balanced case from numbers and pitch evidence together.
- **States**: Empty case board, evidence added, argument written, rubric feedback, and a model argument for comparison.
- **Data needed**: Per-player metrics and short scenes for both players, plus the rubric.
- **Accessibility fallback**: Evidence is added from lists, the board is a reorderable list, and rubric feedback is text.
- **Built in**: later track.

#### Signal vs Noise Meter

- **Purpose**: Shows how repeatable each stat is from season to season and how many minutes it needs.
- **Inputs and controls**: Pick a stat to see its season-to-season correlation, and a minutes slider shows where it becomes trustworthy.
- **Learning goal**: Tell stable skills from noise.
- **States**: A stat selected, the slider moved, a stat with too few seasons of data, and a comparison of two stats.
- **Data needed**: Multi-season player metrics from open data; where open data covers too few seasons, published values with a source.
- **Accessibility fallback**: A table of stat, repeatability and minutes needed, with the interval written out.
- **Built in**: later track.

#### Squad Planner

- **Purpose**: Plans a squad by position and role over several seasons.
- **Inputs and controls**: A depth chart where players are dragged into positions, an age-curve view, a contract-expiry timeline, and a succession plan for each position.
- **Learning goal**: Think about a squad as a plan over time, not a list of names.
- **States**: An empty plan, a filled depth chart, a gap flagged (no successor, an expiring contract), and the timeline scrolled to a later season.
- **Data needed**: The squad list with ages and contract end dates typed in with a source, and generic age curves from published research.
- **Accessibility fallback**: Positions are lists with move buttons, and gaps are listed in text.
- **Built in**: later track.

#### Scouting Report Builder

- **Purpose**: A report template that combines data, video notes and character into one scouting report.
- **Inputs and controls**: Sections to fill (profile, data, video evidence, character, verdict), notes dropped in from the Player Scout Card and the Video Note Player, and a grading scale.
- **Learning goal**: Write a professional scouting report that separates evidence from opinion.
- **States**: Blank template, partly filled, complete, and exported.
- **Data needed**: The learner's own notes and grades, plus player metrics from open data where they exist.
- **Accessibility fallback**: A plain form with labelled fields; dropped-in items can also be added from a list.
- **Built in**: later track.

#### Transfer Deal Builder

- **Purpose**: Turns a transfer's terms into a year-by-year cost and an affordability check.
- **Inputs and controls**: Fields for the fee, instalments, add-ons, sell-on, wage, contract length and agent fee, with sliders for the main ones.
- **Learning goal**: Understand amortisation, the profit and loss effect of a signing, and how a squad-cost rule limits a deal.
- **States**: Default deal, edited deal with the charts updating, a deal that fails the squad-cost check (with the reason), and invalid input.
- **Data needed**: The deal terms the learner sets, the amortisation rules, and the Premier League squad-cost rule with its effective date and as-of date.
- **Accessibility fallback**: The year-by-year table is the primary view, and the affordability result is written in words.
- **Built in**: later track.

#### Player Price Lab ("set the number")

- **Purpose**: Lets the learner set an asking price and a walk-away price for a real player.
- **Inputs and controls**: Sliders for age, contract years left, form, league and buyer type; the estimated value range moves. Fields for the asking and walk-away prices, and a list of similar past deals.
- **Learning goal**: See what drives a player's price and how uncertain any valuation is.
- **States**: Default player, adjusted inputs, a price outside the model's range (flagged), and the comparison with past deals.
- **Data needed**: A simple valuation model with its uncertainty, and past deal values typed in by hand with a source link (never scraped).
- **Accessibility fallback**: The value range and the interval are written out and announced, and past deals are a table.
- **Built in**: later track.

#### Sell-or-Keep Simulator

- **Purpose**: Weighs selling a player now against keeping him, over time.
- **Inputs and controls**: A time slider across the player's age curve and value curve, a contract-expiry countdown, and a replacement-cost field; the learner decides sell or keep.
- **Learning goal**: Balance sporting value, book value, profit on sale and replacement cost in one decision.
- **States**: The timeline at today, moved forward, a decision made with its consequences shown, and a contract running out with no sale.
- **Data needed**: Age-curve and value-curve shapes from published research, plus the player's contract and book value typed in with sources.
- **Accessibility fallback**: A table of each season's value, book value and profit on sale, with the consequence in text.
- **Built in**: later track.

#### Wage Structure Builder

- **Purpose**: Designs a squad's wage structure and tests a new signing against it.
- **Inputs and controls**: Wage bands, bonuses and escalators set with fields and sliders; a new signing is dropped into a band.
- **Learning goal**: Understand wage hierarchy, dressing-room fairness, the wage-to-revenue ratio and the squad-cost rule.
- **States**: Default structure, a signing added, a hierarchy breach flagged, and a ratio over its limit.
- **Data needed**: Learner-set wages, an illustrative revenue figure, and the squad-cost rule with dates. Real wages are never scraped.
- **Accessibility fallback**: The hierarchy is an ordered table, and the ratio and breaches are written in text.
- **Built in**: later track.

#### Negotiation Simulator

- **Purpose**: A role-play of buying or selling a player against an AI club or agent with hidden limits.
- **Inputs and controls**: A chat-style exchange of offers and counter-offers, with offer fields for fee, add-ons and wage, and a walk-away button.
- **Learning goal**: Practise anchoring, concessions and walking away, then see what was left on the table.
- **States**: Opening, offers exchanged, deal agreed, walked away, and the debrief that reveals the hidden limits.
- **Data needed**: Authored scenarios with hidden limits, plus an AI model call made only where the learner has set one up.
- **Accessibility fallback**: The exchange is a text log read in order, and every offer is a labelled form field.
- **Built in**: later track.

#### Regulation Navigator

- **Purpose**: Visual flowcharts for transfer and squad rules.
- **Inputs and controls**: A flowchart where each yes or no answer moves to the next step, covering the RSTP, loans, solidarity and training compensation, and the Premier League squad-cost, sustainability and squad rules.
- **Learning goal**: Know which rule applies in a situation and what it requires.
- **States**: At the start, part-way along a path, at an outcome, and a rule marked as changed since the as-of date.
- **Data needed**: Each rule paraphrased from its official document, with the source, the effective date and the as-of date.
- **Accessibility fallback**: The flowchart is also a numbered question list, and the outcome is written in text.
- **Built in**: later track.

#### Session Designer

- **Purpose**: Designs a training drill on a canvas with constraints linked to a game model.
- **Inputs and controls**: Draw the area, place players, cones and goals, and set constraints (space, numbers, touches, scoring rules) with fields; link each constraint to a game-model principle.
- **Learning goal**: Design a session that trains a principle through its constraints.
- **States**: Blank canvas, drill drawn, constraints set, a saved session, and a constraint with no linked principle (flagged).
- **Data needed**: The learner's drill saved as a scene, and the game-model principles from the curriculum.
- **Accessibility fallback**: The drill can be built from a form (area size, player counts, rules), and a text description is generated.
- **Built in**: later track.

#### Load Monitor

- **Purpose**: A weekly training-load chart with periodization overlays.
- **Inputs and controls**: Enter or edit session loads, switch overlays (planned against actual, match days), and pick the metric.
- **Learning goal**: Read training load over a week and a season, and know which load metrics are debated.
- **States**: Empty week, a week filled, an overlay on, and a debated metric selected (labelled "contested" with both views).
- **Data needed**: Illustrative or learner-entered loads. No open Premier League physical data exists, so nothing is presented as real club data.
- **Accessibility fallback**: A table of days and loads, with the contested labels in text.
- **Built in**: later track.

#### Decision Simulator

- **Purpose**: Branching sporting-director scenarios with consequences.
- **Inputs and controls**: A scenario card with two to four choices, a consequence screen after each choice, and a path map at the end.
- **Learning goal**: Practise decisions under trade-offs and see second-order effects.
- **States**: Scenario start, a choice made, a consequence shown, the end of the branch, and a replay of another branch.
- **Data needed**: Authored scenario trees with sources for every factual claim.
- **Accessibility fallback**: Choices are a radio group, and the path map is also an ordered list.
- **Built in**: later track.

#### Concept Map

- **Purpose**: An interactive map of every concept in the course and how they connect, with mastery shown.
- **Inputs and controls**: Pan and zoom, tap a concept for its card, filter by track or role, and jump to the lesson.
- **Learning goal**: See where a concept sits, what it needs first and what it unlocks.
- **States**: Whole map, a concept focused with its neighbours, filtered, and mastery states (new, shaky, known) shown with text labels and icons as well as colour.
- **Data needed**: The concept graph from the research registry and the learner's mastery from the progress store.
- **Accessibility fallback**: A searchable nested list of tracks and concepts with prerequisites and mastery in text.
- **Built in**: later track.

#### Python Cell

- **Purpose**: In-browser Python with football data preloaded, in the same visual style as the rest of the app.
- **Inputs and controls**: A code editor, Run and Stop buttons, a reset, and an output area for text, tables and charts.
- **Learning goal**: Practise the analysis code a data scientist writes, on real football data.
- **States**: Loading Python (with progress), ready, running, output shown, an error with its line, and stopped.
- **Data needed**: Pyodide in a module worker, plus small Parquet or JSON artifacts loaded into its file system per match. Packages not bundled with Pyodide are not available.
- **Accessibility fallback**: The editor is fully keyboard-operable, output tables are real tables, and chart output has a text summary.
- **Built in**: later track.

#### Video Note Player

- **Purpose**: Plays the learner's own clips or YouTube embeds, with time-stamped tags and drawings.
- **Inputs and controls**: Play, pause, seek and frame step, a tag button that stamps the current time, and a drawing panel beside the video.
- **Learning goal**: Capture observations at the moment they happen, tied to the footage.
- **States**: No video chosen, local file playing, YouTube embed playing, a tag added, drawing on, and a source that failed to load.
- **Data needed**: A local file picked by the learner (never copied into the repo) or a YouTube embed. Drawings never sit on top of a YouTube player (API policy); they go on a pitch panel beside it, or over local video only.
- **Accessibility fallback**: The tag list is a table of time and note, every control has a keyboard shortcut, and captions are used when the source has them.
- **Built in**: later track.

#### Watch Gym Player

- **Purpose**: Clip playback with a mission, pause-and-predict prompts and answers given on a pitch panel.
- **Inputs and controls**: A mission card (one to three things to watch), automatic pauses at prompts, tap-on-pitch answers on a schematic panel, a toggle for a "where to look" coaching overlay, and a block timer for longer watches.
- **Learning goal**: Rebuild how the learner watches a match, from following the ball to reading the whole picture.
- **States**: Mission shown, playing, paused for a prompt, answered, the reveal, the block timer running, and a single clip as a one-tap low-energy session.
- **Data needed**: Open-data reconstructions or the learner's local clip, with an authored mission and answers in the Watch Gym data model.
- **Accessibility fallback**: The prompt is text, the answer can be chosen from a list of players or zones, and the reveal is written out.
- **Built in**: Phase 8 (Watch Gym Level 1).

#### Live Watch Notebook

- **Purpose**: A quick note template for watching a full match, which turns into a report draft afterwards.
- **Inputs and controls**: One-tap tags by phase (build-up, press, transition, set piece, key player), each stamped with the match minute, plus a short free note.
- **Learning goal**: Keep structured notes while watching live, without losing the match.
- **States**: Before kick-off, notes being taken, half time, full time, and the report draft generated.
- **Data needed**: The learner's notes only, stored locally.
- **Accessibility fallback**: Large keyboard-operable tag buttons, and the note list read in order.
- **Built in**: later track.

#### Report Writer

- **Purpose**: Templates for tactical, opposition, post-match and scouting reports, with scaffolding that fades.
- **Inputs and controls**: A template picker, sentence starters, a checklist, clips and stills dragged in, rubric self-scoring, and a model answer to compare against.
- **Learning goal**: Write analysis reports to a professional standard, moving from fill-in-the-blanks to a blank page.
- **States**: Template chosen, scaffolded (full, partial, none), draft in progress, self-scored, and compared with the model answer.
- **Data needed**: Templates, rubrics and model answers authored per report type, plus the learner's clips and notes.
- **Accessibility fallback**: A plain text editor with headings, and clips added from a list with their time stamps.
- **Built in**: later track.

#### Speak-It Coach

- **Purpose**: Records the learner explaining something out loud and checks the structure afterwards.
- **Inputs and controls**: A structure prompt (60-second summary, three key points, coach briefing), Record and Stop, a timer, playback, and a rubric checklist.
- **Learning goal**: Explain football ideas clearly and briefly, as a coach or analyst must.
- **States**: Ready, microphone permission asked, recording, recorded, playing back, rubric filled, and microphone blocked (with how to allow it).
- **Data needed**: The audio Blob stored locally in IndexedDB, never uploaded.
- **Accessibility fallback**: A written answer can replace the recording, and the timer is announced at set points.
- **Built in**: later track.

#### Player Scout Card

- **Purpose**: Tracks one player for 90 minutes across on-ball, off-ball, scanning, decision and character signals.
- **Inputs and controls**: Tally buttons per category, a grading scale, and short notes with the match minute.
- **Learning goal**: Watch one player instead of the ball, and grade what you see.
- **States**: Before kick-off, tracking, half time, full time with the grades, and sent to the Scouting Report Builder.
- **Data needed**: The learner's tallies and grades only.
- **Accessibility fallback**: The tallies are labelled counter buttons with their values read aloud.
- **Built in**: later track.

#### Role Map and Readiness Meter

- **Purpose**: Shows every senior role, its path through the concept map, its competency mastery and portfolio status.
- **Inputs and controls**: Pick a role to see its highlighted path, its competencies with mastery, and its portfolio items.
- **Learning goal**: See what each career role needs and how far along the learner is.
- **States**: Overview of all roles, a role selected, the path highlighted, and readiness shown as text and a meter.
- **Data needed**: The role and competency registries, and the learner's mastery and portfolio from the progress store.
- **Accessibility fallback**: A list of roles, each with its competencies and status in text.
- **Built in**: Phase 7 (Role Map overview); the readiness meter later.

#### Matchday Command Centre (head coach)

- **Purpose**: A live simulated match where the learner makes shape changes and substitutions.
- **Inputs and controls**: A match clock with pause, momentum and fatigue panels, live data feeds, a shape changer and a substitutes bench; after the match, a comparison with the expert's choices.
- **Learning goal**: Make in-game decisions under time pressure from data and what the pitch shows.
- **States**: Pre-match, live, paused for a decision, a change made, full time, and the expert debrief.
- **Data needed**: Real event and tracking sequences stitched into a scenario, with authored decision points and expert choices.
- **Accessibility fallback**: The match pauses at every decision, state is given as text, and every change is made through forms.
- **Built in**: later track.

#### Microcycle Planner

- **Purpose**: Plans a training week, or a two-game week, of loads, tactical sessions, analysis meetings and recovery.
- **Inputs and controls**: A week grid where sessions are dragged into days, a load per session, and match markers.
- **Learning goal**: Balance load, tactics and recovery across a week.
- **States**: Empty week, planned week, an overload flagged, and a two-game week.
- **Data needed**: Session types from the curriculum and learner-entered loads.
- **Accessibility fallback**: Days are lists with add and move buttons, and flags are written in text.
- **Built in**: later track.

#### Team Talk and Press Conference Simulator

- **Purpose**: Practises team talks and press conferences on match scenarios.
- **Inputs and controls**: A scenario card, then the learner speaks (recorder) or writes; an AI plays the journalist or the player and asks follow-ups; a rubric gives feedback.
- **Learning goal**: Communicate under pressure with the right message for each audience.
- **States**: Scenario shown, answering, a follow-up asked, the rubric shown, and AI unavailable (falls back to written prompts).
- **Data needed**: Authored scenarios and rubrics, plus an AI model call only where the learner has set one up.
- **Accessibility fallback**: A written mode with the same prompts and rubric.
- **Built in**: later track.

#### Analysis Department Workflow Board

- **Purpose**: The pre-match, in-match and post-match deliverables of an analysis department on one timeline.
- **Inputs and controls**: A timeline board where deliverables are dragged to a day, with an owner and a deadline set for each.
- **Learning goal**: Know who produces what, when, in a professional analysis department.
- **States**: Template week, edited, a missed deadline flagged, and a deliverable with no owner.
- **Data needed**: The deliverable list and roles from the role registry.
- **Accessibility fallback**: A table of deliverable, owner and deadline that can be edited.
- **Built in**: later track.

#### ML Model Lab

- **Purpose**: Trains simple football models in the browser with visual explanations.
- **Inputs and controls**: Pick a task (clustering roles, an xG model, player projection), pick the features, set the main parameters with sliders, and run training.
- **Learning goal**: Understand features, validation and error in football models, and where they mislead.
- **States**: Data loaded, features chosen, training, trained with validation results, overfit flagged, and an error.
- **Data needed**: Small prepared datasets from the pipeline, with Python models in Pyodide or the JavaScript equivalent.
- **Accessibility fallback**: Results as tables (confusion matrix, feature weights, errors) with text summaries.
- **Built in**: later track.

#### Computer Vision Demo

- **Purpose**: Shows how broadcast pixels become pitch coordinates.
- **Inputs and controls**: Step through sample frames, toggle the detection boxes, and toggle the homography to see the frame mapped onto the Pitch Standard.
- **Learning goal**: Understand detection and homography, and why tracking from broadcast has errors.
- **States**: Raw frame, boxes on, mapped to the pitch, and a frame where the mapping fails (explained).
- **Data needed**: Sample frames with an open licence and their pre-computed detections and homography.
- **Accessibility fallback**: A text description per frame and a table of detected players with pitch coordinates.
- **Built in**: later track.

#### AI Scout Assistant Lab

- **Purpose**: An AI drafts a scouting report from data, and the learner fact-checks it.
- **Inputs and controls**: Generate the draft, highlight claims, mark each as supported or not against the data panel, and submit.
- **Learning goal**: Use AI as an assistant and catch its hallucinations.
- **States**: Draft generated, claims marked, all checked, the score with missed errors shown, and AI unavailable (falls back to a stored draft).
- **Data needed**: Player data from open sources, and a stored or generated draft with known planted errors.
- **Accessibility fallback**: Claims are a list with a supported or not radio pair each.
- **Built in**: later track.

#### Data Department Builder

- **Purpose**: Picks providers, tools, hires and a budget, then shows what questions the department can answer.
- **Inputs and controls**: Choose providers, tools and hires from lists, set the budget, and see a question list turn answerable or not.
- **Learning goal**: Understand what a club data department costs and what each piece buys.
- **States**: Empty department, a build in progress, over budget, and the answerable-question view.
- **Data needed**: An authored catalogue of provider types, tools and roles with illustrative costs, labelled as illustrative.
- **Accessibility fallback**: A form and a table of questions with answerable status in text.
- **Built in**: later track.

#### Org Chart and Budget Builder (sporting director)

- **Purpose**: Designs the football department, its staff costs and its reporting lines.
- **Inputs and controls**: Drag roles into an org chart, draw reporting lines, and set salaries against a budget.
- **Learning goal**: Design a football department a sporting director could defend.
- **States**: Empty chart, roles placed, a reporting line missing, over budget, and saved.
- **Data needed**: The role registry and learner-set costs.
- **Accessibility fallback**: The chart is a nested list with move buttons, and the budget is a table.
- **Built in**: later track.

#### Coach Hiring Lab

- **Purpose**: Profiles head-coach candidates with data and runs a structured interview.
- **Inputs and controls**: A candidate list, profile panels (team style, results against expected, player development), and an interview with scored questions.
- **Learning goal**: Hire a coach on evidence that fits the club's model.
- **States**: Candidates listed, a profile open, interviewing, scored, and the shortlist.
- **Data needed**: Team-level metrics from open data for the candidates' past teams, and authored interview questions.
- **Accessibility fallback**: Profiles are tables, and the interview is a form.
- **Built in**: later track.

#### Academy Pathway Planner

- **Purpose**: Plans age groups, player progression, loans and first-team minutes targets.
- **Inputs and controls**: A pathway board by age group, players moved between groups or out on loan, and minutes targets set per season.
- **Learning goal**: Understand how an academy turns players into first-team value.
- **States**: Current pathway, a player moved, a minutes target missed, and a loan in progress.
- **Data needed**: Illustrative or learner-entered academy data, labelled as illustrative.
- **Accessibility fallback**: Age groups are lists with move buttons, and targets are a table.
- **Built in**: later track.

#### Club P&L Dashboard (CEO)

- **Purpose**: Shows a club's revenue streams, costs and squad-cost position, with scenario sliders.
- **Inputs and controls**: Scenario sliders and switches (relegation, a European run, a new sponsor) that redraw revenue, costs and the squad-cost ratio.
- **Learning goal**: Read a club's finances and see how sporting results move them.
- **States**: Baseline, a scenario applied, the squad-cost limit breached, and a scenario reset.
- **Data needed**: Published club accounts typed in by hand with sources and dates, and the squad-cost rule with its effective date.
- **Accessibility fallback**: The figures are tables and every change is summarised in text.
- **Built in**: later track.

#### Quiz / Flashcards / Spaced-Repetition Review

- **Purpose**: Retrieval practice with visual question types and a spaced review queue.
- **Inputs and controls**: Tap on the pitch, arrange a shape, order a sequence, multiple choice and short recall, each graded and scheduled; a capped daily queue.
- **Learning goal**: Remember what was learned, by recalling it on spaced days.
- **States**: Question shown, answered, correct (check and "Correct"), incorrect (cross and "Not quite — here is the answer"), revealed, queue done for today, and a welcome-back state after a break with no backlog count.
- **Data needed**: Items from the lesson specs, and FSRS card and review-log state in IndexedDB with the model version stored on each card.
- **Accessibility fallback**: Every visual question has a keyboard and list-based answer mode, and feedback is text plus icon, never colour alone.
- **Built in**: Phase 6 (retrieval and review queue).

## 6. Lesson templates

This section covers brief section 9.6 (page layouts for the concept, simulation, data lab, case study, regulation, review and capstone lessons). Every template uses the floodlit stage composition from section 2. That means the 56 px top bar (wordmark, lesson time, Focus mode, "I'm confused here", Theme), then the Lesson Loop step rail, then the visual, which is the largest region at every width. One primary button per screen sits at the foot of the reading column.

Shared rules for every template:

- **Widths.** 375 px is one column (pitch vertical, step rail compact: "Touch it, step 3 of 7" with a 7-segment bar). 768 px is one column with the step rail as a horizontal strip. 1440 px is the stage grid: step rail left (200 px, sticky), visual centre, reading column right (320 to 360 px).
- **Focus mode** hides the step rail, lesson time, source line and Theme button. It keeps the step heading, body, visual, legend, controls, primary button, focus switch and "I'm confused here".
- **Reading order equals visual order.** The DOM order is the order listed below for each width, so keyboard and screen-reader users meet the regions in the same order.
- **Region names used below:** title (`h1` and context line), step (step heading `h2` and body of at most 60 words), visual (pitch, chart or simulation stage, with its playback bar), controls (the step's inputs), readout (live result), legend (Notation), source (source line) and CTA (primary button).

### Concept

- **Hosts:** Hook, See it, Touch it and Predict for one idea (a shape, a role, a law).
- **Reference:** the floodlit tactics screen, `/dev/directions/floodlit/tactics` (Lesson Loop step 3, Touch it).
- **375:** top bar, compact step line, title, step heading, visual (vertical pitch), controls full width, readout, body, legend (1 column), source, CTA full width.
- **768:** top bar, step strip, title, visual (horizontal pitch, about 720 px), controls and readout in one row, step, legend (2 columns), source, CTA full width.
- **1440:** top bar; grid `200px minmax(0,1fr) 320px`. Left: the step rail. Centre: title, visual (about 840 px wide), and the controls and readout centred under it. Right: step, legend, source, and the CTA at the column foot.

### Simulation

- **Hosts:** Touch it, Predict and Do it, where the learner changes a model and watches the result (xG Playground, Pitch Control Live, Metric Noise Lab).
- **375:** top bar, compact step line, title, step heading, visual (the simulation stage), readout directly under it, controls (sliders and toggles stacked, 44 px targets), body, legend, source, CTA.
- **768:** top bar, step strip, title, visual, then controls (left) and readout (right) in a two-column row, step, legend (2 columns), source, CTA.
- **1440:** top bar; grid `200px minmax(0,1fr) 360px`. Left: the step rail. Centre: title, the visual at full stage width, and the readout under it. Right: step, controls grouped under a heading, legend, source, CTA. The controls sit beside the visual, so each change can be seen without scrolling.
- **Predict:** before a reveal the controls lock, the learner commits a guess, and the answer marker then draws in over `--duration-draw`.

### Data lab

- **Hosts:** See it, Touch it and Do it, with real data (event tables, metrics, charts linked to the pitch).
- **Reference:** the floodlit data screen, `/dev/directions/floodlit/data` (Lesson Loop step 2, See it).
- **375:** compact step line, title, step heading, visual (vertical pitch and its playback bar), stat card (figures stacked in one panel), body, chart (343 px wide), table (3 columns, no sideways scroll), legend, source, CTA.
- **768:** step strip, title, context, visual and playback bar, stat card (figures in a row), step, chart, table, legend (2 columns), source, CTA.
- **1440:** grid `200px minmax(0,1fr) 360px`. Left: the step rail. Centre: title, context, visual and playback bar, and the chart at full stage width. Right: step, stat card (figures stacked), event table, legend, source, CTA.
- **Linking:** the chart, the table and the pitch select the same event (section 7). Data credit (provider and licence) is always in the source line.

### Case study (scrollytelling)

- **Hosts:** Hook, See it and Connect it, through a real match story told in short text steps beside one visual.
- **375:** title, then text steps (each 60 words or fewer), each followed by its own static visual state. Nothing is sticky, so the text never covers the visual.
- **768:** title; the visual is sticky at the top (at most 50 % of the viewport height), with the text steps scrolling under it.
- **1440:** title across the stage; the visual is sticky in the centre column, with the text steps in the right reading column and the step rail left.
- **No scroll-triggered motion.** Scrolling alone never animates or reveals anything. Each step has a "Show this on the pitch" button, or its state is set when the learner presses Next, and the visual then changes with the normal motion rules. Under reduced motion the change is instant.

### Regulation

- **Hosts:** See it, Do it and Lock it in, for a law or a rule (offside, transfer rules, squad-cost rules).
- **Date line:** every regulation screen shows a date line under the title: "Effective from {date} · As of {date}", with the official source in the source line. A rule that changed after its as-of date is flagged on the screen.
- **375:** title and date line, compact step line, step heading, visual (a flowchart from the Regulation Navigator or a pitch situation), controls (the yes or no answers), body, source, CTA.
- **768:** title and date line, step strip, visual, then controls and the outcome readout in one row, step, source, CTA.
- **1440:** grid `200px minmax(0,1fr) 360px`. Left: the step rail. Centre: title, date line and visual. Right: step, the rule card (the rule paraphrased in plain words, with a link to the official text), controls, readout, source, CTA.

### Review

- **Hosts:** Lock it in, outside a lesson: the spaced-repetition queue.
- **Queue rules:** the queue is capped per day; one card fills the screen; there is no backlog count and no "you missed" message. After a break, a warm "welcome back" card offers one easy first step, and the overflow is quietly rescheduled. A 3 to 5 minute low-energy session counts as a full day.
- **375:** top bar, progress as text ("Card 4 of 12 today"), card (question with its visual), answer controls, feedback (icon and words), Next.
- **768:** the same order, with the card's visual at up to 720 px.
- **1440:** a centred column of at most 720 px holding the card, controls and feedback. No step rail (a review is not a Lesson Loop), and a quiet "Stop for today" link at the top right.

### Capstone

- **Hosts:** Do it and Connect it at the end of a chapter or track: a brief, real work and a rubric (a scouting report, an opposition analysis, a deal).
- **375:** title, the brief (what to produce, by what standard), the workspace (the relevant component from section 5), the rubric as a checklist, submit, then the model answer for comparison.
- **768:** title, brief, workspace, and the rubric under the workspace; the model answer opens beside the learner's work in two columns after submitting.
- **1440:** grid `200px minmax(0,1fr) 360px`. Left: the chapter steps. Centre: the workspace at full stage width. Right: the brief, rubric and submit. After submitting, the right column shows the model answer and the self-score.

## 7. Data-viz standards

This section covers brief section 9.7 (chart choice, axis and label rules, annotation style and uncertainty display). Charts follow the same rules as the pitch: one idea, labels next to the marks, nothing that relies on colour alone.

### Form choice

Pick the form from the question, not from the data:

| The question | The form |
|--------------|----------|
| How do a few values compare? | Bars (horizontal when the labels are long) |
| How does a value change over time or over a sequence? | A line, or bars when the steps are discrete actions |
| How are values spread? | A dot strip or a histogram, never a pie |
| How do two measures relate? | A scatter with direct labels on the points that matter |
| Where on the pitch? | The Pitch Standard (dots, zones, density), never a chart pretending to be a pitch |
| Parts of a whole | A single stacked bar, at most five parts |
| A player profile against a pool | A percentile radar or pizza with the pool named (section 5, Radar/Pizza Builder) |

No 3D, no donut or pie for comparisons, no dual axes, no decorative chart junk.

### Colour by job

Colour comes only from the data scales in section 3.1, chosen by job: categorical for identity, sequential for magnitude, diverging for polarity around a meaningful middle. A series about a team wears that team's colour (categorical slots 1 and 2). More than three series fold into "Other" or become small multiples. Accent is never a chart mark. Grey (`--data-cat-other`) is for context, colour for the thing the learner should look at.

### Axes and labels

- **One axis per chart.** Never two y-axes on one chart; split it into two charts that share the x-axis.
- **Bars start at zero.** A bar's length is its value, so a bar axis always includes zero; a negative value goes below the zero line. Lines and dots may use a tighter range, and the axis says so.
- **Label the axis with its unit and direction** in words ("Metres toward Liverpool's goal"), in the label size, in ink-muted.
- **Few gridlines**, in a quiet tone, at round steps (for example every 10 m). No border around the plot.
- **Numbers** use the mono face with tabular numerals, one sensible precision for the whole chart, the minus sign U+2212 and a unit.
- **Direct labels instead of legends** when there are three series or fewer. A single-series chart has no legend box; its title names the series.

### Annotation

Put the explanation on the chart, next to the mark it explains, not in a distant paragraph. Direct labels go on at most two marks per chart: the ones the step is about. An annotation is short (a value and what it means), uses the label size, and never covers another mark.

### Uncertainty

- Show an interval whenever one exists: an interval bar on a point, a band around a line. A point estimate is never shown alone when its interval is known.
- Always show the sample size as "n =" next to the chart or in its caption.
- Small samples say so in words ("Fewer than 30 players, so percentiles are unstable"), and the Metric Noise Lab (section 5) teaches why.
- Model outputs (xG, xT, valuations) are labelled as estimates, with the model and its data source in the source line.

### Hover layer and table view

- **Hover and focus** show the same tooltip: a short title, the mark's label and its value with the unit. Every mark is reachable by keyboard; hovering or focusing never moves a clock or changes the lesson.
- **Table view.** Every chart has a table with the same numbers, as a real `<table>` with a caption. At 375 px the table can replace the chart through a tab, and it never scrolls sideways.
- **Linked views.** When a chart, a table and a pitch show the same events, selecting one highlights the same item in the other two.

### Worked example: "Metres forward, per action"

The data-lab reference screen (`/dev/directions/floodlit/data`) follows every rule above:

- Vertical bars, one per action (1 to 10), so the steps are discrete.
- One series in the team A colour, with no legend box because the title names the series.
- A zero baseline with negative values below it, running from −20 to +35 m with gridlines every 10 m.
- A y-axis label that names the unit and the direction: "Metres toward Liverpool's goal".
- A direct label on one bar only: "+31.5 m, Mangala to De Bruyne".
- A keyboard tooltip per bar ("Action 6", "Mangala to De Bruyne, pass", "+31.5 m at 9.7 s").
- The ten-row event table as its table view, linked to the pitch: focusing a bar or row highlights the event on the pitch, and Enter seeks the clock to it.
- Every number is computed from the published scene file and tested, never typed.

## 8. Quality bar

This section covers brief section 9.8 (how every screen is reviewed: screenshots at 3 widths, the taste rubric, accessibility and the performance budget). A screen is shippable only when the machine review passes and an independent reviewer agrees (QA-02).

### The review command

`npm run review:screens -- <route> [--widths 375,768,1440] [--theme light|dark|both] [--port <n>] [--states <query,query>]`

- **Server.** Routes under `/dev/` are reviewed on the Vite dev server (they are compiled out of the study build); every other route on `vite preview`. If no server answers, the command starts one and stops it afterwards.
- **Capture.** Chromium (installed Chrome, then Edge, then the bundled Chromium), full page, at each width (heights 812, 1024 and 900), each theme and each `--states` query. At 375 px it also captures deuteranopia and achromatopsia emulations.
- **Output.** `test-results/review/<route-slug>/` holds `report.json`, `report.md` (its first line is `REVIEW: PASS …` or `REVIEW: FAIL …`) and the screenshots. Nothing in it is committed.
- **Exit codes.** `0` pass (warnings allowed), `1` at least one FAIL, `2` the review could not run (no server, no browser, or the taste skill missing).

### Checks

Every check reports pass, fail or warn for each width and theme. A `fail` check fails the review; a `warn` check is listed and must be looked at by the reviewer.

| Check | Severity | Pass condition |
|-------|----------|----------------|
| `no-overflow` | fail | No horizontal scroll at any width, and none at 320 px for a 375 run |
| `tap-size` | fail | Every control outside running text is at least 44 by 44 px and at least 8 px from the next |
| `focus-visible` | fail | Tabbing through the first 40 focusable elements, each shows a ring of at least 2 px with 3:1 against its surroundings |
| `text-contrast` | fail | Every text node has at least 4.5:1 against its background (3:1 for large text) |
| `token-colours` | fail | Every computed colour, background, border, fill and stroke is a token value of the active theme |
| `no-hex-in-source` | fail | No hex or `rgb(` literal in `src/**/*.{ts,tsx}` (the generated `tokens.css` is exempt) |
| `banned-gradient` | fail | No linear, radial or conic gradient in any background |
| `banned-glass` | fail | No `backdrop-filter` other than `none` |
| `banned-emoji` | fail | No emoji in visible text or in an `aria-label` |
| `banned-stripes` | fail | The pitch field is one flat `--pitch-surface` fill, with no pattern or image |
| `banned-transition-all` | fail | No computed `transition-property: all` |
| `banned-eyebrow` | warn | No uppercase text with letter-spacing above 0.05em |
| `card-grid` | warn | No three or more identical sibling boxes in a grid |
| `arrow-suffix` | warn | No button or link text ending in an arrow |
| `legend-present` | fail | When a pitch glyph is drawn, a visible Notation legend is on the page |
| `step-words` | fail | Text inside a lesson step is 60 words or fewer |
| `reduced-motion` | fail | With reduced motion emulated, nothing animates or transitions above 0 ms and nothing moves before input |
| `font-local` | fail | No request leaves localhost, and every family in the active token set is loaded |
| `heading-order` | fail | One `h1`, and headings descend one level at a time |
| `control-names` | fail | Every button, link and form control has an accessible name; icon-only buttons have an `aria-label` |
| `taste-layout` | fail | The taste-skill layout checker reports no finding outside the ignore list (mapping below) |
| `taste-copy` | warn | The taste-skill copy linter reports no FAIL finding; its warnings are listed (a FAIL finding fails the review) |

### Taste-skill mapping

The `design-taste-frontend` skill's layout checker (`check.mjs`) and copy linter (`copy-lint.mjs`) run inside every review. The skill is written for landing pages, so its findings are mapped to app-screen severities:

- **FAIL:** `overflow-x` and `spill`, the only layout findings that are real defects on an app screen.
- **Ignored**, each listed in the report with its reason:

| Ignored layout id | Reason |
|-------------------|--------|
| `edge-left` | landing-page rule, not an app-screen rule |
| `container` | landing-page rule, not an app-screen rule |
| `hero-*` | landing-page rule, not an app-screen rule |
| `screen-short` | landing-page rule, not an app-screen rule |
| `screen-height` | landing-page rule, not an app-screen rule |
| `section-height` | landing-page rule, not an app-screen rule |
| `one-section` | landing-page rule, not an app-screen rule |
| `neighbour*` | landing-page rule, not an app-screen rule |
| `moment-none` | landing-page rule, not an app-screen rule |
| `hero-enter` | landing-page rule, not an app-screen rule |
| `photo-*` | landing-page rule, not an app-screen rule |
| `fold-*` | landing-page rule, not an app-screen rule |

- **WARN:** every other layout finding.
- **Copy:** a copy-lint FAIL fails `taste-copy`; its warnings are listed.
- **Primary theme only.** The skill runs once per review, at the token set's primary theme (dark for floodlit), because one run takes about 20 seconds.
- **Local only.** `.claude/skills/` is denied by the repo guard, so the skill exists only on the learner's machine. CI cannot run it; without the skill the command exits 2. CI covers the review module's pure logic with unit tests instead.

### The independent reviewer

The machine verdict is necessary, not sufficient. For a lesson screen, QA-02 needs both a machine PASS and a reviewer pass. The reviewer is an agent that did not build the screen and has not read its plan or code. It reads the screenshots at the three widths, the colour-vision captures and the report, and judges it against the rubric criteria (calm and focus, pitch legibility, readability at 375, visual-first, anti-slop and taste, colour-blind safety, Premier League feel). It records its verdict in the report's `reviewer` block: `status` (`pass` or `fail`), its id, and notes with one line of evidence per problem.

### Accessibility

- **Now (Phase 4):** keyboard paths for every interaction, visible focus (`focus-visible`), reduced motion (`reduced-motion`), contrast (`text-contrast` and the palette gate), names for every control (`control-names`), heading order, and colour never the only cue.
- **Phase 5 (QA-03):** axe-core assertions on every lesson page, plus a keyboard-only and reduced-motion pass in the generic lesson walker.

### Performance budget

| Budget | Limit | Checked by |
|--------|-------|------------|
| Fonts | 200 KB of WOFF2 in total (floodlit: 121 KB) | `npm run fonts -- --check` |
| Initial route JavaScript | 180 KB gzip, with lazy labs (DuckDB, Pyodide) excluded | the build report, and the walker from Phase 5 |
| Layout shift | CLS below 0.1 (fonts preloaded, `font-display: swap`, pitch height fixed by its aspect ratio) | the walker from Phase 5 |
| Pitch playback | 60 fps: mean frame work at most 6 ms, p95 frame interval at most 20 ms | `npm run check:pitch` |

### Visual baselines

- Visual tests are tagged `@visual` and run only on Linux CI, in the official Playwright 1.65.1 image (`mcr.microsoft.com/playwright:v1.65.1-noble`). Fonts and anti-aliasing differ between Windows and Linux, so CI is the single source of baselines.
- A local Windows run never writes a baseline: `updateSnapshots` is `none` unless both `CI` and `UPDATE_BASELINES=1` are set.
- New baselines come only from the manual `update-snapshots` workflow, which commits the Linux images under `tests/visual/__baselines__/`.
- The visual job is not one of the required branch-protection checks.

### Environment variables

| Variable | Effect |
|----------|--------|
| `REVIEW_PORT` | Port of the server `review:screens` and Playwright use; a port other than 5173 starts Vite with `--bypass-lock` so it can run beside the learner's own dev server |
| `REVIEW_CHANNEL` | The browser channel to use (`chrome`, `msedge`); unset tries Chrome, then Edge, then the bundled Chromium |
| `REVIEW_START_TIMEOUT_MS` | How long the review waits for a server it started (default 60000) |
| `CHROME_PATH` | Chrome executable for the taste-skill layout checker when Chrome is not in its default place |
| `UPDATE_BASELINES` | Set to `1` together with `CI` to let the visual project write baselines (only in the `update-snapshots` workflow) |
| `CHECK_PITCH_PORT` | Port for `npm run check:pitch` |
| `CI` | Marks a CI run: the bundled Chromium, one worker, the HTML report, and `@visual` tests enabled |
