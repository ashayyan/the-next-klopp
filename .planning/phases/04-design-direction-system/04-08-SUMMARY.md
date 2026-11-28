---
phase: 04-design-direction-system
plan: "08"
subsystem: lesson-chrome
tags: [shell-bar, step-rail, focus-mode, theme, base-ui, popover, glossary]
requires: ["04-07"]
provides:
  - "ShellBar and FocusToggle (src/ui/lesson/ShellBar.tsx), with Theme menu and 375 More options menu"
  - "StepRail and LESSON_LOOP_STEPS in vertical, strip, row and compact forms per width band"
  - "theme.ts: THEME_KEY, readStoredTheme, writeStoredTheme, resolveTheme"
  - "Switch, RadioMenu (Menu.tsx), Popover, Tooltip on Base UI"
  - "ConfusionButton, GlossaryCard and GlossaryTerm"
  - "project icon set (check, cross, question, theme, more, close, chevron)"
  - "DirectionScope theme context (useDirectionTheme, DirectionShellBar)"
affects: [04-09, 04-11, 04-14, 04-15, 04-16]
actuals:
  tokens: 16300
  tasks: 3
  commits: 4
plan_head_before: aa50f15fc8f127c3791d08a0f7618ef3ac9d8819
plan_head_after: d3c18af4702cdbf9cac287143292cb82fdc81811
tech-stack:
  added: []
  patterns:
    - "one StepRail list per page with responsive forms from literal class tables (base / md / xl), so there is only one aria-current step in the DOM"
    - "data-fill-edge marks accent and highlight fills; programme light draws their edge in ink through one hand-written rule (directions.css)"
    - "popups portal into <body>, which mirrors the direction attributes, so they read the direction tokens"
key-files:
  created:
    - src/ui/icons/index.tsx
    - src/ui/Switch.tsx
    - src/ui/Menu.tsx
    - src/ui/Popover.tsx
    - src/ui/Tooltip.tsx
    - src/ui/theme.ts
    - src/ui/ui.test.tsx
    - src/ui/lesson/ShellBar.tsx
    - src/ui/lesson/StepRail.tsx
    - src/ui/lesson/ConfusionButton.tsx
    - src/ui/lesson/GlossaryCard.tsx
    - src/routes/dev-directions/directions.css
  modified:
    - src/routes/dev-directions/TacticsScreen.tsx
    - src/routes/dev-directions/DirectionScope.tsx
    - src/ui/Button.tsx
    - src/ui/Segmented.tsx
    - tests/functional/directions.spec.ts
    - scripts/review/browser.ts
key-decisions:
  - "ShellBar takes theme and onThemeChange and builds both menus itself; DirectionShellBar wires it to the direction screen's theme context"
  - "Choosing a theme drops ?theme= from the URL, otherwise the query would keep winning and the menu would look broken"
  - "Below 768 px the Focus switch shows 'Focus' with 'mode' kept for assistive tech, and below 375 px only the track: the bar fits at 320 px and the visible text stays inside the accessible name"
  - "notebook shows the lesson time in the top bar only, not again in the sheet head"
requirements-completed: []  # DSGN-01 advances; it completes with the pick (04-10)
duration: 35min
completed: 2026-11-28
status: complete
---

# Phase 4 Plan 08: Lesson chrome on the direction screens Summary

**The tactics screen now carries the full lesson chrome in each direction's own form: a 56 px shell bar with Focus mode, "I'm confused here" and a theme menu that remembers light or dark per device, the Lesson Loop rail (floodlit vertical rail, programme numbered strip, notebook quiet row, compact line at 375), glossary cards with mini pitches, and all three routes pass `review:screens` in the default, `state=with` and `focus=1` states.**

## Performance
- **Duration:** about 35 min
- **Tasks:** 3 (4 commits: tracer, TDD RED, TDD GREEN, popovers and spec)
- **Files modified:** 18 (12 created, 6 modified)

## Accomplishments
- Icons: seven 20 x 20 `currentColor` icons, `aria-hidden`, stroke width and cap from `--icon-stroke` and `--icon-linecap` (floodlit 1.5 square, programme 2 square, notebook 1.75 round).
- StepRail: one ordered list, exactly one `aria-current="step"`; complete steps carry the check icon and their label, the current step an accent marker and 600 weight (programme: number plus the label on `--surface-highlight` with an ink line), upcoming steps muted. The compact form reads "Touch it, step 3 of 7" over a 7-segment bar drawn as one SVG.
- ShellBar: wordmark in the display face (Label size below 768, Heading from 768), "About 6 min", Focus mode, "I'm confused here", icon-only Theme menu ("Match my system", "Light", "Dark"); below 768 the time and the theme choices sit in "More options". Focus mode (switch or `?focus=1`) removes the rail, time, source line and theme menus and keeps step, pitch, legend, toggle, CTA, Focus switch and the confusion button.
- Theme: `?theme=` wins, then a stored `light`/`dark`, then the direction's primary theme; a throwing `localStorage` falls back to `system` with no error; "Match my system" stores `system`.
- Confusion popover: heading "What's confusing here?", labelled textarea "Note (optional)", quiet "Save note", helper copy; the note stays in component state, Save note closes the popover and writes nothing.
- Glossary: "4-4-2", "3-2-4-1" and "centre-back" in the body open cards with the Copywriting Contract definitions; the two formation cards show a 240 px static pitch of frame 0 and frame 1.
- Verification: `npx vitest run` 1032 passed (6 skipped, pre-existing), `src/ui/ui.test.tsx` 14 tests; `tsc --noEmit` and `biome ci .` clean; `directions.spec.ts` 14 passed; `npm run build && npm run smoke` pass; `review:screens --states state=with,focus=1` gives `REVIEW: PASS — 0 fail, 1 warn` for floodlit, programme and notebook.

## TDD Gate Compliance (Task 2)
- RED `67600c7`: theme behaviour tests against a loading stub (empty key, "light", no-op). Evidence: `npx vitest run src/ui/ui.test.tsx --reporter=tap-flat -t "reads dark back"`, exit 1, target "theme storage > reads dark back, and falls back to system for an unknown value or a throwing storage" failed with "expected 'light' to be 'dark'"; classifier `RED_EVIDENCE_OK`. Semantic assessment: the target ran and failed on its planned assertion; a full run had 5 theme tests failing on assertions and the rail, shell and two stub-agnostic cases passing; no load fault.
- GREEN `bda55a4`: 14 of 14 tests pass. No refactor commit.

## Task Commits
1. **Task 1: shell bar, step rail, focus mode (tracer)** - `1b05f19`
2. **Task 2 RED: theme tests** - `67600c7`
3. **Task 2 GREEN: theme module, menus, tooltips** - `bda55a4`
4. **Task 3: confusion popover, glossary cards, spec, reviews** - `d3c18af`

## Decisions & Deviations

### Auto-fixed Issues

**1. [Rule 1 - Bug] The review counted Base UI's hidden form input as a tap target**
- **Found during:** Task 1 (Switch on Base UI renders a 1 x 1 px `aria-hidden`, `tabindex="-1"` input beside the control).
- **Fix:** the collector skips form controls that are `aria-hidden` and out of the tab order; nobody can reach or operate them.
- **Files modified:** `scripts/review/browser.ts` - **Commit:** `1b05f19`

**2. [Rule 1 - Bug] Glossary terms in the body failed tap-size**
- **Issue:** the check only exempted links inside a sentence; a term button inside the body paragraph was held to 44 px, against the inline exception of WCAG 2.5.8 (the plan asks for buttons that read as text).
- **Fix:** a `<button>` laid out inline (Chrome computes it as `inline-block`) inside a `<p>` counts as running text, like a link.
- **Files modified:** `scripts/review/browser.ts` - **Commit:** `d3c18af`

**3. [Rule 1 - Bug] Primary buttons lost the programme ink edge**
- **Issue:** a Biome-reformatted class string meant the `border-2` replacement in 04-07's Button never applied, so the CTA had no edge for the programme rule to colour.
- **Fix:** primary buttons carry `border-2 border-transparent` and `data-fill-edge="always"`; Segmented options and the Switch track and menu markers carry the matching markers. The 04-07 per-layout ink-edge classes for the toggle and CTA were removed in favour of the one rule in `directions.css`.
- **Commit:** `1b05f19`

**4. [Rule 3 - Blocking] The shell bar overflowed at 320 px and its gaps read 7.9 px**
- **Fix:** below 375 px the Focus switch shows only its track and the wordmark may wrap; header controls are `shrink-0` and 12 px apart (box rounding in the review made 8 px gaps read 7.9).
- **Files modified:** `src/ui/lesson/ShellBar.tsx` - **Commit:** `d3c18af`

**5. [Rule 1 - Bug] The 7-segment bar tripped the card-grid warning**
- **Fix:** the bar is one SVG with seven rects instead of seven boxes in a grid.
- **Commit:** `1b05f19`

**Total deviations:** 5 auto-fixed (1 blocking, 4 bugs). **Impact:** no threshold changed; the two review collector changes encode WCAG exceptions the checker did not know.

### WARNs kept
- `taste-copy` `copy-contrast` on all three routes: contract copy ("Without the ball", "without the"), unchanged.

## Known Stubs
- `/dev/directions/:id/data` still shows "The data screen is not built yet." until 04-09 (windows ledger entry 1).
- "Continue to Predict" has no action (there is no next step in this preview).

## Threat Flags
None. T-04-15: `getItem`/`setItem` and the `localStorage` getter are wrapped in try/catch, only `system`, `light`, `dark` are accepted, and the functional spec loads a page whose `localStorage` getter throws with no console error. T-04-16: the note lives in component state; the spec asserts no new `localStorage` key after Save note.

## Next Phase Readiness
04-09 reuses `DirectionShellBar` (8 min), `StepRail current="see-it"`, `Popover`, `Tooltip` and the `ready` flag of `DirectionScope` for its async scene.

## Self-Check: PASSED
