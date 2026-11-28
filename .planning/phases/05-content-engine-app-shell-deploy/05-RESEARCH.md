# Phase 5: Content Engine, App Shell & Deploy - Research

**Researched:** 2026-11-28
**Domain:** MDX lesson-as-data engine, content validation (mdast), Playwright walker and quality gates, Vercel deploy with Deployment Protection
**Confidence:** HIGH for stack, repo integration points and Vercel API/CLI surface; MEDIUM for perf-budget numbers and the exact unauthenticated Vercel response

## Summary

Every library this phase needs is already decided in `.claude/CLAUDE.md` or `05-CONTEXT.md`. The registry and the legitimacy gate confirm them: MDX 3.1.1 (`@mdx-js/rollup`, `@mdx-js/react`, `@mdx-js/mdx`), `@types/mdx` 2.0.14, `@axe-core/playwright` 4.14.1 and `@dnd-kit/react` 0.5.3. None has an install script. Two are flagged `too-new` only (published within days, 3M to 26M downloads a week, official repos). The real planning risk is integration, not the stack:

1. The validator and the browser must count words the same way.
2. Drafts and fixtures must be kept out of the study and Vercel bundles. A runtime filter is not enough, because `import.meta.glob` still emits a chunk for every lesson.
3. The walker must run inside the existing required `build` job, and that job has no browser.
4. The Vercel project must have its protection set to `all` before the first deploy.

A live probe this session showed what the validator can lean on. `createProcessor().parse()` from `@mdx-js/mdx` 3.1.1 returns `mdxJsxFlowElement` and `mdxJsxTextElement` nodes with line positions. Expression attributes carry an estree (`sides={[…]}` gives an `ArrayExpression`). `mdxjsEsm` and `mdxFlowExpression` nodes appear too, and `compile()` accepts them without complaint. So the validator must forbid ESM and expressions itself. MDX is code.

Vercel facts, read from the docs this session: "Protecting all deployments is available on all plans". "Vercel Authentication is available on all plans". `PATCH /v9/projects/{idOrName}` with `{"ssoProtection":{"deploymentType":"all"}}` is "All Deployments". The installed CLI 63.1.2 has `vercel api` (authenticated REST calls with the stored login, so Claude never touches a token), `vercel project create`, `vercel project protection [--json]`, `vercel git connect` and `vercel ls --environment`. No Vercel project named `the-next-klopp` exists yet (`vercel project protection the-next-klopp --json` answered `project_not_found`).

**Primary recommendation:**
- Build a pure content core in `scripts/lib/content/`. It is erasable TypeScript, has no React, and is shared by the validator, a small Vite virtual-module plugin and the walker.
- Parse MDX with `@mdx-js/mdx` `createProcessor().parse()`, so the validator sees exactly what the build sees.
- Run the walker from a separate `playwright.walker.config.ts`, against `vite preview` of a fixtures build on port 4174, inside the `build` job running in the pinned Playwright container.
- Create the Vercel project, PATCH `ssoProtection` to `all` and read it back, and only then connect Git and deploy.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

The learner delegated every grey area and checkpoint to Claude for this autonomous run ("choose all the recommended choices and close every grey area… even if there is human need you need to do it by yourself unless there are hard blocks"). Every answer below is the recommended option.

#### Lesson file format and layout (CONT-01)
- [auto] Q: "Where do lessons live?" → Selected: `content/tracks/<track-id>/<chapter-id>/<lesson-id>/lesson.mdx` + `lesson.json` (+ optional `verification.json`). Track and chapter ids come from `research/curriculum-config.json` / `concept-map.json` (e.g. `t00`). Fixture lessons live in `content/_fixtures/<lesson-id>/` and are never part of the study build.
- [auto] Q: "Spec schema source of truth?" → Selected: `schemas/lesson.schema.json` (JSON Schema, frozen v1 like `scene.schema.json`) with a Zod mirror in `src/schemas/`, and a parity test, following the Phase 3 Scene pattern. — **Reversibility:** costly — every lesson file conforms to it; v1 frozen, later changes additive.
- [auto] Q: "What does the spec hold?" → Selected: `id`, `version`, `title`, `track`, `chapter`, `concepts[]` (concept-map ids), `prerequisites[]` (lesson ids), `durationMin` (5–12), `effort` (low/normal), `status` (`draft` | `review` | `shippable` | `shipped`), `author`, `roles[]`, `competencies[]`, `template` (one of the 7 DESIGN.md §6 templates), `steps[]` (each: stable `id`, `stage` of the Lesson Loop, `screen` anchor in the MDX, `interaction?` registry id + props, `dataRefs[]`), `quiz[]` (stable item ids, type, answer key), `sources[]` (registry ids), `dataRefs[]` (`<dataset>/<version>/<file>` pinned), `shippedAt?`.
- [auto] Q: "How does MDX map to steps?" → Selected: MDX uses a `<Step id="…">` wrapper per screen; each `<Step>` id must match a `steps[].id` in the spec in the same order. Word count, stage order and claim rules are computed per `<Step>`. Lesson components come through `MDXProvider` (no imports in lesson files).
- [auto] Q: "Lesson Loop stages?" → Selected: the PROJECT.md loop, exact and ordered: `hook` → `see` → `touch` → `predict` → `reveal` → `do` → `lock-in` → `connect`. Every stage appears at least once; stages may repeat (e.g. two `touch` steps) but never go backwards.

#### Validator (CONT-02)
- [auto] Q: "Form of the validator?" → Selected: `scripts/validate-content.ts` (Node, `node file.ts` like other scripts, pure rule module in `scripts/lib/content/` with Vitest tests), `npm run validate`, wired into the pre-commit hook and the existing required `test`/`guards` CI path (no new required check — ADR 0007's six stay). Exit non-zero, one line per break: `<file>:<line> <rule-id>: <plain-English fix>`.
- [auto] Rules (one id each, each with a failing fixture under `content/_fixtures/invalid/`):
  - `screen-words`: > 60 words of visible prose in a `<Step>` (claim component text counts; code, alt text and component props do not).
  - `loop-stage`: missing stage or backwards order.
  - `citation`: any `source=`/spec `sources[]` id not in `research/SOURCE_REGISTRY.json` (aliases via `SOURCE_ALIASES.json` resolve).
  - `prereq-cycle`: cycle in lesson prerequisites (also checks every prerequisite id exists).
  - `data-ref`: a data ref that does not resolve to a published artifact with a matching manifest version, or that points at a local-only dataset (ADR 0008) in a shippable lesson.
  - `bare-number`: a digit run in prose outside a claim component. Allowed without a source: formation strings (`4-3-3`, `4-2-3-1`), numbers inside `<Num kind="…">` with `kind` in a small closed list (`shirt`, `ordinal`, `formation`, `time-in-lesson`, `count-on-screen`), step headings' ordinals. Everything else needs `<Fact|Stat|Rule|Contested>`.
  - plus structural rules: schema, MDX↔spec step parity, unknown interaction id, invalid interaction props (registry schema), unknown role/competency/concept id, duration 5–12.
- [auto] Q: "Shippable gate location?" → Selected: same validator; `status: shippable|shipped` additionally requires `verification.json` (below) and non-empty `roles[]` + `competencies[]`.

#### Claim components (CONT-05)
- [auto] Q: "How do claims bind?" → Selected: `<Fact source="reg-id">`, `<Stat source="reg-id" | data="dataset/version/file#field" value unit>`, `<Rule source="reg-id" law="…">` (regulation: shows effective date and as-of date from the registry entry; validator fails a `<Rule>` whose source lacks `effective_date`/`as_of`), `<Contested sides=[{claim, source}…]>` (≥2 sides each sourced, labelled "contested"). Rendered with a visible source chip that opens the registry entry (title, publisher, licence, URL); never silent.
- [auto] Q: "Registry shape gaps?" → Selected: add optional `effective_date` and `as_of` to the registry schema additively (Phase 2 froze 218 entries; additive fields only).

#### Interaction registry (CONT-03)
- [auto] Q: "Registry form?" → Selected: `src/interactions/registry.ts` — each entry: `id`, Zod `props` schema, lazy `component`, `fallback` component (keyboard/screen-reader path that teaches the same thing without drag/animation), and `oracle` (a Playwright-side module `tests/oracles/<id>.ts` with `complete(page, props)` and `assertDone(page)`). A registry test fails when any entry lacks one of the three.
- [auto] Q: "Which interactions now?" → Selected: wrap what exists (pitch scene playback, drag-a-player, converter probe) plus the minimum the walker and fixture need: `quiz-choice`, `predict-then-reveal`, `order-sequence`. Real lesson interactions arrive in Phases 7–8 and must register the same way.

#### Generic walker and quality gates (CONT-04, QA-03, QA-05)
- [auto] Q: "How does the walker discover lessons?" → Selected: a build-time lesson manifest (generated by the validator: id, route, steps, interactions, quiz keys) read by one spec `tests/walker/walker.spec.ts`; it iterates every lesson in the manifest whose status is `shipped`/`shippable` plus the fixtures; for each step it calls the registered oracle, answers quiz items from the spec keys, and advances. No per-lesson test code; adding a lesson needs no test edits.
- [auto] Q: "Checks per lesson?" → Selected: axe (`@axe-core/playwright`, WCAG 2.2 AA tags, zero violations), keyboard-only full pass (walk again with keyboard only using each interaction's fallback), reduced-motion pass (`reducedMotion: 'reduce'`, assert no running CSS animations/transitions > 0 ms beyond tokens' reduced values), contrast (axe color-contrast + the Phase 4 palette gate), performance budget (per-lesson route JS ≤ budget from `perf-budget.json` checked on the built chunks, plus runtime LCP and long-task total measured in preview). Budget numbers set by research and recorded in DESIGN.md §8.
- [auto] Q: "Where does it run?" → Selected: against `vite build && vite preview` (production bundle, fixtures build) on a fixed non-5173 port, as steps inside the existing required `build` CI job (after the build), so merge is blocked by a check already in branch protection and ADR 0007's six required checks stay unchanged. Local: `npm run e2e`.
- [auto] Q: "Frozen IDs (CONT-06)?" → Selected: `content/frozen.lock.json` (lesson ids, step ids, quiz item ids, data artifact versions for every `shipped` lesson), regenerated by `npm run content:freeze` when a lesson ships; `scripts/check-frozen.ts --base origin/main` fails CI on any removal, rename or version change of a frozen entry (additions pass). Mirrors the Phase 3 `check-immutable` pattern and runs in the guards path.

#### Verification records and roles (QA-01, QA-04)
- [auto] Q: "Verification record format?" → Selected: `verification.json` next to the lesson: `lessonId`, `lessonVersion`, `contentSha256` (hash of mdx+json at verification), `author` (agent/run id), `verifier` (must differ from author), `verifierModel` (Opus required when the lesson has metrics, regulations or finance claims, flagged by claim type), `verifiedAt`, `claims[]` each `{claimId, sourceId, url, fetchedAt, excerptSha256, excerpt (≤ 25 words paraphrase-safe quote), verdict: supported|unsupported|contested}`. Validator rejects shippable when the record is missing, verifier == author, hash is stale, or any claim is unsupported.
- [auto] Q: "Who verifies in this run?" → Selected: a separate `gsd`-spawned verifier sub-agent (fresh context, never the authoring agent) fetches the source and writes the record; for Phase 5 only fixture lessons are verified, proving the path.
- [auto] Q: "Role-coverage report?" → Selected: `npm run report:roles` → `docs/reports/role-coverage.md` (+ `.json`): for each of the 15 roles and 49 competencies, lessons that serve it by status; generated, `--check` mode in CI.

#### App shell (PLAT-02)
- [auto] Q: "Home next action before progress exists?" → Selected: one primary button "Start: <lesson title>" pointing to the first shipped lesson in curriculum order whose prerequisites are met; Phase 6 swaps the selector for real progress (single function `nextAction()` with a test). Calm home: one action, nothing competing (ADHD rule).
- [auto] Q: "Navigation?" → Selected: `/tracks` → `/tracks/:trackId` (chapters) → `/tracks/:trackId/:chapterId` (lessons) → `/learn/:lessonId` (lesson runtime with step frame). Built from `curriculum-config.json` + the lesson manifest; tracks with no shipped lessons show as "coming next" (rolling release), never as broken links.
- [auto] Q: "What's new source?" → Selected: `content/whats-new.json` (date, title, lesson ids, one-line summary), validated, rendered at `/whats-new`; the validator requires an entry when a lesson flips to `shipped`.
- [auto] Q: "Draft visibility?" → Selected: `npm run study` and the Vercel build include only `shipped` lessons (plus nothing from `_fixtures`); `npm run dev` shows drafts with a status badge. Implemented as a build-time filter on the manifest (ADR 0005 promised it here). The walker runs against a dedicated preview build that includes fixtures (env flag `VITE_INCLUDE_FIXTURES=1`, never set in study/Vercel).
- Shell uses Phase 4 primitives and tokens only (DESIGN.md); screens pass `npm run review:screens`.

#### Deploy and protection (PLAT-03, PLAT-04)
- [auto] Q: "Is Vercel a hard block?" → Selected: no — `vercel whoami` already returns the learner's account (CLI logged in by the learner). Claude uses the CLI only; never handles credentials. If a dashboard-only setting can't be set by CLI/API, that single step is the learner checkpoint.
- [auto] Q: "How is the project linked?" → Selected: Vercel project linked to the GitHub repo (Git integration) so PRs get preview URLs; framework preset Vite, build `npm run build:vercel` (= build + `check-bundle` deny-manifest gate, so the deployed build fails on licensed data), output `dist`, `vercel.json` with SPA rewrite.
- [auto] Q: "Protection setting?" → Selected: Deployment Protection → Vercel Authentication, scope "All Deployments" (ADR 0004), set via the Vercel API/CLI if possible, else the learner checkpoint; verify by reading the project config back.
- [auto] Q: "Proof?" → Selected: `scripts/smoke-protection.ts` (`npm run smoke:protection -- <url>…`): unauthenticated GET to the production URL and a PR preview URL must return 401/403 or a redirect to Vercel login, never 200 with app HTML; also checks a deep link and `/data/catalog.json`. Results recorded in `05-VERIFICATION.md`. No bypass secret is committed; E2E stays on local preview (ADR 0004).
- [auto] Q: "Deny-manifest in deploy?" → Selected: reuse Phase 3 `check-bundle.ts` (deny globs, markers, unlisted data, `DEV_ONLY_MARKERS`) in `build:vercel`; add a test proving the Vercel build command fails when a denied file is in `dist/`.

#### Decided autonomously
- [Layout] lesson runtime route `src/routes/learn/`, shell routes `src/routes/{home,tracks,whats-new}`, content engine `src/content/` (loader, manifest, MDX components), scripts `scripts/content/` + `scripts/lib/content/` — cheap to move.
- [Tooling] `@axe-core/playwright` 4.14.1 exact pin (CLAUDE.md stack), MDX stack per CLAUDE.md (`@mdx-js/rollup` 3.1.1 `enforce: 'pre'`, `remark-frontmatter`, `remark-mdx-frontmatter`, local `mdx.d.ts`); new deps go through the Phase 4 legitimacy gate.
- [Process] Order: schema + validator → claim components + registry → MDX loader + lesson runtime frame + fixture → walker + gates → frozen IDs + verification + role report → shell → Vercel deploy + protection proof.

### Claude's Discretion
- Exact perf-budget numbers (research to propose, recorded in DESIGN.md §8).
- Visual design of source chips, step frame and shell within DESIGN.md.
- Fixture lesson content (must be short, factually trivial, fully sourced from existing registry entries).

### Deferred Ideas (OUT OF SCOPE)
- Lesson Loop runtime polish, glossary, focus mode, confusion button, progress, FSRS — Phase 6.
- Real curriculum lessons — Phases 7–8.
- Vercel protection bypass for running E2E against previews — not needed (ADR 0004).
- CSP header (Phase 4 W-3) — could ride in `vercel.json` headers now; planner may include it if cheap, else later.

### Approved UI contract
`05-UI-SPEC.md` (status `approved`, 2026-11-28) is binding for the screens, copy, the stage-to-rail mapping, the fixture lesson `fx-a-goal-in-ten-actions` and terminal copy. This research does not change it. It adds three implementation constraints the UI spec implies (Pitfalls 1, 2 and 5).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONT-01 | Each lesson is an MDX file plus a JSON spec | Lesson schema pattern (JSON Schema + Zod + dual-validator test, Pattern 3); virtual lessons module (Pattern 1); `@mdx-js/rollup` config (Code Example 1) |
| CONT-02 | Validator blocks shipping on 60 words, loop stage, citation, prereq cycle, data ref, bare number | mdast parsing verified live (Pattern 2); word-count parity rules (Pitfall 1); bare-number algorithm (Pattern 4); ESM/expression ban (Security) |
| CONT-03 | Interaction registry: props schema, a11y fallback, test oracle | Split registry: pure-Zod `schemas.ts` plus React `registry.ts` (Pitfall 4); typed oracle drivers (Pattern 6) |
| CONT-04 | Generic walker completes every shipped lesson, no per-lesson code | Manifest-parametrised spec, separate walker config, port 4174 (Pattern 5); CI container (Pitfall 3) |
| CONT-05 | `<Fact>`, `<Rule>`, `<Stat>`, `<Contested>` bind to registry or pipeline outputs; regulations show dates | `as_of` already required; only `effective_date` is new, and it goes through `build-registry` (Pitfall 6); claim id derivation (Pattern 7) |
| CONT-06 | Shipped IDs and data versions frozen, additive-only | `check-frozen.ts` dependency-free, mirrors `check-immutable.ts` (Pattern 8) |
| PLAT-02 | Home with one next action, track/chapter nav, What's new | Manifest-driven routes; `nextAction()` pure function; UI-SPEC screens |
| PLAT-03 | Deployed to the learner's Vercel with "All Deployments"; smoke proves not public | Vercel sequence with protection before the first deploy (Pattern 9); smoke classifier (Pattern 10) |
| PLAT-04 | No licensed raw data in the deployed bundle | `build:vercel` = `vite build` + `check-bundle.ts`; add fixture and draft leak markers (Pattern 1) |
| QA-01 | Separate verifier checks every claim against fetched source text | `verification.json` design: hash excludes `status`, reuse `excerptSha256`, claim-set equality (Pattern 7) |
| QA-03 | axe, keyboard, reduced motion, contrast, perf budget | Axe tags verified; keyboard driver; `getAnimations()`; perf numbers (Perf Budget section) |
| QA-04 | Role and competency tags; coverage report | Ids from `research/roles.json` (15) and `research/competencies.json` (49); `--check` generator |
| QA-05 | E2E for every shipped lesson passes before merge; shipped chapters never break | Walker inside the required `build` job; frozen check in `guards` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Stack is locked: TypeScript 7.0.2 (`tsc` only), React 19.3.1, Vite 8.4.0 SPA (not Next), React Router 8.5.3 data router in library mode, Tailwind 4 `@theme`, `motion` 14, Zod 4.6.7, `@mdx-js/rollup` 3.1.1 with `enforce: 'pre'`, Playwright 1.65.1, Vitest 5.1.2, Biome 2.6.9. No typescript-eslint.
- Do not use `gray-matter` or Contentlayer. Use no content-layer framework (Velite, Content Collections, fumadocs). Write your own validator.
- Use `@dnd-kit/react` 0.5.3 only for sortable lists. Never use `@dnd-kit/core` or `@use-gesture` for SVG pitch drag.
- Windows: run scripts as `node file.ts` (erasable TS only: no enums, namespaces or parameter properties). Do not use `make`. Do not chain shell-specific `cp`/`rm`. Write file ops in TS. Quote every path, because the project path `E:\To become new klop` has spaces. Use forward slashes in globs.
- E2E runs against `vite build && vite preview`, not the dev server. Visual baselines are Linux CI only.
- Use Vercel "All Deployments" with Vercel Authentication. Never use Standard Protection. Do not enable COOP/COEP.
- Security: never handle the learner's passwords or tokens. No secrets in the repo. The learner logs into Vercel and `gh` themselves.
- Traceability: every factual claim traces to the source registry. Contested topics are labelled contested.
- Design: no AI-slop; follow DESIGN.md strictly.
- Rolling release: never break a shipped chapter; E2E must pass before merging.
- GSD workflow: edits only through GSD commands. Repo is PUBLIC (`gh repo view` answered `"visibility":"PUBLIC"` this session): write no learner personal details anywhere, including Vercel team slugs in docs.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Lesson schema + rule checks (CONT-01/02) | Build tooling (Node scripts, `scripts/lib/content/`) | CI (`test` job) | Content is validated before it ships; nothing runs on a server |
| Draft/fixture filtering | Build (Vite virtual module) | — | Must be decided at bundle time so excluded lessons emit no chunk |
| Lesson rendering, claim chips, interactions | Browser / Client (React SPA) | CDN/Static (Vercel serves `dist`) | Static SPA; all logic client side (ADR 0001) |
| Source registry lookup for chips | Browser (eager JSON slice of the registry, bundled) | Build (validator guarantees ids resolve) | No API; the cited entries ship as static data |
| Data-bound `<Stat>` | Browser (fetch `/data/<dataset>/<version>/…`) | Static (`public/data`) | Pipeline output is static, versioned files |
| Walker, axe, keyboard, perf | CI (Playwright in the `build` job) | Local (`npm run e2e`) | Gates live in a required check |
| Frozen IDs, role report | CI (`guards` and `test` jobs) | Pre-commit | Git-history comparison; no runtime part |
| Access control (protection) | Vercel edge (Deployment Protection) | — | The app has no auth; Vercel gates every URL before the app is served |
| Deny-manifest gate | Build (`build:vercel`, `check-bundle.ts`) | CI `build` job | Fails the deploy itself, not only the PR |

## Standard Stack

### Core (new in Phase 5)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@mdx-js/rollup` | 3.1.1 (modified 2025-08-29) [VERIFIED: npm registry] | Compile `lesson.mdx` in the Vite build | Locked by CLAUDE.md; smoke-built under Vite 8/Rolldown [CITED: .claude/CLAUDE.md "How this was verified"] |
| `@mdx-js/react` | 3.1.1 [VERIFIED: npm registry] | `MDXProvider` / `useMDXComponents` (`providerImportSource`) | Locked ("Lesson components come through MDXProvider") |
| `@mdx-js/mdx` | 3.1.1 [VERIFIED: npm registry] | `createProcessor().parse()` in the validator, the same parser as the build | Exact parse parity, so the build and the validator cannot disagree on what a lesson is. Already a dependency of `@mdx-js/rollup`; declare it directly |
| `@types/mdx` | 2.0.14 [VERIFIED: npm registry] | `*.mdx` module types, `MDXComponents` | Official types per mdxjs.com [CITED: mdxjs.com/docs/getting-started] |
| `@axe-core/playwright` | 4.14.1 (published 2026-11-24) [VERIFIED: npm registry] | axe scans in the walker | Locked exact pin; peer `playwright-core >= 1.0.0` |
| `@dnd-kit/react` | 0.5.3 (published 2026-10-31) [VERIFIED: npm registry] | `order-sequence` pointer drag only | Locked in UI-SPEC; peer React `^18 \|\| ^19` |

### Supporting (optional per the CONTEXT lock)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `remark-frontmatter` | 5.0.0 [VERIFIED: npm registry] | Parse a YAML block so it never renders as text | CONTEXT names it. **Recommendation:** lessons carry no frontmatter (the spec JSON is the single metadata source), and the validator fails any `yaml` node (`no-frontmatter`). Register the plugin so a stray block is caught instead of rendered. |
| `remark-mdx-frontmatter` | 6.0.0 (2026-09-23) [VERIFIED: npm registry] | Export frontmatter as an ESM const | Only if the planner keeps frontmatter. With the recommendation above it is unused; the planner may drop it. Open Question 1. |
| `unist-util-visit` | 5.2.0 [VERIFIED: npm registry] | Tree walk in the validator | Already transitive via `@mdx-js/mdx`. Declare it, or write a 10-line recursive walk |

Not needed as direct dependencies: `remark-parse` 11.0.0, `remark-mdx` 3.1.1 and `unified` 11.0.5. They come deduped under `@mdx-js/mdx` [VERIFIED: `npm ls` in a scratch probe this session: `remark-mdx@3.1.1`, `remark-parse@11.0.0`, `unified@11.0.5 deduped`].

Already installed and reused: `@playwright/test` 1.65.1, `zod` 4.6.7, `ajv` 8.20.0 (dual-validator test), `@base-ui/react` 1.9.0, `react-router` 8.5.3, `motion` 14.14.0 [VERIFIED: package.json read this session].

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `createProcessor().parse()` | `unified().use(remarkParse).use(remarkMdx)` | Same nodes (both verified live). Separate packages can drift from the build's copy, so prefer the build's own processor |
| Vite virtual module for lesson loaders | Plain `import.meta.glob('/content/**/lesson.mdx')` + runtime status filter | The glob emits a chunk for every draft, so drafts would sit in `dist/` on Vercel. Rejected for the study and Vercel builds |
| Walker in a separate config | A third project in `playwright.config.ts` | `webServer` entries start for every project. The walker needs a preview server on 4174 and the other specs a dev server on 5173, so one config would boot both every time |
| Playwright container for the `build` job | `npx playwright install --with-deps chromium` | Downloads a browser and apt packages on every run. The container pins the browser to the same 1.65.1 image the `visual` job already uses |
| Static `.vite/manifest.json` budget | Resource Timing in the walker + gzip of the dist files | Use the walker for "JS a lesson actually loads" and the manifest only in the fixtures build (not deployed) for per-chunk caps |

**Installation (exact pins, after the identity gate):**
```bash
npm install --save-exact @mdx-js/rollup@3.1.1 @mdx-js/react@3.1.1 @mdx-js/mdx@3.1.1 @dnd-kit/react@0.5.3
npm install --save-exact --save-dev @types/mdx@2.0.14 @axe-core/playwright@4.14.1 remark-frontmatter@5.0.0
# optional, only if frontmatter is kept: remark-mdx-frontmatter@6.0.0
```
Decide which packages are runtime dependencies. `@mdx-js/react` and `@dnd-kit/react` are imported by app code. `@mdx-js/rollup` and `@mdx-js/mdx` are build and validator tools and go in devDependencies. CI `lint` runs `npm audit --omit=dev --audit-level=high`, so keep the runtime set small.

## Package Legitimacy Audit

Ran `gsd-tools query package-legitimacy check --ecosystem npm …` and `npm view <pkg>@<ver> license repository.url scripts.{pre,,post}install` this session.

| Package | Registry | Age (this version) | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| @mdx-js/rollup 3.1.1 | npm | 15 mo | 1.11M | github.com/mdx-js/mdx | OK | Approved |
| @mdx-js/react 3.1.1 | npm | 15 mo | 31.1M | github.com/mdx-js/mdx | OK | Approved |
| @mdx-js/mdx 3.1.1 | npm | 15 mo | 15.8M | github.com/mdx-js/mdx | OK | Approved |
| remark-frontmatter 5.0.0 | npm | 3 yr | 8.6M | github.com/remarkjs/remark-frontmatter | OK | Approved |
| remark-mdx-frontmatter 6.0.0 | npm | 2 mo | 1.59M | github.com/remcohaszing/remark-mdx-frontmatter | OK | Approved (optional) |
| unified 11.0.5 / remark-parse 11.0.0 / remark-mdx 3.1.1 | npm | 1.5–3 yr | 18M–89M | unifiedjs / remarkjs / mdx-js | OK | Transitive; no direct install needed |
| unist-util-visit 5.2.0 | npm | 1 mo | 105M | github.com/syntax-tree/unist-util-visit | OK | Approved |
| @types/mdx 2.0.14 | npm | 6 mo | 36.4M | DefinitelyTyped | OK | Approved |
| @axe-core/playwright 4.14.1 | npm | 4 days | 25.9M | github.com/dequelabs/axe-core-npm | SUS (`too-new` only) | Flagged: planner keeps the Phase 4 automated identity gate (name, version, MPL-2.0 licence, repo URL, no install scripts, `npm audit signatures`) before install |
| @dnd-kit/react 0.5.3 | npm | 4 weeks | 3.1M | github.com/clauderic/dnd-kit | SUS (`too-new` only) | Flagged: same identity gate |

No install scripts on any package (`scripts.postinstall`, `install` and `preinstall` are empty for all 12) [VERIFIED: npm view].
**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** `@axe-core/playwright`, `@dnd-kit/react`, for recency only. Phase 4 set the precedent: the orchestrator accepted an automated identity gate in place of a human pause (`04-04-SUMMARY.md`: "identity gate: all 13 ok"). Use the same gate here and log it in `docs/SETUP.md` "Package legitimacy".

## Architecture Patterns

### System Architecture Diagram

```
 AUTHORING                       BUILD / CI                                    RUNTIME (browser)                 EDGE
 ─────────                       ──────────                                    ─────────────────                 ────
 content/tracks/…/lesson.mdx ─┐
 content/tracks/…/lesson.json ┼─► scripts/lib/content (pure core) ──────┐
 content/_fixtures/…           │     ├ parse MDX (createProcessor.parse) │
 verification.json ────────────┤     ├ schema (Zod mirror of lesson v1)  │
 research/SOURCE_REGISTRY.json ┤     ├ rules: words, stages, citation,   │
 public/data/catalog.json ─────┤     │   prereq graph, data-ref,         │
 src/interactions/schemas.ts ──┘     │   bare-number, claims, shippable  │
                                      └ buildManifest()                  │
            │                                  │                         │
            ▼                                  ▼                         ▼
  npm run validate ── fail? ─► one line per break, exit 1        content/lesson-manifest.json (committed, --check)
            │ ok                                                           │
            ▼                                                              │
  vite build ── Vite plugin "virtual:tnk-lessons" ──► includes lessons by mode:
            │      dev: all + fixtures? no | study/Vercel: shipped | fixtures build: shipped+shippable+_fixtures
            ▼
     dist/ (study, Vercel)   dist-walker/ (fixtures, CI only)
            │                        │
            ▼                        ▼
  check-bundle.ts (deny,      vite preview :4174 ──► Playwright walker (manifest-parametrised)
  markers, dev/fixture/        │   per lesson: pointer pass ─ oracle.complete/assertDone per step
  draft leak)                  │               axe (wcag2a/2aa/21a/21aa/22aa) per screen
            │                  │               keyboard pass (?fallback=1, KeyboardDriver only)
            │                  │               reduced-motion pass (getAnimations)
            │                  │               perf: LCP, long tasks, CLS, JS gz from dist files
            ▼                  ▼
   Vercel build (npm run build:vercel) ─► dist ─► Vercel CDN ─► Deployment Protection (ssoProtection: all)
                                                                    │ unauthenticated: 401/redirect to login
                                                                    │ authenticated Vercel user: SPA
                                                                    ▼
                                                     index.html ─► router ─► /learn/:id
                                                       eager: manifest, registry slice ─► LessonFrame (title, rail)
                                                       lazy: lesson MDX chunk ─► <MDXProvider components> ─► Steps
                                                       lazy: interaction chunk ─► InteractionSlot (main | fallback)
 Guards (CI guards job, no npm ci): check-frozen.ts (git show base:content/frozen.lock.json vs HEAD lock + specs)
```

### Recommended Project Structure
```
content/
├── tracks/<track-id>/<chapter-id>/<lesson-id>/{lesson.mdx,lesson.json,verification.json}
├── _fixtures/fx-a-goal-in-ten-actions/{lesson.mdx,lesson.json,verification.json}
├── _fixtures/invalid/<rule-id>/{lesson.mdx,lesson.json}   # one per rule, validator tests only
├── whats-new.json
├── frozen.lock.json
└── lesson-manifest.json              # generated by validate --write, checked with --check
schemas/lesson.schema.json, verification.schema.json, whats-new.schema.json (+ fixtures)
src/schemas/lesson.ts                 # Zod mirrors (add to contractSchemas for the dual-validator test)
src/content/{manifest.ts, loader.ts, nextAction.ts, mdx/*, runtime/*}
src/interactions/{schemas.ts (pure Zod, no React), registry.ts (React), <id>/…}
tests/oracles/<id>.ts                 # complete() / assertDone() per interaction
tests/walker/{walker.spec.ts, drivers.ts, perf.ts}
playwright.walker.config.ts
scripts/lib/content/{parse.ts, words.ts, rules/*.ts, manifest.ts, hash.ts, frozen.ts}
scripts/validate-content.ts, scripts/check-frozen.ts, scripts/content/{freeze.ts, build-fixtures.ts, role-report.ts}
scripts/smoke-protection.ts
deploy/vercel-protection.json         # {"ssoProtection":{"deploymentType":"all"}}
vercel.json
```

### Pattern 1: Build-time lesson selection through a virtual module
**What:** A ~60-line Vite plugin, `resolveId`/`load` for `virtual:tnk-lessons`. It reads every `lesson.json` at build time, calls the shared `selectLessons(all, mode)` and emits a module like this:
```ts
export const lessons = [/* spec JSON of included lessons only */];
export const loaders = { "fx-a-goal…": () => import("/content/_fixtures/fx-a-goal-in-ten-actions/lesson.mdx") };
```
**When:** Always. It is the only way to keep draft and fixture MDX chunks out of `dist/`, because a dynamic import that is never generated is never chunked.
**Mode selection:**
- `command === 'serve'` (dev): all statuses, plus the dev badge. No fixtures unless `VITE_INCLUDE_FIXTURES=1`.
- Build with `VITE_INCLUDE_FIXTURES=1`: `shipped`, `shippable` and `_fixtures`.
- Any other build (study and Vercel): `shipped` only.

**Dev reload:** watch `content/**/lesson.json` with `server.watcher`. On a change, invalidate the virtual module and send a full reload.
**Leak proof:** extend `check-bundle.ts` with a content-leak check. It reads `content/lesson-manifest.json` and fails when the title of any non-`shipped` lesson, or any fixture, appears in a `dist/assets/*.js` chunk. This mirrors `DEV_ONLY_MARKERS` [VERIFIED: scripts/lib/bundle.ts read this session, `DEV_ONLY_MARKERS` with sources `src/routes/dev.tsx` … `docs/DESIGN.md`]. Run it only on `dist/`, never on `dist-walker/` (add `--allow-fixtures`).
**Env var on Windows:** do not write `VITE_INCLUDE_FIXTURES=1 vite build` in package.json (cmd.exe has no such syntax). Add `scripts/content/build-fixtures.ts`. It spawns `process.execPath` with `node_modules/vite/bin/vite.js build --outDir dist-walker`, `env: {...process.env, VITE_INCLUDE_FIXTURES: "1"}` and `shell: false`. This is the pattern already in `scripts/smoke.ts:11-20` [VERIFIED: scripts/smoke.ts read via grep: `const vite = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");` and `spawn(process.execPath, [vite, ...viteArgs]`]. Do not name a `.env.fixtures` file: `.gitignore` ignores `.env.*` except `.env.example`.

### Pattern 2: One parser, one tree, many rules
`createProcessor()` from `@mdx-js/mdx`, then `.parse(vfile)`, gives mdast. Verified live this session (scratch probe, `@mdx-js/mdx@3.1.1`):
- Node types seen: `root,mdxJsxFlowElement,heading,text,paragraph,mdxJsxTextElement,mdxjsEsm,mdxFlowExpression`.
- `<Step id="…">` with blank lines inside is an `mdxJsxFlowElement`, with `attributes[0] = {name:"id", value:"…"}` (string), and `position.start.line` holds the line number for `<file>:<line>`.
- `sides={[…]}` is an attribute whose `value` is an object with `value.data.estree.body[0].expression.type === "ArrayExpression"`, so it can be evaluated statically.
- `compile()` accepted an `export const y = 1` and `{1+1}` inside a lesson. **The validator must reject them** (rule `mdx-code`).

The rules run over `{spec, tree, registry, catalog, roles, competencies, concepts, allLessons}`. Each rule returns `{file, line, ruleId, message}`, and the message templates come verbatim from UI-SPEC "Terminal copy".

### Pattern 3: Lesson schema = JSON Schema v1 + Zod mirror + dual-validator fixtures
Follow `schemas/schemas.test.ts`: ajv strict 2020-12 versus the Zod mirror, with an `expect_path` on every invalid fixture. Add `lesson`, `verification` and `whats-new` to `contractSchemas` in `src/schemas/contracts.ts`. Reuse `kebabId`, `isoDate`, `utcDateTime` and `sha256` from that file [VERIFIED: src/schemas/contracts.ts lines 11-20: `export const kebabId = z.string().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);`, `export const isoDate = z.iso.date();`, `export const sha256 = z.string().regex(/^[a-f0-9]{64}$/);`]. Cross-document rules (prerequisite cycle, ids exist) stay in the validator. JSON Schema cannot express them, as `contracts.ts` already notes.

### Pattern 4: Bare-number detection
Inside each `<Step>`, walk `text` nodes. Skip any node whose ancestor is `Fact`, `Stat`, `Rule`, `Contested`, `Num`, `code`/`inlineCode` or `Visual`. On the remaining text:
1. Remove formation tokens matching `/(?<![\p{Nd}.])\p{Nd}(?:[-–]\p{Nd}){2,4}(?![\p{Nd}.])/gu` (`4-3-3`, `4-2-3-1`, `3-4-2-1`).
2. In the step heading only, allow a leading ordinal `^\p{Nd}+[.)]\s`.
3. Report every remaining `/\p{Nd}+/gu` match with its line.

In the live probe, `"Law 10 says "` and `". It took 18 seconds and a 4-3-3 shape, "` were separate text nodes on line 5. "10" and "18" must be reported and "4-3-3" allowed. Validate `<Num kind>` against the closed list `shirt|ordinal|formation|time-in-lesson|count-on-screen`. **Known limits:** number words ("ten") are not caught. Score strings such as "5–0" need `<Fact>` or `<Stat>`. That is intended: a score is a fact.

### Pattern 5: Manifest-parametrised walker, separate config
```ts
// tests/walker/walker.spec.ts (sketch)
import { readFileSync } from "node:fs";
import { test } from "@playwright/test";
const manifest = JSON.parse(readFileSync("content/lesson-manifest.json", "utf8"));
const lessons = manifest.lessons.filter((l) => l.fixture || l.status === "shipped" || l.status === "shippable");
for (const lesson of lessons) {
  test.describe(`lesson ${lesson.id}`, () => {
    test("pointer pass + axe + perf", async ({ page }) => { /* per step: oracle, axe, CTA */ });
    test("keyboard pass", async ({ page }) => { /* ?fallback=1, KeyboardDriver only */ });
    test("reduced-motion pass", async ({ browser }) => { /* newContext({ reducedMotion: "reduce" }) */ });
  });
}
```
`playwright.walker.config.ts` sets:
- `testDir: "tests/walker"` and `outputDir: "test-results/walker"`.
- `webServer: { command: "node node_modules/vite/bin/vite.js preview --outDir dist-walker --port 4174 --strictPort", url: "http://localhost:4174/", reuseExistingServer: !ci }`.
- The same `channel` logic as `playwright.config.ts` (`ci ? undefined : "chrome"`) [VERIFIED: playwright.config.ts:27-31].

Add `testIgnore: ["walker/**"]` to the main `playwright.config.ts` (its `testDir` is `"tests"`, line 14). Otherwise the `visual` CI job runs the walker against the dev server, where the fixtures are absent.

### Pattern 6: Typed oracle drivers (keyboard pass cannot cheat)
```ts
export interface PointerDriver { kind: "pointer"; page: Page }
export interface KeyboardDriver {
  kind: "keyboard";
  tabTo(target: Locator, max?: number): Promise<void>; // press Tab until target === activeElement, else fail
  press(key: "Enter" | "Space" | "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"): Promise<void>;
  type(text: string): Promise<void>;
  read: Pick<Page, "getByRole" | "getByText" | "locator">; // queries only, no click()
}
export interface Oracle<P> {
  complete(d: PointerDriver | KeyboardDriver, props: P, ctx: { quiz: QuizKey[] }): Promise<void>;
  assertDone(page: Page, props: P): Promise<void>;
}
```
`tabTo` also records each newly focused element's `getBoundingClientRect().top`. It asserts the visual-order rule from UI-SPEC, with the 1 px tolerance and the column-jump exception. The registry test then checks three things per id: a props schema exists, a fallback exists, and `existsSync("tests/oracles/<id>.ts")` with both exports present.

### Pattern 7: Claim ids, content hash and the verification record
- **claimId:** derive it deterministically, as `${stepId}/${componentName}-${n}` with `n` counted per step in document order. `<Contested>` gets one claim per side (`…/contested-1.side-2`). Validator rule: the set of claimIds in `verification.json` equals the set in the lesson. A missing claim fails ("unverified claim"). An extra claim fails ("stale record").
- **contentSha256:** sha256 over `"tnk-lesson-v1\n" + mdx(LF-normalised) + "\n\0\n" + canonicalJSON(spec minus {status, shippedAt})`. Canonical JSON means sorted keys and no whitespace. Leaving `status` out is essential: `shippable` → `shipped` must not stale a valid record.
- **Excerpts:** reuse `excerptSha256()` from `scripts/research/lib/excerpt-hash.ts` [VERIFIED: lines 8-11: `passage.normalize("NFC").replace(/\s+/g, " ").trim()` then sha256 hex; doc comment "The passage itself is never stored."].
  - Store `excerpt` as a **paraphrase** of at most 25 words. Store a verbatim quote only when the registry's `license.derivative.value` is `"yes"` or `"conditional"`, and keep it under 25 words.
  - Add the optional `excerptId`, which points at a registry `excerpts[].id`. When it is present, the validator asserts `excerptSha256` equals the registry excerpt's `sha256`. That links the verifier's fetch to the Phase 2 evidence without any network in CI.
  - Example: the IFAB entry already holds excerpt `goal-scored` with sha256 `f413f12f…ac3`, paraphrase "Law 10: a goal needs the whole ball over the goal line between the posts and under the crossbar, with no offence by the scoring team." [VERIFIED: research/SOURCE_REGISTRY.json read via node this session].
- **verifierModel:** require `/opus/i` when the lesson contains `<Rule>` or `<Stat>` (regulation and metric). Finance claims have no component yet. Add `<Stat kind="finance">` later, additively.

### Pattern 8: check-frozen (dependency-free, guards job)
Mirror `scripts/check-immutable.ts`:
- `git` is spawned with argument arrays and `-c core.quotePath=false`.
- The ZERO_SHA base and the unknown ref give exit 2.
- `--base` reads `git show <base>:content/frozen.lock.json`. A missing file at the base means nothing was frozen yet: exit 0.

[VERIFIED: scripts/check-immutable.ts read this session: `const ZERO_SHA = /^0{40,64}$/;`, `spawnSync("git", ["-c", "core.quotePath=false", ...args]`.] It fails when:
1. A base-lock entry is missing from the HEAD lock, or has a different value.
2. A HEAD-lock entry is missing from the HEAD specs (stops "delete from both").
3. A `shipped` spec at HEAD is missing from the HEAD lock ("shipped without freezing").

Messages come verbatim from UI-SPEC. Parse JSON by hand with no zod, because the `guards` job has no `npm ci` [VERIFIED: ci.yml:74-96, the guards steps are checkout, setup-node, `node scripts/guard-files.ts --tracked`, check-immutable and gitleaks]. Add a `--staged` mode for pre-commit, as check-immutable has.

### Pattern 9: Vercel sequence (protection before the first deploy)
1. `vercel project create the-next-klopp`. This creates the project and deploys nothing.
2. `vercel api /v9/projects/the-next-klopp -X PATCH --input deploy/vercel-protection.json`, with the body `{"ssoProtection":{"deploymentType":"all"}}` [CITED: vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication: "`all`: All Deployments"; CLI `vercel api … -X PATCH --input <FILE>` VERIFIED: `vercel api --help` 63.1.2].
3. Read back with `vercel project protection the-next-klopp --json` or `vercel api /v9/projects/the-next-klopp`. Assert `ssoProtection.deploymentType === "all"`, `passwordProtection == null`, and no automation bypass secrets (`protectionBypass` empty). Record the result in `05-VERIFICATION.md`. Never record a token or team slug.
4. Put `framework: "vite"`, `buildCommand: "npm run build:vercel"`, `outputDirectory: "dist"` and the rewrite in `vercel.json`, because file-based config is version-controlled [CITED: vercel.com/docs/project-configuration, table lists buildCommand, framework, outputDirectory, headers, rewrites]. Run `vercel project update the-next-klopp --node-version 24.x --yes` [VERIFIED: `vercel project update --help` lists `--node-version <VERSION>` with `24.x`].
5. `vercel link --project the-next-klopp --yes`, then `vercel git connect --yes`. This needs the Vercel GitHub App installed on the repo owner. If the CLI reports it is missing, the **learner checkpoint** is "install the Vercel GitHub App on the repo in the browser". Fallback if that is refused: `vercel deploy` (preview) from the PR branch and `vercel deploy --prod` from main. A CLI preview URL is still a preview deployment that the smoke script can test.
6. Production deploy: merge to main (Git) or `vercel deploy --prod`. PR preview URL: `vercel ls the-next-klopp --environment preview --json`, filtered by branch. You can also read the GitHub Deployments API (`gh api repos/{owner}/{repo}/deployments?ref=<branch>` → statuses → `environment_url`).
7. Run `npm run smoke:protection -- <prod> <prod>/learn/x <prod>/data/catalog.json <preview>`.

### Pattern 10: Smoke-protection classifier
Use Node `fetch(url, { redirect: "manual" })`. Node returns the real 3xx with a `location` header; browsers return an opaque redirect instead [ASSUMED]. Send no cookies and no bypass header. Classify:
- `401` or `403`, and the body lacks the app fingerprint: **PROTECTED**.
- `3xx` with `location` host ending `vercel.com`: **PROTECTED** (redirect to Vercel login).
- `200` with the fingerprint: **PUBLIC**, exit 1.
- Anything else (`404 DEPLOYMENT_NOT_FOUND`, 5xx, `200` without the fingerprint, network error): **NOT PROVEN**, exit 1. A dead URL is not proof of protection.

Fingerprint: add `<meta name="application-name" content="the-next-klopp">` to `index.html` and match it. Unit-test the classifier on recorded fixtures (status, headers, body). **Do not use `vercel curl`:** it "retrieves or generates a deployment protection bypass token" and can create a bypass secret on the project [CITED: vercel.com/docs/cli/curl "How it works", step 3]. That would quietly weaken ADR 0004. For a positive control (the URL serves a READY deployment), use `vercel inspect <url>` (read-only), plus the learner's end-of-phase browser check while logged in.

### Anti-Patterns to Avoid
- **Runtime status filter on a glob:** drafts ship as chunks. Use Pattern 1.
- **Validator importing `registry.ts`:** Node cannot strip types from `.tsx`, and the registry imports React components. Keep props schemas in `src/interactions/schemas.ts`.
- **Counting words in the validator with `" "` between text nodes:** this inflates the count ("line" + "." becomes 2 words). See Pitfall 1.
- **`vercel api --verbose` or `--generate=curl`:** these print request details, possibly including the Authorization header, into logs and transcripts [ASSUMED]. Never use them in this phase.
- **Writing the team slug or the generated deployment hostnames into committed docs:** generated URLs embed the account slug. Record `<team>`-redacted URLs in `05-VERIFICATION.md`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MDX parsing | Regex over `<Step …>` | `@mdx-js/mdx` `createProcessor().parse()` | Nesting, attribute expressions and positions; parity with the build |
| Accessibility rules | Custom DOM checks for WCAG | `@axe-core/playwright` `.withTags([...])` | Maintained rule set; `color-contrast` included |
| Sortable list a11y + pointer | Custom drag for `order-sequence` | `@dnd-kit/react` 0.5.3 (pointer) + own Move up/down buttons | Locked; buttons are the keyboard path |
| Excerpt hashing | A new hash convention | `excerptSha256()` (Phase 2) | The verifier and the registry must agree byte for byte |
| Dist scanning | A new bundle walker | Extend `scripts/check-bundle.ts` / `scripts/lib/bundle.ts` | Already tested, with symlink, marker and catalog checks |
| Git diff guard | A new git wrapper | Copy the `check-immutable.ts` structure | ZERO_SHA, unknown ref and quotePath already handled |
| Vercel REST auth | Reading `~/.vercel` tokens, curl with a bearer | `vercel api …` (uses the stored login) | Claude never touches the credential |
| JSON Schema ↔ Zod agreement | Ad-hoc tests | `schemas/schemas.test.ts` harness + fixtures | Established project pattern |
| Word counting | A second implementation | Move `countWords` (`scripts/review/lib.ts:515`) to `scripts/lib/words.ts` and import it from both | One definition of a "word" |

**Key insight:** every gate in this phase compares two views of the same thing: build versus validator, DOM versus MDX, lock versus specs, record versus content. Each pair must share code, or the gates drift apart silently.

## Common Pitfalls

### Pitfall 1: Validator and `review:screens` count words differently
**What goes wrong:** the UI-SPEC says both counters "skip `[data-claim-meta]`", but today `review:screens` counts `innerText` of the whole `[data-lesson-step]` [VERIFIED: scripts/review/browser.ts:275-277 `const textOf = (el: Element): string => ((el as HTMLElement).innerText ?? el.textContent ?? "").replace(/\s+/g, " ").trim();`]. The chip sits 4 px after the last word with margin and no space, so "line" + chip "1" gives "line1".
**How to avoid:**
1. In the collector, set `display:none` on each `[data-claim-meta]`, `pre` and `code` inside the step, read `innerText`, then restore. `innerText` needs layout, so a detached clone gives the wrong answer.
2. In the validator, join inline text nodes with `""` inside a paragraph and blocks with `" "`. Skip `code`/`inlineCode`, image alt, JSX attributes and the `<Visual>` subtree (it renders outside `[data-lesson-step]`).
3. Count `<Contested sides>` claim strings: they are visible text inside the step, even though they are props. Statically evaluate the `ArrayExpression` and fail on anything that is not a literal.
4. Mark every chrome string a claim component renders inside the step with `data-claim-meta`: chip numbers, the "Contested" badge, the date line, "Recheck due", "Read the official text".
5. Add a parity test. For every fixture step, the validator count must equal the DOM count measured by the walker.

### Pitfall 2: Block claim components parsed as inline
**What goes wrong:** `<Contested …>Are formations real?</Contested>` on one line parses as an `mdxJsxTextElement` inside a `paragraph` (seen in the live probe). It then renders a `<div>` inside a `<p>`, which is invalid nesting and breaks layout and axe.
**How to avoid:** add the validator rule `block-component`. `Step`, `Visual`, `Rule` and `Contested` must be `mdxJsxFlowElement`: opening tag on its own line, then a blank line. `Fact`, `Stat` (inline variant) and `Num` must be text elements.

### Pitfall 3: The required `build` job has no browser and a 10-minute timeout
**What goes wrong:** `build` runs on `ubuntu-latest` with `timeout-minutes: 10` and steps `npm ci`, `npx vite build`, `node scripts/check-bundle.ts` [VERIFIED: ci.yml:61-72]. Playwright fails because it finds no Chromium.
**How to avoid:**
- Give the `build` job `container: image: mcr.microsoft.com/playwright:v1.65.1-noble` and `env HOME: /root`, as the `visual` job does. Raise the timeout to 20 minutes.
- Steps: `npm ci`, `npx vite build`, `node scripts/check-bundle.ts`, `node scripts/content/build-fixtures.ts`, `npx playwright test -c playwright.walker.config.ts`, then upload the report on failure.
- Keep the job key `build`. It is one of the six required check names, and renaming it blocks every merge (ADR 0007).

### Pitfall 4: Node scripts cannot import React or `.tsx`
**What goes wrong:** `node scripts/validate-content.ts` crashes when the import chain reaches `.tsx` or JSX. Node type stripping handles erasable `.ts` only.
**How to avoid:** keep all validator inputs in `.ts` files with no JSX: `src/interactions/schemas.ts`, `src/schemas/lesson.ts`, a `src/content/` pure core, and Zod only. `registry.ts` imports `schemas.ts`, never the other way round.

### Pitfall 5: Status flip invalidates the verification hash
**What goes wrong:** the hash covers `lesson.json`, so changing `status` to `shipped` makes the record stale.
**How to avoid:** leave `status` and `shippedAt` out of `contentSha256` (Pattern 7). Test it: flipping the status keeps the record valid, and changing one word of the MDX makes it stale.

### Pitfall 6: The registry is generated; editing SOURCE_REGISTRY.json breaks `build-registry --check`
**What goes wrong:**
- `as_of` is already **required** in `schemas/source.schema.json` (lines 8-22, `"required": [ "id", "title", "url", "type", "publisher", "free", "license", "quality", "recency", "as_of", "best_for", "notes", "status" ]`) [VERIFIED: Read this session]. CONTEXT says "add optional `effective_date` and `as_of`", but only `effective_date` is new.
- `SOURCE_REGISTRY.json` is written by `scripts/research/build-registry.ts` from `research/<slug>/sources.json`. `synthesis.test.ts` asserts that "matches a fresh merge (build-registry --check exits 0)".
- The merge in `scripts/research/lib/registry.ts` builds each entry from an explicit field list (`recency: first.source.recency, as_of: asOf, …`), so a new field is dropped silently.

**How to avoid:**
1. Add `effective_date` (optional `isoDate`) to `source.schema.json`, the Zod `sourceSchema` and the fixtures.
2. Carry it in `mergeSources`, with a conflict rule: all members must agree, or it is a conflict.
3. Add it to `research/laws-of-the-game/sources.json` and `research/pitch-geometry/sources.json` (both carry `src-ifab-laws-2026-27`). The value is `2026-07-01`, from the registry excerpt `effective-date` "The 2026/27 edition of the Laws of the Game applies from 1 July 2026." [VERIFIED].
4. Regenerate with `node scripts/research/build-registry.ts`.

### Pitfall 7: Production is public between the first deploy and the protection change
**What goes wrong:** `ssoProtection.deploymentType` defaults to `"preview"` in the API schema [CITED: Vercel REST update-project, `"default": "preview"`]. New projects may get a team default of Standard Protection, which leaves production public. If Git is connected first, the first production deploy is reachable.
**How to avoid:** Pattern 9 order: create, PATCH, read back, then connect and deploy. The smoke script runs right after the first production deploy.

### Pitfall 8: SPA rewrite turns missing assets into 200 HTML
**What goes wrong:** `"/(.*)" → "/index.html"` answers a stale `/assets/x.js` or a missing `/data/y.json` with HTML and status 200. The result is a MIME error or a JSON parse error instead of a clean 404.
**How to avoid:** use the rewrite `{"source": "/((?!assets/|data/|fonts/).*)", "destination": "/index.html"}` [ASSUMED: Vercel path-to-regexp supports the negative lookahead; verify on the first preview]. Keep the content-type checks the Phase 3 scene loader already does. Vercel serves real static files before rewrites [ASSUMED].

### Pitfall 9: The walker's LCP and long-task numbers are noise on shared CI
**How to avoid:**
- Register observers with `page.addInitScript` before `goto`, so nothing is missed.
- Read LCP before the first input, because LCP stops at input.
- Take the median of 3 cold loads of `/learn/<id>`.
- Make JS byte budgets the strict gate (deterministic), and keep the runtime thresholds generous (Perf Budget section).

### Pitfall 10: `tsconfig` `types` restricts ambient types
**What goes wrong:** `"types": ["vite/client", "node"]` stops automatic inclusion of `@types/mdx`, so `import x from "./lesson.mdx"` fails typecheck.
**How to avoid:** add a `src/mdx.d.ts` with `/// <reference types="mdx" />`, plus a local declaration if frontmatter is ever exported (the CLAUDE.md smoke-test note). The virtual module also needs a `declare module "virtual:tnk-lessons"`.

### Pitfall 11: Paths with spaces in generated code
**How to avoid:** the virtual module must emit root-relative ids (`"/content/_fixtures/…/lesson.mdx"`) built with `JSON.stringify`, never absolute `E:\To become new klop\…` paths (ADR 0006).

### Pitfall 12: `.vercel/` and `dist-walker/` are not ignored or guarded
**How to avoid:** add both to `.gitignore` and to `DENIED_PREFIXES` in `scripts/lib/guard.ts` [VERIFIED: lines 21-30 list `"feedback/", "public/pyodide/", … "node_modules/", "dist/"`; `.gitignore` has `dist/` only]. `.vercel/project.json` holds the project and org ids. They are not credentials, but they are account-specific, and the repo is public.

### Pitfall 13: DESIGN.md section 8 lock test
**What goes wrong:** `scripts/design/design-md.test.ts` (lines 481-528) asserts that section 8 contains `"200 KB"`, `"180 KB gzip"`, `"CLS below 0.1"` and `"60 fps"`, and that every row shaped like `` | `id` | fail|warn | `` is a review `CHECKS` id.
**How to avoid:** add the new budget rows without a backticked id in column 1 (for example `| Lesson route JavaScript | … |`). Keep the existing strings.

## Performance Budget (proposal for DESIGN.md §8 and `perf-budget.json`)

Measured this session: the current study build entry chunk `index-*.js` is 316,516 B raw / **98,745 B gzip** (level 9), and the CSS is 9,369 B gzip [VERIFIED: node zlib over `dist/assets` this session]. Thresholds use the web.dev "good" bars: "LCP should occur within 2.5 seconds", "INP of 200 milliseconds or less", "CLS of 0.1. or less" [CITED: web.dev/articles/vitals, last updated October 31, 2024].

| Budget | Limit | Kind | Checked by |
|--------|-------|------|-----------|
| Initial route JavaScript (shell routes) | 180 KB gzip, with lazy labs (DuckDB, Pyodide) excluded (existing row, unchanged) | fail | walker on `/`, `/tracks` |
| Lesson route JavaScript (all JS loaded until screen 1 is interactive, `/learn/:id`) | 300 KB gzip | fail | walker: Resource Timing `.js` URLs, then gzip of those files from `dist-walker/` |
| One lesson MDX chunk | 20 KB gzip | fail | walker build manifest (`build.manifest` only in the fixtures build) |
| One interaction chunk (own code, shared vendor excluded) | 60 KB gzip | fail | same |
| LCP, `/learn/:id` cold load, median of 3 | 2,500 ms | fail | `largest-contentful-paint` observer |
| Long-task total (Σ(duration − 50 ms) over `longtask` entries, navigation start to network idle), median of 3 | 200 ms | fail | `longtask` observer via `addInitScript` |
| Layout shift | CLS below 0.1 (existing) | fail | `layout-shift` observer, excluding `hadRecentInput` |
| Interaction latency (max `event` entry duration during the pointer pass) | 200 ms | warn in Phase 5, fail from Phase 7 | `event` observer, `durationThreshold: 16` |

All numbers except the existing rows are [ASSUMED] proposals, which CONTEXT puts under Claude's discretion. Rationale: the entry chunk leaves about 80 KB of headroom under 180. The lesson route adds pitch, scene, playback, MDX runtime and Base UI popovers. 300 KB keeps a mid-range phone parse under about 1 s. Review the numbers after the first real lesson.

## Code Examples

### 1. Vite config additions
```ts
// vite.config.ts (sketch) — Source: mdxjs.com/docs/getting-started (enforce 'pre' + react include)
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import { lessonsPlugin } from "./scripts/lib/content/vite-plugin.ts";
export default defineConfig({
  plugins: [
    { enforce: "pre", ...mdx({ providerImportSource: "@mdx-js/react", remarkPlugins: [remarkFrontmatter] }) },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
    tailwindcss(),
    lessonsPlugin(),
  ],
  // existing optimizeDeps, server, preview unchanged
});
```

### 2. Validator parse
```ts
// scripts/lib/content/parse.ts — verified pattern (scratch probe, @mdx-js/mdx 3.1.1)
import { createProcessor } from "@mdx-js/mdx";
import { VFile } from "vfile"; // transitive of @mdx-js/mdx; or pass the string directly
export function parseLesson(path: string, text: string) {
  return createProcessor({}).parse(new VFile({ path, value: text.replace(/\r\n/g, "\n") }));
}
// Forbidden node types (rule "mdx-code"): mdxjsEsm, mdxFlowExpression, mdxTextExpression,
// and any mdxJsxAttribute whose value is an expression, except Contested.sides (static literal only).
```

### 3. Axe per screen
```ts
// Source: playwright.dev/docs/accessibility-testing; tags from axe-core doc/API.md
import AxeBuilder from "@axe-core/playwright";
const r = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
  .analyze();
expect(r.violations, JSON.stringify(r.violations.map((v) => [v.id, v.nodes.length]))).toEqual([]);
```
axe-core has no `wcag22a` tag; WCAG 2.2 adds rules only under `wcag22aa` [CITED: github.com/dequelabs/axe-core doc/API.md].

### 4. Reduced-motion assertion
```ts
const ctx = await browser.newContext({ reducedMotion: "reduce" });
// after each interaction step:
const moving = await page.evaluate(() =>
  document.getAnimations().filter((a) => a.playState === "running" &&
    Number((a.effect?.getComputedTiming().duration as number) ?? 0) > 0).length);
expect(moving).toBe(0);
```
CSS transitions, CSS animations and WAAPI (`motion` uses WAAPI) all show up in `getAnimations()`. rAF-driven scene playback does not, but it defaults to Stepped under reduced motion (Phase 3).

### 5. Perf observers
```ts
await page.addInitScript(() => {
  const w = window as any; w.__perf = { lcp: 0, long: 0, cls: 0, evt: 0 };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__perf.lcp = e.startTime; })
    .observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__perf.long += Math.max(0, e.duration - 50); })
    .observe({ type: "longtask", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries() as any) if (!e.hadRecentInput) w.__perf.cls += e.value; })
    .observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__perf.evt = Math.max(w.__perf.evt, e.duration); })
    .observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
});
```

### 6. vercel.json
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build:vercel",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/((?!assets/|data/|fonts/).*)", "destination": "/index.html" }],
  "headers": [{ "source": "/(.*)", "headers": [
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
  ]}]
}
```
The docs' own example uses `"source": "/(.*)"` [CITED: vercel.com/docs/frameworks/frontend/vite]. The lookahead variant is [ASSUMED] (Pitfall 8). An optional CSP (deferred item) needs a `sha256-…` hash for the inline theme script in `index.html` and `frame-src https://www.youtube-nocookie.com` for later phases.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel "Standard Protection" leaves production public | "All Deployments" on all plans, Vercel Authentication on all plans, no paid add-on | Docs last updated 2026-09-15 | ADR 0004 holds on Hobby [CITED: vercel.com/docs/deployment-protection] |
| Dashboard-only protection toggle | `vercel api` (authenticated REST from the CLI) + `vercel project protection --json` | CLI 63.x (installed 63.1.2) | Settable and readable without the dashboard or token handling [VERIFIED: local `--help`] |
| `vercel curl` as a harmless curl | Generates a bypass token when none exists | Docs 2026-10-02 | Do not use it for the protection smoke |
| Password Protection on Hobby | Not available; Pro costs $20/month per project | — | Confirms Vercel Authentication as the method |

**Deprecated/outdated:** the CONTEXT note "add optional `as_of`". `as_of` exists and is required. ADR 0007 calls the repo private, but `gh repo view` shows `PUBLIC`. ADR 0007 is out of scope for this phase; flag it to the orchestrator.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | An unauthenticated GET to an "all"-protected URL returns 401 (HTML login page) or a 3xx to vercel.com, not 200 | Pattern 10 | Low: the classifier accepts both, and NOT PROVEN fails loudly; the first run records the real status |
| A2 | Node `fetch` with `redirect:"manual"` exposes the 3xx status and `location` | Pattern 10 | Low: unit-test it; fall back to `node:https` |
| A3 | Vercel serves static files before rewrites, and the negative-lookahead source is supported | Pitfall 8, Code 6 | Medium: a deep link could 404 or data could return HTML; check on the first preview with an authenticated browser |
| A4 | New Vercel projects may default to a protection that leaves production public | Pitfall 7 | Low: the ordering removes the risk either way |
| A5 | `vercel git connect` needs the Vercel GitHub App on the repo owner and may need a browser step | Pattern 9 | Medium: possible learner checkpoint; CLI-deploy fallback documented |
| A6 | `vercel api --verbose` / `--generate=curl` may print auth headers | Anti-patterns | Low: just don't use them |
| A7 | Perf numbers (300 KB lesson route, 20/60 KB chunks, 200 ms long-task total) | Perf Budget | Low: Claude's discretion; tune after the first real lesson |
| A8 | `longtask` and `event` entry types work in the Playwright 1.65.1 Chromium with `buffered:true` | Code 5 | Low: `addInitScript` registration does not depend on buffering |
| A9 | Husky `prepare` on Vercel's install is non-fatal without `.git`; set `HUSKY=0` as a Vercel env var to be safe | Environment | Low |
| A10 | `vercel ls --environment preview --json` exposes branch metadata to pick the PR preview | Pattern 9 | Low: the GitHub Deployments API is the fallback |

## Open Questions

1. **Frontmatter plugins.** CONTEXT names `remark-frontmatter` and `remark-mdx-frontmatter`, but the spec JSON holds every field. Recommendation: install `remark-frontmatter` only, ban frontmatter with a validator rule, and skip `remark-mdx-frontmatter` (record the reason in the decision log). This is a small, reversible deviation; it is also fine to install both.
2. **Chapter id format.** The concept map has `part: "A"` and no chapter ids. Recommendation: `chapterId = "part-a"` (kebab, matches `kebabId`). The validator checks that every concept in a lesson has that track and part.
3. **Fixture status.** Recommendation: `status: "shippable"`, so the verification and shippable gates run on it in CI. Fixtures never ship (`_fixtures` is excluded by path, not by status).
4. **"Law 10" in prose.** "Law" numbers are not in the `<Num>` closed list. Recommendation: put them inside `<Rule law="Law 10">` children (allowed in claim components), or cite with `<Fact>`. Do not widen the closed list in Phase 5.
5. **Learner checkpoints.** Possibly one, if the Vercel GitHub App is not installed. The end-of-phase human check: the learner opens the production URL in their own browser, logged in, and sees the app (positive control).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | all scripts | ✓ | 24.21.0 | — |
| npm | install | ✓ | 11.19.0 | — |
| Vercel CLI | PLAT-03 | ✓ (logged in) | 63.1.2 | — |
| Vercel project `the-next-klopp` | PLAT-03 | ✗ (`project_not_found`) | — | Create in Pattern 9 step 1 |
| gh CLI | PR preview lookup | ✓ (logged in) | 2.102.0 | — |
| Vercel GitHub App on the repo | PR previews | unknown (the API needs a GitHub App token to list installations) | — | CLI preview deploys |
| Chrome (local walker) | `npm run e2e` | ✓ | installed | Playwright Chromium builds present in `%LOCALAPPDATA%\ms-playwright` |
| Playwright image | CI walker | ✓ (used by the `visual` job) | v1.65.1-noble | — |
| curl | manual check | ✓ | 8.18.0 | Node fetch |
| uv | not needed this phase | ✓ | 0.12.5 | — |

**Missing dependencies with no fallback:** none.
**Missing with fallback:** the Vercel project (create it), the GitHub App (CLI deploy).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 5.1.2 (unit) + Playwright 1.65.1 (walker, separate config) |
| Config file | `vitest.config.ts` (include `src/**/*.test.{ts,tsx}`, `scripts/**/*.test.ts`, `schemas/**/*.test.ts`); new `playwright.walker.config.ts` |
| Quick run command | `npx vitest run scripts/lib/content src/content src/interactions schemas` |
| Full suite command | `npx vitest run && npm run validate && node scripts/check-bundle.ts && node scripts/content/build-fixtures.ts && npx playwright test -c playwright.walker.config.ts` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | Lesson spec validates; ajv and Zod agree; MDX↔spec step parity | unit | `npx vitest run schemas` (lesson fixtures) + `scripts/lib/content/parity.test.ts` | ❌ Wave 0 |
| CONT-01 | Fixture lesson renders all 9 screens | e2e | walker pointer pass | ❌ |
| CONT-02 | Each rule has a failing fixture with the exact message line | unit | `npx vitest run scripts/lib/content/rules` (iterates `content/_fixtures/invalid/*`) | ❌ Wave 0 |
| CONT-02 | `npm run validate` exits 1 on invalid, 0 on the real tree | integration | `scripts/validate-content.test.ts` (spawn) | ❌ |
| CONT-02 | Word-count parity validator = DOM | e2e | walker asserts `manifest.steps[i].words === domCount` | ❌ |
| CONT-03 | Every registry id has props schema, fallback, oracle file with both exports | unit | `src/interactions/registry.test.ts` | ❌ |
| CONT-04 | Walker completes every manifest lesson; a new fixture needs no test edit | e2e | `npx playwright test -c playwright.walker.config.ts` | ❌ |
| CONT-05 | Chips resolve; popover fields; `<Rule>` shows effective and as-of; data-bound Stat loading and error | unit (jsdom) + e2e | `src/content/mdx/claims.test.tsx` + walker | ❌ |
| CONT-05 | `effective_date` additive; registry regenerates | unit | `npx vitest run schemas scripts/research` | ✅ (extend) |
| CONT-06 | Removal, rename and version change fail; additions pass; shipped without freeze fails | unit + integration | `scripts/check-frozen.test.ts` (temp git repo, like check-immutable tests) | ❌ |
| PLAT-02 | `nextAction()` null and populated; routes; coming-next not a link | unit + e2e | `src/content/nextAction.test.ts`, `src/routes.test.ts`, walker shell pass | partial |
| PLAT-03 | Classifier verdicts on recorded responses | unit | `scripts/smoke-protection.test.ts` | ❌ |
| PLAT-03 | Live prod and preview not public | manual-run script | `npm run smoke:protection -- <urls>` (result in 05-VERIFICATION.md) | ❌ |
| PLAT-04 | `build:vercel` fails with a planted denied file; fixture and draft leak markers | integration | `scripts/check-bundle.test.ts` (extend) + `package.json` script assertion | ✅ (extend) |
| QA-01 | Missing record, verifier == author, stale hash, unsupported claim, claim-set mismatch, non-Opus on Rule/Stat each fail; status flip keeps it valid | unit | `scripts/lib/content/shippable.test.ts` | ❌ |
| QA-03 | axe zero violations per screen; keyboard pass; reduced motion; perf budgets | e2e | walker | ❌ |
| QA-04 | Report regenerates; `--check` detects drift; unknown role or competency fails validation | unit | `scripts/content/role-report.test.ts` | ❌ |
| QA-05 | Walker runs in the required `build` job | config test | `scripts/ci-walker.test.ts` (parse ci.yml: build job has the container and the walker step; job key `build` unchanged) | ❌ |

### Sampling Rate
- **Per task commit:** the quick run command, plus `npm run validate` once content exists.
- **Per wave merge:** full suite (local walker on Chrome).
- **Phase gate:** CI green on all six required checks, plus `npm run review:screens` on the UI-SPEC route list (fixture build), plus the live `smoke:protection`.

### Wave 0 Gaps
- [ ] `schemas/lesson.schema.json`, `verification.schema.json`, `whats-new.schema.json` + `schemas/fixtures/*.fixtures.json`
- [ ] `content/_fixtures/invalid/<rule>/` one per rule id (screen-words, loop-stage ×2, citation, prereq-cycle ×2, data-ref ×2, bare-number, rule-dates, template-unbuilt, mdx-code, block-component, no-frontmatter, schema, step-parity, interaction-unknown, interaction-props, unknown-ids, duration, shippable ×5)
- [ ] `scripts/lib/words.ts` (moved `countWords`) + `review:screens` claim-meta exclusion + parity test
- [ ] `playwright.walker.config.ts`, `tests/walker/*`, `tests/oracles/*`
- [ ] `testIgnore: ["walker/**"]` in `playwright.config.ts`
- [ ] `review:screens` option to build or serve the fixtures build for `/learn/fx-…` (UI-SPEC requires the review on the fixture preview build; `scripts/review/browser.ts:123-125` currently runs plain `vite build`)

## Security Domain

`security_enforcement: true`, ASVS level 1, `security_block_on: high` [VERIFIED: .planning/config.json].

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1 Architecture / V14 Config | yes | Vercel `ssoProtection: all`, read back and asserted; `vercel.json` in git; no bypass secrets; `.vercel/` ignored and guarded |
| V2 Authentication | yes (delegated) | Vercel Authentication at the edge; the app has no auth of its own; Claude never handles credentials (`vercel api` uses the stored login) |
| V3 Session Management | no | Vercel sets a per-URL cookie; nothing in the app |
| V4 Access Control | yes | Scope `all` covers production and every generated URL; smoke proof on prod, a deep link, `/data/catalog.json` and a PR preview |
| V5 Input Validation | yes | Zod/JSON Schema on lesson, verification and whats-new; MDX code ban (`mdx-code`); static-literal-only `sides`; link URLs must be `https:` or root-relative; registry `httpUrl` regex |
| V6 Cryptography | minimal | sha256 via `node:crypto` for content and excerpt hashes (integrity, not secrecy); never hand-roll |
| V7 Errors & Logging | yes | The error-details panel shows the message only; smoke and validator output hold no secrets; never `vercel api --verbose` |
| V8 Data Protection | yes | `check-bundle` deny-manifest + licence/catalog; fixture and draft leak markers; no learner personal data in a public repo (redact team slug and URLs) |
| V10 Malicious Code | yes | Exact pins, the legitimacy/identity gate, no install scripts, `npm audit signatures` (lint job); MDX = code, so ESM and expressions are forbidden |
| V12 Files & Resources | yes | Rewrite excludes `/assets`, `/data`, `/fonts`; the build manifest only in `dist-walker` (never deployed) |

### Threat Model Sketch (STRIDE)

| # | Threat | STRIDE | Component | Mitigation | Severity if unmitigated |
|---|--------|--------|-----------|------------|------------------------|
| T-05-01 | Production URL public (wrong scope, or deploy before PATCH) | Information disclosure | Vercel project | Pattern 9 order; read-back assertion; smoke on prod + preview; NOT PROVEN fails | High |
| T-05-02 | Bypass secret created (`vercel curl`) or shareable link left active | Elevation / disclosure | Vercel project | Never `vercel curl`; read back `protectionBypass` empty; ADR 0004 | High |
| T-05-03 | Lesson MDX runs arbitrary JS (`export`, `{expr}`, `import`) | Tampering / elevation | Content pipeline | Validator `mdx-code` rule; pre-commit + CI; components only through the provider | High |
| T-05-04 | `javascript:` or off-registry links in lessons | Tampering | MDX links | Validator URL-scheme rule; chips use registry URLs only; `rel="noopener noreferrer"` | Medium |
| T-05-05 | Licensed raw data in the deployed bundle | Disclosure (licence breach) | `build:vercel` | `check-bundle.ts` in the Vercel build itself + CI; test proving failure | High |
| T-05-06 | Drafts or fixtures leak into study/Vercel | Disclosure | Vite build | Virtual module selection + content-leak markers | Medium |
| T-05-07 | Verification record forged (verifier == author renamed) | Spoofing / repudiation | `verification.json` | String inequality + `verifierModel` + record of the gsd sub-agent run id; residual risk accepted (process control) | Medium |
| T-05-08 | Verified content edited after verification | Tampering | Lesson files | `contentSha256` stale check (excludes status only) | High |
| T-05-09 | Shipped IDs or data versions silently changed | Tampering | Content | `check-frozen` in guards (base vs HEAD lock and specs) + `--staged` pre-commit | Medium |
| T-05-10 | Token or account identifiers exposed in a public repo or logs | Disclosure | Docs, CI logs | No `--verbose`; redact team slug and hostnames; `.vercel/` guarded; gitleaks (existing) | Medium |
| T-05-11 | Supply chain (too-new packages) | Tampering | npm deps | Identity gate, exact pins, signatures, no install scripts | Medium |
| T-05-12 | CI injection via PR metadata in new steps | Tampering | ci.yml | Pass refs through `env:` only (existing pattern, ci.yml:89-93); `pull_request` gives no secrets | Medium |
| T-05-13 | Copyrighted source text stored verbatim | Legal (disclosure) | `verification.json` | Paraphrase excerpts (at most 25 words); verbatim only if the licence allows; hash of the passage, not the passage (Phase 2 convention) | Medium |

## Sources

### Primary (HIGH confidence, verified with a tool this session)
- npm registry (`npm view`, 2026-11-28): versions, modified dates, licences, repos, install scripts for all 12 packages.
- `gsd-tools query package-legitimacy check`: verdicts in the audit table.
- Scratch probe (`@mdx-js/mdx` 3.1.1, `remark-mdx` 3.1.1, `remark-parse` 11.0.0, `unified` 11.0.5): mdast node types, positions, estree on expression attributes, `compile()` accepting ESM and expressions, dedupe.
- Local CLI help, Vercel CLI 63.1.2: `vercel api`, `vercel project protection|update|create`, `vercel git connect`, `vercel link`, `vercel ls`, `vercel curl`; `vercel project protection the-next-klopp --json` gave `project_not_found`.
- Repo files read this session: `05-CONTEXT.md`, `05-UI-SPEC.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md`, `.claude/CLAUDE.md`, `package.json`, `ci.yml`, `playwright.config.ts`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `scripts/check-bundle.ts`, `scripts/lib/bundle.ts`, `scripts/check-immutable.ts`, `scripts/lib/guard.ts`, `scripts/review/{lib,browser}.ts`, `scripts/research/lib/excerpt-hash.ts`, `scripts/research/build-registry.ts`, `scripts/design/design-md.test.ts`, `schemas/source.schema.json`, `src/schemas/contracts.ts`, `deploy/deny-manifest.json`, `public/data/catalog.json`, ADRs 0004, 0005 and 0007, `docs/DESIGN.md` §8.

### Secondary (MEDIUM, official docs fetched this session)
- https://vercel.com/docs/deployment-protection (last_updated 2026-09-15): scopes; "Protecting all deployments is available on all plans"; Password Protection not on Hobby.
- https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication (2026-09-15): "available on all plans"; API `deploymentType` mapping; login redirect behaviour.
- https://vercel.com/docs/rest-api/reference/endpoints/projects/update-an-existing-project: `PATCH /v9/projects/{idOrName}`, `ssoProtection.deploymentType` enum `all | preview | prod_deployment_urls_and_all_previews | all_except_custom_domains`, default `preview`.
- https://vercel.com/docs/cli/curl (2026-10-02): the bypass token is retrieved or generated.
- https://vercel.com/docs/frameworks/frontend/vite (2026-11-14): SPA rewrite example.
- https://vercel.com/docs/project-configuration (2026-08-25): `vercel.json` properties.
- https://mdxjs.com/docs/getting-started/: Vite `enforce: 'pre'`, react `include`, `@types/mdx`.
- https://playwright.dev/docs/accessibility-testing: AxeBuilder API.
- https://github.com/dequelabs/axe-core/blob/develop/doc/API.md: tag list (no `wcag22a`).
- https://web.dev/articles/vitals: LCP, INP and CLS thresholds.

### Tertiary (LOW)
- Web search on the Vercel 401 page details: no authoritative description found (A1 stays assumed).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. Registry and legitimacy verified, and the parser behaviour probed live.
- Architecture: HIGH for repo integration (files read), MEDIUM for the Vite virtual-module approach (standard Vite plugin API, not prototyped this session).
- Vercel: HIGH for plan availability and API fields (official docs plus CLI), MEDIUM for the exact unauthenticated response.
- Pitfalls: HIGH. Most come from code read this session.
- Perf numbers: MEDIUM-LOW (proposals).

**Research date:** 2026-11-28
**Valid until:** 2026-12-12 for Vercel and CLI behaviour (fast-moving); 2026-12-28 for the rest.
