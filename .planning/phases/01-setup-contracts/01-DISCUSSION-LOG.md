# Phase 1: Setup & Contracts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-27
**Phase:** 1-Setup & Contracts
**Areas discussed:** App framework and routing, Storage, Study/dev split (D6), Path with spaces (D10), Vercel scope, GitHub and CI, Repo guards, Schemas

Mode: autonomous. The learner instructed: "in discuss phases choose all the recommended choices and close every grey area, and for preference questions also choose the best answer". Every row marked ✓ is the recommended option, selected by Claude on the learner's delegation.

---

## App framework and routing

| Option | Description | Selected |
|--------|-------------|----------|
| Vite 8 SPA + React Router 8 library mode | No server needs; no hydration risk; first-class workers/WASM | ✓ |
| Next.js 16 | SSR/RSC not needed; hydration issues with local state | |
| Vite + TanStack Router | Type-safe search params; both work | |

## Study vs dev server split (D6)

| Option | Description | Selected |
|--------|-------------|----------|
| `npm run study` (build + preview, port 4173, shipped only) and `npm run dev` (5173, drafts) | Learner never sees drafts; progress origin stable | ✓ |
| One `npm run dev` for everything | Simpler, but drafts and broken work reach the learner | |

## Path with spaces (D10)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep path; quote paths, Node scripts, CI checkout into a spaced path | No disruption; risk covered by CI | ✓ |
| Move project to `E:\next-klopp` | Removes the risk, but moves the learner's folder | |

## Storage engine

| Option | Description | Selected |
|--------|-------------|----------|
| Dexie 4 / IndexedDB + JSON export | Typed, Blob support, no worker | ✓ |
| SQLite-WASM (OPFS) | Worker plumbing for a few thousand rows | |

## Vercel scope

| Option | Description | Selected |
|--------|-------------|----------|
| All Deployments + Vercel Authentication | Production gated too; free on all plans | ✓ |
| Standard Protection | Leaves production public | |

## Branch protection fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Protection/ruleset; if plan refuses, record + local pre-push hook | Always some enforcement | ✓ |
| Make the repo public to get free protection | Violates "private" requirement | |

## Claude's Discretion

- Tailwind setup details, placeholder copy, ADR wording, Zod mirror generation approach.

## Deferred Ideas

- Vercel deploy (Phase 5), Dexie schema (Phase 6), pipeline code (Phase 3), CI visual baselines (Phase 4).

## Decided autonomously

[auto] [Skeleton] — Q: "Skeleton content?" → Selected: "Plain home route + /dev link" (reversible technical — decided autonomously: styling replaced in Phase 4)
[auto] [Tooling] — Q: "Package manager?" → Selected: "npm + lockfile, Node 24" (reversible technical — decided autonomously: swap is local)
[auto] [Tooling] — Q: "Unit test runner?" → Selected: "Vitest 5" (reversible technical — decided autonomously: dev dep only)
[auto] [Tooling] — Q: "JSON Schema validator?" → Selected: "ajv 8 + ajv-formats" (reversible technical — decided autonomously: dev dep only)
[auto] [Layout] — Q: "Folder layout?" → Selected: "src, schemas, scripts, docs, pipeline, .github" (reversible technical — decided autonomously: cheap to move now)
[auto] [Docs] — Q: "ADR format?" → Selected: "MADR-lite" (reversible technical — decided autonomously: format only)
[auto] [CI] — Q: "Node in CI?" → Selected: "24 via setup-node" (reversible technical — decided autonomously: workflow-local)
[auto] [Hooks] — Q: "Pre-commit mechanism?" → Selected: "husky 9 + lint-staged" (reversible technical — decided autonomously: removable)
