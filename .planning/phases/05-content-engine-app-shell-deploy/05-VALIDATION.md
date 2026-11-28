---
phase: "5"
slug: "content-engine-app-shell-deploy"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-28"
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `05-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.1.2 (unit/integration) + Playwright 1.65.1 (walker, `playwright.walker.config.ts`) |
| **Config file** | `vitest.config.ts`; `playwright.config.ts`; new `playwright.walker.config.ts` |
| **Quick run command** | `npx vitest run scripts/lib/content src/content src/interactions schemas` |
| **Full suite command** | `npx vitest run && npm run validate && node scripts/check-bundle.ts && node scripts/content/build-fixtures.ts && npx playwright test -c playwright.walker.config.ts` |
| **Estimated runtime** | ~240 seconds (full); ~20 seconds (quick) |

---

## Sampling Rate

- **After every task commit:** quick run command (+ `npm run validate` once content exists)
- **After every plan wave:** full suite command
- **Before `/gsd-verify-work`:** full suite green, CI six required checks green, `npm run review:screens` on fixture build routes, live `npm run smoke:protection`
- **Max feedback latency:** 240 seconds

---

## Per-Task Verification Map

Filled by the planner per task (each task carries an `<automated>` verify). Requirement → test map:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| CONT-01 | spec validates (ajv = Zod); MDX↔spec step parity; fixture renders all screens | unit + e2e | `npx vitest run schemas scripts/lib/content` + walker | ❌ W0 | ⬜ pending |
| CONT-02 | each rule has a failing fixture with exact message; `npm run validate` exit codes; word-count parity | unit + integration + e2e | `npx vitest run scripts/lib/content/rules scripts/validate-content.test.ts` + walker | ❌ W0 | ⬜ pending |
| CONT-03 | every registry id has props schema, fallback, oracle | unit | `npx vitest run src/interactions` | ❌ W0 | ⬜ pending |
| CONT-04 | walker completes every manifest lesson with no per-lesson code | e2e | `npx playwright test -c playwright.walker.config.ts` | ❌ W0 | ⬜ pending |
| CONT-05 | claim chips resolve; Rule shows effective + as-of; Stat data states; `effective_date` additive | unit (jsdom) + e2e | `npx vitest run src/content/mdx schemas scripts/research` + walker | partial | ⬜ pending |
| CONT-06 | frozen removal/rename/version change fails; additions pass | unit + integration | `npx vitest run scripts/check-frozen.test.ts` | ❌ W0 | ⬜ pending |
| PLAT-02 | `nextAction()`; routes; coming-next not a link | unit + e2e | `npx vitest run src/content/nextAction.test.ts src/routes.test.ts` + walker shell pass | partial | ⬜ pending |
| PLAT-03 | protection classifier on recorded responses; live prod + preview not public | unit + manual-run script | `npx vitest run scripts/smoke-protection.test.ts`; `npm run smoke:protection -- <urls>` | ❌ W0 | ⬜ pending |
| PLAT-04 | `build:vercel` fails on planted denied file; fixture/draft leak markers | integration | `npx vitest run scripts/check-bundle.test.ts` | ✅ extend | ⬜ pending |
| QA-01 | missing record / verifier==author / stale hash / unsupported / mismatch / non-Opus each fail | unit | `npx vitest run scripts/lib/content/shippable.test.ts` | ❌ W0 | ⬜ pending |
| QA-03 | axe zero violations; keyboard pass; reduced motion; perf budgets | e2e | walker | ❌ W0 | ⬜ pending |
| QA-04 | role report regenerates; `--check` drift; unknown role/competency fails | unit | `npx vitest run scripts/content/role-report.test.ts` | ❌ W0 | ⬜ pending |
| QA-05 | walker runs in required `build` job (container, step, job key unchanged) | config test | `npx vitest run scripts/ci-walker.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `schemas/lesson.schema.json`, `verification.schema.json`, `whats-new.schema.json` + fixtures
- [ ] `content/_fixtures/invalid/<rule>/` one per validator rule id
- [ ] `scripts/lib/words.ts` shared `countWords` + `review:screens` `[data-claim-meta]` exclusion + parity test
- [ ] `playwright.walker.config.ts`, `tests/walker/*`, `tests/oracles/*`; `testIgnore: ["walker/**"]` in `playwright.config.ts`
- [ ] `review:screens` option to serve the fixtures build for `/learn/fx-…`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production and PR preview URLs refuse unauthenticated requests | PLAT-03 | needs a live Vercel deployment | `npm run smoke:protection -- <prod-url> <preview-url>`; record verdicts (URLs redacted) in 05-VERIFICATION.md |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 240s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
