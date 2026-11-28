---
phase: 03-pitch-standard-data-pipeline
reviewed: 2026-11-28T00:00:00Z
depth: standard
files_reviewed: 54
files_reviewed_list:
  - .github/workflows/ci.yml
  - biome.json
  - deploy/deny-manifest.json
  - package.json
  - pipeline/sources.allow.json
  - pipeline/src/klopp_pipeline/cli.py
  - pipeline/src/klopp_pipeline/fetch.py
  - pipeline/src/klopp_pipeline/landmarks.py
  - pipeline/src/klopp_pipeline/manifest.py
  - pipeline/src/klopp_pipeline/net.py
  - pipeline/src/klopp_pipeline/publish.py
  - pipeline/src/klopp_pipeline/scene.py
  - pipeline/src/klopp_pipeline/sources.py
  - pipeline/src/klopp_pipeline/standardise.py
  - pipeline/src/klopp_pipeline/recipes/__init__.py
  - pipeline/src/klopp_pipeline/recipes/statsbomb_shot.py
  - pipeline/src/klopp_pipeline/recipes/wyscout_goal.py
  - pipeline/tests/conftest.py
  - scripts/check-bundle.ts
  - scripts/check-immutable.ts
  - scripts/check-pitch-browser.ts
  - scripts/lib/bundle.ts
  - scripts/lib/cdp.ts
  - scripts/lib/globs.ts
  - scripts/lib/guard.ts
  - scripts/smoke.ts
  - src/index.css
  - src/pitch/CanvasLayer.tsx
  - src/pitch/Pitch.tsx
  - src/pitch/coords.ts
  - src/pitch/drag.ts
  - src/pitch/geometry.ts
  - src/pitch/useDraggableEntity.ts
  - src/pitch/view.ts
  - src/pitch/glyphs/EventGlyphs.tsx
  - src/pitch/glyphs/PlayerGlyph.tsx
  - src/pitch/glyphs/SceneLayer.tsx
  - src/pitch/legend/Legend.tsx
  - src/routes.ts
  - src/routes/dev-pitch.tsx
  - src/routes/dev.tsx
  - src/routes/dev-pitch/ConverterProbe.tsx
  - src/routes/dev-pitch/probe.ts
  - src/routes/dev-pitch/sceneSources.ts
  - src/scene/schema.ts
  - src/scene/validate.ts
  - src/scene/playback/FrameReadout.tsx
  - src/scene/playback/PlaybackBar.tsx
  - src/scene/playback/keys.ts
  - src/scene/playback/loop.ts
  - src/scene/playback/sample.ts
  - src/scene/playback/store.ts
  - src/schemas/contracts.ts
  - schemas/scene.schema.json
findings:
  critical: 0
  warning: 13
  info: 7
  total: 20
  necessity: 1
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-11-28
**Depth:** standard
**Files Reviewed:** 54 (the glyph files MarkGlyphs, BallGlyph, registry, glyphIds, Swatch, glyphSize and all test files were skimmed only)
**Status:** issues_found

## Summary

No structural findings were supplied. No external reviewer evidence was supplied. The CI/CD reference (`cicd-review-patterns.md`) was not read; CI checks below use the standard checklist from the agent brief.

What holds up under adversarial reading:

- The coordinate converter in `src/pitch/coords.ts` is a faithful port of kloppy's zone warp. Mirroring (`value > last`), the out-of-pitch fallback (`zoneIndex === -1` falls to the global per-axis scale) and the y flip all match the logic in `landmarks.py`. It is backed by a kloppy-generated parity fixture checked by both Vitest and pytest. I found no defect in it.
- Scene schema parity across JSON Schema, Zod and pydantic is tight. Property sets, bounds, `maxItems` and discriminated unions agree.
- Fetch pin enforcement is correct for sha256-pinned files. The hash is checked before any byte reaches disk, and the write is atomic. Redirects are re-validated against the allow-list. The token is stripped off non-GitHub hosts.
- The deny-glob case handling is sound: both sides are lowercased and matching is always POSIX.
- `publish.py` gates on both the manifest and the allow-list `shippable` flag, and only copies manifest-listed files.

No blockers. The concerns are gaps in the defence-in-depth gates, one latent wrong-version bug, drag and a11y edge cases, and process-cleanup holes in the browser script.

## Warnings

### WR-01: `cancel-in-progress` on push to main lets the add-only and secret guards skip a commit

**File:** `.github/workflows/ci.yml:13-15, 86-92`
**Issue:** `concurrency: ci-${{ github.ref }}` with `cancel-in-progress: true` applies to `push` on `main` too. The immutability check diffs `github.event.before...HEAD`, and gitleaks scans the same push range. If push A is cancelled by push B, B's `before` is A. A's changes are therefore never checked by `check-immutable` or gitleaks, and a version-directory edit or secret in A is waved through.
**Fix:** Cancel only on pull requests.
```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

### WR-02: Actions pinned inconsistently (mutable tags next to SHA pins)

**File:** `.github/workflows/ci.yml:25-26, 39-40, 51-52, 63-64, 80-83, 104-107, 126`
**Issue:** `gitleaks-action` and `setup-uv` are pinned to a full SHA. `actions/checkout@v7` and `actions/setup-node@v7` are mutable tags in all 7 jobs, including the job that holds `pull-requests: read`. A moved tag runs attacker code in the same workflow that polices secrets.
**Fix:** Pin both to full commit SHAs with a version comment, and let Dependabot or Renovate bump them.

### WR-03: Bundle gate only inspects part of `dist/`, and local-only deny globs are asymmetric

**File:** `scripts/check-bundle.ts:13`, `scripts/lib/bundle.ts:61-75, 87-109`, `deploy/deny-manifest.json:4-11`
**Issue:**
- `TEXT_EXTENSIONS` is `.js/.html/.css/.json`. `.mjs`, `.map`, `.svg`, `.txt`, `.csv`, `.xml` and `.webmanifest` are never scanned for `contentMarkers`.
- The "unlisted data" rule fires only for paths that start with `data/`. A licensed file placed at `dist/assets/events.csv` or `dist/foo/x.parquet` passes unless its name contains `statsbomb` or `last-row`.
- `**/*name*` exists only for statsbomb and last-row. Metrica and SkillCorner are denied only under `public/data/`, so `public/metrica/sample.csv` is not denied.
- `walk()` silently skips symlinks (`entry.isFile()` is false), so a symlinked file is never hashed.
- The git guard has the same shape. `isDeniedPath` needs a `data/<dataset>/` segment pair, so the same file under `public/metrica/` is not rejected there either.
**Fix:** Scan every non-binary file, or scan all files as latin1. Treat `.parquet`, `.csv`, `.zip`, `.ndjson`, `.jsonl` and `.xml` anywhere in `dist/` as data that must be under a ship dir. Add `**/*metrica*` and `**/*skillcorner*` globs, or generate the wildcard globs from `localOnlyDatasets`. Fail on symlinks.

### WR-04: "Newest version" is the lexicographically greatest content hash

**File:** `src/routes/dev-pitch/sceneSources.ts:81-93`, `pipeline/src/klopp_pipeline/publish.py:105`
**Issue:** Version ids are `v1-` plus 12 hex of a content hash. The comments say "Versions are add-only, so the last entry for a dataset is its newest version" and "version directories are content-hashed, so sort by path". A hash order is not a time order. As soon as a second version of `wyscout` or `statsbomb` exists, `/dev/pitch` may show the older scene with no signal. Today there is a single version, so the bug is latent.
**Fix:** Carry an explicit ordering key in the manifest and catalog (`generatedAt` or a sequence), and pick by that. Alternatively have the catalog name a `latest` pointer per dataset.

### WR-05: Licence integrity rules cover StatsBomb only; other local-only providers can validate as shippable

**File:** `src/scene/validate.ts:176-195`
**Issue:** ADR 0008 and `LOCAL_ONLY_DATASETS` make `metrica`, `skillcorner`, `last-row` and `statsbomb` local-only. `checkSceneIntegrity` rejects `shippable: true` only for `provider === "statsbomb"` or when `localOnly === true`. A scene with `provider: "metrica"`, `shippable: true`, no `localOnly` passes Zod, passes `parseScene`, and passes the pydantic model. The publish step still re-checks the allow-list, so this is a defence-in-depth hole in the layer documented as the licence rule.
**Fix:**
```ts
const LOCAL_ONLY_PROVIDERS = new Set(["statsbomb", "metrica", "skillcorner", "last-row"]);
if (src.provider && LOCAL_ONLY_PROVIDERS.has(src.provider) && src.shippable) {
  add("This provider is local-only and never shippable (ADR 0008).", "source", "shippable");
}
```
Keep the StatsBomb logo rule as is.

### WR-06: Stale arrow-key nudge state after a pointer drag or an external position change

**File:** `src/pitch/useDraggableEntity.ts:96-98, 135-156, 200-222`
**Issue:** `nudged.current` and its 500 ms timer are never cleared by `onPointerDown`, `cancel`, `onPointerUp` or a position change from outside (for example "Reset positions"). Sequence: arrow-nudge, then a mouse drag within 500 ms. On drop `onEnd(dragEnd)` fires, then the timer fires `onEnd(staleNudge)`, so the live region announces the old position. A nudge after the drag also starts from `nudged.current ?? position`, so the player jumps back to the pre-drag nudge point. `onPointerDown` also overwrites `active.current` without releasing a still-active first pointer (multi-touch), which orphans that capture.
**Fix:** At the start of `onPointerDown` run `if (active.current) return;` then `nudged.current = null; clearTimeout(nudgeTimer.current)`. Do the same in `cancel`. Reset `nudged` when `position` changes.

### WR-07: `check:pitch` SIGINT/SIGTERM handler leaves headless Edge and its temp profile running

**File:** `scripts/check-pitch-browser.ts:673-680`
**Issue:** The handler calls only `stopAll()`, which stops Vite, then `process.exit(130)`. The `finally` block that runs `browser.close()` never runs. Ctrl-C mid-run orphans `msedge.exe` and its `klopp-cdp-*` profile folder under the OS temp dir. The CDP tool header promises "close() kills the process tree and removes the profile".
**Fix:** Make the handler async-safe. Hold `browser` in the module scope and call `await browser?.close()` before exiting, or call `killTree` synchronously from the handler.

### WR-08: Commit-pinned (sha256 null) cached files are trusted by size only

**File:** `pipeline/src/klopp_pipeline/fetch.py:36-49, 96-101`, `pipeline/sources.allow.json:49-67`
**Issue:** The three StatsBomb files have `sha256: null`. `_cached_ok` accepts any cached file under `maxBytes` (8 MB), and a fresh download is written with no hash recorded. A truncated, corrupted or locally altered file in `pipeline/data/raw/statsbomb/` is used silently, and `write_scene_version` then records whatever hash is on disk as the input hash, laundering the tampering. The commit in the URL only protects the first download.
**Fix:** Record the sha256 of the first verified download in the allow-list (trust on first use), or at least in a sidecar. Treat a later mismatch as `FetchError`. Prefer requiring `sha256` for every file and drop the commit-in-URL alternative.

### WR-09: A leftover `.tmp` staging directory breaks `publish` and `build_catalog` for good

**File:** `pipeline/src/klopp_pipeline/publish.py:43-52`, `pipeline/src/klopp_pipeline/manifest.py:197-210`
**Issue:** The staging folder `.v1-xxxx.tmp` already holds `manifest.json` before `os.replace`. After a hard crash or power loss the folder stays, and `_versions()` lists it because it only checks for the manifest. `read_version` then raises `ManifestError` (`directory.name != manifest.version`), so every later `publish` and `run-all` fails until someone deletes the folder by hand. `.gitignore` does not cover `.v*.tmp` either, so it can be committed from `public/data/`.
**Fix:** Skip dot-prefixed directories in `_versions`. Add `.*.tmp` to `.gitignore`. Optionally sweep stale staging folders at the start of `write_version` and `_copy_version`.

### WR-10: CLI error handling and allow-list handling are inconsistent

**File:** `pipeline/src/klopp_pipeline/cli.py:137-149, 188-211`, `pipeline/src/klopp_pipeline/recipes/wyscout_goal.py:65, 333-336`, `recipes/statsbomb_shot.py:197-201`
**Issue:**
- `recipe` and `run-all` catch `FetchError`, `StandardiseError` and `ManifestError`. `RecipeError` (a `ValueError`) and pydantic `ValidationError` from building a `Scene` escape as raw tracebacks. A bad shot id or an empty team kebab (`kebab()` can return `""`) fails with a stack, not a clean `recipe failed:` line.
- `run-all --sources FILE` loads a custom allow-list for the initial fetch and for licence facts, but each recipe's `build(raw_dir, offline)` calls `fetch_source(...)` with `allow=None`, which re-reads the default file. Data can come from the default list while the manifest carries the custom licence and attribution.
**Fix:** Catch `RecipeError` and `pydantic.ValidationError` in both commands. Thread `allow` into `Recipe.build` (change the signature to `build(raw_root, offline, allow)`).

### WR-11: Version id ignores metadata, so a licence or `shippable` change is silently dropped on re-run

**File:** `pipeline/src/klopp_pipeline/manifest.py:116-118, 170-172`
**Issue:** `version_id()` hashes only file bytes. If the allow-list's `licence`, `attribution`, `licenceUrl` or `shippable` changes and the scene bytes do not, `write_version` finds the existing directory, sees the same bytes, and returns `created=False`. The stored manifest keeps the old licence and `shippable` value. `publish` and `catalog.json` then ship the stale licence text. The reverse direction (a source moved from shippable to local-only) keeps the old `shippable: true` manifest in `data/`, and only the allow-list check in `publish` stops it.
**Fix:** In `write_version`, when the directory exists compare the new manifest's non-timestamp fields to the stored one and raise `ImmutableVersionError` on a difference. Or include the licence fields in `version_id`.

### WR-12: `uv run` without `--locked` in CI and npm scripts

**File:** `package.json:22-26`, `.github/workflows/ci.yml:119`
**Issue:** `uv run --project pipeline pytest ...` re-resolves and rewrites `uv.lock` when the lock is stale or missing a platform. The Windows smoke job runs `npm run pipeline:test` with no prior `uv sync --frozen`, so it can pass against freshly resolved dependency versions that are not the committed ones. `npm run data` has the same behaviour on the learner's machine.
**Fix:** Use `uv run --locked --project pipeline ...` (or `--frozen`) everywhere.

### WR-13: Draggable player exposes `role="button"` with no activation behaviour and no operating instructions

**File:** `src/pitch/glyphs/PlayerGlyph.tsx:188-199`, `src/pitch/useDraggableEntity.ts:192-223`
**Issue:** Screen readers announce a "button", so Enter and Space are expected to do something. They do nothing, and Space is not `preventDefault`-ed (`handleTransportKey` also returns false for `[data-draggable]`), so it scrolls the page. Nothing tells the user that arrows move the player, Shift moves 5 m, and Escape cancels. While `active.current` is set, arrow keys fall through without `preventDefault`, so the page scrolls during a pointer drag.
**Fix:** Use a role whose keyboard contract matches (for example `group` with a roving-focus note) and keep `aria-roledescription="draggable player"`, add `aria-describedby` pointing at a visually hidden instruction string, and `preventDefault` on Space and on arrows during an active drag.

## Info

### IN-01: Time slider cannot reach `duration` (step 0.04)

**File:** `src/scene/playback/PlaybackBar.tsx:92-102`
**Issue:** `max={duration}` is generally not a multiple of `step=0.04` from min 0. A range input snaps to the largest step-aligned value at or below max (for example 7.28 when duration is 7.3), so dragging to the far right never reaches the last frame or the `ended` state, and the controlled `value={t}` is re-sanitised each render.
**Fix:** Use `step="any"`, or round `max` down to a step multiple and handle the end separately with the End key and the Next frame button.

### IN-02: `check-immutable` diff filter omits type changes

**File:** `scripts/check-immutable.ts:99-107`
**Issue:** `--diff-filter=MDR` leaves out `T` (a file replaced by a symlink or the reverse), which also changes the content of a version directory. `--staged` mode has no filter, so the two modes disagree.
**Fix:** Use `--diff-filter=MDRT`.

### IN-03: Bundle gate's fixed 5 MiB per-file limit will reject the planned WASM assets; two manifest keys are read only by tests

**File:** `deploy/deny-manifest.json:15`, `scripts/lib/bundle.ts:69-76`
**Issue:** `assetFileBytes: 5242880` is applied to every file in `dist/`, but the project stack plans DuckDB-WASM (about 36 MB raw) and Pyodide assets as lazy-loaded files. The gate will fail the first data-lab phase until someone edits the manifest, probably by loosening the limit for everything. `scope` is parsed but never read by the checker (only `deny-manifest.test.ts` asserts it).
**Fix:** Add per-glob size limits (`assetLimits: [{ glob, bytes }]`), keeping 5 MiB as the default. Either use `scope` to filter checked files or drop it.

### IN-04: Necessity: `PlaybackState.load` is never called by product code

**File:** `src/scene/playback/store.ts:43-44, 155-157`
**Category:** necessity
**Issue:** The store is a factory with one store per scene by design (header comment), and `dev-pitch.tsx` builds a new store through `useMemo` whenever the scene changes (`dev-pitch.tsx:198-203`). `load` has no non-test caller in `src/` (grep: the only call is `store.test.ts:82`). The path it would serve, reusing a clock across scenes, is excluded by the design the file states. It also resets `playing` without touching the loop. Info because it is a small public method the tests deliberately cover.
**Fix:** Remove `load` and its test, or note that it is reserved for the lesson player.

### IN-05: Deny-glob matching ignores dotfiles

**File:** `scripts/lib/globs.ts:15-17`
**Issue:** `path.posix.matchesGlob` follows minimatch defaults (`dot: false`). `public/data/statsbomb/.x.json` does not match `public/data/statsbomb/**`, and `.cache/statsbomb.json` does not match `**/*statsbomb*`. Under `data/` the "unlisted-data" rule catches the first case, so the gap is only real for dotfiles outside `data/`. Verified with Node 24.21: `matchesGlob(".cache/statsbomb.json","**/*statsbomb*")` is `false`.
**Fix:** Add a segment check in `matches()` that tests dot segments against the glob with the dot removed, or add explicit `**/.*statsbomb*` globs.

### IN-06: Recipe builders assume non-null coordinates and unique event times

**File:** `pipeline/src/klopp_pipeline/recipes/wyscout_goal.py:120-121, 212-263`
**Issue:** `_xy(event.coordinates)` raises `AttributeError` if kloppy yields `None` (some passes and ball-out events have no coordinates). Two chain events with the same `timestamp` produce two frames with the same `t`, which `validate.ts` rejects (`frame.t <= prev.t`), but Python never runs that rule. The pinned goal is fine today, so the failure would appear only when another recipe config is added.
**Fix:** Raise `RecipeError` on a missing coordinate, and de-duplicate or nudge equal frame times in the recipe. Consider porting the frame-order check into `scene.py`.

### IN-07: Converter probe uses `type="number"` plus a stricter plain-decimal regex; toolbar role steals toolbar arrow keys

**File:** `src/routes/dev-pitch/ConverterProbe.tsx:71-83`, `src/routes/dev-pitch/probe.ts:31-39`, `src/scene/playback/PlaybackBar.tsx:72`, `src/scene/playback/keys.ts:58-65`
**Issue:**
- A `type="number"` input yields `"1e2"` for valid exponent input, and `DECIMAL` then rejects it with "x must be a number." The live region (`aria-live="polite"` on the readout) also announces on every keystroke.
- The playback bar has `role="toolbar"`, but ArrowLeft/ArrowRight on a focused toolbar button step frames instead of moving between toolbar buttons (the APG toolbar pattern).
**Fix:** Use `type="text" inputMode="decimal"` for the probe and debounce the announcement. Drop `role="toolbar"` and use `role="group"`, or add roving focus and move the frame-step keys elsewhere.

---

_Reviewed: 2026-11-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
