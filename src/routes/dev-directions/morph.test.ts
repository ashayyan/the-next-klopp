import { describe, expect, it } from "vitest";
import type { Scene, SceneAnnotation } from "../../scene/schema.ts";
import { parseScene } from "../../scene/validate.ts";
import { cubicBezier, lineOf, morphPositions } from "./morph.ts";
import raw from "./scenes/city-2022-23-shapes.json";

const ROLE_CODES = new Set(["GK", "RB", "CB", "LB", "DM", "CM", "RW", "LW", "ST"]);

function city(): Scene {
  const parsed = parseScene(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.scene;
}

/** Players per line counted from the back, goalkeeper left out (how a formation is written). */
function formationOf(scene: Scene, frameIndex: number, lines: string[][]): string {
  const frame = scene.frames[frameIndex];
  if (!frame) throw new Error(`no frame ${frameIndex}`);
  for (const line of lines) {
    for (const id of line)
      expect(frame.positions[id], `${id} in frame ${frameIndex}`).toBeDefined();
  }
  return lines.map((line) => line.length).join("-");
}

/** Shape annotations that are drawn at time t (a from/to range includes its ends). */
function shapesAt(scene: Scene, t: number): Extract<SceneAnnotation, { type: "shape" }>[] {
  return scene.annotations.filter(
    (a): a is Extract<SceneAnnotation, { type: "shape" }> =>
      a.type === "shape" && t >= (a.from ?? 0) && t <= (a.to ?? Number.POSITIVE_INFINITY),
  );
}

describe("City 2022/23 shapes scene", () => {
  it("passes parseScene as an authored scene with one Manchester City team on side a", () => {
    const scene = city();
    expect(scene.kind).toBe("authored");
    expect(scene.teams).toHaveLength(1);
    expect(scene.teams[0]?.name).toBe("Manchester City");
    expect(scene.teams[0]?.side).toBe("a");
  });

  it("has 11 players with 2-letter role codes and no shirt numbers", () => {
    const players = city().entities.filter((e) => e.type !== "ball");
    expect(players).toHaveLength(11);
    for (const p of players) {
      expect(p.number).toBeUndefined();
      expect(ROLE_CODES.has(p.label ?? ""), `${p.id} label ${p.label}`).toBe(true);
    }
    expect(players.filter((p) => p.type === "goalkeeper").map((p) => p.label)).toEqual(["GK"]);
  });

  it("has exactly two frames: a 4-4-2 out of possession and a 3-2-4-1 in possession", () => {
    const scene = city();
    expect(scene.frames).toHaveLength(2);
    const outShapes = shapesAt(scene, 0).map((a) => a.members.length);
    const inShapes = shapesAt(scene, 1).map((a) => a.members.length);
    // Shape lines join each unit; the lone striker of the 3-2-4-1 has no line to draw.
    expect(outShapes.join("-")).toBe("4-4-2");
    expect(inShapes.join("-")).toBe("3-2-4");
    expect(
      formationOf(scene, 0, [
        ["city-lb", "city-cb", "city-stones", "city-rb"],
        ["city-lw", "city-cm-left", "city-dm", "city-rw"],
        ["city-st", "city-cm-right"],
      ]),
    ).toBe("4-4-2");
    expect(
      formationOf(scene, 1, [
        ["city-lb", "city-cb", "city-rb"],
        ["city-dm", "city-stones"],
        ["city-lw", "city-cm-left", "city-cm-right", "city-rw"],
        ["city-st"],
      ]),
    ).toBe("3-2-4-1");
  });

  it("moves Stones from the centre-back line to beside the DM", () => {
    const scene = city();
    const stones = scene.entities.find((e) => e.id === "city-stones");
    expect(stones?.label).toBe("CB");
    const [out, inPossession] = scene.frames;
    const cb = out?.positions["city-cb"];
    const before = out?.positions["city-stones"];
    const after = inPossession?.positions["city-stones"];
    const dm = inPossession?.positions["city-dm"];
    if (!cb || !before || !after || !dm) throw new Error("missing positions");
    expect(before.x).toBe(cb.x);
    expect(after.x).toBe(dm.x);
    expect(Math.abs(after.y - dm.y)).toBeLessThanOrEqual(15);
  });

  it("highlights Stones, runs him into midfield only with the ball and notes it", () => {
    const scene = city();
    const highlight = scene.annotations.find((a) => a.type === "highlight");
    expect(highlight?.type === "highlight" && highlight.target).toBe("city-stones");
    const runs = scene.events.filter((e) => e.type === "run");
    expect(runs).toHaveLength(1);
    const run = runs[0];
    if (!run) throw new Error("no run");
    expect(run.player).toBe("city-stones");
    expect(run.start).toEqual(scene.frames[0]?.positions["city-stones"]);
    expect(run.end).toEqual(scene.frames[1]?.positions["city-stones"]);
    // The event starts at the in-possession frame, so the out-of-possession state never draws it.
    expect(run.t).toBe(scene.frames[1]?.t);
    const note = scene.annotations.find((a) => a.type === "note");
    expect(note?.type === "note" && note.text).toBe("Stones steps into midfield");
    expect(note?.type === "note" && note.from).toBe(scene.frames[1]?.t);
  });

  it("cites The Analyst source and says the positions are illustrative", () => {
    const { source } = city();
    expect(source.sourceIds).toEqual(["src-theanalyst-stones-hybrid-role"]);
    expect(source.attribution).toMatch(/illustrative/);
    expect(source.shippable).toBe(true);
  });
});

describe("cubicBezier", () => {
  it("maps 0 to 0, 1 to 1 and 0.5 to 0.5 for a symmetric curve", () => {
    const ease = cubicBezier(0.65, 0, 0.35, 1);
    expect(ease(0)).toBeCloseTo(0, 3);
    expect(ease(1)).toBeCloseTo(1, 3);
    expect(ease(0.5)).toBeCloseTo(0.5, 3);
  });

  it("is monotone on 10 samples", () => {
    const ease = cubicBezier(0.65, 0, 0.35, 1);
    const samples = Array.from({ length: 10 }, (_, i) => ease(i / 9));
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i] as number).toBeGreaterThanOrEqual(samples[i - 1] as number);
    }
    expect(samples[3] as number).toBeLessThan(1 / 3);
  });
});

describe("lineOf", () => {
  it("puts GK in 0, RB CB LB in 1, DM CM in 2 and RW LW ST in 3", () => {
    const byLabel = (label: string) => lineOf({ id: "x", type: "player", label });
    expect(lineOf({ id: "gk", type: "goalkeeper", label: "GK" })).toBe(0);
    expect(["RB", "CB", "LB"].map(byLabel)).toEqual([1, 1, 1]);
    expect(["DM", "CM"].map(byLabel)).toEqual([2, 2]);
    expect(["RW", "LW", "ST"].map(byLabel)).toEqual([3, 3, 3]);
  });
});

describe("morphPositions", () => {
  const scene = city();
  const from = scene.frames[0]?.positions ?? {};
  const to = scene.frames[1]?.positions ?? {};
  const lines = Object.fromEntries(scene.entities.map((e) => [e.id, lineOf(e)]));
  const ease = cubicBezier(0.65, 0, 0.35, 1);
  const run = (elapsedMs: number, staggerMs: number) =>
    morphPositions({ from, to, lines, elapsedMs, durationMs: 640, staggerMs, ease });

  it("returns frame 0 at elapsed 0 and frame 1 once every line has finished", () => {
    const start = run(0, 60);
    const end = run(640 + 3 * 60, 60);
    for (const id of Object.keys(to)) {
      expect(start.get(id)).toEqual(from[id]);
      expect(end.get(id)?.x).toBeCloseTo(to[id]?.x ?? Number.NaN, 6);
      expect(end.get(id)?.y).toBeCloseTo(to[id]?.y ?? Number.NaN, 6);
    }
  });

  it("starts the back line first: at 60 ms with a 60 ms stagger the forwards have not moved", () => {
    const at = run(60, 60);
    expect(at.get("city-stones")).not.toEqual(from["city-stones"]);
    expect(at.get("city-gk")).not.toEqual(from["city-gk"]);
    expect(at.get("city-st")).toEqual(from["city-st"]);
    expect(at.get("city-rw")).toEqual(from["city-rw"]);
  });

  it("moves every line together with a 0 ms stagger (programme)", () => {
    const at = run(60, 0);
    for (const id of Object.keys(to)) {
      if (from[id]?.x === to[id]?.x && from[id]?.y === to[id]?.y) continue;
      expect(at.get(id), id).toBeDefined();
      expect(at.get(id), id).not.toEqual(from[id]);
    }
  });
});
