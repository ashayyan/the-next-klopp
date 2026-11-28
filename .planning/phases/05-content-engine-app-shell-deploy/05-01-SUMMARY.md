---
phase: 05-content-engine-app-shell-deploy
plan: "01"
subsystem: content
tags: [mdx, vite-plugin, virtual-module, react-router, lessons, fixtures, guard]
status: complete

requires:
  - phase: 04-design-system
    provides: Button primitive, type tokens, routes shape, repo guard, smoke spawn pattern
provides:
  - pinned MDX, axe and dnd-kit packages behind an automated identity gate
  - virtual:tnk-lessons (lessons + lazy MDX loaders) chosen at build time by selectLessons
  - fixture lesson content/_fixtures/fx-a-goal-in-ten-actions (nine Step screens, eight stages)
  - /learn/:lessonId route rendering one Step screen at a time through MDXProvider
  - npm run build:fixtures -> dist-walker/ with .vite/manifest.json
  - dist-walker/ and .vercel/ ignored and denied by the repo guard
affects: [05-02, 05-03, 05-04, 05-05, 05-09, 05-10, 05-15, 05-17, 05-19]

actuals:
  tokens: 10500
  tasks: 2
  commits: 3
plan_head_before: e5c4b21711b27d2d017ee1891740d20504d2b6a1
plan_head_after: ce57eea73d4f48bc21df14bc252412102b4030f0

tech-stack:
  added: ["@mdx-js/react 3.1.1", "@dnd-kit/react 0.5.3", "@mdx-js/rollup 3.1.1", "@mdx-js/mdx 3.1.1", "@types/mdx 2.0.14", "@axe-core/playwright 4.14.1", "remark-frontmatter 5.0.0"]
  patterns:
    - "Build-time content selection in a Vite virtual module: excluded lessons get no dynamic import, so no chunk"
    - "Lesson = folder with lesson.mdx (Step blocks, no imports) + lesson.json (spec)"
    - "Env-flagged builds through a node script that spawns Vite by path with shell: false"

key-files:
  created:
    - scripts/lib/content/vite-plugin.ts
    - scripts/lib/content/vite-plugin.test.ts
    - scripts/lib/content/select.ts
    - scripts/lib/content/select.test.ts
    - scripts/content/build-fixtures.ts
    - scripts/content/selection.test.ts
    - src/mdx.d.ts
    - src/content/lessons.ts
    - src/content/mdx/components.tsx
    - src/routes/learn/LessonPage.tsx
    - src/routes/learn/LessonPage.test.tsx
    - content/_fixtures/fx-a-goal-in-ten-actions/lesson.json
    - content/_fixtures/fx-a-goal-in-ten-actions/lesson.mdx
  modified:
    - package.json
    - package-lock.json
    - vite.config.ts
    - src/routes.ts
    - src/routes.test.ts
    - scripts/lib/guard.ts
    - scripts/guard.test.ts
    - .gitignore
    - docs/SETUP.md

key-decisions:
  - "MDX plugin restricted to include /\\.mdx$/: @mdx-js/rollup strips the query, so docs/DESIGN.md?raw would otherwise compile as MDX"
  - "LessonPage test uses react-dom/static prerender (waits for Suspense) because the repo has no DOM test environment; installing jsdom would need a legitimacy checkpoint"
  - "Provisional LessonSpec type in src/mdx.d.ts until 05-02 lands the Zod mirror"

patterns-established:
  - "virtual:tnk-lessons is the only lesson module; later plans add named exports to it"
  - "Module ids in generated code are root-relative and written with JSON.stringify"

requirements-completed: [CONT-01]

coverage:
  - id: D1
    description: "Fixture lesson renders at /learn/fx-a-goal-in-ten-actions: title h1, one Step screen, Continue to the next step, Finish lesson on the last"
    requirement: CONT-01
    verification:
      - kind: unit
        ref: "src/routes/learn/LessonPage.test.tsx"
        status: pass
  - id: D2
    description: "Study build carries no fixture or non-shipped lesson chunk; fixtures build carries the fixture MDX chunk and a manifest"
    requirement: CONT-01
    verification:
      - kind: integration
        ref: "scripts/content/selection.test.ts"
        status: pass
      - kind: unit
        ref: "scripts/lib/content/select.test.ts"
        status: pass
  - id: D3
    description: "dist-walker/ and .vercel/ ignored and denied by the guard"
    verification:
      - kind: unit
        ref: "scripts/guard.test.ts#rejects fixtures build or Vercel link path"
        status: pass

duration: 15min
completed: 2026-11-28
---

# Phase 5 Plan 01: Content slice (MDX + virtual:tnk-lessons + /learn/:lessonId) Summary

**One fixture lesson travels from `lesson.mdx` + `lesson.json` through a build-time Vite virtual module to `/learn/:lessonId`, and the same module keeps fixtures and drafts out of the study build.**

## Performance

- **Duration:** about 15 min
- **Completed:** 2026-11-28
- **Tasks:** 2 (tracer + TDD)
- **Files:** 22 changed

## Accomplishments

- Automated identity gate passed for all 13 package versions, then exact-pin install. `npm audit signatures`: 244 verified registry signatures, 81 verified attestations. `npm install-scripts ls`: none unreviewed. `remark-mdx-frontmatter` not installed.
- `vite.config.ts`: MDX (enforce pre, `.mdx` only, `providerImportSource: "@mdx-js/react"`, `remark-frontmatter`), React include covers mdx, `lessonsPlugin()`, `@mdx-js/react` in `optimizeDeps`, `build.manifest` only with `VITE_INCLUDE_FIXTURES=1`. Ports 5173/4173 unchanged.
- `virtual:tnk-lessons`: discovers `content/tracks/<t>/<c>/<l>/` and `content/_fixtures/<l>/` (never `invalid/`), applies `selectLessons`, emits `lessons` and `loaders`. Dev server rebuilds the module and full-reloads on lesson file add/change/unlink.
- Fixture lesson: nine `<Step>` screens in the UI-SPEC order, all eight stages, no digit, import, export, expression or frontmatter. Roles and competencies are the sorted union from `research/concept-map.json`.
- `LessonPage`: title `h1`, MDX inside `MDXProvider`, only the current Step renders, "Continue" / "Finish lesson" moves `?step=` with `replace`. Also the UI-SPEC unknown-lesson heading and a minimal "Lesson finished" state.
- `npm run build:fixtures` builds into `dist-walker/` with `.vite/manifest.json`. A study `vite build` has no lesson chunk and no manifest; `check-bundle` ok.

## Package identity gate (npm view output)

| Package | version | license | repository.url | install scripts |
|---------|---------|---------|----------------|-----------------|
| @mdx-js/rollup | 3.1.1 | MIT | git+https://github.com/mdx-js/mdx.git | none |
| @mdx-js/react | 3.1.1 | MIT | git+https://github.com/mdx-js/mdx.git | none |
| @mdx-js/mdx | 3.1.1 | MIT | git+https://github.com/mdx-js/mdx.git | none |
| @types/mdx | 2.0.14 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped.git | none |
| @axe-core/playwright | 4.14.1 | MPL-2.0 | git+https://github.com/dequelabs/axe-core-npm.git | none |
| axe-core (dep `~4.14.1`) | 4.14.1 | MPL-2.0 | https://github.com/dequelabs/axe-core.git | none |
| @dnd-kit/react | 0.5.3 | MIT | git+https://github.com/clauderic/dnd-kit.git | none |
| @dnd-kit/dom | 0.5.3 | MIT | git+https://github.com/clauderic/dnd-kit.git | none |
| @dnd-kit/state | 0.5.3 | MIT | git+https://github.com/clauderic/dnd-kit.git | none |
| @dnd-kit/abstract | 0.5.3 | MIT | git+https://github.com/clauderic/dnd-kit.git | none |
| @dnd-kit/geometry (transitive) | 0.5.3 | MIT | git+https://github.com/clauderic/dnd-kit.git | none |
| @dnd-kit/collision (transitive) | 0.5.3 | MIT | git+https://github.com/clauderic/dnd-kit.git | none |
| remark-frontmatter | 5.0.0 | MIT | git+https://github.com/remarkjs/remark-frontmatter.git | none |

Verdict: all 13 ok. The automated gate replaced the blocking human check under the learner's delegation, as in Phase 4 (04-04). Logged in `docs/SETUP.md` "Package legitimacy".

## Task Commits

1. **Task 1 (tracer): legitimacy gate, pins, MDX in Vite, virtual module, fixture, /learn/:lessonId** - `e13e3b8` (feat)
2. **Task 2 RED: selection, build-scan and guard tests** - `16573ba` (test)
3. **Task 2 GREEN: selection by mode, build-fixtures, dist-walker/.vercel guards** - `ce57eea` (feat)

Tracer gate: `<verify>` re-run end to end after Task 1 (signatures, route tests, tsc, vite build) passed before Task 2.

## Verification

- `npm audit signatures` ok
- `npx vitest run src/routes.test.ts src/routes/learn scripts/lib/content scripts/content scripts/guard.test.ts` pass
- `node scripts/content/build-fixtures.ts` ok, `dist-walker/.vite/manifest.json` exists
- `npx vite build` ok (no lesson chunk), `npx tsc --noEmit` ok, `npx biome ci .` exit 0
- Full suite: 58 files, 1293 passed, 11 skipped

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] MDX plugin compiled `docs/DESIGN.md?raw`**
- **Found during:** Task 1
- **Issue:** `@mdx-js/rollup` strips the query and handles `.md` by default, so the dev-directions and gallery `?raw` imports of DESIGN.md became MDX and `extractTokensBlock` failed (`markdown.replaceAll is not a function`).
- **Fix:** `include: /\.mdx$/` on the MDX plugin.
- **Files:** vite.config.ts. **Commit:** e13e3b8

**2. [Rule 3 - Blocking] No DOM test environment for the LessonPage test**
- **Found during:** Task 1
- **Issue:** The plan asks for a jsdom docblock "as in src/ui/ui.test.tsx", but jsdom is not installed and ui.test.tsx renders with `renderToStaticMarkup`. Installing jsdom is a package install, excluded from auto-fix.
- **Fix:** The test renders the real route through `createMemoryRouter` with `react-dom/static` `prerenderToNodeStream`, which waits for the lazy route and the lazy MDX. "Continue moves to the second step id" is proven by the button's `data-next-step` target plus the same `?step=` replace navigation rendering that step alone. The click itself is exercised in the browser by the walker (05-04).
- **Files:** src/routes/learn/LessonPage.test.tsx. **Commit:** e13e3b8

**3. [Rule 2 - Correctness] Extra plugin unit tests**
- Added `scripts/lib/content/vite-plugin.test.ts`: discovery skips `content/_fixtures/invalid/`, ids are root-relative through `JSON.stringify` with a space in the root path, bad JSON names the file (threat T-05-14). **Commit:** ce57eea

Not a deviation: the selection test strips `NODE_ENV`, `MODE` and `VITEST*` from the child env so the spawned build is a real production build.

## Known Stubs

- `src/mdx.d.ts` `LessonSpec` is a provisional hand-written type; 05-02 replaces it with the Zod-inferred `LessonSpec`.
- `LessonPage` is the minimal slice by design: frame, rail, nav, focus and error states arrive in 05-05 to 05-07.
- The fixture has `quiz: []`, `sources: []`, `dataRefs: []` and no claim components yet; 05-09 adds them.

## Threat Flags

None beyond the plan's register. T-05-06, T-05-14, T-05-15 and T-05-SC mitigations are in place and tested.

## Next Phase Readiness

05-02 can add the lesson schema, curriculum and sources exports to the same `virtual:tnk-lessons` module.

## Self-Check: PASSED
