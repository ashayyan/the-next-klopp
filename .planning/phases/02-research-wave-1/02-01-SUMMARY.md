---
phase: 02-research-wave-1
plan: 01
subsystem: testing
tags: [research-gate, ajv, vitest, seed-sources, excerpt-hash, node-type-stripping]

requires:
  - phase: 01-setup-contracts
    provides: schemas/source.schema.json, common.schema.json, ajv strict setup, Vitest include globs, guard
provides:
  - validateDomainFolder shared rule set and CLI `node scripts/research/check-domain.ts <slug>`
  - research/seed-sources.json with 20 shared, schema-valid source ids (FBref advanced stats as removed)
  - canonical excerpt hash CLI `node scripts/research/excerpt-hash.ts`
  - research/README.md domain research contract
  - phase metadata (29 tracks with Parts, 15 role ids, 12 competency domains, 33 brief 6.2 domains, 4 threads)
  - npm scripts research:check and research:gate
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07, 02-08, 02-09, 02-10, 02-11, 02-12, 02-13, 02-14, 02-15]

plan_head_before: 8cb941a985a772cd32d692eeca70a7f2df0fb5c2
plan_head_after: 38819a5ac31fab97f68e1e959072edc034ef6046

actuals:
  tokens: 21330
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Erasable TypeScript run as node file.ts, shared ajv instance via compileContract(name)"
    - "Per-domain gate in Vitest with a completeness test gated by RESEARCH_GATE=1"
    - "Slug-specific rules as data in domains.ts (SLUG_RULES), applied by validateDomainFolder"

key-files:
  created:
    - scripts/research/lib/domains.ts
    - scripts/research/lib/excerpt-hash.ts
    - scripts/research/lib/research-files.ts
    - scripts/research/lib/research-files.test.ts
    - scripts/research/lib/sample-domain.ts
    - scripts/research/domains.test.ts
    - scripts/research/check-domain.ts
    - scripts/research/excerpt-hash.ts
    - scripts/research/gate.ts
    - research/seed-sources.json
    - research/README.md
  modified:
    - package.json

key-decisions:
  - "Every non-empty non-heading line in the first four findings sections needs a citation, so agents must write one claim per line (stated in research/README.md)"
  - "Measured-number lines are checked in findings.md only (visual_ideas.md is exempt); citations are stripped before the unit regex so ids like src-x-90m cannot false-trigger"
  - "Seed list leaves out src-ifab-offside and src-ifab-var-protocol: they are regulation type and need excerpts, so the laws domain agent adds them"
  - "Seed sources whose licence was not read (kloppy docs, Soccermatics, Friends of Tracking) carry unknown for redistribute and derivative rather than a guessed licence"

patterns-established:
  - "Validate one domain: node scripts/research/check-domain.ts <slug>; all ten: npm run research:gate"
  - "Hash an excerpt: printf '%s' \"<passage>\" | node scripts/research/excerpt-hash.ts"

requirements-completed: [RSCH-01]

coverage:
  - id: D1
    description: "Shared rule set rejects or accepts a research domain folder, runnable per slug via check-domain.ts"
    requirement: RSCH-01
    verification:
      - kind: unit
        ref: "scripts/research/lib/research-files.test.ts (one case per rejection rule) and scripts/research/domains.test.ts#accepts a sample domain"
        status: pass
      - kind: other
        ref: "node scripts/research/check-domain.ts laws-of-the-game exits 1 while the folder is absent; not-a-slug exits 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "Seed source list of 20 schema-valid shared sources, FBref advanced stats removed, two hashed IFAB excerpts"
    requirement: RSCH-01
    verification:
      - kind: unit
        ref: "scripts/research/domains.test.ts#research/seed-sources.json"
        status: pass
    human_judgment: false
  - id: D3
    description: "Excerpt hash CLI reproduces both IFAB golden hashes and is whitespace-insensitive"
    requirement: RSCH-01
    verification:
      - kind: unit
        ref: "scripts/research/lib/research-files.test.ts#excerptSha256"
        status: pass
      - kind: other
        ref: "printf 'Effective from 1st July 2026' | node scripts/research/excerpt-hash.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Track, Part, role, competency-domain, brief 6.2 domain and thread metadata checked against the brief text; slug-specific rules; gated completeness runner"
    requirement: RSCH-01
    verification:
      - kind: unit
        ref: "scripts/research/domains.test.ts#phase metadata and scripts/research/lib/research-files.test.ts#slug-specific rules"
        status: pass
      - kind: other
        ref: "npm run research:gate exits non-zero while no domain folders exist; npx vitest run reports the gate test skipped"
        status: pass
    human_judgment: false
  - id: D5
    description: "research/README.md reads clearly enough for ten parallel agents to follow without drifting"
    requirement: RSCH-01
    verification: []
    human_judgment: true
    rationale: "Clarity of instructions to an LLM agent is only proven when the domain agents run; the orchestrator validates each domain with check-domain.ts"

duration: 10min
completed: 2026-11-27
status: complete
---

# Phase 2 Plan 01: Research gate, seed sources and contract Summary

**A per-slug research gate (`check-domain.ts`) with 23 named shared rejection rules plus 7 slug rules, 20 shared seed source ids, a canonical excerpt hasher that reproduces the IFAB golden hashes, and the written contract the ten research agents follow.**

## Performance

- **Duration:** about 10 min
- **Started:** 2026-11-27T20:45Z (approximate, no start epoch was captured)
- **Completed:** 2026-11-27T20:55Z
- **Tasks:** 3 (Task 1 tracer, Tasks 2 and 3 TDD)
- **Files modified:** 12 (11 created, package.json modified)

## Accomplishments

- `validateDomainFolder` judges a domain by one rule set: three non-empty files, 1 to 25 schema-valid sources, `src-` ids, unique ids, licence notes, seed id and URL reuse, regulation excerpts, unique excerpt ids, five ordered findings headings, word caps, no code fences, a citation on every claim line, resolvable citations (including `#excerpt`), `Contested:` with at least two sources, excerpt cites on measured numbers, no uncited source, and three visual headings.
- Single-domain validation command for the orchestrator: `node scripts/research/check-domain.ts <slug>` (prints `<rule>: <detail>` and exits 1, or `research/<slug>: ok (...)`).
- `research/seed-sources.json` holds 20 shared sources (IFAB Laws 2026/27 with two hashed excerpts, PL laws article, open-data providers, YouTube terms, FBref advanced stats as `removed`).
- `compileContract(name)` exposes one shared strict ajv instance for the source, concept, role and competency schemas so later plans do not rebuild it.
- Phase metadata (`TRACKS` with Part derivation, `ROLE_IDS`, `COMPETENCY_DOMAINS`, `BRIEF_DOMAINS`, `THREADS`) is tested against the text of NEW_PROJECT_INPUT.md.
- `npm run research:gate` runs the completeness test with `RESEARCH_GATE=1`; plain `vitest run` skips it so CI stays green mid-phase.

## Task Commits

1. **Task 1: End-to-end domain gate (tracer)** - `4d4e7e6` (feat)
2. **Task 2: Full seed source list, hash CLI, README, rule tests** - `3c8bf76` (feat)
3. **Task 3: Metadata and gated runner** - `2fa3b4c` (test, RED), `38819a5` (feat, GREEN)

**Plan metadata:** the docs commit that follows this file (docs: complete plan)

## Files Created/Modified

- `scripts/research/lib/research-files.ts` - rule set, canonicalUrl, parseCitations, countWords, loadSeedSources, compileContract
- `scripts/research/lib/domains.ts` - slugs, caps, tracks, roles, brief domains, threads, slug rules
- `scripts/research/lib/excerpt-hash.ts` and `scripts/research/excerpt-hash.ts` - canonical hash and its stdin CLI
- `scripts/research/lib/sample-domain.ts` - test helper: a valid sample domain and temp-root writers
- `scripts/research/check-domain.ts`, `scripts/research/gate.ts` - CLIs
- `scripts/research/domains.test.ts`, `scripts/research/lib/research-files.test.ts` - 44 tests (plus 1 gated)
- `research/seed-sources.json`, `research/README.md` - shared ids and the agent contract
- `package.json` - `research:check`, `research:gate`

## Decisions Made

See `key-decisions` above. The strictest is the one-claim-per-line citation rule, which follows the plan text ("every non-empty bullet or paragraph line") literally.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extra helper file `scripts/research/lib/sample-domain.ts`**
- **Found during:** Task 1
- **Issue:** The plan builds the sample domain in `domains.test.ts` but Task 2 and 3 tests need to mutate the same sample, and two test files cannot share a helper that lives inside one of them.
- **Fix:** Moved the sample and temp-folder writers into a non-test helper module.
- **Files modified:** scripts/research/lib/sample-domain.ts
- **Commit:** 4d4e7e6

**2. [Rule 1 - Bug avoided] Citations stripped before the measured-number regex**
- **Found during:** Task 1 design
- **Issue:** A citation such as `[src-x-90m-rule]` would match the unit regex and demand an excerpt cite on its own line.
- **Fix:** `checkMeasured` removes citation tokens before testing the line.
- **Commit:** 4d4e7e6

### Plan-shape notes (not defects)

- Task 2 is marked `tdd="true"` but its implementation (`validateDomainFolder`) already existed from the Task 1 tracer, so the new rejection tests were green on first run (34 passed). Task 3 followed a real RED then GREEN sequence (10 failing tests, commit `2fa3b4c`, then `38819a5`).
- The seed list has 20 entries, not "about 21": every URL named in the plan is present; `src-ifab-offside` and `src-ifab-var-protocol` were left to the laws domain agent as the plan allows.
- `biome ci` is run path-limited (`scripts research package.json`) because of the untracked `scratch_tmp_review/`, which was left untouched and uncommitted.

**Total deviations:** 2 auto-fixed (1 blocking, 1 preventive). **Impact:** none on scope.

## Issues Encountered

None. Verification: `npm run research:check` 44 passed 1 skipped; full `npx vitest run` 210 passed 1 skipped (166 Phase 1 plus new); `npx tsc --noEmit` clean; `npx biome ci scripts research package.json` clean; `npm run guard` ok; `npm run research:gate` exits 1 as expected with no domain folders.

## User Setup Required

None.

## Known Stubs

None.

## Threat Flags

None. All three mitigations from the plan threat register are in place: T-02-01 (schema, excerpt and measured-claim rules), T-02-02 (README untrusted-input rule, write only under research/<slug>/), T-02-03 (README forbids editing the seed; seed uniqueness tests).

## Next Phase Readiness

Ready for 02-02. Domain agents should read `research/README.md` first and self-check with `node scripts/research/check-domain.ts <slug>`. Note for the orchestrator: slug rules require `src-okabe-ito-cud` (with an excerpt) in `interactive-explainers`, `src-fbref-advanced-stats` (removed) in `pl-data-sources`, and `coverage-matrix.json` mentioned in that domain's findings.

## Self-Check: PASSED

- Created files exist: all 11 listed paths found on disk.
- Commits `4d4e7e6`, `3c8bf76`, `2fa3b4c`, `38819a5` are ancestors of HEAD.
