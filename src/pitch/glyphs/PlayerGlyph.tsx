import type { SceneEntity, SceneTeam } from "../../scene/schema.ts";
import { usePitch } from "../Pitch.tsx";
import { useDraggableEntity } from "../useDraggableEntity.ts";
import type { Pt } from "../view.ts";
import { discDiameter, GLYPH_TEXT_PX, unitsPerPx } from "./glyphSize.ts";
import { SwatchFrame } from "./Swatch.tsx";

export type PlayerGlyphId = "player-a" | "player-b" | "goalkeeper-a" | "goalkeeper-b";

export interface PlayerShapeProps {
  id: PlayerGlyphId;
  x: number;
  y: number;
  /** Disc diameter (or square side) in user units. */
  d: number;
  /** User units per screen pixel: 1 in a legend swatch, 1 / pxPerMetre on the pitch. */
  u: number;
  text?: string;
  /** Counter-rotation so the text reads upright in the vertical orientation. */
  textTransform?: string;
  title?: string;
}

/**
 * One player glyph. Team A is a filled disc, team B a white disc with a ring, goalkeepers a rounded
 * square with the same team rules, so a greyscale render still separates the teams (WCAG 1.4.1).
 */
export function PlayerShape({ id, x, y, d, u, text, textTransform, title }: PlayerShapeProps) {
  const side = id.endsWith("-a") ? "a" : "b";
  const keeper = id.startsWith("goalkeeper");
  const fill = side === "a" ? "var(--team-a)" : "var(--team-b-fill)";
  const stroke = side === "a" ? "var(--pitch-surface)" : "var(--team-b)";
  const strokeWidth = side === "a" ? 2 : 3;
  const ink = side === "a" ? "var(--team-a-ink)" : "var(--team-b-ink)";
  return (
    <g data-glyph={id}>
      {title ? <title>{title}</title> : null}
      {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: an SVG group without tabindex is not focusable; the <title> above names the glyph */}
      <g aria-hidden="true">
        {keeper ? (
          <rect
            x={x - d / 2}
            y={y - d / 2}
            width={d}
            height={d}
            rx={4 * u}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <circle
            cx={x}
            cy={y}
            r={d / 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {text ? (
          <text
            x={x}
            y={y}
            transform={textTransform}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={GLYPH_TEXT_PX * u}
            fontWeight={600}
            fill={ink}
            style={{ fontFamily: "var(--font-sans)", userSelect: "none" }}
          >
            {text}
          </text>
        ) : null}
      </g>
    </g>
  );
}

/** The registry glyph id for an entity of type player or goalkeeper on a team side. */
export function playerGlyphId(entity: SceneEntity, side: "a" | "b"): PlayerGlyphId {
  return `${entity.type === "goalkeeper" ? "goalkeeper" : "player"}-${side}`;
}

/** Glyph text: the shirt number, else the label, else nothing. */
export function playerText(entity: SceneEntity): string | undefined {
  if (entity.number !== undefined) return String(entity.number);
  return entity.label;
}

export function playerTitle(entity: SceneEntity, team: SceneTeam | undefined): string {
  const who = entity.name ?? entity.label ?? entity.role ?? entity.id;
  const parts = [team?.name ?? "Player"];
  if (entity.number !== undefined) parts.push(`number ${entity.number}`);
  parts.push(who);
  return parts.join(", ");
}

export interface PlayerGlyphProps {
  entity: SceneEntity;
  team: SceneTeam | undefined;
  x: number;
  y: number;
  /** The accessible name comes from a draggable handle elsewhere, so the glyph carries no title. */
  decorative?: boolean;
  /** Ghost of a dragged player: drawn dimmed at its start position. */
  ghost?: boolean;
}

/** A player or goalkeeper drawn at canonical (x, y) inside <Pitch>. */
export function PlayerGlyph({ entity, team, x, y, decorative, ghost }: PlayerGlyphProps) {
  const { view, upright } = usePitch();
  const side = team?.side ?? "a";
  const shape = (
    <PlayerShape
      id={playerGlyphId(entity, side)}
      x={x}
      y={y}
      d={discDiameter(view.pxPerMetre)}
      u={unitsPerPx(view.pxPerMetre)}
      text={playerText(entity)}
      textTransform={upright(x, y)}
      title={decorative ? undefined : playerTitle(entity, team)}
    />
  );
  return ghost ? (
    <g data-ghost={entity.id} opacity={0.3}>
      {shape}
    </g>
  ) : (
    shape
  );
}

export interface DraggableHandleProps {
  entity: SceneEntity;
  team: SceneTeam | undefined;
  x: number;
  y: number;
  onMove: (id: string, p: Pt) => void;
  onEnd?: (id: string, p: Pt) => void;
  onDragChange?: (id: string, start: Pt | null) => void;
}

/**
 * The interactive part of a draggable player: an invisible 22 px hit circle (a 44 px target even
 * when the disc is 20 px) inside a focusable group. The visible disc is drawn separately by
 * PlayerGlyph so the dragged disc can be painted on top without moving this element in the DOM
 * (moving it would drop the pointer capture).
 */
export function DraggableHandle({
  entity,
  team,
  x,
  y,
  onMove,
  onEnd,
  onDragChange,
}: DraggableHandleProps) {
  const { view, length, width, runoff } = usePitch();
  const u = unitsPerPx(view.pxPerMetre);
  const binding = useDraggableEntity({
    position: { x, y },
    view,
    pitch: { length, width },
    runoff,
    onMove: (p) => onMove(entity.id, p),
    onEnd: (p) => onEnd?.(entity.id, p),
    onDragChange: (start) => onDragChange?.(entity.id, start),
  });
  const d = discDiameter(view.pxPerMetre);
  const ringInner = d / 2 + 2 * u;
  const ringOuter = d / 2 + 4 * u;
  const number = entity.number !== undefined ? `number ${entity.number}` : null;
  const who = entity.name ?? entity.label ?? entity.role ?? null;
  const name = [
    team?.name ?? "Player",
    number,
    who,
    `x ${x.toFixed(1)} metres`,
    `y ${y.toFixed(1)} metres`,
  ]
    .filter((part): part is string => part !== null)
    .join(", ");
  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG has no native button; the group is the focus target
    <g
      data-draggable=""
      data-entity={entity.id}
      data-team={team?.side ?? "a"}
      tabIndex={0}
      role="button"
      aria-roledescription="draggable player"
      aria-label={name}
      onKeyDown={binding.onKeyDown}
    >
      <circle
        data-focus-ring="inner"
        cx={x}
        cy={y}
        r={ringInner}
        fill="none"
        stroke="var(--label-bg)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      <circle
        data-focus-ring="outer"
        cx={x}
        cy={y}
        r={ringOuter}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      <circle
        data-hit=""
        cx={x}
        cy={y}
        r={22 * u}
        fill="none"
        pointerEvents="all"
        style={{ cursor: binding.dragging ? "grabbing" : "grab", touchAction: "none" }}
        {...binding.hit}
      />
    </g>
  );
}

function Swatch({ id, text }: { id: PlayerGlyphId; text: string }) {
  return (
    <SwatchFrame>
      <PlayerShape id={id} x={16} y={10} d={16} u={1} text={text} />
    </SwatchFrame>
  );
}

export function PlayerASwatch() {
  return <Swatch id="player-a" text="7" />;
}
export function PlayerBSwatch() {
  return <Swatch id="player-b" text="7" />;
}
export function GoalkeeperASwatch() {
  return <Swatch id="goalkeeper-a" text="1" />;
}
export function GoalkeeperBSwatch() {
  return <Swatch id="goalkeeper-b" text="1" />;
}
