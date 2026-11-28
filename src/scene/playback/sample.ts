import type { Scene, SceneEntity, SceneEvent } from "../schema.ts";

export type MotionMode = "smooth" | "stepped";

export interface SampledScene {
  t: number;
  entities: Array<{ id: string; x: number; y: number }>;
  ballOwner: string | null;
}

// RED stub: replaced in the GREEN step.
export function sceneDuration(_scene: Scene): number {
  return 0;
}

export function keyframeTimes(_scene: Scene): number[] {
  return [];
}

export function effectivePresence(_scene: Scene, _entity: SceneEntity): "always" | "sampled" {
  return "always";
}

export function createSampler(_scene: Scene): (t: number, mode: MotionMode) => SampledScene {
  return (t) => ({ t, entities: [], ballOwner: null });
}

export function eventState(
  _scene: Scene,
  _event: SceneEvent,
  _t: number,
): "hidden" | "active" | "past" {
  return "hidden";
}
