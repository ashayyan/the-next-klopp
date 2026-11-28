// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import authored from "../../scene/fixtures/authored.json";
import board from "../../scene/fixtures/board.json";
import glyphSheet from "../../scene/fixtures/glyph-sheet.json";
import quizAnswer from "../../scene/fixtures/quiz-answer.json";
import reconstruction from "../../scene/fixtures/reconstruction.json";
import { keyframeTimes, sceneDuration } from "../../scene/playback/sample.ts";
import type { Scene, SceneEvent } from "../../scene/schema.ts";
import { parseScene } from "../../scene/validate.ts";
import { describeScene, glyphIdsForScene } from "../legend/glyphIds.ts";
import { Pitch } from "../Pitch.tsx";
import { makeView } from "../view.ts";
import { GLYPH_IDS, GLYPHS } from "./registry.ts";
import { drawDensity, SceneLayer } from "./SceneLayer.tsx";

function load(raw: unknown): Scene {
  const parsed = parseScene(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.scene;
}

const sheet = load(glyphSheet);
const authoredScene = load(authored);
const fixtures: Record<string, Scene> = {
  authored: authoredScene,
  board: load(board),
  "quiz-answer": load(quizAnswer),
  reconstruction: load(reconstruction),
  "glyph-sheet": sheet,
};

function render(scene: Scene, t = 0): string {
  return renderToStaticMarkup(
    <Pitch title={scene.label} length={scene.pitch.length} width={scene.pitch.width}>
      <SceneLayer scene={scene} t={t} mode="smooth" />
    </Pitch>,
  );
}

function renderedIds(markup: string): string[] {
  const found = new Set([...markup.matchAll(/data-glyph="([^"]+)"/g)].map((m) => m[1] ?? ""));
  return GLYPH_IDS.filter((id) => found.has(id));
}

/** Every opening tag whose markup contains `needle`. Attribute values here never contain `>`. */
function tags(markup: string, needle: string): string[] {
  return [...markup.matchAll(/<[a-zA-Z]+(?:\s[^<>]*)?>/g)]
    .map((m) => m[0])
    .filter((tag) => tag.includes(needle));
}

function attr(tag: string, name: string): string | undefined {
  return new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
}

function withEvents(scene: Scene, events: SceneEvent[]): Scene {
  return { ...structuredClone(scene), events };
}

const view960 = makeView({
  length: 105,
  width: 68,
  runoff: 3,
  orientation: "horizontal",
  cssWidth: 960,
});

describe("registry coverage", () => {
  it("draws every registry id in its legend swatch", () => {
    for (const entry of GLYPHS) {
      const Sample = entry.sample;
      expect(renderToStaticMarkup(<Sample />), entry.id).toContain(`data-glyph="${entry.id}"`);
    }
  });
});

describe("glyph sheet", () => {
  it("lists all 17 ids with density on, and renders the 16 non-density ids", () => {
    expect(glyphIdsForScene(sheet, { density: true })).toEqual([...GLYPH_IDS]);
    expect(renderedIds(render(sheet))).toEqual(GLYPH_IDS.filter((id) => id !== "density"));
  });
});

describe("legend union over every keyframe", () => {
  for (const [name, scene] of Object.entries(fixtures)) {
    it(`${name}: rendered ids over the whole duration equal glyphIdsForScene`, () => {
      const times = [...keyframeTimes(scene), sceneDuration(scene)];
      const union = new Set<string>();
      for (const t of times) for (const id of renderedIds(render(scene, t))) union.add(id);
      expect(GLYPH_IDS.filter((id) => union.has(id))).toEqual(
        glyphIdsForScene(scene, { density: false }),
      );
    });
  }
});

describe("team notation without colour", () => {
  const pass = (team: string, player: string, receiver: string): SceneEvent => ({
    id: "ev-test-pass",
    type: "pass",
    t: 0,
    team,
    player,
    receiver,
    start: { x: 20, y: 20 },
    end: { x: 40, y: 30 },
  });
  const pressure = (team: string, player: string, target: string): SceneEvent => ({
    id: "ev-test-pressure",
    type: "pressure",
    t: 0,
    team,
    player,
    target,
    start: { x: 30, y: 30 },
    end: { x: 34, y: 30 },
  });

  it("fills the team A pass arrowhead and hollows the team B one with a 2 px stroke", () => {
    const a = tags(
      render(withEvents(authoredScene, [pass("home", "home-2", "home-5")])),
      'data-part="arrowhead"',
    );
    const b = tags(
      render(withEvents(authoredScene, [pass("away", "away-9", "away-10")])),
      'data-part="arrowhead"',
    );
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(attr(a[0] ?? "", "fill")).toBe("var(--team-a)");
    expect(attr(b[0] ?? "", "fill")).toBe("none");
    expect(attr(b[0] ?? "", "stroke")).toBe("var(--team-b)");
    expect(attr(b[0] ?? "", "stroke-width")).toBe("2");
  });

  it("fills the team A pressure wedge at opacity 0.35 and leaves team B unfilled", () => {
    const a = tags(
      render(withEvents(authoredScene, [pressure("home", "home-2", "away-9")])),
      'data-part="wedge"',
    );
    const b = tags(
      render(withEvents(authoredScene, [pressure("away", "away-9", "home-2")])),
      'data-part="wedge"',
    );
    expect(attr(a[0] ?? "", "fill")).toBe("var(--team-a)");
    expect(attr(a[0] ?? "", "fill-opacity")).toBe("0.35");
    expect(attr(b[0] ?? "", "fill")).toBe("none");
  });
});

describe("event timing and opacity", () => {
  const opacityOf = (markup: string, id: string) => {
    const tag = tags(markup, `data-event="${id}"`)[0];
    return tag === undefined ? null : attr(tag, "opacity");
  };

  it("draws an event only once t reaches event.t", () => {
    expect(opacityOf(render(authoredScene, 1), "ev-run")).toBeNull();
    expect(opacityOf(render(authoredScene, 2), "ev-run")).not.toBeNull();
  });

  it("draws the active event at opacity 1 and past events at 0.4", () => {
    const markup = render(authoredScene, 3);
    expect(opacityOf(markup, "ev-run")).toBe("1");
    expect(opacityOf(markup, "ev-switch")).toBe("0.4");
  });

  it("draws every event at opacity 1 in a 1-frame scene", () => {
    for (const event of sheet.events) {
      expect(opacityOf(render(sheet), event.id), event.id).toBe("1");
    }
  });
});

describe("notes and shots", () => {
  const shot = (goal: boolean, endApprox?: boolean): SceneEvent => ({
    id: "ev-test-shot",
    type: "shot",
    t: 0,
    team: "home",
    player: "home-2",
    start: { x: 80, y: 30 },
    end: { x: 105, y: 34 },
    goal,
    ...(endApprox ? { endApprox } : {}),
  });

  it("truncates a 52-character note to 40 characters ending in an ellipsis, in full in the desc", () => {
    const note = sheet.annotations.find((a) => a.type === "note");
    const full = note?.type === "note" ? note.text : "";
    expect(full).toHaveLength(52);
    const shown = /data-part="note-text"[^>]*>([^<]*)</.exec(render(sheet))?.[1] ?? "";
    expect(shown).toHaveLength(40);
    expect(shown.endsWith("…")).toBe(true);
    expect(full.startsWith(shown.slice(0, 39))).toBe(true);
    expect(describeScene(sheet)).toContain(full);
  });

  it("ends a goal in a filled 8 px circle and a miss in a hollow one", () => {
    const scored =
      tags(render(withEvents(authoredScene, [shot(true)])), 'data-part="shot-end"')[0] ?? "";
    const missed =
      tags(render(withEvents(authoredScene, [shot(false)])), 'data-part="shot-end"')[0] ?? "";
    expect(attr(scored, "fill")).toBe("var(--team-a)");
    expect(attr(missed, "fill")).toBe("none");
    expect(Number(attr(scored, "r"))).toBeCloseTo(4 / view960.pxPerMetre, 6);
    expect(Number(attr(missed, "r"))).toBeCloseTo(4 / view960.pxPerMetre, 6);
  });

  it("mentions an approximate shot end in the scene description", () => {
    expect(describeScene(withEvents(authoredScene, [shot(false, true)]))).toContain(
      "approximate end",
    );
    expect(describeScene(authoredScene)).not.toContain("approximate end");
  });
});

describe("Canvas density layer", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calls arc once per event at the event start point, with a 3 px dot", () => {
    const arcs: number[][] = [];
    const ctx = {
      canvas: {},
      beginPath() {},
      arc: (...args: number[]) => arcs.push(args),
      fill() {},
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D;
    vi.stubGlobal("getComputedStyle", () => ({ getPropertyValue: () => "dot-colour" }));

    drawDensity(sheet)(ctx, view960);

    expect(arcs).toHaveLength(sheet.events.length);
    expect(arcs.map(([x, y]) => [x, y])).toEqual(sheet.events.map((e) => [e.start.x, e.start.y]));
    for (const a of arcs) expect(a[2]).toBeCloseTo(1.5 / view960.pxPerMetre, 9);
    expect(ctx.fillStyle).toBe("dot-colour");
  });
});

describe("ball ownership offset (03-11)", () => {
  // A passes to B along y = 30: the ball is owned at both frames and in flight between them.
  const pass = load({
    ...structuredClone(board),
    id: "ball-owner-pass",
    kind: "authored",
    entities: [
      { id: "home-2", type: "player", team: "home", number: 2 },
      { id: "home-3", type: "player", team: "home", number: 3 },
      { id: "ball", type: "ball" },
    ],
    frames: [
      {
        t: 0,
        ballOwner: "home-2",
        positions: {
          "home-2": { x: 20, y: 30 },
          "home-3": { x: 60, y: 30 },
          ball: { x: 20, y: 30 },
        },
      },
      {
        t: 2,
        ballOwner: "home-3",
        positions: {
          "home-2": { x: 20, y: 30 },
          "home-3": { x: 60, y: 30 },
          ball: { x: 60, y: 30 },
        },
      },
    ],
  });
  // render() draws at the 960 px default width; home attacks left to right (+x).
  const offset =
    0.6 *
    (20 /
      makeView({ length: 105, width: 68, runoff: 3, orientation: "horizontal", cssWidth: 960 })
        .pxPerMetre);
  const ballX = (t: number) => Number(attr(tags(render(pass, t), "--ball-fill")[0] ?? "", "cx"));

  it("puts an owned ball at the owner plus the offset at a frame", () => {
    expect(ballX(0)).toBeCloseTo(20 + offset, 6);
    expect(ballX(2)).toBeCloseTo(60 + offset, 6);
  });

  it("draws a ball in flight at its sampled position, not on the passer", () => {
    expect(ballX(1)).toBeCloseTo(40, 6);
  });

  it("moves the ball continuously as it leaves the passer", () => {
    // The sampled ball moves 0.2 m per 0.01 s; the drawn ball always moves forward and never jumps
    // (the fading offset adds at most offset / reach, about 30 %, near a player).
    const xs = Array.from({ length: 201 }, (_, i) => ballX(i * 0.01));
    for (let i = 1; i < xs.length; i++) {
      const step = (xs[i] ?? 0) - (xs[i - 1] ?? 0);
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThan(0.3);
    }
  });
});
