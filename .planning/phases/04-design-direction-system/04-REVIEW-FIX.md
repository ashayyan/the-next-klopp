---
phase: 04-design-direction-system
fixed_at: 2026-11-28T14:30:00Z
review_path: .planning/phases/04-design-direction-system/04-REVIEW.md
iteration: 1
findings_in_scope: 18
fixed: 16
skipped: 2
status: partial
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-11-28T14:30:00Z
**Source review:** .planning/phases/04-design-direction-system/04-REVIEW.md
**Iteration:** 1

**Summary:**

- Findings in scope: 18. That is CR-01, WR-01 to WR-07, and all 10 Info items. The Info items were judged one by one: cheap and safe ones were fixed, and the others were skipped with a reason.
- Fixed: 16
- Skipped: 2 (IN-04, IN-06)

Work ran in the main checkout on `gsd/phase-04-design-direction-system`, because `workflow.use_worktrees` is `false`. No worktree was created. Each finding has one atomic commit, and every commit went through the normal husky and lint-staged hooks.

## Fixed Issues

### CR-01: The light theme cannot be applied to a subtree when the document is dark

**Files modified:** `scripts/design/tokens.ts`, `src/styles/tokens.css`, `scripts/design/build-tokens.test.ts`, `tests/functional/theme.spec.ts`
**Commit:** 10bc2c4
**Applied fix:**

- `generateSystemCss` now emits a `[data-theme="light"]` block. `generateScopedCss` now emits a `${scope}[data-theme="light"]` block. Each block holds the light themed set and `color-scheme: light`.
- `src/styles/tokens.css` was regenerated, and `build-tokens --check` passes.
- New unit test on the generated CSS, for both the system and the scoped output.
- New functional spec. With `colorScheme: "dark"`, it opens `/dev/directions/floodlit/tactics?theme=light` and asserts that the scope's `--surface-page` is the light value and that the body background is light.
- Checked against the old `tokens.css`: the spec fails there with `#0E151D` received.

### WR-01: The tap-size "running text" exemption covers every link in a list item or paragraph

**Files modified:** `scripts/review/browser.ts`, `scripts/review/lib.ts`, `src/routes/dev.tsx`, `src/routes/dev-gallery.tsx`, `src/routes/dev-directions.tsx`, `src/routes/dev-pitch.tsx`, `src/routes/home.tsx`, `src/routes/not-found.tsx`
**Commit:** f7bf5df
**Applied fix:**

- A target now counts as running text only when both of these hold:
  - It is an inline `<a>` (`display: inline`), or an inline or inline-block `<button>` inside a `<p>`.
  - Its closest `p` or `li` holds letters or digits outside any link or button.
- The standalone links now have 44 px targets (`inline-flex min-h-11 items-center`, plus `min-w-11` where the labels are short) and 8 px list spacing, instead of the exemption. The links changed:
  - "Back to dev routes", in the gallery, directions and pitch pages
  - "Back to home" and "Dev routes"
  - the `/dev` route list (`space-y-2`)
  - the gallery primitive list (`gap-2`)
  - the directions index links and their fallback list (`gap-y-2` and `gap-2`)
- After the change, `review:screens` gives PASS on `/dev/gallery`, `/dev/directions`, and the tactics and data screens.
- `/dev` now passes tap-size. It still fails `focus-visible`, because its Phase 1 links have no focus-ring classes. That failure was there before this pass and was left alone, as a different rule.

### WR-02: The 0.15 px gap tolerance on rounded boxes hides a logged real defect

**Files modified:** `scripts/review/browser.ts`, `scripts/review/lib.ts`, `scripts/review/review.test.ts`, `src/scene/playback/PlaybackBar.tsx`, `.planning/phases/04-design-direction-system/deferred-items.md`
**Commit:** f0d087f
**Status:** fixed: requires human verification (logic change in a review gate)
**Applied fix:**

- The collector now sends the unrounded hit box as `exact`, next to the 0.1 px display `box`.
- `evalTapSize` judges sizes and gaps on `exact`, with `TAP_EPSILON_PX = 1/64`. The old 0.15 px allowance is gone.
- New unit tests:
  - Gaps of 7.9 and 7.95 px fail.
  - Gaps of 8 − 1/128 px and 8 px pass.
  - A width of 43.95 px fails.
- PlaybackBar was measured unrounded in Chrome. The viewport was 1024 px, the container was 480 to 639 px wide, and fractional offsets were added. Every pair of targets was at least 8.00 px apart, so the logged 7.9 px gap came from rounding.
- The real narrow-container defect was the scrubber. With `min-w-0` it shrank to about 33 px wide in a 560 px container. It now has `min-w-11`.
- `deferred-items.md` is updated with these results.

### WR-03: The selectable data table is mouse-dead and declares a grid it does not implement

**Files modified:** `src/ui/data/DataTable.tsx`, `src/ui/ui.test.tsx`, `tests/functional/directions.spec.ts`
**Commit:** e7fc309
**Status:** fixed: requires human verification (interaction logic)
**Applied fix:**

- The table keeps `role="grid"` and now implements the keyboard model that role promises:
  - Roving tabindex gives one tab stop: the last focused row, else the active row, else the first row.
  - ArrowUp, ArrowDown, Home and End move between rows.
  - A click, Enter or Space selects the row and seeks to it.
- New unit test for the tab stops.
- New functional spec on the data screen. It checks that a click seeks to 9.7 s, that ArrowUp moves focus, that Space selects, and that there is one tab stop.

### WR-04: `copy-fonts --family` rewrites LICENSES.md with only that family's licence

**Files modified:** `scripts/design/copy-fonts.ts`, `scripts/design/copy-fonts.test.ts`
**Commit:** 3b30611
**Applied fix:**

- `renderLicences` now always uses `allRefs`. `--family` narrows only the copy loop.
- New test: a `--family` run leaves `LICENSES.md` unchanged, byte for byte. The test fails without the fix.
- `npm run fonts -- --check` passes.

### WR-05: `review:screens` silently reviews a stale `dist/` for non-dev routes

**Files modified:** `scripts/review/browser.ts`, `scripts/review/lib.ts`, `scripts/review/review.test.ts`, `scripts/review-screens.ts`
**Commit:** 66bf196
**Applied fix:**

- `ensureServer` now always builds before it starts `vite preview`.
- A reused preview server prints a warning.
- `report.json` gains `source: { commit, fresh }`:
  - `commit` is HEAD's hash, with `-dirty` when tracked files differ from it.
  - `fresh` is false for a reused preview server.
- Checked live on `/`: the command built, ran preview on 4173, gave PASS, recorded `fresh: true`, and stopped its server.

### WR-06: The dist leak check does not cover any Phase 4 dev module

**Files modified:** `scripts/lib/bundle.ts`, `scripts/check-bundle.test.ts`, `scripts/smoke.ts`
**Commit:** 615e8e5
**Applied fix:**

- New `DEV_ONLY_MARKERS` list with six markers: dev, dev-pitch, the gallery, the directions route, the review fixture, and the DESIGN.md section 1 heading.
- `check-bundle.ts`, the required CI gate, now runs them on code chunks as rule `dev-leak`. `smoke.ts` uses the same list.
- New tests check that each marker is flagged and is still present in its source file.
- A development-mode build into the scratch folder trips all six markers. The normal build passes `guard:bundle`.

### WR-07: Disabled quiz options are double-muted to about 2.2:1 while the learner must still read them

**Files modified:** `src/ui/lesson/QuizOption.tsx`, `tests/functional/gallery.spec.ts`
**Commit:** bc26523
**Applied fix:**

- A disabled option keeps `text-ink-muted` and adds `disabled:opacity-100!`, which cancels `CONTROL_BASE`'s 50 % opacity.
- The functional spec asserts a computed opacity of 1. Without the fix it reads 0.5.

### IN-01: The theme attribute cleanup deletes the stored theme instead of restoring the previous value

**Files modified:** `src/routes/dev-gallery.tsx`, `src/routes/dev-directions/DirectionScope.tsx`, `tests/functional/theme.spec.ts`
**Commit:** 3176146
**Applied fix:**

- `BareMatrix` (on `<html>`) and `DirectionScope` (on `<body>`) now save the prior attribute values and restore them on unmount.
- New functional spec: with stored light, a gallery page set to dark, then an in-app navigation to `/dev`, `<html>` is back to light. The spec fails without the fix.

### IN-02: `applyDocumentTheme` is never called by the app

**Files modified:** `src/routes/dev-directions/DirectionScope.tsx`, `tests/functional/directions.spec.ts`
**Commit:** fa32c1e
**Applied fix:**

- `choose()` now calls `applyDocumentTheme`, so `<html>` follows the theme-menu choice at once.
- The spec asserts `html[data-theme=light]` before the reload.

### IN-03: `GlossaryCard` accepts `term` and ignores it

**Files modified:** `src/ui/lesson/GlossaryCard.tsx`, `src/ui/ui.test.tsx`
**Commit:** 0c2b812
**Applied fix:** The card now renders `data-glossary-card={term}`. Existing `[data-glossary-card]` selectors still match. New unit test.

### IN-05: update-snapshots ref handling

**Files modified:** `.github/workflows/update-snapshots.yml`, `scripts/design/baselines-guard.test.ts`
**Commit:** 758cadc
**Applied fix:**

- Both jobs now use `if: startsWith(github.ref, 'refs/heads/') && github.ref != 'refs/heads/main'`.
- The push goes to `HEAD:refs/heads/$BRANCH`.
- A per-ref concurrency group (`cancel-in-progress: false`) queues a second dispatch instead of racing it.
- Static workflow tests updated, and the YAML parses.

### IN-07: Necessity (phantom requirement): three-direction plumbing after the ADR 0010 collapse

**Files modified:** `src/routes/dev-directions/DirectionScope.tsx`
**Commit:** 7fde075
**Status:** fixed: requires human verification (necessity finding, partial)
**Applied fix:**

- `Direction["id"]` is narrowed to `"floodlit"`.
- The token-folder scan (`activeTokenInput`, `listTokenInputs`, the check-palette dedupe) was not changed. Whether direction sets come back is a scope decision for a later phase, so it is recorded here for the human.
- The ADR history tests that name programme and notebook are correct and stay.

### IN-08: The `hov` variant applies hover styles on touch devices

**Files modified:** `src/index.css`
**Commit:** 851e14d
**Applied fix:**

- `@custom-variant hov` now wraps `:hover` in `@media (hover: hover)`. The forced `[data-state~="hover"]` look still applies everywhere.
- The built CSS shows `@media (hover:hover){.hov\:bg-surface-panel:hover{...}}`.
- The gallery functional specs pass, and the `/dev/gallery/button?bare=1` review gives PASS.

### IN-09: StepRail with an unknown `current` reads "step 0 of 7"

**Files modified:** `src/ui/lesson/StepRail.tsx`, `src/ui/ui.test.tsx`
**Commit:** 4cbbfe2
**Applied fix:** The `findIndex` result is clamped with `Math.max(0, ...)`. New unit test: an unknown id gives "Hook, step 1 of 7" and exactly one `aria-current="step"`.

### IN-10: `ticks()` loops forever on a negative step

**Files modified:** `src/ui/data/chart.tsx`, `src/ui/ui.test.tsx`
**Commit:** b39e73b
**Applied fix:** `ticks()` returns `[]` unless `step > 0` and both bounds are finite. New unit test.

## Skipped Issues

### IN-04: The `text-contrast` check ignores ancestor `opacity`

**File:** `scripts/review/browser.ts:316-345`, `scripts/review/lib.ts:361-392`
**Reason:**

- Skipped: the fix is not cheap, and it would change gate behaviour.
- Folding ancestor opacity into the composited colour means changing the collector and the evaluator. It can turn current passes into new FAILs, for example on `has-data-disabled` checkbox rows and on popups mid-transition.
- Each new FAIL then needs a design judgment: either exempt it or restyle it.
- It belongs in a planned review-gate change, not a cheap Info fix.

**Original issue:** CSS `opacity` on the element or an ancestor is not composited, so the check computes a higher ratio than what is painted.

### IN-06: Stale baselines are never removed

**File:** `playwright.config.ts:21`, `scripts/design/baselines-guard.test.ts:12-24`
**Reason:**

- Skipped: no Linux baselines are committed yet (`tests/visual/__baselines__/` does not exist).
- An equality check against inventory × themes × widths would fail at once. It could only be tested after the first `update-snapshots` run.
- Add it when the first baseline set lands.

**Original issue:** `updateSnapshots: "changed"` never deletes the baseline of a renamed or removed primitive, and the guard does not compare baselines with `inventory.json`.

## Verification

All gates ran in the **main checkout** (`E:/To become new klop`, no worktree). They used the reused dev server on port 5184, and preview on 4173 was started and stopped by the commands themselves. Port 5173 was not used.

| Gate | Result |
| --- | --- |
| `npm test` | 53 files, 1250 passed, 6 skipped |
| `npx tsc --noEmit` | clean |
| `npx biome ci .` | clean (1 info from before this pass: `noUselessTernary` in `src/ui/Dialog.tsx:73`, not touched) |
| `npm run guard` | 516 tracked files ok |
| `npm run tokens:check` | ok |
| `npm run build && npm run guard:bundle && npm run smoke` | built; bundle ok (11 files); smoke ok (preview) |
| `REVIEW_PORT=5184 npx playwright test --project=functional` | 101 passed |
| `review:screens /dev/directions/floodlit/tactics` | PASS, 0 fail, 1 warn (taste-copy, a warning only) |
| `review:screens /dev/directions/floodlit/data` | PASS, 0 fail, 1 warn (taste-copy, a warning only) |
| `review:screens /dev/gallery` | PASS, 0 fail, 0 warn |

The visual project was not run locally, because its baselines come only from Linux CI. Generated review screenshots stay under the git-ignored `test-results/`.

---

_Fixed: 2026-11-28T14:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
