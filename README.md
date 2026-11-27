# The Next Klopp

A local, interactive web app that teaches football from A to Z, one short visual lesson at a time, with Premier League examples.

## Start studying

- First time only: `npm ci` (needs Node 24, see `.nvmrc`).
- Study: `npm run study`, then open http://localhost:4173
- Your progress will live on this address, so the port never changes. Always use 4173 for studying.

## Build and dev loop (agents)

- `npm run dev`, then open http://localhost:5173
- Dev routes under `/dev` exist here only. The study build leaves them out.

## Stop the server

- Press Ctrl+C in the terminal.
- If a port stays busy: `netstat -ano | findstr :4173`, then `taskkill /PID <pid> /T /F` (use the PID from the last column). For the dev server use `:5173`.

## npm scripts

| Script                    | What it does                                             |
| ------------------------- | -------------------------------------------------------- |
| `npm run study`           | Build, then serve the study build on port 4173           |
| `npm run dev`             | Dev server on port 5173, includes `/dev` routes          |
| `npm run build`           | Production build into `dist/`                            |
| `npm run preview`         | Serve an existing build on port 4173                     |
| `npm run typecheck`       | Type check with `tsc` 7                                  |
| `npm run lint`            | Lint and format check with Biome                         |
| `npm run format`          | Apply Biome fixes and formatting                         |
| `npm test`                | Unit tests with Vitest (`src/`, `scripts/`, `schemas/`)  |
| `npm run guard`           | Check tracked files for forbidden content                |
| `npm run validate:schemas` | Run the schema tests only                               |
| `npm run smoke`           | Build check: serve the study build and fetch the home page |
| `npm run smoke:dev`       | Same check against the dev server                        |
| `npm run verify:setup`    | Verify the local toolchain (script arrives in a later plan) |

## More

- Toolchain setup: `docs/SETUP.md` (added later in Phase 1).
- Decisions: `docs/decisions/` (architecture decision records, added later in Phase 1).
