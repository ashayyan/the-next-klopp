# 0003. Dexie 4 on IndexedDB for local learner data

Date: 2026-11-27

## Status

Accepted

The learner delegated this decision for the autonomous Phase 1 run. Phase 1 records the decision only; no Dexie code ships yet.

## Context

- Progress, spaced-repetition cards and logs, notes, recorded audio and "I'm confused here" feedback must persist on the learner's machine with no server.
- The data is a few thousand rows plus audio Blobs, not an analytics workload.
- IndexedDB is per origin: `localhost:5173`, `localhost:4173` and the Vercel URL are three separate databases.
- Clearing browser data wipes progress, so a backup path is mandatory.

## Decision

- Dexie 4 with `dexie-react-hooks` (live queries) and `dexie-export-import` (JSON and Blob backup).
- JSON export and import is the sync path between origins.
- Call `navigator.storage.persist()` once and show an export reminder.
- The Dexie schema arrives in Phase 6, with versioned migrations from the first release.
- Spaced-repetition card dates are stored as ISO strings behind one adapter, so a library change touches one file.

Reversibility: costly - the persisted schema lives on the learner's machine, so changes need migrations.

## Consequences

- Good: typed tables, indexes, live queries, Blob storage, no worker and no COOP/COEP headers.
- Good: works in Chromium, Edge and Firefox.
- Bad: the learner's progress is tied to the origin that holds it (see ADR 0005); a port change strands data unless exported.
- Bad: no real SQL over progress data. If analytics need it later, query an exported snapshot with DuckDB-WASM.

## Alternatives

- SQLite-WASM on OPFS: rejected for now. It adds worker plumbing and a persistence layer for a few thousand rows.
- PGlite: rejected. It is overkill for this data size.

Sources: `.claude/CLAUDE.md` Technology Stack (decision 3), `01-CONTEXT.md`, `01-RESEARCH.md`.
