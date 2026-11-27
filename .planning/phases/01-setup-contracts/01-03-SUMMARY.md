---
phase: 01-setup-contracts
plan: 03
subsystem: infra
tags: [biome, vitest, react-router, routing, readme, typescript]

requires:
  - phase: 01-02
    provides: Vite skeleton, buildRoutes route table, smoke script
provides:
  - Biome 2 lint and format config (space indent, width 100) green across the repo
  - Vitest config merged with vite.config.ts, explicit include globs (src, scripts, schemas)
  - Dev-only /dev route and catch-all not-found route
  - Route-table test for dev and study modes
  - README with one-command start (npm run study on 4173, npm run dev on 5173)
affects: [01-04 hooks, 01-05 schemas, 01-08 docs, 01-09 CI, Phase 3-4 /dev gallery]

requirements-completed: [PLAT-01]

actuals:
  tokens: 3500
  tasks: 2
  commits: 3
plan_head_before: 18689c885c3e40bc5ed4311cc71de762bd93bf9e
plan_head_after: 1bcc97e9ddc70787238edfe959e7bad8d8871a9e

tech-stack:
  added: []
  patterns:
    - "Biome is the only linter and formatter; markdown, .planning, .claude and lockfiles are excluded"
    - "Dev-only routes gated by import.meta.env.DEV so the study build drops the chunk"

key-files:
  created:
    - biome.json
    - vitest.config.ts
    - src/routes/dev.tsx
    - src/routes/not-found.tsx
    - src/routes.test.ts
    - README.md
  modified:
    - src/routes.ts
    - src/routes/home.tsx
    - src/main.tsx
    - scripts/guard-files.ts
    - scripts/smoke.ts
    - vite.config.ts

key-decisions:
  - "Biome files.includes also excludes **/*.md: Biome 2.6.9 reformats markdown and rewrote NEW_PROJECT_INPUT.md (the brief)"
  - "buildRoutes checks includeDev && import.meta.env.DEV so the production build tree-shakes the /dev chunk"

status: complete
---

# Phase 1 Plan 03: Quality Loop and URL Surface Summary

Biome 2 + tsc 7 + Vitest now pass on the whole repo, `/dev` exists only in the dev server, unknown paths show a not-found page, and README documents the one-command start.

## Tasks

| Task | Name | Commit |
| ---- | ---- | ------ |
| 1 | Biome and Vitest config, repo formatted green | 17219d8 |
| 2 (RED) | Failing route-table test | 193f0e7 |
| 2 (GREEN) | /dev, not-found routes, README | 1bcc97e |

## Verification

- `npx biome ci .` exit 0, `npx tsc --noEmit` exit 0, `node scripts/guard-files.ts --tracked` ok, `npm run build` ok.
- `npm test`: 3 passed (dev table `["/", "/dev", "*"]`, study table `["/", "*"]`, every lazy resolves to a Component function).
- `npm run smoke` prints `smoke ok (preview)`; `npm run smoke:dev` prints `smoke ok (dev)`.
- Study build `dist/assets` contains no dev chunk (home, not-found, index only).
- `passWithNoTests` absent from vitest.config.ts.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Biome rewrote NEW_PROJECT_INPUT.md**
- **Found during:** Task 1 (`biome check --write .`)
- **Issue:** Biome 2.6.9 formats markdown; the original brief was modified (emphasis markers).
- **Fix:** Reverted the file with `git checkout -- NEW_PROJECT_INPUT.md`, added `"!!**/*.md"` to `files.includes`.
- **Files modified:** biome.json
- **Commit:** 17219d8

**2. [Rule 1 - Bug] Dev chunk shipped in the study build**
- **Found during:** Task 2 verification (`dist/assets/dev-*.js` present)
- **Issue:** `includeDev` is a runtime flag, so the bundler kept the `/dev` lazy chunk even though the route was not registered.
- **Fix:** Condition is now `includeDev && import.meta.env.DEV`; chunk is eliminated at build time (T-01-12).
- **Files modified:** src/routes.ts
- **Commit:** 1bcc97e

**3. [Rule 1 - Lint] Implicit any in guard script**
- **Fix:** typed `let stat: Stats` in scripts/guard-files.ts (lint rule noImplicitAnyLet).
- **Commit:** 17219d8

## Notes

- `npm run smoke` (preview) reports `/dev` as ok because the preview server falls back to `index.html` for SPA deep links with HTTP 200. The not-found page renders client-side there. The smoke script is not asserting a /dev route.
- README lists `npm run verify:setup`, whose script `scripts/verify-setup.ts` does not exist yet (later Phase 1 plan); README labels this.
- Installs: none (`npm ci` not needed, `node_modules` present).

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- Files exist: biome.json, vitest.config.ts, src/routes.test.ts, src/routes/dev.tsx, src/routes/not-found.tsx, README.md.
- Commits 17219d8, 193f0e7, 1bcc97e are ancestors of HEAD.
