# 0001. Vite SPA, not Next.js

Date: 2026-11-27

## Status

Accepted

The learner delegated this decision for the autonomous Phase 1 run (brief section 14: decide, log, continue).

## Context

- The app is static files plus client logic: IndexedDB, WASM, web workers and local files. Nothing needs server rendering, API routes or ISR.
- Date-, storage- and media-dependent UI (the "due today" queue, progress rings, video time) causes hydration mismatches under SSR. A pure SPA has none.
- Pyodide 314 dropped classic workers, so module workers are mandatory. Vite handles `new Worker(new URL(...), { type: "module" })` and `?url` WASM imports natively; a smoke build on this machine proved it.
- The learner needs one command that starts in well under a second. There is no server/client component boundary to explain to build agents.
- Vercel has a native Vite preset; a SPA needs one `vercel.json` rewrite.
- A Vite plugin can add dev-only endpoints (write `feedback/*.jsonl`, serve local video from a disk folder). Next has no equally light equivalent.

## Decision

- Vite 8 single-page app with React 19.
- TypeScript 7 is used for `tsc --noEmit` only. Vite and Vitest transpile with Oxc and never call the TS API.
- Biome 2 for lint and format.
- If a server need appears later (auth, signed uploads), add Vercel Functions or Nitro then.

Reversibility: costly - every later component, route and build script depends on this choice.

## Consequences

- Good: fast start, no hydration bugs, workers and WASM work out of the box, simple static deploy.
- Good: one mental model for agents building lessons.
- Bad: typescript-eslint cannot run under TS 7 (it needs the compiler API, which arrives in 7.1). Biome plus `tsc` is the lint path; fall back to TypeScript 6.0.3 if a tool needs the API.
- Bad: no server means no secrets at runtime and no server-side checks; anything that needs them forces an escape-hatch decision.
- Bad: no SEO or link-preview rendering, which is acceptable because the app is private.

## Alternatives

- Next.js 16: rejected. It adds an SSR/RSC boundary with no benefit when there is no server.
- Astro 7 with React islands: rejected. Progress, queue and tactics state persist across pages, which favours one SPA.

Sources: `.claude/CLAUDE.md` Technology Stack, `01-CONTEXT.md`, `01-RESEARCH.md`.
