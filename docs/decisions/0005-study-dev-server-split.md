# 0005. Study and dev servers on fixed ports (D6)

Date: 2026-11-27

## Status

Accepted

The learner delegated this decision for the autonomous Phase 1 run. It can be revisited at the next learner checkpoint, but changing the port later strands data unless it is exported first.

## Context

- Agents and drafts need a fast dev loop; the learner needs a stable place to study shipped content.
- IndexedDB is per origin, so `localhost:5173`, `localhost:4173` and the Vercel URL are three separate databases.
- Vite moves to the next free port by default (5174), which silently strands stored progress on the old origin.
- Vite 8.4 has a built-in command lock: a second `npm run dev` for the same project fails with a message naming the running process.

## Decision

- `npm run dev` is the Vite dev server on port 5173 with `strictPort: true`, for agents and drafts.
- `npm run study` runs `vite build && vite preview` on port 4173 with `strictPort: true`. It is the learner's one documented command for studying.
- Both bind `localhost`.
- In Phase 1 `study` serves the same skeleton. The shipped-only content filter arrives with the content engine in Phase 5; `/dev/*` routes are already absent from the study build.
- The learner's progress therefore lives on `localhost:4173`.

Reversibility: costly - the port is part of the storage origin, so changing it strands data unless exported.

## Consequences

- Good: ports never drift; a port clash fails loudly instead of creating a second origin.
- Good: drafts cannot leak into the learner's study view once the content filter exists.
- Bad: a clash with another program on 5173 or 4173 stops the command; the fix is to free the port, not to change it.
- Bad: progress is not shared between dev and study; JSON export and import is the bridge (ADR 0003).

## Alternatives

- One dev server for both: rejected. Drafts would leak into study and hot-reload churn would interrupt the learner.
- Unfixed ports: rejected. It causes silent data stranding.

Sources: `.claude/CLAUDE.md` Technology Stack (decision 3), `01-CONTEXT.md`, `01-RESEARCH.md`.
