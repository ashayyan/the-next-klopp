---
phase: 02-research-wave-1
plan: 04
subsystem: research-tooling
tags: [typescript, dagre, svg, csp, okabe-ito, headless-browser, devtools-protocol, vitest]

requires:
  - phase: 02-research-wave-1
    provides: "02-03 loadResearchBundle, studyOrder, checkGraph, mini fixture bundle; 02-02 coverage schema"
provides:
  - "npm run research:summary: self-contained approval page research/summary/index.html built from the research JSON, with --check"
  - "scripts/research/lib/layout.ts: deterministic dagre layout (layoutConcepts)"
  - "scripts/research/lib/summary-html.ts and summary-page.js: five-screen page, PART_COLOURS, parseDecision, contrastRatio, inkFor"
  - "scripts/research/check-summary-browser.ts: headless Edge or Chrome check over the DevTools protocol (script ran under its CSP, no browser errors, optional --interact and whole-page --screenshot)"
affects: [02-20, 02-21]

plan_head_before: 5a2ac114a5c5e2767f4299906ecbb4746542e1ca
plan_head_after: c225c7e192fd8a236568b74508defb1d597a86e8

actuals:
  tokens: 17100
  tasks: 2
  commits: 3

tech-stack:
  added: ["@dagrejs/dagre 3.1.4 (devDependency, exact pin) with @dagrejs/graphlib 4.0.8"]
  patterns:
    - "The page script is a real file (summary-page.js), inlined verbatim and its SHA-256 put in the page CSP, so Biome lints it and the hash cannot drift"
    - "Static markup is escaped at build time; the script builds dynamic nodes with createElement and textContent; embedded JSON escapes every less-than character"
    - "Browser checks drive the page through the DevTools protocol (WebSocket from Node) instead of --dump-dom"

key-files:
  created:
    - scripts/research/lib/layout.ts
    - scripts/research/lib/summary-html.ts
    - scripts/research/lib/summary-page.js
    - scripts/research/build-summary.ts
    - scripts/research/check-summary-browser.ts
    - scripts/research/summary.test.ts
    - scripts/research/fixtures/mini/decision.md
  modified:
    - package.json
    - package-lock.json
    - biome.json

key-decisions:
  - "Okabe-Ito hex values were read from the palette table at jfly.uni-koeln.de/color/ (an image with RGB triplets, viewed 2026-11-27): orange 230,159,0; sky blue 86,180,233; bluish green 0,158,115; yellow 240,228,66; blue 0,114,178; vermilion 213,94,0; reddish purple 204,121,167. They equal the values the research assumed; the R grDevices page names the palette but prints no hex"
  - "The hashed CSP works under file:// in Edge (assumption A5 holds): no switch to script-src 'unsafe-inline' was needed, and a wrong hash is proven to block the script"
  - "The browser check uses the DevTools protocol, because Edge and Chrome on this machine detach from the launcher and --dump-dom writes nothing to a pipe or file"
  - "Focus view = selected concept, prerequisites to depth 2, unlocks to depth 1, the rest dimmed; the viewBox fits the focus set. Show all is opt-in with zoom buttons and arrow-key pan"

patterns-established:
  - "Build the page: npm run research:summary [-- --root research --adr docs/decisions/0008-watch-gym-l1-clip-supply.md]; verify it is current: -- --check"
  - "Prove it in a browser and take a whole-page review screenshot: node scripts/research/check-summary-browser.ts research/summary/index.html --interact --screenshot <png>"
  - "Try the fixture: node scripts/research/build-summary.ts --root scripts/research/fixtures/mini --adr scripts/research/fixtures/mini/decision.md --out <html>"

requirements-completed: []

coverage:
  - id: D1
    description: "One self-contained HTML page with no external dependency: CSP default-src 'none' plus a script hash, no script src, link, @import, remote url() or network API"
    requirement: RSCH-06
    verification:
      - kind: unit
        ref: "scripts/research/summary.test.ts#self-containment and hostile strings"
        status: pass
      - kind: other
        ref: "node scripts/research/check-summary-browser.ts <fixture page> exits 0 in headless Edge; with a wrong hash it exits 1 and prints the CSP violation"
        status: pass
    human_judgment: false
  - id: D2
    description: "At most five screens (decision, concept graph with Part chips and focus view, study-order strip, data coverage with the clip decision, gaps) that work in a real browser"
    requirement: RSCH-06
    verification:
      - kind: unit
        ref: "scripts/research/summary.test.ts#five screens and page quality"
        status: pass
      - kind: other
        ref: "summary.test.ts headless browser case with --interact: click, Enter, Space, Part filter, Show all, zoom, arrow-key pan"
        status: pass
    human_judgment: true
    rationale: "Whether the page is short and clear enough for the learner is judged at the approval checkpoint (02-21), on the real data"
  - id: D3
    description: "Layout is computed at build time and deterministic: every prerequisite points right, nodes in a rank never overlap; colour is never the only cue"
    requirement: RSCH-06
    verification:
      - kind: unit
        ref: "scripts/research/summary.test.ts#layout invariants (fixture and a 60-concept generated graph) and page quality (seven distinct hues, 4.5:1 Part letters)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Pinned @dagrejs/dagre is the official package (package legitimacy, batched end-of-phase check)"
    requirement: RSCH-06
    verification: []
    human_judgment: true
    rationale: "Confirmation is batched into the end-of-phase human check; the autonomous run records the audit line and does not halt"

duration: 45min
completed: 2026-11-27
status: complete
---

# Phase 2 Plan 04: Summary page generator Summary

**A build-time generator for the approval page: dagre lays the concept map out left to right, one inline script (hash-pinned in a `default-src 'none'` CSP) drives Part chips, a focus view and a detail panel, and a DevTools-protocol check proves in headless Edge that the page runs and its controls work, all on the mini fixture before real research exists.**

## Performance

- **Duration:** about 45 min
- **Completed:** 2026-11-27
- **Tasks:** 2 (Task 1 tracer, Task 2 TDD)
- **Files created or modified:** 10 (plus the lockfile)

## Accomplishments

- `layoutConcepts` wraps dagre (`rankdir LR`, network-simplex, fixed separations), adds nodes and edges in sorted order, rounds to one decimal and shifts everything into view. A 60-concept generated graph and the fixture satisfy both invariants: every prerequisite edge ends to the right of its source, and nodes that share an x never overlap. Input order does not change the output.
- `buildSummaryHtml` emits five `section.screen` blocks in the agreed order. The decision screen has three bullets and a status line ("pending", or the first `Status:` line of `research/APPROVAL.md`). The graph screen has one chip per Part present plus All, a focus view by default, an opt-in Show all view with zoom buttons and arrow-key pan, and a detail panel (prerequisites, unlocks and source links as buttons and `http(s)` links only). The study-order strip lists tracks by first appearance in `studyOrder` with thread starters and Milestone 1 tracks marked. The coverage screen groups the matrix by provider and data type ("unreachable" for null) and shows the ADR's Decision bullets. The gaps screen lists deferred domains with the track each must precede and the PL coverage gaps.
- The fixture page is 29 KB (limit 1.5 MB). No paragraph, list item or table cell passes 40 words (agent prose is cut at 28 to 35 words with an ellipsis).
- Safety (T-02-10, T-02-11): embedded JSON turns every `<` into a JSON escape, static markup goes through `esc()`, the page script uses `createElement` and `textContent`, and a test with `</script><img onerror=...>` in a title, a summary and a source title shows no markup reaches the page. The CSP hash is the SHA-256 of the exact inline script; the test recomputes it.
- Edge ran the fixture page under its own CSP, no console errors, and the interaction pass drove every control (click, Enter, Space, Part filter, Show all, zoom, pan, reset, back to focus). A tampered hash makes the check fail and print Edge's CSP violation text.

## Task Commits

1. **Task 1: tracer, layout, one graph screen, CSP-hashed script, proven in headless Edge** - `af79b21` (feat)
2. **Task 2: five screens, focus view, filters, palette, npm script, Biome ignore** - `ebbd5dd` (test, RED: 7 failing), `c225c7e` (feat, GREEN: 277 passed across the repo)

**Plan metadata:** the docs commit that follows this file (docs: complete plan)

## Files Created/Modified

- `scripts/research/lib/layout.ts` - dagre wrapper
- `scripts/research/lib/summary-html.ts` - page builder, palette, `parseDecision`, contrast helpers
- `scripts/research/lib/summary-page.js` - the inline page script
- `scripts/research/build-summary.ts` - CLI (`--root --adr --out --check`)
- `scripts/research/check-summary-browser.ts` - headless browser check (`--interact`, `--screenshot`)
- `scripts/research/summary.test.ts` - 23 tests (3 skipped without a browser or real page)
- `scripts/research/fixtures/mini/decision.md`, `package.json`, `package-lock.json`, `biome.json` (`!!research/summary`)

## Decisions Made

See `key-decisions` above.

## Package legitimacy note (batched end-of-phase human check)

`npm install --save-dev --save-exact @dagrejs/dagre@3.1.4` succeeded with no failure and no substitution; it added two packages, `@dagrejs/dagre 3.1.4` and `@dagrejs/graphlib 4.0.8` (repository `github.com/dagrejs/dagre`, build-time only, nothing ships to the page). `npm audit signatures`: "83 packages have verified registry signatures" and "45 packages have verified attestations"; `npm audit`: found 0 vulnerabilities. Human check at end of phase: read the two entries in `package-lock.json` and this line.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `--dump-dom` cannot be captured on this machine**
- **Found during:** Task 1
- **Issue:** Edge and Chrome (headless) exit after about 0.1 s with empty stdout and stderr, whether piped or redirected to a file; the real browser keeps running detached (a `--screenshot` file appears seconds later). The plan's dump-dom check could never see `data-ready="1"`.
- **Fix:** `check-summary-browser.ts` starts the browser with `--remote-debugging-port=0`, reads `DevToolsActivePort`, drives the page over the DevTools protocol with Node's built-in `WebSocket`, evaluates `document.documentElement.dataset.ready`, collects exceptions and error-level log entries (CSP violations show up there), takes the screenshot and closes the browser with `Browser.close`. Exit codes keep the plan's meaning (0 ok, 1 failed, 2 no browser).
- **Files modified:** scripts/research/check-summary-browser.ts
- **Commit:** af79b21

**2. [Rule 2 - Missing critical] Interaction checks in a real browser**
- **Found during:** Task 2
- **Issue:** Chips, focus view, Show all, zoom and keyboard pan cannot be proven by string assertions on the HTML.
- **Fix:** `--interact` runs one script inside the page that drives the real controls and reports each failed expectation; summary.test.ts runs it when Edge or Chrome is installed (skipped otherwise). The `--screenshot` option captures the whole page, not only the first 900 px, because the reviewer needs all five screens.
- **Files modified:** scripts/research/check-summary-browser.ts, scripts/research/summary.test.ts
- **Commit:** c225c7e

**3. [Rule 3 - Blocking] Page script moved to its own file**
- **Found during:** Task 2
- **Issue:** Keeping the script as a string inside a TypeScript template made regex and escape handling error-prone (the editing tool also rewrote `\u` escape sequences in file content, which silently broke the `<` escaping once).
- **Fix:** `summary-page.js` is read and inlined verbatim; its hash is computed from what is read, so the CSP cannot drift. Escapes that matter are built from `String.fromCharCode`, so no source file contains a `\u` sequence. Biome now lints the script.
- **Files modified:** scripts/research/lib/summary-html.ts, scripts/research/lib/summary-page.js
- **Commit:** c225c7e

### Plan-shape notes (not defects)

- The Okabe-Ito palette was verified in Task 1 (the page needed colours from the start) instead of Task 2; the registry entry `src-okabe-ito-cud` still comes from 02-14.
- The jfly page has the RGB triplets only as an image (`image/pallete.jpg`), so I downloaded it as data and read the values from the picture. The R documentation page lists the palette name but no hex values.
- `ancestors` and `descendants` from 02-03 are not imported by the TypeScript builder: the focus-view maths runs in the page script from the embedded concept list, so the page needs no code from Node.
- `package-lock.json` changed only for the two dagre packages.
- Edge was left running in headless mode by two failed early attempts; the check now closes the browser itself. One empty profile folder from those attempts remains under the OS temp directory.
- Commit trailer follows the harness attribution (Claude Sonnet 5.5), as in 02-03.

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing-critical). **Impact:** none on scope; the browser verification is stronger than planned.

## Issues Encountered

- The editing tool converted `<` written in source into a literal `<`, which turned the JSON escaping into a no-op. The hostile-string test caught it immediately. Resolved as described in deviation 3.
- Biome rejected object keys named `ArrowLeft` and friends in the page script as "component factories"; the keyboard handler is now a plain if-chain.

## Verification

- `npx vitest run` 277 passed, 3 skipped (12 files); `npm run research:check` 111 passed, 3 skipped
- `npx tsc --noEmit` clean; `npx biome ci scripts research package.json biome.json` clean; `npm run guard` ok
- `node scripts/research/build-summary.ts --root scripts/research/fixtures/mini --adr scripts/research/fixtures/mini/decision.md --out <temp>` then `node scripts/research/check-summary-browser.ts <temp> --interact` exit 0 in headless Edge
- Acceptance greps: `"@dagrejs/dagre": "3.1.4"`, `default-src 'none'`, `textContent`, `"research:summary"`, `"!!research/summary"` and `jfly.uni-koeln.de` all present

## User Setup Required

None.

## Known Stubs

None. The fixture content is synthetic by design (example.org URLs, `src-fixture-*` ids). When `docs/decisions/0008-watch-gym-l1-clip-supply.md` does not exist yet the coverage screen says "No decision written yet" instead of inventing bullets; 02-20 builds the page after that ADR exists.

## Next Phase Readiness

- 02-20 only feeds real JSON: `npm run research:summary`, then `node scripts/research/check-summary-browser.ts research/summary/index.html --interact --screenshot <png>` for the reviewer. The gated real-data test in summary.test.ts starts running as soon as `research/summary/index.html` exists.
- RSCH-06 is declared by 02-20 as well, so it stays open until that plan finishes (shared-ID rule).

## Self-Check: PASSED

- Files: every created file and `package.json`, `package-lock.json`, `biome.json` exist on disk.
- Commits: `af79b21`, `ebbd5dd` and `c225c7e` are ancestors of HEAD.
