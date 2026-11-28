// @vitest-environment node
// Phase 4 pitch legibility fixes (04-UI-SPEC "Phase 3 open observations"): sequence badges clear
// the player discs and stay inside the SVG, note chips never cross the SVG edge, in both
// orientations, on the published Wyscout scene and on the glyph sheet.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import glyphSheet from "../../scene/fixtures/glyph-sheet.json";
import { createSampler, eventState } from "../../scene/playback/sample.ts";
import type { Scene } from "../../scene/schema.ts";
import { parseScene } from "../../scene/validate.ts";
import { Pitch } from "../Pitch.tsx";
import { canonicalToScreen, makeView, type Orientation } from "../view.ts";
import { discDiameter } from "./glyphSize.ts";
import { type Box, boxesIntersect, chipSizePx, placeBadge, placeChip } from "./placement.ts";
import { SceneLayer } from "./SceneLayer.tsx";

const root = join(import.meta.dirname, "..", "..", "..");

function load(raw: unknown): Scene {
  const parsed = parseScene(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.scene;
}

function wyscoutScene(): Scene {
  const catalog = JSON.parse(readFileSync(join(root, "public", "data", "catalog.json"), "utf8"));
  const path = catalog.datasets
    .flatMap((d: { scenes?: { path: string }[] }) => d.scenes ?? [])
    .find((s: { path: string }) => s.path.includes("wyscout"))?.path as string;
  return load(JSON.parse(readFileSync(join(root, "public", "data", path), "utf8")));
}

function viewFor(orientation: Orientation, cssWidth: number) {
  return makeView({ length: 105, width: 68, runoff: 3, orientation, cssWidth });
}

function render(scene: Scene, t: number, orientation: Orientation, cssWidth: number): string {
  return renderToStaticMarkup(
    createElement(
      Pitch,
      { title: scene.label, orientation, initialCssWidth: cssWidth },
      createElement(SceneLayer, { scene, t, mode: "smooth" }),
    ),
  );
}

function badgeCentres(markup: string): { x: number; y: number }[] {
  return [
    ...markup.matchAll(/<g data-glyph="sequence-badge"><circle cx="([^"]+)" cy="([^"]+)"/g),
  ].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
}

const centred = (c: { x: number; y: number }, size: number): Box => ({
  x: c.x - size / 2,
  y: c.y - size / 2,
  w: size,
  h: size,
});

describe("sequence badges clear the player discs (Wyscout scene)", () => {
  const scene = wyscoutScene();
  const cases: [string, Orientation, number][] = [
    ["375 (vertical, 343 px stage)", "vertical", 343],
    ["1440 (horizontal, 840 px stage)", "horizontal", 840],
  ];

  for (const [name, orientation, cssWidth] of cases) {
    it(`no badge box meets a disc box or another badge, and every badge is inside the SVG at ${name}`, () => {
      const view = viewFor(orientation, cssWidth);
      const sample = createSampler(scene);
      const times = [0, ...scene.events.map((e) => e.t)];
      let badgesChecked = 0;
      for (const t of times) {
        const markup = render(scene, t, orientation, cssWidth);
        const badges = badgeCentres(markup);
        expect(badges.length).toBe(
          scene.events.filter((e) => eventState(scene, e, t) !== "hidden").length,
        );
        const discPx = discDiameter(view.pxPerMetre) * view.pxPerMetre;
        const discs = sample(t, "smooth").entities.map((e) =>
          centred(canonicalToScreen(view, e), discPx),
        );
        const badgeBoxes = badges.map((c) => centred(canonicalToScreen(view, c), 16));
        for (const [i, c] of badges.entries()) {
          const box = centred(canonicalToScreen(view, c), 16);
          badgesChecked += 1;
          for (const d of discs) expect(boxesIntersect(box, d), `t=${t}`).toBe(false);
          for (const [j, other] of badgeBoxes.entries()) {
            if (j === i) continue;
            expect(boxesIntersect(box, other), `t=${t}: badge ${i + 1} meets badge ${j + 1}`).toBe(
              false,
            );
          }
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.y).toBeGreaterThanOrEqual(0);
          expect(box.x + box.w).toBeLessThanOrEqual(view.cssWidth);
          expect(box.y + box.h).toBeLessThanOrEqual(view.cssHeight);
        }
      }
      expect(badgesChecked).toBeGreaterThan(10);
    });
  }

  it("places the badge disc radius + 8 px from the start when the left of travel is free", () => {
    const view = viewFor("horizontal", 840);
    const start = { x: 50, y: 34 };
    const c = placeBadge({ start, end: { x: 60, y: 34 }, discs: [], view });
    const a = canonicalToScreen(view, start);
    const b = canonicalToScreen(view, c);
    const radius = (discDiameter(view.pxPerMetre) * view.pxPerMetre) / 2;
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(radius + 8, 6);
    expect(b.y).toBeLessThan(a.y); // left of an eastward run is up the screen
    expect(b.x).toBeCloseTo(a.x, 6);
  });

  it("moves to the next side when the left of travel is taken by another disc", () => {
    const view = viewFor("horizontal", 840);
    const start = { x: 50, y: 34 };
    const free = placeBadge({ start, end: { x: 60, y: 34 }, discs: [], view });
    const blocked = placeBadge({ start, end: { x: 60, y: 34 }, discs: [free], view });
    const a = canonicalToScreen(view, start);
    expect(canonicalToScreen(view, blocked).y).toBeGreaterThan(a.y); // right of travel
  });

  it("moves to the next side when the left of travel is taken by an earlier badge", () => {
    const view = viewFor("horizontal", 840);
    const start = { x: 50, y: 34 };
    const free = placeBadge({ start, end: { x: 60, y: 34 }, discs: [], view });
    const next = placeBadge({ start, end: { x: 60, y: 34 }, discs: [], badges: [free], view });
    const a = canonicalToScreen(view, start);
    expect(canonicalToScreen(view, next).y).toBeGreaterThan(a.y); // right of travel
  });

  it("keeps a badge off a disc even when every disc-free side is taken by a badge", () => {
    const view = viewFor("horizontal", 840);
    const start = { x: 50, y: 34 };
    const end = { x: 60, y: 34 };
    // Fill every side at every distance with earlier badges: the placer may then sit on a badge,
    // but never on the disc that blocks the left of travel.
    const discBlock = placeBadge({ start, end, discs: [], view });
    const ring: { x: number; y: number }[] = [];
    for (let k = 0; k < 12; k += 1) {
      const p = placeBadge({ start, end, discs: [discBlock], badges: ring, view });
      ring.push(p);
    }
    const c = placeBadge({ start, end, discs: [discBlock], badges: ring, view });
    const discPx = discDiameter(view.pxPerMetre) * view.pxPerMetre;
    const box = centred(canonicalToScreen(view, c), 16);
    expect(boxesIntersect(box, centred(canonicalToScreen(view, discBlock), discPx))).toBe(false);
  });

  it("treats a zero-length event as travelling up the screen (badge on its left)", () => {
    const view = viewFor("vertical", 343);
    const start = { x: 50, y: 34 };
    const c = placeBadge({ start, end: start, discs: [], view });
    const a = canonicalToScreen(view, start);
    const b = canonicalToScreen(view, c);
    expect(b.x).toBeLessThan(a.x);
    expect(b.y).toBeCloseTo(a.y, 6);
  });
});

describe("placeChip", () => {
  const horizontal = viewFor("horizontal", 840);
  const vertical = viewFor("vertical", 343);
  const { width, height } = chipSizePx("Stones steps into midfield");
  const inside = (c: { x: number; y: number }, v: typeof horizontal) => {
    expect(c.x - width / 2).toBeGreaterThanOrEqual(-1e-9);
    expect(c.x + width / 2).toBeLessThanOrEqual(v.cssWidth + 1e-9);
    expect(c.y - height / 2).toBeGreaterThanOrEqual(-1e-9);
    expect(c.y + height / 2).toBeLessThanOrEqual(v.cssHeight + 1e-9);
  };

  it("puts a chip anchored 2 px from the right edge fully inside, left of its anchor", () => {
    const anchor = { x: horizontal.cssWidth - 2, y: 100 };
    const c = placeChip({ anchor, width, height, view: horizontal });
    inside(c, horizontal);
    expect(c.x).toBeLessThan(anchor.x);
  });

  it("keeps a chip inside the vertical view as well", () => {
    for (const anchor of [
      { x: vertical.cssWidth - 2, y: 40 },
      { x: 2, y: vertical.cssHeight - 3 },
      { x: 171, y: 1 },
    ]) {
      inside(placeChip({ anchor, width, height, view: vertical }), vertical);
    }
  });

  it("does not move a chip that fits", () => {
    const anchor = { x: 400, y: 200 };
    expect(placeChip({ anchor, width, height, view: horizontal })).toEqual(anchor);
  });

  it("mirrors an offset chip to the other side of its anchor", () => {
    const anchor = { x: horizontal.cssWidth - 10, y: 200 };
    const offset = { x: 12 + width / 2, y: 0 };
    const c = placeChip({ anchor, width, height, view: horizontal, offset });
    inside(c, horizontal);
    expect(c.x).toBeLessThan(anchor.x);
  });
});

describe("rendered note chips lie inside the SVG", () => {
  const sheet = load(glyphSheet);
  const edge = {
    ...structuredClone(sheet),
    annotations: [
      { id: "n-right", type: "note", at: { x: 104, y: 34 }, text: "Right edge note" },
      { id: "n-left", type: "note", at: { x: 1, y: 60 }, text: "Left edge note here" },
      { id: "n-top", type: "note", at: { x: 52, y: 1 }, text: "Top edge note" },
      { id: "n-point", type: "point", at: { x: 103, y: 66 }, label: "Edge spot" },
    ],
  } as Scene;

  const cases: [string, Orientation, number][] = [
    ["vertical 343", "vertical", 343],
    ["horizontal 840", "horizontal", 840],
  ];
  for (const [name, orientation, cssWidth] of cases) {
    for (const [label, scene] of [
      ["glyph sheet", sheet],
      ["edge notes", edge],
    ] as const) {
      it(`${label}: every chip box is inside the SVG at ${name}`, () => {
        const view = viewFor(orientation, cssWidth);
        const markup = render(scene, 0, orientation, cssWidth);
        const chips = [
          ...markup.matchAll(
            /<g transform="translate\(([-\d.e]+) ([-\d.e]+)\)(?: rotate\(90\))?"><rect x="[-\d.e]+" y="[-\d.e]+" width="([\d.e]+)" height="([\d.e]+)"/g,
          ),
        ];
        expect(chips.length).toBeGreaterThan(0);
        for (const m of chips) {
          const c = canonicalToScreen(view, { x: Number(m[1]), y: Number(m[2]) });
          const w = Number(m[3]) * view.pxPerMetre;
          const h = Number(m[4]) * view.pxPerMetre;
          expect(c.x - w / 2).toBeGreaterThanOrEqual(-0.01);
          expect(c.x + w / 2).toBeLessThanOrEqual(view.cssWidth + 0.01);
          expect(c.y - h / 2).toBeGreaterThanOrEqual(-0.01);
          expect(c.y + h / 2).toBeLessThanOrEqual(view.cssHeight + 0.01);
        }
      });
    }
  }
});

describe("player disc size", () => {
  it("is 22 px when 2.0 m is smaller and 28 px when larger", () => {
    const px = (pxPerMetre: number) => discDiameter(pxPerMetre) * pxPerMetre;
    expect(px(4)).toBeCloseTo(22, 9); // 2.0 m = 8 px, raised to the 22 px minimum
    expect(px(10)).toBeCloseTo(22, 9); // 2.0 m = 20 px, still under 22
    expect(px(12)).toBeCloseTo(24, 9); // 2.0 m = 24 px, inside the band
    expect(px(20)).toBeCloseTo(28, 9); // 2.0 m = 40 px, capped
  });
});
