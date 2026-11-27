# 0004. Vercel Deployment Protection scope: All Deployments with Vercel Authentication

Date: 2026-11-27

## Status

Accepted

The learner delegated this decision for the autonomous Phase 1 run. No Vercel action happens in Phase 1.

## Context

- The brief requires Deployment Protection to stay on and treats a public deployment as out of scope.
- Vercel's Standard Protection protects everything except production domains, so the production URL would be public.
- Vercel Authentication is available on all plans, including Hobby, with no paid add-on.
- Password Protection is a paid Pro add-on (about 20 USD per month per project), not available on Hobby.
- The learner logs in to Vercel and `gh` themselves; Claude never handles passwords.

## Decision

- Set the protection scope to All Deployments with Vercel Authentication, so the production domain and every generated URL are gated.
- Add `vercel.json` with the SPA rewrite `{"source": "/(.*)", "destination": "/index.html"}`; the output directory is `dist`.
- Deploy and the curl proof that an unauthenticated request is refused belong to Phase 5, where the learner logs in to Vercel.
- Keep licensed or raw data out of `dist`; a CI check will enforce that in a later phase.

Reversibility: costly - a wrong scope silently makes production public.

## Consequences

- Good: nothing the learner studies is reachable without a Vercel login.
- Good: works on a free plan.
- Bad: automated tests against a protected preview need the Protection Bypass for Automation secret sent as a header. Prefer running E2E against local `vite preview` and use the Vercel preview for human review only.
- Bad: sharing a preview with someone outside the Vercel team needs an explicit invite.

## Alternatives

- Standard Protection: rejected. The production domain stays public.
- Password Protection: rejected. It is a paid add-on and not on Hobby.
- Public deployment: rejected. It is out of scope in the brief.

Sources: `.claude/CLAUDE.md` Technology Stack (decision 11), `01-CONTEXT.md`, `01-RESEARCH.md`.
