# Phase 5: Content Engine, App Shell & Deploy - Pattern Map

**Mapped:** 2026-11-28
**Files analyzed:** 52 new/modified (grouped where one analog serves many)
**Analogs found:** 46 / 52 (6 have no analog; see end)

All analog paths verified git-tracked (from `git ls-files`). No gitignored mirror paths used. Line numbers refer to files read this session.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `schemas/lesson.schema.json`, `verification.schema.json`, `whats-new.schema.json` | config (contract) | transform | `schemas/scene.schema.json`, `schemas/source.schema.json` | exact |
| `schemas/fixtures/{lesson,verification,whats-new}.fixtures.json` | test fixture | transform | `schemas/fixtures/scene.fixtures.json` | exact |
| `src/schemas/lesson.ts` (+ add to `contractSchemas` in `src/schemas/contracts.ts`) | model (Zod mirror) | transform | `src/scene/schema.ts`, `src/schemas/contracts.ts` | exact |
| `schemas/source.schema.json` + `sourceSchema` + `scripts/research/lib/registry.ts` + `research/{laws-of-the-game,pitch-geometry}/sources.json` (add `effective_date`) | config/model | batch | same files (modify) | exact |
| `scripts/lib/words.ts` (moved `countWords`) | utility | transform | `scripts/review/lib.ts:515` | exact |
| `scripts/lib/content/{parse,words,hash,manifest,frozen}.ts`, `rules/*.ts` | utility (pure core) | transform | `src/scene/validate.ts`, `scripts/lib/bundle.ts` | role-match |
| `scripts/lib/content/*.test.ts` | test | transform | `scripts/check-immutable.test.ts`, `scripts/research/lib/registry.test.ts` | role-match |
| `scripts/validate-content.ts` | utility (CLI) | batch | `scripts/check-bundle.ts` | exact |
| `scripts/lib/content/vite-plugin.ts` (virtual `virtual:tnk-lessons`) | config (plugin) | transform | none in repo (see No Analog); closest: `scripts/smoke.ts` for env-flag spawn | partial |
| `scripts/content/build-fixtures.ts` | utility (CLI) | batch | `scripts/smoke.ts:11-20` | exact |
| `scripts/check-frozen.ts` (+ test) | utility (guard CLI) | batch | `scripts/check-immutable.ts` (+ `.test.ts`) | exact |
| `scripts/content/freeze.ts`, `role-report.ts` | utility (generator, `--check`) | batch | `scripts/design/build-tokens.ts`, `scripts/research/render-views.ts` | role-match |
| `scripts/smoke-protection.ts` (+ test) | utility (CLI) | request-response | `scripts/smoke.ts` | role-match |
| `scripts/lib/guard.ts` (add `.vercel/`, `dist-walker/` to `DENIED_PREFIXES`) | config | batch | same file lines 21-30 | exact |
| `scripts/lib/bundle.ts` / `check-bundle.ts` (content-leak markers, `--allow-fixtures`) | utility | batch | same file, `DEV_ONLY_MARKERS` lines 30-47 | exact |
| `src/interactions/schemas.ts` (pure Zod, no React) | model | transform | `src/scene/schema.ts` | role-match |
| `src/interactions/registry.ts` (+ test) | provider/registry | request-response | `src/pitch/glyphs/registry.ts`, `src/routes/dev-gallery/registry.ts` | role-match |
| `src/interactions/<id>/*.tsx` (`quiz-choice`, `predict-then-reveal`, `order-sequence`, pitch-playback, drag-a-player, converter-probe wrappers) | component | event-driven | `src/ui/lesson/QuizOption.tsx`, `src/scene/playback/PlaybackBar.tsx`, `src/pitch/useDraggableEntity.ts`, `src/routes/dev-pitch/ConverterProbe.tsx` | role-match |
| `tests/oracles/<id>.ts` | test (oracle) | event-driven | `tests/functional/pitch-fixes.spec.ts`, `tests/functional/gallery.spec.ts` | partial |
| `src/content/mdx/{Step,Fact,Stat,Rule,Contested,Num,Visual}.tsx` + `claims.test.tsx` | component | request-response | `src/ui/Popover.tsx`, `src/ui/data/StatCard.tsx`, `src/ui/lesson/Badge.tsx` | role-match |
| `src/content/{manifest,loader,nextAction}.ts` + tests | service | transform | `src/routes/dev-pitch/sceneSources.ts` | role-match |
| `src/content/runtime/*` (LessonFrame, StepNav, InteractionSlot) | component | request-response | `src/ui/lesson/StepRail.tsx`, `src/ui/lesson/ShellBar.tsx`, `src/ui/Surface.tsx` | role-match |
| `src/mdx.d.ts` | config | n/a | none (see CLAUDE.md note) | none |
| `src/routes.ts` (modify), `src/routes.test.ts` (modify) | route | request-response | itself | exact |
| `src/routes/home.tsx` (replace), `src/routes/tracks/*`, `src/routes/whats-new.tsx`, `src/routes/learn/*` | route/component | request-response | `src/routes/home.tsx`, `src/routes/not-found.tsx`, `src/routes/dev-gallery.tsx` | role-match |
| `src/ui/shell/{AppBar,Breadcrumb,ListRow,StatusPanel}.tsx` (UI-SPEC new primitives) | component | request-response | `src/ui/lesson/ShellBar.tsx`, `src/ui/Link.tsx` | role-match |
| `vite.config.ts` (modify: MDX + lessons plugin) | config | n/a | itself | exact |
| `playwright.walker.config.ts` | config | n/a | `playwright.config.ts` | exact |
| `playwright.config.ts` (modify: `testIgnore`) | config | n/a | itself | exact |
| `tests/walker/{walker.spec,drivers,perf}.ts` | test | event-driven | `tests/functional/*.spec.ts` | role-match |
| `content/_fixtures/**`, `content/whats-new.json`, `content/frozen.lock.json`, `content/lesson-manifest.json` | content/data | batch | `data/wyscout/v1-*/manifest.json`, `public/data/catalog.json` | partial |
| `.github/workflows/ci.yml` (modify `build`, `test`, `guards`) | config | batch | `visual` job (container) + `guards` job | exact |
| `package.json` scripts, `vercel.json`, `deploy/vercel-protection.json`, `index.html` meta | config | n/a | `package.json`, `deploy/deny-manifest.json` | exact |
| `.husky/pre-commit` (add validate, `check-frozen --staged`) | config | batch | existing hook | exact |
| `docs/DESIGN.md` §8 perf rows, ADR 0007 status note | doc | n/a | existing §8 rows | exact |

## Pattern Assignments

### `scripts/check-frozen.ts` (guard CLI, batch)

**Analog:** `scripts/check-immutable.ts` (118 lines) and `scripts/check-immutable.test.ts`

Header and constants (lines 1-12): dependency-free, erasable TS, git spawned with argument arrays.
```typescript
import { spawnSync } from "node:child_process";
const USAGE = "usage: node scripts/check-immutable.ts --staged | --base <ref>";
const ZERO_SHA = /^0{40,64}$/;
```
Git wrapper (lines 55-61), copy verbatim:
```typescript
function git(args: string[]): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("git", ["-c", "core.quotePath=false", ...args], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status ?? 1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}
```
Base-ref handling (lines 88-98): ZERO_SHA returns 0, unknown ref returns 2, else compare.
```typescript
if (mode === "--base" && argv.length === 2 && argv[1]) {
  const base = argv[1];
  if (ZERO_SHA.test(base)) { console.log("... first push ..."); return 0; }
  const known = git(["rev-parse", "--verify", "--quiet", `${base}^{commit}`]);
  if (known.status !== 0) { console.error(`immutable: unknown ref: ${base}`); return 2; }
```
Entry guard (line 118): `if (import.meta.main) process.exit(main(process.argv.slice(2)));` and export pure functions for tests. Replace the diff with `git show <base>:content/frozen.lock.json` (missing at base = exit 0). Parse JSON by hand, no zod (guards job has no `npm ci`). Messages verbatim from UI-SPEC terminal copy.

**Test pattern** (`check-immutable.test.ts` lines 1-40): pure parser cases with `it.each`, plus CLI cases in a throwaway git repo (`mkdtempSync`, `spawnSync`, `afterEach` cleanup), `const SCRIPT = resolve("scripts/check-immutable.ts")`.

---

### `scripts/validate-content.ts` (CLI, batch)

**Analog:** `scripts/check-bundle.ts` (111 lines)

Arg parsing + usage + exit codes (lines 12-44, 73-111):
```typescript
const USAGE = "usage: node scripts/check-bundle.ts [--dist dist] [--manifest <file>]";
function parseArgs(argv: string[]): {...} | null {
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i]; const value = argv[i + 1];
    if (value === undefined) return null;
    ...
}
function main(argv: string[]): number {
  const args = parseArgs(argv);
  if (args === null) { console.error(USAGE); return 2; }
  ...
  if (violations.length > 0) {
    for (const v of violations) console.error(`bundle: ${v.rule}: ${v.path} (${v.detail})`);
    return 1;
  }
  console.log(`bundle ok: ${files.length} files`);
  return 0;
}
process.exit(main(process.argv.slice(2)));
```
Keep thin: file I/O only here; rules live in `scripts/lib/content/` as pure functions returning `{file,line,ruleId,message}`. Output line `<file>:<line> <rule-id>: <fix>`. Exit 0 ok / 1 breaks / 2 bad args (same convention). Walk with `readdirSync(dir,{withFileTypes:true})` (lines 47-59). Use forward-slash paths via `.replace(/\\/g, "/")`.

---

### `scripts/lib/content/*` (pure rule core)

**Analog:** `src/scene/validate.ts` (issues as plain data, plain-English messages) and `scripts/lib/bundle.ts` (`checkBundle(files, manifest, catalog)` returns violation list).

`src/scene/validate.ts` lines 1-30:
```typescript
export interface SceneIssue { path: string; message: string; }
const LOCAL_ONLY_PROVIDERS: ReadonlySet<string> = new Set(["statsbomb","metrica","skillcorner","last-row"]);
export function checkSceneIntegrity(scene: Scene): SceneIssue[] {
  const issues: SceneIssue[] = [];
  const add = (message: string, ...path: (string | number)[]) => { issues.push({ path: pointer(...path), message }); };
```
Copy: collect-into-array, `add()` closure, no throws. Reuse `LOCAL_ONLY_PROVIDERS` concept for the `data-ref` rule (local-only dataset in a shippable lesson). Reuse `excerptSha256()` from `scripts/research/lib/excerpt-hash.ts` (note: also tracked at `scripts/research/excerpt-hash.ts`; use the `lib/` one named in RESEARCH):
```typescript
export function excerptSha256(passage: string): string {
  const canonical = passage.normalize("NFC").replace(/\s+/g, " ").trim();
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
```
Imports must stay `.ts` with explicit extensions and no JSX/React (Node strips types only).

**Word count:** move `countWords` from `scripts/review/lib.ts:515-517` to `scripts/lib/words.ts` and import from both:
```typescript
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w !== "").length;
}
```
`evalStepWords` (lib.ts:519+) is the consumer; keep `STEP_WORD_LIMIT`.

---

### `schemas/lesson.schema.json` + `src/schemas/lesson.ts` (contract, transform)

**Analog:** `src/scene/schema.ts` + `src/schemas/contracts.ts` + `schemas/schemas.test.ts`

Zod style (`contracts.ts` 11-33): reuse `kebabId`, `isoDate`, `utcDateTime`, `sha256`, `uniqueIds` (all exported).
```typescript
export const kebabId = z.string().max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export function uniqueIds(schema: z.ZodString = kebabId) {
  return z.array(schema).refine((a) => new Set(a).size === a.length, { message: "items must be unique" });
}
```
Use `z.strictObject({...})` everywhere (matches JSON Schema `additionalProperties:false`). Header comment pattern from `scene/schema.ts` lines 1-9: JSON Schema is source of truth, test proves parity, semantic rules live elsewhere.

Registration (`contracts.ts` 153-160): add `lesson`, `verification`, `whats-new` keys (key must equal `schemas/<name>.schema.json` stem; the test at `schemas.test.ts:80-82` asserts the key set equals the file list, so `whats-new` key needs quoting).
```typescript
export const contractSchemas = { source: sourceSchema, concept: conceptMapSchema, ..., scene: sceneSchema };
```
Back-import caution (`scene/schema.ts` 12-14): contracts.ts imports scene schema, so new modules that contracts.ts imports must redeclare `kebabId`, not import from contracts.ts.

Fixtures: each `schemas/fixtures/<name>.fixtures.json` is `{valid:[{name,doc}], invalid:[{name,reason,expect_path,doc}]}`; every invalid entry needs `expect_path` JSON Pointer reported by BOTH ajv and Zod (`schemas.test.ts` 113-140). ajv runs `strict:true`; add `common.schema.json` `$ref`s as the other schemas do.

**Registry additive field** (`effective_date`): add to `sourceSchema` (contracts.ts 61-89) as `effective_date: isoDate.optional()`, mirror in `schemas/source.schema.json` properties (not `required`), carry in `scripts/research/lib/registry.ts` near lines 210-216 (conflict rule) and 325-326 (explicit field list), then `node scripts/research/build-registry.ts`. Existing conflict helper:
```typescript
conflict("as_of", (s) => s.as_of);
```
Add `effective_date` to `research/laws-of-the-game/sources.json` and `research/pitch-geometry/sources.json` (value `2026-07-01`).

---

### `src/interactions/registry.ts` + `schemas.ts` (registry, request-response)

**Analogs:** `src/pitch/glyphs/registry.ts`, `src/routes/dev-gallery/registry.ts` (id-keyed registries with an inventory/coverage test: `src/routes/dev-gallery/gallery.test.tsx`, `inventory.json`). Read these before writing; the gallery test that fails when an inventory entry lacks a demo is the model for the "entry lacks schema/fallback/oracle" test. Split rule (RESEARCH Pitfall 4): `schemas.ts` is pure Zod and importable from Node; `registry.ts` imports `schemas.ts`, never the reverse.

Lazy component pattern: copy the route `lazy` style from `src/routes.ts` 14-19:
```typescript
lazy: async () => ({ Component: (await import("./routes/home.tsx")).default })
```
Registry test per id: props schema present, fallback present, `existsSync("tests/oracles/<id>.ts")`, both `complete` and `assertDone` exported.

---

### `src/interactions/<id>/*.tsx` (components, event-driven)

- `quiz-choice`, `predict-then-reveal`: **Analog** `src/ui/lesson/QuizOption.tsx`. Reuse `QuizOption`, `QUIZ_CORRECT`, `QUIZ_INCORRECT` copy and the state union (`idle|hover|focus|selected|correct|incorrect|disabled`). Import `CONTROL_BASE` from `../Button.tsx` pattern; icons from `../icons/index.tsx`. No shake/bounce.
- pitch-playback wrapper: **Analog** `src/scene/playback/PlaybackBar.tsx` (`PlaybackBar({ store })`) + `createPlaybackStore` (`store.ts:56`) and `defaultMotion(prefersReducedMotion)` (`store.ts:48`: Stepped under reduced motion). Fallback must teach the same thing without animation (use Stepped mode + readout `FrameReadout.tsx`).
- drag-a-player: **Analog** `src/pitch/useDraggableEntity.ts` (`useDraggableEntity(options): DraggableBinding`) and `src/pitch/nudgeTracker.ts`; keyboard arrow-nudge is already the fallback path.
- converter probe: **Analog** `src/routes/dev-pitch/ConverterProbe.tsx` (+ `probe.ts`). Move/extract the dev-only code carefully: dev route chunks must not leak into study (`DEV_ONLY_MARKERS` in `scripts/lib/bundle.ts:30-47`; markers name `src/routes/dev-pitch.tsx` etc.).
- `order-sequence`: no repo analog for sortable list; use `@dnd-kit/react` 0.5.3 per RESEARCH; Move up/down buttons from `src/ui/Button.tsx` as keyboard path.

Popup/chip pattern for claim source chips (`src/ui/Popover.tsx` 5-45): `Popover({ trigger, tooltip?, title?, open?, onOpenChange?, className?, portalContainer?, initialFocus?, children })`, Base UI, closes on Escape, returns focus to trigger. Chips use it with `trigger` = a `Button variant="quiet"`.

---

### `src/content/mdx/*` claim components (component)

**Analog:** `src/ui/Popover.tsx` (chip popup), `src/ui/data/StatCard.tsx` (Stat presentation), `src/ui/lesson/Badge.tsx` ("contested" label). Tokens only (`text-label`, `text-body`, `bg-surface-panel`, `border-control-border`, `text-ink`, `text-ink-muted`; no arbitrary values, per UI-SPEC line 46). All chrome text rendered inside a step carries `data-claim-meta` so word counters skip it (RESEARCH Pitfall 1). Block vs inline: `Step`, `Visual`, `Rule`, `Contested` are flow elements; `Fact`, `Stat` (inline), `Num` are text elements (Pitfall 2). Data-bound `<Stat data="dataset/version/file#field">` fetches `/data/...` and mirrors the loader's content-type check from `src/routes/dev-pitch/sceneSources.ts` (`FetchLike`, `LoadResult` union of `none|ready|empty|invalid|missing-local|error`):
```typescript
export type FetchLike = (input: string) => Promise<Response>;
export type LoadResult = { status: "none" } | { status: "ready"; ... } | { status: "invalid"; issues } | { status: "error"; message: string };
```
Copy that discriminated-union load-state shape for loading/error/ready of Stat and the lesson loader.

---

### `src/content/{manifest,loader,nextAction}.ts`

**Analog:** `src/routes/dev-pitch/sceneSources.ts` for load results + injected `FetchLike` (testable). `nextAction()` is a pure function with a unit test (`src/routes/dev-pitch/probe.test.ts` / `src/pitch/view.test.ts` style: plain vitest, no DOM). Imports come only from `virtual:tnk-lessons` (declare module in a d.ts) so excluded lessons emit no chunk. Emit root-relative ids via `JSON.stringify` (ADR 0006, paths with spaces).

---

### `src/routes.ts` + `src/routes.test.ts` (route)

**Analog:** itself. Add shell routes in the same `lazy` shape (lines 14-19), before the `*` catch-all (lines 70-75). New routes: `/`, `/tracks`, `/tracks/:trackId`, `/tracks/:trackId/:chapterId`, `/learn/:lessonId`, `/whats-new`. Dev block stays behind `includeDev && import.meta.env.DEV` (line 23). Update the header comment (lines 8-11 mention `/learn/:trackId/:chapterId/:lessonId`; CONTEXT now says `/learn/:lessonId`).

Test updates (`routes.test.ts`): the two exact `toEqual` path lists (lines 7-17 and 22) must be extended; the third test resolves every lazy route to a component function (lines 25-32), so each new route must export a default `Component`.
```typescript
expect(paths).toEqual(["/", "*"]);   // line 22: study build list; extend with new shell routes
```

Page style baseline (`src/routes/home.tsx`, `not-found.tsx`): `export default function XPage()`, `Link` from `react-router`, `inline-flex min-h-11 items-center underline` for 44 px targets, dev-only link gated by `import.meta.env.DEV`. Replace with UI-SPEC screens using `src/ui/*` primitives.

---

### `vite.config.ts` (config)

**Analog:** itself (38 lines). `plugins: [react(), tailwindcss()]` at line 6 becomes the sketch in RESEARCH Code Example 1 (MDX with `enforce: "pre"`, `react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ })`, `lessonsPlugin()`). Keep `server: { port: 5173, strictPort: true, host: "localhost" }` and `preview: { port: 4173, ...}` unchanged (line 36-37). `vitest.config.ts` uses `mergeConfig(viteConfig, ...)`, so the MDX plugin loads in tests too; confirm `include` globs still cover `scripts/lib/content/**/*.test.ts` (`scripts/**/*.test.ts` already does) and add nothing for `tests/` (Playwright).

---

### `playwright.walker.config.ts` (config) and `playwright.config.ts` (modify)

**Analog:** `playwright.config.ts`. Copy the `ci` flag, `channel: ci ? undefined : (process.env.REVIEW_CHANNEL ?? "chrome")`, `reporter`, `retries: 0`, and `reuseExistingServer: !ci` (lines 8-37). Differences: `testDir: "tests/walker"`, `outputDir: "test-results/walker"`, `webServer.command` = `node node_modules/vite/bin/vite.js preview --outDir dist-walker --port 4174 --strictPort`, `url: http://localhost:4174/`, no `snapshotPathTemplate`/projects. In the main config add `testIgnore: ["walker/**"]` next to `testDir: "tests"` (line 14).

---

### `scripts/content/build-fixtures.ts` (CLI)

**Analog:** `scripts/smoke.ts` lines 11-20 (spawn vite by path, no shell, Windows-safe):
```typescript
const vite = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [vite, ...viteArgs], { stdio: ["ignore", "inherit", "inherit"] });
```
Add `env: { ...process.env, VITE_INCLUDE_FIXTURES: "1" }` and args `["build", "--outDir", "dist-walker"]`. Use `spawnSync` with `stdio: "inherit"` and propagate the exit code. Also copy the cleanup idiom (lines 54-72: `taskkill /pid ... /T /F` on win32; SIGINT/SIGTERM handlers) only if a long-running child is needed (not for a build).

---

### `scripts/smoke-protection.ts` (CLI, request-response)

**Analog:** `scripts/smoke.ts` for fetch-with-timeout style (`fetch(url, { signal: AbortSignal.timeout(5000) })`, lines 43, 99) and exit via `process.exitCode = 1` (line 128). Use `redirect: "manual"`, no cookies, no bypass header. Export a pure `classify({status, headers, body})` to unit-test on recorded fixtures (PROTECTED / PUBLIC / NOT PROVEN). Fingerprint `<meta name="application-name" content="the-next-klopp">` added to `index.html`. Never `vercel curl`.

---

### `scripts/check-bundle.ts` / `scripts/lib/bundle.ts` (modify)

**Analog:** itself. Leak markers pattern (`bundle.ts:30-47`):
```typescript
export const DEV_ONLY_MARKERS: readonly { marker: string; source: string }[] = [
  { marker: "left out of the study build", source: "src/routes/dev.tsx" },
  ...
];
```
and the check loop (lines 121-125) emitting `{ rule: "dev-leak", path, detail }`. Add a `content-leak` rule reading `content/lesson-manifest.json` titles for non-shipped lessons + fixtures; add `--allow-fixtures` to `parseArgs` (the `for (i += 2)` pair parser at check-bundle.ts 32-44 means a boolean flag needs a special case). `build:vercel` script = `vite build && node scripts/check-bundle.ts` (use `node scripts/...` not `&&`-chained shell-specific commands beyond what existing scripts use: the repo already uses `vite build && vite preview` at `package.json:11`, so `&&` is accepted).

Test: extend `scripts/check-bundle.test.ts`.

---

### `.github/workflows/ci.yml` (modify)

**Analog:** the `visual` job (lines 140-164) for the container, and `guards` (74-96) for the env-passed ref.

`build` job becomes (key stays `build`; add container + 20 min):
```yaml
  build:
    runs-on: ubuntu-24.04      # visual job uses this with the container
    timeout-minutes: 20
    container:
      image: mcr.microsoft.com/playwright:v1.65.1-noble
    steps:
      - uses: actions/checkout@... # pin SHAs copied from existing steps
      - uses: actions/setup-node@... with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: npx vite build
      - run: node scripts/check-bundle.ts
      - run: node scripts/content/build-fixtures.ts
      - run: npx playwright test -c playwright.walker.config.ts
        env:
          HOME: /root
```
Reuse the exact pinned action SHAs and `HOME: /root` from the `visual` job; upload-artifact step pattern from lines 157-164. `guards` job gets a `check-frozen` step mirroring lines 89-93 (BASE via `env:`, never interpolated into the script body). `test` job adds `npm run validate` (has `npm ci`). Add `scripts/ci-walker.test.ts` parsing ci.yml (build job has container + walker step; key `build` unchanged).

---

### `src/ui/shell/{AppBar,Breadcrumb,ListRow,StatusPanel}.tsx` and `src/ui/lesson/*` consumers

**Analog:** `src/ui/lesson/ShellBar.tsx` (props interface exported, forced `state?: string` written to `data-state`, tokens only) and `src/ui/Surface.tsx` (small literal-class tables):
```typescript
const LEVELS: Record<SurfaceLevel, string> = { page: "bg-surface-page", ... };
```
Rule from `StepRail.tsx` lines 40-56: "Literal class tables: Tailwind only generates classes it can read in the source." Never build class names dynamically.

**Rail gotcha:** `StepRail` has seven ids (`hook, see-it, touch-it, predict, do-it, lock-it-in, connect-it`, lines 4-12) while the lesson spec has eight stages (`hook, see, touch, predict, reveal, do, lock-in, connect`). Use the UI-SPEC mapping table (UI-SPEC ~line 259-265) in a single pure function with a test; do not change `LESSON_LOOP_STEPS` (design baselines depend on it).

New primitives need gallery entries (`src/routes/dev-gallery/registry.ts` + `inventory.json` + `demos/*.tsx`) because the gallery test enforces inventory coverage; visual baselines are Linux-CI only (never commit Windows PNGs).

---

### `tests/walker/*`, `tests/oracles/*` (test, event-driven)

**Analog:** `tests/functional/*.spec.ts` (read `pitch-fixes.spec.ts`, `gallery.spec.ts` before writing for locator and keyboard idioms). Config conventions: no `@visual` tag in walker specs; manifest read with `readFileSync("content/lesson-manifest.json")` at module top; one `test.describe` per lesson. Axe/perf/reduced-motion snippets: RESEARCH Code Examples 3, 4, 5 verbatim. Typed driver interfaces: RESEARCH Pattern 6.

---

### `.gitignore`, `scripts/lib/guard.ts`

Add `.vercel/` and `dist-walker/` to `.gitignore` and to `DENIED_PREFIXES` (`guard.ts` lines 21-30 list `"feedback/", "public/pyodide/", ... "node_modules/", "dist/"`). Note `.gitignore` ignores `.env.*` except `.env.example`, so do not use a `.env.fixtures` file.

---

## Shared Patterns

### Erasable TypeScript CLI scripts
**Source:** `scripts/check-immutable.ts`, `scripts/check-bundle.ts`
**Apply to:** every new `scripts/**/*.ts`
- Header comment: usage, exit codes (0 ok, 1 violations, 2 bad args/unknown ref), "Dependency-free. Erasable TypeScript only."
- `import { x } from "./lib/y.ts"` (explicit `.ts`), no enums/namespaces/parameter properties.
- `export function main(argv): number` + `if (import.meta.main) process.exit(main(process.argv.slice(2)));` (check-immutable.ts:118) so tests import without running. (check-bundle.ts calls `process.exit(main(...))` unconditionally; do not copy that for testable scripts.)
- Spawn with argument arrays and `shell: false`; Windows-safe paths via `node:path` `join`, normalise output with `.replace(/\\/g, "/")`.

### Generated files with `--check`
**Source:** `scripts/design/build-tokens.ts` (`npm run tokens` / `tokens:check`), `scripts/research/build-registry.ts`
**Apply to:** `content/lesson-manifest.json`, `docs/reports/role-coverage.{md,json}`, `content/frozen.lock.json`
Pair every generator with a `--check` mode and a package.json `x` / `x:check` script (`package.json:35-36`).

### Dual-validator (JSON Schema + Zod) contract
**Source:** `schemas/schemas.test.ts` + `src/schemas/contracts.ts`
**Apply to:** lesson, verification, whats-new, and the interaction props schemas if exposed as JSON
Fixtures need `expect_path`; both validators must report it.

### Plain-English problem messages as data
**Source:** `src/scene/validate.ts` (`SceneIssue {path, message}`), UI-SPEC "Terminal copy" (lines ~510-530)
**Apply to:** every validator rule, check-frozen, smoke-protection. Use UI-SPEC strings verbatim; one test per rule iterating `content/_fixtures/invalid/*`.

### Dev/draft isolation from study and Vercel bundles
**Source:** `src/routes.ts:23` (`includeDev && import.meta.env.DEV`), `DEV_ONLY_MARKERS` (`bundle.ts:30-47`), `scripts/smoke.ts:97-109` (marker scan over `dist/assets/*.js`)
**Apply to:** lessons virtual module, fixtures, drafts. Extend the smoke marker scan to the new leak markers.

### Design tokens and primitives only
**Source:** `src/ui/*`, UI-SPEC line 46
**Apply to:** all new components. No hex, no arbitrary px, no emoji, one primary button per screen.

### Test layout
**Source:** `vitest.config.ts` include globs: `src/**/*.test.{ts,tsx}`, `scripts/**/*.test.ts`, `schemas/**/*.test.ts`, environment `node` (component tests need a per-file `// @vitest-environment jsdom` docblock; check `src/ui/ui.test.tsx` and `src/pitch/pitch.test.tsx` for the exact idiom before writing `claims.test.tsx`). `tests/**` is Playwright only.

### DESIGN.md §8 lock
**Source:** `scripts/design/design-md.test.ts` (lines ~481-528)
New perf rows must not start with a backticked id in column 1; keep existing strings `200 KB`, `180 KB gzip`, `CLS below 0.1`, `60 fps`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `scripts/lib/content/vite-plugin.ts` (virtual module `virtual:tnk-lessons`) | config (Vite plugin) | transform | No custom Vite plugin exists in repo; follow RESEARCH Pattern 1 (resolveId/load, `server.watcher` invalidation). Declare `virtual:tnk-lessons` in a `.d.ts`. |
| `src/mdx.d.ts` | config | n/a | No MDX yet; use `/// <reference types="mdx" />` (RESEARCH Pitfall 10; tsconfig `types` restricts ambient types). |
| MDX parsing (`parse.ts`) | utility | transform | No mdast code in repo; RESEARCH Pattern 2 and Code Example 2. |
| `order-sequence` interaction | component | event-driven | No sortable-list component exists; `@dnd-kit/react` per RESEARCH. |
| Vercel files (`vercel.json`, `deploy/vercel-protection.json`) | config | n/a | No existing Vercel config; RESEARCH Code Example 6 and Pattern 9. Closest data-file convention: `deploy/deny-manifest.json` (loaded by `loadDenyManifest` in `scripts/lib/globs.ts`). |
| `playwright` oracle modules | test | event-driven | No `tests/oracles/` convention; typed interface in RESEARCH Pattern 6. |
| `content/**` lesson MDX/JSON authoring | content | batch | First lesson content in repo; data-ref format mirrors `data/wyscout/v1-809b8aff1fda/manifest.json` and `public/data/catalog.json` (`<dataset>/<version>/<file>`). |

## Metadata

**Analog search scope:** `scripts/`, `schemas/`, `src/` (ui, scene, pitch, routes, schemas), `tests/`, `.github/workflows/`, root configs.
**Files read:** check-immutable.ts, check-bundle.ts, contracts.ts, schemas.test.ts, routes.ts, routes.test.ts, vite.config.ts, playwright.config.ts, ci.yml (40-164), package.json, smoke.ts, scene/schema.ts (1-60), scene/validate.ts (1-40), home.tsx, not-found.tsx, main.tsx, StepRail/QuizOption/ShellBar (heads), Popover, Surface, excerpt-hash.ts, bundle.ts markers, vitest.config.ts, check-immutable.test.ts (1-40).
**Not read (planner/executor should read before copying):** `src/pitch/glyphs/registry.ts`, `src/routes/dev-gallery/{registry,gallery.test}.ts(x)`, `tests/functional/*.spec.ts`, `scripts/design/build-tokens.ts`, `src/ui/data/StatCard.tsx`, `src/ui/ui.test.tsx`.
**Pattern extraction date:** 2026-11-28
