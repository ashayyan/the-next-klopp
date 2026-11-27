---
phase: "1"
slug: "setup-contracts"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-27"
---

# Phase 1 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Local repo → GitHub (private) | Commits pushed to `ashayyan/the-next-klopp` | Source, planning docs, learner profile in brief (private) |
| Developer → git index | Pre-commit/pre-push hooks + guard | Candidate files (raw data, secrets, oversized) |
| GitHub Actions runner | CI jobs with read-only token | Repo contents, `GITHUB_TOKEN` (read) |
| Third-party skills/packages → agents | Skills installed into `.claude/skills`, npm/uv packages | Instructions and code executed by agents/tooling |
| Agent → agentmemory (localhost :3111) | Profile and rules stored via REST/MCP | Paraphrased personal profile, bearer secret (never written to repo) |
| Dev/preview server → browser | Vite on localhost 5173/4173 | App bundle; dev routes excluded from study build |

---

## Threat Register

Mitigation evidence (file:line) is recorded in the audit verdict summarised below; full per-threat evidence was produced by gsd-security-auditor on 2026-11-27 at HEAD `ca3abfc`.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Information disclosure | guard secret rules | high | mitigate | `scripts/lib/guard.ts` secret rules + NUL/UTF-16 scan; `.gitignore` .env; gitleaks in CI | closed |
| T-01-02 | Information disclosure | guard path/size rules | high | mitigate | case-insensitive any-depth deny list, 5 MiB limit, staged blob reads | closed |
| T-01-03 | Information disclosure | gh repo create | high | mitigate | repo created `--private`; live `gh repo view` = PRIVATE | closed |
| T-01-04 | Information disclosure | brief with learner profile pushed | medium | accept | repo private; brief §13 authorises push | closed |
| T-01-05 | Tampering | guard bypass via --no-verify | medium | transfer | CI `guards` job is a required check (ADR 0007) | closed |
| T-01-06 | Elevation of privilege | learner credentials | medium | mitigate | no token use in code; only scope names in docs | closed |
| T-01-07 | Tampering | guard CLI path parsing | medium | mitigate | `execFileSync` arg arrays, NUL-separated git output | closed |
| T-01-SC (01-01) | Tampering | installs (plan 01) | high | accept | guard uses node built-ins only; no installs | closed |
| T-01-08 | Tampering | package.json dependency set | high | mitigate | exact pins, tracked lockfile, `npm audit signatures` | closed |
| T-01-09 | Information disclosure | vite server/preview host | medium | mitigate | `host: "localhost"` for server and preview | closed |
| T-01-10 | Denial of service | port drift strands IndexedDB | medium | mitigate | `strictPort: true`, duplicate-start + stale-server checks | closed |
| T-01-11 | Denial of service | orphaned processes | low | mitigate | `taskkill /T /F` in finally + signal handlers | closed |
| T-01-SC (01-02) | Tampering | npm installs (plan 02) | high | mitigate | legitimacy audit in SETUP.md, pins, `npm ci` | closed |
| T-01-12 | Information disclosure | dev routes in study build | low | mitigate | `import.meta.env.DEV` gate + smoke dist scan | closed |
| T-01-13 | Tampering | vitest discovery | low | mitigate | explicit include globs | closed |
| T-01-SC (01-03) | Tampering | npm installs (plan 03) | high | accept | no deps beyond plan 02 pins | closed |
| T-01-14 | Tampering | husky hook bypass | medium | transfer | CI `guards` required check (ADR 0007) | closed |
| T-01-15 | Tampering | hook probe leaves staged file | medium | mitigate | empty-index precondition, finally cleanup, clean-index assertion | closed |
| T-01-16 | Repudiation | non-conventional history | low | mitigate | commit-msg hook + branch-scoped history test | closed |
| T-01-17 | Information disclosure | secret-shaped test data | medium | mitigate | runtime-built fakes + self-scan test | closed |
| T-01-18 | Tampering | verify-setup arg as path | low | mitigate | allowlist from `scripts/verify/` listing | closed |
| T-01-SC (01-04) | Tampering | npm installs (plan 04) | high | accept | husky/lint-staged already pinned | closed |
| T-01-19 | Tampering | schema input validation | medium | mitigate | `additionalProperties: false`, `z.strictObject`, bounds, ajv strict | closed |
| T-01-20 | Tampering | ajv vs Zod disagreement | medium | mitigate | shared regexes + dual-validator fixture test with expect_path | closed |
| T-01-21 | Repudiation | untraceable claims | medium | mitigate | required `sources`, licence fields, hashed excerpts | closed |
| T-01-22 | Denial of service | regex ReDoS | low | mitigate | short anchored patterns | closed |
| T-01-SC (01-05) | Tampering | npm installs (plan 05) | high | accept | ajv/ajv-formats/zod pinned in plan 02 | closed |
| T-01-23 | Repudiation | ADR coverage | low | mitigate | `scripts/adr.test.ts` | closed |
| T-01-24 | Information disclosure | Vercel protection scope | medium | mitigate | ADR 0004 All Deployments + test keyword | closed |
| T-01-SC (01-06) | Tampering | installs (plan 06) | high | accept | docs only | closed |
| T-01-25 | Elevation of privilege | third-party skills | high | mitigate | curated subset, pinned commits + hashes, forbidden-skill check | closed |
| T-01-26 | Tampering | taste-skill Stop hook | medium | mitigate | source reviewed: no network; gated on `.taste-skill/build.json` | closed |
| T-01-27 | Tampering | prompt injection in skill text | medium | mitigate | pinned skills CLI, directive-phrase scan | closed |
| T-01-28 | Information disclosure | skills CLI telemetry | low | accept | `DISABLE_TELEMETRY=1` best effort; public metadata only | closed |
| T-01-29 | Elevation of privilege | Fable routing/cost | low | mitigate | no fable in config; `routing.ts` check; FABLE_LOG | closed |
| T-01-30 | Information disclosure | skills committed by accident | medium | mitigate | gitignore + guard deny prefix | closed |
| T-01-SC (01-07) | Tampering | installs (plan 07) | high | mitigate | `skills@1.9.1` via npx; uv_build pinned range | closed |
| T-01-31 | Information disclosure | agentmemory secret | high | mitigate | secret read only into header; docs secret scan | closed |
| T-01-32 | Information disclosure | over-storing personal data | medium | mitigate | 4000-char cap; five paraphrased entries | closed |
| T-01-33 | Tampering | memory capture hooks | medium | mitigate | MCP-only entry, no `--with-hooks` | closed |
| T-01-34 | Tampering | recalled memory as instructions | low | accept | short factual entries; brief/CONTEXT remain authority | closed |
| T-01-SC (01-08) | Tampering | installs (plan 08) | high | mitigate | `@agentmemory/mcp@0.9.33` pinned | closed |
| T-01-35 | Elevation of privilege | CI token scope | high | mitigate | `permissions: contents: read`; guards adds `pull-requests: read` only; no pull_request_target | closed (CI runtime-unproven) |
| T-01-36 | Tampering | gitleaks-action supply chain | medium | mitigate | SHA-pinned v3.0.0 (verified) | closed (CI runtime-unproven) |
| T-01-37 | Tampering | direct push to main | high | mitigate | live branch protection (6 checks, strict, admins) + pre-push hook | closed |
| T-01-38 | Information disclosure | secrets in history | high | mitigate | gitleaks full-history + guard `--tracked` in CI | closed (CI runtime-unproven) |
| T-01-39 | Information disclosure | token text in docs/PR body | medium | mitigate | PR body + SETUP.md secret scans | closed |
| T-01-SC (01-09) | Tampering | installs (plan 09) | high | mitigate | `npm ci`, audit signatures, audit high | closed (CI runtime-unproven) |

*Status: open · closed · open — below high threshold (non-blocking)*
*CI runtime-unproven: the control is implemented in `.github/workflows/ci.yml` but GitHub Actions has not executed yet because of an account billing block; re-confirm on the first green run.*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01-01 | T-01-04 | Brief (with paraphrasable learner profile) lives in a private repo; brief §13 requires pushing it | Claude (learner-delegated autonomous run) | 2026-11-27 |
| AR-01-02 | T-01-SC (01-01, 01-03, 01-04, 01-05, 01-06) | Plans added no new packages beyond the plan 02 audited, pinned set | Claude (learner-delegated autonomous run) | 2026-11-27 |
| AR-01-03 | T-01-28 | Skills CLI telemetry is best-effort disabled; payload is public-repo install metadata | Claude (learner-delegated autonomous run) | 2026-11-27 |
| AR-01-04 | T-01-34 | agentmemory entries are short factual summaries; brief and CONTEXT.md stay authoritative | Claude (learner-delegated autonomous run) | 2026-11-27 |

*Accepted risks do not resurface in future audit runs.*

---

## Informational Follow-ups (non-blocking)

- IN-05: `.husky/pre-commit` uses `npx lint-staged`; prefer `npx --no-install` to avoid a fetch when `node_modules` is missing.
- IN-01: `actions/checkout@v7` / `setup-node@v7` on major tags; consider SHA pins and `persist-credentials: false`.
- IN-04: any non-empty `ALLOW_MAIN_PUSH` bypasses the local pre-push check (advisory by ADR 0007; GitHub protection is the real control).
- Commit `0b93c64` contains a documented fake password example in `01-REVIEW.md` (reworded in `1e0b951`); the first gitleaks run may flag it — add a narrow allowlist if so.
- IN-03: oversize/gitlink entries crash the guard with a stack trace (still fails closed).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-27 | 48 | 48 | 0 | gsd-security-auditor (sonnet), ASVS L1 |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-27
