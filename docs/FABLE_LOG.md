# Fable escalation log

Claude Fable 5.2 (`claude-fable-5-2`, medium effort) is the most expensive model and has tight usage limits. It is a rare escalation for high-level research only, never a default. Source: `NEW_PROJECT_INPUT.md` section 5.1.

GSD never routes to Fable. `.planning/config.json` has no `fable` value anywhere, and `scripts/verify/routing.ts` checks that. Fable runs only by hand, through the protocol below.

## What Fable may be used for

Four cases, all high-level research:

- The final synthesis of the Phase 0 research (master concept map and curriculum), but only if Opus's synthesis was reviewed and found shallow, inconsistent, or missing major connections.
- A deep contradiction Opus could not resolve, for example sources that disagree on how EPV, pitch control, OBV or VAEP work, or conflicting readings of FIFA RSTP, loans, solidarity or PL SCR/SSR rules.
- A hard research question with no clear free source, where Opus already tried and returned a weak or uncertain answer (logged in `research/GAPS.md`).
- A once-per-major-milestone big-picture review: is the curriculum still complete and correctly ordered for the sporting-director goal?

## What Fable is never used for

Writing code, building components, writing or editing lessons, design work, tests, data pipelines, routine research sub-agents, fact checks Opus can do, formatting, or any sub-agent fan-out. Never run Fable in parallel waves.

## The escalation protocol

All four steps are required, in order.

1. Opus tries first. Its output is saved.
2. An Opus reviewer writes one paragraph in this file on why that output is not good enough.
3. The task is scoped to one clear question, with only the inputs it needs (summaries, not raw dumps), to keep the cost low.
4. Fable runs at medium effort. Its result and a one-line "was it worth it?" verdict go into this file.

## Budget cap

At most 3 per milestone (3 Fable tasks per milestone). Going over needs the learner's approval first.

If Fable's usage limit is hit, fall back to Opus, mark the item "needs Fable later", and continue. Never block the build waiting for Fable.

## Log

| Date | Milestone | Question | Why Opus was not enough | Result | Worth it? |
|------|-----------|----------|-------------------------|--------|-----------|
