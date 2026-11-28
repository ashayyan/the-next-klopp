---
phase: "3"
slug: "pitch-standard-data-pipeline"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-28"
---

# Phase 3 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Pipeline → provider hosts | `klopp-pipeline fetch` over the HTTPS allow-list, sha256-pinned | Raw open-data files (Wyscout CC BY, StatsBomb local-only) |
| Raw cache → artifacts | standardise/recipe/publish write versioned, immutable artifacts | Derived scenes; licence/shippable metadata |
| Repo → GitHub (PUBLIC since 2026-11-28) | Commits pushed; guard + gitleaks + immutability checks | Only shippable (CC BY) artifacts and code |
| Build → Vercel bundle | `vite build` then `check-bundle` deny-manifest gate | `dist/` assets and `public/data` |
| Browser ↔ dev route | `/dev/pitch` (dev-only) loads catalog and local scenes | Scene JSON (validated by Zod + integrity) |
| Test harness → headless Edge | CDP on 127.0.0.1 with a temp profile | Page state, screenshots (git-ignored) |

---

## Threat Register

Full per-threat evidence (file:line, commits) produced by gsd-security-auditor on 2026-11-28 at HEAD `8ab6e79` (after the 15 code-review fixes).

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01 | Tampering | Pitch title/desc | low | mitigate | React text nodes; no innerHTML in src/ | closed |
| T-03-02 | Information disclosure | dev routes | medium | mitigate | `import.meta.env.DEV` gate + smoke dist scan | closed |
| T-03-03 | Denial of service | scene schema | medium | mitigate | strictObject + maxItems/length bounds in both validators | closed |
| T-03-04 | Tampering | `source.licenceUrl` | medium | mitigate | http(s) pattern in JSON Schema and Zod | closed |
| T-03-05 | Repudiation | attribution | medium | mitigate | licence/attribution required; StatsBomb logo rule | closed |
| T-03-06 | Tampering | network in tests | medium | mitigate | autouse socket block in conftest | closed |
| T-03-07 | Tampering | converter drift | medium | mitigate | kloppy==3.19.1 pin; `landmarks --check` in CI | closed |
| T-03-08 | Tampering | glyph labels | medium | mitigate | truncation + text nodes + schema caps | closed |
| T-03-09 | Tampering | `?scene=` param | low | mitigate | lookup by id only; fallback | closed |
| T-03-10 | Tampering / Info disclosure | fetch SSRF | high | mitigate | https/443/host allow-list on every redirect | closed |
| T-03-11 | Denial of service | zip handling | medium | mitigate | declared + streamed size caps; no extraction | closed |
| T-03-12 | Tampering | upstream dataset change | high | mitigate | sha256 pins for all Wyscout and StatsBomb files; commit-pinned URLs; hash on every cache read | closed |
| T-03-13 | Tampering | kloppy loaders | medium | mitigate | BytesIO only; no `load_open_data` | closed |
| T-03-14 | Tampering | manifest paths | medium | mitigate | name regexes + `inside()` root checks | closed |
| T-03-15 | Tampering | artifact mutation | high | mitigate | hash-derived versions; ImmutableVersionError (bytes + licence facts, WR-11) | closed |
| T-03-16 | Information disclosure / licence | publish | high | mitigate | copy only when manifest and allow-list both shippable; 1 MB cap | closed |
| T-03-17 | Denial of service | playback loop | low | mitigate | dt clamp; loop stops on unmount | closed |
| T-03-18 | Information disclosure / licence | dist bundle | high | mitigate | deny-manifest + markers + unlisted-data + symlink fail in `check-bundle` (CI build + windows-smoke) | closed |
| T-03-19 | Tampering | glob matching across OS | medium | mitigate | lowercase + posix matchesGlob incl. dotfiles | closed |
| T-03-20 | Information disclosure / licence | staging local-only data | high | mitigate | guard denies local-only dataset paths; gitignore | closed |
| T-03-21 | Elevation of privilege | CI interpolation | medium | mitigate | read-only token; env-passed refs; no pull_request_target | closed |
| T-03-22 | Tampering | setup-uv supply chain | medium | mitigate | SHA-pinned; `uv sync --frozen`, `--locked` | closed |
| T-03-23 | Tampering | silent mutation of published artifacts | high | mitigate | `check-immutable` MDRT diff in pre-commit and CI | closed |
| T-03-24 | Tampering | probe input / drag | low | mitigate | decimal + finite + bounds; clamp; no persistence | closed |
| T-03-25 | Tampering | published scene loader | medium | mitigate | JSON content-type check; parseScene on every source | closed |
| T-03-26 | Information disclosure / licence | LOCAL_STATSBOMB | high | mitigate | dev-only chunk; gitignore; deny globs + marker | closed |
| T-03-27 | Repudiation / licence | StatsBomb attribution | medium | mitigate | attribution + logoRequired + localOnly enforced | closed |
| T-03-28 | Elevation of privilege | CDP debug port | medium | mitigate | 127.0.0.1, temp profile, kill + cleanup on exit/signal | closed |
| T-03-SC (03-02) | Tampering | npm installs | high | mitigate | exact pins, lockfile integrity, audit signatures in CI | closed |
| T-03-SC (03-03) | Tampering | kloppy install | high | mitigate | exact pin; hash-pinned uv.lock; `--locked` | closed |
| T-03-SC (other 9 plans) | Tampering | installs | high | accept | no dependency changes (git-verified) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-SC (03-01, 03-04..03-11) | Plans installed no packages; manifests changed only in 03-02 and 03-03 | Claude (learner-delegated autonomous run) | 2026-11-28 |
| AR-03-02 | T-03-SC (03-02, 03-03) residual | Human package-legitimacy read waived by CONTEXT decision; compensating controls: exact pins, lockfile hashes, npm audit signatures/audit, uv --locked | Claude (learner-delegated autonomous run) | 2026-11-28 |
| AR-03-03 | WR-11 policy | Unchanged-bytes version with changed licence metadata is refused; publish a new version deliberately | Claude (learner-delegated autonomous run) | 2026-11-28 |

---

## Out-of-register warnings (non-blocking)

- W-1: `NEW_PROJECT_INPUT.md` (learner profile) remains in public git history (commit `2c520e1`). Removal needs a history rewrite + force-push — a learner decision; learner was informed 2026-11-28 and chose to keep profile lines in tracked docs.
- W-2: add `NEW_PROJECT_INPUT.md` to guard `DENIED_BASENAMES` so `git add -f` cannot re-add it.
- W-3: `pipeline/tests/fixtures/coverage_responses.json` holds trimmed StatsBomb match-index metadata (no events/coordinates); treated as index metadata.
- W-4: Phase 2 SECURITY.md wording "private repo" is stale.
- W-5: dev-only `catalog.json` scene path concatenation without traversal check (same-origin, guarded artefact).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-28 | 39 | 39 | 0 | gsd-security-auditor (sonnet), ASVS L1 |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-28
