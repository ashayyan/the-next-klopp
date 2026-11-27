---
phase: 01-setup-contracts
reviewed: 2026-11-27T00:00:00Z
depth: standard
files_reviewed: 51
files_reviewed_list:
  - .env.example
  - .gitattributes
  - .github/branch-protection.json
  - .github/ruleset-main.json
  - .github/workflows/ci.yml
  - .gitignore
  - .gitleaks.toml
  - .husky/commit-msg
  - .husky/pre-commit
  - .husky/pre-push
  - biome.json
  - index.html
  - package.json
  - pipeline/pyproject.toml
  - pipeline/src/klopp_pipeline/__init__.py
  - schemas/common.schema.json
  - schemas/competency.schema.json
  - schemas/concept.schema.json
  - schemas/role.schema.json
  - schemas/source.schema.json
  - schemas/schemas.test.ts
  - schemas/fixtures/competency.fixtures.json
  - schemas/fixtures/concept.fixtures.json
  - schemas/fixtures/role.fixtures.json
  - schemas/fixtures/source.fixtures.json
  - scripts/adr.test.ts
  - scripts/commit-msg.test.ts
  - scripts/commit-msg.ts
  - scripts/guard-files.ts
  - scripts/guard.test.ts
  - scripts/lib/commit-msg.ts
  - scripts/lib/guard.ts
  - scripts/repo-files.test.ts
  - scripts/smoke.ts
  - scripts/verify-setup.ts
  - scripts/verify/docs.ts
  - scripts/verify/hook.ts
  - scripts/verify/memory.ts
  - scripts/verify/routing.ts
  - scripts/verify/skills.ts
  - src/index.css
  - src/main.tsx
  - src/routes.test.ts
  - src/routes.ts
  - src/routes/dev.tsx
  - src/routes/home.tsx
  - src/routes/not-found.tsx
  - src/schemas/contracts.ts
  - tsconfig.json
  - vite.config.ts
  - vitest.config.ts
findings:
  critical: 0
  warning: 9
  info: 9
  total: 18
  necessity: 0
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-11-27
**Depth:** standard
**Files Reviewed:** 51
**Status:** issues_found

## Summary

Reviewed the Phase 1 setup and contract files with focus on guard correctness, CI security, Windows hook behaviour, Zod/JSON Schema drift, smoke script cleanup and dev-route gating.

No BLOCKER found. The dev-route gating works: I grepped the existing `dist/assets` and found no dev chunk text. Hook scripts are Windows-safe (argument arrays, quoted `"$1"`). The workflow uses least-privilege `contents: read` and a SHA-pinned gitleaks action. All three action refs exist (verified through `gh api`).

Weak spots, all verified by running code against the real modules:
- The repo guard is case-sensitive and root-anchored, and its secret patterns miss common token shapes.
- The smoke script can pass against a stale server and has no fetch timeout.
- CI has no job timeouts.
- The Zod mirror disagrees with ajv on at least one input.
- The commit-msg history test is a time bomb.

Necessity pass (standard depth): no necessity findings. I did not load `necessity-review.md`, so none are emitted.

Housekeeping: while probing I accidentally created an empty-ish untracked directory `scratch_tmp_review/` in the repo root (contains `drift.test.ts`). My shell was denied permission to delete it. The orchestrator should run `rm -rf scratch_tmp_review` before committing. It is untracked and outside every vitest include glob, so it cannot affect tests or the guard.

## Warnings

### WR-01: Guard path rules are case-sensitive and root-anchored, so trivial variants bypass them

**File:** `scripts/lib/guard.ts:62-88`
**Issue:** `isDeniedPath` compares `base` and prefixes case-sensitively and only at the repo root. Verified outputs (`null` = allowed):
- `.ENV` -> null
- `Raw/a.csv` -> null
- `data/RAW/a` -> null
- `Feedback/x` -> null
- `sub/node_modules/x.js` -> null
- `a/dist/x.js` -> null

The project runs on Windows (case-insensitive FS, `core.ignorecase=true`). A `git add -f .ENV` or `Raw\x.csv` passes pre-commit and the CI `--tracked` guard. This is the layer the repo documents as non-bypassable. Also `x.sqlite3`, `x.db-wal`, `.webm` and `.m4v` are not in the extension list (the learner's local match clips are an explicit threat in `.env.example`).
**Fix:**
```ts
const p = normalise(path);
const lowerPath = p.toLowerCase();
const segments = lowerPath.split("/");
const base = basename(p);
const lower = base.toLowerCase();

if (segments.includes("raw")) return "raw data folder";
if (lower === ".env" || (lower.startsWith(".env.") && lower !== ".env.example")) return "env file";
// match prefixes at any depth, case-insensitively
for (const prefix of DENIED_PREFIXES) {
  if (lowerPath.startsWith(prefix) || lowerPath.includes(`/${prefix}`)) return `under ${prefix}`;
}
// also: .webm .m4v .wmv .sqlite3 .db-wal .db-shm
```
Keep `public/data/` and `.env.example` exceptions case-insensitive too, and add test cases for `.ENV`, `Raw/x`, and `a/node_modules/x`.

### WR-02: Secret rules miss common token shapes, and NUL bytes disable secret scanning

**File:** `scripts/lib/guard.ts:97-127`, `scripts/guard-files.ts:24-30`
**Issue:** `findSecrets` returned `[]` for all of these (verified):
- `password = "P@ssw0rd!longlongpass"` (value class `[A-Za-z0-9_\-./+=]` excludes `@ ! # $ %`)
- `api-key: "..."` (hyphenated key name)
- `` const token = `...` `` (backtick quote)
- `Authorization: Bearer ...`
- `aws_secret_access_key = "..."`
- Stripe `sk_live_...`
- Google `AIza...`
- npm `npm_...`

`isBinary` treats any file with a NUL in the first 8000 bytes as binary and skips content scanning. A text file with a leading NUL, or a UTF-16 file (full of NULs), is never scanned. Locally the guard is the only secret scanner, because `npx lint-staged` does not scan. gitleaks runs only in CI, after the secret is already in history on the pushed branch.
**Fix:** Add rules for the missing vendors (`sk_live_`, `rk_live_`, `AIza[0-9A-Za-z_-]{35}`, `npm_[A-Za-z0-9]{36}`). Widen the assignment pattern to `[^\s"'`]{16,}` over `["'`]` quotes and `api[-_]?key`. For binary detection, either also scan a `latin1` decode of the first 64 KB for the ASCII token patterns, or decode UTF-16 BOM files before the NUL test. Alternatively run `gitleaks protect --staged` in `.husky/pre-commit` when the binary exists.

### WR-03: No `timeout-minutes` on any CI job

**File:** `.github/workflows/ci.yml:19,32,43,54,65,79`
**Issue:** None of the six jobs sets `timeout-minutes`. The default is 360 minutes. `windows-smoke` starts a dev server and waits on network I/O (see WR-06), so a hang burns six hours of runner minutes. That is a real cost given the repo already hit a billing blocker.
**Fix:** Add `timeout-minutes: 10` to the Linux jobs and `timeout-minutes: 15` to `windows-smoke`.

### WR-04: gitleaks-action likely lacks the permission it needs on pull requests

**File:** `.github/workflows/ci.yml:8-9, 75-77`
**Issue:** The workflow-level `permissions: contents: read` sets every other scope to `none`. On `pull_request` events gitleaks-action lists the PR's commits through the REST API with `GITHUB_TOKEN`, which needs `pull-requests: read` on private repos (and `write` if it posts comments). Under this policy the step will likely fail with 403 "Resource not accessible by integration" on every PR once billing is resolved. `guards` is a required status check, so this would block all merges. This workflow has never run (billing blocker), so it is untested. Confidence: medium. I could not run the action.
**Fix:** Grant the narrow scope on that job only:
```yaml
  guards:
    permissions:
      contents: read
      pull-requests: read
```
Then verify on the first real PR run. If the repo is owned by an organisation, also set `GITLEAKS_LICENSE` (gitleaks-action requires it for org-owned repos).

### WR-05: Smoke test can pass against a stale server instead of the one it started

**File:** `scripts/smoke.ts:33-50, 63-68`
**Issue:** `waitFor` checks `state.code` and then calls `fetch`. If ports 4173 or 5173 are already held by another process, such as the learner's own `npm run dev`, the freshly spawned vite takes a few hundred ms to boot and fail on `strictPort`. The first `fetch` hits the stale server within milliseconds, returns `res.ok`, and the script proceeds. In dev mode the second spawn then also exits non-zero and the script prints `smoke ok (dev)`. The test passes without ever exercising the server it spawned.
**Fix:** Refuse to start when the port is already answering. Probe before `start()`:
```ts
async function portInUse(url: string): Promise<boolean> {
  try { await fetch(url, { signal: AbortSignal.timeout(1000) }); return true; } catch { return false; }
}
if (await portInUse(`${base}/`)) {
  console.error(`smoke FAILED: ${base} already in use; stop that server first`);
  process.exit(1);
}
```

### WR-06: Smoke `fetch` has no timeout and the script has no signal cleanup

**File:** `scripts/smoke.ts:41, 70, 88-97`
**Issue:** `fetch(url)` and `fetch(`${base}/dev`)` have no `AbortSignal`. If the server accepts the connection but never responds, `await fetch` blocks forever, so the `30_000` deadline in `waitFor` is never reached, and with WR-03 CI hangs for 6 hours. There are no SIGINT or SIGTERM handlers, so a cancelled CI run or Ctrl-C can orphan the vite child (and its port) on Windows. `stop()` fires `taskkill` without awaiting; a 1 s sleep is the only guarantee ports are free.
**Fix:** Use `fetch(url, { signal: AbortSignal.timeout(5000) })` at both call sites. Register `process.on("SIGINT" | "SIGTERM", () => { children.forEach(c => stop(c, { code: c.exitCode })); process.exit(130); })`. Use `spawnSync("taskkill", ...)` inside `stop` so teardown is synchronous.

### WR-07: Smoke `/dev` assertion proves nothing, and nothing enforces dev-route exclusion from the study build

**File:** `scripts/smoke.ts:69-72`, `src/routes.test.ts:5-13`
**Issue:** In preview mode `vite preview` serves the SPA fallback, so `/dev` returns HTTP 200 whether or not the dev route exists. The log line `smoke ok (preview): ... and /dev` implies coverage that is not there. `routes.test.ts` only tests `buildRoutes({ includeDev: false })`. The real protection is `import.meta.env.DEV` being constant-folded at build time. Under vitest `DEV` is true, so the test cannot see it. I verified manually that the current `dist/` has no dev chunk, but a future refactor (for example a static `import DevPage` or a barrel export) would silently ship dev routes and no check would fail.
**Fix:** After the build in CI, assert the dev chunk text is absent:
```ts
// scripts/smoke.ts, preview branch
import { readdirSync, readFileSync } from "node:fs";
const assets = readdirSync("dist/assets").filter((f) => f.endsWith(".js"));
for (const f of assets) {
  if (readFileSync(join("dist/assets", f), "utf8").includes("left out of the study build")) {
    throw new Error(`dev route code leaked into dist/assets/${f}`);
  }
}
```
Remove `/dev` from the success message, or assert that the rendered page for `/dev` is the not-found page (needs a browser; Phase 2+).

### WR-08: Commit-msg "repo history" test will fail permanently on any non-conforming historical subject

**File:** `scripts/commit-msg.test.ts:44-52`
**Issue:** The test runs `git log --format=%s` and requires every subject to be conventional. Any later GitHub-UI edit ("Update README.md"), dependabot commit, squash-merge title without a type, or an unrelated commit pulled in via merge will make `npx vitest run` fail on `main` and on every branch containing it. History cannot be rewritten to fix it, and the failure will block every PR because `test` is a required check. It also depends on local history depth: a shallow CI checkout only sees the tip, so the test checks something different in CI than locally.
**Fix:** Scope the test to commits on the current branch since the phase base, or delete it. The pure-function unit tests above it already cover the rule. If history conformance matters, enforce it in a CI step with `git log origin/main..HEAD`.

### WR-09: Zod mirror and JSON Schema disagree on leap-second timestamps, and the agreement test only compares verdicts

**File:** `src/schemas/contracts.ts:15`, `schemas/schemas.test.ts:86-92`, `schemas/common.schema.json:16-20`
**Issue:** Verified by running both validators on the same document: `fetched_at: "2016-12-31T23:59:60Z"` gives `ajv=true zod=false`. ajv-formats' `date-time` accepts `:60` seconds and the pattern `\d{2}` allows it, while `z.iso.datetime()` rejects it. This breaks the invariant stated in the file header ("both validators reach the same verdict on every fixture"). The suite cannot catch it because there is no such fixture. Two further structural weaknesses:
- The test compares only boolean verdicts, so an invalid fixture that both validators reject for an unrelated reason still passes.
- Rules with no negative fixture are unguarded: `maxLength: 80` on `kebabId`, nested `additionalProperties` (license, excerpt, edge, level descriptors), `minItems: 1` on `concepts` and `competencies`, duplicate `sources`/`roles`/`competencies` in `concept`, duplicate `sources` in `role`, and `uniqueItems` on `competency.concepts`.

**Fix:** Make the two agree by adding the same pattern to Zod, for example `utcDateTime = z.iso.datetime().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)`. This still rejects `:60`, so also tighten the JSON side with an explicit `[0-5]\d` seconds in the pattern. Add a `leap-second` invalid fixture. In the test, record the failing JSON Pointer from ajv (`validate.errors[0].instancePath`) and Zod (`issues[0].path`) in each fixture's `expect_path` and compare them. Add the missing negative fixtures listed above.

## Info

### IN-01: Third-party actions pinned by mutable tag; checkout persists the token

**File:** `.github/workflows/ci.yml:22,23,35,36,46,47,57,58,68,71,86,89`
**Issue:** `actions/checkout@v7` and `actions/setup-node@v7` are tag-pinned while gitleaks is SHA-pinned, which is inconsistent. `actions/checkout` persists the `GITHUB_TOKEN` in `.git/config` by default; no job pushes, so it is unneeded exposure to later steps (`npm ci` runs lifecycle scripts).
**Fix:** Pin to SHAs (`3d3c42e5aac5ba805825da76410c181273ba90b1` for checkout `v7`, `949feb2413d6458794dcd2491c4babbbce0c15c1` for setup-node `v7`, both resolved today) and add `with: persist-credentials: false` (keep `fetch-depth: 0` in `guards`).

### IN-02: A leading `#` line lets a non-conventional subject through

**File:** `scripts/lib/commit-msg.ts:14-21`
**Issue:** `firstLine` skips lines starting with `#`. With `git commit -m $'# junk\nfeat: x'` (cleanup mode `whitespace`, not `strip`), git keeps `# junk` as the real subject but the hook validates `feat: x`. Also `core.commentChar` may not be `#`.
**Fix:** Only skip comment lines when the file contains git's template marker, or read `git config core.commentChar` and skip only that character. The bypass is low impact, since `--no-verify` already exists.

### IN-03: Oversize or gitlink entries crash the guard instead of producing a violation

**File:** `scripts/guard-files.ts:11-15, 38-39, 51`
**Issue:** `readFileSync` throws `ERR_FS_FILE_TOO_LARGE` above about 2 GiB, `git cat-file` throws `ENOBUFS` above the 256 MiB `maxBuffer`, and `git cat-file blob :<submodule>` fails for gitlink entries (mode 160000). Each gives an uncaught stack trace rather than `guard: oversize: <path>`. Still fail-closed (non-zero exit), but the message is unhelpful for the exact case the size rule exists for.
**Fix:** In `--tracked`, check `stat.size > MAX_FILE_BYTES` and push a size-only input without reading. In `--staged`, use `git ls-files -s -z` to read mode and size (`git cat-file -s`) first. Skip mode `160000`.

### IN-04: `ALLOW_MAIN_PUSH=0` also bypasses the pre-push guard; unused variables

**File:** `.husky/pre-push:3-4`
**Issue:** The test is `[ -z "$ALLOW_MAIN_PUSH" ]`, so any non-empty value, including `0` or `false`, disables the block. `local_ref local_sha remote_sha` are read but unused (shellcheck SC2034).
**Fix:** `[ "$ALLOW_MAIN_PUSH" != "1" ]`, and name unused variables `_`.

### IN-05: `npx lint-staged` in pre-commit can fetch an unpinned package

**File:** `.husky/pre-commit:2`
**Issue:** If `node_modules` is missing, `npx lint-staged` downloads and runs the latest `lint-staged` from the registry inside a commit hook, ignoring the lockfile.
**Fix:** `npx --no-install lint-staged`.

### IN-06: Hook verifier assumes `git hook run --to-stdin` exists from Git 2.36; fallback skips `sh -e`

**File:** `scripts/verify/hook.ts:29-36, 53, 58-64`
**Issue:** `git hook run` arrived in 2.36, but the `--to-stdin=<path>` option was added in a later release (I believe 2.42; I did not confirm that). On Git between those versions, the pre-push probes fail on an unknown option. The `sh .husky/<hook>` fallback also runs without `-e` (husky's stub uses `sh -e`). In the fallback, `pre-commit` runs `lint-staged` after a failing guard, and the exit status is that of the last command, so the probe result is wrong.
**Fix:** Gate on the real minimum version for `--to-stdin`, and use `["-e", join(".husky", name), ...args]` in the fallback.

### IN-07: Router has no error boundary or hydrate fallback for lazy routes

**File:** `src/main.tsx:13-18`, `src/routes.ts:12-35`
**Issue:** Every route is `lazy` and none has an `ErrorBoundary`. On a Vercel redeploy, a tab holding the old `index` chunk requests a now-missing hashed route chunk, and React Router renders its default "Unexpected Application Error!" page with a stack trace. The app is a rolling-release project, so this is a likely user-visible failure. The initial lazy route also logs React Router's "No `HydrateFallback` element provided" warning and renders blank until loaded.
**Fix:** Add a root-level `ErrorBoundary` route that offers a reload on chunk-load errors, and `HydrateFallback: () => null` (or a small skeleton) to silence the warning.

### IN-08: Guard extension list is thin for the learner's real media and DB files

**File:** `scripts/lib/guard.ts:35-46`
**Issue:** See WR-01 for the bypass side. Separately, `.mp4 .mkv .mov .avi` are listed but `.webm .m4v .wmv .flv .mp3 .wav` are not (the Speak-It Coach stores audio), and `.db` is listed but SQLite sidecar and variant files (`.sqlite3 .db-wal .db-shm .duckdb`) are not. Oversize rule (5 MiB) would catch most, but small clips and DB files pass.
**Fix:** Extend `DENIED_EXTENSIONS` with the missing media and DB types.

### IN-09: `verify docs` version check accepts almost any string

**File:** `scripts/verify/docs.ts:66`
**Issue:** `VERSION_OK` accepts `\d+\.\d+` anywhere (so `see 3.1 below` passes) and `\b[0-9a-f]{7,}\b` (so the English words "defaced", "effaced" or "acceded" pass as a commit hash). The check cannot detect a missing or placeholder version.
**Fix:** Anchor to the cell: `/^v?\d+\.\d+(\.\d+)?([-+][\w.]+)?$|^[0-9a-f]{7,40}$|^built-in$/i`.

---

_Reviewed: 2026-11-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
