import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { type Scene, sceneSchema } from "../schema.ts";
import { createSampler } from "./sample.ts";
import { createPlaybackStore } from "./store.ts";

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
