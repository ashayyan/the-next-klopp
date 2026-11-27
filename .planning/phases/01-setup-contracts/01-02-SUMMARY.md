---
phase: 01-setup-contracts
plan: 02
subsystem: infra
tags: [vite, react, react-router, tailwind, typescript, smoke-test, windows]

requires:
  - phase: 01-01
    provides: guard files, guard CLI, private repo, phase branch
provides:
  - Exact-pinned Vite 8 / React 19 / TS 7 / Tailwind 4 / React Router 8 skeleton with committed lockfile
  - Fixed ports (dev 5173, study 4173), strictPort, host localhost
  - Every npm script later plans use (package.json never edited again for scripts)
  - buildRoutes({ includeDev }) lazy route table, home route
  - scripts/smoke.ts with preview and dev modes (reusable by the Windows CI job)
affects: [01-03 husky and biome config, 01-04 hooks, 01-05 schemas, 01-08 CI windows-smoke, Phase 4 design]

requirements-completed: [PLAT-01]

actuals:
  tokens: 6500
  tasks: 2
  commits: 2
plan_head_before: e2e5b3c8b96a8ac74f2f36d721b2cc675fba075e
plan_head_after: e40ecf68dd0e83531502508126ce46ee61d9dc2a

tech-stack:
  added:
    - react 19.3.1, react-dom 19.3.1, react-router 8.5.3, zod 4.6.7
    - vite 8.4.0, "@vitejs/plugin-react 6.3.0", tailwindcss + "@tailwindcss/vite 4.3.5"
    - typescript 7.0.2, "@biomejs/biome 2.6.9", vitest 5.1.2, ajv 8.20.0, ajv-formats 3.0.1
    - husky 9.1.7, lint-staged 17.6.2, "@types/react 19.3.3", "@types/react-dom 19.3.0", "@types/node 26.6.11"
  patterns:
    - "Lazy route modules returning { Component } from route table in src/routes.ts"
    - "Node 24 native TS scripts (erasable syntax, .ts import extensions)"
    - "Smoke script stops Windows process trees with taskkill /T /F"

key-files:
  created:
    - package.json
    - package-lock.json
    - .nvmrc
    - tsconfig.json
    - vite.config.ts
    - index.html
    - src/main.tsx
    - src/index.css
    - src/routes.ts
    - src/routes/home.tsx
    - scripts/smoke.ts

key-decisions:
  - "RouterProvider imported from react-router/dom (DOM provider export of 8.5.3); createBrowserRouter from react-router; no react-router-dom"
  - "Installs run with HUSKY=0 so the prepare script did not wire git hooks before Plan 04"
  - "No allowScripts block: npm install-scripts ls reported no packages with unreviewed install scripts (Vite 8 uses rolldown, esbuild is not installed)"

status: complete
---

# Phase 1 Plan 02: App Skeleton Summary

Pinned Vite 8 SPA with a lazy React Router home route served on fixed ports (dev 5173, study 4173), proven by a smoke script that checks both servers and frees their ports.

## What was built

- **Task 1, commit `8422c86`**: `package.json` with all phase scripts, exact pins only (no `^` or `~` in package.json), `engines.node >=24`, `lint-staged` config; `package-lock.json`; `.nvmrc` = 24; `tsconfig.json` (TS 7, `types: ["vite/client","node"]`); `vite.config.ts` (strictPort and host localhost on both servers); `index.html`; Tailwind 4 `src/index.css`; plain `HomePage` (heading "The Next Klopp").
- **Task 2, commit `e40ecf6`**: `src/routes.ts` (`buildRoutes`, lazy home route, `includeDev` accepted for Plan 03), `src/main.tsx` using `createBrowserRouter` plus `RouterProvider`, `scripts/smoke.ts`.

## Verification evidence

- `npm run build` ok, 2 JS chunks (`index-*.js` 316 kB, `home-*.js` 0.35 kB: route is code-split). `npx tsc --noEmit` exit 0. `dist/index.html` has `id="root"`, built assets contain "The Next Klopp".
- `npm audit signatures`: `audited 81 packages`, `81 packages have verified registry signatures`, `45 packages have verified attestations`. `npm install` reported `found 0 vulnerabilities`.
- `npm run smoke`: `smoke ok (preview): http://localhost:4173/ and /dev`.
- `npm run smoke:dev`: `smoke ok (dev): http://localhost:5173/ and duplicate start rejected`. The second start failed with Vite's `Found another Vite dev process for this project at http://localhost:5173/ (PID 9856)` (command lock).
- After both smoke runs `netstat -ano | grep -E ':(4173|5173) .*LISTENING'` printed nothing.
- Acceptance greps: study script 1, caret/tilde in package.json 0, `strictPort: true` 2, engines 1, `react-router-dom` 0, `.nvmrc` = 24, lockfile present, `node_modules` ignored, `127.0.0.1` in smoke 0, `taskkill` 2.
- `node scripts/guard-files.ts --staged` passed on both commits (9 and 3 files).

## Install scripts (Pitfall 6)

`npm install-scripts ls` printed `No packages with unreviewed install scripts.` So no `allowScripts` block was written (acceptance rule: SUMMARY states none were listed).

## Package legitimacy (batched human-check, per orchestrator)

Ten packages flagged SUS for `too-new` only (research audit). Mitigation applied: exact pins, committed lockfile, `npm audit signatures` verified signatures above, 0 vulnerabilities. Versions match 01-RESEARCH.md Standard Stack. Plan 08 records the batch note in docs/SETUP.md. No checkpoint raised.

## Deviations from Plan

None - plan executed as written. Notes:
- `HUSKY=0` was set for the two `npm install` runs so `prepare: husky` did not set `core.hooksPath` before Plan 04 installs the hooks. A normal `npm install` later runs `husky` as intended.
- Commit hooks are not installed yet (Plan 04), so `node scripts/guard-files.ts --staged` was run by hand before each commit. Biome config arrives in a later plan; the new files use tabs (Biome default) and should pass once configured.
- The human-check items (open both URLs in the learner's browser; confirm package pins) remain for the end-of-phase human verify.

## Known Stubs

None. The home page text is intentional placeholder copy; design arrives in Phase 4 per CONTEXT "Skeleton content".

## Threat Flags

None beyond the plan's threat register. T-01-08 (exact pins, lockfile, audit signatures), T-01-09 (host localhost), T-01-10 (strictPort, dev duplicate-start rejection proven), T-01-11 (taskkill tree kill, ports verified free) mitigations applied.

## Self-Check: PASSED

- FOUND: package.json, package-lock.json, .nvmrc, tsconfig.json, vite.config.ts, index.html, src/main.tsx, src/index.css, src/routes.ts, src/routes/home.tsx, scripts/smoke.ts
- FOUND commits 8422c86 and e40ecf6 on gsd/phase-1-setup-contracts
