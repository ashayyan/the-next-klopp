---
phase: "2"
slug: "research-wave-1"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-28"
---

# Phase 2 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Web → research agents | Agents fetch public pages, PDFs and APIs | Untrusted text (prompt-injection risk), licence terms |
| Pipeline → provider indexes | `klopp-pipeline coverage` fetches allow-listed HTTPS hosts | Index metadata, optional `GITHUB_TOKEN` header |
| Research JSON → generated views/page | Node generators render Markdown views and the summary HTML | Source titles/notes (injection risk) |
| Orchestrator/agents → agentmemory | Short verdicts over REST | Bearer secret (never written), paraphrased verdicts |
| Repo → GitHub | Commits pushed to the private repo | Research files; raw caches must stay local |

---

## Threat Register

Full per-threat evidence (file:line, commits) was produced by gsd-security-auditor on 2026-11-28 at branch `gsd/phase-02-research-wave-1`.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Spoofing | fabricated sources | high | mitigate | schema sha256 + paraphrase cap; excerpt required for regulation/measured claims | closed |
| T-02-02 | Tampering | agents following injected instructions | high | mitigate | README write-scope + untrusted-content rule; per-domain commits only touched own folder | closed |
| T-02-03 | Tampering | seed-sources edited by parallel agents | medium | mitigate | only 02-01 commits touch it; unique id/url test | closed |
| T-02-04 | Tampering | SSRF / open redirect in net.py | medium | mitigate | https + port 443 + host allow-list on every hop; timeouts | closed |
| T-02-05 | Denial of service | zip bomb (Wyscout) | medium | mitigate | 5 MB member/archive caps, in-memory read, no extract | closed |
| T-02-06 | Information disclosure | GITHUB_TOKEN | medium | mitigate | env only, api.github.com only, stripped on redirect, never cached | closed |
| T-02-07 | Information disclosure / legal | raw cache committed | high | mitigate | cache under git-ignored `pipeline/data/raw`; guard denies `raw` segments | closed |
| T-02-08 | Tampering | views drift | medium | mitigate | `render-views --check` | closed |
| T-02-09 | Tampering | Markdown injection | low | mitigate | `cell()` escapes `<` `>` pipes newlines (WR-01) | closed |
| T-02-10 | Tampering | summary page XSS | high | mitigate | textContent only, escaped JSON, CSP `default-src 'none'` + script hash | closed |
| T-02-11 | Information disclosure | page network calls | medium | mitigate | CSP + banned-API test + headless Edge CSP run | closed |
| T-02-12 | Tampering | lint-staged reformat of page | low | mitigate | Biome ignore `research/summary` | closed |
| T-02-13 | Tampering | injection (laws) | high | mitigate | write-scope + gate rules | closed |
| T-02-14 | Information disclosure / legal | copying IFAB text | high | mitigate | hash + ≤300-char paraphrase only; no-code-fence | closed |
| T-02-15 | Tampering | injection (pitch-geometry) | high | mitigate | write-scope + gate rules | closed |
| T-02-16 | Spoofing | invented pitch numbers | high | mitigate | measured numbers need excerpt cite; reviewer sample | closed |
| T-02-17 | Tampering | injection (positions) | high | mitigate | write-scope + gate rules | closed |
| T-02-18 | Spoofing | numbering folklore as fact | medium | mitigate | every claim cites; Contested needs ≥2 sources | closed |
| T-02-19 | Tampering | injection (formations) | high | mitigate | write-scope + gate rules | closed |
| T-02-20 | Spoofing | hallucinated DOIs | medium | mitigate | DOI validation + Crossref re-check | closed |
| T-02-21 | Tampering | injection (tactics-history) | high | mitigate | write-scope + gate rules | closed |
| T-02-22 | Information disclosure / legal | paraphrase too close to books | medium | mitigate | books reference-only; hash + paraphrase only | closed |
| T-02-23 | Tampering | injection (how-analysts-watch) | high | mitigate | write-scope + gate rules | closed |
| T-02-24 | Spoofing | overstated evidence | medium | mitigate | DOI validation; reviewer sample | closed |
| T-02-25 | Spoofing | overstated ADHD claims | high | mitigate | evidence grade per paper; ADHD vs general split rule | closed |
| T-02-26 | Information disclosure | learner details in API queries | medium | mitigate | README rule; no mailto/email/token in research | closed |
| T-02-27 | Information disclosure | personal data from job ads | medium | mitigate | no PII patterns in outputs | closed |
| T-02-28 | Tampering / legal | scraping forbidden/login sites | medium | mitigate | README no-scrape list; public pages only | closed |
| T-02-29 | Information disclosure / legal | StatsBomb shipped | high | mitigate | licence excerpts; ADR 0008 local-only + tests | closed |
| T-02-30 | Tampering / legal | ToS-violating scraping | medium | mitigate | FBref removed; Transfermarkt not scraped | closed |
| T-02-31 | Information disclosure / legal | copying explainer code/visuals | high | mitigate | no fences, no images/JS under research; licence fields | closed |
| T-02-32 | Tampering | injection (explainers) | high | mitigate | write-scope + gate rules | closed |
| T-02-33 | Information disclosure / legal | licence overreach in merge | high | mitigate | most-restrictive-wins, invalid value throws, conflicts reported | closed |
| T-02-34 | Tampering | hand edits to registry | medium | mitigate | `build-registry --check`; realpath is-main (WR-02) | closed |
| T-02-35 | Spoofing | dead/invented jit URLs | medium | mitigate | 24 URLs checked 2xx; all unverified | closed |
| T-02-36 | Information disclosure / legal | StatsBomb clips in Vercel bundle | high | mitigate | ADR 0008 deny-manifest globs + test | closed |
| T-02-37 | Repudiation | untraceable licence decision | medium | mitigate | ADR citations resolve to registry + matrix numbers test | closed |
| T-02-38 | Spoofing | invented competencies | medium | mitigate | role sources resolve; thin evidence flagged | closed |
| T-02-39 | Tampering | id churn after approval | medium | mitigate | ids pinned; approval test; STATE freeze note | closed |
| T-02-40 | Spoofing | concepts with non-covering sources | medium | mitigate | registry cites; unverified-only concepts held draft | closed |
| T-02-41 | Tampering | derived links drift | medium | mitigate | `derive-links --check` | closed |
| T-02-42 | Spoofing | Band 2/3 shown as verified | medium | mitigate | jit seeds unverified; approval limited to t00–t04 with verified source | closed |
| T-02-43 | Tampering | renaming Band 1 ids | medium | mitigate | Tracks 0–4 ids identical across 02-18→02-19 | closed |
| T-02-44 | Tampering | XSS in real summary page | high | mitigate | CSP hash recomputed in test; `build-summary --check` | closed |
| T-02-45 | Repudiation | deferred domain dropped | medium | mitigate | gaps coverage test vs brief domains | closed |
| T-02-46 | Information disclosure / legal | unknown-licence source shipping | medium | mitigate | unknown-licence list in gaps.json + test | closed |
| T-02-47 | Repudiation / Elevation | approval without independence | high | mitigate | fresh reviewer; ≥10 sampled claims; learner may re-open | closed |
| T-02-48 | Information disclosure | agentmemory secret | high | mitigate | secret only in Authorization header; pre-commit secret scan | closed |
| T-02-49 | Tampering | raw research in memory | medium | mitigate | 600-char cap; fixed verdict list; idempotent sync | closed |
| T-02-SC (02-02) | Tampering | uv installs | high | mitigate | exact pins + tracked hash-pinned uv.lock | closed |
| T-02-SC (02-04) | Tampering | npm @dagrejs/dagre | high | mitigate | exact pin, lockfile integrity, `npm audit signatures`, build-time only | closed |
| T-02-SC (other 19 plans) | Tampering | installs | high | accept | no dependency changes | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-SC (02-01, 02-03, 02-05..02-21) | These plans added no packages; only 02-02 and 02-04 changed lockfiles | Claude (learner-delegated autonomous run) | 2026-11-28 |
| AR-02-02 | T-02-SC (02-02, 02-04) follow-up | Human legitimacy read of typer 0.29.3, pydantic 2.14.4, pytest 9.2.0, @dagrejs/dagre 3.1.4 ("too-new" flag only) not performed; technical controls (exact pins, hash-pinned lockfiles, signature audit) in place | Claude (learner-delegated autonomous run) | 2026-11-28 |
| AR-02-03 | T-02-47 | Reviewer independence is evidenced by process (fresh agent) and APPROVAL.md text, not provable in code; acceptable at ASVS L1 | Claude (learner-delegated autonomous run) | 2026-11-28 |

---

## Informational Follow-ups (non-blocking)

- Add explicit README sentences: no contact details of private individuals; login-free pages only (T-02-27/28).
- Summary page CSP: add `base-uri 'none'` and `form-action 'none'` (IN-01).
- `pipeline/tests/record_fixtures.py` unbounded zip read in a hand-run helper (IN-04).
- Registry merge: `active` beats `unverified` by design (IN-05).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-28 | 70 | 70 | 0 | gsd-security-auditor (sonnet), ASVS L1 |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-28
