# Phase 5: Content Engine, App Shell & Deploy - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-28
**Phase:** 05-content-engine-app-shell-deploy
**Mode:** --auto (learner delegated every grey area; recommended option chosen each time)
**Areas discussed:** lesson format, validator, claim components, interaction registry, walker and gates, frozen IDs, verification records and roles, app shell, deploy and protection

## Auto-selected choices

| Area | Question | Selected | Alternatives not taken |
|------|----------|----------|------------------------|
| Lesson format | Layout | `content/tracks/<t>/<c>/<lesson>/lesson.{mdx,json}` | flat `content/<lesson>.mdx`; frontmatter-only spec |
| Lesson format | Spec source of truth | JSON Schema v1 + Zod mirror + parity test | Zod only; Velite/Content Collections |
| Lesson format | MDX↔steps | `<Step id>` wrapper matched to spec order | headings as steps; separate files per step |
| Validator | Form | Node script + pure rule module, pre-commit + existing CI | remark lint plugin; new required check |
| Validator | Bare numbers | prose digits need a claim component or `<Num kind>` | warn-only; allow all years |
| Claims | Regulation dates | additive `effective_date`/`as_of` on registry | per-lesson dates |
| Registry | Oracle location | `tests/oracles/<id>.ts` with `complete`/`assertDone` | inline in component; per-lesson tests |
| Walker | Where | inside required `build` job on preview bundle | new `e2e` job (would need branch-protection change); dev server |
| Frozen IDs | Mechanism | `content/frozen.lock.json` + `check-frozen --base origin/main` | git-diff heuristics |
| Verification | Record | `verification.json`, verifier ≠ author, content hash, excerpt hash | PR comment; free-text log |
| Shell | Next action pre-progress | first shipped lesson with prerequisites met, `nextAction()` | list of all lessons |
| Shell | What's new | `content/whats-new.json` | git log; CHANGELOG.md |
| Deploy | Hard block? | no: `vercel whoami` already signed in; dashboard-only step becomes learner checkpoint | stop and ask |
| Deploy | Proof | `smoke-protection.ts` on prod + PR preview, 401/403/login redirect | manual check |

## Claude's Discretion

- Perf-budget numbers, visual details of source chips/step frame/shell, fixture lesson content.

## Deferred Ideas

- Phase 6 runtime/progress features; real lessons (Phases 7–8); preview bypass; CSP if not cheap now.
