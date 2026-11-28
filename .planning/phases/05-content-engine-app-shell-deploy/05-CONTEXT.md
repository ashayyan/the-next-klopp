# Phase 5: Content Engine, App Shell & Deploy - Context

**Gathered:** 2026-11-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 builds the machinery every lesson ships through, plus the shell the learner navigates and the protected deploy:

- lessons as data: one MDX file plus one JSON spec per lesson, schema-validated (CONT-01)
- a content validator that blocks shipping on the six named rule breaks, with one clear message per break (CONT-02)
- an interaction registry where every interaction has a props schema, an accessibility fallback and a test oracle (CONT-03)
- claim components `<Fact>`, `<Rule>`, `<Stat>`, `<Contested>` bound to the source registry or pipeline outputs (CONT-05)
- frozen lesson/step/item IDs and data artifact versions, additive-only changes, CI-enforced (CONT-06)
- one generic Playwright walker that completes any lesson end-to-end with no per-lesson test code and runs axe, keyboard, reduced-motion, contrast and performance-budget checks (CONT-04, QA-03, QA-05)
- a shippable gate that needs a verification record from a verifier other than the author, plus role and competency tags; a role-coverage report (QA-01, QA-04)
- the app shell: home with one obvious next action, track/chapter navigation, a "What's new" page (PLAT-02)
- deployment to the learner's Vercel account with protection scope "All Deployments", a smoke script proving production and a PR preview are not public, and the deny-manifest gate inside the deployed build (PLAT-03, PLAT-04)

Out of scope (Phase 6+): the full Lesson Loop learner runtime polish, glossary, focus mode, confusion button, progress, FSRS queue, low-energy mode. Out of scope (Phase 7+): real curriculum lessons. Phase 5 ships only fixture lessons that prove the engine.

Requirements: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, PLAT-02, PLAT-03, PLAT-04, QA-01, QA-03, QA-04, QA-05.

</domain>

<decisions>
## Implementation Decisions

The learner delegated every grey area and checkpoint to Claude for this autonomous run ("choose all the recommended choices and close every grey area… even if there is human need you need to do it by yourself unless there are hard blocks"). Every answer below is the recommended option.

### Lesson file format and layout (CONT-01)
- [auto] Q: "Where do lessons live?" → Selected: `content/tracks/<track-id>/<chapter-id>/<lesson-id>/lesson.mdx` + `lesson.json` (+ optional `verification.json`). Track and chapter ids come from `research/curriculum-config.json` / `concept-map.json` (e.g. `t00`). Fixture lessons live in `content/_fixtures/<lesson-id>/` and are never part of the study build.
- [auto] Q: "Spec schema source of truth?" → Selected: `schemas/lesson.schema.json` (JSON Schema, frozen v1 like `scene.schema.json`) with a Zod mirror in `src/schemas/`, and a parity test, following the Phase 3 Scene pattern. — **Reversibility:** costly — every lesson file conforms to it; v1 frozen, later changes additive.
- [auto] Q: "What does the spec hold?" → Selected: `id`, `version`, `title`, `track`, `chapter`, `concepts[]` (concept-map ids), `prerequisites[]` (lesson ids), `durationMin` (5–12), `effort` (low/normal), `status` (`draft` | `review` | `shippable` | `shipped`), `author`, `roles[]`, `competencies[]`, `template` (one of the 7 DESIGN.md §6 templates), `steps[]` (each: stable `id`, `stage` of the Lesson Loop, `screen` anchor in the MDX, `interaction?` registry id + props, `dataRefs[]`), `quiz[]` (stable item ids, type, answer key), `sources[]` (registry ids), `dataRefs[]` (`<dataset>/<version>/<file>` pinned), `shippedAt?`.
- [auto] Q: "How does MDX map to steps?" → Selected: MDX uses a `<Step id="…">` wrapper per screen; each `<Step>` id must match a `steps[].id` in the spec in the same order. Word count, stage order and claim rules are computed per `<Step>`. Lesson components come through `MDXProvider` (no imports in lesson files).
- [auto] Q: "Lesson Loop stages?" → Selected: the PROJECT.md loop, exact and ordered: `hook` → `see` → `touch` → `predict` → `reveal` → `do` → `lock-in` → `connect`. Every stage appears at least once; stages may repeat (e.g. two `touch` steps) but never go backwards.

### Validator (CONT-02)
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

### Claim components (CONT-05)
- [auto] Q: "How do claims bind?" → Selected: `<Fact source="reg-id">`, `<Stat source="reg-id" | data="dataset/version/file#field" value unit>`, `<Rule source="reg-id" law="…">` (regulation: shows effective date and as-of date from the registry entry; validator fails a `<Rule>` whose source lacks `effective_date`/`as_of`), `<Contested sides=[{claim, source}…]>` (≥2 sides each sourced, labelled "contested"). Rendered with a visible source chip that opens the registry entry (title, publisher, licence, URL); never silent.
- [auto] Q: "Registry shape gaps?" → Selected: add optional `effective_date` and `as_of` to the registry schema additively (Phase 2 froze 218 entries; additive fields only).

### Interaction registry (CONT-03)
- [auto] Q: "Registry form?" → Selected: `src/interactions/registry.ts` — each entry: `id`, Zod `props` schema, lazy `component`, `fallback` component (keyboard/screen-reader path that teaches the same thing without drag/animation), and `oracle` (a Playwright-side module `tests/oracles/<id>.ts` with `complete(page, props)` and `assertDone(page)`). A registry test fails when any entry lacks one of the three.
- [auto] Q: "Which interactions now?" → Selected: wrap what exists (pitch scene playback, drag-a-player, converter probe) plus the minimum the walker and fixture need: `quiz-choice`, `predict-then-reveal`, `order-sequence`. Real lesson interactions arrive in Phases 7–8 and must register the same way.

### Generic walker and quality gates (CONT-04, QA-03, QA-05)
- [auto] Q: "How does the walker discover lessons?" → Selected: a build-time lesson manifest (generated by the validator: id, route, steps, interactions, quiz keys) read by one spec `tests/walker/walker.spec.ts`; it iterates every lesson in the manifest whose status is `shipped`/`shippable` plus the fixtures; for each step it calls the registered oracle, answers quiz items from the spec keys, and advances. No per-lesson test code; adding a lesson needs no test edits.
- [auto] Q: "Checks per lesson?" → Selected: axe (`@axe-core/playwright`, WCAG 2.2 AA tags, zero violations), keyboard-only full pass (walk again with keyboard only using each interaction's fallback), reduced-motion pass (`reducedMotion: 'reduce'`, assert no running CSS animations/transitions > 0 ms beyond tokens' reduced values), contrast (axe color-contrast + the Phase 4 palette gate), performance budget (per-lesson route JS ≤ budget from `perf-budget.json` checked on the built chunks, plus runtime LCP and long-task total measured in preview). Budget numbers set by research and recorded in DESIGN.md §8.
- [auto] Q: "Where does it run?" → Selected: against `vite build && vite preview` (production bundle, fixtures build) on a fixed non-5173 port, as steps inside the existing required `build` CI job (after the build), so merge is blocked by a check already in branch protection and ADR 0007's six required checks stay unchanged. Local: `npm run e2e`.
- [auto] Q: "Frozen IDs (CONT-06)?" → Selected: `content/frozen.lock.json` (lesson ids, step ids, quiz item ids, data artifact versions for every `shipped` lesson), regenerated by `npm run content:freeze` when a lesson ships; `scripts/check-frozen.ts --base origin/main` fails CI on any removal, rename or version change of a frozen entry (additions pass). Mirrors the Phase 3 `check-immutable` pattern and runs in the guards path.

### Verification records and roles (QA-01, QA-04)
- [auto] Q: "Verification record format?" → Selected: `verification.json` next to the lesson: `lessonId`, `lessonVersion`, `contentSha256` (hash of mdx+json at verification), `author` (agent/run id), `verifier` (must differ from author), `verifierModel` (Opus required when the lesson has metrics, regulations or finance claims, flagged by claim type), `verifiedAt`, `claims[]` each `{claimId, sourceId, url, fetchedAt, excerptSha256, excerpt (≤ 25 words paraphrase-safe quote), verdict: supported|unsupported|contested}`. Validator rejects shippable when the record is missing, verifier == author, hash is stale, or any claim is unsupported.
- [auto] Q: "Who verifies in this run?" → Selected: a separate `gsd`-spawned verifier sub-agent (fresh context, never the authoring agent) fetches the source and writes the record; for Phase 5 only fixture lessons are verified, proving the path.
- [auto] Q: "Role-coverage report?" → Selected: `npm run report:roles` → `docs/reports/role-coverage.md` (+ `.json`): for each of the 15 roles and 49 competencies, lessons that serve it by status; generated, `--check` mode in CI.

### App shell (PLAT-02)
- [auto] Q: "Home next action before progress exists?" → Selected: one primary button "Start: <lesson title>" pointing to the first shipped lesson in curriculum order whose prerequisites are met; Phase 6 swaps the selector for real progress (single function `nextAction()` with a test). Calm home: one action, nothing competing (ADHD rule).
- [auto] Q: "Navigation?" → Selected: `/tracks` → `/tracks/:trackId` (chapters) → `/tracks/:trackId/:chapterId` (lessons) → `/learn/:lessonId` (lesson runtime with step frame). Built from `curriculum-config.json` + the lesson manifest; tracks with no shipped lessons show as "coming next" (rolling release), never as broken links.
- [auto] Q: "What's new source?" → Selected: `content/whats-new.json` (date, title, lesson ids, one-line summary), validated, rendered at `/whats-new`; the validator requires an entry when a lesson flips to `shipped`.
- [auto] Q: "Draft visibility?" → Selected: `npm run study` and the Vercel build include only `shipped` lessons (plus nothing from `_fixtures`); `npm run dev` shows drafts with a status badge. Implemented as a build-time filter on the manifest (ADR 0005 promised it here). The walker runs against a dedicated preview build that includes fixtures (env flag `VITE_INCLUDE_FIXTURES=1`, never set in study/Vercel).
- Shell uses Phase 4 primitives and tokens only (DESIGN.md); screens pass `npm run review:screens`.

### Deploy and protection (PLAT-03, PLAT-04)
- [auto] Q: "Is Vercel a hard block?" → Selected: no — `vercel whoami` already returns the learner's account (CLI logged in by the learner). Claude uses the CLI only; never handles credentials. If a dashboard-only setting can't be set by CLI/API, that single step is the learner checkpoint.
- [auto] Q: "How is the project linked?" → Selected: Vercel project linked to the GitHub repo (Git integration) so PRs get preview URLs; framework preset Vite, build `npm run build:vercel` (= build + `check-bundle` deny-manifest gate, so the deployed build fails on licensed data), output `dist`, `vercel.json` with SPA rewrite.
- [auto] Q: "Protection setting?" → Selected: Deployment Protection → Vercel Authentication, scope "All Deployments" (ADR 0004), set via the Vercel API/CLI if possible, else the learner checkpoint; verify by reading the project config back.
- [auto] Q: "Proof?" → Selected: `scripts/smoke-protection.ts` (`npm run smoke:protection -- <url>…`): unauthenticated GET to the production URL and a PR preview URL must return 401/403 or a redirect to Vercel login, never 200 with app HTML; also checks a deep link and `/data/catalog.json`. Results recorded in `05-VERIFICATION.md`. No bypass secret is committed; E2E stays on local preview (ADR 0004).
- [auto] Q: "Deny-manifest in deploy?" → Selected: reuse Phase 3 `check-bundle.ts` (deny globs, markers, unlisted data, `DEV_ONLY_MARKERS`) in `build:vercel`; add a test proving the Vercel build command fails when a denied file is in `dist/`.

### Decided autonomously
- [Layout] lesson runtime route `src/routes/learn/`, shell routes `src/routes/{home,tracks,whats-new}`, content engine `src/content/` (loader, manifest, MDX components), scripts `scripts/content/` + `scripts/lib/content/` — cheap to move.
- [Tooling] `@axe-core/playwright` 4.14.1 exact pin (CLAUDE.md stack), MDX stack per CLAUDE.md (`@mdx-js/rollup` 3.1.1 `enforce: 'pre'`, `remark-frontmatter`, `remark-mdx-frontmatter`, local `mdx.d.ts`); new deps go through the Phase 4 legitimacy gate.
- [Process] Order: schema + validator → claim components + registry → MDX loader + lesson runtime frame + fixture → walker + gates → frozen IDs + verification + role report → shell → Vercel deploy + protection proof.

### Claude's Discretion
- Exact perf-budget numbers (research to propose, recorded in DESIGN.md §8).
- Visual design of source chips, step frame and shell within DESIGN.md.
- Fixture lesson content (must be short, factually trivial, fully sourced from existing registry entries).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md` — Phase 5 goal and 5 success criteria
- `.planning/REQUIREMENTS.md` — CONT-01..06, PLAT-02..04, QA-01, QA-03..05
- `.planning/PROJECT.md` — Lesson Loop, 60-word rule, ADHD constraints
- `docs/DESIGN.md` — §5 interaction catalogue, §6 lesson templates, §8 quality bar
- `docs/decisions/0001-vite-spa-not-nextjs.md`, `0002-react-router-data-router.md`, `0004-vercel-protection-all-deployments.md`, `0005-study-dev-server-split.md`, `0007-branch-protection.md`, `0008-watch-gym-l1-clip-supply.md`, `0009-pitch-layer-api.md`, `0010-visual-direction.md`
- `research/SOURCE_REGISTRY.json`, `research/SOURCE_ALIASES.json`, `research/roles.json`, `research/competencies.json`, `research/concept-map.json`, `research/curriculum-config.json`
- `schemas/*.schema.json` (esp. `scene.schema.json`, `source.schema.json`) and `src/schemas/` Zod mirrors
- `scripts/check-bundle.ts`, `scripts/check-immutable.ts`, `scripts/lib/guard.ts` — gate patterns to reuse
- `.claude/CLAUDE.md` — stack decisions 5 (content pipeline), 10 (testing), 11 (deploy)
- `.planning/phases/04-design-direction-system/04-CONTEXT.md`, `04-UI-REVIEW.md`, `deferred-items.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 4: `src/ui/*` primitives (Field, Link, Select, Choice, Slider, Tabs, Dialog, Toast, QuizOption, ProgressRing, Badge, Surface, chart primitives), generated `src/styles/tokens.css`, `applyDocumentTheme`, `/dev/gallery`, Playwright config (functional + `@visual` projects), `npm run review:screens`.
- Phase 3: `<Pitch>`, glyphs, legend, SceneLayer, playback bar + clock, drag hook, converter probe, Scene v1 schema + Zod, published Wyscout scene in `public/data/`, `check-bundle.ts` deny-manifest, `check-immutable.ts`.
- Phase 2: frozen source registry (218), roles (15), competencies (49), concept map (164 concepts, Tracks 0–4 approved).
- Phase 1: React Router data router (`src/routes.ts`, dev routes behind `import.meta.env.DEV`), guard, CI with six required checks, husky pre-commit.

### Established Patterns
- JSON Schema + Zod mirror + parity test; generated files with `--check`; Node scripts run as `node file.ts` (erasable TS only); dev-only routes gated by `import.meta.env.DEV`; ports 5173 (dev, learner may hold it), 4173 (study); CHECK/REVIEW port overrides with `--bypass-lock`.

### Integration Points
- `src/routes.ts` gains shell + learn routes; `src/routes/home.tsx` replaced by the real home.
- `vite.config.ts` gains the MDX plugin (`enforce: 'pre'`).
- CI gains the validator, frozen check, walker; Vercel build runs `check-bundle`.

</code_context>

<specifics>
## Specific Ideas

- Every validator message is written for a non-programmer reader: what broke, where, how to fix.
- The fixture lesson exercises every Lesson Loop stage, every claim component, at least one registered interaction with fallback, a quiz, and a pinned Wyscout data ref.
- Invalid fixtures: one per rule, so the validator test proves each message.

</specifics>

<deferred>
## Deferred Ideas

- Lesson Loop runtime polish, glossary, focus mode, confusion button, progress, FSRS — Phase 6.
- Real curriculum lessons — Phases 7–8.
- Vercel protection bypass for running E2E against previews — not needed (ADR 0004).
- CSP header (Phase 4 W-3) — could ride in `vercel.json` headers now; planner may include it if cheap, else later.

</deferred>

---

*Phase: 05-content-engine-app-shell-deploy*
*Context gathered: 2026-11-28*
