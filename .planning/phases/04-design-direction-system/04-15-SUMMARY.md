---
phase: 04-design-direction-system
plan: "15"
subsystem: design
tags: [gallery, controls, overlays, base-ui, field, select, slider, tabs, dialog, toast, playwright, vitest]
status: complete

requires:
  - phase: 04-design-direction-system
    provides: "Gallery route, registry, bare state matrix and review CLI (04-14); Button, Switch, Segmented, Popover, Tooltip, icons (04-07, 04-08)"
provides:
  - "Field, TextInput and NumberInput with an inline error linked by aria-describedby (src/ui/Field.tsx)"
  - "Link, Select, Checkbox, RadioGroup, Slider, Tabs, Dialog, AlertDialog and Toast on Base UI (src/ui/*.tsx)"
  - "Gallery primitives input, link, select, checkbox-radio-switch, segmented, slider, tabs (Controls) and dialog, alert-dialog, popover, tooltip, toast (Overlays), each with its listed states"
  - "Open overlays draw inside their own cell (Base UI portal container, non-modal), so one screenshot shows them"
affects: [04-16 Lesson and Data, 04-17 visual baselines and phase gate]

actuals:
  tokens: 18000
  tasks: 3
  commits: 3
plan_head_before: eeed6b7579c2cc3246e21364819cc1ad6e4a0299
plan_head_after: 3694459ab930d22a780b3231e8ace9f7c615af78

tech-stack:
  added: []
  patterns:
    - "Base UI root is the 44 px target and a 24 px face sits inside it (checkbox, radio, slider thumb); the review measures the control itself"
    - "Gallery open state: an empty cell element is the portal container, the demo renders once the element exists, the popup is non-modal and keeps focus where it is"
    - "A forced look (hover, focus-visible) can be limited to one option with stateValue (Segmented, Tabs)"

key-files:
  created:
    - src/ui/Field.tsx
    - src/ui/Link.tsx
    - src/ui/Select.tsx
    - src/ui/Choice.tsx
    - src/ui/Slider.tsx
    - src/ui/Tabs.tsx
    - src/ui/Dialog.tsx
    - src/ui/Toast.tsx
    - src/routes/dev-gallery/demos/overlays.tsx
  modified:
    - src/ui/ui.test.tsx
    - src/ui/Switch.tsx
    - src/ui/Segmented.tsx
    - src/ui/Popover.tsx
    - src/ui/Tooltip.tsx
    - src/routes/dev-gallery/demos/controls.tsx
    - src/routes/dev-gallery/registry.ts
    - src/routes/dev-gallery/gallery.test.tsx
    - tests/functional/gallery.spec.ts
    - scripts/review/browser.ts
    - scripts/review/lib.ts
    - vite.config.ts

key-decisions:
  - "The error text sits in the --danger colour next to a cross icon and the input points at it with aria-describedby, so the error never relies on colour alone"
  - "Alert dialog: the safe action (Keep board, accent) comes first and has focus on open; Clear board is a quiet button drawn in the danger colour"
  - "The gallery's static open AlertDialog is a non-modal Dialog with role alertdialog: the real AlertDialog is always modal and would make the rest of the page inert in a screenshot"
  - "Select options are 8 px apart (a list with gap-2) so every 44 px option meets the tap-size spacing rule; the highlighted option carries a 2 px focus ring"
  - "Tabs use a 2 px ink underline for the active tab, not the accent (the accent list covers selected segments, switches, checked boxes and primary actions)"
  - "DSGN-04 is not marked complete: 04-16 and 04-17 also carry it"

patterns-established:
  - "Slider on Base UI: the thumb is a 44 px box, the visible dot is a child span, the native range input inside it is un-clipped and transparent so its focus ring is real and visible"

requirements-completed: []

duration: 95min
completed: 2026-11-28
---

# Phase 4 Plan 15: Controls and Overlays Summary

**Field, link, select, checkbox, radio, slider, tabs, dialog, alert dialog, popover, tooltip and toast are on Base UI with every listed state in `/dev/gallery`. All twelve gallery pages pass the review with 0 fail, and the focus, trap, and overflow behaviour is covered by Playwright.**

## Accomplishments

- **Tracer (input):** `TextInput` and `NumberInput` on `@base-ui/react/field` and `/number-field`. Six states: empty, filled, focus, invalid, disabled, long-value. The error ("Enter a number from 0 to 100.") is `--danger` text with a cross icon, linked by `aria-describedby`; a long value stays inside the input at 375 px.
- **Controls:** `link` (inline and standalone, ink with a 1 px underline, 2 px on hover), `select` (closed, open with the popup in its cell, focus, disabled; check icon on the selected option), `checkbox-radio-switch` (off, on, focus, disabled; checked in accent), `segmented` (two and three options, each selected, focus, a 375 wrap case), `slider` (min, mid, max, focus, disabled; mono value label; accent track and thumb), `tabs` (first, second, focus, seven tabs that wrap to rows without scroll).
- **Overlays:** `dialog`, `alert-dialog` ("Clear this board?", "Keep board" focused on open, "Clear board" in the danger colour), `popover` (short and long text; the long one scrolls inside a 60vh box), `tooltip` (open on an icon-only button), `toast` ("Note saved", Dismiss). Each has a static open state in its cell; `dialog` and `alert-dialog` also have an `interactive` state that opens the real modal.

## Task Commits

1. **Task 1 (tracer): Field, input primitive, six states, tests, review:** `e25b2a9`
2. **Task 2: link, select, checkbox-radio-switch, segmented, slider, tabs:** `9d298c9`
3. **Task 3: dialog, alert-dialog, popover, tooltip, toast:** `3694459`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Review tap-size flagged a true 8 px gap as 7.9 px**
- **Found during:** Task 2 reviews of `segmented` and `tabs`
- **Issue:** boxes are captured to 0.1 px, so two controls exactly 8 px apart can read 7.9 px apart.
- **Fix:** `TAP_GAP_ROUNDING_PX = 0.15` in `scripts/review/lib.ts`; only that rounding is allowed (`review.test.ts` still passes, 68 tests).
- **Commit:** `9d298c9`

**2. [Rule 3 - Blocking] Review counted Base UI's focus guards as unnamed 1 px controls**
- **Found during:** Task 2 review of the open `select`
- **Issue:** the aria-hidden `[data-base-ui-focus-guard]` spans around an open popup have `tabindex=0`, so the existing "unreachable" rule did not drop them.
- **Fix:** `unreachable()` in `scripts/review/browser.ts` also drops elements with `data-base-ui-focus-guard`.
- **Commit:** `9d298c9`

**3. [Rule 1 - Bug] Controls failed the review on first build**
- `checkbox` and `radio`: the Base UI root was a 24 px span. Fix: the root is the 44 px target and the 24 px box is a child; rows sit 8 px apart.
- `slider`: the hidden range input was 20 px and showed a native blue thumb once un-clipped, and the thumb at the track end pushed the page 6 px wide at 375. Fix: 44 px thumb box with a child dot, native thumb pseudo-elements zeroed, `thumbAlignment="edge"`.
- `select` open: the highlighted option had no ring (`outline-none` set `outline-style: none`, which `focus:outline-2` then inherited). Fix: `outline-0` plus a 2 px ring on `focus` and `data-highlighted`.
- `tabs`: the focusable panel was 24 px tall. Fix: `min-h-11`.
- `toast`: the toast root takes focus and had no ring. Fix: `fv:` ring.
- `alert-dialog` Clear board text stayed ink because `text-ink` in the quiet variant beat `text-danger`. Fix: `text-danger!` and `border-danger!`.
- **Commits:** `9d298c9`, `3694459`

**4. [Rule 1 - Bug] Gallery open dialog covered its neighbour cell**
- The popup was a fixed 28 rem wide, wider than a two-column cell, so it intercepted the neighbouring trigger's clicks. Fix: contained mode is `w-full max-w-[28rem]`. **Commit:** `3694459`

**5. [Rule 1 - Bug] `role={undefined}` removed the real alert dialog's role**
- Passing `role={contained ? "alertdialog" : undefined}` overrode Base UI's own role. Fix: spread the prop only in contained mode. **Commit:** `3694459`

**6. [Rule 3 - Blocking] Pre-commit biome `noLabelWithoutControl`**
- A `<label>` wrapping a Base UI root (a span) is not seen as a control. Fix: `htmlFor` on the label and `id` on the root (Base UI puts the id on the hidden input, so a label click still toggles). Playwright covers the click. **Commit:** `9d298c9`

### Plan-vs-spec notes

- `NumberInput` needed `@base-ui/react/number-field` in `vite.config.ts` `optimizeDeps.include` (added in Task 1) so the dev server does not re-optimise mid-run.
- `Switch` gained a `disabled` prop, `Segmented` and `Tabs` gained `stateValue` (force a look on one option), `Popover` and `Tooltip` gained `portalContainer` (and `open`, `initialFocus`). All additive; existing callers are unchanged.
- The registry lists extra, plan-consistent states (`dialog` and `alert-dialog` have `open` and `interactive`; `popover` has `short` and `long-text`) so both a stable screenshot and a real focus test exist.
- Base UI keeps the toast's Dismiss button out of the accessibility tree until the toast has focus (`aria-hidden` while collapsed). The Playwright test finds it by text for that reason.

## Check results

- `npm test`: 1168 passed, 6 skipped. `npx tsc --noEmit`, `npx biome ci .`, `npm run guard`: clean.
- `npm run build && npm run guard:bundle && npm run smoke`: ok; no dev route code in `dist/assets`.
- `REVIEW_PORT=5184 npx playwright test --project=functional`: 50 passed. One earlier full run failed the first floodlit-tactics test in `directions.spec.ts` (`data-ready` not found), and that spec passed 13 of 13 on its own and in the next full run; I read it as the dev server's first load after new modules, not a code fault.
- Reviews (port 5184), all `REVIEW: PASS` with 0 fail: `/dev/gallery/{input,link,select,checkbox-radio-switch,segmented,slider,tabs,dialog,alert-dialog,popover,tooltip,toast}?bare=1`. WARN lines remain on `select` (a list of equal-height options reads as a card grid) and `checkbox-radio-switch` (`taste-copy`); both are WARN by design.
- Acceptance greps: `@base-ui/react/slider` in `Slider.tsx` = 1; `@base-ui/react/tabs` in `Tabs.tsx` = 1; `@base-ui/react/dialog` in `Dialog.tsx` = 1; `Clear this board?` in `overlays.tsx` = 1; `aria-describedby` in `Field.tsx` = 3.

## Known Stubs

None. The gallery is dev-only; the toast demo adds one toast on mount by design.

## Threat Flags

None. The new primitives add no network access, storage or parsing of untrusted input; the gallery route stays in the dev branch and is absent from the build.

## Open for later plans

- 04-16 adds the Lesson and Data groups; 04-17 adds the visual baselines that loop over `GALLERY` (the open-popup cells and the `interactive` states need a stable focus state there).
- The `interactive` overlay states portal into `<body>`, so on a `theme=both` bare page the opened modal takes the default theme; the frames use one theme each, so this only shows on a hand-built `theme=both` bare URL.
- The deferred items under "From plan 04-14" and the `/dev/pitch` tap-size item still stand.

## Self-Check: PASSED

- FOUND: `src/ui/{Field,Link,Select,Choice,Slider,Tabs,Dialog,Toast}.tsx`, `src/routes/dev-gallery/demos/overlays.tsx`
- FOUND commits: e25b2a9, 9d298c9, 3694459
