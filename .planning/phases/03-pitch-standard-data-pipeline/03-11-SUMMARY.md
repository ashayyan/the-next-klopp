---
phase: 03-pitch-standard-data-pipeline
plan: "11"
subsystem: pitch
tags: [browser-check, cdp, headless-edge, adr, layer-api, playback, reduced-motion, a11y]

requires:
  - phase: 03-pitch-standard-data-pipeline
    provides: Pitch, CanvasLayer, view matrices (03-01); glyphs and SceneLayer (03-04); playback store, loop and __pitchFrameStats (03-07); /dev/pitch board, drag and pointer readout (03-09); scene loading and state panels (03-10)
provides:
  - scripts/lib/cdp.ts (findBrowser, launchBrowser, Cdp, waitFor, sleep)
  - scripts/check-pitch-browser.ts and npm run check:pitch (42 real-browser checks, screenshots at 320/375/768/1440)
  - docs/decisions/0009-pitch-layer-api.md (frozen layer API with spike evidence)
  - SceneLayer ball-ownership fix (owner offset fades; a ball in flight keeps its sampled path)
affects: [phase-04 direction renders and screenshot review, phase-05 Playwright, phase-08 Tactics Board, every later pitch visual]

tech-stack:
  added: []
  patterns:
    - "Browser checks drive real input (Input.dispatchMouseEvent / dispatchKeyEvent), not element.click(), so pointer capture and focus run as for a learner"
    - "Headless Edge on a temp profile; teardown kills every process whose command line holds that profile, because msedge.exe hands off to a child and exits 0"
    - "Ball owner offset is weighted by distance to the latest or next frame owner, so the drawn ball is continuous through passes"

key-files:
  created:
    - scripts/lib/cdp.ts
    - scripts/check-pitch-browser.ts
    - docs/decisions/0009-pitch-layer-api.md
  modified:
    - package.json
    - scripts/adr.test.ts
    - src/pitch/glyphs/SceneLayer.tsx
    - src/pitch/glyphs/glyphs.test.tsx

key-decisions:
  - "Playback render strategy stays the React selector path: 3.7-4.2 ms mean work, p95 16.8 ms, 0 long gaps in headless Edge 158 on a Ryzen 9 7900X; the imperative transform path is the documented escape hatch"
  - "03-RESEARCH frame thresholds kept unchanged (mean work <= 6 ms, p95 <= 20 ms, 0 gaps > 50 ms, readout <= 16.7 ms)"
  - "CHECK_PITCH_PORT lets the check run beside a dev server that already holds 5173 (adds --bypass-lock for Vite 8's command lock); the default stays 5173 with refusal when busy"
  - "Ball ownership: the sampler contract (ballOwner = latest frame's owner) is unchanged; SceneLayer applies the 0.6 x disc offset only near the latest or next owner, fading over two disc diameters"

patterns-established:
  - "Every /dev/pitch DOM contract has an ok/FAIL line in npm run check:pitch; Phase 4 screenshot review uses its test-results/pitch/*.png until Playwright lands"

requirements-completed: [PITCH-01, PITCH-03, PITCH-04]

coverage:
  - id: B1
    description: "Backstop zero-one-many: ?scene=stress plays 22 players + ball with the frame-time readout at or under 16.7 ms"
    requirement: PITCH-04
    verification:
      - kind: e2e
        ref: "npm run check:pitch stress lines: 301 frames, mean work 3.743 ms, p95 16.80 ms, 0 gaps, readout 'Frame time 3.7 ms · 60 fps'"
        status: pass
    human_judgment: false
  - id: B2
    description: "Backstop reduced-motion: Stepped by default, nothing moves before Play, transitions 0 ms"
    requirement: PITCH-04
    verification:
      - kind: e2e
        ref: "npm run check:pitch reduced-motion lines (Stepped checked, ball unchanged after 500 ms, 0 elements with a non-zero transition-duration)"
        status: pass
    human_judgment: false
  - id: B3
    description: "Backstop overflow: 320/375/768/1440 px with no horizontal scroll, no overlapping controls, every control >= 44 px, legend adjacent to the pitch"
    requirement: PITCH-03
    verification:
      - kind: e2e
        ref: "npm run check:pitch width lines (20 checks) and test-results/pitch/glyph-sheet-{320,375,768,1440}.png"
        status: pass
      - kind: other
        ref: "1440 and 375 px screenshots reviewed by eye: legend right of the pitch at 1440, under the stage at 375, nothing clipped"
        status: pass
    human_judgment: true
    rationale: "'No overlapping controls' is asserted geometrically; visual quality was judged from screenshots"
  - id: D1
    description: "Layer API frozen in ADR 0009 with evidence from static markings, drag and 22-player playback"
    requirement: PITCH-01
    verification:
      - kind: unit
        ref: "scripts/adr.test.ts (0009 sections, Reversibility line, keywords Pitch, CanvasLayer, getScreenCTM, Zustand)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Canvas DPR, vertical pointer inverse, playback to Replay, board drag/Escape/nudge in a real browser"
    requirement: PITCH-01
    verification:
      - kind: e2e
        ref: "npm run check:pitch (backing 1410 x 940 for 705 x 470 CSS px; 'Pointer x 11.00 m · y 34.00 m'; Replay after 19.0 s; home-2 25 to 32.4, Escape kept 32.4, ArrowRight 32.4 to 33.4)"
        status: pass
      - kind: unit
        ref: "src/pitch/glyphs/glyphs.test.tsx 'ball ownership offset (03-11)' (owned at frames, in flight at sampled position, continuous forward motion)"
        status: pass
    human_judgment: false

actuals:
  tokens: 13200
  tasks: 3
  commits: 3
plan_head_before: f98d3d24c171f7fa68fa546e9385caa2828f56d4
plan_head_after: 11177e187418253fe2c13c5c628555d2996c3a97

duration: 25min
completed: 2026-11-28
status: complete
---

# Phase 3 Plan 11: Real-browser Pitch Checks and the Frozen Layer API Summary

**`npm run check:pitch` drives headless Edge over the DevTools protocol through 42 checks of /dev/pitch (all three UI-SPEC backstops included), found and fixed a ball that stuck to the passer during passes, and ADR 0009 freezes the layer API with the measured numbers.**

## Performance

- **Duration:** about 25 min
- **Tasks:** 3
- **Files:** 7 (3 created, 4 modified)

## Accomplishments
- `scripts/lib/cdp.ts`: finds Edge (else Chrome) and starts it with `--headless=new` on a temp profile under the OS temp folder, with the debug port on 127.0.0.1 and the arguments passed as an array. It includes a `Cdp` client that fails pending calls when the socket closes. `close()` sends `Browser.close`, then kills every process on that profile and removes the profile folder.
- `scripts/check-pitch-browser.ts`: refuses a busy port, starts Vite dev, prints one `ok`/`FAIL` line per check and always tears everything down. Exit codes: 0 all pass, 1 a failure, 2 no browser. It drives real mouse and keyboard input through `Input.dispatch*`.
- The checks (42 lines in the final run):
  - pitch-only title and console
  - per width (320, 375, 768, 1440): overflow, 44 px and no overlap across 13 controls, Notation expanded and collapsed with its placement, note chips inside the pitch
  - DPR 2 canvas
  - the vertical matrix and the pointer readout at (11, 34)
  - reconstruction: Smooth by default, still before Play, moves after Play, reaches Replay
  - reduced motion
  - board drag, Escape, nudge and announcement
  - stress frame statistics
  - no console error across all scenes
- ADR 0009 and its `adr.test.ts` entry.

## Task Commits

1. **Task 1 (tracer): headless Edge check of /dev/pitch with a zero-dependency CDP client** - `6ee318c` (feat)
2. **Task 2: real-browser checks of every /dev/pitch contract, ball no longer glued to the passer** - `5901965` (feat)
3. **Task 3: ADR 0009 freezes the Pitch layer API** - `11177e1` (docs)

Tracer gate: Task 1's `npm run check:pitch` (on `CHECK_PITCH_PORT=5183`, see Deviations) passed twice in a row with the port free afterwards and no `klopp-cdp-` Edge process left. Only then did Task 2 start.

## Measured numbers (machine: AMD Ryzen 9 7900X, 24 logical cores, Windows 11, Edge 158.0.4370.45 headless=new, dev build)

| Run | Frames in 5 s | Mean work | p95 rAF interval | Gaps > 50 ms | Readout |
|-----|---------------|-----------|------------------|--------------|---------|
| 1 (before the ball fix) | 302 | 4.205 ms | 16.80 ms | 0 | Frame time 4.2 ms · 60 fps |
| 2 | 301 | 3.743 ms | 16.80 ms | 0 | Frame time 3.7 ms · 60 fps |

Thresholds unchanged from 03-RESEARCH. The React selector path was kept. The imperative `store.subscribe` transform path was not needed.

## Screenshots (git-ignored review artefacts, `git status --porcelain test-results` is empty)
- `E:/To become new klop/test-results/pitch/pitch-only-1440.png`
- `E:/To become new klop/test-results/pitch/glyph-sheet-320.png`
- `E:/To become new klop/test-results/pitch/glyph-sheet-375.png`
- `E:/To become new klop/test-results/pitch/glyph-sheet-768.png`
- `E:/To become new klop/test-results/pitch/glyph-sheet-1440.png`

## Phase gate (run once, all green)
`npm test` (812 passed, 6 skipped), `npm run pipeline:test` (164 passed), `npm run validate:schemas`, `npm run build && npm run guard:bundle` (bundle ok: 8 files), `npm run guard` (381 files ok), `npm run smoke` (preview ok), `npx tsc --noEmit`, `npx biome ci .`, and `CHECK_PITCH_PORT=5183 npm run check:pitch` (42 ok, 0 failed).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The ball stayed on the passer for the whole pass, then jumped**
- **Found during:** Task 2, check (4): "the ball moves after Play" failed, with the ball at (41.71, 19.34) both before Play and 1 s after it.
- **Issue:** SceneLayer put the ball at `owner + 0.6 × disc` for the latest frame's `ballOwner` throughout the interval to the next frame. In the Wyscout reconstruction the first pass (Mangala to Da Silva, 0 to 1.33 s) showed no ball in flight.
- **Fix:** the offset now uses the owner of the latest or the next frame and is weighted by the ball's distance to that player, fading to zero over two disc diameters. At a frame the ball is exactly `owner + offset`, as the UI-SPEC rule says. In flight it follows its sampled path, and it always moves forward. The sampler contract and its tests are unchanged. Three unit tests were added.
- **Files modified:** `src/pitch/glyphs/SceneLayer.tsx`, `src/pitch/glyphs/glyphs.test.tsx`
- **Commit:** `5901965`

**2. [Rule 3 - Blocking] Port 5173 was held by another dev server**
- **Found during:** Task 1. A `npm run dev` from an earlier session (PID 93776) held 5173. Several orphaned headless Edge instances on temp profiles were connected to it.
- **Blocked action:** stopping that server and those Edge instances was refused by the permission classifier. They were not stopped.
- **Fix:** `CHECK_PITCH_PORT` (integer 1024 to 65535) moves the check to another port. On a non-5173 port the script also passes `--bypass-lock`, because Vite 8 refuses a second dev server for the same project. The default is unchanged: 5173, with refusal when the port is busy (observed exit 1 with the message). Every verification run in this plan used `CHECK_PITCH_PORT=5183`.
- **Commit:** `6ee318c`

**3. [Rule 1 - Bug] The launcher-exit check hid the debug port**
- **Found during:** Task 1. `msedge.exe` hands off to a child process and exits 0 at once. The first version treated that exit as fatal inside the wait loop, so the run timed out.
- **Fix:** wait for `DevToolsActivePort` only. Teardown also kills by temp-profile name, because the launcher pid does not reach the real browser.
- **Commit:** `6ee318c`

### Additions beyond the plan's list (all part of the same backstops)
- A geometric "no overlapping controls" check, a note-chip-inside-pitch check (the open 03-04 observation), a Smooth-by-default control check, and a board announcement check. The reduced-motion check covers every element's `transition-duration`, not just the Play button.

## Open observations from earlier plans
- **Note chips clipping in vertical orientation (03-04):** the shipped glyph sheet keeps its chip inside the pitch at all four widths (now checked). The underlying risk remains: chip width comes from a 7.2 px-per-character estimate, and an anchor near a touchline in vertical can still clip. **Deferred to Phase 4** (measure text or clamp chips to the field).
- **Sequence badges covering passer numbers (03-04):** this is the contract (badges sit on event starts). The fixture avoids it. **Deferred to Phase 4** design review; no check was added because no rule says what should happen.
- **Missing-local panel not seen in a browser (03-10):** still not browser-verified. `data/statsbomb` exists on this machine, and the local glob is resolved at build time, so the panel cannot be shown without moving that folder. Unit tests cover it. **Deferred.**

## Issues Encountered
- Leftover temp profiles from runs that failed before the fix (`klopp-cdp-is8i7i`, `klopp-cdp-Ml97Mg`, `klopp-probe-*` under `%TEMP%`) could not be deleted (the removal command was refused). They are empty browser profiles outside the repo.
- The Vite dev server forwards a client `console.warn` ("No `HydrateFallback` element provided…") to the terminal. It is a warning, not an error, and existed before this plan.

## Threat Flags
None beyond the plan's T-03-28: the port is on 127.0.0.1, the profile is a throwaway, and teardown runs in `finally`.

## Next Phase Readiness
- Phase 3 plans are complete. Phase 4 can use `npm run check:pitch` screenshots for direction review.
- Stopping the stray dev server on 5173 (PID 93776, `npm run dev` started 05:19) lets `npm run check:pitch` run on its default port.

## Self-Check: PASSED
