---
phase: 04-design-direction-system
verified: 2026-11-28T15:20:00Z
status: passed
score: 5/5 roadmap success criteria verified; 17/17 plans' must-haves verified (2 direction-era checks superseded by 04-13 as designed); 3/3 previous warnings closed
covered_files: [".github/workflows/ci.yml", ".github/workflows/update-snapshots.yml", ".planning/phases/04-design-direction-system/04-01-PLAN.md", ".planning/phases/04-design-direction-system/04-01-SUMMARY.md", ".planning/phases/04-design-direction-system/04-02-PLAN.md", ".planning/phases/04-design-direction-system/04-02-SUMMARY.md", ".planning/phases/04-design-direction-system/04-03-PLAN.md", ".planning/phases/04-design-direction-system/04-03-SUMMARY.md", ".planning/phases/04-design-direction-system/04-04-PLAN.md", ".planning/phases/04-design-direction-system/04-04-SUMMARY.md", ".planning/phases/04-design-direction-system/04-05-PLAN.md", ".planning/phases/04-design-direction-system/04-05-SUMMARY.md", ".planning/phases/04-design-direction-system/04-06-PLAN.md", ".planning/phases/04-design-direction-system/04-06-SUMMARY.md", ".planning/phases/04-design-direction-system/04-07-PLAN.md", ".planning/phases/04-design-direction-system/04-07-SUMMARY.md", ".planning/phases/04-design-direction-system/04-08-PLAN.md", ".planning/phases/04-design-direction-system/04-08-SUMMARY.md", ".planning/phases/04-design-direction-system/04-09-PLAN.md", ".planning/phases/04-design-direction-system/04-09-SUMMARY.md", ".planning/phases/04-design-direction-system/04-10-PLAN.md", ".planning/phases/04-design-direction-system/04-10-SUMMARY.md", ".planning/phases/04-design-direction-system/04-11-PLAN.md", ".planning/phases/04-design-direction-system/04-11-SUMMARY.md", ".planning/phases/04-design-direction-system/04-12-PLAN.md", ".planning/phases/04-design-direction-system/04-12-SUMMARY.md", ".planning/phases/04-design-direction-system/04-13-PLAN.md", ".planning/phases/04-design-direction-system/04-13-SUMMARY.md", ".planning/phases/04-design-direction-system/04-14-PLAN.md", ".planning/phases/04-design-direction-system/04-14-SUMMARY.md", ".planning/phases/04-design-direction-system/04-15-PLAN.md", ".planning/phases/04-design-direction-system/04-15-SUMMARY.md", ".planning/phases/04-design-direction-system/04-16-PLAN.md", ".planning/phases/04-design-direction-system/04-16-SUMMARY.md", ".planning/phases/04-design-direction-system/04-17-PLAN.md", ".planning/phases/04-design-direction-system/04-17-SUMMARY.md", "docs/DESIGN.md", "docs/decisions/0010-visual-direction.md", "index.html", "package.json", "playwright.config.ts", "public/fonts/LICENSES.md", "scripts/design/baselines-guard.test.ts", "scripts/design/build-tokens.ts", "scripts/design/check-palette.ts", "scripts/design/copy-fonts.ts", "scripts/design/tokens-schema.ts", "scripts/design/tokens.ts", "scripts/review-screens.ts", "scripts/review/browser.ts", "scripts/review/lib.ts", "scripts/review/taste.ts", "src/index.css", "src/pitch/glyphs/PlayerGlyph.tsx", "src/pitch/glyphs/SceneLayer.tsx", "src/pitch/glyphs/glyphSize.ts", "src/pitch/glyphs/glyphs.test.tsx", "src/pitch/glyphs/placement.test.ts", "src/pitch/glyphs/placement.ts", "src/pitch/glyphs/registry.ts", "src/pitch/legend/Legend.tsx", "src/pitch/legend/glyphIds.ts", "src/pitch/legend/legend.test.tsx", "src/routes/dev-directions.tsx", "src/routes/dev-directions/DataScreen.tsx", "src/routes/dev-directions/DirectionScope.tsx", "src/routes/dev-directions/TacticsScreen.tsx", "src/routes/dev-gallery.tsx", "src/routes/dev-gallery/gallery.test.tsx", "src/routes/dev-gallery/inventory.json", "src/routes/dev-gallery/registry.ts", "src/routes/dev.tsx", "src/styles/tokens.css", "src/ui/theme.ts", "tests/functional/directions.spec.ts", "tests/functional/gallery.spec.ts", "tests/functional/pitch-fixes.spec.ts", "tests/functional/theme.spec.ts", "tests/functional/tokens.spec.ts", "tests/visual/gallery.visual.spec.ts"]
covered_digest: "v4:sha256:7308c2f17d541a47b40025369a694d17e0476e29bf4526385cd38a8de2e076be"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: "5/5 roadmap success criteria; 17/17 plans (3 warnings)"
  previous_commit: 420b1b5
  reason: "Stale: the 04-UI-REVIEW fix commits (ee958e3..0d2e27c) changed covered files"
  gaps_closed:
    - "Warning 1: legend said 'shirt number' while discs show position codes / initials"
    - "Warning 2: sequence badges collided with each other; ball covered the EM disc label at t=0"
    - "Warning 3: DESIGN.md section 2 contradicted section 4 (known gaps)"
  gaps_remaining: []
  regressions: []
deferred:
  - truth: "Visual baselines are generated only by CI on Linux (first baseline set exists and the `visual` job is green)"
    addressed_in: "Phase 4 post-merge step (STATE.md Deferred Verification)"
    evidence: "GitHub only dispatches workflow_dispatch workflows that exist on the default branch; update-snapshots.yml answered 404 on the phase branch. Mechanism in place: visual job in mcr.microsoft.com/playwright:v1.65.1-noble, update-snapshots.yml (dispatch-only, refuses main, commits only *-linux.png), updateSnapshots 'none' unless CI && UPDATE_BASELINES=1, test.skip without CI, Vitest platform guard. CI run 46135577547: 98 functional passed on Linux; all 222 visual failures were exactly 'A snapshot doesn't exist'."
human_verification: []
---

# Phase 4: Design Direction & System Verification Report

**Phase Goal:** As a learner, I want to pick a visual direction from real rendered screens and get a design system that enforces it, so that every lesson looks designed, accessible and consistent instead of generic.
**Mode:** mvp (goal is a valid User Story)
**Verified:** 2026-11-28T15:20:00Z
**Status:** passed
**Re-verification:** Yes. The previous report (passed, HEAD 420b1b5) was stale after the 04-UI-REVIEW fix commits. This run is at HEAD `0d2e27c`. Every gate was re-run, and the three previous warnings were checked against the code, the tests and fresh captures.

## Commits since the previous verification

`git log 420b1b5..HEAD`: `f757e7b` (docs), `ee958e3` UI-1 fit labels, `22fdcd1` UI-2 legend disc text, `799f8e5` UI-3 badge-vs-badge + real note-chip check, `f13c8d5` UI-4 ball beside disc, `59b30ce` UI-5 DESIGN.md §2/§4, `4d2dcbe`/`d6c3dfd` UI-6 "1 state", `b78dfff` UI-7 /dev focus ring, `b40b6d9` UI-8 drop 5 unused font packages, `0d2e27c` docs.

## User Flow Coverage (MVP)

| Story step | Expected | Evidence in codebase | Status |
|---|---|---|---|
| See real rendered directions | 3 directions x 2 real screens x 3 widths | Route commit `f6e513d` holds the three direction token sets; ADR 0010 lists 60 screenshot paths with SHA-256 (unchanged since 420b1b5) | VERIFIED |
| Pick a direction | Pick recorded in `docs/decisions/` | ADR 0010 picks `floodlit` (81.25 vs 73.75 / 73.75), with the delegation line; `adr-0010.test.ts` passes in this run | VERIFIED (delegated checkpoint) |
| Get a design system that enforces it | DESIGN.md + generated tokens + gates | DESIGN.md 8 sections; `tokens:check`, `palette`, `review:screens` all pass in this run | VERIFIED |
| Outcome: lessons look designed, accessible, consistent | Enforcement exists and the picked screens pass it | `review:screens` PASS (0 fail) on `/dev`, floodlit tactics, floodlit data, floodlit data at `t=11.48`, and `/dev/gallery`. The seeded gradient fixture FAILs (6 fail, exit 1) | VERIFIED |

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Learner opens 2-3 distinct directions (tactics + data screen each, screenshots at 3 widths), picks one, pick recorded in `docs/decisions/` | VERIFIED | ADR 0010 is unchanged since 420b1b5. It holds the gates, weighted criteria, per-score evidence, 60 hashes and route commit `f6e513d`. The pick was delegated per the ROADMAP Checkpoint line and 04-CONTEXT. The learner may override (STATE.md todo). |
| 2 | DESIGN.md covers anti-slop rules, colour system (dark/light, team A/B, ball, zones, data scales) with a passing colour-blind-safety script, typography, spacing, motion, lesson templates, data-viz standards, quality bar | VERIFIED | §1-§8 are present. `npm run palette` gives PASS floodlit dark (teams 24.4/27.4) and PASS floodlit light (21.9/31.2). `design-md.test.ts` passes. §2 and §4 now agree: §2 names the rules that keep the pitch-layer defects fixed, and §4 replaces the "Known gaps" bullet with "Checked in a browser" (the rules are spelled out in §4 Placement and Sizing). |
| 3 | Tokens generated from DESIGN.md drive the Tailwind theme; changing a token and regenerating visibly changes the app and the pitch | VERIFIED | `npm run tokens:check` gives "tokens ok: 1 file(s)". `tests/functional/tokens.spec.ts` (real generator on a modified DESIGN.md copy, run in Chrome) passes within the 109 functional tests. |
| 4 | `/dev/gallery` shows every primitive and interaction at 3 widths; visual baselines generated only by CI on Linux, never overwritten locally | VERIFIED (baseline generation deferred to post-merge) | 37-id inventory; `gallery.test.tsx` passes; the functional gallery specs (all 37 bare pages, widths, themes, fallbacks, the new "1 state" assertion) pass. `review:screens /dev/gallery` gives PASS with 0 warn. No gallery strings in `dist/` (`guard:bundle` ok). Baseline mechanism: see Deferred. |
| 5 | A screenshot-review command captures any screen at 3 widths, runs the taste-skill review against DESIGN.md, writes a pass/fail report | VERIFIED | Run here on port 5184: `/dev` PASS 0 warn (exit 0; it had 6 fail before UI-7). Floodlit tactics: PASS, 1 warn. Floodlit data: PASS, 1 warn. Data `--states t=11.48`: PASS. `/dev/gallery`: PASS. `/dev/review-fixture?case=gradient`: FAIL, 6 fail (exit 1). Reports and screenshots are in `test-results/review/<slug>/`. |

**Score:** 5/5 roadmap truths verified (0 present, behavior-unverified)

### Previous warnings: re-checked

| # | Warning (420b1b5) | Fix in code | Behavioral evidence | Status |
|---|---|---|---|---|
| 1 | Legend says "Filled disc with shirt number" while discs show position codes | `registry.ts` descriptions carry a `{disc-text}` slot. `glyphIds.ts` `discTextKinds`/`describeDiscText` derive it from the scene entities: number gives "shirt number", label + role gives "position code", label + name gives "player initials". `Legend.tsx` uses `descriptionFor` | directions.spec "the legend says position code on the tactics screen and player initials on the data screen" passes (it asserts no "shirt number"). `legend.test.tsx` passes. The 1440-dark tactics capture reads "Filled disc with position code."; the 375 data capture at t=11.48 reads "Filled disc with player initials." | CLOSED |
| 2a | `placeBadge` ignores earlier badges | `placement.ts` adds `badges` obstacles with a `BADGE_GAP_PX` of 2. A disc-only fallback pass means a badge never lands on a disc to dodge a badge. `SceneLayer.tsx` places badges in sequence-annotation order and feeds `placed` | pitch-fixes.spec "375 px / 1440 px: no badge overlaps a player disc or another badge in any frame" passes. It steps every frame, compares every badge pair, and requires a frame with 3+ badges, so it is not vacuous. `placement.test.ts` passes. The 375 capture at t=11.48 shows badges 1-6 apart. | CLOSED |
| 2b | Ball over the "EM" label at t=0 | `SceneLayer.tsx`: the owned-ball offset is now `(discDiameter + ballDiameter) / 2`, replacing `0.6 * d` | pitch-fixes.spec "375 / 768 / 1440 px: at 0.0 s the ball sits beside the EM disc, clear of its label" passes. It asserts the ring-to-label-ink gap is over 1 px and does not cover the fill. | CLOSED |
| 3 | DESIGN.md §2 contradicts §4 | `59b30ce`: §2 now says the defects are fixed and names the rules; §4 drops "Known gaps" and describes the browser checks | Read the diff: no remaining "known gap" or open-defect statement in §4 Placement. deferred-items.md marks the 04-12 items resolved. | CLOSED |

Extra UI fixes verified: UI-1 label fit (`fitLabel`, condensed `font-stretch: 75%`, `textLength` fallback). The functional test "every position code and initial sits inside its disc" (tactics both shapes, data screen, glyph sheet; 375 and 1440) measures ink boxes against the inner disc and passes. The 1440-dark capture shows CM/DM/RW/LW inside the discs. UI-6: "1 state" is asserted in gallery.spec. UI-7: the `/dev` review passes. UI-8: `copy-fonts.ts --check` gives "fonts ok"; `git grep` finds no reference to archivo/newsreader/martian-mono/atkinson outside the lockfile and planning; `npm ls --depth=0` shows no missing or extraneous packages.

### Plan must-haves (04-01 … 04-17)

`verify.artifacts` over all 17 plans: 61/62. `verify.key-links`: 41/42. The two misses are the same deliberate 04-13 supersessions as at 420b1b5:

- 04-01 artifact `src/routes/dev-directions/tokens/floodlit.tokens.json`: 04-13 deleted it by design (losing and pre-lock direction sets removed after lock). It is present at `f6e513d`, and `build-tokens.test.ts` asserts the folder is gone.
- 04-07 key link DirectionScope → `tokens/*.css`: the 04-13 link DirectionScope → `DESIGN.md?raw` replaces it (verified).

Behavior-dependent plan truths are each backed by a passing named functional or unit test in this run's suites: theme persistence and fallback (theme.spec, directions.spec), light subtree under a dark root, shape morph and reduced motion, focus mode, data screen seek/loading/error, badge and chip placement, 44 px targets, overlay focus handling (gallery.spec), and CVD (palette gate plus achromatopsia captures).

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|---|---|---|
| 1 | First Linux visual baseline set and a green `visual` job | Post-merge: `gh workflow run update-snapshots.yml --ref <branch>` (STATE.md Deferred Verification) | Workflow dispatch needs the file on `main`. CI run 46135577547: every failure was a missing snapshot only. `visual` is not a required check (ADR 0007). |

### Required Artifacts

| Artifact | Status | Details |
|---|---|---|
| `docs/DESIGN.md` | VERIFIED | 8 sections, one `tokens` block, §2/§4 consistent, §4 documents disc-text, label-fit, ball-offset and badge rules matching the code |
| `docs/decisions/0010-visual-direction.md` | VERIFIED | Unchanged; arithmetic test passes |
| `scripts/design/*` | VERIFIED | tokens ok, palette PASS, fonts ok |
| `src/styles/tokens.css` | VERIFIED | Byte-equal to generator output |
| `src/pitch/glyphs/{placement,glyphSize,SceneLayer,PlayerGlyph,registry}.ts(x)` | VERIFIED | Substantive changes (diff read), wired: `SceneLayer` → `placeBadge({badges})`, `PlayerShape` → `fitLabel`, `Legend` → `describeDiscText` |
| `src/pitch/legend/{Legend.tsx,glyphIds.ts}` | VERIFIED | Description derived from scene data, not hand-typed |
| `scripts/review-screens.ts`, `scripts/review/*` | VERIFIED | Exit 0 / 1 shown live |
| `src/routes/dev-gallery*`, `src/ui/**`, `src/routes/dev.tsx` | VERIFIED | 37 ids; `/dev` links carry the focus token outline |
| `playwright.config.ts`, `tests/visual/*`, `.github/workflows/*`, `baselines-guard.test.ts` | VERIFIED | Gating unchanged since 420b1b5 |

### Key Link Verification

41/42 key links are WIRED per gsd `verify.key-links`; the one miss is superseded (above). Manually traced new links: `SceneLayer.tsx` badge loop → `placeBadge(... badges: placed ...)`; the render at line 276 reads `badgeAt.get(id)`. `PlayerGlyph.tsx` → `fitLabel` → `textLength`/`fontStretch`. `Legend.tsx` → `describeDiscText` → `discTextKinds`.

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|---|---|---|---|---|
| Legend description | disc-text kind | `scene.entities` (number / label / role / name) via `discTextKinds` | Yes: "position code" on the City scene, "player initials" on the Wyscout scene (functional test + captures) | FLOWING |
| DataScreen stats, chart, table | 18.4 s, 59.3 m, 7 players | `deriveGoal()` over the Wyscout scene | Yes (`derived.test`, 375 capture) | FLOWING |
| Pitch glyph colours | `--team-*`, `--pitch-*` | generated tokens.css | Yes (tokens.spec) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Unit suite | `npx vitest run` | 53 files, 1261 passed, 6 skipped, exit 0 | PASS |
| Typecheck | `npx tsc --noEmit` | exit 0 | PASS |
| Lint | `npx biome ci .` | 260 files, exit 0 (1 pre-existing info, `src/ui/Dialog.tsx`) | PASS |
| Token drift | `npm run tokens:check` | `tokens ok: 1 file(s)` | PASS |
| Palette gate | `npm run palette` | PASS floodlit dark, PASS floodlit light | PASS |
| Repo guard | `npm run guard` | `520 file(s) ok (tracked)` | PASS |
| Build + bundle guard | `npm run build && npm run guard:bundle` | built in 302 ms; `bundle ok: 11 files` | PASS |
| Functional E2E | `REVIEW_PORT=5184 npx playwright test --project functional` (reused the running 5184 server) | 109 passed, exit 0 | PASS |
| Fonts | `node scripts/design/copy-fonts.ts --check` | `fonts ok` | PASS |
| Review command | `review:screens` on `/dev`, floodlit tactics, floodlit data, data at t=11.48, `/dev/gallery`, plus the gradient fixture | exit 0 x5 (PASS), then exit 1 (FAIL, 6 fail) | PASS |

### Probe Execution

Step 7c: no `scripts/*/tests/probe-*.sh` is declared or present for this phase. SKIPPED.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| DSGN-01 | 2-3 directions as real screens, screenshotted at 3 widths, pick | SATISFIED | Truth 1 |
| DSGN-02 | DESIGN.md coverage incl. CVD-validated colour system | SATISFIED | Truth 2 |
| DSGN-03 | Tokens from DESIGN.md drive the Tailwind theme | SATISFIED | Truth 3 |
| DSGN-04 | Gallery at 3 widths, CI-only baselines | SATISFIED (baseline generation deferred post-merge) | Truth 4 |
| QA-02 | Taste-skill screenshot review at 3 widths against DESIGN.md | SATISFIED | Truth 5 |

No orphaned requirements: REQUIREMENTS.md maps exactly these five IDs to Phase 4.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK` markers were added in `420b1b5..HEAD`. The only match in the diff is the previous report's own sentence.

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| src/pitch/glyphs/PlayerGlyph.tsx | 260, 263 | The legend swatch draws the number "7" while the description may say "position code" or "player initials" | Info | The swatch is decorative (Swatch.tsx: "the label carries the meaning"). Already noted as residual in 04-UI-REVIEW. |
| src/pitch/glyphs/SceneLayer.tsx | team shape lines | Dark-theme shape lines share the disc blue (UI-REVIEW optional item, not done) | Info | DESIGN.md has no shape-line token. Not inventing an unvalidated colour is the correct call. |
| scripts/review/browser.ts, lib.ts | n/a | `text-contrast` ignores ancestor `opacity` (04-REVIEW IN-04, skipped with reason) | Info | Unchanged since 420b1b5 |
| review:screens floodlit tactics / data | n/a | 1 taste-copy warn each (copy-contrast / stat strip) | Info | Warn, not fail; reviewed in 04-UI-REVIEW |

### Human Verification Required

None. The learner delegated human checks to Claude, and each was settled here with evidence:

- Visual fixes: I viewed `test-results/review/dev-directions-floodlit-tactics/1440-dark.png`. The condensed two-letter labels (LB, CB, CM, DM, LW, RW, ST, GK) sit inside their discs, and the legend reads "Filled disc with position code." I viewed `dev-directions-floodlit-data/375-light-t-11-48.png`. Badges 1-6 are separated with no overlap, the legend reads "Filled disc with player initials.", and the page and stat block render correctly.
- Colour-blind safety: the palette gate passes; the CVD captures are regenerated by `review:screens`.
- Interactions: Playwright functional specs (109 pass).

The optional learner override of the pick remains a choice, not a check. Baseline generation is deferred until after merge.

### Gaps Summary

No gaps. All five roadmap success criteria and all five requirements hold at HEAD `0d2e27c`. The three warnings from the previous report (legend mismatch, badge/ball placement, DESIGN.md §2/§4 contradiction) are fixed in code. Real-browser tests prove each fix, and those tests fail on the old behaviour: badge pairs compared with a 3+ badge frame required, ball-to-label ink gap, legend text asserted per scene. No regressions: unit suite 1261 passed (up from 1250), functional suite 109 passed (up from 101), and all gates are green. The only open item is the post-merge Linux baseline generation, which is deferred by design.

---

_Verified: 2026-11-28T15:20:00Z_
_Verifier: Claude (gsd-verifier)_
