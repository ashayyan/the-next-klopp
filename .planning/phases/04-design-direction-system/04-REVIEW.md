---
phase: 04-design-direction-system
reviewed: 2026-11-28T12:00:00Z
depth: standard
files_reviewed: 62
files_reviewed_list:
  - .github/workflows/ci.yml
  - .github/workflows/update-snapshots.yml
  - playwright.config.ts
  - vite.config.ts
  - index.html
  - package.json
  - src/main.tsx
  - src/routes.ts
  - src/routes.test.ts
  - src/index.css
  - src/ui/theme.ts
  - src/ui/Button.tsx
  - src/ui/Choice.tsx
  - src/ui/Dialog.tsx
  - src/ui/Field.tsx
  - src/ui/Link.tsx
  - src/ui/Menu.tsx
  - src/ui/Popover.tsx
  - src/ui/Segmented.tsx
  - src/ui/Select.tsx
  - src/ui/Slider.tsx
  - src/ui/Switch.tsx
  - src/ui/Tabs.tsx
  - src/ui/Toast.tsx
  - src/ui/Tooltip.tsx
  - src/ui/data/chart.tsx
  - src/ui/data/DataTable.tsx
  - src/ui/lesson/ConfusionButton.tsx
  - src/ui/lesson/GlossaryCard.tsx
  - src/ui/lesson/ProgressRing.tsx
  - src/ui/lesson/QuizOption.tsx
  - src/ui/lesson/ShellBar.tsx
  - src/ui/lesson/StepRail.tsx
  - src/routes/dev.tsx
  - src/routes/home.tsx
  - src/routes/not-found.tsx
  - src/routes/dev-review-fixture.tsx
  - src/routes/dev-gallery.tsx
  - src/routes/dev-gallery/Frames.tsx
  - src/routes/dev-gallery/StateCell.tsx
  - src/routes/dev-gallery/registry.ts
  - src/routes/dev-gallery/demos/overlays.tsx
  - src/routes/dev-gallery/demos/controls.tsx
  - src/routes/dev-directions.tsx
  - src/routes/dev-directions/DirectionScope.tsx
  - src/routes/dev-directions/DataScreen.tsx
  - scripts/review-screens.ts
  - scripts/review/lib.ts
  - scripts/review/browser.ts
  - scripts/review/taste.ts
  - scripts/design/build-tokens.ts
  - scripts/design/check-palette.ts
  - scripts/design/copy-fonts.ts
  - scripts/design/tokens.ts
  - scripts/design/tokens-schema.ts
  - scripts/design/baselines-guard.test.ts
  - scripts/check-bundle.ts
  - scripts/lib/bundle.ts
  - scripts/smoke.ts
  - tests/visual/gallery.visual.spec.ts
  - tests/functional/theme.spec.ts
  - tests/functional/gallery.spec.ts
findings:
  critical: 1
  warning: 7
  info: 10
  total: 18
  necessity: 1
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-11-28T12:00:00Z
**Depth:** standard
**Files Reviewed:** 62
**Status:** issues_found

## Summary

The diff `main...HEAD` holds 224 files. The branch carries Phases 1 to 4 because main has not been merged since the branch-per-phase switch. This review covers the Phase 4 priority set the orchestrator named:

- `src/ui/**`
- the gallery and direction dev routes
- the theme pre-paint path
- `scripts/design/**` and `scripts/review/**`
- the visual CI job, `update-snapshots.yml` and `playwright.config.ts`
- dev-route gating and leaks into `dist`

The research scripts and the Phase 3 pitch and scene modules on the branch were not reviewed line by line. Generated `src/styles/tokens.css` was read only to confirm the CI generator output.

Key concerns:

1. **The light theme cannot be scoped below a dark root (CR-01).** The generated token CSS has no `[data-theme="light"]` rule, so the light values exist only on `:root`. Any subtree marked `data-theme="light"` inherits the dark variables whenever `<html>` resolves to dark. This happens with an OS dark scheme and no stored choice, or with a stored "dark". I confirmed it in Chrome. The affected screens are the direction reference screens (`?theme=light` and the in-page theme menu), the gallery "both" matrix, and any future scoped preview.
2. **The review gate is loosened in two places.** The tap-size "running text" exemption covers every link in any `<li>` or `<p>` (WR-01). The 0.15 px gap tolerance is applied to boxes that were already rounded to 0.1 px. That tolerance now hides the 7.9 px PlaybackBar gap that `deferred-items.md` logs as a real defect (WR-02).
3. **The Base UI focus-guard skips are sound.** The guards are `aria-hidden`, 1 px wide and only bounce focus, so skipping them in the tab walk (`browser.ts:624-627`) and excluding them from the target and name checks (`browser.ts:266-268`) loosens no real check.
4. **The CI and update-snapshots workflows are mostly sound.** Every action is pinned by SHA. No expression appears inside a `run:` script. The write token sits only in the `commit` job, which never runs `npm ci`. Baselines are written only with `CI` plus `UPDATE_BASELINES`. Only ref handling has minor gaps (IN-05).
5. **Dev gating works today, but the leak test does not watch it (WR-06).** `import.meta.env.DEV` gating drops the Phase 4 dev routes from the study build. The `dist` leak check only searches for two Phase 1/3 strings, so it would not catch a Phase 4 dev module (or the raw DESIGN.md it imports) entering the bundle.

## Critical Issues

### CR-01: The light theme cannot be applied to a subtree when the document is dark

**File:** `scripts/design/tokens.ts:268-305` (generator), `src/styles/tokens.css:20,82,127-128` (output), `src/routes/dev-directions/DirectionScope.tsx:142-157`, `src/routes/dev-gallery.tsx:150-176`

**Issue:** `generateSystemCss` emits three blocks:

- `:root { light }`
- `[data-theme="dark"] { dark }`
- `@media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) { dark } }`

No rule declares the light values for `[data-theme="light"]`. So an element with `data-theme="light"` only re-gets light values when it is `<html>` itself. Any descendant inherits whatever `<html>` resolved to. I checked this in headless Chrome with the generated blocks. With `colorScheme: "dark"` and `data-theme="light"` on `<body>` and a `<div>`, `--surface-page` computes to `#0E151D` (dark). With `colorScheme: "light"` it computes to `#F3F5F7`.

Where this breaks:

- **Direction screens.** `DirectionScope` writes the theme only on its own `<div>` and on `<body>`, never on `<html>`. On a dark OS with no stored choice, `/dev/directions/floodlit/tactics?theme=light` renders dark. The index page links to exactly that URL. The same happens when the learner picks "Light" in the shell-bar theme menu: `choose()` stores it and sets `body[data-theme=light]`, but the page stays dark until a reload, when the pre-paint script sets `<html>`. With a stored "dark", `?theme=light` never works.
- **Gallery "both" matrix.** `BareMatrix` with `theme=both` shows two dark copies on a dark OS.
- **Scoped CSS too.** `generateScopedCss` (`tokens.ts:307-342`) has the same gap: there is a `${scope}[data-theme="dark"]` block but no `${scope}[data-theme="light"]` block. A light-scoped direction inside a dark ancestor breaks the same way.

**Why the tests miss it:** `theme.spec.ts` only tests `<html>`. `gallery.visual.spec.ts` and `review:screens` set `colorScheme` equal to the requested theme. No spec combines a dark scheme with a light scope.

**Fix:** Emit a light block for the attribute, and pin it with a test.

```ts
// scripts/design/tokens.ts, generateSystemCss, after the dark block
blocks.push(
  [
    '[data-theme="light"] {',
    colourScheme("light", "  "),
    ...themedLines(doc, "light", "  "),
    "}",
  ].join("\n"),
);
// generateScopedCss: the same with `${scope}[data-theme="light"]`
```

Then regenerate `src/styles/tokens.css`. Add a functional spec: with `test.use({ colorScheme: "dark" })`, open `/dev/directions/floodlit/tactics?theme=light` and expect `getComputedStyle(document.body).backgroundColor` to be the light `surface-page`. Optionally, have `DirectionScope.choose()` call `applyDocumentTheme` so `<html>` follows the choice as well.

## Warnings

### WR-01: The tap-size "running text" exemption covers every link in a list item or paragraph

**File:** `scripts/review/browser.ts:289-295`

**Issue:** `runningText` is true for any `<a>` that has a `p` or `li` ancestor. Such links are skipped by both the 44 px size rule and the 8 px gap rule (`lib.ts:291`). WCAG 2.5.8's inline exception is for a target *in a sentence*, not for navigation lists or a paragraph that holds only one standalone link.

Phase 4 screens already pass because of this exemption:

- `BackLink` (`src/routes/dev-gallery.tsx:101-108`, and the same pattern in `dev-directions.tsx`): a lone link in a `<p class="text-label">`, about 20 px tall.
- The `/dev` route list (`src/routes/dev.tsx:10-26`): `li > a` links with no minimum height.

Any future lesson table of contents built as `ul > li > a` would also pass with 20 px targets.

**Fix:** Count a link as running text only when non-link text shares its line box. For example, require the closest `p` or `li` to hold text outside the link:

```ts
const inSentence = (el: Element) => {
  const block = el.closest("p, li");
  if (!block) return false;
  const own = [...block.childNodes].some(
    (n) => n !== el && !n.contains?.(el) && (n.textContent ?? "").trim() !== "",
  );
  return own;
};
runningText: (el.tagName === "A" || /* inline button */ ...) && inSentence(el),
```

Then give `BackLink` and the `/dev` list links `inline-flex min-h-11 items-center`.

### WR-02: The 0.15 px gap tolerance on rounded boxes hides a logged real defect

**File:** `scripts/review/lib.ts:273,311-312`, `scripts/review/browser.ts:230-233`

**Issue:** `collectPage` rounds every box to 0.1 px. `evalTapSize` then forgives 0.15 px on the 8 px gap, which is exactly the worst-case error of three rounded values. In effect, any true gap of 7.85 px or more passes.

`deferred-items.md` (from 04-14) records that the `PlaybackBar` controls really do sit 7.9 px apart in containers narrower than about 640 px when the viewport is 768 px or wider. That is a layout cause, not a rounding artefact. The tolerance added in 04-15 now reports that layout as a pass. The code comment ("a true 8 px gap can read 7.9; allow that rounding only") uses the same figure as the real defect.

**Fix:** Do not round before judging. Send the unrounded `getBoundingClientRect()` values for the tap check and round only in the displayed `value`. Then use a sub-layout-unit epsilon (Chrome lays out in 1/64 px):

```ts
const TAP_GAP_EPSILON_PX = 1 / 64;
if (gap + TAP_GAP_EPSILON_PX < TAP_GAP_PX) { ... }
```

### WR-03: The selectable data table is mouse-dead and declares a grid it does not implement

**File:** `src/ui/data/DataTable.tsx:72,93-117`

**Issue:** With `onRowEnter`, the table gets `role="grid"` and every row gets `tabIndex=0` and `cursor-pointer`, but there is no `onClick`.

- A mouse or touch user who clicks a row in the Data screen (`DataScreen.tsx:498-506`, `onRowEnter={seekTo}`) only gets the hover preview. Nothing seeks, even though the cursor promises an action.
- `role="grid"` tells screen readers to expect arrow-key navigation with one tab stop. Here there are no arrow keys and N tab stops, so a 20-row table costs 20 Tab presses.
- Space does not activate a row.

**Fix:** Add `onClick={() => onRowEnter?.(row)}` and handle `" "` next to `Enter`. Either drop `role="grid"` (keep a plain table whose rows are focusable buttons-in-cells), or implement a roving tabindex with ArrowUp and ArrowDown.

### WR-04: `copy-fonts --family` rewrites LICENSES.md with only that family's licence

**File:** `scripts/design/copy-fonts.ts:160,214-224`

**Issue:** `refs` is filtered to the `--family` value, and `renderLicences(packagesDir, refs)` builds the whole `public/fonts/LICENSES.md` from that filtered list. So `npm run fonts -- --family geist-mono` deletes the Mona Sans section, including the OFL text and its Reserved Font Name notice, while the Mona Sans file still ships in `dist`. OFL-1.1 requires the licence to travel with the font. `--check` would later report the file as stale, but nothing stops a commit made between the two steps.

**Fix:** Always render the licences from `allRefs` (every referenced family). Filter only the copy loop.

```ts
const wanted = renderLicences(packagesDir, allRefs);
```

### WR-05: `review:screens` silently reviews a stale `dist/` for non-dev routes

**File:** `scripts/review/browser.ts:112-118`

**Issue:** For a non-`/dev/` route, the command builds only when `dist/index.html` is missing. An existing `dist` from an older commit is served by `vite preview` and reviewed as current. The report then passes or fails code that is not on disk. `npm run study` and CI both leave a `dist/` behind, so this is the common case.

**Fix:** Build whenever this command starts the preview server (it is about 1 s with Vite 8). Or compare the newest mtime under `src/`, `index.html` and `public/` with `dist/index.html` and rebuild when the source is newer. Write the build's git SHA into `report.json`.

### WR-06: The dist leak check does not cover any Phase 4 dev module

**File:** `scripts/smoke.ts:96-111`

**Issue:** The study-build leak check searches `dist/assets` for only two strings: `"left out of the study build"` (dev.tsx) and `"Dev view of the canonical pitch"` (dev-pitch.tsx). Phase 4 adds four dev-only modules: the gallery, the directions route, the review fixture, and `DirectionScope`, which imports `docs/DESIGN.md?raw` and `scripts/design/tokens.ts`. None of their text is checked. If a shipped module imports from `src/routes/dev-gallery/**` or `dev-directions/**`, the whole DESIGN.md and the gallery would ship and the smoke test would still pass. Today the `import.meta.env.DEV` guard holds, and no non-dev file imports these modules. The gap is in the regression test only.

**Fix:** Add one marker per dev route, for example:

- `"Every primitive and interaction, with its states"`
- `"The picked direction renders the two sample lesson screens"`
- `"This page exists so the review command can be tested"`
- the `## 1. Principles and anti-slop rules` heading of DESIGN.md

Better, run the check in `check-bundle.ts`, which is a required CI job, instead of only in the Windows smoke job.

### WR-07: Disabled quiz options are double-muted to about 2.2:1 while the learner must still read them

**File:** `src/ui/lesson/QuizOption.tsx:59-61`, `src/ui/Button.tsx:43`

**Issue:** The `disabled` state is "an option after the reveal", and the learner reads it to understand why the answer is right. It gets both `text-ink-muted` and `CONTROL_BASE`'s `disabled:opacity-50`. In light mode, `#4C5967` at 50 % over `#F3F5F7` is about `#A0A7AF`, roughly 2.2:1. In dark mode it is about 2.6:1. WCAG exempts disabled controls, so the review's `text-contrast` check skips them (`browser.ts:343`). Still, this content is the lesson's worked answer, read by a low-vision or tired ADHD learner. The docstring says "a revealed option stays readable".

**Fix:** For the post-reveal state, use one muting step, not two. Keep `text-ink-muted` (at least 4.5:1) and suppress the opacity with `disabled:opacity-100`. Or render it with `aria-disabled` and no native `disabled`, so the text stays at full contrast.

## Info

### IN-01: The theme attribute cleanup deletes the stored theme instead of restoring the previous value

**File:** `src/routes/dev-gallery.tsx:155-161`, `src/routes/dev-directions/DirectionScope.tsx:142-150`

**Issue:** `BareMatrix` sets `document.documentElement.dataset.theme` and deletes it on unmount. That also removes a `data-theme` the index.html pre-paint script set from the learner's stored choice, so after an in-app navigation the page falls back to the system scheme. `DirectionScope` does the same on `<body>`.

**Fix:** Save the prior value in the effect and restore it in the cleanup.

### IN-02: `applyDocumentTheme` is never called by the app

**File:** `src/ui/theme.ts:92-100`

**Issue:** The function is documented as "the learner's theme choice for the whole app", but only `ui.test.tsx` imports it. The one in-app theme menu (`DirectionScope.choose`) uses `writeStoredTheme` and does not touch `<html>`. That is part of what exposes CR-01.

**Fix:** Call it from `choose()`, or remove it until the app shell arrives.

### IN-03: `GlossaryCard` accepts `term` and ignores it

**File:** `src/ui/lesson/GlossaryCard.tsx:12`

**Issue:** `term` is in `GlossaryCardProps` and is passed in by `GlossaryTerm` at line 56, but the component reads only `definition` and `visual`.

**Fix:** Drop `term` from `GlossaryCardProps`, or use it as `data-glossary-card={term}`.

### IN-04: The `text-contrast` check ignores ancestor `opacity`

**File:** `scripts/review/browser.ts:316-345`, `scripts/review/lib.ts:361-392`

**Issue:** Colour alpha is composited, but CSS `opacity` on the element or an ancestor is not. Examples are `hov:opacity-90` on the primary button, `has-data-disabled:opacity-50` on checkbox rows (their label `<span>` is not inside `:disabled`, so it is not exempt), and popups mid-transition. In each case the check computes a ratio higher than what is painted.

**Fix:** Multiply the ancestors' computed `opacity` into the foreground alpha before compositing, or exempt `has-data-disabled` rows explicitly.

### IN-05: update-snapshots ref handling

**File:** `.github/workflows/update-snapshots.yml:24,59,82-84`

**Issue:** The `github.ref != 'refs/heads/main'` guard also lets a tag dispatch through, and `git push origin "HEAD:$BRANCH"` then resolves a bare `ref_name` against remote refs. Two dispatches on one branch also race, and the second push fails non-fast-forward. That failure is safe but noisy.

**Fix:** Use `if: startsWith(github.ref, 'refs/heads/') && github.ref != 'refs/heads/main'`. Push to `"HEAD:refs/heads/$BRANCH"`. Add `concurrency: { group: update-snapshots-${{ github.ref }}, cancel-in-progress: false }`.

### IN-06: Stale baselines are never removed

**File:** `playwright.config.ts:21`, `scripts/design/baselines-guard.test.ts:12-24`

**Issue:** `updateSnapshots: "changed"` writes missing and differing baselines but never deletes the baseline of a renamed or removed primitive. The guard checks file names by platform only, not against `inventory.json`.

**Fix:** In the baselines guard, assert that the set of `tests/visual/__baselines__/*-linux.png` equals `inventory × {light,dark} × {375,768,1440}`.

### IN-07: Necessity (phantom requirement): three-direction plumbing after the ADR 0010 collapse

**File:** `src/routes/dev-directions/DirectionScope.tsx:27`, `scripts/review/lib.ts:140-153`, `scripts/design/build-tokens.ts:36-51`, `scripts/design/check-palette.ts:424-427`
**Category:** necessity

**Issue:** `Direction["id"]` is still `"floodlit" | "programme" | "notebook"`. `activeTokenInput` and `listTokenInputs` still look up per-direction token files under `src/routes/dev-directions/tokens`, and check-palette dedupes direction files that "repeat the system set". `build-tokens.test.ts:71-75,113` asserts that the folder is gone and that there are no direction sets. ADR 0010 keeps the other two directions in git history only. It is a judgment call whether directions return, hence Info.

**Fix:** Narrow the union to `"floodlit"`. Keep the folder scan only if a later phase plans new direction sets, and record that plan in the ADR.

### IN-08: The `hov` variant applies hover styles on touch devices

**File:** `src/index.css:39`

**Issue:** Tailwind 4's own `hover:` is wrapped in `@media (hover: hover)`. The custom `hov` variant (`&:is(:hover, [data-state~="hover"])`) drops that guard, so on a touch screen a tapped control keeps its hover fill until the next tap elsewhere.

**Fix:** Use `@custom-variant hov { @media (hover: hover) { &:hover { @slot; } } &[data-state~="hover"] { @slot; } }`.

### IN-09: StepRail with an unknown `current` reads "step 0 of 7"

**File:** `src/ui/lesson/StepRail.tsx:102-103,168`

**Issue:** `findIndex` returns -1. `currentStep` falls back to "Hook", but every list item renders as upcoming and the compact sentence says "Hook, step 0 of 7". The type is `LessonStepId`, but lesson specs will arrive as JSON from outside the type system.

**Fix:** Clamp with `const index = Math.max(0, LESSON_LOOP_STEPS.findIndex(...))`, or throw in dev.

### IN-10: `ticks()` loops forever on a negative step

**File:** `src/ui/data/chart.tsx:18-23`

**Issue:** `ticks(0, 10, -1)` starts at 0 and keeps subtracting while `v <= to`, so it never ends. Current callers pass positive constants. `ticks` is exported for later chart code.

**Fix:** Add `if (!(step > 0) || !Number.isFinite(from) || !Number.isFinite(to)) return [];`.

---

_Reviewed: 2026-11-28T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
