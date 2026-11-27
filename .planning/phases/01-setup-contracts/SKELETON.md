# Walking Skeleton — The Next Klopp

**Phase:** 1
**Generated:** 2026-11-27

## Capability Proven End-to-End

The learner types `npm run study` on Windows and the home page of The Next Klopp opens at http://localhost:4173, and the same guarded commit passes six CI jobs (lint, typecheck, test, build, guards, windows-smoke in a checkout path with spaces) on a pull request in the private GitHub repo `the-next-klopp`.

Path exercised: repo guards (local hook + CI) -> git history -> private GitHub remote -> pinned npm toolchain -> Vite build -> React Router lazy route -> `vite preview` on a fixed port -> browser; plus the contract layer (JSON Schema + Zod mirrors validated in CI) that Phase 2 agents write against.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Vite 8 SPA, React 19, TypeScript 7 (`tsc --noEmit` only), Biome 2 | Static app plus client logic (IndexedDB, WASM, workers, local files); no SSR, no hydration risk; one-command run (ADR 0001) |
| Routing | React Router 8 data router, library mode, `lazy` route modules | One chunk per route/lesson; URL contract `/learn/:trackId/:chapterId/:lessonId`, `/review`, `/whats-new`, `/dev/*` dev-only (ADR 0002) |
| Styling | Tailwind 4 CSS-first (`@import "tailwindcss"`), base utilities only | Design tokens arrive from DESIGN.md in Phase 4 via `@theme` |
| Data layer | Phase 1: JSON Schema 2020-12 contracts in `/schemas` with hand-written Zod 4 mirrors in `src/schemas/contracts.ts`; learner data: Dexie 4 on IndexedDB from Phase 6 | Language-neutral contracts for Python research agents and the TS app; local-first persisted state with JSON export/import (ADR 0003) |
| Auth | None in the app (single learner, localhost); deployments gated by Vercel Authentication with scope All Deployments from Phase 5 | No accounts to protect; production must never be public (ADR 0004) |
| Deployment target | Localhost: `npm run study` on 4173 (learner), `npm run dev` on 5173 (agents), both `strictPort`, host `localhost`; protected Vercel deploy from Phase 5 | IndexedDB is per origin, so ports are a data contract (ADR 0005, D6) |
| Path handling | Project stays at `E:\To become new klop`; Node scripts with argument-array spawns, LF via `.gitattributes`, Windows CI job in a spaced path | Avoids a move; every script is space-safe (ADR 0006, D10) |
| Repo guards | `.gitignore` + `scripts/guard-files.ts` (size 5 MB, raw/licensed paths, secret shapes) in pre-commit and CI; gitleaks full-history scan in CI | Raw data and secrets never enter history; CI is the non-bypassable copy |
| Branching | `gsd/phase-{N}-{slug}` per phase, PR to `main` after six green checks, conventional commits enforced by a commit-msg hook; platform protection or the ADR 0007 fallback | Rolling release must never break a shipped chapter |
| Testing | Vitest 5 (node environment) for units and contracts; Playwright from Phase 5 | Fast unit loop now; E2E walker arrives with the content engine |
| Pipeline | `pipeline/` uv package on Python 3.12 (`requires-python >=3.11,<3.13`), no dependencies yet | socceraction pins below 3.13; kloppy and friends arrive in Phase 3 |
| Directory layout | `src/` (app, `src/routes/`, `src/schemas/`), `schemas/` (JSON Schema + fixtures + test), `scripts/` (Node TS tools, `scripts/lib/`, `scripts/verify/`), `docs/` (SETUP, FABLE_LOG, decisions), `pipeline/`, `.github/workflows/`, `.husky/` | Moving folders is cheap now; later phases add `content/`, `data/`, `public/data/` |

## Stack Touched in Phase 1

- [x] Project scaffold (framework, build, lint, test runner) — Plans 02, 03
- [x] Routing — `/` everywhere, `/dev` in the dev server, not-found catch-all — Plans 02, 03
- [ ] Database — intentionally absent: Dexie/IndexedDB is deferred to Phase 6 by CONTEXT (Deferred Ideas). Phase 1's data contract is the schema set in `/schemas`, read and validated by tests in CI (Plan 05)
- [x] UI — client-side navigation from `/` to `/dev` in the dev server — Plan 03
- [x] Deployment — documented local run command (`npm run study`, README) proved by `scripts/smoke.ts` locally and by the `windows-smoke` CI job from a clean clone — Plans 02, 03, 09

## Out of Scope (Deferred to Later Slices)

- Vercel project link, deploy and the protection smoke proof (Phase 5)
- Dexie schema, progress storage, JSON export/import (Phase 6)
- Pipeline code: kloppy, statsbombpy, socceraction, versioned artifacts, `npm run data` (Phase 3)
- Visual regression baselines in CI (Phase 4)
- DESIGN.md, tokens, component gallery under `/dev/gallery` (Phase 4)
- Pitch renderer under `/dev/pitch` (Phase 3)
- Lesson content, MDX pipeline, content validator, Playwright walker (Phase 5 onward)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: research agents write sources, concept map, roles and competencies that validate against `/schemas`; learner approves the summary
- Phase 3: the canonical pitch renders under `/dev/pitch` and the uv pipeline produces one Scene/Frame sequence from open data
- Phase 4: the learner picks a visual direction; DESIGN.md tokens drive the Tailwind theme and `/dev/gallery`
- Phase 5: a fixture lesson (MDX + JSON spec) renders, passes the validator and walker, and the app deploys to protected Vercel
- Phase 6: the Lesson Loop runtime and local progress (Dexie) with a capped FSRS queue
- Phase 7: the golden lesson and Track 0 ship on `npm run study`
- Phase 8: Track 1 and Watch Gym Level 1 ship; the learner studies
