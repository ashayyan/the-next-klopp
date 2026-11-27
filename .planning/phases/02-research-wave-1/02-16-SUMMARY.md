---
phase: 02-research-wave-1
plan: 16
subsystem: research
tags: [adr, watch-gym, licensing, statsbomb, deny-manifest, youtube]
status: complete
requires: [02-15]
provides:
  - docs/decisions/0008-watch-gym-l1-clip-supply.md (RSCH-03 decision record)
  - scripts/research/adr0008.test.ts (evidence, citation, matrix and policy checks)
  - scripts/adr.test.ts 0008 topic entry
affects: [02-18, 02-20, phase-03-pipeline, phase-05-bundle-gate, phase-08-watch-gym]
tech-stack:
  added: []
  patterns:
    - "ADR content test: citations resolved through SOURCE_ALIASES.json, numbers recomputed from coverage-matrix.json, sections read by heading level"
key-files:
  created:
    - docs/decisions/0008-watch-gym-l1-clip-supply.md
    - scripts/research/adr0008.test.ts
  modified:
    - scripts/adr.test.ts
decisions:
  - "Watch Gym L1 supply: open-data reconstructions on the canonical pitch first, learner's local files second (never committed or uploaded), YouTube link-out only; every clip spec declares a reconstruction fallback"
  - "Strict reading of StatsBomb clause 1.2.1: derived clip extracts count as the data, so no StatsBomb-derived artifact ships (supersedes the 'minimal extracts' option in 02-RESEARCH Pitfall 2, per CONTEXT post-research decision)"
  - "Deny-manifest patterns: public/data/statsbomb/**, **/*statsbomb*, public/data/last-row/**, **/*last-row*, public/data/metrica/**, public/data/skillcorner/**; only public/data/wyscout/** and public/data/dfl/** may ship, with credit"
requirements-completed: [RSCH-03]
duration: 9 min
completed: 2026-11-28
actuals:
  tokens: 4300
  tasks: 2
  commits: 2
plan_head_before: f20a380d8369d97c1f6386c8a8502130cab008f5
plan_head_after: aaf8c8ac555b9ce023e66de2d07825a3a7dfb2dd
---

# Phase 02 Plan 16: Watch Gym Level 1 clip supply (ADR 0008) Summary

ADR 0008 records the Watch Gym Level 1 clip route. Open-data reconstructions come first, the learner's own local files second, and YouTube is link-out only. Every licence statement cites a registry excerpt, and the PL numbers (StatsBomb 418, Wyscout 380, Last Row 13) are checked against the coverage matrix by a test.

## Results

- **Route:** reconstructions on the canonical pitch first. The learner's local clip files come second and are never committed or uploaded. YouTube is link-out only: no embed overlay, no download, no automated access. Every clip spec declares a reconstruction fallback.
- **Shipping policy:** StatsBomb-derived artifacts and Last Row clips are built only for the local study build. They carry StatsBomb attribution and logo, or a Last Row credit. Only CC BY sources ship in the Vercel bundle (Wyscout PL 2017/18 events, DFL/Sportec), each with credit. SkillCorner and Metrica stay local. Every clip names its dataset and league on screen.
- **Licence evidence cited:** StatsBomb agreement 1.2.1, 1.2.2 and 1.4; the CC BY 4.0 share/adapt and attribution clauses; the Wyscout and DFL figshare licence fields; the YouTube Terms (no download, no automated access, embeddable player); the YouTube Required Minimum Functionality rule against overlays.
- **Deploy deny-manifest patterns:** `public/data/statsbomb/**`, `**/*statsbomb*`, `public/data/last-row/**`, `**/*last-row*`, `public/data/metrica/**`, `public/data/skillcorner/**`. The bundle gate must fail when a file in `dist/` matches.
- **PL gaps (for 02-20 GAPS.md):**
  - No PL 360 data.
  - PL tracking and off-ball movement come only from Last Row (13 Liverpool goals, informal licence, self-described as too inaccurate for research). Off-ball PL reconstructions therefore use labelled DFL tracking.
  - No PL physical data.
  - StatsBomb redistribution limits.
  - The data-credit element with a logo slot does not exist yet.
- **Consumers named:** Phase 3 manifests carry the data credit. The Phase 3/5 bundle gate reads the deny-manifest. Phase 4/5 builds the credit element. Phase 8 clip specs need a `fallback` field, and a clip whose local file is missing plays its fallback.
- **Alternatives rejected, each cited:**
  - YouTube embed with overlays.
  - Downloading broadcast clips.
  - Shipping StatsBomb-derived data publicly, even a minimal extract set.
  - Waiting for PFF form access.
  - YouTube embed beside a separate panel, rejected for now.

## Verification

- `npx vitest run scripts/adr.test.ts scripts/research/adr0008.test.ts`: 36 passed.
- `npm run research:check`: 9 files, 149 passed, 4 skipped.
- `npm run guard`: 232 tracked files ok. `npx tsc --noEmit` passes.
- Acceptance greps: `^Reversibility: costly` 1; `"0008"` in adr.test.ts 1; `^Accepted` 1; `## Deploy deny-manifest` 1; statsbomb lines 12; fallback lines 2.
- Tracer gate: auto mode was on, so Task 1's `<verify>` was re-run end to end before Task 2. It passed.
- TDD (Task 2): the four new checks failed first (RED: no deny-manifest heading, 0 PL gap items, no Phase 3 consumer line, no StatsBomb alternative). They passed after the ADR was completed (GREEN).

## Deviations from Plan

None. The plan ran as written. Two small additions stay inside its scope:
- The deny-manifest also lists Metrica and SkillCorner. The pl-data-sources findings keep both local until their data licence is settled.
- A fifth alternative (YouTube embed beside a panel) records why the RESEARCH note "an adjacent panel is not an overlay" does not change the link-out lock.

## Known Stubs

None.

## Threat Flags

None. The ADR introduces no new surface. It fixes the policy that mitigates T-02-36, and T-02-37 is covered by the citation and matrix tests.

## Self-Check: PASSED

- FOUND: docs/decisions/0008-watch-gym-l1-clip-supply.md, scripts/research/adr0008.test.ts, scripts/adr.test.ts
- FOUND commits: 66f46f4, aaf8c8a
