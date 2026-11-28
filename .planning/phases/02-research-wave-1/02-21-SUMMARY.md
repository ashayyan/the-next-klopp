---
phase: 02-research-wave-1
plan: 21
subsystem: research
status: complete
tags: [rsch-06, approval, independent-review, agentmemory, phase-gate]
requires:
  - phase: 02-research-wave-1
    provides: summary page, four views and gaps.json (02-20), concept-map.json (02-19), ADR 0008 (02-16), SOURCE_REGISTRY.json (02-15)
provides:
  - research/APPROVAL.md (RSCH-06 record, gates Phase 4 DESIGN.md)
  - scripts/research/approval.test.ts (record structure and status-flip consistency)
  - 64 approved Tracks 0-4 concepts in research/concept-map.json
  - scripts/research/remember-verdicts.ts and 7 agentmemory verdict entries
  - STATE.md learner follow-up (non-blocking)
affects: [phase-04-design, phase-07-golden-lesson, phase-08-track-0-1-watch-gym, domain-2 just-in-time research]
tech-stack:
  added: []
  patterns:
    - "Approval rule is derived, not listed: approved iff APPROVAL.md says approved, the track is t00-t04 and at least one cited source is verified (not an unverified seed)"
    - "ADR Decision bullets on the summary page are cleaned (no citation tokens, no backticks, no ### sub-sections) and cut at sentence ends"
key-files:
  created:
    - research/APPROVAL.md
    - scripts/research/approval.test.ts
    - scripts/research/remember-verdicts.ts
  modified:
    - research/concept-map.json
    - research/CONCEPT_MAP.md
    - research/summary/index.html
    - scripts/research/lib/summary-html.ts
    - scripts/research/summary.test.ts
    - .planning/STATE.md
key-decisions:
  - "RSCH-06 approved under delegation, scoped: 64 Tracks 0-4 concepts approved; eighteen-zone-grid, five-vertical-lanes, half-spaces and four-superiorities stay draft because they cite only unverified home-page seeds"
  - "No blocking notes: all 29 tracks and 15 roles present, no section 8 rule broken, no licence overreach, 15 sampled claims (13 re-fetched) supported except one partly (width-and-depth) and the held half-spaces"
  - "Summary-page Watch Gym list fixed (raw citation tokens, backticks, cut bullet, deny-manifest globs); repetitive 'Not needed for Milestones 0 and 1' cells accepted as accurate"
requirements-completed: [RSCH-06]
duration: ~45 min
completed: 2026-11-28
actuals:
  tokens: 13200
  tasks: 3
  commits: 5
plan_head_before: 4957446bd7299a1252069004c05c29cad32fe36c
plan_head_after: 5a994c252cbd88981ae9c8156c5d5a119fffe344
---

# Phase 2 Plan 21: Independent research review and approval Summary

An independent Opus review approved the Wave 1 research for Tracks 0-4 under learner delegation, with four seed-only Track 2 concepts held as draft. The record is `research/APPROVAL.md`. 64 concepts are now approved, the seven Phase 2 verdicts are in agentmemory, and the full `RESEARCH_GATE=1` gate is green.

## Review outcome

- **Status:** `approved (Tracks 0-4, with four Track 2 concepts held as draft)`. It carries the delegation sentence and `Learner review: pending (non-blocking)`.
- **Spine (brief section 7):** all 29 tracks are present. Parts B to G are a skeleton of 2 to 6 concepts per track, and just-in-time research adds to them. Watch Gym has no concept yet for Level 3 (watch card) or Level 5 (full 90).
- **Roles (brief section 7.1):** all 15 roles and 49 competencies are present, with no orphan competencies. The evidence is thin for reporting lines and KPIs, and for three roles: the men's PL Academy Director, the chief scout and the Head of Data Science.
- **Learning design (brief section 8):** 17 rules checked and none broken. The rows marked "no" are product rules (glossary, focus mode, confused button and others) that need no research.
- **Source sample:** 15 claims across 9 Wave 1 domains plus one seed. 13 URLs were re-fetched with curl and all were live and on topic. 13 claims are supported. `width-and-depth` is only partly supported. `half-spaces` is not supported because it cites only a home page, so it is held as draft.
- **Licences:** no overreach. Only CC BY data ships. ADR 0008 reads StatsBomb strictly, which is the conservative choice.
- **Screenshot:** a 1440 px Edge render, stored outside the repo in the session scratchpad.

## Task commits

| Task | Commit | What |
| --- | --- | --- |
| 1 | 339d758 | APPROVAL.md and the approval structure test |
| fix | acc4c4f | Cleaned the Watch Gym decision list on the summary page, regenerated the page |
| 2 RED | 2cccee2 | Failing status-flip checks |
| 2 GREEN | 56bb796 | 64 concepts approved, CONCEPT_MAP.md regenerated, STATE.md follow-up |
| 3 | 5a994c2 | remember-verdicts.ts; 7 entries written (rerun writes 0) |

## Verification

- `npx vitest run scripts/research/approval.test.ts scripts/research/synthesis.test.ts scripts/research/summary.test.ts`: 81 passed, 4 skipped.
- `npm run research:views -- --check` and `npm run research:summary -- --check`: up to date. `derive-links --check`: up to date.
- `node scripts/research/remember-verdicts.ts --dry-run`: 7 titles, the longest 403 characters. `node scripts/verify-setup.ts memory`: `verify memory: ok (12 entries, longest 1320 chars)`.
- `RESEARCH_GATE=1 npm run research:gate`: 12 files, 225 passed, 5 skipped. `npm test`: 393 passed. `npm run guard`, `npx tsc --noEmit` and `npx biome ci scripts research pipeline package.json biome.json`: all exit 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Correctness] Approval scoped to concepts with a verified source**
- **Found during:** Task 1 review
- **Issue:** The plan approves every Tracks 0-4 concept. Four Track 2 concepts (`eighteen-zone-grid`, `five-vertical-lanes`, `half-spaces`, `four-superiorities`) cite only two unappraised home-page seeds (`src-spielverlagerung`, `src-coaches-voice`, status unverified). GAPS.md already says they "stay draft until this research lands". Approving them would break the traceability core value and meet the plan's own definition of a blocking note.
- **Fix:** The approval is scoped in APPROVAL.md ("Scope of the approval"), and the test derives the rule: approved iff the track is t00-t04 and at least one cited source is verified. 64 concepts are approved instead of 68. Milestones 0 and 1 are unaffected because Track 0, Track 1 and Watch Gym Level 1 are fully approved.
- **Effect on acceptance:** the plan's literal Task 2 `node -e` check (all t00-t04 approved) exits 1 by design. The scoped version of that check exits 0.
- **Files modified:** research/APPROVAL.md, scripts/research/approval.test.ts, research/concept-map.json
- **Commits:** 339d758, 2cccee2, 56bb796

**2. [Rule 1 - Bug] Summary page Watch Gym decision list**
- **Found during:** Task 1 screenshot review
- **Issue:** `parseDecision` pulled the ADR's `### Deploy deny-manifest` globs in as decision bullets. Raw `[src-...]` tokens and backticks were also shown, and one bullet was cut mid-sentence ("and a...").
- **Fix:** Stop at any heading, strip the citation tokens and backticks, and cut at the last full sentence that fits. Two unit tests were added and the page was regenerated.
- **Files modified:** scripts/research/lib/summary-html.ts, scripts/research/summary.test.ts, research/summary/index.html
- **Commit:** acc4c4f

## Non-blocking follow-ups (from APPROVAL.md)

- Re-source the four held Track 2 concepts at the domain 2 research, and strengthen `width-and-depth`.
- Add concepts for Watch Gym Level 3, Level 5, the camera view and restart shapes before Watch Gym Level 3.
- Find practitioner sources for reporting lines, KPIs, a week in the life and career entry points before the role pathway features.
- Brief conflict: "prediction streaks" (section 7) against "no streaks that can be lost" (section 8). Follow section 8.
- The YouTube embed in the CLAUDE.md stack notes conflicts with ADR 0008 (link-out only). Reconcile them when the video player is planned.
- Point `src-wyscout-public-dataset` at figshare article 7770599 (where CC BY 4.0 is recorded) in Phase 3.
- Learner: open `research/summary/index.html` and confirm or re-open the approval (STATE.md Pending Todos).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: research/APPROVAL.md, scripts/research/approval.test.ts, scripts/research/remember-verdicts.ts
- FOUND commits: 339d758, acc4c4f, 2cccee2, 56bb796, 5a994c2
