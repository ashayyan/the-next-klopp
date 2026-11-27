# Phase 1: Setup & Contracts - Research

**Researched:** 2026-11-27
**Domain:** Toolchain install/verification, GitHub repo guards + CI, Vite 8 / React 19 / TS 7 skeleton, JSON Schema contracts (Windows 11, path with spaces)
**Confidence:** HIGH on stack, skills install, CI, guards, schemas (every command below was run in a scratch project in a path with spaces on this machine). MEDIUM on GitHub branch protection for the learner's account (documented as unavailable on Free private repos, but not testable without creating a repo). MEDIUM on agentmemory tool names (see A3).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
(Copied from `01-CONTEXT.md` `## Decisions`; the learner delegated all grey areas to Claude and chose the recommended option each time.)

**App framework and routing**
- Vite 8 SPA (React 19, TypeScript 7 for `tsc --noEmit`, Biome 2 for lint/format), not Next.js. ADR 0001.
- React Router 8 in data-router library mode with `lazy` routes (not framework mode, not TanStack Router). ADR 0002.
- URL shape: `/learn/:trackId/:chapterId/:lessonId`, `/review`, `/whats-new`, `/dev/*` for dev-only routes. Phase 1 only implements `/` and a placeholder `/dev` route.

**Local storage engine**
- Dexie 4 on IndexedDB; JSON export/import as sync path. ADR 0003. Phase 1 only records the decision; no Dexie code.

**Servers, ports, study/dev split (D6)**
- `npm run dev` = Vite dev server, fixed port 5173, `strictPort: true`. `npm run study` = production build + `vite preview`, fixed port 4173, `strictPort: true`. In Phase 1 `study` serves the same skeleton. ADR 0005. The learner's one documented command for studying is `npm run study`; `npm run dev` is the one command for the skeleton/dev loop (PLAT-01 satisfied by both on fixed ports).

**Path with spaces (D10)**
- Keep the project at `E:\To become new klop`. Quote every path, file-op scripts in Node not shell, no `make`, no bash-only chains in `package.json`, CI Windows smoke job checks out into a path containing spaces. ADR 0006.

**Vercel scope (decision only, deploy is Phase 5)**
- Deployment Protection scope "All Deployments" with Vercel Authentication. ADR 0004. No Vercel action in Phase 1.

**GitHub repo, branches, CI**
- `gh repo create the-next-klopp --private --source . --push` from the learner's already-authenticated `gh`. Claude never handles passwords.
- Rename local `master` to `main` before the first push.
- Protect `main` via branch protection or a ruleset (PR + required CI checks). If GitHub refuses on the plan, record the refusal in `docs/SETUP.md` and `docs/decisions/0007-branch-protection.md`, keep the CI workflow, and enforce locally with a pre-push hook that blocks direct pushes to `main`.
- Branching: one branch per phase (`gsd/phase-{N}-{slug}`), merged to `main` by PR after CI passes at phase end; conventional commits; release tag per milestone.
- CI `ci.yml` jobs: `lint` (Biome), `typecheck` (tsc), `test` (Vitest), `build` (vite build), `guards` (size/path/secret guard script + gitleaks), `windows-smoke` (windows-latest, checkout into a path with spaces, `npm ci`, `npm run build`, start preview on 4173 and fetch `/`). Ubuntu for all jobs except Windows smoke.

**Repo guards (SETUP-04)**
- `.gitignore` covers `node_modules/`, `dist/`, `.env*` except `.env.example`, `pipeline/data/raw/`, `pipeline/.venv/`, `data/raw/`, `feedback/`, `public/pyodide/`, Playwright `test-results/` and `playwright-report/`, `*.parquet` outside `public/data/`, any `raw/` folder.
- `.gitattributes`: `* text=auto eol=lf` plus binary markers for images/fonts/wasm.
- `scripts/guard-files.ts`: fails on any staged or tracked file over 5 MB, any path under a raw/licensed-data folder, any deny-list match, any secret-pattern match; run as pre-commit (husky + lint-staged) and in CI.
- Secret scanning: gitleaks in CI plus GitHub secret scanning/push protection if available; the local regex guard also rejects a fake secret.
- `.env.example` committed (placeholder keys, no values).
- Demonstrated by a Vitest test that feeds the guard a fake raw-data path, an oversized file and a fake secret and asserts each is rejected.

**Toolchain install and verification (SETUP-01)**
- Read each tool's current README before install; README beats the brief; note differences in `docs/SETUP.md`.
- GSD Core: already installed globally; record version; do not reinstall.
- agentmemory: already installed; record version and a store + search round trip.
- K-Dense Scientific Agent Skills: install per its README; disable/remove `offer-k-dense-web` and any other promotional skill; verify one skill loads.
- Design skills: taste-skill v2 (`design-taste-frontend`) reinstalled project-locally under `.claude/skills/` as real files (not a symlink); Anthropic `frontend-design`; Vercel `web-design-guidelines`; `ui-ux-pro-max`; the installed `dataviz` skill. Record source repo, version/commit, verification for each.
- If a third-party install fails on network, record failure + exact retry command in `docs/SETUP.md`; optional skills do not block, K-Dense and agentmemory are mandatory.

**Model routing and Fable log (SETUP-02)**
- Keep GSD profile `balanced`; add per-agent overrides in `.planning/config.json` only where GSD supports them; record the brief section 5 routing table in `docs/SETUP.md`.
- `docs/FABLE_LOG.md`: 4-step escalation protocol, 3-per-milestone cap, empty log table.

**agentmemory content (SETUP-05)**
- Store: learner profile (brief section 1 + section 16 corrections), project non-negotiables (section 2), communication rules (section 14), model routing summary, D6/D10 decisions. No raw research. Verify with a search that returns the profile and the rules.

**Shared contract schemas (SETUP-07)**
- JSON Schema 2020-12 in `/schemas`: `source.schema.json`, `concept.schema.json` (concept-map node + edges file), `competency.schema.json`, `role.schema.json`, plus Zod 4 mirrors in `src/schemas/`. At least one valid and one invalid fixture each in `schemas/fixtures/`; a Vitest test validates them (ajv for JSON Schema, and the Zod mirror agrees).
- Source fields: `id`, `title`, `url`, `type`, `publisher`, `free`, `license` object with `read`, `automated_access`, `redistribute`, `derivative` (each `yes|no|unknown|conditional` plus note), `quality` (1-5), `recency` (date), `as_of` (fetch date), `best_for`, `notes`, `status` (`active|removed|unverified`), optional `removed_reason`, optional `excerpts[]` (`id`, `locator`, `fetched_at`, `sha256`, `paraphrase` <= 300 chars).
- Concept: `id` (kebab), `title`, `track`, `part`, `summary`, `prerequisites[]` (concept ids), `roles[]`, `competencies[]`, `sources[]` (source ids), `status`.
- Role: `id`, `title`, `summary`, `competencies[]` (with target level 1-4), `sources[]`. Competency: `id`, `title`, `domain`, `levels[]` (1-4 descriptors), `concepts[]`.

**Decided autonomously**
- Skeleton: single plain home route with project name and a link to `/dev`; no design styling beyond Tailwind base.
- npm with committed `package-lock.json`, `.nvmrc` = 24, engines node >=24. Vitest 5. ajv 8 with ajv-formats.
- Layout: `src/`, `schemas/`, `scripts/`, `docs/` (SETUP, FABLE_LOG, decisions), `pipeline/` (empty uv package stub, Python 3.12), `.github/workflows/`.
- ADR format MADR-lite `docs/decisions/NNNN-title.md` (Status, Context, Decision, Consequences, Alternatives).
- CI Node 24 via `actions/setup-node` with npm cache. Pre-commit: husky 9 + lint-staged running Biome and the guard script.

### Claude's Discretion
- Exact Tailwind 4 setup and placeholder home copy.
- Exact wording of SETUP.md and ADRs.
- Whether Zod mirrors are generated from JSON Schema or hand-written (they must agree on the fixtures either way). **Recommendation below: hand-write.**

### Deferred Ideas (OUT OF SCOPE)
- Vercel project link and deploy (Phase 5).
- Dexie schema and export/import (Phase 6).
- Pipeline code (kloppy etc.) (Phase 3); Phase 1 only stubs `pipeline/pyproject.toml`.
- Visual baselines in CI (Phase 4).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | Toolchain installed + verified, recorded in `docs/SETUP.md`; promotional skills disabled | K-Dense (npx skills, curated 14-skill subset, `offer-k-dense-web` does not exist in v2.72.0), taste/ui-ux/web-design project-local install (`--copy`), `skill-manifest` verification, agentmemory wiring gap |
| SETUP-02 | Model routing configured and logged; `docs/FABLE_LOG.md` | GSD `model_overrides` / `models` keys verified with `config-set` + `resolve-model`; routing table below |
| SETUP-03 | Private repo, protected `main`, branch-per-phase PRs, CI | `gh` token lacks `workflow` scope; protection unavailable on Free private repos (documented); full `ci.yml`; bootstrap ordering vs GSD executor branch guard |
| SETUP-04 | First commit carries repo guards | Guard design (pure fn + CLI), node-native TS, husky on Windows verified, gitleaks-action v3 licence, secret scanning not available on Free private |
| SETUP-05 | Learner profile + rules in agentmemory | REST fallback verified against README; MCP not wired for this project; tool names differ from the orchestrator prompt |
| SETUP-06 | ADRs in `docs/decisions/` | ADR list 0001-0007 with the facts each should cite |
| SETUP-07 | Shared schemas + fixtures | ajv 2020 strictness gotcha, ajv vs zod format disagreements (measured), hand-written mirrors + dual-validator test pattern |
| PLAT-01 | App runs on Windows localhost, one command, fixed port | Vite 8.4 skeleton built, `strictPort`, command-lock behaviour, `study` script, smoke script verified |
</phase_requirements>

## Summary

Phase 1 is standard tooling work, but five facts discovered this session change the plan ordering and must reach the planner. (1) The learner's `gh` token has scopes `gist`, `read:org`, `repo` and no `workflow`, so pushing `.github/workflows/ci.yml` will be rejected until the learner runs `gh auth refresh -s workflow` themselves (a human checkpoint). (2) GitHub documents protected branches and rulesets as available on private repos only for Pro/Team/Enterprise; secret scanning for user-owned private repos is not available on Free. The CONTEXT fallback (pre-push hook + ADR 0007) is therefore the likely path, and the plan must treat a 403 as an expected outcome, not a failure. (3) `gsd-executor` hard-refuses to commit on the default branch (`main`/`master`), and `branching_strategy: phase` forks from `origin/main`, which does not exist until the repo is created; Phase 1 therefore needs an explicit bootstrap sequence (below). (4) The current `agent_skills` entries `global:design-taste-frontend` are rejected by GSD today (verified warning); the fix is a project-relative path to the project-local copy. (5) `offer-k-dense-web` is not in K-Dense v2.72.0 at all, so "disable" means "verify absent and record it"; installing all 177 skills is not advisable, a curated 14-skill subset is.

The skeleton itself is low risk: Vite 8.4.0 + React 19.3.1 + TS 7.0.2 + Tailwind 4.3.5 + Biome 2.6.9 + Vitest 5.1.2 built, typechecked (1.5 s), linted, tested and previewed on Windows in a path with spaces. Node 24 runs `.ts` scripts natively (type stripping), so the guard and smoke scripts need no `tsx` at hook time (0.15 s vs about 1 s).

**Primary recommendation:** Execute Phase 1 on branch `gsd/phase-1-setup-contracts` created locally before any executor runs; make the first commit the guard files; fast-forward `main` to it and create/push the repo; get `workflow` scope from the learner early; then build skeleton, CI, schemas and docs on the phase branch and merge by PR, with protection applied (or the 403 recorded) before the PR is opened.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| App skeleton routes (`/`, `/dev`) | Browser / Client (SPA) | CDN / Static (built `dist`) | Client-only Vite SPA, no server rendering (ADR 0001) |
| Dev vs study servers | Local Node process (Vite dev/preview) | - | Fixed ports 5173/4173; origin decides IndexedDB identity |
| Repo guards (size/path/secret) | Git hooks (local, Node script) | CI `guards` job | Local blocks early; CI is the non-bypassable copy (`--no-verify` skips hooks) |
| Branch protection / required checks | GitHub (platform) | Local pre-push hook (fallback) | Platform enforcement unavailable on Free private; hook is advisory |
| Contract schemas | Static JSON files (`/schemas`) | Zod mirrors in `src/schemas/` | JSON Schema is the language-neutral contract (Python agents, Phase 2); Zod serves the app |
| Skill/agent config | `.claude/skills`, `.planning/config.json` | `~/.claude` global | GSD discovers project skills; `skills-lock.json` pins versions |
| Learner profile / rules memory | agentmemory server (localhost:3111) | MCP shim in Claude Code | Local-only store outside the repo |

## Standard Stack

### Core (all versions confirmed against the live npm registry on 2026-11-27 and installed in a scratch project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite | 8.4.0 | dev server, bundler | locked by ADR 0001 `[VERIFIED: npm registry, built OK]` |
| @vitejs/plugin-react | 6.3.0 | JSX/fast refresh | peer `vite ^8` `[VERIFIED: npm registry]` |
| react / react-dom | 19.3.1 | UI | `[VERIFIED: npm registry]` |
| react-router | 8.5.3 | data router, `lazy` routes (import from `react-router`, no `react-router-dom`) | `[VERIFIED: built OK, lazy chunks emitted]` |
| tailwindcss + @tailwindcss/vite | 4.3.5 | CSS-first styling | `@import "tailwindcss";` in one CSS file `[VERIFIED: built OK]` |
| typescript | 7.0.2 | `tsc --noEmit` only | typecheck 1.5 s `[VERIFIED: ran]` |
| @biomejs/biome | 2.6.9 | lint + format (`biome ci` in CI) | `[VERIFIED: ran]` |
| vitest | 5.1.2 | unit tests | shares Vite config `[VERIFIED: ran]` |
| zod | 4.6.7 | runtime mirrors | `z.toJSONSchema(..., {target:"draft-2020-12"})` works `[VERIFIED: ran]` |
| ajv | 8.20.0 | JSON Schema 2020-12 validation (`ajv/dist/2020.js`) | `[VERIFIED: ran]` |
| ajv-formats | 3.0.1 | `date`, `date-time`, `uri` | `[VERIFIED: ran]` |
| husky | 9.1.7 | git hooks | `[VERIFIED: pre-commit + pre-push ran on Windows in a spaced path]` |
| lint-staged | 17.6.2 | staged Biome run | `[VERIFIED: ran]` |
| @types/react 19.3.3, @types/react-dom 19.3.0, @types/node 26.6.11 | | typings | `[VERIFIED: npm registry]` |

`tsx` 4.23.15 is **not required** for guard/smoke scripts (Node 24.21 runs `.ts` natively). Keep it out unless a later phase needs it (STACK.md lists it for content scripts). If a script uses a feature type-stripping cannot handle, use `tsx`.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node script.ts` (native) | `tsx script.ts` | tsx is about 1 s slower per hook; needed only for non-erasable TS (enums, param properties) |
| Hand-written Zod mirrors | `z.toJSONSchema()` generated schemas | Generated output cannot express `.refine()` and defines the contract by the mirror, not by the language-neutral file. Rejected. |
| gitleaks-action v3 | gitleaks binary 8.30.1 in a step | Action is simplest and free for personal accounts; binary avoids a third-party action if desired |
| Classic branch protection | Ruleset | Same plan limits; ruleset JSON given below as alternative |

**Installation (exact, produced a working scratch project):**
```bash
npm install --save-exact react@19.3.1 react-dom@19.3.1 react-router@8.5.3 zod@4.6.7
npm install --save-exact -D vite@8.4.0 @vitejs/plugin-react@6.3.0 tailwindcss@4.3.5 @tailwindcss/vite@4.3.5 \
  typescript@7.0.2 @biomejs/biome@2.6.9 vitest@5.1.2 ajv@8.20.0 ajv-formats@3.0.1 husky@9.1.7 lint-staged@17.6.2 \
  @types/react@19.3.3 @types/react-dom@19.3.0 @types/node@26.6.11
npm install-scripts deny esbuild      # see Pitfall 6 (npm 11.19 install-scripts gate)
```

## Package Legitimacy Audit

Seam run: `gsd-tools query package-legitimacy check --ecosystem npm ...` on 2026-11-27.

| Package | Registry | Age / latest publish | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|----------------------|--------------|-------------|---------|-------------|
| react, react-dom, typescript, zod, ajv, ajv-formats, husky, @types/react-dom | npm | mature | 49M to 520M | github.com (official orgs) | OK | Approved |
| vite 8.4.0 | npm | latest published 2026-11-26 | 275M | github.com/vitejs/vite | SUS `too-new` | Approved with note |
| @vitejs/plugin-react, react-router, @biomejs/biome, vitest, tailwindcss, @tailwindcss/vite, lint-staged, @types/react, @types/node | npm | latest published 2026-11-06 to 2026-11-26 | 28M to 647M | official org repos | SUS `too-new` | Approved with note |

The only SUS reason is `too-new` (the latest *version* was published within days; the packages themselves are years old, 28M+ downloads/week, with official source repos, not deprecated). **Planner:** do not add one `checkpoint:human-verify` per package. Add a single batched confirmation in the end-of-phase human verify (config `human_verify_mode: end-of-phase`) stating "versions pinned exactly in `package.json`, `package-lock.json` committed, `npm audit signatures` run". Mitigation tasks: pin exact versions, commit the lockfile, run `npm audit signatures` and `npm audit --omit=dev` in CI `guards` or `lint`.
**Packages removed due to SLOP:** none. **Packages flagged SUS:** the ten listed above (reason `too-new` only).
Non-npm installs (`skills` CLI 1.9.1, K-Dense, taste-skill, vercel-labs/agent-skills, ui-ux-pro-max) are third-party agent skills, not npm dependencies; they are reviewed under Security Domain (skills run "with full agent permissions", the CLI itself says so).

## Architecture Patterns

### System Architecture Diagram

```
 learner types: npm run study                      Claude/agents: npm run dev
        |                                                   |
        v                                                   v
  vite build -> dist/ -> vite preview :4173          vite dev :5173 (strictPort)
        \_________________________  ___________________/
                                  \/
                     Browser SPA  (/ , /dev)   [React Router 8, lazy routes]
                                  |
              (Phase 6 later: IndexedDB per ORIGIN: 5173 and 4173 are different stores)

 git commit --> .husky/pre-commit --> node scripts/guard-files.ts --staged
                                    --> lint-staged (biome check --write)
 git push   --> .husky/pre-push  --> blocks refs/heads/main unless ALLOW_MAIN_PUSH=1
 PR to main --> GitHub Actions ci.yml
                 |- lint (biome ci)          |- typecheck (tsc)      |- test (vitest)
                 |- build (vite build)       |- guards (guard --tracked + gitleaks)
                 `- windows-smoke (path with spaces: npm ci, build, preview :4173, fetch / and /dev)
 schemas/*.schema.json + fixtures --(ajv 2020)--> vitest <--(zod mirror)-- src/schemas/*.ts
                    ^ consumed later by Phase 2 research agents and the Phase 5 validator
```

### Recommended Project Structure
```
.claude/skills/            # project-local skills (GITIGNORED, restored from skills-lock.json)
.github/workflows/ci.yml
.husky/pre-commit, pre-push
.gitleaks.toml
docs/SETUP.md, FABLE_LOG.md, decisions/0001..0007-*.md
pipeline/pyproject.toml, .python-version, src/klopp_pipeline/__init__.py   # stub only
schemas/*.schema.json, schemas/common.schema.json, schemas/fixtures/*.json, schemas/schemas.test.ts
scripts/guard-files.ts (CLI), scripts/lib/guard.ts (pure), scripts/guard.test.ts, scripts/smoke.ts, scripts/verify-setup.ts
src/main.tsx, src/index.css, src/routes/home.tsx, src/routes/dev.tsx, src/schemas/*.ts
skills-lock.json           # committed, pins every installed skill to a commit + hash
```

### Pattern 1: Bootstrap ordering (resolves the GSD branch-guard / no-origin / workflow-scope knot)

**What:** The executor refuses to commit on the default branch; `handle_branching` with strategy `phase` runs `git fetch origin main` and aborts when `origin` is absent `[VERIFIED: read ~/.claude/gsd-core/workflows/execute-phase.md and agents/gsd-executor.md]`. Quote from the executor: `FATAL: refusing to commit — HEAD is on '$ACTUAL_BRANCH' (protected/default branch).` with override `git.allow_default_branch_commits: true`.
**Prescribed order:**
1. Orchestrator (not an executor) creates `gsd/phase-1-setup-contracts` from local `master`, keeps `branching_strategy: none` for now, and runs the executors on that branch (non-protected, so the guard passes). Also `git branch -m master main` (renames only the base; HEAD stays on the phase branch).
2. Wave 1 first commit on the phase branch = repo guards only: `.gitignore`, `.gitattributes`, `.env.example`, `.gitleaks.toml`, `scripts/lib/guard.ts` + `scripts/guard-files.ts` (dependency-free, run with `node`). This satisfies "first commit carries repo guards" for what `main` will contain.
3. Human checkpoint (learner): `gh auth refresh -h github.com -s workflow` (browser device flow; Claude never handles the login).
4. `git switch main && git merge --ff-only gsd/phase-1-setup-contracts` (a merge, not a commit, so the executor guard is not involved), then `gh repo create the-next-klopp --private --source . --push` (pushes the current branch `main`). `git switch gsd/phase-1-setup-contracts`, `git push -u origin gsd/phase-1-setup-contracts`.
5. Flip config: `gsd-tools query config-set git.branching_strategy phase` so Phases 2+ fork `gsd/phase-{N}-{slug}` from `origin/main` automatically (`config-set` verified to accept this key).
6. Build skeleton, hooks, CI, schemas, docs on the phase branch. Install husky only after step 4 (so the ff-merge push is not blocked by the pre-push hook), or push with `ALLOW_MAIN_PUSH=1`.
7. Apply branch protection (Pattern 5) or record the 403, **then** open the PR; CI runs on the PR; merge when green (merge via `gh pr merge` on the server is not blocked by the local hook).
`master` to `main`: `git.base_branch` defaults to `main` and `gsd-tools query git.base-branch` returned `main` in a test repo `[VERIFIED: ran]`.

### Pattern 2: Pure guard function + thin CLI (testable, hook-fast)
**What:** `scripts/lib/guard.ts` exports `checkFile({path,size,content})`; `scripts/guard-files.ts` lists files via `git diff --cached --name-only --diff-filter=ACMR -z` (`--staged`) or `git ls-files -z` (`--tracked`) and exits 1 on violations. The Vitest test imports the pure function (no git needed) and asserts rejection of a raw path, an oversized file and a fake secret. Native type stripping needs erasable syntax only: set `"erasableSyntaxOnly": true`, `"allowImportingTsExtensions": true`, and import siblings with the `.ts` extension. `[VERIFIED: ran; tsc exit 0, `node scripts/guard-files.ts --tracked` printed "guard: 22 file(s) ok (tracked)" in 0.15 s]`
**Fake secret in tests:** build it at runtime (`"AKIA" + "IOSFODNN7EXAMPLE"`) so neither gitleaks nor the guard flags the test file itself. A literal in the test file made the guard flag `leak.ts` `[VERIFIED: ran]`.

### Pattern 3: Dual-validator contract test
Each schema has `X.schema.json` (source of truth) and `src/schemas/X.ts` (hand-written Zod). One parametrised test iterates `schemas/fixtures/X.valid*.json` and `X.invalid*.json` and asserts ajv and Zod agree on each. Put shared fragments in `schemas/common.schema.json` (`kebabId`, `isoDate`, `permission`) and register with `ajv.addSchema` before compiling dependents. Cross-document integrity (ids exist, prerequisite graph acyclic) is not expressible in JSON Schema: leave to the Phase 2 and Phase 5 validators, but record it in a comment in each schema (`$comment`) so later agents know.

### Pattern 4: Skill install, project-local, pinned, restorable
Use `skills` CLI 1.9.1 with `--copy -a claude-code -y` (copy, not symlink). Result: real files in `.claude/skills/<name>/`, and `skills-lock.json` (version 2) recording `source`, `commit`, `computedHash`, `installMode: "copy"` `[VERIFIED: ran for taste-skill, web-design-guidelines, ui-ux-pro-max, K-Dense subset]`. See Skill Install section.

### Pattern 5: Branch protection with the platform's real limits
See Code Examples (classic API + ruleset JSON) and Pitfall 2.

### Anti-Patterns to Avoid
- **Committing `.claude/skills/`:** the taste skill alone is 39 MB, 1631 files `[VERIFIED: du/find]`. Gitignore it, commit `skills-lock.json`.
- **`strict: true` ajv with conditional `required` on parent-defined properties:** fails `strictRequired` (see Pitfall 4).
- **`format: "uri"` / Zod `z.url()` as the shared URL rule:** they disagree (measured). Use a `pattern` in both.
- **`tsx` in the pre-commit hook:** adds about 1 s per commit; use `node file.ts`.
- **Relying on the local pre-push hook as "protection":** `--no-verify` bypasses it; it is a fallback only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secret detection in CI | regex-only scanner | gitleaks-action v3 (`.gitleaks.toml` with `useDefault`) | Full-history scanning and a maintained ruleset; keep the small regex guard only as the fast local layer |
| JSON Schema validation | custom validators | ajv 2020 + ajv-formats | Draft 2020-12, formats, strict mode |
| Process-tree kill in smoke test | `child.kill()` only | `taskkill /pid <pid> /T /F` on win32 | npm/vite spawn grandchildren on Windows; plain kill leaves the port bound (verified the pattern frees 4173) |
| Skill pinning/restore | copying folders by hand | `skills-lock.json` + `npx skills experimental_install` | Records commit and hash; restore verified |
| Duplicate dev server detection | custom lock files | Vite 8.4 built-in command lock | A second `npm run dev` fails with "Found another Vite dev process for this project at http://localhost:5173/ (PID n)" `[VERIFIED: ran]` |
| Dev/prod port clash handling | port-probing code | `strictPort: true` | Fails loudly instead of silently moving to 5174 and stranding IndexedDB data |

**Key insight:** every control in this phase has an off-the-shelf implementation; the work is wiring order (bootstrap, scopes, plan limits) and proving each control rejects bad input.

## Skill and Tool Install (SETUP-01, authoritative commands)

All run from `E:\To become new klop` in Git Bash or PowerShell with quoted path. Set `DISABLE_TELEMETRY=1` for the `skills` CLI (its help lists an install telemetry event: `--metadata <json>  Attach valid JSON to the install telemetry event`; whether `DISABLE_TELEMETRY` is honoured was not proven, treat as best effort `[ASSUMED]`).

| Tool | Current version (this session) | Install / verify |
|------|-------------------------------|------------------|
| GSD Core | 1.23.0 (npm `@opengsd/gsd-core` 1.23.0; `~/.claude/gsd-core/VERSION` = 1.23.0; release v1.23.0 on 2026-11-23) `[VERIFIED]` | Do not reinstall. Verify: `node ~/.claude/gsd-core/bin/gsd-tools.cjs runtime-identity --raw` |
| agentmemory | 0.9.33 (GitHub release v0.9.33, 2026-11-09; npm `@agentmemory/agentmemory` and `@agentmemory/mcp` latest 0.9.33) `[VERIFIED]`; server is running: `curl http://localhost:3111/agentmemory/livez` returned `{"service":"agentmemory","status":"ok","viewerPort":3113,...}` | See agentmemory section |
| K-Dense Scientific Agent Skills | 2.72.0 (release 2026-10-01), commit `c21d13b3cc2894680229ba9959a53281acb9200e`, 177 skills, MIT `[VERIFIED: gh api + clone]` | README Option 1: `npx skills add K-Dense-AI/scientific-agent-skills`. README Option 2: `gh skill install K-Dense-AI/scientific-agent-skills --agent claude-code` (needs gh >= 2.90; installed 2.102.0). **No Claude Code plugin-marketplace command exists in the README** `[VERIFIED: README read]`. |
| taste-skill | "tasteskill 2.5.1" (SKILL.md frontmatter), commit `952435f63acece7d2fcb4b4d3c1786c1c43603e0`, MIT | `npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend -a claude-code --copy -y` |
| web-design-guidelines | 1.1.0 (SKILL.md metadata), vercel-labs/agent-skills commit `5a37a6329fbad3666c3207392a6a7c0110e92efb`, MIT | `npx skills add vercel-labs/agent-skills --skill web-design-guidelines -a claude-code --copy -y` |
| ui-ux-pro-max | nextlevelbuilder/ui-ux-pro-max-skill commit `11ca2b3bdd555649f278ee348c32a9302b24dcf1`, MIT, 3.9 MB, needs Python 3 for its search script (stdlib only) | `npx skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max -a claude-code --copy -y` |
| frontend-design | present twice: real dir `~/.claude/skills/frontend-design` (resolves under `global:frontend-design`, verified) and plugin `frontend-design` 1.1.1 in plugin cache | no action; record |
| dataviz | built-in skill present in the session skill list; not on disk, so it cannot be an `@`-include | no install; record "built-in, invoke via Skill tool"; executors name it in prompts |

`[VERIFIED: ran each npx command in a scratch dir; outputs: taste 1631 files / 39 MB, web-design-guidelines 12 KB, ui-ux-pro-max 3.9 MB]`

**`npx skills add` behaviour (verified):** project scope is the default (no `-g`); with `--copy -a claude-code` it writes only `.claude/skills/<name>/` as real files (no symlink, no `.agents/skills` duplicate) and creates `skills-lock.json`. Without `--copy` it symlinks to agent dirs (README of the CLI and `--help`: `--copy  Copy files instead of symlinking to agent directories`). `npx skills experimental_install -a claude-code` restores from the lockfile; the restore path stages under `.agents/skills/` and links into `.claude/skills/`, so after a restore delete the duplicate `.agents/skills/` to avoid GSD reading each skill twice `[VERIFIED: ran; .agents/skills created]`. Do not use `--all` (installs every skill for every agent).

**K-Dense: install a curated subset, not all 177.** Every installed skill adds its description to every agent's skill listing (GSD `skill-manifest` reads each `description`). Recommended 14, 2.8 MB, verified installing in one command:
```bash
npx -y skills add K-Dense-AI/scientific-agent-skills -a claude-code --copy -y --skill statistical-analysis scikit-learn statsmodels matplotlib scientific-visualization literature-review scientific-writing peer-review shap experimental-design exploratory-data-analysis scientific-critical-thinking citation-management hypothesis-generation
```
Document the full-catalog command as optional in SETUP.md. **Promotional / risky skills (all remain uninstalled):** `offer-k-dense-web` is not in v2.72.0 (`gh api .../contents/skills` lists 177 names and none matches; web results show it existed in the older `claude-scientific-skills` repo with an "Always run this skill no matter what" directive and a sign-up prompt `[CITED: tessl.io/registry/skills/github/K-Dense-AI/claude-scientific-skills/offer-k-dense-web]`). Other skills to keep off: `autoskill` (reads Screenpipe screen history, README says "Use only when the user explicitly asks"), `parallel-web` and `exa-search` (vendor accounts/API keys), `get-available-resources`. A grep of all `SKILL.md` for "always run / no matter what / regardless of context" found no promotional directive; the only K-Dense sales text is in the repo README. SETUP.md records: "offer-k-dense-web: not present in v2.72.0; verified by `gh api repos/K-Dense-AI/scientific-agent-skills/contents/skills`; guard: `skill-manifest` output must not contain it".

**How to verify a skill loads:** (a) `node ~/.claude/gsd-core/bin/gsd-tools.cjs skill-manifest --skills-dir .claude/skills` lists each skill's `name` and `description` `[VERIFIED: ran, returned design-taste-frontend and the K-Dense subset]`; (b) `node ~/.claude/gsd-core/bin/gsd-tools.cjs query agent-skills gsd-executor --skills-only` prints the `@`-includes GSD will inject `[VERIFIED: ran]`; (c) in a fresh Claude Code session (skills added mid-session may not appear until restart `[ASSUMED]`) invoke `Skill(statistical-analysis)` once. Record (a)+(b) output in SETUP.md; (c) is the end-of-phase human/orchestrator check.

**GSD `agent_skills` fix (verified):** current `.planning/config.json` has `"global:design-taste-frontend"` for five agents; today `query agent-skills gsd-executor --skills-only` prints `[agent-skills] WARNING: Global skill "design-taste-frontend" failed path check (symlink escape?) — skipping` `[VERIFIED: ran in the real project]`. After the project-local install, replace with the project-relative path. Verified output in a scratch project: `- @.claude/skills/design-taste-frontend/SKILL.md` and `- @C:/Users/MrrightClick/.claude/skills/frontend-design/SKILL.md`. Commands:
```bash
node ~/.claude/gsd-core/bin/gsd-tools.cjs query config-set agent_skills.gsd-executor '[".claude/skills/design-taste-frontend","global:frontend-design"]'
# repeat for gsd-ui-researcher, gsd-ui-checker, gsd-ui-auditor (same two entries) and gsd-planner ('[".claude/skills/design-taste-frontend"]')
```
Plugin form for frontend-design is also valid: `global:frontend-design:frontend-design` (emits a Skill-tool directive `[VERIFIED: ran]`). Alternative if the learner prefers the global copy: `agent_skills_security.trusted_global_roots: ["~/.agents/skills"]` `[CITED: GSD docs/CONFIGURATION.md]`; not recommended because CONTEXT locks project-local.

**taste-skill caveats:** its SKILL.md frontmatter registers a `Stop` hook that runs `scripts/gate.mjs --hook claude` (timeout 600). The script only enforces when a `.taste-skill/build.json` marker exists, spawns headless Chrome/Edge, and contains no `fetch(`/`http` network calls (grep). Add `.taste-skill/` to `.gitignore`. Chrome and Edge are installed here `[VERIFIED: paths exist]`. The skill targets marketing sites; Phase 4 decides how strictly to apply it to app screens.

## agentmemory (SETUP-05)

- Two memory systems exist on this machine; do not confuse them. (a) rohitg00/agentmemory 0.9.33: server on `localhost:3111`, viewer `3113`, data under `%APPDATA%\agentmemory` and `~/.agentmemory`, shared by all projects. (b) an inline `agent-memory` plugin (`~/.claude/plugins/data/agent-memory-inline/memory.db`, skill `agent-memory:memory-search`).
- **The agentmemory MCP shim is not wired for this project.** `~/.claude.json` has an `agentmemory` MCP server only under project `E:/Mehdaf_model` (`npx -y @agentmemory/mcp@0.9.33`) `[VERIFIED: read]`; `E:/To become new klop` has no `.mcp.json` and no project MCP entry. Wire it MCP-only (no hooks, no auto-capture) with: `claude mcp add agentmemory --scope local -- npx -y @agentmemory/mcp@0.9.33` (scope `local` is the default and matches how Mehdaf is configured). The README's `agentmemory connect claude-code --with-hooks` installs 12 hooks that capture every session; do not use it here (PITFALLS #19: memory pollution).
- **Tool names per the README and INSTALL_FOR_AGENTS runbook:** `memory_save`, `memory_recall` (BM25), `memory_smart_search`, `memory_profile`, `memory_lesson_save`, `memory_sessions`, `memory_export`, `memory_governance_delete` `[CITED: github.com/rohitg00/agentmemory README + INSTALL_FOR_AGENTS.md]`. The orchestrator prompt listed `memory_store / memory_search / memory_context / memory_stats`; those names were not found in the agentmemory sources read. **Executor instruction:** list the available tools at runtime, use whichever save/search pair exists; do not assume names.
- **REST fallback (verified against the runbook text, not executed to avoid writing a probe into the learner's store):**
```bash
read -r AGENTMEMORY_SECRET < "$HOME/.agentmemory/secret"
curl -fsS -X POST http://localhost:3111/agentmemory/remember -H "Authorization: Bearer $AGENTMEMORY_SECRET" -H "Content-Type: application/json" -d '{"content":"...","concepts":["the-next-klopp","learner-profile"]}'
curl -fsS -X POST http://localhost:3111/agentmemory/smart-search -H "Authorization: Bearer $AGENTMEMORY_SECRET" -H "Content-Type: application/json" -d '{"query":"learner profile ADHD PFSA","limit":5}'
```
Expected: `201` then `200` with the saved memory. Never print the secret. Keyless mode is BM25 only (vectors disabled), so **write each memory with literal keywords in `content` and `concepts`** (profile, ADHD, PFSA, non-negotiables, model-routing, D6, D10, the-next-klopp) and verify with keyword queries, not paraphrases.
- **What to store (each entry short, a few hundred words at most, tagged `the-next-klopp`):** (1) learner profile (brief section 1) with section 16 corrections (PFSA Intro + Level 1 only, rusty; local data paths not given; project at `E:\To become new klop`); (2) non-negotiables (section 2); (3) communication rules (section 14); (4) model routing summary (section 5); (5) decisions D6 (study 4173 / dev 5173) and D10 (path with spaces kept). **Do not store:** research output, source lists, the brief verbatim. Query `project`-scoped if a project field exists (the existing store tags `"project": "mehdaf-model"`); if not, the `the-next-klopp` concept tag is the isolation `[ASSUMED]`.
- Verification (SETUP-05, success criterion 4): two searches return the profile entry and the rules entry; `memory_profile`/stats (or REST list) shows no entry over a few KB and none containing research dumps. Record the output summary (not the secret) in SETUP.md.

## Model routing (SETUP-02)

`model_profile: balanced` today. Per-tier check with `resolve-model --pick tier`: planner `opus`, executor `sonnet`, phase-researcher `sonnet`, research-synthesizer `sonnet`, ui-researcher `sonnet`, codebase-mapper `haiku`, verifier `sonnet` `[VERIFIED: ran in the real project]`. Valid override values: `opus`, `sonnet`, `haiku`, `fable`, `inherit`, or a full model ID; `config-set` accepts `model_overrides.<agent>` and `models.<phase_type>` (`planning|discuss|research|execution|verification|completion`, tier values only) `[VERIFIED: ran in a scratch project; CITED: GSD docs/CONFIGURATION.md "Per-Agent Overrides", "Per-Phase-Type Models"]`. Resolution precedence: `model_overrides` > `model_policy` > `dynamic_routing` > `models` > `model_profile`.

Recommended deltas to match brief section 5 (Opus for architecture, curriculum spine, DESIGN.md):
```bash
gsd-tools query config-set model_overrides.gsd-research-synthesizer opus   # curriculum spine / concept-map synthesis (Phase 2)
gsd-tools query config-set model_overrides.gsd-ui-researcher opus          # DESIGN.md / UI-SPEC (Phase 4)
gsd-tools query config-set model_overrides.gsd-roadmapper opus             # roadmap = curriculum structure
```
Everything else stays as `balanced` already yields (executor/researcher/verifier/checkers Sonnet, mapper Haiku). **Never** set `fable` in config (escalation is manual per the protocol; Fable is never run in parallel waves). `resolve_model_ids: "omit"` means GSD passes tier aliases and Claude Code maps them; that `opus` resolves to Opus 5.5 is `[ASSUMED]` (A5). Brief section 5 roles that are not GSD agents (Haiku link checking, tagging, glossary, quiz variants; Sonnet lesson writers; Opus fact-verifier) are future custom sub-agents: record in SETUP.md that each must set `model:` in its own `.claude/agents/*.md` frontmatter when created (brief: "set the model in each sub-agent definition").

SETUP.md routing table (use the brief verbatim as the source): Fable 5.2 (medium effort, rare escalation only) / Opus 5.5 / Sonnet 5.5 / Haiku 5.5 with the GSD agent mapping above. `docs/FABLE_LOG.md`: the four steps (1 Opus tries first and output saved; 2 an Opus reviewer writes why it is not good enough, one paragraph, in this file; 3 scope one clear question with summaries not raw dumps; 4 Fable at medium effort, result + one-line "was it worth it?" verdict), cap 3 per milestone (over needs learner approval; if Fable's limit is hit fall back to Opus, mark "needs Fable later", never block), never parallel, never for code/lessons/design/tests/pipelines; empty table `| Date | Milestone | Question | Why Opus was not enough | Result | Worth it? |`.

## GitHub: repo, protection, secret scanning, CI

**Repo creation:** `gh repo create the-next-klopp --private --source . --push`; with no `OWNER/` prefix it defaults to the authenticated user (`ashayyan`) `[VERIFIED: gh repo create --help]`. `--push` pushes the current branch, so `main` must be checked out (Pattern 1). Token scopes today: `'gist', 'read:org', 'repo'` `[VERIFIED: gh auth status]`.

**`workflow` scope (blocking for the CI push):** pushing any `.github/workflows/*.yml` with an OAuth token lacking `workflow` fails with "refusing to allow an OAuth App to create or update workflow ... without `workflow` scope" `[CITED: dev.to and community reports; fix `gh auth refresh -s workflow` per gh docs]`. Human step (learner, browser): `gh auth refresh -h github.com -s workflow`. Put it as a `checkpoint:human-action` early in the plan, before the first push of a branch containing `ci.yml`.

**Branch protection / rulesets on a private repo, Free personal account:** GitHub's docs source: "Protected branches are available in public repositories with GitHub Free and GitHub Free for organizations. Protected branches are also available in public and private repositories with GitHub Pro, GitHub Team, GitHub Enterprise Cloud, and GitHub Enterprise Server." `[VERIFIED: github/docs repo data/reusables/gated-features/protected-branches.md]`. Rulesets: "A ruleset is a named list of rules ... for customers on GitHub Team and GitHub Enterprise plans." `[VERIFIED: github/docs about-rulesets.md]` (the rendered docs and search summaries say Free covers public repos only, Pro adds private). The learner's plan is not discoverable (`gh api user` returned `plan: null`). **Expected outcome for a Free account: HTTP 403 on the protection API.** Plan: try the PUT; on 403 or "not enforced" warning, write the refusal (status code + message) to `docs/SETUP.md` and `docs/decisions/0007-branch-protection.md`, keep `ci.yml`, install the pre-push hook, and add the protected-branch list to GSD (`git.protected_branches` is advisory warnings only). Do **not** make the repo public to get protection (private is required; the learner can instead upgrade the account, noted in ADR 0007 as an option). Also consider the second-best control: CI `guards` + a documented rule that merges go through `gh pr merge` only after CI is green.

**Secret scanning:** user-owned private repositories: "Available on GitHub Enterprise Cloud with Enterprise Managed Users" and not free `[CITED: docs.github.com about-secret-scanning]`. So push protection / secret scanning will not exist for this repo on Free; gitleaks + the local guard are the controls. Record in SETUP.md and the guard ADR note.

**gitleaks:** `gitleaks/gitleaks-action@v3` (v3.0.0, 2026-05-30, Node 24 runtime). Personal accounts need no licence: "If you are scanning repos that belong to a personal account, then no license key is required" `[VERIFIED: README read]`; the `GITLEAKS_LICENSE` secret is only for organizations. Needs `actions/checkout` with `fetch-depth: 0` and `GITHUB_TOKEN`. gitleaks CLI latest 8.30.1 (2026-03-21). Add `.gitleaks.toml` with `[extend] useDefault = true` and an `[allowlist]` for `.planning/research/.cache/` if it ever false-positives (those cache JSON files are committed).

**Actions versions (latest releases read 2026-11-27):** `actions/checkout@v7` (7.0.1), `actions/setup-node@v7` (7.1.0), `actions/upload-artifact@v7` (7.0.2). `windows-latest` = Windows Server 2025 (`windows-2025`; the `-latest` label migrates gradually) `[CITED: actions/runner-images README]`; its image has Node 22.23.5 and Git 2.56.1, so `setup-node` with `node-version: 24` is mandatory (engines `>=24`). Free personal accounts get "$12 USD of included compute usage per month" for Actions `[CITED: docs.github.com githubs-plans]`; Windows runners cost more per minute, so keep the Windows job to the smoke only and add `concurrency` cancel-in-progress.

**Path with spaces on the runner:** `actions/checkout` input `path` is "Relative path under $GITHUB_WORKSPACE" `[CITED: checkout README]`, so `path: "klopp checkout"` creates a spaced directory; then set `defaults.run.working-directory` and `cache-dependency-path` to it. Use `shell: pwsh` explicitly. Windows checkout defaults to CRLF unless `.gitattributes` forces LF (this machine has `core.autocrlf=true`), so `.gitattributes` with `* text=auto eol=lf` is required for Biome to pass on Windows `[VERIFIED: `git config --get core.autocrlf` = true]`.

**Starting preview and fetching on Windows:** do it in Node, not PowerShell job control (`scripts/smoke.ts`, verified below): it spawns `node node_modules/vite/bin/vite.js preview --port 4173 --strictPort --host localhost`, polls `http://localhost:4173/` with `fetch` for 30 s, asserts `id="root"` and that `/dev` returns 200 (SPA fallback works in preview), then `taskkill /T /F`. Use `localhost`, not `127.0.0.1`: Vite binds `[::1]:5173` on this machine `[VERIFIED: netstat]`. A PowerShell-only fallback is `Start-Process -FilePath node -ArgumentList ... -PassThru` + `Invoke-WebRequest` loop + `Stop-Process -Id $p.Id` (not tested; prefer the Node script).

## Code Examples

### `ci.yml` (jobs named exactly as the required-check contexts; unrun on GitHub, every step command was run locally)
```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
env:
  HUSKY: "0"
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx biome ci .
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx vitest run
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx vite build
  guards:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v7
        with: { node-version: 24 }
      - run: node scripts/guard-files.ts --tracked
      - uses: gitleaks/gitleaks-action@v3
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  windows-smoke:
    runs-on: windows-latest
    defaults:
      run:
        shell: pwsh
        working-directory: klopp checkout
    steps:
      - uses: actions/checkout@v7
        with: { path: klopp checkout }
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: klopp checkout/package-lock.json
      - run: npm ci
      - run: npm run build
      - run: node scripts/smoke.ts
```
Notes: job `name` defaults to the job key, and required-check contexts must match job names; the PR-from-same-repo trigger is `pull_request` (no `pull_request_target`). `npm ci` runs on both OSes, which proves the lockfile carries the Linux and Windows optional native packages (it does: the scratch `package-lock.json` contained `@typescript/typescript-linux-x64`, `@biomejs/cli-linux-x64`, rolldown/oxide/lightningcss linux-gnu entries `[VERIFIED: grep]`).

### `scripts/smoke.ts` (verified on Windows, path with spaces, 2.2 s, port freed afterwards)
```ts
import { spawn } from "node:child_process";
import { join } from "node:path";

const port = Number(process.env.SMOKE_PORT ?? 4173);
const vite = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [vite, "preview", "--port", String(port), "--strictPort", "--host", "localhost"], { stdio: ["ignore", "inherit", "inherit"] });
let exited: number | null = null;
child.on("exit", (c) => { exited = c ?? 1; });

async function waitFor(url: string, ms: number): Promise<Response> {
  const end = Date.now() + ms;
  let last = "no response";
  while (Date.now() < end) {
    if (exited !== null) throw new Error(`vite preview exited early (${exited}); port ${port} busy?`);
    try { const r = await fetch(url); if (r.ok) return r; last = `HTTP ${r.status}`; } catch (e) { last = String(e); }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`timeout waiting for ${url}: ${last}`);
}
try {
  const res = await waitFor(`http://localhost:${port}/`, 30_000);
  if (!(await res.text()).includes('id="root"')) throw new Error("home page missing #root");
  const dev = await fetch(`http://localhost:${port}/dev`);
  if (!dev.ok) throw new Error(`/dev returned ${dev.status}`);
  console.log(`smoke ok: http://localhost:${port}/ and /dev`);
} catch (e) {
  console.error(`smoke FAILED: ${e instanceof Error ? e.message : e}`);
  process.exitCode = 1;
} finally {
  if (exited === null) {
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill();
  }
}
```

### `vite.config.ts`, `tsconfig.json` essentials, package scripts
```ts
// vite.config.ts  [VERIFIED: built and served]
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, host: "localhost" },
  preview: { port: 4173, strictPort: true, host: "localhost" },
});
```
```jsonc
// tsconfig.json compilerOptions [VERIFIED: tsc 7.0.2 exit 0]
{ "target":"ES2023","lib":["ES2023","DOM","DOM.Iterable"],"module":"ESNext","moduleResolution":"bundler","jsx":"react-jsx",
  "strict":true,"noEmit":true,"skipLibCheck":true,"verbatimModuleSyntax":true,"isolatedModules":true,"noUncheckedIndexedAccess":true,
  "resolveJsonModule":true,"allowImportingTsExtensions":true,"erasableSyntaxOnly":true,
  "types":["vite/client","node"] }
```
```jsonc
// package.json scripts [VERIFIED: dev, study, smoke, build, preview all ran]
"dev": "vite",
"study": "vite build && vite preview",
"build": "vite build",
"preview": "vite preview",
"typecheck": "tsc --noEmit",
"lint": "biome check .",
"test": "vitest run",
"guard": "node scripts/guard-files.ts --tracked",
"validate:schemas": "vitest run schemas",
"smoke": "node scripts/smoke.ts",
"prepare": "husky"
```
`&&` in the `study` script works because npm runs scripts through `cmd.exe` on Windows and `sh` elsewhere; it is the only chain used (verified `npm run study` served 200 on 4173). Add `"engines": {"node": ">=24"}` and `.nvmrc` containing `24`. Biome: start from `npx biome init` output (`linter.rules.preset: "recommended"`, `vcs.useIgnoreFile: true`, `files.includes: ["**", "!!**/dist"]`) and add `!!.claude`, `!!.planning` (planning JSON cache) if Biome flags them.

### Husky (verified in a path with spaces on Windows)
`npx husky init` then `.husky/pre-commit`:
```sh
node scripts/guard-files.ts --staged
npx lint-staged
```
`.lintstagedrc.json`: `{ "*.{ts,tsx,js,json,css}": ["biome check --write --no-errors-on-unmatched"] }`. Verified: staging `raw/x.txt` and a file containing `AKIAIOSFODNN7EXAMPLE` printed `guard: secret:aws-access-key: leak.ts`, `guard: denied-path: raw/x.txt`, then `husky - pre-commit script failed (code 1)`; commit aborted.
`.husky/pre-push` (blocks direct pushes to `main`; verified blocked and allowed with override):
```sh
while read -r local_ref local_sha remote_ref remote_sha; do
  if [ "$remote_ref" = "refs/heads/main" ] && [ -z "$ALLOW_MAIN_PUSH" ]; then
    echo "pre-push: direct push to main is blocked. Push a gsd/phase-* branch and open a PR. Override once: ALLOW_MAIN_PUSH=1" >&2
    exit 1
  fi
done
```

### Branch protection commands (for a plan where the account allows it; expect 403 on Free)
```bash
gh api -X PUT repos/ashayyan/the-next-klopp/branches/main/protection --input .github/branch-protection.json
```
```json
{
  "required_status_checks": { "strict": true, "contexts": ["lint","typecheck","test","build","guards","windows-smoke"] },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```
All four top-level keys are required (each may be `null`); `contexts` is flagged for closing down in favour of `checks` (`[{"context":"lint"}...]`, `app_id` optional) `[CITED: docs.github.com REST update-branch-protection]`. `approving_review_count: 0` is deliberate: a solo owner cannot approve their own PR. Ruleset alternative (same plan limits):
```bash
gh api -X POST repos/ashayyan/the-next-klopp/rulesets --input .github/ruleset-main.json
```
```json
{
  "name": "protect-main", "target": "branch", "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" }, { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": { "required_approving_review_count": 0, "dismiss_stale_reviews_on_push": false, "require_code_owner_review": false, "require_last_push_approval": false, "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": { "strict_required_status_checks_policy": true, "required_status_checks": [ {"context":"lint"},{"context":"typecheck"},{"context":"test"},{"context":"build"},{"context":"guards"},{"context":"windows-smoke"} ] } }
  ]
}
```
`[CITED: docs.github.com REST rulesets; minimal example returns 201]`. After success verify with `gh api repos/ashayyan/the-next-klopp/branches/main/protection --jq '.required_status_checks.contexts'`. Do not commit these JSON files if they would confuse later; they are fine to keep under `docs/` or `.github/`.

### JSON Schema 2020-12 (ajv strict) pattern: conditional required must declare the property in `then`
```json
"if":   { "properties": { "status": { "const": "removed" } }, "required": ["status"] },
"then": { "required": ["removed_reason"], "properties": { "removed_reason": { "type": "string", "minLength": 1 } } }
```
Without the `properties` entry inside `then`, ajv with `strict: true` throws `strict mode: required property "removed_reason" is not defined at ".../source.schema.json#/then" (strictRequired)` `[VERIFIED: ran]`. Zod mirror: `.refine(s => s.status !== "removed" || !!s.removed_reason, { path:["removed_reason"] })` (Zod's `toJSONSchema` ignores refinements, which is why hand-written mirrors plus the dual test are required).

### Measured ajv vs Zod format disagreements (design the schemas around these)
| Input | `format` (ajv-formats) | Zod 4 | Rule |
|-------|------------------------|-------|------|
| `date` `2026-02-30`, `2026-1-5` | reject | reject (`z.iso.date()`) | safe to share: `format: date` + `z.iso.date()` |
| date-time `...T10:00:00+03:00` | accept | reject (default), accept with `{offset:true}` | use UTC `Z` only: JSON `pattern` `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$` and `z.iso.datetime()` |
| date-time `2026-11-27 10:00:00Z` (space) | accept | reject | same pattern fixes it |
| uri `https://example.com/a b` | reject | accept (`z.url()`) | use `pattern ^https?://[^\s]+$` in both |
| uri `http://` | accept | reject | same pattern fixes it |
`[VERIFIED: ran edge.mjs in the scratch project]`.

## Common Pitfalls

### Pitfall 1: Executor halts on the default branch / no origin yet
**What goes wrong:** `FATAL: refusing to commit — HEAD is on 'master' (protected/default branch).` or `ERROR: fetch origin/main failed` when strategy is `phase` before the repo exists. **Avoid:** Pattern 1 ordering. **Warning sign:** the first executor wave reports the FATAL line.

### Pitfall 2: Protection and secret scanning unavailable on a Free private repo
**What goes wrong:** the PUT returns 403 (or rules silently do not enforce) and the plan's task fails the phase. **Avoid:** treat as an expected branch of the task: attempt, capture status + body, write ADR 0007 + SETUP.md, ensure the pre-push hook and the CI workflow exist; success criterion 3's "protected main" is then satisfied by the documented fallback per CONTEXT. Confirm the plan to the learner at the end-of-phase digest (upgrade to Pro is the option). **Warning sign:** `gh api ... protection` GET returns 404 "Branch not protected" after a "successful" PUT.

### Pitfall 3: `workflow` scope missing
Push of `ci.yml` rejected. **Avoid:** early human checkpoint `gh auth refresh -h github.com -s workflow`; re-run `gh auth status` and confirm `workflow` appears in Token scopes.

### Pitfall 4: ajv strict mode and conditional `required`
Covered above (verified error). Also `strict: true` rejects unknown keywords: keep custom metadata in `$comment`, not `x-*` keys, or set `ajv.addKeyword`.

### Pitfall 5: TypeScript 7 defaults
Without `types: ["vite/client", ...]`, `tsc` fails with `src/main.tsx(4,8): error TS2882: Cannot find module or type declarations for side-effect import of './index.css'.` `[VERIFIED: ran]`. Keep `"types": ["vite/client","node"]`. TS 7 does not expose the TS compiler API, so do not add typescript-eslint or MDX TS plugins (STACK.md section 6).

### Pitfall 6: npm 11.19 install-scripts gate
`npm install` printed `1 package has install scripts not yet covered by allowScripts: esbuild@0.28.2 (postinstall: node install.js)`; `npm install-scripts deny esbuild` wrote `"allowScripts": {"esbuild": false}` to `package.json` and silenced it; tsx and Vite still work `[VERIFIED: ran]`. Commit the `allowScripts` block. Re-run `npm install-scripts ls` after each dependency change; a future package that genuinely needs a postinstall (Playwright browsers in Phase 5) must be approved explicitly. Older npm in CI ignores the unknown key.

### Pitfall 7: Fake secret in the test file trips the guard/gitleaks
Construct at runtime (Pattern 2). Also allow `schemas/fixtures/*.invalid.json` to contain malformed-but-harmless values only.

### Pitfall 8: Biome and CRLF
`core.autocrlf=true` here plus Windows runner defaults produce CRLF; `.gitattributes` `* text=auto eol=lf` keeps the index and working tree LF. All 19 currently tracked files are `i/lf w/lf` `[VERIFIED: git ls-files --eol]`. After adding `.gitattributes` run `git add --renormalize .` once.

### Pitfall 9: Duplicate or stale ports
`strictPort: true` means a second `npm run dev` exits non-zero; Vite 8.4 adds a command lock with an explicit message `[VERIFIED]`. On Windows the listener is `[::1]:5173`; always address it as `localhost`. Document: stop servers with `Ctrl+C`; if orphaned, `netstat -ano | findstr :5173` then `taskkill /PID <pid> /T /F`.

### Pitfall 10: Skills installed without `--copy` or into the wrong scope
Default `skills add` can symlink; GSD then rejects symlinked `global:` skills or lists them oddly. Always `-a claude-code --copy -y` and no `-g`. `--all` installs everything everywhere; never use it.

### Pitfall 11: `THE_NEXT_KLOPP_MASTER_PROMPT 1.md` committed by `git add -A`
It is untracked and must never be committed; add `THE_NEXT_KLOPP_MASTER_PROMPT*.md` to `.gitignore` (executors using `git add -A` would otherwise stage it).

### Pitfall 12: uv self-update
`uv self update` fails here (`Self-update is only available for uv binaries installed via the standalone installation scripts`): uv 0.12.5 was installed with pip. It is sufficient for the stub (`uv sync` + `uv run` verified in a spaced path, Python 3.12.14 resolved). Record in SETUP.md; upgrade with `pip install --upgrade uv` if wanted.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tsx` for every Node TS script | `node file.ts` (native type stripping, Node 24) | Node 22.18+/23.6+ unflagged | faster hooks, fewer deps; erasable syntax only |
| ESLint + Prettier | Biome 2 (`biome ci`) | STACK.md decision | one tool, no TS compiler API needed under TS 7 |
| gitleaks-action v2 | v3 (Node 24 runtime) | v2 stops working 2026-09-16 | use `@v3` and `actions/checkout@v7` |
| `npm install` runs all postinstalls | npm 11.19 `allowScripts` approval gate | npm 11.x | approve/deny explicitly; commit the block |
| Skills as plugin marketplace entries | `skills` CLI + `skills-lock.json`; `gh skill install` | 2026 | pinned, copyable, restorable |
| Classic protection only | Rulesets (same plan limits) | GitHub 2023+ | no gain for Free private repos |

**Deprecated:** `contexts` in the protection API (closing-down notice, prefer `checks`); gitleaks-action v2; `react-router-dom` (import from `react-router`); K-Dense `scientific-skills/` path (moved to `skills/` in v2.43.0).

## Runtime State Inventory

Not a rename/refactor/migration phase: omitted.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The learner's GitHub account is on the Free plan, so the protection API will return 403 for a private repo (`gh api user` returns `plan: null`; docs say Pro+ required) | GitHub | If Pro, protection succeeds and the pre-push fallback is just extra; low risk either way (plan tries the API first) |
| A2 | `DISABLE_TELEMETRY=1` stops the `skills` CLI install telemetry | Skill install | Telemetry event (install metadata) may still be sent; low impact, public repos only |
| A3 | agentmemory MCP tools in this session are named per its README (`memory_save`, `memory_recall`, `memory_smart_search`), not the orchestrator's `memory_store/search/context/stats` | agentmemory | Executor must discover tool names at runtime; REST fallback documented |
| A4 | A skill installed mid-session may not appear in the live Skill list until Claude Code restarts | Skill install | The "load a skill" check moves to a fresh session / end-of-phase human verify |
| A5 | GSD tier alias `opus`/`sonnet`/`haiku` maps to Opus 5.5 / Sonnet 5.5 / Haiku 5.5 under `resolve_model_ids: "omit"` | Model routing | Routing log could name the wrong generation; confirm with `/model` or an agent spawn report |
| A6 | agentmemory memories are isolated per project by a `project` field or concept tag | agentmemory | Profile entries visible from the learner's other project; low harm, but tag `the-next-klopp` anyway |
| A7 | `gh pr merge` server-side merge is not affected by the local pre-push hook | Pattern 1 | Hook would block merging; it does not run for server-side merges |
| A8 | The `ci.yml` above is correct on GitHub (each command was run locally; the YAML itself was not executed) | Code Examples | First CI run may need small fixes; Phase 1 plan must include "watch CI to green" |
| A9 | The pre-existing commits (brief with learner profile) are acceptable to push to a private repo | Pattern 1 | Personal profile data leaves the machine; brief section 13 and CONTEXT authorise the push, flagged for transparency |

## Open Questions (RESOLVED)

Note 2026-11-27: the learner granted the gh `workflow` scope before execution (verified with `gh auth status`). Script runner: plans use native Node 24 type stripping (`node file.ts`) instead of `tsx`; record this deviation from CLAUDE.md in docs/SETUP.md.

1. **RESOLVED (Plan 01-09 + ADR 0007): Which plan is the learner's GitHub account on?** Unknown (`plan: null`). Recommendation: the plan attempts the protection call and records the result; no learner question needed unless it is 403, then the end-of-phase digest tells the learner "protection needs GitHub Pro; fallback active".
2. **RESOLVED (Plan 01-07, yes): Should `.claude/skills/` stay gitignored long-term?** Recommendation: yes (39 MB images from taste-skill). Cost: a fresh clone must run `npx skills experimental_install -a claude-code` and delete the duplicate `.agents/skills/`. Put the exact commands in SETUP.md.
3. **RESOLVED (no action for Phase 1; work stays on the phase branch): Does GSD's executor guard also trip on `main` after rename for orchestrator commits (`commit_docs`)?** `gsd-tools query commit` for `.planning` docs commits on the current branch; during Phase 1 that is the phase branch, so fine. For doc-only commits made while on `main` (e.g. after merge), set `git.allow_default_branch_commits` only if a later flow needs it; not for Phase 1.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | everything | yes | 24.21.0 | none needed |
| npm | install | yes | 11.19.0 (has `install-scripts`) | none |
| git | repo | yes | 2.53.0.windows.2 (`core.autocrlf=true`, `core.longpaths` unset) | set `git config core.longpaths true` |
| gh | repo, API | yes | 2.102.0, logged in as `ashayyan` | none; **missing `workflow` scope** (learner must run `gh auth refresh -s workflow`) |
| uv / Python | pipeline stub | yes | uv 0.12.5, Python 3.12.10 (uv resolved 3.12.14) | `pip install --upgrade uv` |
| gitleaks CLI | optional local scan | no | - | CI action + local regex guard |
| agentmemory server | SETUP-05 | yes (running) | 0.9.33, `livez` ok | start with `npx -y @agentmemory/agentmemory@latest` |
| agentmemory MCP for this project | SETUP-05 | no (only wired for Mehdaf) | - | `claude mcp add ...` or REST |
| K-Dense skills | SETUP-01 | no (not installed) | v2.72.0 available | `gh skill install` option |
| Chrome / Edge | taste-skill checker | yes | both present | - |
| `skills` CLI | skill installs | yes via npx | 1.9.1 | `gh skill` |

**Missing dependencies with no fallback:** learner-side `workflow` scope refresh (human action).
**Missing with fallback:** gitleaks CLI, agentmemory MCP wiring, K-Dense install.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.1.2 (+ ajv 8.20 / zod 4.6.7 inside tests) |
| Config file | `vitest.config.ts` (create in Wave 0: `include` `src/**/*.test.ts`, `scripts/**/*.test.ts`, `schemas/**/*.test.ts`, `environment: "node"`) |
| Quick run command | `npx vitest run` (0.5 s measured) |
| Full suite command | `npm run lint && npm run typecheck && npm test && npm run build && npm run smoke` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETUP-01 | skills present, offer-k-dense-web absent, locks pinned | script | `node scripts/verify-setup.ts skills` (checks `skills-lock.json` entries, `skill-manifest` names, no `offer-k-dense-web`/`autoskill`) | Wave 0 |
| SETUP-01 | docs/SETUP.md has a row per tool with version + verification | script | `node scripts/verify-setup.ts docs` | Wave 0 |
| SETUP-02 | model overrides resolve; FABLE_LOG has protocol + cap | script | `node scripts/verify-setup.ts routing` (runs `gsd-tools query resolve-model` for planner/ui-researcher/synthesizer; greps FABLE_LOG for "3 per milestone" and 4 steps) | Wave 0 |
| SETUP-03 | CI workflow valid, jobs named as required checks; remote repo private; protection result recorded | script + manual | `gh repo view the-next-klopp --json visibility,defaultBranchRef`; `gh api repos/ashayyan/the-next-klopp/branches/main/protection` (200 or recorded 403/404); `gh run list` shows all six jobs green on the PR | manual-ish (CI) |
| SETUP-04 | guard rejects raw path, oversized file, fake secret | unit | `npx vitest run scripts/guard.test.ts` | Wave 0 |
| SETUP-04 | real hook blocks a staged bad file | integration | `node scripts/verify-setup.ts hook` (temp worktree/branch: stage `raw/x.txt`, expect non-zero from `git commit`; then reset) | Wave 0 |
| SETUP-04 | `.gitignore`/`.gitattributes`/`.env.example` present and correct | unit | `npx vitest run scripts/repo-files.test.ts` (asserts patterns, `eol=lf`, `.env.example` has keys with no values) | Wave 0 |
| SETUP-05 | profile + rules retrievable, no research dump | manual/script | agentmemory `memory_smart_search "learner profile ADHD PFSA"` and `"non-negotiables"` (or REST `smart-search`); check entry sizes | manual (record output in SETUP.md) |
| SETUP-06 | seven ADRs exist with Status/Context/Decision/Consequences/Alternatives | unit | `npx vitest run scripts/adr.test.ts` | Wave 0 |
| SETUP-07 | every valid fixture passes ajv + zod, every invalid fails both | unit | `npx vitest run schemas` | Wave 0 |
| PLAT-01 | dev on 5173 and study on 4173 respond; second dev fails | integration | `npm run smoke` (preview 4173, `/` and `/dev`); plus manual `npm run dev` + `curl http://localhost:5173/` | smoke Wave 0 |
| PLAT-01 | clean clone builds on Windows incl. a path with spaces | CI | `windows-smoke` job | CI |

### Sampling Rate
- **Per task commit:** `npx vitest run` + `node scripts/guard-files.ts --staged` (hook does the latter).
- **Per wave merge:** full suite command above.
- **Phase gate:** full suite green locally, all six CI jobs green on the PR, `verify-setup` all sections pass, human end-of-phase checks (new-session skill load, protection outcome, agentmemory round trip).

### Wave 0 Gaps
- [ ] `vitest.config.ts`, `scripts/lib/guard.ts`, `scripts/guard.test.ts`, `scripts/repo-files.test.ts`, `scripts/adr.test.ts`
- [ ] `schemas/schemas.test.ts` + fixtures for source, concept, competency, role (each with `*.valid*.json` and `*.invalid*.json`, include a boundary fixture per measured format disagreement)
- [ ] `scripts/verify-setup.ts` (SETUP-01/02/04 checks) and `scripts/smoke.ts`
- [ ] Framework install: `npm install` per Standard Stack

## Security Domain

`security_enforcement` is enabled (absent = enabled; config has `security_enforcement: true`, `security_asvs_level: 1`).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture | yes | ADRs; guard + CI as defence in depth; no server in the app |
| V2/V3 Authentication/Session | no (no accounts) | n/a; `gh`/Vercel logins are the learner's, never handled by Claude |
| V4 Access Control | yes (repo) | branch protection or documented fallback; least-privilege workflow `permissions: contents: read` |
| V5 Input Validation | yes | ajv + zod on schema documents (strict, `additionalProperties:false`) |
| V6 Cryptography | no | none implemented; sha256 field is data only |
| V10/V14 Config & supply chain | yes | exact version pins, `package-lock.json`, `npm audit signatures`, npm `allowScripts`, skills pinned by commit + hash in `skills-lock.json` |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret committed (token, key, `.env`) | Information disclosure | `.gitignore` for `.env*` except `.env.example`; guard regex; gitleaks in CI (secret scanning unavailable on Free private repos) |
| Licensed/raw data or >5 MB file enters git history | Information disclosure / Repudiation | deny-path + size guard locally and in CI `--tracked`; `*.parquet` blocked outside `public/data/` |
| Malicious or promotional third-party skill (runs with full agent permissions, can carry hooks) | Tampering / Elevation | read `SKILL.md` before use; project-local, pinned commit+hash; install a curated K-Dense subset; the taste-skill Stop hook reviewed (no network calls found in `gate.mjs`); `autoskill`, `parallel-web`, `exa-search` not installed |
| Prompt injection from fetched skill/README text | Tampering | treat fetched content as data; do not execute install snippets from third-party SKILL.md files; installs only via the documented CLI commands |
| Compromised dependency/action | Tampering | pin exact npm versions, lockfile, `npm ci`; actions on major tags (first-party) and `gitleaks-action@v3`; optionally pin third-party actions by SHA |
| Workflow token over-privilege | Elevation | top-level `permissions: contents: read`; no `pull_request_target`; no secrets used (gitleaks needs only `GITHUB_TOKEN`) |
| Dev server reachable on the LAN | Information disclosure | `host: "localhost"` (not `0.0.0.0`) in `server` and `preview` |
| Direct push to `main` bypassing review | Tampering | protection if available; else pre-push hook + documented PR-only rule (bypassable with `--no-verify`, acknowledged) |
| agentmemory secret leakage | Information disclosure | read `~/.agentmemory/secret` into a shell variable only; never echo or store it in SETUP.md |

## Sources

### Primary (HIGH confidence)
- Local runs this session (Windows 11, Node 24.21.0, npm 11.19.0, gh 2.102.0, uv 0.12.5): scratch project in a path with spaces (build, tsc, biome, vitest, husky pre-commit/pre-push, smoke script, strictPort/command-lock, ajv/zod edge cases, uv sync); `npx skills add/experimental_install` in scratch dirs; `gsd-tools query agent-skills / skill-manifest / config-set / resolve-model / package-legitimacy check`.
- npm registry versions read 2026-11-27 (`npm view`).
- GSD Core docs/CONFIGURATION.md (open-gsd/gsd-core, v1.23.0): sections Model Profiles, Per-Agent Overrides, Per-Phase-Type Models, Agent Skills Injection, Git Branching; `gsd-core/workflows/execute-phase.md`, `agents/gsd-executor.md`, `references/agent-skills-bootstrap.md` (installed copies read).
- K-Dense-AI/scientific-agent-skills README, `gh api` skills listing (177 names), shallow clone grep (commit c21d13b...), release v2.72.0.
- rohitg00/agentmemory README and INSTALL_FOR_AGENTS.md (v0.9.33), `~/.claude.json` MCP entries, `~/.agentmemory/engine-state.json`.
- github/docs repo: `data/reusables/gated-features/protected-branches.md`, `about-rulesets.md`.
- gitleaks/gitleaks-action README (v3 usage, licence FAQ); actions/checkout, setup-node, runner-images READMEs.
- Installed skill files read: taste-skill `SKILL.md` frontmatter and `gate.mjs` grep, web-design-guidelines `SKILL.md`, ui-ux-pro-max `SKILL.md`.

### Secondary (MEDIUM confidence)
- docs.github.com REST pages for update-branch-protection and create-ruleset (fetched via summarising tool).
- docs.github.com about-secret-scanning and githubs-plans (summaries; Free personal "limited feature set", "$12 USD of included compute usage").
- Web search results for `offer-k-dense-web` (tessl.io, skills.sh mirrors) and the `workflow`-scope push error (dev.to, community threads).

### Tertiary (LOW confidence)
- None relied upon for a decision; items that rest on inference are in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, installed and exercised end to end.
- Architecture / bootstrap ordering: HIGH on GSD guard behaviour (source read), MEDIUM on the exact interplay at runtime (not executed against a real remote).
- GitHub protection outcome: MEDIUM (documented plan gating; account plan unknown).
- agentmemory tool names: MEDIUM (A3).
- Pitfalls: HIGH (most reproduced locally).

**Research date:** 2026-11-27
**Valid until:** 2026-12-04 for npm versions (fast-moving; several latest versions are days old), 2026-12-27 for process/docs findings.
