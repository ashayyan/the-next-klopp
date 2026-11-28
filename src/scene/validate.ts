import type { Scene } from "./schema.ts";

export const RUNOFF_METRES = 3;

export interface SceneIssue {
  path: string;
  message: string;
}

// RED stub: replaced in the GREEN step.
export function checkSceneIntegrity(_scene: Scene): SceneIssue[] {
  return [];
}

export function parseScene(
  input: unknown,
): { ok: true; scene: Scene } | { ok: false; issues: SceneIssue[] } {
  return { ok: true, scene: input as Scene };
}
