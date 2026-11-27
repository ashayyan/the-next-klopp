# The Next Klopp

A local, interactive web app that teaches football from A to Z, one short visual lesson at a time, using Premier League examples. It covers the game, tactics, coaching, watching and analysing matches, scouting, data and AI, transfers, money and club strategy.

Every concept is **shown, then touched, then practised**, and every fact traces back to a free, legal source.

## Status

Built phase by phase with [GSD](https://github.com/open-gsd/gsd-core). See `.planning/ROADMAP.md`.

| Phase | What | State |
| ----- | ---- | ----- |
| 1 | Toolchain, guarded repo, app skeleton, contracts | Done (CI pending first green run) |
| 2 | Research Wave 1 (10 domains, source registry, concept map) | In progress |
| 3-8 | Pitch Standard, design system, content engine, learner runtime, golden lesson, Track 0-1 and Watch Gym | Planned |

## Start studying

- First time only: `npm ci` (needs Node 24, see `.nvmrc`).
- Study: `npm run study`, then open http://localhost:4173
- Your progress lives on this address, so the port never changes. Always use 4173 for studying.

## Build and dev loop

- `npm run dev`, then open http://localhost:5173
- Dev routes under `/dev` exist here only. The study build leaves them out.

## Stop the server

- Press Ctrl+C in the terminal.
- If a port stays busy: `netstat -ano | findstr :4173`, then `taskkill /PID <pid> /T /F` (PID from the last column). For the dev server use `:5173`.

## npm scripts

| Script | What it does |
| ------ | ------------ |
| `npm run study` | Build, then serve the study build on port 4173 |
| `npm run dev` | Dev server on port 5173, includes `/dev` routes |
| `npm run build` | Production build into `dist/` |
| `npm run typecheck` | Type check with `tsc` 7 |
| `npm run lint` | Lint and format check with Biome |
| `npm test` | Unit tests with Vitest |
| `npm run guard` | Check tracked files for raw data, oversized files and secrets |
| `npm run smoke` | Serve the study build and fetch the home page |
| `npm run verify:setup` | Verify the local toolchain |
| `npm run data:coverage` | Rebuild the open-data coverage matrix |

## Repo layout

- `src/` app (Vite 8, React 19, TypeScript 7, Tailwind 4)
- `schemas/` JSON Schema contracts (source, concept, competency, role)
- `research/` research findings, sources and the source registry
- `pipeline/` Python 3.12 data pipeline (uv)
- `scripts/` guards, checks and generators
- `docs/` setup notes and decision records (`docs/decisions/`)

## Data and licences

- No raw or licensed data is committed. Download scripts fetch it locally.
- StatsBomb open data is used locally only, with attribution, and never enters the deployed bundle.
- Wyscout (Pappalardo et al.) and DFL/Sportec open data are CC BY 4.0 and credited where used.
- Paid books and courses are summarised in our own words and linked, never copied.
