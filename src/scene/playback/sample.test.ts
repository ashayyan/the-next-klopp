import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Scene, sceneSchema } from "../schema.ts";
import {
  createSampler,
  effectivePresence,
  eventState,
  keyframeTimes,
  sceneDuration,
} from "./sample.ts";

function fixture(name: string): Scene {
  const path = join(process.cwd(), "src", "scene", "fixtures", `${name}.json`);
  return sceneSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

const authored = fixture("authored");
const reconstruction = fixture("reconstruction");

function at(scene: Scene, t: number, mode: "smooth" | "stepped" = "smooth") {
  const s = createSampler(scene)(t, mode);
  return { ...s, byId: new Map(s.entities.map((e) => [e.id, e])) };
}

/** An entity's own samples, in frame order. */
function samplesOf(scene: Scene, id: string) {
  return scene.frames.flatMap((f) => {
    const p = f.positions[id];
    return p ? [{ t: f.t, ...p }] : [];
  });
}

describe("authored scene (presence always)", () => {
  it("interpolates defender 4 linearly at t 3.2 in smooth mode", () => {
    // home-4 is at (23, 27) at t 2 and (24, 22) at t 4: progress 0.6 gives (23.6, 24.0).
    const p = at(authored, 3.2).byId.get("home-4");
    expect(p?.x).toBeCloseTo(23.6, 9);
    expect(p?.y).toBeCloseTo(24.0, 9);
  });

  it("holds the latest keyframe at t 3.2 in stepped mode", () => {
    const p = at(authored, 3.2, "stepped").byId.get("home-4");
    expect(p).toEqual({ id: "home-4", x: 23, y: 27 });
  });

  it("shows an always entity before its first and after its last sample", () => {
    const scene = structuredClone(authored);
    for (const f of scene.frames) {
      if (f.t < 2) delete f.positions["away-9"];
    }
    const before = at(scene, 0).byId.get("away-9");
    expect(before).toEqual({ id: "away-9", x: 38, y: 22 });
    expect(effectivePresence(scene, { id: "away-9", type: "player" })).toBe("always");
    const after = at(scene, 99).byId.get("away-9");
    expect(after).toEqual({ id: "away-9", x: 38, y: 22 });
  });

  it("returns visible entities in entities[] order", () => {
    expect(at(authored, 1).entities.map((e) => e.id)).toEqual(authored.entities.map((e) => e.id));
  });
});

describe("reconstruction scene (presence sampled by default)", () => {
  it("defaults reconstruction entities to sampled and others to always", () => {
    const first = reconstruction.entities[0];
    if (!first) throw new Error("no entity");
    expect(first.presence).toBeUndefined();
    expect(effectivePresence(reconstruction, first)).toBe("sampled");
    expect(effectivePresence(authored, { id: "x", type: "player" })).toBe("always");
    expect(effectivePresence(reconstruction, { ...first, presence: "always" })).toBe("always");
  });

  it("hides an actor outside his first and last sample", () => {
    const actor = reconstruction.events[1]?.player;
    if (!actor) throw new Error("events[1] has no player");
    const own = samplesOf(reconstruction, actor);
    const first = own[0];
    const last = own[own.length - 1];
    if (!first || !last) throw new Error("actor has no samples");
    expect(first.t).toBeGreaterThan(0);
    expect(at(reconstruction, 0).byId.has(actor)).toBe(false);
    expect(at(reconstruction, (first.t + last.t) / 2).byId.has(actor)).toBe(true);
    expect(at(reconstruction, first.t).byId.has(actor)).toBe(true);
    expect(at(reconstruction, last.t).byId.has(actor)).toBe(true);
    expect(at(reconstruction, last.t + 0.01).byId.has(actor)).toBe(false);
  });

  it("moves an actor between his own samples across frames where he is absent", () => {
    const actor = reconstruction.events[0]?.player;
    if (!actor) throw new Error("events[0] has no player");
    const own = samplesOf(reconstruction, actor);
    // Find a frame without the actor that lies between two of his own samples.
    const gap = reconstruction.frames.find(
      (f) =>
        f.positions[actor] === undefined &&
        own.some((s) => s.t < f.t) &&
        own.some((s) => s.t > f.t),
    );
    if (!gap) throw new Error("fixture has no gap frame for the first actor");
    const a = [...own].reverse().find((s) => s.t < gap.t);
    const b = own.find((s) => s.t > gap.t);
    if (!a || !b) throw new Error("no bracketing samples");
    const k = (gap.t - a.t) / (b.t - a.t);
    const p = at(reconstruction, gap.t).byId.get(actor);
    expect(p?.x).toBeCloseTo(a.x + (b.x - a.x) * k, 9);
    expect(p?.y).toBeCloseTo(a.y + (b.y - a.y) * k, 9);
  });

  it("holds ballOwner from the latest frame and clears it after the final shot frame", () => {
    const frames = reconstruction.frames;
    const second = frames[1];
    const finalFrame = frames[frames.length - 1];
    if (!second || !finalFrame) throw new Error("not enough frames");
    expect(at(reconstruction, second.t + 0.01).ballOwner).toBe(second.ballOwner ?? null);
    expect(finalFrame.ballOwner).toBeUndefined();
    expect(at(reconstruction, finalFrame.t).ballOwner).toBeNull();
  });
});

describe("time handling", () => {
  it("clamps t to 0..duration", () => {
    const duration = sceneDuration(reconstruction);
    const lastFrame = reconstruction.frames[reconstruction.frames.length - 1];
    expect(duration).toBe(lastFrame?.t);
    expect(createSampler(reconstruction)(-5, "smooth").t).toBe(0);
    expect(createSampler(reconstruction)(duration + 10, "smooth").t).toBe(duration);
    expect(at(reconstruction, -5).entities).toEqual(at(reconstruction, 0).entities);
  });

  it("lists keyframe times sorted and unique", () => {
    const times = keyframeTimes(reconstruction);
    expect(times).toEqual([...new Set(times)].sort((x, y) => x - y));
    expect(times).toHaveLength(reconstruction.frames.length);
    expect(keyframeTimes(authored)).toEqual([0, 2, 4]);
  });
});

describe("eventState", () => {
  it("is hidden before the event, active inside its window, past afterwards", () => {
    const [pass, run] = authored.events;
    if (!pass || !run) throw new Error("authored needs two events");
    expect(eventState(authored, run, 1)).toBe("hidden");
    expect(eventState(authored, pass, 0)).toBe("active");
    expect(eventState(authored, pass, 1.5)).toBe("active");
    expect(eventState(authored, pass, 3)).toBe("past");
    expect(eventState(authored, run, 3)).toBe("active");
    expect(eventState(authored, run, sceneDuration(authored))).toBe("active");
  });

  it("uses the next event start when tEnd is missing", () => {
    const [first, second] = reconstruction.events;
    if (!first || !second) throw new Error("reconstruction needs events");
    expect(first.tEnd).toBeUndefined();
    expect(eventState(reconstruction, first, (first.t + second.t) / 2)).toBe("active");
    expect(eventState(reconstruction, first, second.t + 0.01)).toBe("past");
  });

  it("shows every event as active in a 1-frame scene", () => {
    const still = structuredClone(authored);
    still.frames = still.frames.slice(0, 1);
    for (const ev of still.events) {
      expect(eventState(still, ev, 0)).toBe("active");
    }
  });
});
