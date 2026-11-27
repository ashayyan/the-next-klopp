---
phase: "1"
slug: "setup-contracts"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-27"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 5.1.2 (+ ajv 8 / zod 4 inside tests) |
| **Config file** | `vitest.config.ts` — Wave 0 installs |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npm run lint && npm run typecheck && npm test && npm run build && npm run smoke` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` (pre-commit hook also runs `node scripts/guard-files.ts --staged`)
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite must be green, all six CI jobs green on the PR
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| SETUP-01 | skills present, `offer-k-dense-web` absent, locks pinned | script | `node scripts/verify-setup.ts skills` | ❌ W0 | ⬜ pending |
| SETUP-01 | `docs/SETUP.md` has a row per tool with version + verification | script | `node scripts/verify-setup.ts docs` | ❌ W0 | ⬜ pending |
| SETUP-02 | model overrides resolve; FABLE_LOG has protocol + cap | script | `node scripts/verify-setup.ts routing` | ❌ W0 | ⬜ pending |
| SETUP-03 | repo private, CI jobs named, protection outcome recorded | script + CI | `gh repo view the-next-klopp --json visibility,defaultBranchRef` | n/a | ⬜ pending |
| SETUP-04 | guard rejects raw path, oversized file, fake secret | unit | `npx vitest run scripts/guard.test.ts` | ❌ W0 | ⬜ pending |
| SETUP-04 | real hook blocks a staged bad file | integration | `node scripts/verify-setup.ts hook` | ❌ W0 | ⬜ pending |
| SETUP-04 | `.gitignore` / `.gitattributes` / `.env.example` correct | unit | `npx vitest run scripts/repo-files.test.ts` | ❌ W0 | ⬜ pending |
| SETUP-05 | profile + rules retrievable, no research dump | manual/script | agentmemory search round trip, output recorded in SETUP.md | n/a | ⬜ pending |
| SETUP-06 | seven ADRs with required sections | unit | `npx vitest run scripts/adr.test.ts` | ❌ W0 | ⬜ pending |
| SETUP-07 | valid fixtures pass ajv + zod, invalid fail both | unit | `npx vitest run schemas` | ❌ W0 | ⬜ pending |
| PLAT-01 | study on 4173 serves `/` and `/dev` | integration | `npm run smoke` | ❌ W0 | ⬜ pending |
| PLAT-01 | clean clone builds on Windows in a spaced path | CI | `windows-smoke` job | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts`, `scripts/lib/guard.ts`, `scripts/guard.test.ts`, `scripts/repo-files.test.ts`, `scripts/adr.test.ts`
- [ ] `schemas/schemas.test.ts` + valid/invalid fixtures for source, concept, competency, role
- [ ] `scripts/verify-setup.ts` and `scripts/smoke.ts`
- [ ] Framework install via `npm install`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `gh` token gains `workflow` scope | SETUP-03 | browser OAuth, learner's own credentials | learner runs `gh auth refresh -h github.com -s workflow` |
| Branch protection outcome on a private repo | SETUP-03 | depends on account plan | attempt `gh api` protection call; record 200 or 403 in SETUP.md + ADR 0007 |
| Skills load in a fresh session | SETUP-01 | needs a new Claude Code session | start new session, list skills |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
