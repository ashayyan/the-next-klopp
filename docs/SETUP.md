# Setup record

Verified toolchain for The Next Klopp. Everything here was measured on 2026-11-27 on the learner's machine. Plans 02 and 07 installed the tools; this file records what is installed, how it was checked and how to restore it.

## Machine

| Item | Value |
|------|-------|
| OS | Windows 11 Pro 10.0.26200 |
| Project path | `E:\To become new klop` (contains spaces on purpose, see [ADR 0006](decisions/0006-path-with-spaces.md)) |
| Node | 24.21.0 |
| npm | 11.19.0 |
| git | 2.53.0.windows.2 (`core.autocrlf` = true, `core.longpaths` = true) |
| gh | 2.102.0 |
| uv | 0.12.5 (CLAUDE.md names 0.13.10; see Known issues) |
| Python | system 3.12.10; pipeline venv 3.12.14 (uv picks it from `pipeline/.python-version`) |
| Claude Code | 2.1.332 |

## Tools

| Tool | Version | Source | Install / restore | Verification | Notes |
|------|---------|--------|-------------------|--------------|-------|
| GSD Core | 1.23.0 | `@opengsd/gsd-core`, installed globally | Already installed, not reinstalled | `gsd-tools.cjs runtime-identity --raw` returned package `@opengsd/gsd-core`, version 1.23.0 | Model routing config in `.planning/config.json` |
| agentmemory | 0.9.33 | rohitg00/agentmemory (npm `@agentmemory/agentmemory`, `@agentmemory/mcp`) | Server runs on localhost:3111, viewer 3113; MCP wiring in the agentmemory section | `GET /agentmemory/livez` returns status ok; `node scripts/verify-setup.ts memory` does a live search round trip | System of record for learner profile and rules |
| K-Dense Scientific Agent Skills | 2.72.0 at c21d13b3cc28 | K-Dense-AI/scientific-agent-skills | `npx -y skills@1.9.1 experimental_install -a claude-code` (see Fresh clone) | 14 skills installed, pinned in `skills-lock.json`, checked by `node scripts/verify-setup.ts skills` | Skills: statistical-analysis, scikit-learn, statsmodels, matplotlib, scientific-visualization, literature-review, scientific-writing, peer-review, shap, experimental-design, exploratory-data-analysis, scientific-critical-thinking, citation-management, hypothesis-generation. Optional full catalog: `npx -y skills@1.9.1 add K-Dense-AI/scientific-agent-skills -a claude-code --copy -y` (177 skills, larger skill listing) |
| offer-k-dense-web | n/a | not present in upstream v2.72.0 | Never installed | Status: disabled. Absent from `gh api repos/K-Dense-AI/scientific-agent-skills/contents/skills`; `node scripts/verify-setup.ts skills` fails if it appears in `.claude/skills/` or the lock | Promotional skill. `autoskill`, `parallel-web`, `exa-search`, `get-available-resources` are upstream and deliberately not installed either (same forbidden list) |
| design-taste-frontend | 2.5.1 at 952435f63ace | Leonxlnx/taste-skill (taste-skill v2) | Project-local copy under `.claude/skills/` via `skills ... --copy` | Real folder (not a symlink), listed by `skill-manifest`, injected by GSD `agent_skills` without a path-check warning | A `Stop` hook gates builds only while `.taste-skill/build.json` exists; `.taste-skill/` is git-ignored. Needs Chrome or Edge, both installed |
| frontend-design | 1.1.1 | Anthropic, global skill at `~/.claude/skills/frontend-design` plus plugin `frontend-design@claude-plugins-official` | Already installed | SKILL.md present; resolves as `global:frontend-design` in `agent_skills` | Nothing to restore per project |
| web-design-guidelines | 1.1.0 at 5a37a6329fba | vercel-labs/agent-skills | Project-local copy via `skills ... --copy` (one skill from the repo) | Locked in `skills-lock.json`; rules bundled locally, SKILL.md says not to fetch from the network | |
| ui-ux-pro-max | 11ca2b3bdd55 | nextlevelbuilder/ui-ux-pro-max-skill | Project-local copy via `skills ... --copy` | Locked in `skills-lock.json`; scripts grep found only Google Fonts URLs and a schema URL string | Needs Python 3 for its search script (stdlib only). SKILL.md states no version, so the commit is the version |
| dataviz | built-in | Built-in session skill | None; invoke through the Skill tool | Present in the session skill list; not on disk | Executor prompts must name it explicitly |

## README vs brief

Where a tool's README disagreed with the brief, the README won. Differences:

- K-Dense has no plugin-marketplace route in its README. The README's `npx skills add` path is used. The brief said "plugin marketplace preferred"; that option does not exist.
- `offer-k-dense-web` no longer exists upstream (v2.72.0), so nothing needed disabling. It stays in the forbidden list as a guard.
- K-Dense `docx`, `pdf`, `pptx`, `xlsx` are no longer bundled (README note).
- Both K-Dense README routes install all 177 skills. We install a curated 14 to keep the skill listing short.
- taste-skill README also offers `/plugin install` and a symlink `install.sh`. Not used: it was installed with `--copy` so GSD's symlink-escape path check accepts it.
- vercel-labs/agent-skills README installs the whole repo; `--skill web-design-guidelines` takes one skill.
- ui-ux-pro-max README also offers `/plugin install`, `gh skill install` and an npm `uipro` CLI. Not used, same reason.
- The agentmemory README names tools `memory_save`, `memory_recall`, `memory_smart_search`. Earlier prompts listed `memory_store`, `memory_search`; those names are not in the agentmemory sources.
- The agentmemory README installs 12 capture hooks with `connect claude-code --with-hooks`. Not used (see agentmemory section).

## Fresh clone

Run from the repo root on a new machine:

```bash
npm ci
npx -y skills@1.9.1 experimental_install -a claude-code
# the install stages a duplicate .agents/skills/ folder: delete it
uv sync --project pipeline
node scripts/verify-setup.ts all
```

Third-party skills are git-ignored copies restored from `skills-lock.json`; they are never committed.

## Model routing

Brief section 5, paraphrased. Which model for which job:

| Model | Use it for |
|-------|------------|
| Fable 5.2 (`claude-fable-5-2`), medium effort | Rare escalation, high-level research only. Never a default. Run by hand through the protocol in [docs/FABLE_LOG.md](FABLE_LOG.md); at most 3 Fable tasks per milestone unless the learner approves more |
| Opus 5.5 (`claude-opus-5-5`) | Architecture, curriculum spine and dependency graph, DESIGN.md, complex interactive components, final fact verification of hard topics, cross-track reviews, resolving source conflicts |
| Sonnet 5.5 (`claude-sonnet-5-5`) | Research sub-agents, writing lessons, most components and pages, Python pipelines, tests, first-pass fact checks, screenshot design reviews |
| Haiku 5.5 (`claude-haiku-5-5`) | Link checking, source tagging, glossary entries, quiz and flashcard variants, metadata, formatting, single-source summaries, housekeeping |

GSD mapping, set in `.planning/config.json`:

- `model_profile` stays `balanced`.
- `model_overrides` route `gsd-research-synthesizer`, `gsd-ui-researcher` and `gsd-roadmapper` to `opus`.
- Nothing routes to Fable. `node scripts/verify-setup.ts routing` checks that.

Resolved tiers (`resolve-model <agent> --pick tier`):

| Agent | Tier |
|-------|------|
| gsd-planner | opus |
| gsd-research-synthesizer | opus |
| gsd-ui-researcher | opus |
| gsd-roadmapper | opus |
| gsd-executor | sonnet |
| gsd-phase-researcher | sonnet |
| gsd-verifier | sonnet |
| gsd-codebase-mapper | haiku |

`resolve_model_ids: "omit"` makes GSD pass the tier aliases; Claude Code maps them to Opus 5.5, Sonnet 5.5 and Haiku 5.5. That mapping is assumed; confirm it with `/model` at the end-of-phase check.

The brief's non-GSD roles (Haiku link checker and tagger, Sonnet lesson writers, Opus fact verifier) are not GSD agents. Each future sub-agent sets `model:` in its own `.claude/agents/*.md` frontmatter.

## Package legitimacy

Ten npm packages were flagged SUS by the legitimacy audit for one reason only: `too-new` (the latest version was published within days; the packages are years old with official repos and 28M+ downloads a week). They are `vite`, `@vitejs/plugin-react`, `react-router`, `@biomejs/biome`, `vitest`, `tailwindcss`, `@tailwindcss/vite`, `lint-staged`, `@types/react` and `@types/node`. No package was flagged as slop.

Mitigations in place:

- Exact pins in `package.json` (no `^` or `~`) and a committed `package-lock.json`.
- `npm audit signatures`: 81 packages audited, 81 verified registry signatures, 45 verified attestations. `npm install` reported 0 vulnerabilities.
- `allowScripts`: none written. `npm install-scripts ls` reported no packages with unreviewed install scripts.
- CI runs `npm ci`, `npm audit signatures` and `npm audit --omit=dev --audit-level=high` on every PR.

Confirmation by the learner is batched into the end-of-phase human check, not asked per package.

## agentmemory

Two separate memory systems exist on this machine. Do not confuse them.

- rohitg00 agentmemory 0.9.33: server on localhost:3111, viewer on 3113, data under `%APPDATA%\agentmemory` and `~/.agentmemory`. This is the system of record for the learner profile and project rules.
- The inline `agent-memory` plugin: a separate store at `~/.claude/plugins/data/agent-memory-inline/memory.db`, skill `agent-memory:memory-search`.

MCP-only wiring for this project (no hooks, no auto-capture):

```bash
claude mcp add agentmemory --scope local -- npx -y @agentmemory/mcp@0.9.33
```

`--with-hooks` is not used. It installs 12 hooks that capture every session, which would fill memory with noise. Only five short, hand-written entries live in memory for this project, tagged `the-next-klopp`. Raw research never goes in.

The secret in `~/.agentmemory/secret` is read into a process variable only. It is never written to a file, a commit or chat.

### Verification (2026-11-27)

- Write path: REST (`POST /agentmemory/remember`, bearer auth read in-process). The MCP tools wired by the command above only appear in a new Claude Code session, so they were not available while writing. Each entry carries `project: the-next-klopp` and a `the-next-klopp` concept tag.
- Server: `GET /agentmemory/livez` returned status ok (viewer port 3113).
- Five entries stored, all paraphrased, none a research dump:

| Entry | Size (characters) |
|-------|-------------------|
| learner profile | 1320 |
| non-negotiables | 1078 |
| communication rules | 552 |
| model routing | 966 |
| decisions D6 D10 | 640 |

- Search is keyword BM25 (keyless mode). Compact search results carry ids and titles only, so `scripts/verify/memory.ts` reads the full content from `GET /agentmemory/memories?project=the-next-klopp` and matches by id.
- Query `the-next-klopp learner profile ADHD PFSA` returned the learner profile entry first (content contains PFSA).
- Query `the-next-klopp non-negotiables` returned the non-negotiables entry first (content contains non-negotiable).
- Check run: `node scripts/verify-setup.ts memory` prints `verify memory: ok`. It also fails if any stored entry reaches 4000 characters.
- MCP wiring: `claude mcp add agentmemory --scope local -- npx -y @agentmemory/mcp@0.9.33` was run from the repo root and reported success. The entry lives in `~/.claude.json` under this project, not in the repo. `--with-hooks` was not used.
- Mirror to the inline agent-memory plugin store: not mirrored. Its tools were not exposed to this executor session. The orchestrator can copy the five entries from agentmemory if it wants them there.
- Fix during writing: a backslash in the project path was dropped by the server on the first write (path showed as `E:To become`). The two affected entries were forgotten and re-stored with `E:/To become new klop`.
- Human check for a fresh session: ask "Recall the-next-klopp learner profile and project rules from agentmemory". The profile and rules should come back from memory, not from reading the brief.

## Known issues

- `uv self update` fails: uv was not installed by the standalone installer. Upgrade with `pip install --upgrade uv` or winget instead. Installed 0.12.5 works for the stub; `uv_build` is pinned `>=0.12,<0.13`. Widen it if uv moves to 0.13.
- Skills installed mid-session may not show in the skill list until Claude Code is restarted.
- Pushing `.github/workflows/*` needs the `workflow` token scope. The learner grants it themselves with `gh auth refresh -h github.com -s workflow`. Claude never handles the login.
- `uv sync` prints a harmless hardlink warning when cache and target are on different drives. Set `UV_LINK_MODE=copy` to silence it.
