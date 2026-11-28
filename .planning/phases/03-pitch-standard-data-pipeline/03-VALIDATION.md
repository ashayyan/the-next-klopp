---
phase: "3"
slug: "pitch-standard-data-pipeline"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-28"
audited: "2026-11-28"
---

# Phase 3 — Validation Strategy

> Reconstructed from PLAN/SUMMARY/VERIFICATION artifacts (State B) by the Nyquist audit on 2026-11-28.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.1.2 (web), pytest 9.2.0 via uv (pipeline, network blocked by `conftest.py`), Playwright-driven browser check script |
| **Config file** | `vitest.config.ts`, `pipeline/pyproject.toml` (`[tool.pytest.ini_options]`) |
| **Quick run command** | `npx vitest run src/pitch src/scene && uv run --project pipeline pytest pipeline/tests -q` |
| **Full suite command** | `npm test && npm run pipeline:test && npm run build && npm run guard:bundle && CHECK_PITCH_PORT=5183 npm run check:pitch` |
| **Estimated runtime** | ~20 s vitest, ~4 s pytest, ~60 s browser check |

---

## Sampling Rate

- **After every task commit:** `npx vitest run` and `npm run pipeline:test`
- **After every plan wave:** full suite command
- **Before `/gsd-verify-work`:** full suite green, CI `build`, `guards`, `pipeline`, `windows-smoke` jobs green
- **Max feedback latency:** 30 seconds (excluding the browser check)

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| PITCH-01 | canonical 105 x 68 m geometry and markings; SVG + Canvas layer share one transform | unit | `npx vitest run src/pitch/geometry.test.ts src/pitch/pitch.test.tsx src/pitch/view.test.ts` | ✅ | ✅ green |
| PITCH-01 | renders in a real browser, no console errors, 60 fps stress budget | smoke (browser) | `CHECK_PITCH_PORT=5183 npm run check:pitch` | ✅ | ✅ green (audit run: 49 ok, 0 failed) |
| PITCH-01 | pointer/keyboard drag in pitch metres, clamped | unit | `npx vitest run src/pitch/drag.test.ts src/pitch/nudgeTracker.test.ts` | ✅ | ✅ green |
| PITCH-02 | StatsBomb/Opta/Wyscout/tracking converters: landmarks + round trip | unit | `npx vitest run src/pitch/coords.test.ts src/routes/dev-pitch/probe.test.ts` | ✅ | ✅ green |
| PITCH-02 | pipeline converters agree with the same provider landmarks (kloppy) | unit | `uv run --project pipeline pytest pipeline/tests/test_landmarks.py` | ✅ | ✅ green |
| PITCH-03 | standard glyph set (players, ball, passes, carries, runs, pressure, zones, shapes) and placement | unit | `npx vitest run src/pitch/glyphs` | ✅ | ✅ green |
| PITCH-03 | notation legend auto-generated from the glyphs in the scene | unit + functional | `npx vitest run src/pitch/legend && REVIEW_PORT=5184 npx playwright test tests/functional/pitch-fixes.spec.ts` | ✅ | ✅ green |
| PITCH-04 | one Scene/Frame schema for authored, saved, quiz and reconstructed scenes | unit | `npx vitest run src/scene/scene.test.ts schemas` | ✅ | ✅ green |
| PITCH-04 | playback sampling, store, keys | unit | `npx vitest run src/scene/playback` | ✅ | ✅ green |
| PIPE-01 | allow-list only, coverage, immutable versioned artifacts + manifest | unit | `uv run --project pipeline pytest pipeline/tests/test_sources.py pipeline/tests/test_coverage.py pipeline/tests/test_manifest_immutable.py` | ✅ | ✅ green |
| PIPE-01 | add-only version directories in git | unit | `npx vitest run scripts/check-immutable.test.ts` | ✅ | ✅ green |
| PIPE-02 | `npm run data` = `uv run --locked --project pipeline klopp-pipeline run-all`, no make / shell chain; entry point + `run-all` registered; Python 3.12 pin | unit | `npx vitest run scripts/pipeline-wiring.test.ts` | ✅ (added by audit) | ✅ green |
| PIPE-02 | run-all end to end: one version, publish, idempotent, offline error is one line | integration | `uv run --project pipeline pytest pipeline/tests/test_run_all.py` | ✅ | ✅ green |
| PIPE-03 | raw paths ignored; guard rejects raw/oversized/secret files | unit | `npx vitest run scripts/repo-files.test.ts scripts/guard.test.ts scripts/deny-manifest.test.ts` | ✅ | ✅ green |
| PIPE-03 | bundle gate fails on licensed data or source maps in `dist/` | unit | `npx vitest run scripts/check-bundle.test.ts` | ✅ | ✅ green |
| PIPE-03 | CI runs the bundle gate after build (build, windows-smoke) and the tracked guard + immutable check (guards) | unit | `npx vitest run scripts/pipeline-wiring.test.ts` | ✅ (added by audit) | ✅ green |
| PIPE-04 | StatsBomb and Wyscout recipes produce canonical Scene/Frame sequences; TS/Python schema parity | integration | `uv run --project pipeline pytest pipeline/tests/test_recipe_statsbomb.py pipeline/tests/test_recipe_wyscout.py pipeline/tests/test_scene_parity.py` | ✅ | ✅ green |
| PIPE-04 | app loads and plays the pipeline output | unit | `npx vitest run src/scene/pipeline-output.test.ts src/routes/dev-pitch/sceneSources.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Audit run (2026-11-28): vitest 54 files green; pytest 174 passed; `check:pitch` 49 ok / 0 failed.

---

## Wave 0 Requirements

- [x] `scripts/pipeline-wiring.test.ts` — added by this audit (PIPE-02 script wiring, PIPE-03 CI gate wiring)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live download of the allow-listed open sources | PIPE-01 | Tests block network by design (`conftest.py`); recipes run on synthetic and recorded fixtures | `npm run data:fetch` then `npm run data`; check `data/<dataset>/<version>/manifest.json` |
| Real-data reconstruction looks right on the pitch | PIPE-04 | Visual judgement; delegated to Claude, settled in 03-UI-REVIEW / 03-VERIFICATION | Open `/dev/pitch` with the published scene and step frames |
| Windows CI smoke job green on the PR | PIPE-02 | Runs on GitHub Actions `windows-latest`; wiring is asserted by `pipeline-wiring.test.ts` | Check the `windows-smoke` job on the PR |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-28 (Nyquist audit; human checks delegated to Claude)

---

## Validation Audit 2026-11-28

| Metric | Count |
|--------|-------|
| Requirements audited | 8 (PITCH-01..04, PIPE-01..04) |
| Gaps found | 2 (PIPE-02 npm-script wiring, PIPE-03 CI gate wiring: partial) |
| Resolved | 2 |
| Escalated | 0 |
| Manual-only | 3 |
