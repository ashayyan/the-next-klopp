---
phase: "4"
slug: "design-direction-system"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-28"
---

# Phase 4 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Repo text → generated CSS | `docs/DESIGN.md` tokens block (and token JSON) → `build-tokens` → `src/styles/tokens.css` loaded by every page | Colours, dimensions, font names and `/fonts/` paths (Zod-typed) |
| CLI arguments → file system / child processes | `build-tokens --input/--out/--scope`, `copy-fonts`, `review-screens <route>` | Paths, route strings, argv arrays |
| npm registry → node_modules → `public/fonts` → `dist` | New packages and self-hosted WOFF2 files ship to the learner's browser | Third-party code, font binaries, OFL licence text |
| Review CLI → local processes | `review:screens` may start Vite dev/preview, headless Chrome and the taste-skill scripts | Page URL, temp text file, screenshots (git-ignored) |
| URL params / `localStorage` → render and pre-paint script | `:id`, `:screen`, `:primitiveId`, `?theme`, `?state`, `?w`, `#state-*`, stored theme | Untrusted strings (looked up in fixed lists only) |
| Published scene file → Data screen | `public/data/wyscout/...` fetched and rendered with attribution | Scene JSON (content-type + `parseScene`) |
| GitHub Actions → repository (write) | `update-snapshots.yml` commits Linux baselines and dispatches `ci` | `tests/visual/__baselines__/*-linux.png` only |
| Container image → CI | `mcr.microsoft.com/playwright:v1.65.1-noble` runs the browser specs | Test run, baseline artefact |
| Local brief → public docs (repo is PUBLIC) | ADR 0010 and `docs/DESIGN.md` paraphrase the brief | Design needs only, cited by brief section |

---

## Threat Register

Per-threat evidence produced by gsd-security-auditor on 2026-11-28 at HEAD `420b1b5` (after the 16 code-review fixes, 04-REVIEW-FIX.md). Register built from the `<threat_model>` blocks of 04-01..04-17-PLAN.md (`register_authored_at_plan_time: true`). Config: `asvs_level: 1`, `block_on: high`.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Evidence | Status |
|-----------|----------|-----------|----------|-------------|------------|----------|--------|
| T-04-01 | Tampering | `tokens.ts` CSS writer | medium | mitigate | Schema-typed values only (hex, px/ms, bezier, family and `/fonts/` regexes); fixed key lists; `--scope` regex; exit 1 before write | `scripts/design/tokens-schema.ts:7-11,77-79,88-89,104-118,146-152`; `scripts/design/tokens.ts:33-34,94-99,128-134,318-319`; `scripts/design/build-tokens.ts:132-135,146-151` | closed |
| T-04-02 | Tampering | generated CSS files | low | mitigate | `--check` drift test in Vitest (CI `test` job); Biome ignores `tokens.css` | `scripts/design/build-tokens.test.ts:211-221`; `.github/workflows/ci.yml:59`; `biome.json:19`; `tokens:check` re-run ok | closed |
| T-04-03 | Denial of service | `placeBadge` per frame | low | mitigate | Bounded candidates (4 sides x 3 scales = max 12); Zod bounds 64 entities / 5000 frames / 500 events; memoised per sampled t | `src/pitch/glyphs/placement.ts:65-99`; `src/scene/schema.ts:172-174`; `src/pitch/glyphs/SceneLayer.tsx:115-133` | closed |
| T-04-04 | Tampering | `check-palette.ts` verdict | medium | mitigate | Inline golden fixtures, negative `#00A000` fixture, `THRESHOLDS` constant table, gate in `npx vitest run` | `scripts/design/check-palette.ts:15-27`; `scripts/design/check-palette.test.ts:18-53,451-530,567-568`; `ci.yml:59` | closed |
| T-04-05 | Tampering | `motion`, `@playwright/test` (recency) | high | mitigate | Identity gate before install; exact pins; lockfile; `npm audit signatures` in CI `lint` | `package.json` (exact pins, no ranges); `package-lock.json` (sha512, registry.npmjs.org); `ci.yml:34`; commit `38ed8a3`; auditor re-run of `npm audit signatures`: 114 verified signatures, 68 attestations | closed |
| T-04-06 | Repudiation | font licences | medium | mitigate | `LICENSES.md` generated from package metadata + full OFL text; `--check` flags stale; always all families (WR-04) | `scripts/design/copy-fonts.ts:98-125,157-160,215-224`; `public/fonts/LICENSES.md` (OFL-1.1 text, Reserved Font Name "Mona"); `copy-fonts.test.ts:101-112,169-182`; shipped as `dist/fonts/LICENSES.md` | closed |
| T-04-07 | Tampering | `public/fonts/*.woff2` | low | mitigate | Byte-for-byte compare with pinned package file; guard 5 MB cap | `scripts/design/copy-fonts.ts:172`; `copy-fonts.test.ts:84-93,125-135`; `scripts/lib/guard.ts:6,232`; `fonts --check` re-run ok | closed |
| T-04-08 | Tampering | route argument in `review-screens.ts` | high | mitigate | `isSafeRoute`/`slugRoute` refuse no leading slash, a leading double slash, `..`, backslash, whitespace and a scheme; output under `test-results/review/<slug>/`; argv-array spawns, no shell | `scripts/review/lib.ts:48-67`; `scripts/review-screens.ts:45-51`; `scripts/review/browser.ts:125,133-145`; `scripts/review/taste.ts:156` | closed |
| T-04-09 | Denial of service | dev server on the learner port | medium | mitigate | Answering server reused and never stopped; only started children torn down in `finally` + SIGINT/SIGTERM; non-default ports use `--bypass-lock` | `scripts/review/browser.ts:57-58,86-93,119-124,130-131,158-160`; `scripts/review-screens.ts:55-62,129-131` | closed |
| T-04-10 | Information disclosure | headless browser | low | mitigate | Playwright `chromium.launch` (pipe transport, no debug port); throwaway context per capture, closed | `scripts/review/browser.ts:180-186,763,881` | closed |
| T-04-11 | Tampering | `taste.ts` child processes | medium | mitigate | `spawn(process.execPath, argsArray)`; URL and temp file as single argv elements; profile under git-ignored `.taste-skill/`; skill dir git-denied | `scripts/review/taste.ts:13-16,154-156,237-250,276-281`; `.gitignore:48`; `scripts/lib/guard.ts:24,27` | closed |
| T-04-12 | Information disclosure | page network requests | medium | mitigate | `font-local` fails on any non-localhost request | `scripts/review/lib.ts:186,1057,1067-1086`; `scripts/review/browser.ts:773,807` | closed |
| T-04-13 | Tampering | City scene fixture | low | mitigate | `parseScene` at module load and in a unit test | `src/routes/dev-directions/TacticsScreen.tsx:61-68`; `src/routes/dev-directions/morph.test.ts:10,35` | closed |
| T-04-14 | Tampering | `:id`, `:screen`, `?theme`, `?state` | low | mitigate | Fixed-list lookups; React text-node fallback; never a path, import or HTML | `src/routes/dev-directions.tsx:85-134`; `src/routes/dev-directions/DirectionScope.tsx:55-57,110-116`; `src/ui/theme.ts:60-70`; `TacticsScreen.tsx:104-106` | closed |
| T-04-15 | Denial of service | `theme.ts` storage | low | mitigate | `localStorage` getter, `getItem`, `setItem` in try/catch; only `system`/`light`/`dark` accepted | `src/ui/theme.ts:15-36,39-48`; `tests/functional/theme.spec.ts:117-121` | closed |
| T-04-16 | Information disclosure | `ConfusionButton` | low | mitigate | Note held in component state only; spec asserts no new `localStorage` key | `src/ui/lesson/ConfusionButton.tsx:39-40,70-77`; `tests/functional/directions.spec.ts:127-142` | closed |
| T-04-17 | Tampering | scene load in `DataScreen` | low | mitigate | Content-type check + `parseScene`; non-ready renders error panel, no derived values | `src/routes/dev-pitch/sceneSources.ts:68-72,147-149,161-178`; `src/routes/dev-directions/DataScreen.tsx:367-382,406` | closed |
| T-04-18 | Repudiation | data attribution | medium | mitigate | Source line rendered from `scene.source` (attribution + CC-BY-4.0); only the shippable Wyscout artifact | `DataScreen.tsx:368,514-517`; `src/scene/fixtures/index.ts:44-48`; `public/data/wyscout/v1-809b8aff1fda/scene-wyscout-2499754-sane-goal.json:448,453` | closed |
| T-04-19 | Repudiation | the pick (ADR 0010) | medium | mitigate | Fresh reviewer with fixed inputs; evidence per score; hashed screenshots at a recorded commit; arithmetic re-check test | `docs/decisions/0010-visual-direction.md:19-20,31,104-122`; `scripts/design/adr-0010.test.ts:104-192`; residual: AR-04-04 | closed |
| T-04-20 | Information disclosure | ADR 0010 | medium | mitigate | Cites brief sections, paraphrases needs; no profile detail beyond what tracked CLAUDE.md states; guard + gitleaks | `0010-visual-direction.md:18`; auditor grep for profile details: none; `ci.yml:88,94`; `npm run guard` re-run ok | closed |
| T-04-21 | Tampering | inline theme script | low | mitigate | Compares with two literals, sets one attribute, try/catch, no HTML or eval | `index.html:12-19`; `src/ui/ui.test.tsx:194-204` | closed |
| T-04-22 | Tampering | DESIGN.md tokens block | medium | mitigate | Same Zod schema; exactly one `tokens` block; `checkDesignHeadings` in the shared loader | `scripts/design/tokens.ts:20,38-47,65-90`; `scripts/design/build-tokens.ts:55-72` | closed |
| T-04-23 | Information disclosure | `docs/DESIGN.md` | medium | mitigate | Paraphrased, cited by section; no profile detail copied; guard + gitleaks | `docs/DESIGN.md:7`; auditor grep for profile details: none; `ci.yml:88,94` | closed |
| T-04-24 | Repudiation | shipped fonts and licences | low | mitigate | `copy-fonts --check` fails on an unreferenced font or a stale `LICENSES.md`; `guard:bundle` on build | `scripts/design/copy-fonts.ts:197-205,215-224`; `copy-fonts.test.ts:109-112,137-153`; `ci.yml:72,120`; `check-bundle` re-run: bundle ok (11 files) | closed |
| T-04-25 | Tampering | `Frames.tsx` iframe src | low | mitigate | Registry id, fixed widths 375/768/1440, theme light/dark, state only when listed for the primitive (stricter than the planned regex) | `src/routes/dev-gallery/Frames.tsx:6,13-18`; `src/routes/dev-gallery.tsx:22-30`; `src/routes/dev-gallery/gallery.test.tsx:78-81` | closed |
| T-04-26 | Tampering | `:primitiveId` | low | mitigate | Lookup in `GALLERY` only; unknown id renders fallback | `src/routes/dev-gallery/registry.ts:370-372`; `Frames.tsx:14-15` | closed |
| T-04-27 | Denial of service | dialogs and focus traps | low | mitigate | Base UI focus management; Escape closes; focus returns; gallery overlays non-modal; test asserts default focus on "Keep board" | `src/ui/Dialog.tsx:8,73,79,125-134,155`; `tests/functional/gallery.spec.ts:356-378` | closed |
| T-04-28 | Tampering | chart and table text | low | mitigate | React text nodes only (zero `dangerouslySetInnerHTML`, `innerHTML` or `document.write` in `src/` and `index.html`); one number helper; static demo data | `src/ui/data/chart.tsx:241`; `src/ui/data/DataTable.tsx:155`; `src/routes/dev-gallery/demos/data.tsx:333-337,433` | closed |
| T-04-29 | Tampering | `update-snapshots.yml` shell steps | high | mitigate | No dispatch inputs; `github.ref_name` reaches the script only via `env:`, quoted; static test bans a GitHub expression in any `run:` | `.github/workflows/update-snapshots.yml:13-14,72-86`; `scripts/design/baselines-guard.test.ts:77-99,153-164` | closed |
| T-04-30 | Tampering | baseline commit-back | high | mitigate | `git add` stages only `*-linux.png`; platform guard in the required `test` job; the dispatched `ci` runs guards (file guard, gitleaks, immutability) | `update-snapshots.yml:79,86`; `baselines-guard.test.ts:12-64,139-145`; `ci.yml:59,88,93,94`; residual: AR-04-05 | closed |
| T-04-31 | Elevation of privilege | workflow permissions | high | mitigate | `ci.yml` `contents: read`; write scopes only on the `commit` job; dispatch only; refuses `main` and tags; the commit job never runs `npm ci`; `generate` checkout `persist-credentials: false`; no `pull_request_target` | `ci.yml:9-11`; `update-snapshots.yml:16-17,29,32-33,38-39,58,62-64`; `baselines-guard.test.ts:106-137,185-189` | closed |
| T-04-32 | Tampering | Playwright container image | medium | mitigate | Tag `v1.65.1-noble` equals the npm pin (static test); actions SHA-pinned (static test); no browser cache step | `ci.yml:144`; `update-snapshots.yml:35`; `baselines-guard.test.ts:166-183`; no `actions/cache` in `.github/`; residual: AR-04-03 | closed |
| T-04-SC (04-04) | Tampering | npm installs (13 direct, 24 lockfile entries) | high | mitigate | Automated identity gate; exact pins; lockfile integrity; no install scripts; `npm audit signatures` in CI | `38ed8a3`; all 24 added lockfile entries resolve from registry.npmjs.org with sha512 and no `hasInstallScript`; registry re-check of repository and licence: `@base-ui/react` (mui/base-ui, MIT), `motion` (motiondivision/motion, MIT), `@playwright/test` (microsoft/playwright, Apache-2.0), `@fontsource-variable/*` (fontsource/font-files, OFL-1.1); `ci.yml:34`; residual: AR-04-02 | closed |
| T-04-SC (other 16 plans) | Tampering | installs | high | accept | No dependency changes (git-verified) | AR-04-01 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

Register total: 49 (T-04-01..T-04-32, plus one T-04-SC per plan: 04-04 mitigate, 16 accept).

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-04-SC (04-01..04-03, 04-05..04-17) | Plans installed no packages. Git check: in Phase 4 `package-lock.json` changed only in `38ed8a3` (04-04); the `package.json` changes in `772ecda`, `fb28906` and `260729d` add npm scripts only; no pipeline `pyproject.toml` or `uv.lock` change. CI installs with `npm ci` from the committed lockfile | Claude (learner-delegated autonomous run) | 2026-11-28 |
| AR-04-02 | T-04-SC (04-04) residual | The plan's blocking human package-legitimacy checkpoint was replaced by the automated identity gate under learner delegation. Compensating controls: exact pins, sha512 lockfile integrity, registry-only resolution, no install scripts in any of the 24 added entries, `npm audit signatures` in the CI `lint` job and re-run by the auditor (114 verified signatures, 68 attestations), repository and licence re-checked on the registry | Claude (learner-delegated autonomous run) | 2026-11-28 |
| AR-04-03 | T-04-32 residual | The Playwright image is pinned by tag, not by digest, so a re-pushed tag would change the image. The publisher is Microsoft (MCR). The image runs only with read-only tokens (`ci.yml` `contents: read`; `generate` job `contents: read` and `persist-credentials: false`). The write-token `commit` job never runs the image or `npm ci`. Hardening option: pin `image:` by `@sha256:` digest and extend the static test | Claude (learner-delegated autonomous run) | 2026-11-28 |
| AR-04-04 | T-04-19 residual | Reviewer independence (a fresh agent with fixed inputs) is a process attestation in ADR 0010 and 04-10-SUMMARY, not enforceable in code. Compensating: SHA-256 per screenshot at a recorded commit, arithmetic and winner re-checked by `adr-0010.test.ts`, and a non-blocking learner override todo in STATE.md | Claude (learner-delegated autonomous run) | 2026-11-28 |
| AR-04-05 | T-04-30 residual | Baseline PNG bytes are produced inside the third-party image after `npm ci` and committed without a human review of their content. Only `*-linux.png` is staged, the 5 MB file guard and gitleaks run on the dispatched `ci`, and PNG files are never executed | Claude (learner-delegated autonomous run) | 2026-11-28 |

---

## Code-review security items (04-REVIEW.md, 04-REVIEW-FIX.md)

| Item | Result | Evidence |
|------|--------|----------|
| Workflow permissions | ok | `ci.yml:9-11` (no `: write` anywhere; static test `baselines-guard.test.ts:185-189`); `update-snapshots.yml:16-17,62-64` |
| update-snapshots write-token isolation | ok | Write scopes only on `commit` (`update-snapshots.yml:57-86`), which runs no `npm ci` and no repo code; `generate` is read-only with `persist-credentials: false` (`:32-39`). IN-05 fixed (`758cadc`): branch-only `if:` (`:29,58`), push to `HEAD:refs/heads/$BRANCH` (`:85`), per-ref concurrency (`:20-22`) |
| Dev-only gating | ok | `src/routes.ts:23` (`includeDev && import.meta.env.DEV`); `src/main.tsx:13` |
| Dev-leak bundle markers (WR-06) | ok | `scripts/lib/bundle.ts:30-47,119-125` (six markers, including the DESIGN.md section 1 heading) run in the required `build` job (`ci.yml:72`) and in `smoke.ts:105`; tests `check-bundle.test.ts:177`. Auditor re-run on the current `dist/` (built after the last code commit): bundle ok (11 files), no marker hit |
| localStorage try/catch | ok | `src/ui/theme.ts:15-48`; `index.html:13-18`; throwing-getter spec `theme.spec.ts:117-121` |
| Pre-paint script | ok | `index.html:12-19` (literal compare, one attribute, no HTML or eval), pinned by `ui.test.tsx:194-204` |
| Font licences | ok | Full OFL-1.1 text and the Reserved Font Name "Mona" in `public/fonts/LICENSES.md`. WR-04 fixed (`3b30611`): the licence record always covers every shipped family (`copy-fonts.ts:216-218`); `fonts --check` ok |
| Package legitimacy | ok | See T-04-SC (04-04) and AR-04-02 |
| IN-04, IN-06 (skipped by the fixer) | not security | IN-04 is a contrast-gate accuracy issue. IN-06 (stale baselines are never pruned) is hygiene, deferred until the first baseline set lands |

Auditor re-runs at `420b1b5` (read-only): `npx vitest run scripts/design scripts/check-bundle.test.ts scripts/review scripts/guard.test.ts src/ui/ui.test.tsx src/routes/dev-gallery src/routes/dev-directions` gave 14 files and 485 tests passed; `tokens --check` ok; `fonts --check` ok; `guard --tracked` 517 files ok; `check-bundle` ok; `npm audit signatures` ok.

---

## Out-of-register warnings (non-blocking)

- W-1 (carried from Phase 3): `NEW_PROJECT_INPUT.md` (learner profile) remains in public git history (commit `2c520e1`). Removal needs a history rewrite and a force-push, which is a learner decision. The learner was informed on 2026-11-28 and chose to keep profile lines in tracked docs.
- W-2 (Phase 3): RESOLVED. The guard denies the brief by name (`scripts/lib/guard.ts:129`, tests `scripts/guard.test.ts:116-117`, commit `a57685c`). The file is untracked at HEAD and listed in `.gitignore:57`.
- W-3 (new): no Content-Security-Policy exists (no `vercel.json` headers). If one is added before deploy, the `index.html` pre-paint inline script needs a `sha256-` source in `script-src`, not `'unsafe-inline'`.
- W-4 (new): five unused Fontsource devDependencies (`archivo`, `martian-mono`, `newsreader`, `atkinson-hyperlegible-next`, `atkinson-hyperlegible-mono`) stay pinned after the ADR 0010 collapse (04-13). They are dev-only and have no install scripts. Removing them would shrink the supply-chain surface.
- W-5 (new): `04-10-SUMMARY.md` has no `## Threat Flags` section. T-04-19 and T-04-20 were verified directly against the ADR, the test and the repo.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-28 | 49 | 49 | 0 | gsd-security-auditor (opus), ASVS L1, block_on high, HEAD `420b1b5` |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-28
