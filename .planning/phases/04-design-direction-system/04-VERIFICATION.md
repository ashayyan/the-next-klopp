---
phase: 04-design-direction-system
verified: 2026-11-28T11:45:00Z
status: passed
score: 5/5 roadmap success criteria verified; 17/17 plans' must-haves verified (2 direction-era checks superseded by 04-13 as designed)
covered_files: [".github/workflows/ci.yml", ".github/workflows/update-snapshots.yml", ".planning/phases/04-design-direction-system/04-01-PLAN.md", ".planning/phases/04-design-direction-system/04-01-SUMMARY.md", ".planning/phases/04-design-direction-system/04-02-PLAN.md", ".planning/phases/04-design-direction-system/04-02-SUMMARY.md", ".planning/phases/04-design-direction-system/04-03-PLAN.md", ".planning/phases/04-design-direction-system/04-03-SUMMARY.md", ".planning/phases/04-design-direction-system/04-04-PLAN.md", ".planning/phases/04-design-direction-system/04-04-SUMMARY.md", ".planning/phases/04-design-direction-system/04-05-PLAN.md", ".planning/phases/04-design-direction-system/04-05-SUMMARY.md", ".planning/phases/04-design-direction-system/04-06-PLAN.md", ".planning/phases/04-design-direction-system/04-06-SUMMARY.md", ".planning/phases/04-design-direction-system/04-07-PLAN.md", ".planning/phases/04-design-direction-system/04-07-SUMMARY.md", ".planning/phases/04-design-direction-system/04-08-PLAN.md", ".planning/phases/04-design-direction-system/04-08-SUMMARY.md", ".planning/phases/04-design-direction-system/04-09-PLAN.md", ".planning/phases/04-design-direction-system/04-09-SUMMARY.md", ".planning/phases/04-design-direction-system/04-10-PLAN.md", ".planning/phases/04-design-direction-system/04-10-SUMMARY.md", ".planning/phases/04-design-direction-system/04-11-PLAN.md", ".planning/phases/04-design-direction-system/04-11-SUMMARY.md", ".planning/phases/04-design-direction-system/04-12-PLAN.md", ".planning/phases/04-design-direction-system/04-12-SUMMARY.md", ".planning/phases/04-design-direction-system/04-13-PLAN.md", ".planning/phases/04-design-direction-system/04-13-SUMMARY.md", ".planning/phases/04-design-direction-system/04-14-PLAN.md", ".planning/phases/04-design-direction-system/04-14-SUMMARY.md", ".planning/phases/04-design-direction-system/04-15-PLAN.md", ".planning/phases/04-design-direction-system/04-15-SUMMARY.md", ".planning/phases/04-design-direction-system/04-16-PLAN.md", ".planning/phases/04-design-direction-system/04-16-SUMMARY.md", ".planning/phases/04-design-direction-system/04-17-PLAN.md", ".planning/phases/04-design-direction-system/04-17-SUMMARY.md", "docs/DESIGN.md", "docs/decisions/0010-visual-direction.md", "index.html", "playwright.config.ts", "public/fonts/LICENSES.md", "scripts/design/baselines-guard.test.ts", "scripts/design/build-tokens.ts", "scripts/design/check-palette.ts", "scripts/design/copy-fonts.ts", "scripts/design/tokens-schema.ts", "scripts/design/tokens.ts", "scripts/review-screens.ts", "scripts/review/browser.ts", "scripts/review/lib.ts", "scripts/review/taste.ts", "src/index.css", "src/pitch/glyphs/placement.ts", "src/routes/dev-directions.tsx", "src/routes/dev-directions/DataScreen.tsx", "src/routes/dev-directions/DirectionScope.tsx", "src/routes/dev-directions/TacticsScreen.tsx", "src/routes/dev-gallery.tsx", "src/routes/dev-gallery/inventory.json", "src/routes/dev-gallery/registry.ts", "src/styles/tokens.css", "src/ui/theme.ts", "tests/functional/directions.spec.ts", "tests/functional/gallery.spec.ts", "tests/functional/pitch-fixes.spec.ts", "tests/functional/theme.spec.ts", "tests/functional/tokens.spec.ts", "tests/visual/gallery.visual.spec.ts"]
covered_digest: "v4:sha256:0f026899a0beba77be1230515909a1451b9ce059d55520235f9c727da7abfcc8"
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "Visual baselines are generated only by CI on Linux (first baseline set exists and the `visual` job is green)"
    addressed_in: "Phase 4 post-merge step (STATE.md Deferred Verification)"
    evidence: "GitHub only dispatches workflow_dispatch workflows that exist on the default branch; update-snapshots.yml answered 404 on the phase branch. Mechanism verified in place: visual job in mcr.microsoft.com/playwright:v1.65.1-noble, update-snapshots.yml (dispatch-only, refuses main, two-job, commits only *-linux.png, re-dispatches ci), updateSnapshots 'none' unless CI && UPDATE_BASELINES=1, test.skip without CI, Vitest platform guard. CI run 46135577547: 98 functional passed on Linux; all 222 visual failures (37 ids x 2 themes x 3 widths) are exactly 'A snapshot doesn't exist', no other error."
human_verification: []
---

# Phase 4: Design Direction & System Verification Report

**Phase Goal:** As a learner, I want to pick a visual direction from real rendered screens and get a design system that enforces it, so that every lesson looks designed, accessible and consistent instead of generic.
**Mode:** mvp (goal is a valid User Story)
**Verified:** 2026-11-28T11:45:00Z
**Status:** passed
**Re-verification:** No (initial verification, after the 04-REVIEW fix pass, HEAD 420b1b5)

## User Flow Coverage (MVP)

| Story step | Expected | Evidence in codebase | Status |
|---|---|---|---|
| See real rendered directions | 3 directions x 2 real screens x 3 widths | Route commit `f6e513d` holds `src/routes/dev-directions/tokens/{floodlit,programme,notebook}.*`; ADR 0010 lists 60 screenshot paths with SHA-256; on-disk hashes re-checked here (programme data 1440-light `14bdec11…`, notebook tactics 375-light `44bf5d57…`) match the ADR | VERIFIED |
| Pick a direction | Pick recorded in `docs/decisions/` | ADR 0010 picks `floodlit` (81.25 vs 73.75 / 73.75), carries the delegation line; `adr-0010.test.ts` recomputes totals and winner (passes); learner override todo in STATE.md Pending Todos | VERIFIED (delegated checkpoint, per ROADMAP Checkpoint line and 04-CONTEXT) |
| Get a design system that enforces it | DESIGN.md + generated tokens + gates | DESIGN.md 8 sections, single `tokens` block, `tokens:check` / `palette` / `review:screens` gates all pass (below) | VERIFIED |
| Outcome: lessons look designed, accessible, consistent | Enforcement mechanism exists and the picked screens pass it | `review:screens` PASS (0 fail) on both floodlit screens and `/dev/gallery`; seeded gradient fixture FAILs with exit 1 | VERIFIED |

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Learner opens 2-3 distinct directions (tactics + data screen each, screenshots at 3 widths), picks one, pick recorded in `docs/decisions/` | ✓ VERIFIED | ADR 0010 (gates, 7 weighted criteria, per-score evidence, 60 screenshot hashes, route commit `f6e513d` which `git cat-file` confirms exists and contains the three direction token sets). Pick delegated to an independent Opus reviewer as the ROADMAP Checkpoint line and 04-CONTEXT state; learner may override (STATE.md todo with checkout command). The losing directions were removed after lock by design (04-13). |
| 2 | DESIGN.md covers anti-slop rules, colour system (dark/light, team A/B, ball, zones, data scales) with a passing colour-blind-safety script, typography, spacing, motion, lesson templates, data-viz standards, quality bar | ✓ VERIFIED | `docs/DESIGN.md` (1690 lines): §1 Do/Don't with check id per banned pattern, §2 direction, §3.1-3.7 foundations + tokens block, §4 Pitch Standard, §5 all brief 9.5 components x 6 fields, §6 seven templates, §7 data-viz, §8 quality bar. `npm run palette` → PASS floodlit dark and light (teams ΔE 24.4/27.4 and 21.9/31.2). `design-md.test.ts` locks sections against the CHECKS and TASTE_IGNORED registries (passes). |
| 3 | Tokens generated from DESIGN.md drive the Tailwind theme; changing a token and regenerating visibly changes the app and the pitch | ✓ VERIFIED | `npm run tokens:check` → "tokens ok: 1 file(s)"; `src/styles/tokens.css` header names DESIGN.md as source; `@theme inline`/`@theme static` blocks; Phase 3 `--team-*`, `--pitch-*`, `--ball-*`, `--zone-*` names kept. `tests/functional/tokens.spec.ts` (real generator on a modified copy of the DESIGN.md block, injected in Chrome) passed: disc fill → `rgb(158, 42, 43)`, body background → `rgb(251, 243, 228)`. `build-tokens.test.ts` proves `--check` exits 1 on one changed byte. |
| 4 | `/dev/gallery` shows every primitive and interaction at 3 widths; visual baselines generated only by CI on Linux, never overwritten locally | ✓ VERIFIED (baseline generation deferred to post-merge) | 37-id inventory (`gallery.test.tsx` passes), 101/101 functional specs pass locally incl. width/theme/deep-link/fallback and "every state of <id> is on its bare page" for all 37 ids. Gallery excluded from production bundle (no gallery strings in `dist/`). Baseline mechanism: see `deferred` above. No baseline exists yet; see Deferred Items. |
| 5 | A screenshot-review command captures any screen at 3 widths, runs the taste-skill review against DESIGN.md, writes a pass/fail report | ✓ VERIFIED | Run here: `/dev/directions/floodlit/tactics --states state=with` → PASS 0 fail 1 warn (exit 0); `/data --states t=11.48` → PASS (exit 0); `/dev/gallery` → PASS 0 warn (exit 0); `/dev/review-fixture` → PASS (exit 0); `?case=gradient` → FAIL 2 fail (exit 1); unreachable port → exit 2, no orphan server left on 5199. report.json schemaVersion 1, 22 check ids incl. `taste-layout` and `taste-copy`, 16 screenshots with SHA-256 and vision mode. The re-run floodlit tactics 375-dark hash equals the ADR 0010 hash (`5f67f092…`), so the picked screen still renders the reviewed pixels. |

**Score:** 5/5 roadmap truths verified (0 present, behavior-unverified)

### Plan must-haves (04-01 … 04-17)

`verify.artifacts`: 66/67 pass; `verify.key-links`: 43/44 pass. The two misses are deliberate supersessions by 04-13 (CONTEXT: "Losing directions are kept as dev routes only until DESIGN.md is locked, then removed"):

- 04-01 artifact `src/routes/dev-directions/tokens/floodlit.tokens.json`: deleted by 04-13; present at `f6e513d`; `build-tokens.test.ts` asserts "the folder is deleted and a missing folder gives no direction sets".
- 04-07 key link DirectionScope → `tokens/*.css`: replaced by the 04-13 key link DirectionScope → `DESIGN.md?raw` (verified).

Behavior-dependent plan truths, each backed by a passing named test or a run made here:

| Truth (abridged) | Evidence |
|---|---|
| Theme: system default, persisted `tnk:theme`, `?theme=` priority, throwing localStorage falls back (04-08, 04-11) | theme.spec.ts (8 tests) + directions.spec.ts "theme menu … survives a reload", "blocked localStorage … no console error": pass |
| Light subtree under a dark root (CR-01 fix) | theme.spec.ts "a light subtree wins under a dark root": pass |
| Shape toggle morph + announcement; reduced motion swaps instantly (04-07, 04-09 backstop) | directions.spec.ts "opens without the ball and flips to the 3-2-4-1 with an announcement", "with reduced motion › swaps the frame within one animation frame": pass; `reduced-motion` check pass in both review reports |
| Focus mode hides rail/time/source/theme, keeps step content (04-08) | directions.spec.ts "focus mode keeps only the step": pass |
| Data screen: paused at 0.0 s, row/bar Enter seeks 9.74 s, loading line, error panel (04-09) | directions.spec.ts data-screen tests (5): pass; `derived.test.ts` recomputes 18.4 s / 59.3 m / 7 players: pass |
| Badge vs disc, chip inside SVG at 375 and 1440, "Play sequence" at 768+ (04-02, 04-17) | pitch-fixes.spec.ts (6): pass; `placement.test.ts`: pass |
| 375 no overflow, 44 px targets (04-09 backstop) | `no-overflow` and `tap-size` pass in both floodlit reports run here |
| CVD captures keep teams and events distinct (04-10 backstop) | Viewed `dev-gallery-glyphs-bare-1/375-light-achromatopsia.png`: team A filled vs team B ring discs, hollow vs filled arrowheads, square goalkeepers stay distinct; `npm run palette` passes |
| Overlays: alert dialog focus/Escape/return, dialog focus trap, long popover 60vh at 375 (04-15) | gallery.spec.ts overlay tests: pass |

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|---|---|---|
| 1 | First Linux visual baseline set and a green `visual` job | Post-merge: `gh workflow run update-snapshots.yml --ref <branch>` (STATE.md Deferred Verification) | Workflow dispatch needs the file on `main` (404 before merge). CI run 46135577547 at 92f68bd: lint, typecheck, test, build, guards, windows-smoke, pipeline green; `visual` red with 222/222 failures = missing snapshot only, 98 functional pass on Linux. `visual` is not a required check (ADR 0007 six checks unchanged). |

### Required Artifacts

| Artifact | Status | Details |
|---|---|---|
| `docs/DESIGN.md` | ✓ VERIFIED | 8 sections, one `tokens` block, palette table between markers equals `check-palette --markdown` (design-md.test) |
| `docs/decisions/0010-visual-direction.md` | ✓ VERIFIED | Gates, scores, evidence, hashes, delegation line; arithmetic test passes |
| `scripts/design/{tokens,tokens-schema,build-tokens,check-palette,copy-fonts}.ts` | ✓ VERIFIED | All CLIs ran here: tokens ok, palette PASS, fonts ok |
| `src/styles/tokens.css` | ✓ VERIFIED | Generated, byte-equal to generator output, imported by `src/index.css` |
| `public/fonts/` + `LICENSES.md` | ✓ VERIFIED | Only `mona-sans`, `geist-mono` (the DESIGN.md families); OFL-1.1; copied to `dist/fonts` |
| `scripts/review-screens.ts`, `scripts/review/{lib,browser,taste}.ts` | ✓ VERIFIED | Exit codes 0/1/2 shown live |
| `src/routes/dev-gallery*`, `src/ui/**` (Base UI 1.9.0, no Radix) | ✓ VERIFIED | 37 ids; `grep radix` in src/package.json: none |
| `playwright.config.ts`, `tests/visual/gallery.visual.spec.ts`, `.github/workflows/{ci,update-snapshots}.yml`, `scripts/design/baselines-guard.test.ts` | ✓ VERIFIED | Gating and static workflow checks pass |

### Key Link Verification

All 43 current key links WIRED (gsd `verify.key-links`); the one miss is the superseded 04-07 link noted above. Spot-checked manually: `src/index.css` → `@import "./styles/tokens.css"`; `PlayerGlyph` → `var(--team-a)` (proven at runtime by tokens.spec); `tokens.ts` → `SYSTEM_INPUT = docs/DESIGN.md`; `index.html` → `tnk:theme`.

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|---|---|---|---|---|
| DataScreen stat card, chart, table | 18.4 s, 59.3 m, 7 players, metres forward | `deriveGoal()` over the published Wyscout scene via `loadDevScene` | Yes (derived.test recomputes from the scene file; 1440 capture shows the values) | ✓ FLOWING |
| Gallery foundations swatches | token values and contrast | `DESIGN.md?raw` → `parseTokens` + `color.ts` | Yes | ✓ FLOWING |
| Pitch glyph colours | `--team-*`, `--pitch-*` | generated tokens.css | Yes (tokens.spec) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Unit suite | `npx vitest run` | 53 files, 1250 passed, 6 skipped (all Phase 2 research `skipIf`), exit 0 | ✓ PASS |
| Typecheck | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Token drift | `npm run tokens:check` | `tokens ok: 1 file(s)` | ✓ PASS |
| Palette gate | `npm run palette` | PASS floodlit dark, PASS floodlit light | ✓ PASS |
| Repo guard | `npm run guard` | `517 file(s) ok (tracked)` | ✓ PASS |
| Fonts | `node scripts/design/copy-fonts.ts --check` | `fonts ok` | ✓ PASS |
| Lint | `npx biome ci .` | 260 files, exit 0 (1 info) | ✓ PASS |
| Build + bundle guard | `npm run build && npm run guard:bundle` | built; `bundle ok: 11 files` | ✓ PASS |
| Functional E2E | `REVIEW_PORT=5184 npx playwright test --project functional` | 101 passed | ✓ PASS |
| Review command | `review:screens` x4 + seeded fail + unreachable | exits 0,0,0,0,1,2 | ✓ PASS |

### Probe Execution

Step 7c: no `scripts/*/tests/probe-*.sh` declared or present for this phase. SKIPPED.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| DSGN-01 | 2-3 directions as real screens, screenshotted at 3 widths, pick | ✓ SATISFIED | Truth 1 |
| DSGN-02 | DESIGN.md coverage incl. CVD-validated colour system | ✓ SATISFIED | Truth 2 |
| DSGN-03 | Tokens from DESIGN.md drive the Tailwind theme | ✓ SATISFIED | Truth 3 |
| DSGN-04 | Gallery at 3 widths, CI-only baselines | ✓ SATISFIED (baseline generation deferred post-merge) | Truth 4 |
| QA-02 | Taste-skill screenshot review at 3 widths against DESIGN.md (mechanism) | ✓ SATISFIED | Truth 5 |

No orphaned requirements: REQUIREMENTS.md maps exactly these five IDs to Phase 4.

### Decision Coverage

`check.decision-coverage-verify`: skipped ("No trackable decisions in CONTEXT.md": the decisions are prose, not D-xx ids). Manual check of every 04-CONTEXT decision: 3 directions behind `/dev/directions/:id/{tactics,data}` (at `f6e513d`), independent reviewer pick + ADR 0010 + STATE follow-up, losing directions removed, single tokens block, `build-tokens --check` in tests, token-change headless test, theme default/persist/try-catch, palette CVD gate, self-hosted OFL WOFF2, motion tokens + reduced motion, `@base-ui/react` only, `@playwright/test` 1.65.1 exact, `updateSnapshots` gating, visual job not required, review CLI outputs under `test-results/review/<slug>/`, exit 2 when the skill folder is absent. All honoured.

### Test Quality Audit

| Test File | Linked Req | Active | Skipped | Circular | Assertion Level | Verdict |
|---|---|---|---|---|---|---|
| tests/functional/tokens.spec.ts | DSGN-03 | 1 | 0 | No (fixed literals `#9E2A2B`/`#FBF3E4` vs computed style) | Value | OK |
| scripts/design/build-tokens.test.ts | DSGN-03 | all | 0 | No | Value/behavioral (exit codes) | OK |
| scripts/design/check-palette.test.ts | DSGN-02 | all | 0 | No (seeded `#00A000` must fail) | Value | OK |
| scripts/design/design-md.test.ts | DSGN-02, QA-02 | all | 0 | Partial: palette table equals generator output (consistency by design) | Value | OK |
| src/routes/dev-gallery/gallery.test.tsx + gallery.spec.ts | DSGN-04 | all | 0 | No (inventory copied from UI-SPEC) | Behavioral | OK |
| tests/visual/gallery.visual.spec.ts | DSGN-04 | 222 (CI only) | skipped locally by design | No | Screenshot | OK (deferred baselines) |
| scripts/review/review.test.ts | QA-02 | all | 0 | No | Value | OK |

Disabled tests on requirements: 0. Circular patterns: 0 blocking. Insufficient assertions: 0.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK` markers in the 236 files changed on the branch versus `main`.

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| src/routes/dev-directions/TacticsScreen.tsx (+ DataScreen) via `registry.ts` descriptions | n/a | Discs show position codes (GK, CB, ST, EM) while the legend says "Filled disc with shirt number". DESIGN.md §4 requires such a screen to say so in its legend description, so the concept and data-lab reference screens break their own constitution | ⚠️ Warning | Known gap (ADR 0010 defects, deferred-items.md). Lessons start in Phase 5; must be closed before a lesson copies these screens |
| src/pitch/glyphs/placement.ts | n/a | `placeBadge` avoids discs, not earlier badges (badges 1, 3, 6 touch at 375, `t=11.48`); ball over the "EM" label at `t=0` (visible in the 1440-dark data capture) | ⚠️ Warning | Documented as "Known gaps … to close before Phase 5 lessons ship" in DESIGN.md §4; tracked only in deferred-items.md, with no ROADMAP or STATE todo |
| docs/DESIGN.md §2 | "What this document does…" | Says the pitch-layer defects "are fixed in the Pitch Standard (section 4)", but §4 lists them as open known gaps | ⚠️ Warning | Internal contradiction in the constitution |
| src/routes/dev-gallery.tsx | 79 | `${p.states.length} states` renders "1 states" for tooltip and toast | ℹ️ Info | Copy grammar on a dev page |
| package.json devDependencies | n/a | `@fontsource-variable/{archivo,newsreader,martian-mono,atkinson-hyperlegible-next,atkinson-hyperlegible-mono}` stay installed after the 04-13 collapse | ℹ️ Info | Unused packages; public/fonts is correctly pruned |
| scripts/review/browser.ts, lib.ts | n/a | `text-contrast` ignores ancestor `opacity` (04-REVIEW IN-04, skipped with a reason) | ℹ️ Info | Gate may over-report contrast for faded elements |

### Human Verification Required

None. The learner delegated human checks; each one was settled with evidence:

- Visual quality and anti-slop: the independent reviewer recorded scores in ADR 0010, and this verifier looked at the floodlit tactics 375-dark, the data 1440-dark, the gallery 768-dark and the glyphs achromatopsia captures.
- Colour-blind safety: palette gate plus the CVD captures I looked at.
- Interactions: Playwright functional specs.

Two items remain and neither is a verification gap:

- The learner may optionally override the pick (STATE.md todo). This is a choice, not a check.
- The baseline generation after the merge (Deferred Items).

### Gaps Summary

No blocking gaps. All five roadmap success criteria and all five requirements are met in the codebase. Every gate command was re-run during this verification and passed. Three warnings should be tracked before Phase 5 lessons copy the reference screens:

1. Close the legend/position-code mismatch. Either label the City and Wyscout discs with shirt numbers, or pass a legend description override that says "position code".
2. Make `placeBadge` treat already placed badges as obstacles. Offset the ball so it does not cover the disc label at `t=0`.
3. Fix the DESIGN.md §2 sentence so it matches §4. Add these items to STATE.md Pending Todos or to the Phase 5 plan, because deferred-items.md is their only tracker today.

---

_Verified: 2026-11-28T11:45:00Z_
_Verifier: Claude (gsd-verifier)_
