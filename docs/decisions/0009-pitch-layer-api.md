# 0009. Pitch layer API: one canonical-metre SVG root, a Canvas slot and a clock outside React

Date: 2026-11-28

## Status

Accepted

Frozen after the layer-API spike that 03-CONTEXT asked for: the API was built (plans 03-01, 03-04, 03-07, 03-09) and then measured against its three consumers in a real headless browser (plan 03-11, `npm run check:pitch`).

## Context

- Every later visual in the app (lessons, Tactics Board, quizzes, replays, data labs) draws on one pitch. A coordinate bug in the pitch would be a bug in every lesson, so the transform must live in one place.
- 03-CONTEXT required a spike against three consumers before the API is frozen: static markings, a draggable player (pointer capture, screen to pitch inverse transform, keyboard nudge) and 22-player playback at 60 fps.
- Phones need a vertical pitch; the data must stay in canonical metres whatever the orientation.
- Dense marks (season shot maps, event locations) are too many for SVG nodes and need a Canvas layer that lines up exactly with the SVG.
- The brief prefers `state = f(t)` for animation (CLAUDE.md decision 1): exact scrubbing, pause, reverse and testable positions.

## Decision

The `<Pitch>` component (`src/pitch/Pitch.tsx`) and its layer API are frozen as follows.

1. **Canonical metres as SVG user space.** Children draw in metres, x from 0 to `length` along the touchline, y from 0 to `width` downward. Markings come from the pure `pitchGeometry(length, width)` (Law 1 values). The run-off (default 3 m) exists only in the `viewBox` (`-r -r L+2r W+2r`); no data is shifted by it.
2. **Orientation is a group matrix, never a data change.** Horizontal has no transform. Vertical swaps the `viewBox` to `W+2r` by `L+2r` and puts `matrix(0 -1 1 0 0 L)` on the group, so canonical x runs bottom to top. `autoOrientation(stageWidth)` picks vertical below 480 px. Text that must read upright gets the `upright(x, y)` counter-rotation from the context.
3. **Three stacked layers in one container:** a bottom `aria-hidden` SVG (run-off and field), the optional `canvas` slot, and a transparent top SVG with the `<title>`, the markings and every child inside `<g data-canonical-root>`. Only the top SVG takes pointer events; it is `role="img"`, or `role="group"` when it holds focusable players.
4. **Pointer inverse from the canonical-root group.** Screen to pitch is `group.getScreenCTM().inverse()` on the `[data-canonical-root]` group, never the root `<svg>` CTM: the group carries the orientation matrix, so the same inverse is right in both orientations. `useDraggableEntity` and the pointer readout both use it.
5. **`<CanvasLayer>`** goes in the `canvas` slot between the two SVGs. It applies the same six-number view matrix times `devicePixelRatio` (`canvasMatrix(view, dpr)`), so `draw(ctx, view)` paints in metres. The backing store is `floor(CSS size × devicePixelRatio)` and follows DPR changes.
6. **`usePitch()`** gives children `{ view, length, width, orientation, runoff, upright }`. `view` carries `pxPerMetre`, `viewBox`, `groupTransform` and `cssMatrix`.
7. **Glyph sizes are screen pixels**, converted to metres with `pxPerMetre` and clamped (for example a player disc is `clamp(20 px, 2.0 m, 28 px)`), with `vector-effect: non-scaling-stroke` on lines, so glyphs stay legible at 320 px and do not balloon at 1440 px.
8. **Playback clock outside React.** A vanilla Zustand store holds `t`, `playing`, `speed` and `motion`; one `requestAnimationFrame` loop (`startPlaybackLoop`) runs only while playing, caps `dt` at 100 ms and calls `tick`. Positions are `createSampler(scene)(t, mode)`: linear interpolation (d3-interpolate, easeLinear) in Smooth, the latest sample in Stepped. Reduced motion defaults Motion to Stepped and sets every transition to 0 ms.
9. **Render strategy for playback: the React selector path.** `PlaybackLayer` subscribes to `t` and `motion` and re-renders `<SceneLayer>` each frame. The imperative fallback (writing `transform` from `store.subscribe`, 03-RESEARCH Pattern 6, 0.06 ms for 23 groups) was not needed, because the React path passed every threshold below. It stays the documented escape hatch if a later scene is heavier.

### Spike evidence for the three consumers

- **Static markings:** `src/pitch/geometry.test.ts` (10 tests, Law 1 values, arcs and sweep flags), `src/pitch/pitch.test.tsx` (9 tests, layer order, title, roles), `src/pitch/view.test.ts` and `src/pitch/coords.test.ts` (provider landmarks land on canonical points). In the browser, `?scene=pitch-only` has the title "Pitch, 105 by 68 metres — Pitch only" and logs no error.
- **Draggable player:** `src/pitch/drag.test.ts` (18 tests, clamp to run-off, 0.1 m rounding, nudges per orientation) and the 03-09 manual run in both orientations. In the 03-11 browser check on `?scene=board` at 1440 px a real 60 px mouse drag moved home-2 from (25, 58) to (32.4, 58), Escape before mouse up restored (32.4, 58), ArrowRight nudged x from 32.4 to 33.4, and the move was announced. At 375 px (Auto picks vertical, group transform `matrix(0 -1 1 0 0 105)`) the mouse over the screen point of canonical (11, 34) read "Pointer x 11.00 m · y 34.00 m", which proves the group-CTM inverse.
- **22-player playback:** `?scene=stress` (22 players and a ball, 300 frames) played for 5 s in headless Edge 158.0.4370.45 (`--headless=new`) on an AMD Ryzen 9 7900X (12 cores, 24 logical), Windows 11, dev build. Two runs: 302 frames, mean work 4.21 ms, p95 rAF interval 16.80 ms, 0 gaps over 50 ms, readout "Frame time 4.2 ms · 60 fps"; and 301 frames, mean work 3.74 ms, p95 16.80 ms, 0 gaps, "Frame time 3.7 ms · 60 fps".
- **Thresholds** (03-RESEARCH Pattern 7, Assumption A5) were kept unchanged: mean work (rAF callback start to React commit) at most 6 ms, p95 rAF interval at most 20 ms, no interval above 50 ms after a 5-frame warm-up, and the UI-SPEC backstop readout at most 16.7 ms. No measurement showed a threshold was wrong for headless cadence; headless Edge ran rAF at 60 Hz here.
- **Canvas:** at DPR 2 and 768 px the density canvas measured 705 × 470 CSS px with a 1410 × 940 backing store.

Reversibility: costly — every later visual consumes this API; changing the coordinate space, the orientation transform or the clock means touching every glyph, lesson visual and saved board built on it.

## Consequences

- Good: one transform. Data, glyphs, Canvas and pointer input all meet in canonical metres, and the only orientation code is one matrix.
- Good: playback is a pure function of `t`, so tests assert positions at a time, scrubbing is exact, and Stepped mode is the same sampler.
- Good: `npm run check:pitch` re-proves the API in a real browser with no new dependency, until Playwright arrives in Phase 5.
- Bad: React re-renders the scene every frame. 3.7 to 4.2 ms of a 16.7 ms budget in a dev build is fine for 23 glyphs, but a scene with hundreds of animated marks will need the imperative path or the Canvas layer.
- Bad: the stress numbers come from a fast desktop CPU. A slower laptop has less headroom; rerun `npm run check:pitch` there before relying on the margin.
- Bad: Canvas marks are not in the accessibility tree, so anything a learner must perceive on the Canvas also needs a text or legend equivalent.
- Found by the spike and fixed in 03-11: the ball was pinned to the latest frame's owner between frames, so a pass showed the ball on the passer and then a jump. The owner offset now fades out over two disc diameters around the latest or next owner, and a ball in flight keeps its sampled path.

## Alternatives

- **react-konva / Konva:** rejected. A Canvas scene graph loses crisp SVG scaling, CSS variable styling, DOM selectors for tests and per-element accessibility. Built for thousands of draggable sprites, which this is not.
- **PixiJS (WebGL):** rejected for now. WebGL stays "where needed" (CLAUDE.md decision 2); 22 players do not need it, and a fragment shader for pitch-control surfaces can sit in the existing Canvas slot later.
- **A tween timeline (GSAP or motion timelines):** rejected. A second animation system with its own clock makes exact scrubbing, reverse and "position at t = 3.2 s" tests harder than `state = f(t)`.
- **React state for `t` without measurement:** rejected as a default. Keeping `t` in a vanilla store with one rAF loop lets the render strategy change without touching the clock; the measurement decided the strategy, not assumption.
- **Playwright for the browser checks now:** deferred to Phase 5. A zero-dependency DevTools-protocol script with the installed Edge was enough for this phase and adds no packages.

Sources: `03-CONTEXT.md` "Pitch renderer and layer API", `03-RESEARCH.md` Patterns 5 to 7 and Pitfall 11, `03-UI-SPEC.md` UI Considerations, the 03-01, 03-04, 03-07, 03-09 and 03-11 SUMMARY files, `npm run check:pitch` output of 2026-11-28.
