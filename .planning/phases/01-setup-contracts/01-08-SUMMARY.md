---
phase: 01-setup-contracts
plan: 08
subsystem: infra
tags: [setup-docs, agentmemory, verify-setup, toolchain]

requires:
  - phase: 01-02
    provides: app skeleton, package pins, npm audit signatures result
  - phase: 01-07
    provides: skills, model routing, FABLE_LOG
provides:
  - docs/SETUP.md toolchain record (8 sections plus agentmemory Verification subsection)
  - scripts/verify/docs.ts (SETUP.md completeness and no-secret check)
  - scripts/verify/memory.ts (live agentmemory round trip)
  - five the-next-klopp entries in agentmemory (profile, non-negotiables, communication rules, model routing, D6/D10)
  - local-scope agentmemory MCP entry for this project (MCP-only, no hooks)
affects: [01-09 docs/SETUP.md GitHub section, end-of-phase human checks]

requirements-completed: [SETUP-01, SETUP-02, SETUP-05]

actuals:
  tokens: 16000
  tasks: 2
  commits: 2
plan_head_before: 74b46ff2478c1557a649830159a9420d092e4df4
plan_head_after: be3a34d054ba38d5c04f089818a60caad4b75d2e

tech-stack:
  added: []
  patterns:
    - "verify-setup sections read the agentmemory secret only into a request header, never print it"
    - "agentmemory writes go through POST /agentmemory/remember with project and concept tags"

key-files:
  created:
    - docs/SETUP.md
    - scripts/verify/docs.ts
    - scripts/verify/memory.ts
  modified: []

key-decisions:
  - "Write path for agentmemory is REST: MCP tools wired this run only appear in a new session"
  - "memory.ts reads full content from GET /agentmemory/memories and matches search hits by id, because compact smart-search returns ids and titles only"
  - "Plugin-store mirror skipped: its tools were not exposed to this executor"

status: complete
---

# Phase 1 Plan 08: SETUP.md Toolchain Record and agentmemory Summary

SETUP.md now records every tool with a verified version and routing table, and agentmemory holds five short tagged entries that keyword search finds again.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | Write docs/SETUP.md and scripts/verify/docs.ts | `0b95ec2` |
| 2 | Store profile and rules in agentmemory, add scripts/verify/memory.ts, append Verification | `be3a34d` |

## Verification run

- `node scripts/verify/docs.ts` prints `verify docs: ok`.
- `node scripts/verify/memory.ts` prints `verify memory: ok (5 entries, longest 1320 chars)`.
- `node scripts/verify-setup.ts all`: hook, memory, routing, skills sections ok (docs section runs too).
- `node scripts/guard-files.ts --tracked`: 100 files ok, no secret shapes.
- `npx tsc --noEmit` and `biome check` clean on the new scripts.
- `curl http://localhost:3111/agentmemory/livez` returns `"status":"ok"`.

## agentmemory evidence

- Write path used: REST (`POST /agentmemory/remember`, bearer secret read in-process, never printed). The MCP tools do not exist in this session.
- Five entries, each under 1500 characters: learner profile 1320, non-negotiables 1078, communication rules 552, model routing 966, decisions D6 D10 640. Paraphrased, none is a research dump or the brief verbatim.
- Query `the-next-klopp learner profile ADHD PFSA` returned the profile entry first. Query `the-next-klopp non-negotiables` returned the non-negotiables entry first.
- MCP wiring: `claude mcp add agentmemory --scope local -- npx -y @agentmemory/mcp@0.9.33` succeeded (stored in `~/.claude.json`, outside the repo). `--with-hooks` not used.
- Plugin-store mirror: not mirrored (tools not available to this executor).
- No secret, token or header text appears in any committed file; `verify docs` also compares the secret file content against SETUP.md in memory.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Backslash dropped from the project path in two entries**
- **Found during:** Task 2, reading entries back through `GET /agentmemory/memories`
- **Issue:** the server stored `E:To become new klop` for the profile and D6/D10 entries
- **Fix:** forgot both entries via `POST /agentmemory/forget` and re-stored them with `E:/To become new klop`; five entries remain, all `isLatest`
- **Files modified:** none in the repo (store only)
- **Commit:** n/a

**2. [Rule 3 - Blocking] smart-search compact mode returns titles, not content**
- **Found during:** Task 2, probing the search response
- **Issue:** the plan's check for content containing `PFSA` cannot read content from a compact result
- **Fix:** `scripts/verify/memory.ts` matches search hits by id against the full content from `GET /agentmemory/memories?project=the-next-klopp`
- **Files modified:** scripts/verify/memory.ts
- **Commit:** `be3a34d`

## Deferred / human checks

- Fresh Claude Code session: ask "Recall the-next-klopp learner profile and project rules from agentmemory". MCP tools wired this run only appear in a new session.
- Optional: copy the five entries into the inline agent-memory plugin store if orchestrator sessions should recall them there.
- The `## GitHub` section of SETUP.md is Plan 09.

## Known Stubs

None.

## Threat Flags

None. T-01-31 (secret never written, docs.ts compares it in memory), T-01-32 (five short entries, 4000 character cap in memory.ts), T-01-33 (MCP-only wiring) mitigations applied.

## Self-Check: PASSED

- FOUND: docs/SETUP.md, scripts/verify/docs.ts, scripts/verify/memory.ts
- Commits `0b95ec2` and `be3a34d` are ancestors of HEAD.
