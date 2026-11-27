# Phase 1: Setup & Contracts - Context

**Gathered:** 2026-11-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the foundations every later phase builds on: a verified toolchain (GSD Core, agentmemory, K-Dense Scientific Agent Skills, design skills) recorded in `docs/SETUP.md`; model routing and the Fable escalation log; a private GitHub repo `the-next-klopp` with repo guards and CI (lint, typecheck, unit tests, build, Windows smoke job); a running Vite + React + TypeScript app skeleton on a fixed port started by one command; decision records in `docs/decisions/`; the learner profile and project rules stored in agentmemory; and shared JSON contract schemas (source, concept, competency, role) in `/schemas` with sample fixtures that validate. No lesson content, no design system, no pitch renderer, no pipeline code beyond an empty package stub.

Requirements: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06, SETUP-07, PLAT-01.

</domain>

<decisions>
## Implementation Decisions

The learner delegated every grey area to Claude for this autonomous run ("choose all recommended choices and close every grey area"). Each answer below is the recommended option.

### App framework and routing
- Vite 8 SPA (React 19, TypeScript 7 for `tsc --noEmit`, Biome 2 for lint/format), not Next.js — **Reversibility:** costly — every later component, route and build script depends on it; recorded as ADR 0001.
- React Router 8 in data-router library mode with `lazy` routes (not framework mode, not TanStack Router) — **Reversibility:** costly — lesson deep-link URLs are public contracts; recorded as ADR 0002.
- URL shape: `/learn/:trackId/:chapterId/:lessonId`, `/review`, `/whats-new`, `/dev/*` for dev-only routes (gallery, pitch). Phase 1 only implements `/` and a placeholder `/dev` route — **Reversibility:** one-way once lessons ship (frozen IDs, CONT-06).

### Local storage engine
- Dexie 4 on IndexedDB for progress, SRS, notes, feedback; JSON export/import as the sync path between origins — **Reversibility:** costly — persisted schema; recorded as ADR 0003. Phase 1 only records the decision; no Dexie code yet.

### Servers, ports and the study/dev split (D6)
- Two commands: `npm run dev` = Vite dev server on fixed port 5173 (`strictPort: true`) for agents and drafts; `npm run study` = production build + `vite preview` on fixed port 4173 (`strictPort: true`) that serves shipped content only. In Phase 1 `study` serves the same skeleton; the shipped-only content filter arrives with the content engine (Phase 5) — **Reversibility:** costly — IndexedDB is per-origin, so the learner's progress lives on `localhost:4173`; changing the port later strands data unless exported. Recorded as ADR 0005. The learner's one documented command for studying is `npm run study`; `npm run dev` is the one command for the skeleton/dev loop (PLAT-01 satisfied by both on fixed ports).

### Path with spaces (D10)
- Keep the project at `E:\To become new klop` (do not move it). Mitigate: quote every path, write file-op scripts in Node/tsx not shell, no `make`, no bash-only chains in `package.json`, and CI includes a Windows smoke job that checks out into a path containing spaces — **Reversibility:** reversible later (a move is a folder move + re-clone), but recorded as ADR 0006 because it shapes every script.

### Vercel scope (decision only, deploy is Phase 5)
- Deployment Protection scope "All Deployments" with Vercel Authentication (not Standard Protection, not paid Password Protection) — **Reversibility:** costly — wrong scope makes production public; recorded as ADR 0004. No Vercel action in Phase 1.

### GitHub repo, branches and CI
- Create the private repo with `gh repo create the-next-klopp --private --source . --push` from the learner's already-authenticated `gh` (account is logged in; Claude never handles passwords) — **Reversibility:** one-way (external, outward-facing; the learner authorised it in brief §13 and in this run's instructions).
- Rename local `master` to `main` before the first push; `main` is the default branch.
- Protect `main` via branch protection or a ruleset requiring the CI checks to pass and a PR. If GitHub refuses protection on a private repo for the account's plan, record the refusal in `docs/SETUP.md` and `docs/decisions/0007-branch-protection.md`, keep the CI workflow, and enforce locally with a pre-push hook that blocks direct pushes to `main` — **Reversibility:** costly.
- Branching: one branch per phase (`gsd/phase-{N}-{slug}`), merged to `main` through a PR after CI passes at the end of each phase; conventional commits; release tag per milestone (`v0.1-golden`, `v0.2-track1`).
- CI on GitHub Actions: `ci.yml` with jobs `lint` (Biome), `typecheck` (tsc), `test` (Vitest), `build` (vite build), `guards` (size/path/secret guard script + gitleaks), and `windows-smoke` (windows-latest, checkout into a path with spaces, `npm ci`, `npm run build`, start preview on 4173 and fetch `/`). Ubuntu for all jobs except the Windows smoke.

### Repo guards (SETUP-04)
- `.gitignore` covers `node_modules/`, `dist/`, `.env*` except `.env.example`, `pipeline/data/raw/`, `pipeline/.venv/`, `data/raw/`, `feedback/`, `public/pyodide/`, Playwright `test-results/` and `playwright-report/`, `*.parquet` outside `public/data/`, and any `raw/` folder.
- `.gitattributes`: `* text=auto eol=lf` plus binary markers for images/fonts/wasm.
- Size/path guard: a Node/tsx script `scripts/guard-files.ts` that fails on any staged or tracked file over 5 MB, any path under a raw/licensed-data folder, any file matching a deny list, and any content matching secret patterns; run as a pre-commit hook (husky + lint-staged) and in CI.
- Secret scanning: gitleaks in CI plus GitHub secret scanning/push protection if available for the plan; the local guard's regex secret check rejects a fake secret too.
- `.env.example` committed with documented placeholder keys (no values).
- The guard must be demonstrated: a Vitest test feeds the guard a fake raw-data path, an oversized file and a fake secret and asserts each is rejected.

### Toolchain install and verification (SETUP-01)
- Read each tool's current README before install and follow the README over the brief when they differ; note differences in `docs/SETUP.md`.
- GSD Core: already installed globally and working; record version. Do not reinstall.
- agentmemory: already installed as a Claude Code plugin with MCP tools available; record version and verification (a store + search round trip).
- K-Dense Scientific Agent Skills: install per its README (plugin marketplace preferred, else `~/.claude/skills/`); disable/remove `offer-k-dense-web` and any other promotional skill; verify one skill loads.
- Design skills: taste-skill v2 (`design-taste-frontend`) reinstalled project-locally under `.claude/skills/` (real files, not a symlink, so GSD's `agent_skills` check accepts it); Anthropic `frontend-design` (already present); Vercel `web-design-guidelines`; `ui-ux-pro-max`; a dataviz skill (the installed `dataviz` skill). Record source repo, version/commit and verification for each.
- If a third-party install needs network and fails, record the failure and the exact retry command in `docs/SETUP.md`; optional skills do not block the phase, but K-Dense and agentmemory are mandatory.

### Model routing and Fable log (SETUP-02)
- Keep GSD profile `balanced`; add per-agent model overrides in `.planning/config.json` only where GSD supports them (read GSD `docs/CONFIGURATION.md` first); record the brief §5 routing table in `docs/SETUP.md`.
- `docs/FABLE_LOG.md` holds the 4-step escalation protocol, the 3-per-milestone cap, and an empty log table.

### agentmemory content (SETUP-05)
- Store: learner profile (brief §1 + §16 corrections), project non-negotiables (§2), communication rules (§14), model routing summary, the D6/D10 decisions. Do not store raw research. Verify with a search that returns the profile and the rules.

### Shared contract schemas (SETUP-07)
- JSON Schema 2020-12 files in `/schemas`: `source.schema.json`, `concept.schema.json` (concept-map node + edges file), `competency.schema.json`, `role.schema.json`, plus Zod 4 mirrors in `src/schemas/`. Each has at least one valid and one invalid fixture in `schemas/fixtures/`; a Vitest test validates them (ajv for JSON Schema, and the Zod mirror agrees) — **Reversibility:** costly — research agents in Phase 2 write data against these schemas.
- Source schema fields: `id`, `title`, `url`, `type`, `publisher`, `free`, `license` object with `read`, `automated_access`, `redistribute`, `derivative` (each `yes|no|unknown|conditional` plus note), `quality` (1–5), `recency` (date), `as_of` (fetch date), `best_for`, `notes`, `status` (`active|removed|unverified`), optional `removed_reason`, optional `excerpts[]` (`id`, `locator`, `fetched_at`, `sha256` of the fetched passage, `paraphrase` ≤ 300 chars) so a verifier can check claims.
- Concept schema: `id` (kebab), `title`, `track`, `part`, `summary`, `prerequisites[]` (concept ids), `roles[]`, `competencies[]`, `sources[]` (source ids), `status`.
- Role schema: `id`, `title`, `summary`, `competencies[]` (with target level 1–4), `sources[]`. Competency schema: `id`, `title`, `domain`, `levels[]` (1–4 descriptors), `concepts[]`.

### Decided autonomously
- [Skeleton] Q: "Skeleton content?" → Selected: "A single plain home route with the project name and a link to /dev; no design styling beyond Tailwind base" — styling is replaced in Phase 4.
- [Tooling] Q: "Package manager?" → Selected: "npm with committed package-lock.json, .nvmrc = 24, engines node >=24" — swapping is local.
- [Tooling] Q: "Unit test runner?" → Selected: "Vitest 5" — local to dev deps.
- [Tooling] Q: "JSON Schema validator in tests?" → Selected: "ajv 8 with ajv-formats" — dev dependency only.
- [Layout] Q: "Folder layout?" → Selected: "src/ (app), schemas/ (JSON Schema + fixtures), scripts/ (tsx), docs/ (SETUP, FABLE_LOG, decisions), pipeline/ (empty uv package stub with pyproject.toml, Python 3.12), .github/workflows/" — moving folders is cheap now.
- [Docs] Q: "ADR format?" → Selected: "MADR-lite: docs/decisions/NNNN-title.md with Status, Context, Decision, Consequences, Alternatives" — format only.
- [CI] Q: "Node version in CI?" → Selected: "24 via actions/setup-node with npm cache" — workflow-local.
- [Hooks] Q: "Pre-commit mechanism?" → Selected: "husky 9 + lint-staged running Biome and the guard script" — removable.

### Claude's Discretion
- Exact Tailwind 4 setup and placeholder home copy.
- Exact wording of SETUP.md and ADRs.
- Whether Zod mirrors are generated from JSON Schema or hand-written (they must agree on the fixtures either way).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- None: the repo holds only `.planning/`, `.claude/CLAUDE.md`, `NEW_PROJECT_INPUT.md` and an untracked `THE_NEXT_KLOPP_MASTER_PROMPT 1.md` (an earlier copy of the brief; do not delete it and do not commit it).
- `.planning/research/STACK.md` holds verified versions for every package (read 2026-11-27); use them.

### Established Patterns
- Stack and conventions are fixed by `.claude/CLAUDE.md` (Technology Stack section) and `.planning/research/STACK.md`.

### Integration Points
- `package.json` scripts are the single entry point (`dev`, `study`, `build`, `preview`, `lint`, `typecheck`, `test`, `validate:schemas`, `guard`).
- `/schemas` is consumed by Phase 2 research agents and the Phase 5 validator.

</code_context>

<specifics>
## Specific Ideas

- Brief §13 command: `gh repo create the-next-klopp --private --source . --push`.
- Brief §4.3: disable `offer-k-dense-web`.
- PROJECT.md: the taste skill is a symlink into `~/.agents/skills` that GSD's agent_skills check rejects; reinstall it project-locally.
- FBref advanced stats lost Opta data on 2026-01-20: the source schema needs `status: removed` + `removed_reason` (used in Phase 2).

</specifics>

<deferred>
## Deferred Ideas

- Vercel project link and deploy — Phase 5.
- Dexie schema and export/import — Phase 6.
- Pipeline code (kloppy etc.) — Phase 3; Phase 1 only stubs `pipeline/pyproject.toml`.
- Visual baselines in CI — Phase 4.

</deferred>
