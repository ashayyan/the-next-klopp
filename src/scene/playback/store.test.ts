import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Scene, sceneSchema } from "../schema.ts";
import { createSampler } from "./sample.ts";
import { createPlaybackStore, defaultMotion } from "./store.ts";

function fixture(name: string): Scene {
  const path = join(process.cwd(), "src", "scene", "fixtures", `${name}.json`);
  return sceneSchema.parse(JSON.parse(readFileSync(path, "utf8")));
}

const authored = fixture("authored"); // frames at t 0, 2 and 4 s
const reconstruction = fixture("reconstruction");

/** Call tick with 100 ms steps until `ms` of wall time has passed. */
function run(store: ReturnType<typeof createPlaybackStore>, ms: number): void {
  for (let spent = 0; spent < ms - 1e-9; spent += 100) store.getState().tick(100);
}

describe("playback store: the tracer path", () => {
  it("opens paused at t 0 and does not advance before play()", () => {
    const store = createPlaybackStore(authored, { motion: "smooth" });
    run(store, 2000);
    const s = store.getState();
    expect(s.t).toBe(0);
    expect(s.playing).toBe(false);
    expect(s.duration).toBe(4);
    expect(s.speed).toBe(1);
  });

  it("is at t 3.2 after 3200 ms of ticks and samples the expected defender position", () => {
    const store = createPlaybackStore(authored, { motion: "smooth" });
    store.getState().play();
    run(store, 3200);
    const s = store.getState();
    expect(s.t).toBeCloseTo(3.2, 9);
    const defender = createSampler(authored)(s.t, s.motion).entities.find((e) => e.id === "home-4");
    expect(defender?.x).toBeCloseTo(23.6, 9);
    expect(defender?.y).toBeCloseTo(24.0, 9);
  });

  it("stops at the end: t is the duration, playing false, ended true", () => {
    const store = createPlaybackStore(authored, { motion: "smooth" });
    store.getState().play();
    run(store, 9000);
    const s = store.getState();
    expect(s.t).toBe(4);
    expect(s.playing).toBe(false);
    expect(s.ended).toBe(true);
  });

  it("restarts from 0 when play() is pressed after the end", () => {
    const store = createPlaybackStore(authored, { motion: "smooth" });
    store.getState().play();
    run(store, 9000);
    store.getState().play();
    const s = store.getState();
    expect(s.t).toBe(0);
    expect(s.playing).toBe(true);
    expect(s.ended).toBe(false);
  });

  it("plays the real reconstruction to its last frame in about 19 s", () => {
    const store = createPlaybackStore(reconstruction, { motion: "smooth" });
    store.getState().play();
    run(store, 10000);
    expect(store.getState().t).toBeCloseTo(10, 6);
    run(store, 10000);
    const s = store.getState();
    expect(s.ended).toBe(true);
    expect(s.t).toBe(s.duration);
    expect(s.duration).toBeGreaterThan(18.5);
  });

  it("load() resets to paused at 0 for a new scene", () => {
    const store = createPlaybackStore(authored, { motion: "smooth" });
    store.getState().play();
    run(store, 1000);
    store.getState().load(reconstruction);
    const s = store.getState();
    expect([s.t, s.playing, s.ended]).toEqual([0, false, false]);
    expect(s.duration).toBe(reconstruction.frames[reconstruction.frames.length - 1]?.t);
  });
});

function fresh(motion: "smooth" | "stepped" = "smooth") {
  return createPlaybackStore(authored, { motion }); // keyframes at 0, 2 and 4 s
}

describe("playback store: transport", () => {
  it("stepNext moves to the next keyframe and pauses", () => {
    const store = fresh();
    store.getState().play();
    store.getState().stepNext();
    expect(store.getState().t).toBe(2);
    expect(store.getState().playing).toBe(false);
    store.getState().stepNext();
    store.getState().stepNext(); // already at the last keyframe: stays there
    expect(store.getState().t).toBe(4);
    store.getState().stepPrev();
    expect(store.getState().t).toBe(2);
    store.getState().seek(1.3);
    store.getState().stepPrev();
    expect(store.getState().t).toBe(0);
    store.getState().stepPrev(); // already at the first keyframe: stays there
    expect(store.getState().t).toBe(0);
  });

  it("stepNext from between keyframes goes to the next later keyframe", () => {
    const store = fresh();
    store.getState().seek(2.5);
    store.getState().stepNext();
    expect(store.getState().t).toBe(4);
  });

  it("first and last go to 0 and the duration and pause; last marks the sequence ended", () => {
    const store = fresh();
    store.getState().play();
    store.getState().last();
    expect(store.getState().t).toBe(4);
    expect(store.getState().playing).toBe(false);
    expect(store.getState().ended).toBe(true);
    store.getState().first();
    expect(store.getState().t).toBe(0);
    expect(store.getState().ended).toBe(false);
  });

  it("jumpBy moves one second and clamps to 0..duration", () => {
    const store = fresh();
    store.getState().jumpBy(1);
    expect(store.getState().t).toBe(1);
    store.getState().jumpBy(-1);
    store.getState().jumpBy(-1);
    expect(store.getState().t).toBe(0);
    store.getState().seek(3.5);
    store.getState().jumpBy(1);
    expect(store.getState().t).toBe(4);
  });

  it("seek pauses, clamps and clears the ended flag when moved back", () => {
    const store = fresh();
    store.getState().play();
    store.getState().seek(99);
    expect(store.getState().t).toBe(4);
    expect(store.getState().playing).toBe(false);
    store.getState().seek(-5);
    expect(store.getState().t).toBe(0);
    expect(store.getState().ended).toBe(false);
  });

  it("setSpeed accepts only 0.25, 0.5 and 1", () => {
    const store = fresh();
    store.getState().setSpeed(0.5);
    expect(store.getState().speed).toBe(0.5);
    store.getState().setSpeed(2);
    store.getState().setSpeed(0.3);
    expect(store.getState().speed).toBe(0.5);
    store.getState().setSpeed(0.25);
    expect(store.getState().speed).toBe(0.25);
    store.getState().setSpeed(1);
    expect(store.getState().speed).toBe(1);
  });

  it("smooth playback at 0.5 speed advances half as fast", () => {
    const store = fresh();
    store.getState().setSpeed(0.5);
    store.getState().play();
    run(store, 2000);
    expect(store.getState().t).toBeCloseTo(1, 9);
  });
});

describe("playback store: stepped motion", () => {
  it("holds each keyframe for 500 ms at speed 1, then jumps to the next keyframe", () => {
    const store = fresh("stepped");
    store.getState().play();
    store.getState().tick(499);
    expect(store.getState().t).toBe(0);
    store.getState().tick(1);
    expect(store.getState().t).toBe(2);
    store.getState().tick(499);
    expect(store.getState().t).toBe(2);
    store.getState().tick(1);
    expect(store.getState().t).toBe(4);
  });

  it("needs 1000 ms per keyframe at speed 0.5 and ends on the last keyframe", () => {
    const store = fresh("stepped");
    store.getState().setSpeed(0.5);
    store.getState().play();
    store.getState().tick(999);
    expect(store.getState().t).toBe(0);
    store.getState().tick(1);
    expect(store.getState().t).toBe(2);
    store.getState().tick(1000);
    const s = store.getState();
    expect([s.t, s.playing, s.ended]).toEqual([4, false, true]);
  });

  it("never advances before play() in either mode", () => {
    for (const motion of ["smooth", "stepped"] as const) {
      const store = fresh(motion);
      run(store, 5000);
      expect(store.getState().t).toBe(0);
    }
  });

  it("a large tick crosses more than one keyframe in stepped mode", () => {
    const store = fresh("stepped");
    store.getState().play();
    store.getState().tick(1000);
    expect(store.getState().t).toBe(4);
    expect(store.getState().ended).toBe(true);
  });

  it("switching motion mode keeps t and resets the hold", () => {
    const store = fresh("smooth");
    store.getState().seek(1);
    store.getState().setMotion("stepped");
    expect(store.getState().motion).toBe("stepped");
    expect(store.getState().t).toBe(1);
    expect(store.getState().holdMs).toBe(0);
  });
});

describe("default motion", () => {
  it("is stepped for reduced motion and smooth otherwise", () => {
    expect(defaultMotion(true)).toBe("stepped");
    expect(defaultMotion(false)).toBe("smooth");
  });
});
