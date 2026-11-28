import { useMemo } from "react";
import { createSampler, type MotionMode } from "../../scene/playback/sample.ts";
import type { Scene, SceneTeam } from "../../scene/schema.ts";
import { usePitch } from "../Pitch.tsx";
import { BallGlyph } from "./BallGlyph.tsx";
import { discDiameter } from "./glyphSize.ts";
import { PlayerGlyph } from "./PlayerGlyph.tsx";

export interface SceneLayerProps {
  scene: Scene;
  /** Playback time in seconds. */
  t: number;
  mode: MotionMode;
}

/** Attacking direction for a team in the scene's period: +1 left to right, -1 right to left. */
function attackSign(scene: Scene, team: SceneTeam | undefined): 1 | -1 {
  if (!team) return 1;
  const period = scene.source.clock
    ? String(scene.source.clock.period)
    : Object.keys(team.attack)[0];
  const direction = period === undefined ? undefined : team.attack[period];
  return direction === "rtl" ? -1 : 1;
}

/**
 * Draws a sampled scene at time t inside <Pitch>, in the 03-UI-SPEC layer order. This task draws
 * players and the ball; events and marks join them in the same group.
 */
export function SceneLayer({ scene, t, mode }: SceneLayerProps) {
  const { view } = usePitch();
  const sample = useMemo(() => createSampler(scene), [scene]);
  const sampled = sample(t, mode);
  const teamById = new Map(scene.teams.map((team) => [team.id, team]));
  const entityById = new Map(scene.entities.map((entity) => [entity.id, entity]));
  const at = new Map(sampled.entities.map((e) => [e.id, e]));

  const players = scene.entities.flatMap((entity) => {
    const p = at.get(entity.id);
    if (!p || entity.type === "ball") return [];
    return [{ entity, p }];
  });

  const ballEntity = scene.entities.find((e) => e.type === "ball");
  const ballAt = ballEntity ? at.get(ballEntity.id) : undefined;
  let ball = ballAt ? { x: ballAt.x, y: ballAt.y } : null;
  // An owned ball sits 0.6 x the disc diameter from the owner, toward the owner team's attack.
  const owner = sampled.ballOwner ? at.get(sampled.ballOwner) : undefined;
  const ownerEntity = sampled.ballOwner ? entityById.get(sampled.ballOwner) : undefined;
  if (ball && owner && ownerEntity) {
    const team = ownerEntity.team ? teamById.get(ownerEntity.team) : undefined;
    const offset = 0.6 * discDiameter(view.pxPerMetre);
    ball = { x: owner.x + attackSign(scene, team) * offset, y: owner.y };
  }

  return (
    <g data-layer="scene">
      <g data-layer="players">
        {players.map(({ entity, p }) => (
          <PlayerGlyph
            key={entity.id}
            entity={entity}
            team={entity.team ? teamById.get(entity.team) : undefined}
            x={p.x}
            y={p.y}
          />
        ))}
      </g>
      {ball ? <BallGlyph x={ball.x} y={ball.y} /> : null}
    </g>
  );
}
