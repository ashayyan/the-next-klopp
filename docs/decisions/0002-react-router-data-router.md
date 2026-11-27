# 0002. React Router 8 data router with lazy routes

Date: 2026-11-27

## Status

Accepted

The learner delegated this decision for the autonomous Phase 1 run.

## Context

- Each lesson should be its own code chunk so the shell stays small while chapters ship one by one.
- Lesson deep links are public contracts: a bookmark or a note that links to a lesson must keep working.
- React Router 8.5 needs React 19.2.7 or newer and is already installed with the React 19.3 skeleton.
- The skeleton routes were built and verified with `lazy` route modules; the build emitted one chunk per route.
- The router is cheap to swap now and expensive after lessons ship.

## Decision

- React Router 8 in data-router library mode (`createBrowserRouter`), with `lazy` route modules. Imports come from `react-router`.
- URL contract: `/learn/:trackId/:chapterId/:lessonId`, `/review`, `/whats-new`, and `/dev/*` for dev-only routes. The `/dev/*` routes are absent from the study build.
- Phase 1 implements `/` and a placeholder `/dev` only.
- Lesson, step and item IDs are frozen once shipped (CONT-06), so the URL shape cannot drift.

Reversibility: costly - the router choice is swappable now, but the URL shape is one-way once lessons ship.

## Consequences

- Good: code splitting per lesson, a well-known API, loaders available when a data need appears.
- Good: a stable URL contract that content and progress storage can rely on.
- Bad: type-safe search params are weaker than in TanStack Router, so lesson-step deep links need hand-written parsing.
- Bad: the URL shape is a one-way door once the first lesson ships.

## Alternatives

- React Router framework mode: rejected. It is a Next-like SSR layer, which ADR 0001 rules out.
- TanStack Router 1.x: equally viable and offers type-safe search params; rejected to keep one well-known API.

Sources: `.claude/CLAUDE.md` Technology Stack, `01-CONTEXT.md`, `01-RESEARCH.md`.
