import { describe, expect, it } from "vitest";
import type { Scene, SceneAnnotation } from "../../scene/schema.ts";
import { parseScene } from "../../scene/validate.ts";
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
