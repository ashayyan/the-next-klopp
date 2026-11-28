---
phase: 02-research-wave-1
reviewed: 2026-11-28T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - biome.json
  - package.json
  - pipeline/pyproject.toml
  - pipeline/src/klopp_pipeline/cli.py
  - pipeline/src/klopp_pipeline/coverage.py
  - pipeline/src/klopp_pipeline/models.py
  - pipeline/src/klopp_pipeline/net.py
  - pipeline/tests/record_fixtures.py
  - pipeline/tests/test_coverage.py
  - scripts/research/build-registry.ts
  - scripts/research/build-summary.ts
  - scripts/research/check-domain.ts
  - scripts/research/check-summary-browser.ts
  - scripts/research/derive-links.ts
  - scripts/research/excerpt-hash.ts
  - scripts/research/gate.ts
  - scripts/research/remember-verdicts.ts
  - scripts/research/render-views.ts
  - scripts/research/summary.test.ts
  - scripts/research/lib/coverage-schema.ts
  - scripts/research/lib/derive.ts
  - scripts/research/lib/domains.ts
  - scripts/research/lib/excerpt-hash.ts
  - scripts/research/lib/graph.ts
  - scripts/research/lib/layout.ts
  - scripts/research/lib/registry.ts
  - scripts/research/lib/research-files.ts
  - scripts/research/lib/research-io.ts
  - scripts/research/lib/sample-domain.ts
  - scripts/research/lib/summary-html.ts
  - scripts/research/lib/summary-page.js
  - scripts/research/lib/views.ts
findings:
  critical: 0
  warning: 12
  info: 7
  total: 19
  necessity: 0
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-11-28
**Depth:** standard
**Files Reviewed:** 32 (source files in full; most `*.test.ts` files only skimmed or grepped for network, timing and skip behaviour)
**Status:** issues_found

## Summary

Network fetch safety in `net.py` holds up. HTTPS is enforced. The allow-list is checked on the first request and on every redirect. Cache keys are SHA-256 of the URL, so there is no path traversal. The body is capped on both `Content-Length` and the actual read. `GITHUB_TOKEN` goes only to `api.github.com` and is stripped on redirects to other hosts. The summary page is solid. Every dynamic node uses `textContent`. Links are limited to http(s). `<` is JSON-escaped in the data block. The inline script is hashed into the CSP, and the browser check proves that a wrong hash stops the script. `remember-verdicts.ts` never prints or persists the secret. Graph and derive logic is acyclic-checked and idempotent on the real data. Both `build-registry --check` and `derive-links --check` pass today.

No security blockers were found. The problems are correctness and robustness gaps. Several quality gates can fail open or give a misleading answer. The sanitiser behind the generated Markdown views can be bypassed. Coverage provenance is overstated. The registry merge silently drops licence conflicts. The stale-approval verdict never refreshes.

No necessity findings. The necessity rubric was read and applied. No guard was shown to defend an impossible state.

## Warnings

### WR-01: `cell()` sanitiser can be bypassed and rebuilds a `<script>` tag

**File:** `scripts/research/lib/views.ts:16-23`
**Issue:** `cell()` strips HTML tags with a single-pass regex. Nested input reassembles a tag after the strip. Verified: `cell("<<b>script>alert(1)<</b>/script>")` returns `<script>alert(1)</script>`. T-02-09 names this escaping as the defence for text that "came from agents or the web". The output is committed Markdown (`GAPS.md`, `CONCEPT_MAP.md`, `ROLE_COMPETENCIES.md`) that is read in editors and on GitHub. Most viewers sanitise, but the function does not do what its comment claims.
**Fix:** Loop to a fixed point, or neutralise every angle bracket instead of matching tags.
```ts
export function cell(text: string): string {
  return text
    .replace(/[\r\n]+/g, " ")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\|/g, "\\|");
}
```
Update the `views.test.ts` expectation that currently asserts tags are removed. Also escape an existing trailing backslash before the pipe so `x\|` cannot reopen the cell.

### WR-02: `main()` guard fails open: `--check` exits 0 silently when the path is a junction or symlink

**File:** `scripts/research/build-registry.ts:144`, `scripts/research/derive-links.ts:75`
**Issue:** `import.meta.filename === process.argv[1]` compares the real path with the unresolved argv path. Reproduced on this machine: `node link/m.ts` through a directory junction prints "MAIN SKIPPED". For these two CLIs that means no output and exit code 0. `build-registry.ts --check` and `derive-links.ts --check` are staleness gates, so they would pass without checking anything. `render-views.ts` and `build-summary.ts` call `main()` unconditionally, so the four CLIs behave differently.
**Fix:** Call `main()` unconditionally in the CLI files and move the exports that tests import into `lib/`. Or compare `realpathSync(process.argv[1])` with `import.meta.filename`. Make the not-main branch exit non-zero when `process.argv[1]` is a `.ts` file that matches the module's basename.

### WR-03: Coverage rows stamp `fetched_at = now` for data that came from the cache

**File:** `pipeline/src/klopp_pipeline/cli.py:41-42`, `pipeline/src/klopp_pipeline/net.py:92-97`, `pipeline/src/klopp_pipeline/coverage.py` (every `fetched_at=now`)
**Issue:** `fetch_bytes` serves cached bodies for up to 24 h, and forever with `--offline`. `run_coverage` stamps every row, and the matrix header, with the run time. A matrix built with `--offline` from a month-old cache is labelled as fetched today. The rows are the "as of" evidence the project's traceability rule relies on. The `*.meta.json` file records the true `fetched_at` but nothing reads it.
**Fix:** Have the fetcher return `(bytes, fetched_at)`, or expose `net.cache_age(url)`. Use the per-URL timestamp for each row's `fetched_at` and use the oldest value for `generated_at`. At minimum, put `offline`/`cached` into the row notes.

### WR-04: Last Row counts goals (plays) as `matches_total` and `pl_matches`

**File:** `pipeline/src/klopp_pipeline/coverage.py:333-377`
**Issue:** `total` and `pl` are counts of distinct play labels (Liverpool goals). They are stored in fields named `matches_*` and summed into the headline "Premier League matches by provider" table. Two goals in one match count twice. `lastrow_rows` also hard-codes "19 goals, 13 in the Premier League, 6 in the Champions League" in the notes string, separately from `LASTROW_MANUAL_TOTAL`, `LASTROW_MANUAL_PL`, and from the recounted `total` and `pl` in deep mode. In deep mode the notes then disagree with the numbers.
**Fix:** Either count distinct matches (derive the opponent and date from the play label), or add a `unit` field ("match" or "play") and render it in the table. Build the hard-coded notes from the constants. Do not sum play counts into the PL match headline.

### WR-05: `fetch_bytes` writes the cache non-atomically and lets `OSError` escape as a non-`FetchError`

**File:** `pipeline/src/klopp_pipeline/net.py:92-96, 120-123`
**Issue:** `body_path.write_bytes(data)` writes in place. An interrupted run leaves a truncated body that is served for 24 h, and indefinitely with `--offline`. The truncated JSON then fails to parse and the provider becomes `unreachable`, which gives a misleading reason. `read_bytes`, `mkdir` and `write_bytes` can raise `OSError` (locked file, disk full, long path on Windows). That error is not a `FetchError`, so `run_coverage` does not catch it and the whole CLI aborts. `meta.json` is written after the body, so a crash between the two leaves a body with no meta.
**Fix:** Write to `body_path.with_suffix(".tmp")` and `os.replace`. Write the meta first or together. Wrap cache I/O in `try/except OSError` and either raise `FetchError` or ignore a bad cache entry.

### WR-06: `run_coverage` does not catch `csv.Error`, `AttributeError`, `IndexError` or `OSError`

**File:** `pipeline/src/klopp_pipeline/coverage.py:357, 514`
**Issue:** The deep Last Row recount catches `(FetchError, ValueError, KeyError)`. `csv.Error` is not a `ValueError`, for example the field-size-limit error on a hostile or corrupt CSV. `run_coverage` catches `(FetchError, ValueError, KeyError, TypeError)`. Malformed provider JSON that yields `AttributeError` (`m.get` on a non-dict) or `IndexError` kills the whole run instead of producing the documented "one honest unreachable row per provider".
**Fix:** Add `csv.Error` to the deep handler. In `run_coverage` catch `Exception` per provider (it is already a per-provider boundary) and record `type(exc).__name__` in the row.

### WR-07: `remember-verdicts.ts` never refreshes the approval verdict once it is stored

**File:** `scripts/research/remember-verdicts.ts:23-30, 119-123`
**Issue:** Idempotence is "an entry starting with the title exists". `approvalOutcome()` is dynamic: it returns "no approval record yet" when `APPROVAL.md` is missing, otherwise status and date. If the script runs once before approval, the "research approval (RSCH-06)" verdict stays as the pending text forever. A re-run prints "already stored". Agents later recall a wrong approval state. The text also hard-codes "by an independent Opus pass under learner delegation" regardless of what `APPROVAL.md` says. The GET also relies on `?project=` filtering and an unpaginated list.
**Fix:** For dynamic verdicts, compare the full stored content, not only the title prefix. When it differs, post a superseding memory or delete and re-post through the server's API. Read the reviewer and delegation wording from `APPROVAL.md`. Fail loudly when the list endpoint is truncated.

### WR-08: Registry merge reports no conflict for licence name, terms URL or `type`, and `type` first-seen can drop `regulation`

**File:** `scripts/research/lib/registry.ts:208-222`
**Issue:** "Most restrictive licence wins" is implemented for the four permission fields only. `license.name` and `license.terms_url` come from the first member that has one, and they are not compared across members. A merged source can show "CC BY" as its name while another origin recorded a stricter licence, and `--report` shows no sign of it. The real report already shows `src-pl-handbook-2026-27` merged as `official-document` (first seen) while one origin said `regulation`. The permission rank also treats an unrecognised value as `unknown` (rank 2) and can keep that invalid string as the winner if it is first.
**Fix:** Add `license.name` and `license.terms_url` to the `conflict()` reporting. When any member has a stricter `type` (for example `regulation`), prefer it or fail the merge. Reject values that are not in `RESTRICTIVENESS` instead of defaulting them.

### WR-09: Excerpt alias can shadow a live excerpt id

**File:** `scripts/research/lib/registry.ts:279-288`
**Issue:** When two members of the same group have the same excerpt id but different sha256, the second is renamed, and the alias key `"<m.source.id>#<ex.id>"` is recorded. If `m.source.id === id`, that key is identical to the surviving first excerpt's own reference, `id#ex.id`. The alias map then redirects the original, still-valid citation to the renamed excerpt. Today the report shows 0 renames, so this is latent. No code in `scripts/` resolves `excerptAliases` yet; only tests read it.
**Fix:** Skip the alias when `m.source.id === id`. Otherwise rename the second excerpt only when the citing origin is known. Add a registry test with a same-id, same-excerpt-id, different-hash pair.

### WR-10: Browser check leaks the browser process and can mask the real error

**File:** `scripts/research/check-summary-browser.ts:148-162, 285-294`
**Issue:** The child is `detached` and `unref`'d, and it is closed only through `browserWs.send("Browser.close")`. If the debug-port wait times out (30 s) or `Cdp.connect` fails, `browserWs` is `null` and the browser keeps running with a locked profile directory. `rmSync(..., maxRetries: 10)` in `finally` can then throw `EBUSY` and replace the original error. `Cdp.send` also never rejects when the socket closes, so a crashed browser hangs the run until the 90 s test timeout.
**Fix:** Keep the `child` handle and call `child.kill()` in `finally`. Wrap `rmSync` in try/catch. Reject all `pending` promises on the `close` event.

### WR-11: Fetcher rules are not fully tested: token strip on redirect, `Content-Length` cap, timeout

**File:** `pipeline/tests/test_coverage.py:288-334`
**Issue:** `_SafeRedirectHandler` strips `Authorization` when a redirect leaves `api.github.com`, and `fetch_bytes` rejects a declared `Content-Length` over the cap. Neither branch has a test. The redirect test only covers refusal of bad hosts. `FakeOpener.open` ignores `timeout`, so the 30 s rule is unverified. The timeout is per socket operation, not a total deadline, so a slow-drip response from an allowed host can run long. `check_url` also ignores the port, so `https://api.github.com:8443/` is accepted.
**Fix:** Add tests that call `redirect_request` from an `Authorization`-bearing request to `raw.githubusercontent.com` and assert the header is gone, and one with `headers={"Content-Length": "999"}`. Assert `timeout=net.TIMEOUT_SECONDS` in the fake opener. Reject any `parts.port not in (None, 443)` in `check_url`. Add a wall-clock budget around the read loop.

### WR-12: Untracked `scratch_tmp_review/` in the repository root is picked up by the gates

**File:** `scratch_tmp_review/drift.test.ts:1-30`
**Issue:** The directory is untracked and not ignored. It was already present in the initial `git status`; this review did not create it. `drift.test.ts` matches the Vitest default `**/*.test.ts` pattern and imports `../src/schemas/contracts.ts`. It uses `any`, so `npm test` and `npm run lint` (Biome sees untracked files unless gitignored) would pick up a spike file. If committed, it ships a console-spewing "test".
**Fix:** Delete the directory or move it under the git-ignored scratch location before committing. Do not `git add -A`.

## Info

### IN-01: The CSP does not set `base-uri` or `form-action`

**File:** `scripts/research/lib/summary-html.ts:503`
**Issue:** `default-src 'none'` does not cover `base-uri` or `form-action`. The page has no forms and no `<base>`, so there is no exploit. A single hole in future template text would still be able to inject `<base>`.
**Fix:** Append `; base-uri 'none'; form-action 'none'` to the policy string. The tests that check `default-src 'none'` and the script hash still pass.

### IN-02: Summary-page CSP and interaction checks run only on Windows with Edge or Chrome installed

**File:** `scripts/research/summary.test.ts:317-371`
**Issue:** The three browser tests skip silently when none of four hard-coded Windows browser paths exists. A Linux or CI run reports green without checking that the script runs under the CSP. This is acceptable for a localhost-first Windows project, but it should be visible.
**Fix:** Print a skip reason, and let `RESEARCH_GATE=1` fail when no browser is found. Allow an `EDGE_PATH` env override.

### IN-03: Provider metadata is duplicated and the unreachable row can disagree with the live rows

**File:** `pipeline/src/klopp_pipeline/coverage.py:410-467`
**Issue:** `PROVIDER_META` repeats the dataset, licence and URL values that each provider function also hard-codes. If one copy changes, a provider that goes unreachable will report a different licence or dataset than when it was reachable. `PROVIDER_META["dfl"]["data_type"]` is `event` although the provider yields `event` and `tracking`, so the unreachable matrix has no `tracking` row.
**Fix:** Define each provider's constants once and have both the row builders and `_unreachable_row` read from them.

### IN-04: `record_fixtures.py` reads zip members without a size cap and can raise `IndexError`

**File:** `pipeline/tests/record_fixtures.py:90-101`
**Issue:** `zf.read(name)` is unbounded, unlike the capped read in `wyscout_rows`. `trimmed[0]["label"]` raises `IndexError` on an empty member. It is a hand-run helper that fetches only from allow-listed hosts, so the risk is small.
**Fix:** Reuse the `MAX_ZIP_MEMBER_BYTES` cap and skip empty members.

### IN-05: Registry merge status rule is permissive for `unverified`

**File:** `scripts/research/lib/registry.ts:249-254`
**Issue:** `removed` wins, but `active` beats `unverified`. A source that one domain could not verify becomes `active` if another domain marked it so. This is consistent with the written rule, but it is the opposite of "most restrictive wins" for provenance. `free` defaults to `true` when a member omits it (`!== false`).
**Fix:** Decide deliberately and document it in the ADR. If unverified should win, rank `unverified` above `active`.

### IN-06: CLI argument handling

**File:** `scripts/research/derive-links.ts:43-47`, `pipeline/src/klopp_pipeline/cli.py:36-40`
**Issue:** `--root --check` takes `--check` as the directory. The pipeline `coverage` command accepts duplicate provider names (`dfl,dfl` writes duplicate rows). `--refresh` together with `--offline` fails with a confusing "no usable cache entry" message.
**Fix:** Reject a `--root` value that starts with `--`. De-duplicate provider names with `dict.fromkeys`. Reject `--refresh --offline` with a `BadParameter`.

### IN-07: `canonicalUrl` merges and splits sources inconsistently

**File:** `scripts/research/lib/research-files.ts:101-117`
**Issue:** The URL fragment is dropped, so two sources that differ only by anchor (for example distinct sections of a single-page IFAB PDF viewer) merge. `http://x` and `https://x` stay separate and are never merged. Both effects are silent.
**Fix:** Treat `http` and `https` as equal for canonical comparison. Keep fragments when the path ends in a known single-page-app route, or list those cases in `registry-overrides.json`.

---

_Reviewed: 2026-11-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
