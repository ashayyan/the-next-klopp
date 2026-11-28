---
phase: 02-research-wave-1
plan: 17
subsystem: research
tags: [roles, competencies, role-map, synthesis-gate, rsch-04]
status: complete
requires: [02-12, 02-15]
provides:
  - research/roles.json (15 canonical roles, frozen ids, target levels 1-4)
  - research/competencies.json (49 shared competencies, frozen ids, four level descriptors each, concepts empty)
  - scripts/research/synthesis.test.ts (roles and competencies integrity and completeness sections)
affects: [02-18, 02-19, 02-20, 02-21, phase-07-role-map]
tech-stack:
  added: []
  patterns:
    - "Roles and competencies authored before the concept map; competency.concepts stays empty and the test requires it empty until concept-map.json exists (02-18 derive fills it)"
key-files:
  created:
    - research/roles.json
    - research/competencies.json
  modified:
    - scripts/research/synthesis.test.ts
decisions:
  - "49 role-neutral competencies over the 12 COMPETENCY_DOMAINS; shared across roles at different target levels, not duplicated per role"
  - "Level scale: 1 Aware, 2 Working knowledge, 3 Practitioner, 4 Leads and teaches; every descriptor is an observable behaviour"
  - "Roles cite only role-definitions registry sources; no competency was added without a cited role-research duty behind it"
requirements-completed: []
requirements-partial: [RSCH-04]
duration: 6 min
completed: 2026-11-28
actuals:
  tokens: 14200
  tasks: 2
  commits: 2
plan_head_before: 25d4a1ef7fd9b3374472243f170b07011c3b18fa
plan_head_after: 14a4bd7b5cbba6c8dee8a16763807dfb187b5d50
---

# Phase 02 Plan 17: Roles and competencies synthesis Summary

`research/roles.json` holds the 15 canonical roles of brief section 7.1. `research/competencies.json` holds 49 shared competencies, each with four observable level descriptors. Every role cites role-definitions sources from the registry, and the synthesis gate pins the ids.

## Results

- **Roles (15):**

| Tier | Role | Competencies |
|---|---|---|
| Senior | sporting-director | 11 |
| Senior | head-coach | 12 |
| Senior | head-of-performance-analysis | 9 |
| Senior | head-of-data-science | 11 |
| Senior | head-of-recruitment | 12 |
| Senior | academy-director | 9 |
| Senior | club-ceo | 8 |
| Senior | head-of-performance | 7 |
| Supporting | assistant-coach | 5 |
| Supporting | set-piece-coach | 3 |
| Supporting | loan-manager | 5 |
| Supporting | chief-scout | 4 |
| Supporting | first-team-analyst | 6 |
| Supporting | recruitment-analyst | 5 |
| Supporting | data-engineer | 4 |

- **Competencies by domain (49):**

| Domain | Count |
|---|---|
| data-science | 7 |
| recruitment | 6 |
| transfers-and-finance | 6 |
| analysis | 5 |
| leadership | 5 |
| tactics | 4 |
| communication | 4 |
| coaching | 3 |
| sports-science | 3 |
| game-knowledge | 2 |
| governance | 2 |
| academy-development | 2 |

- **Example levels:** the sporting director is at level 4 on squad-planning, sporting-strategy, staff-appointment and playing-style-definition, and at level 2 on set-piece-design. The head coach is at level 4 on game-planning and team-selection. The data engineer is at level 4 on data-pipeline-ownership.
- **Shared competencies:** 37 are used by two or more roles. For example, department-leadership is used by 6 roles and playing-style-definition by 5.
- **Single-role competencies (12):** high-performance-culture, uncertainty-quantification, agent-and-club-relationships, academy-programme-management, regulatory-compliance, club-budgeting, commercial-strategy, injury-prevention-and-return-to-play, workload-management, performance-science-literacy, loan-player-monitoring and data-pipeline-ownership.
- `concepts` is `[]` for every competency. The test requires this until `research/concept-map.json` exists; 02-18 then derives the links.

## For the 02-21 reviewer

**Roles with thin evidence:**
- **chief-scout:** no chief scout ad was read. The summary says that the remit is inferred, and the competencies come from the head-of-recruitment sources.
- **academy-director:** the only source is a women's academy manager ad. Men's PL academy reporting and remit have no evidence.
- **head-of-data-science:** the evidence is a lead data scientist ad, not a head-of ad. The level-3 department-leadership target is inferred from the title.
- **club-ceo:** one CEO profile study plus one article on club structure. No job ad was read.
- **Single-source supporting roles:** assistant-coach, set-piece-coach, recruitment-analyst (a lead analyst ad) and data-engineer.

**Competencies kept with single-source support:**
- uncertainty-quantification (src-liverpool-lead-data-scientist)
- agent-and-club-relationships (src-liverpool-women-head-of-recruitment)
- character-and-fit-assessment (src-hudl-marshall-head-of-recruitment)
- high-performance-culture (src-uefa-coaching-licences)
- commercial-strategy (src-footballbenchmark-ceo-profiles)
- academy-programme-management and regulatory-compliance (src-newcastle-women-academy-manager)
- performance-science-literacy (src-slemen-director-high-performance)
- injury-prevention-and-return-to-play and workload-management (src-liverpool-head-academy-medical-performance)
- loan-player-monitoring (src-sky-hammond-loans-manager)
- data-pipeline-ownership (src-liverpool-data-engineer)
- set-piece-design (src-liverpool-set-piece-coach)
- player-communication (src-pl-assistant-manager-insights)

**Design-judgement target levels (not stated in any source):**
- sporting-director set-piece-design 2. This follows the plan's example.
- Every level number is a synthesis judgement. The sources give duties, not levels.

## Verification

- `npx vitest run scripts/research/synthesis.test.ts`: 20 passed, 2 skipped. The skipped cases are the gate-only "exists" checks.
- `npm run research:check`: 9 files, 161 passed, 5 skipped.
- `npx tsc --noEmit` passes. `npx biome ci scripts research` passes (68 files). `npm run guard` passes (235 tracked files).
- Acceptance one-liners: the sporting-director has 5-12 competencies (exit 0); roles.json has length 15 (exit 0); competencies.json has 35-50 entries (exit 0). `roles: integrity` and `roles: completeness` each appear once.
- Tracer gate: Task 1's `<verify>` was re-run before expansion and passed. A mutation check (an unknown source id and a ghost competency id) failed the two reference tests as expected. The files were then regenerated.
- TDD (Task 2): with only the sporting-director slice, the completeness block failed 3 checks (RED). It passed after the full synthesis (GREEN).

## Deviations from Plan

**1. [Rule 2 - Correctness] An empty `concepts` list is asserted, not only checked against the map**
- **Found during:** Task 1
- **Issue:** The plan checks concept entries only "when concept-map.json exists". The must-have truth says concepts stay empty until the map exists.
- **Fix:** While the map is absent, the test requires every `concepts` list to be empty. Once the map exists, it requires every entry to resolve.
- **Commit:** 307ae4f

The JSON was produced by a throwaway generator in the session scratchpad (`JSON.stringify(x, null, 2) + "\n"`, then Biome formatting). The generator is not committed. The JSON files are the source of truth, so later phases only add ids.

## Known Stubs

None. The empty `competency.concepts` arrays are intentional: 02-18 derives them (plan objective, authoring order).

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: research/roles.json, research/competencies.json, scripts/research/synthesis.test.ts
- FOUND commits: 307ae4f, 14a4bd7
