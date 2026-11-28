// Pure playback sampling: scene state as a function of time, f(t). No React, no timers.
//
// Presence semantics (frozen, decision A7; also stated in schemas/scene.schema.json $comment):
//   effectivePresence(scene, entity) = entity.presence ?? (kind === "reconstruction" ? "sampled" : "always")
// - "sampled": the entity is hidden before its first and after its last own sample, and is
//   interpolated between its own consecutive samples (frames where it is absent are skipped), so
//   an event-derived reconstruction never shows a player frozen where he last touched the ball.
// - "always": the entity holds its first sample before it and its last sample after it.
// Smooth mode interpolates linearly between own samples (d3 interpolateNumber with easeLinear);
// stepped mode returns the latest own sample at or before t (the first one before it, for
// "always").
import { easeLinear } from "d3-ease";
import { interpolateNumber } from "d3-interpolate";
import type { Scene, SceneEntity, SceneEvent } from "../schema.ts";

export type MotionMode = "smooth" | "stepped";
export type Presence = "always" | "sampled";

export interface SampledEntity {
  id: string;
  x: number;
  y: number;
}

export interface SampledScene {
  /** The time actually sampled, clamped to 0..duration. */
  t: number;
  /** Visible entities only, in `entities[]` order. */
  entities: SampledEntity[];
  ballOwner: string | null;
}

interface OwnSample {
  t: number;
  x: number;
  y: number;
}

/** Scene duration in seconds: the time of the last frame. */
export function sceneDuration(scene: Scene): number {
  return scene.frames[scene.frames.length - 1]?.t ?? 0;
}

/** Frame times, sorted and unique. */
export function keyframeTimes(scene: Scene): number[] {
  return [...new Set(scene.frames.map((f) => f.t))].sort((a, b) => a - b);
}

export function effectivePresence(scene: Scene, entity: SceneEntity): Presence {
  return entity.presence ?? (scene.kind === "reconstruction" ? "sampled" : "always");
}

/** Index of the last item with t <= target, or -1 when every item is later. Binary search. */
function lastAtOrBefore(items: readonly { t: number }[], target: number): number {
  let lo = 0;
  let hi = items.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const item = items[mid];
    if (item !== undefined && item.t <= target) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

function sampleEntity(
  own: readonly OwnSample[],
  presence: Presence,
  t: number,
  mode: MotionMode,
): { x: number; y: number } | null {
  const first = own[0];
  const last = own[own.length - 1];
  if (first === undefined || last === undefined) return null;
  if (t < first.t) return presence === "always" ? { x: first.x, y: first.y } : null;
  if (t > last.t) return presence === "always" ? { x: last.x, y: last.y } : null;
  const i = lastAtOrBefore(own, t);
  const a = own[i];
  if (a === undefined) return null;
  const b = own[i + 1];
  if (mode === "stepped" || b === undefined || a.t === t) return { x: a.x, y: a.y };
  const k = easeLinear((t - a.t) / (b.t - a.t));
  return { x: interpolateNumber(a.x, b.x)(k), y: interpolateNumber(a.y, b.y)(k) };
}

/** Precomputes each entity's own samples; the returned function is cheap per call. */
export function createSampler(scene: Scene): (t: number, mode: MotionMode) => SampledScene {
  const duration = sceneDuration(scene);
  const tracks = scene.entities.map((entity) => ({
    id: entity.id,
    presence: effectivePresence(scene, entity),
    own: scene.frames.flatMap((f): OwnSample[] => {
      const p = f.positions[entity.id];
      return p ? [{ t: f.t, x: p.x, y: p.y }] : [];
    }),
  }));

  return (tIn, mode) => {
    const t = Math.min(duration, Math.max(0, tIn));
    const entities: SampledEntity[] = [];
    for (const track of tracks) {
      const p = sampleEntity(track.own, track.presence, t, mode);
      if (p) entities.push({ id: track.id, x: p.x, y: p.y });
    }
    const frame = scene.frames[lastAtOrBefore(scene.frames, t)];
    return { t, entities, ballOwner: frame?.ballOwner ?? null };
  };
}

/**
 * Whether an event is drawn, and how: hidden while t < event.t; active from event.t until
 * tEnd, else the next later event's start, else the scene end; past afterwards. In a 1-frame
 * (still) scene every event is active.
 */
export function eventState(
  scene: Scene,
  event: SceneEvent,
  t: number,
): "hidden" | "active" | "past" {
  if (scene.frames.length <= 1) return "active";
  if (t < event.t) return "hidden";
  const duration = sceneDuration(scene);
  let next = Number.POSITIVE_INFINITY;
  for (const other of scene.events) {
    if (other.t > event.t && other.t < next) next = other.t;
  }
  const end = event.tEnd ?? (Number.isFinite(next) ? next : duration);
  if (t === event.t || t < end || (end >= duration && t <= end)) return "active";
  return "past";
}
