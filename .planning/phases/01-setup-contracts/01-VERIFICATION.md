---
phase: 01-setup-contracts
verified: 2026-11-27T20:00:00Z
status: human_needed
score: 5/5 must-haves verified locally (2 have GitHub-CI-only sub-clauses routed to human)
covered_files: [".env.example", ".gitattributes", ".github/workflows/ci.yml", ".gitignore", ".planning/phases/01-setup-contracts/01-01-PLAN.md", ".planning/phases/01-setup-contracts/01-01-SUMMARY.md", ".planning/phases/01-setup-contracts/01-02-PLAN.md", ".planning/phases/01-setup-contracts/01-02-SUMMARY.md", ".planning/phases/01-setup-contracts/01-03-PLAN.md", ".planning/phases/01-setup-contracts/01-03-SUMMARY.md", ".planning/phases/01-setup-contracts/01-04-PLAN.md", ".planning/phases/01-setup-contracts/01-04-SUMMARY.md", ".planning/phases/01-setup-contracts/01-05-PLAN.md", ".planning/phases/01-setup-contracts/01-05-SUMMARY.md", ".planning/phases/01-setup-contracts/01-06-PLAN.md", ".planning/phases/01-setup-contracts/01-06-SUMMARY.md", ".planning/phases/01-setup-contracts/01-07-PLAN.md", ".planning/phases/01-setup-contracts/01-07-SUMMARY.md", ".planning/phases/01-setup-contracts/01-08-PLAN.md", ".planning/phases/01-setup-contracts/01-08-SUMMARY.md", ".planning/phases/01-setup-contracts/01-09-PLAN.md", ".planning/phases/01-setup-contracts/01-09-SUMMARY.md", "biome.json", "docs/FABLE_LOG.md", "docs/SETUP.md", "docs/decisions/0001-vite-spa-not-nextjs.md", "docs/decisions/0007-branch-protection.md", "package.json", "schemas/schemas.test.ts", "scripts/guard-files.ts", "scripts/lib/guard.ts", "scripts/smoke.ts", "scripts/verify-setup.ts", "src/main.tsx", "src/routes.ts", "src/schemas/contracts.ts", "tsconfig.json", "vite.config.ts"]
covered_digest: "v4:sha256:77152facb688c9d29e7a39d6bb57c1056f22fb41af40220f5535424b7c3078a7"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Fix GitHub billing (Settings, Billing & plans: update failed payment or raise Actions spending limit), then `gh run rerun 46057525045` (or push a commit) and run `gh pr checks 1`."
    expected: "lint, typecheck, test, build, guards, windows-smoke all SUCCESS on PR #1. This proves SC2 'builds from a clean clone in CI, including a Windows smoke job' and SC3 'a PR must pass lint, typecheck, unit tests, build and the Windows smoke job'."
    why_human: "All six jobs fail in 2 s with zero steps: 'The job was not started because recent account payments have failed or your spending limit needs to be increased.' Only the account owner can fix billing. The workflow has never executed on GitHub, so small fix(ci) rounds are possible once it runs (e.g. gitleaks-action permissions, GITLEAKS_LICENSE)."
  - test: "In a fresh Claude Code session in this repo, check that design-taste-frontend, web-design-guidelines, ui-ux-pro-max and the K-Dense subset appear in the skill list, and that offer-k-dense-web does not."
    expected: "Project-local skills load; promotional skill absent."
    why_human: "Skill discovery by a new session cannot be exercised from this verifier session. Files and lock are verified on disk (`verify-setup skills` ok, 17 skills)."
  - test: "In a fresh session run `/model` for opus, sonnet, haiku aliases (and ask: 'Recall the-next-klopp learner profile and project rules from agentmemory')."
    expected: "Aliases resolve to Opus 5.5, Sonnet 5.5, Haiku 5.5; agentmemory MCP tools return the profile and rules."
    why_human: "docs/SETUP.md states the alias mapping is assumed. MCP tools only appear in a new session. The REST/verify path is verified (`verify-setup memory` ok, 5 entries, longest 1320 chars)."
  - test: "Learner confirms D6 (study vs dev server split) and D10 (move project to a path without spaces) per ROADMAP research flag."
    expected: "Learner decision recorded against ADR 0005 and ADR 0006."
    why_human: "Roadmap flags these as learner-confirmation items; not a code gap."
---

# Phase 1: Setup & Contracts Verification Report

**Phase Goal:** As a learner who relies on Claude to build everything, I want to have a verified toolchain, a guarded private repo and a running app skeleton, so that every later phase builds on safe, reproducible foundations.
**Verified:** 2026-11-27T20:00:00Z
**Status:** human_needed
**Re-verification:** No (initial verification)

## Goal Achievement

All local, reproducible evidence passes. No code gap found. The only unmet items are GitHub-hosted CI runs, blocked by an account billing failure that no code change can fix, plus fresh-session checks the verifier cannot perform.

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `docs/SETUP.md` lists every tool with verified version, `offer-k-dense-web` disabled, model routing table; `docs/FABLE_LOG.md` has 4-step protocol and 3-per-milestone cap | VERIFIED | SETUP.md rows: GSD Core 1.23.0, agentmemory 0.9.33, K-Dense 2.72.0 @c21d13b3cc28, design-taste-frontend 2.5.1, frontend-design 1.1.1, web-design-guidelines, ui-ux-pro-max, dataviz (lines 23-31); line 26 "offer-k-dense-web ... Status: disabled" and enforced by `verify-setup skills`; routing table lines 61-93 (Fable/Opus/Sonnet/Haiku + GSD tier mapping). FABLE_LOG.md line 22 "All four steps are required", line 31 "At most 3 per milestone". `node scripts/verify-setup.ts all` exit 0 (docs, hook, memory, routing, skills). taste-skill is a real project-local folder in `.claude/skills/design-taste-frontend`. Note: `.claude/skills/` is git-ignored by design and restored from tracked `skills-lock.json` (documented "Fresh clone" path). |
| 2 | `npm run dev` on Windows opens skeleton at fixed port; builds from clean clone in CI incl. Windows smoke job | VERIFIED (local) / CI half human_needed | `vite.config.ts`: dev 5173 and preview 4173, both `strictPort: true`. README documents `npm run dev` then http://localhost:5173. `npm run smoke:dev` ok ("http://localhost:5173/ and duplicate start rejected"); `npm run smoke` ok (4173, SPA fallback, no dev route code in dist/assets); `npm run build` exit 0 (101 modules). CI workflow has `build` and `windows-smoke` (windows-latest: npm ci, build, smoke). Workflow never executed on GitHub (billing). |
| 3 | Private repo `the-next-klopp` with protected `main`; PR must pass lint, typecheck, tests, build, Windows smoke; test commits with raw data/oversized/fake secret are rejected by guards | VERIFIED (platform + guards) / CI-pass half human_needed | `gh repo view the-next-klopp`: visibility PRIVATE. `gh api .../branches/main/protection`: required contexts lint, typecheck, test, build, guards, windows-smoke; strict true; enforce_admins true; force-push and deletion off; PR required. PR #1 OPEN, MERGEABLE. Guards: `node scripts/guard-files.ts --tracked` "110 file(s) ok"; `verify-setup hook` probes: pre-commit rejects staged raw/ file, pre-push blocks main, commit-msg rejects free-text; guard unit tests (secret, size, path, case variants) pass inside 166/166 vitest. `.gitattributes` `* text=auto eol=lf`; `.gitignore` covers raw data, .env*, parquet; `.env.example` present. Six required checks have NOT passed (see human items). |
| 4 | Querying agentmemory returns learner profile and project rules; no raw research dumps | VERIFIED (REST path) / MCP recall in fresh session human | `GET localhost:3111/agentmemory/livez` returns status ok. `verify-setup memory`: ok, 5 entries, longest 1320 chars (no raw dumps; short paraphrased entries tagged project the-next-klopp). |
| 5 | `docs/decisions/` has records for Vite vs Next, router, storage, Vercel scope, study/dev split, path-with-spaces; `/schemas` holds source, concept, competency, role schemas that fixtures validate against | VERIFIED | ADRs 0001-0006 exist (40-42 lines each) plus 0007 branch protection; structure test in vitest passes. `/schemas`: source, concept, competency, role, common JSON Schemas, fixtures for all four, `schemas.test.ts` (dual validator Ajv + Zod mirrors in `src/schemas/contracts.ts`) passes. `npx vitest run`: 6 files, 166 tests, all pass. |

**Score:** 5/5 truths verified locally; CI-hosted proof pending (human).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json`, `vite.config.ts`, `tsconfig.json`, `biome.json` | Pinned stack, fixed ports | VERIFIED | Exact pins (vite 8.4.0, react 19.3.1, typescript 7.0.2, biome 2.6.9); strictPort set |
| `src/main.tsx`, `src/routes.ts`, `src/routes/{home,dev,not-found}.tsx` | App skeleton, lazy routes, dev-only route | VERIFIED | Build emits lazy `home` and `not-found` chunks; smoke asserts dev route code absent from dist |
| `scripts/guard-files.ts`, `scripts/lib/guard.ts` | Size/path/secret guard | VERIFIED | Runs clean on 110 tracked files; unit-tested |
| `.husky/{pre-commit,pre-push,commit-msg}` | Local gates | VERIFIED | Probed live by `verify-setup hook` |
| `.github/workflows/ci.yml` | Six jobs matching required contexts | VERIFIED (static) | Job keys equal protection contexts; gitleaks pinned by SHA; `pull_request` not `pull_request_target`; timeouts set. Never run on GitHub. |
| `schemas/*.schema.json`, fixtures, `schemas.test.ts` | Four contract schemas | VERIFIED | Tests pass |
| `docs/SETUP.md`, `docs/FABLE_LOG.md`, `docs/decisions/0001-0007` | Records | VERIFIED | See truths 1, 5 |
| `.gitignore`, `.gitattributes`, `.env.example` | Repo guards | VERIFIED | Contents checked |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| ci.yml job keys | branch protection required contexts | identical names | WIRED | Both list lint, typecheck, test, build, guards, windows-smoke |
| `.husky/*` | `scripts/guard-files.ts` | hook invocation | WIRED | `verify-setup hook` probes reject raw file |
| `schemas/*.json` | `src/schemas/contracts.ts` | Zod mirror compared in test | WIRED | Dual-validator test passes |
| `skills-lock.json` | `.claude/skills/*` | `verify-setup skills` | WIRED | 17 skills ok |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Lint project files | `npx biome ci .` | exit 1, all 7 errors/5 warnings located in untracked `scratch_tmp_review/drift.test.ts`; same command on project paths (src scripts schemas docs configs) exit 0 | PASS (scratch excluded per instruction) |
| Typecheck | `npx tsc --noEmit` | exit 0 | PASS |
| Unit tests | `npx vitest run` | 6 files, 166/166 pass | PASS |
| Build | `npm run build` | exit 0 | PASS |
| Smoke (preview) | `npm run smoke` | ok | PASS |
| Smoke (dev) | `npm run smoke:dev` | ok (duplicate-start error is the expected assertion) | PASS |
| Setup verifier | `node scripts/verify-setup.ts all` | exit 0 | PASS |
| Guard | `node scripts/guard-files.ts --tracked` | 110 files ok | PASS |
| Repo private | `gh repo view the-next-klopp --json visibility` | PRIVATE | PASS |
| PR checks | `gh pr checks 1` | 6 required jobs fail in 2 s (billing); Devin Review pass | BLOCKED (human) |

### Probe Execution

No `scripts/*/tests/probe-*.sh` declared or present. Step skipped.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| SETUP-01 | 01-07, 01-08 | SATISFIED (fresh-session skill load human) | SETUP.md toolchain table; verify-setup skills ok |
| SETUP-02 | 01-07, 01-08 | SATISFIED (alias mapping human) | Routing table; FABLE_LOG.md; verify-setup routing ok |
| SETUP-03 | 01-01, 01-04, 01-09 | SATISFIED for repo, protection, conventional commits, PR; CI-green proof human | Private repo, protection verified via API, commit-msg probe; workflow written |
| SETUP-04 | 01-01, 01-04, 01-09 | SATISFIED | gitignore/gitattributes/guard/.env.example; gitleaks in CI (unrun) plus local secret rules |
| SETUP-05 | 01-08 | SATISFIED | verify-setup memory ok |
| SETUP-06 | 01-06 | SATISFIED | ADRs 0001-0006 |
| SETUP-07 | 01-05 | SATISFIED | schemas + passing fixture tests |
| PLAT-01 | 01-02, 01-03, 01-09 | SATISFIED locally; CI Windows smoke human | Fixed ports, README command, smoke ok |

All eight IDs appear in plan frontmatter and in REQUIREMENTS.md (marked Complete, mapped to Phase 1). No orphaned requirements. Note: REQUIREMENTS.md marks SETUP-03 and PLAT-01 Complete while the CI-pass clause is unproven; 01-09-SUMMARY says status partial and `requirements-blocked: PLAT-01 CI proof`. ROADMAP also shows 01-09 unchecked and "8/9 plans executed". Consider reverting those two checkboxes until CI is green.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none in tracked files) | - | TBD/FIXME/XXX/TODO scan not triggered in phase code; no stubs; build output shows real routes | Info | - |
| `scratch_tmp_review/drift.test.ts` | various | Biome noExplicitAny/format/organizeImports | Info | Untracked reviewer leftover, excluded from judgement; it will break `npx biome ci .` locally until removed and must never be committed (guard would not necessarily stop it; it is simply untracked) |

### Human Verification Required

1. **GitHub CI green** - fix billing, rerun, confirm `gh pr checks 1` shows six SUCCESS. Expect possible small `fix(ci)` rounds since the workflow has never run (gitleaks permissions or license).
2. **Skill load in fresh session** - project-local skills visible, `offer-k-dense-web` absent.
3. **Model aliases and agentmemory MCP recall in fresh session** - `/model`, then ask for profile and rules recall.
4. **Learner confirmations D6 and D10** (study/dev split, path without spaces).

### Gaps Summary

No code gaps. Every locally checkable must-have holds with real evidence (commands run in this session, not SUMMARY claims). Phase cannot be marked fully passed until the six GitHub checks run green, because success criteria 2 and 3 explicitly require CI proof and the protected `main` cannot be merged without them (strict, enforce_admins).

---

_Verified: 2026-11-27T20:00:00Z_
_Verifier: Claude (gsd-verifier)_
