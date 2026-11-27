---
phase: "2"
slug: "research-wave-1"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-27"
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: 02-RESEARCH.md § Validation Architecture (agent-routing rows removed per CONTEXT post-research decision: domain plans are dispatched to `gsd-project-researcher` by the orchestrator).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.1.2 + pytest 9.2.0 (pipeline) |
| **Config file** | `vitest.config.ts` (tests under `scripts/research/`), `pipeline/pyproject.toml` |
| **Quick run command** | `npx vitest run scripts/research` and `uv run --project pipeline pytest -q` |
| **Full suite command** | `npm test && npm run research:gate && npm run guard && npm run lint && npm run typecheck` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** the single relevant test file
- **After every plan wave:** `npx vitest run scripts/research` (+ pytest when the pipeline changed)
- **Before `/gsd-verify-work`:** full suite green incl. `RESEARCH_GATE=1`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| RSCH-01 | per-domain files, caps, schema-valid sources, cite resolution, Contested format, excerpts | unit | `npx vitest run scripts/research/domains.test.ts` | ❌ W0 | ⬜ pending |
| RSCH-01 | all 10 slugs present | gate | `npm run research:gate` | ❌ W0 | ⬜ pending |
| RSCH-02 | coverage parser golden counts (StatsBomb PL 418, 360 = 0; Wyscout 380; others 0; unreachable → null) | unit | `uv run --project pipeline pytest pipeline/tests/test_coverage.py -q` | ❌ W0 | ⬜ pending |
| RSCH-02 | matrix JSON invariants | unit | `npx vitest run scripts/research/coverage-matrix.test.ts` | ❌ W0 | ⬜ pending |
| RSCH-03 | ADR 0008 structure, registry cites, licence evidence | unit | `npx vitest run scripts/adr.test.ts scripts/research/adr0008.test.ts` | ❌ W0 | ⬜ pending |
| RSCH-04 | registry/concept/roles/competencies valid, IDs resolve, DAG acyclic, symmetry, FBref removed, size bounds | unit | `npx vitest run scripts/research/synthesis.test.ts` | ❌ W0 | ⬜ pending |
| RSCH-04 | Markdown views up to date | unit | `npm run research:views -- --check` | ❌ W0 | ⬜ pending |
| RSCH-05 | every brief §6.2 domain is Wave 1 or a gaps row; GAPS.md = render(gaps.json) | unit | `npx vitest run scripts/research/gaps.test.ts` | ❌ W0 | ⬜ pending |
| RSCH-06 | summary page self-contained, CSP, ≤5 screens, layout invariants, < 1.5 MB | unit | `npx vitest run scripts/research/summary.test.ts` | ❌ W0 | ⬜ pending |
| RSCH-06 | APPROVAL.md structure + learner follow-up recorded | unit | `npx vitest run scripts/research/approval.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/research/lib/{domains,excerpt-hash,graph,layout}.ts` + unit tests
- [ ] `scripts/research/{domains,synthesis,gaps,summary,approval,coverage-matrix,adr0008}.test.ts`
- [ ] `scripts/research/{build-registry,derive-links,render-views,build-summary}.ts`
- [ ] `research/seed-sources.json`
- [ ] `pipeline/src/klopp_pipeline/{cli,coverage,models}.py`, `pipeline/tests/` + fixtures
- [ ] npm scripts `research:check`, `research:gate`, `research:views`, `research:summary`, `data:coverage`, `pipeline:test`
- [ ] `biome.json` ignore `research/summary`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual sanity of the summary page | RSCH-06 | layout taste | headless Edge screenshot reviewed by the Opus reviewer agent |
| Learner's own review of the summary | RSCH-06 | learner delegated approval to Claude; own review is a non-blocking follow-up | learner opens `research/summary/index.html` |
| Live coverage smoke against real endpoints | RSCH-02 | network-dependent | `npm run data:coverage`, diff against golden counts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
