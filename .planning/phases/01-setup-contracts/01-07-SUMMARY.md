---
phase: 01-setup-contracts
plan: 07
subsystem: infra
tags: [skills, k-dense, taste-skill, gsd, model-routing, fable, uv, python]

requires:
  - phase: 01-02
    provides: app skeleton, scripts/ layout, git-ignored .claude/skills/
provides:
  - 17 project-local agent skills (3 design, 14 K-Dense) pinned in skills-lock.json (installMode copy)
  - GSD agent_skills fixed to the project-relative taste-skill path (no symlink-escape warning)
  - model_overrides routing synthesizer, UI researcher and roadmapper to Opus; nothing routes to Fable
  - docs/FABLE_LOG.md with the 4-step protocol, 3-per-milestone cap and empty log table
  - scripts/verify/skills.ts and scripts/verify/routing.ts (verify-setup sections)
  - pipeline/ klopp-pipeline uv package stub on Python 3.12
affects: [01-08 docs/SETUP.md, 01-09 CI, Phase 2 research synthesis, Phase 4 DESIGN.md]

requirements-completed: [SETUP-01, SETUP-02]

actuals:
  tokens: 14000
  tasks: 3
  commits: 3
plan_head_before: 433d5de223cd91d4e5ff6782d7a2bff6ed97367e
plan_head_after: 5e3271ffce476f7ce7da7c96b7f594a9c33d9896

tech-stack:
  added: [skills CLI 1.9.1 (npx, not a dependency), uv_build backend]
  patterns:
    - "Third-party skills are git-ignored copies restored from skills-lock.json, never committed"
    - "verify-setup sections are standalone Node scripts that print 'verify <name>: ok' or exit 1"

key-files:
  created:
    - skills-lock.json
    - scripts/verify/skills.ts
    - scripts/verify/routing.ts
    - docs/FABLE_LOG.md
    - pipeline/pyproject.toml
    - pipeline/.python-version
    - pipeline/src/klopp_pipeline/__init__.py
    - pipeline/uv.lock
  modified:
    - .planning/config.json

key-decisions:
  - "Followed the skills CLI install path for all four sources; their READMEs also offer plugin, gh skill and install.sh routes, not used (project-local copy mode is locked by CONTEXT)"
  - "citation-management kept: its only 'always run' hit is 'Always run validation as final check', a technical tip, not a promotional directive"
  - "uv_build pinned to >=0.12,<0.13 to match installed uv 0.12.5"

status: complete
---

# Phase 1 Plan 07: Skills, Model Routing and Pipeline Stub Summary

17 pinned project-local skills installed and verified, GSD now injects the project-local taste skill without warnings, Opus routing added for synthesis, UI research and roadmap, and `pipeline/` is an installable uv stub on Python 3.12.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | Install design and K-Dense skills, prove promotional skills absent, fix agent_skills | `6b0bfe9` |
| 2 | Route models per brief section 5, create FABLE_LOG | `0f9fe19` |
| 3 | Stub the Python pipeline as a uv package | `5e3271f` |

Verification run: `node scripts/verify/skills.ts` prints `verify skills: ok (17 skills)`; `node scripts/verify/routing.ts` prints `verify routing: ok`; `uv run --project pipeline python -c "import klopp_pipeline; print(klopp_pipeline.__version__)"` prints `0.0.0`. A negative test (empty `.claude/skills/autoskill` folder) made skills.ts exit 1 with `forbidden skill is installed`; the folder was removed afterwards.

## Facts for docs/SETUP.md (Plan 08)

### Tool versions

- GSD Core 1.23.0 (`~/.claude/gsd-core/VERSION`). `gsd-tools.cjs runtime-identity --raw` returns `{"packageName":"@opengsd/gsd-core","version":"1.23.0"}`. Not reinstalled.
- skills CLI 1.9.1 via `npx -y skills@1.9.1` (not added to package.json). `DISABLE_TELEMETRY=1` was set; whether the CLI honours it is unproven (best effort).
- uv 0.12.5 (`210d1f678 2026-08-14`). Resolved venv Python is 3.12.14 (system Python is 3.12.10; uv selected its own 3.12 via `.python-version`).
- Node 24 runs the verify scripts directly (erasable TS), `tsc --noEmit` and `biome check` are clean.

### Install commands used (run from `E:\To become new klop`)

```bash
export DISABLE_TELEMETRY=1
npx -y skills@1.9.1 add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend -a claude-code --copy -y
npx -y skills@1.9.1 add vercel-labs/agent-skills --skill web-design-guidelines -a claude-code --copy -y
npx -y skills@1.9.1 add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max -a claude-code --copy -y
npx -y skills@1.9.1 add K-Dense-AI/scientific-agent-skills -a claude-code --copy -y --skill statistical-analysis scikit-learn statsmodels matplotlib scientific-visualization literature-review scientific-writing peer-review shap experimental-design exploratory-data-analysis scientific-critical-thinking citation-management hypothesis-generation
```

All four succeeded first try, no retries needed. No `.agents/skills/` folder appeared. `.claude/skills/` totals 45 MB, git-ignored, `git ls-files .claude/skills` is empty, no skill folder or SKILL.md is a symlink.

Restore on a new machine: `npx -y skills@1.9.1 experimental_install -a claude-code`, then delete the `.agents/skills/` duplicate it creates, then run `node scripts/verify/skills.ts`.

### Installed skills (all in skills-lock.json, installMode copy)

| Skill | Source repo | Commit | SKILL.md version | Verification |
|-------|-------------|--------|------------------|--------------|
| design-taste-frontend | Leonxlnx/taste-skill | `952435f63ace` | tasteskill 2.5.1 | real folder, in skill-manifest, injected by agent-skills |
| web-design-guidelines | vercel-labs/agent-skills | `5a37a6329fba` | 1.1.0 | rules bundled locally, SKILL.md says not to fetch from network |
| ui-ux-pro-max | nextlevelbuilder/ui-ux-pro-max-skill | `11ca2b3bdd55` | none stated | scripts grep: only Google Fonts URLs in preview.py and a token-schema URL string |
| statistical-analysis | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 2.0 | frontmatter read, in skill-manifest |
| scikit-learn | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 1.5 (scikit-learn 1.9.1) | same |
| statsmodels | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 1.5 | same |
| matplotlib | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 1.4 | same |
| scientific-visualization | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 1.4 | same |
| literature-review | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 1.11 | same; optional parallel-cli and OPENROUTER_API_KEY paths noted |
| scientific-writing | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 2.3 | same |
| peer-review | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 2.4 | same |
| shap | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 2.3 (shap 0.52.0) | same |
| experimental-design | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 1.5 | same |
| exploratory-data-analysis | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 1.4 | same |
| scientific-critical-thinking | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 1.5 | same |
| citation-management | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 2.3 | same |
| hypothesis-generation | K-Dense-AI/scientific-agent-skills | `c21d13b3cc28` | 2.4 | same |

K-Dense release is v2.72.0 (177 skills upstream). Full `computedHash` values live in `skills-lock.json`.

`skill-manifest --skills-dir .claude/skills` name list (17): citation-management, design-taste-frontend, experimental-design, exploratory-data-analysis, hypothesis-generation, literature-review, matplotlib, peer-review, scientific-critical-thinking, scientific-visualization, scientific-writing, scikit-learn, shap, statistical-analysis, statsmodels, ui-ux-pro-max, web-design-guidelines.

### README vs brief differences

- taste-skill README: also lists `/plugin install taste-skill@taste-skill` and `./install.sh` (symlink install). Not used: a copy-mode project-local install is locked by CONTEXT. Its README says the skill needs Node 22+ and Chrome, Edge or Chromium, installs nothing and needs no API keys.
- vercel-labs/agent-skills README: `npx skills add vercel-labs/agent-skills` installs the whole repo; we added `--skill web-design-guidelines` to take one.
- ui-ux-pro-max README: also offers `/plugin install`, `gh skill install ... .claude/skills/ui-ux-pro-max`, and the `ui-ux-pro-max-cli` npm package (`uipro init`). Not used, same reason. Needs Python 3 for its search scripts (stdlib only).
- K-Dense README: Option 1 `npx skills add K-Dense-AI/scientific-agent-skills`, Option 2 `gh skill install ... --agent claude-code`. Both install all 177 skills; we install the curated 14 to keep the skill listing small. No Claude Code plugin-marketplace route exists in the README. The README notes `docx`, `pdf`, `pptx`, `xlsx` are no longer bundled.
- Brief says disable `offer-k-dense-web`: it does not exist upstream, so nothing needed disabling (below).

### Promotional and account-bound skills

- `gh api repos/K-Dense-AI/scientific-agent-skills/contents/skills --jq '.[].name'` lists 177 names. `offer-k-dense-web` is NOT among them (absent upstream in v2.72.0).
- `autoskill`, `parallel-web`, `exa-search`, `get-available-resources` ARE upstream and were deliberately not installed. All five names are in the FORBIDDEN list of `scripts/verify/skills.ts`, which fails if any exists in `.claude/skills/` or in the lock.
- Case-insensitive search of every installed SKILL.md for "always run", "no matter what", "regardless of", "sign up": one hit, `citation-management/SKILL.md:208` ("Always run validation as final check"), a troubleshooting tip, not a directive to run the skill. No skill removed.

### taste-skill Stop hook review

- Frontmatter registers a `Stop` hook (timeout 600) whose command loops over candidate paths and runs `node <gate.mjs> --hook claude`. Fallback paths include `$CLAUDE_PROJECT_DIR/.claude/skills/design-taste-frontend/scripts/gate.mjs`.
- `scripts/gate.mjs` has no `fetch(` calls and no network clients; the only `http` strings are usage text (`http://localhost:5173/`). It enforces only while `.taste-skill/build.json` exists. `.taste-skill/` is git-ignored. The hook exits 0 otherwise.
- Skill needs Chrome or Edge for its checks; both are installed on this machine.

### frontend-design and dataviz

- `frontend-design`: real folder `~/.claude/skills/frontend-design` (SKILL.md and LICENSE.txt present), also available as a plugin. It resolves through `global:frontend-design` in agent_skills (injected as `@C:/Users/MrrightClick/.claude/skills/frontend-design/SKILL.md`). No action.
- `dataviz`: built-in skill in the session skill list, not on disk. Invoke through the Skill tool; executors must name it in prompts.

### GSD agent_skills fix

`query config-set` applied to `.planning/config.json`:

- `agent_skills.gsd-executor`, `gsd-ui-researcher`, `gsd-ui-checker`, `gsd-ui-auditor` = `[".claude/skills/design-taste-frontend","global:frontend-design"]`
- `agent_skills.gsd-planner` = `[".claude/skills/design-taste-frontend"]`

`query agent-skills gsd-executor --skills-only` now prints, with no WARNING:

```
- @.claude/skills/design-taste-frontend/SKILL.md
- @C:/Users/MrrightClick/.claude/skills/frontend-design/SKILL.md
```

Before the fix it printed `WARNING: Global skill "design-taste-frontend" failed path check (symlink escape?)`.

### Model routing

`model_profile` stays `balanced`. Added `model_overrides.gsd-research-synthesizer`, `gsd-ui-researcher`, `gsd-roadmapper` = `opus`. No agent routes to `fable`.

`resolve-model <agent> --pick tier`, before then after:

| Agent | Before | After |
|-------|--------|-------|
| gsd-planner | opus | opus |
| gsd-executor | sonnet | sonnet |
| gsd-phase-researcher | sonnet | sonnet |
| gsd-research-synthesizer | sonnet | opus |
| gsd-ui-researcher | sonnet | opus |
| gsd-roadmapper | sonnet | opus |
| gsd-verifier | sonnet | sonnet |
| gsd-codebase-mapper | haiku | haiku |

`resolve_model_ids: "omit"` makes GSD pass tier aliases (`opus`, `sonnet`, `haiku`); Claude Code maps them to Opus 5.5, Sonnet 5.5 and Haiku 5.5. That mapping is assumed (RESEARCH A5): confirm with `/model` at the end-of-phase check.

The brief's non-GSD roles (Haiku for link checking, tagging, glossary, quiz variants; Sonnet lesson writers; Opus fact verifier) are not GSD agents. Each must set `model:` in its own `.claude/agents/*.md` frontmatter when created.

Fable: `docs/FABLE_LOG.md` carries the manual 4-step protocol, the cap (`3 per milestone`, more needs the learner's approval), the Opus fallback ("needs Fable later", never block), the never-parallel rule and an empty log table.

### Pipeline stub

- Files: `pipeline/pyproject.toml` (name `klopp-pipeline`, 0.0.0, `requires-python = ">=3.11,<3.13"`, `dependencies = []`, backend `uv_build>=0.12,<0.13`), `pipeline/.python-version` = `3.12`, `pipeline/src/klopp_pipeline/__init__.py` (`__version__ = "0.0.0"`), `pipeline/uv.lock`.
- `uv sync --project pipeline` created the git-ignored `pipeline/.venv` (Python 3.12.14). It printed a harmless hardlink warning (cache and target on different filesystems); set `UV_LINK_MODE=copy` to silence it.
- Pitfall 12: `uv self update` fails because uv was not installed by the standalone installer. To upgrade, use `pip install --upgrade uv` or winget. CLAUDE.md names uv 0.13.10; installed 0.12.5 is fine for this stub and the `uv_build` range matches it. Widen the range if uv is upgraded to 0.13.
- No dependencies and no CLI added; kloppy and the rest arrive in Phase 3.

## Deviations from Plan

None - plan executed exactly as written.

## Deferred / human checks

- Plan Task 1 human-check: start a fresh Claude Code session, list skills and invoke `statistical-analysis` once. Skills installed mid-session may not appear until restart (RESEARCH A4). Not done here; belongs to the end-of-phase check together with the `/model` tier confirmation.
- `npm run verify:setup` points at `scripts/verify-setup.ts`, which does not exist yet; the two new sections are standalone scripts for it to call (Plan 08 or later).

## Known Stubs

`pipeline/src/klopp_pipeline/__init__.py` is an intentional empty package stub; Phase 3 fills it. Not a goal blocker for this plan.

## Threat Flags

None. The only new third-party code (skills) is covered by T-01-25 to T-01-27 and T-01-30; mitigations applied: curated subset, pinned commit and hash, directive search, hook source review, forbidden-list check, `.claude/skills/` untracked.

## Self-Check: PASSED

- skills-lock.json, scripts/verify/skills.ts, scripts/verify/routing.ts, docs/FABLE_LOG.md, pipeline/pyproject.toml, pipeline/.python-version, pipeline/src/klopp_pipeline/__init__.py, pipeline/uv.lock all exist.
- Commits `6b0bfe9`, `0f9fe19`, `5e3271f` are ancestors of HEAD.
