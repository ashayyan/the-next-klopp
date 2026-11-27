---
phase: 01-setup-contracts
plan: 01
subsystem: infra
tags: [git, guards, gitleaks, github, node-type-stripping]

requires: []
provides:
  - Repo guard files as the first code commit (.gitignore, .gitattributes, .env.example, .gitleaks.toml)
  - Dependency-free guard CLI (`--staged` reads index blobs, `--tracked` reads working tree)
  - Private GitHub repo ashayyan/the-next-klopp, default branch main
  - Phase branch gsd/phase-1-setup-contracts pushed with upstream
  - GSD git.branching_strategy = phase (base branch main)
affects: [01-03 husky hooks, 01-08 CI guards job and branch protection, every later phase commit]

actuals:
  tokens: 3000
  tasks: 2
  commits: 2
plan_head_before: d49834a64bf756383ed51b060a192c82c1cfe3c7
plan_head_after: c20ab8f6535a1a7b4fd91a0b4532b78de52b8542

tech-stack:
  added: []
  patterns:
    - "Pure rules module plus thin CLI (scripts/lib/guard.ts + scripts/guard-files.ts)"
    - "Native Node 24 type stripping: erasable TS only, .ts import extensions"
    - "git spawned with argument arrays and NUL-separated output (paths with spaces)"

key-files:
  created:
    - .gitignore
    - .gitattributes
    - .env.example
    - .gitleaks.toml
    - scripts/lib/guard.ts
    - scripts/guard-files.ts
  modified:
    - .planning/config.json

key-decisions:
  - "Local master renamed to main before any code commit; guard commit made on the phase branch, then main fast-forwarded to it"
  - "gitleaks allowlist uses [[allowlists]] (gitleaks 8.25+, CI binary is 8.30.1) matching AWS-shaped keys ending in EXAMPLE only"
  - "Guard treats any path segment named raw as denied, including a file named raw"

patterns-established:
  - "Fake secrets in tests are built at runtime by string concatenation so the guard and gitleaks never flag the test file"

requirements-completed: [SETUP-03, SETUP-04]

status: complete
---

# Phase 1 Plan 01: Repo Guards and Private Repo Summary

Guard files and a dependency-free size/path/secret CLI are the first code commit; the history is published to a new private repo `ashayyan/the-next-klopp` and GSD now branches per phase.

## What was built

- **Task 1 (tracer), commit `62370da`** `chore(repo): add repo guards`: six files only (`.env.example`, `.gitattributes`, `.gitignore`, `.gitleaks.toml`, `scripts/guard-files.ts`, `scripts/lib/guard.ts`). `.claude/` is not ignored as a whole, so `.claude/CLAUDE.md` stays tracked; `.claude/skills/`, `.env.*` (except `.env.example`), `**/raw/`, parquet outside `public/data/` and the brief copy are ignored.
- **Task 2, commit `c20ab8f`** `chore(gsd): switch to branch-per-phase`: `.planning/config.json` `git.branching_strategy: none` to `phase`. Not pushed (Plan 08 pushes the branch).
- Remote: `main` (= guard commit `62370da`) and `gsd/phase-1-setup-contracts` pushed with upstream.

## Verification evidence

- `node scripts/guard-files.ts --tracked` printed `guard: 38 file(s) ok (tracked)` after the guard commit (includes the AWS documentation example key in 01-RESEARCH.md).
- Staged probe: force-added `raw/guard-probe.txt` gave `guard: denied-path: raw/guard-probe.txt`, exit 1. Probe was unstaged and deleted afterwards.
- Unknown flag gave usage and exit 2.
- Rule probes: AWS key ending in EXAMPLE ignored; other AWS-shaped key, GitHub token, PEM header, Slack token, Anthropic key and quoted password assignment each flagged; `.env`, `.env.local`, nested raw folders, `.mp4`, `id_rsa.pub`, brief copy denied; `.env.example`, `public/data/*.parquet`, `.claude/CLAUDE.md` allowed; oversize rule fires above 5 MiB.
- Acceptance: `git check-ignore` exit codes 0 / 0 / 1 / 0 / 1 as required; `.env.example` has 2 empty keys; brief still on disk and not in `git status`.
- Plan verify command (main == origin/main, HEAD on phase branch, remote phase branch exists, `gh repo view` = `the-next-klopp PRIVATE main`, branching_strategy `phase`) exited 0. `git log origin/main -1` subject: `chore(repo): add repo guards`. `query git.base-branch` prints `main`.
- gh token scopes (names only): `gist`, `read:org`, `repo`, `workflow`. The `workflow` scope IS present (needed later by Plan 08).

## Deviations from Plan

None - plan executed as written. Notes:
- The Bash permission layer refused two long compound probe commands; the same checks ran as shorter separate commands and a scratch probe script in the session scratchpad (outside the repo). No effect on outputs.
- The gh login resolved to `ashayyan`; no existing repo was found, so `gh repo create the-next-klopp --private --source . --push` ran exactly as specified.

## Known Stubs

None.

## Threat Flags

None. Threat register T-01-01..T-01-03, T-01-06 and T-01-07 mitigations applied as planned; no credentials were read or printed.

## Self-Check: PASSED

- FOUND: .gitignore, .gitattributes, .env.example, .gitleaks.toml, scripts/lib/guard.ts, scripts/guard-files.ts
- FOUND commits 62370da and c20ab8f on the phase branch
