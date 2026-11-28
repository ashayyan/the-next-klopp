import { useMemo } from "react";
import { createSampler, eventState, type MotionMode } from "../../scene/playback/sample.ts";
import type { Scene, SceneAnnotation, SceneEvent, SceneTeam } from "../../scene/schema.ts";
import { usePitch } from "../Pitch.tsx";
import type { View } from "../view.ts";
import { BallGlyph } from "./BallGlyph.tsx";
import { EventGlyph, type Side } from "./EventGlyphs.tsx";
import { discDiameter } from "./glyphSize.ts";
import {
  HighlightGlyph,
  NoteGlyph,
  PointGlyph,
  SequenceBadgeGlyph,
  ShapeGlyph,
  ZoneGlyph,
} from "./MarkGlyphs.tsx";
import { PlayerGlyph } from "./PlayerGlyph.tsx";

export interface SceneLayerProps {
  scene: Scene;
  /** Playback time in seconds. */
  t: number;
  mode: MotionMode;
}

/** Attacking direction for a team in the scene period: +1 left to right, -1 right to left. */
function attackSign(scene: Scene, team: SceneTeam | undefined): 1 | -1 {
  if (!team) return 1;
  const period = scene.source.clock
    ? String(scene.source.clock.period)
    : Object.keys(team.attack)[0];
  const direction = period === undefined ? undefined : team.attack[period];
  return direction === "rtl" ? -1 : 1;
}

/** An annotation with a from/to range shows only inside that range. */
function inRange(annotation: SceneAnnotation, t: number): boolean {
  if (annotation.type === "sequence") return true;
  const from = annotation.from ?? 0;
  const to = annotation.to ?? Number.POSITIVE_INFINITY;
  return t >= from && t <= to;
}

const LINE_EVENTS: ReadonlySet<SceneEvent["type"]> = new Set(["pass", "carry", "run", "shot"]);

/**
 * Draws a sampled scene at time t inside <Pitch>, in the 03-UI-SPEC layer order: zones, shape
 * lines, events (pass, carry, run, shot), pressure, players, ball, highlights, notes and sequence
 * badges, points.
 */
export function SceneLayer({ scene, t, mode }: SceneLayerProps) {
  const { view } = usePitch();
  const sample = useMemo(() => createSampler(scene), [scene]);
  const sampled = sample(t, mode);
  const sideOfTeam = (id: string | undefined): Side =>
    scene.teams.find((team) => team.id === id)?.side ?? "a";
  const entityById = new Map(scene.entities.map((entity) => [entity.id, entity]));
  const at = new Map(sampled.entities.map((e) => [e.id, e]));

  const visibleEvents = scene.events.flatMap((event) => {
    const state = eventState(scene, event, sampled.t);
    return state === "hidden" ? [] : [{ event, state }];
  });
  const eventLayer = (types: ReadonlySet<SceneEvent["type"]>) =>
    visibleEvents
      .filter(({ event }) => types.has(event.type))
      .map(({ event, state }) => (
        <EventGlyph
          key={event.id}
          event={event}
          side={sideOfTeam(event.team)}
          state={state}
          opacity={state === "active" ? 1 : 0.4}
        />
      ));

  const players = scene.entities.flatMap((entity) => {
    const p = at.get(entity.id);
    if (!p || entity.type === "ball") return [];
    return [{ entity, p }];
  });

  const ballEntity = scene.entities.find((e) => e.type === "ball");
  const ballAt = ballEntity ? at.get(ballEntity.id) : undefined;
  let ball = ballAt ? { x: ballAt.x, y: ballAt.y } : null;
  // An owned ball sits 0.6 x the disc diameter from the owner, toward the owner team attack.
  const owner = sampled.ballOwner ? at.get(sampled.ballOwner) : undefined;
  const ownerEntity = sampled.ballOwner ? entityById.get(sampled.ballOwner) : undefined;
  if (ball && owner && ownerEntity) {
    const team = scene.teams.find((candidate) => candidate.id === ownerEntity.team);
    ball = {
      x: owner.x + attackSign(scene, team) * 0.6 * discDiameter(view.pxPerMetre),
      y: owner.y,
    };
  }

  const annotations = scene.annotations.filter((a) => inRange(a, sampled.t));
  const eventById = new Map(visibleEvents.map(({ event }) => [event.id, event]));

  return (
    <g data-layer="scene">
      <g data-layer="zones">
        {annotations.map((a) =>
          a.type === "zone" ? <ZoneGlyph key={a.id} points={a.points} label={a.label} /> : null,
        )}
      </g>
      <g data-layer="shapes">
        {annotations.map((a) => {
          if (a.type !== "shape") return null;
          const points = a.members.flatMap((id) => {
            const p = at.get(id);
            return p ? [{ x: p.x, y: p.y }] : [];
          });
          return points.length >= 2 ? (
            <ShapeGlyph key={a.id} points={points} side={sideOfTeam(a.team)} closed={a.closed} />
          ) : null;
        })}
      </g>
      <g data-layer="events">{eventLayer(LINE_EVENTS)}</g>
      <g data-layer="pressure">{eventLayer(new Set(["pressure"]))}</g>
      <g data-layer="players">
        {players.map(({ entity, p }) => (
          <PlayerGlyph
            key={entity.id}
            entity={entity}
            team={scene.teams.find((team) => team.id === entity.team)}
            x={p.x}
            y={p.y}
          />
        ))}
      </g>
      {ball ? <BallGlyph x={ball.x} y={ball.y} /> : null}
      <g data-layer="highlights">
        {annotations.map((a) => {
          if (a.type !== "highlight") return null;
          const target = a.target ? at.get(a.target) : undefined;
          const where = target ?? a.at;
          return where ? <HighlightGlyph key={a.id} x={where.x} y={where.y} /> : null;
        })}
      </g>
      <g data-layer="notes">
        {annotations.map((a) => {
          if (a.type === "note") {
            return <NoteGlyph key={a.id} text={a.text} at={a.at} anchor={a.anchor} />;
          }
          if (a.type === "sequence") {
            return (
              <g key={a.id}>
                {a.events.map((id, index) => {
                  const event = eventById.get(id);
                  return event ? (
                    <SequenceBadgeGlyph
                      key={id}
                      x={event.start.x}
                      y={event.start.y}
                      n={index + 1}
                    />
                  ) : null;
                })}
              </g>
            );
          }
          return null;
        })}
      </g>
      <g data-layer="points">
        {annotations.map((a) =>
          a.type === "point" ? <PointGlyph key={a.id} at={a.at} label={a.label} /> : null,
        )}
      </g>
    </g>
  );
}

/**
 * Canvas density layer: one 3 px dot per event at the event start point, in canonical metres
 * (the context is already transformed by <CanvasLayer>). The colour is read from the
 * `--density-mark` CSS variable so no colour literal enters TypeScript.
 */
export function drawDensity(scene: Scene): (ctx: CanvasRenderingContext2D, view: View) => void {
  return (ctx, view) => {
    if (typeof getComputedStyle === "function") {
      const colour = getComputedStyle(ctx.canvas).getPropertyValue("--density-mark").trim();
      if (colour) ctx.fillStyle = colour;
    }
    const r = 1.5 / view.pxPerMetre;
    for (const event of scene.events) {
      ctx.beginPath();
      ctx.arc(event.start.x, event.start.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}
