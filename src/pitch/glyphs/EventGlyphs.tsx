import type { SceneEvent } from "../../scene/schema.ts";
import { usePitch } from "../Pitch.tsx";
import { unitsPerPx } from "./glyphSize.ts";
import { SwatchFrame } from "./Swatch.tsx";

export type Side = "a" | "b";

export function teamColour(side: Side): string {
  return side === "a" ? "var(--team-a)" : "var(--team-b)";
}

interface Pt {
  x: number;
  y: number;
}

function direction(from: Pt, to: Pt): { dx: number; dy: number; length: number } {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0) return { dx: 1, dy: 0, length: 0 };
  return { dx: (to.x - from.x) / length, dy: (to.y - from.y) / length, length };
}

/**
 * An 8 x 8 px arrowhead with its tip at (x, y). Team A is filled; team B is hollow with a 2 px
 * stroke, so the two teams stay apart without colour (WCAG 1.4.1).
 */
function Arrowhead({
  tip,
  dx,
  dy,
  side,
  u,
}: {
  tip: Pt;
  dx: number;
  dy: number;
  side: Side;
  u: number;
}) {
  const len = 8 * u;
  const half = 4 * u;
  const bx = tip.x - dx * len;
  const by = tip.y - dy * len;
  const d = `M ${tip.x} ${tip.y} L ${bx - dy * half} ${by + dx * half} L ${bx + dy * half} ${by - dx * half} Z`;
  const colour = teamColour(side);
  return (
    <path
      data-part="arrowhead"
      d={d}
      fill={side === "a" ? colour : "none"}
      stroke={side === "a" ? "none" : colour}
      strokeWidth={side === "a" ? undefined : 2}
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
    />
  );
}

export interface EventShapeProps {
  type: SceneEvent["type"];
  side: Side;
  start: Pt;
  end: Pt;
  /** Shot only: goal fills the end circle, a miss leaves it hollow. */
  goal?: boolean;
  /** User units per screen pixel. */
  u: number;
}

/** One event glyph in user units; used on the pitch and, at u = 1, in legend swatches. */
export function EventShape({ type, side, start, end, goal, u }: EventShapeProps) {
  const colour = teamColour(side);
  const { dx, dy, length } = direction(start, end);

  if (type === "pressure") {
    // 60 degree wedge from the presser toward the target; radius = distance clamped to 2..6 m.
    const r = Math.min(6, Math.max(2, length));
    const theta = Math.atan2(dy, dx);
    const a1 = theta - Math.PI / 6;
    const a2 = theta + Math.PI / 6;
    const d = `M ${start.x} ${start.y} L ${start.x + r * Math.cos(a1)} ${start.y + r * Math.sin(a1)} A ${r} ${r} 0 0 1 ${start.x + r * Math.cos(a2)} ${start.y + r * Math.sin(a2)} Z`;
    return (
      <g data-glyph="pressure">
        <path
          data-part="wedge"
          d={d}
          fill={side === "a" ? colour : "none"}
          fillOpacity={side === "a" ? 0.35 : undefined}
          stroke={colour}
          strokeWidth={1.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  if (type === "shot") {
    const r = 4 * u;
    const lineEnd = { x: end.x - dx * r, y: end.y - dy * r };
    return (
      <g data-glyph="shot">
        <line
          x1={start.x}
          y1={start.y}
          x2={lineEnd.x}
          y2={lineEnd.y}
          stroke={colour}
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
        <circle
          data-part="shot-end"
          cx={end.x}
          cy={end.y}
          r={r}
          fill={goal ? colour : "none"}
          stroke={colour}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  // pass, carry, run: the line stops where the arrowhead starts so a hollow head stays clean.
  const base = { x: end.x - dx * 8 * u, y: end.y - dy * 8 * u };
  const dash = type === "carry" ? "6 4" : type === "run" ? "0.1 5" : undefined;
  return (
    <g data-glyph={type}>
      <line
        x1={start.x}
        y1={start.y}
        x2={length > 8 * u ? base.x : end.x}
        y2={length > 8 * u ? base.y : end.y}
        stroke={colour}
        strokeWidth={2}
        strokeDasharray={dash}
        strokeLinecap={type === "run" ? "round" : undefined}
        vectorEffect="non-scaling-stroke"
      />
      <Arrowhead tip={end} dx={dx} dy={dy} side={side} u={u} />
    </g>
  );
}

export interface EventGlyphProps {
  event: SceneEvent;
  side: Side;
  /** 1 for the active event, 0.4 for past events. */
  opacity: number;
  state: "active" | "past";
}

/** An event drawn on the pitch at its canonical start and end points. */
export function EventGlyph({ event, side, opacity, state }: EventGlyphProps) {
  const { view } = usePitch();
  const u = unitsPerPx(view.pxPerMetre);
  return (
    <g data-event={event.id} data-state={state} opacity={opacity}>
      <EventShape
        type={event.type}
        side={side}
        start={event.start}
        end={event.end}
        goal={event.type === "shot" ? event.goal : undefined}
        u={u}
      />
    </g>
  );
}

const SWATCH_START = { x: 3, y: 10 };
const SWATCH_END = { x: 29, y: 10 };

function EventSwatch({ type, goal }: { type: SceneEvent["type"]; goal?: boolean }) {
  // The pitch wedge radius is in metres (clamped 2..6), so the swatch draws its own 18 px wedge.
  if (type === "pressure") {
    return (
      <SwatchFrame>
        <PressureSwatchShape />
      </SwatchFrame>
    );
  }
  return (
    <SwatchFrame>
      <EventShape
        type={type}
        side="a"
        start={SWATCH_START}
        end={type === "shot" ? { x: 27, y: 10 } : SWATCH_END}
        goal={goal}
        u={1}
      />
    </SwatchFrame>
  );
}

function PressureSwatchShape() {
  // 60 degree sector, 18 px radius, drawn like the pitch wedge (team A: filled at 0.35).
  const r = 18;
  const cx = 4;
  const cy = 10;
  const d = `M ${cx} ${cy} L ${cx + r * Math.cos(-Math.PI / 6)} ${cy + r * Math.sin(-Math.PI / 6)} A ${r} ${r} 0 0 1 ${cx + r * Math.cos(Math.PI / 6)} ${cy + r * Math.sin(Math.PI / 6)} Z`;
  return (
    <g data-glyph="pressure">
      <path
        data-part="wedge"
        d={d}
        fill="var(--team-a)"
        fillOpacity={0.35}
        stroke="var(--team-a)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export function PassSwatch() {
  return <EventSwatch type="pass" />;
}
export function CarrySwatch() {
  return <EventSwatch type="carry" />;
}
export function RunSwatch() {
  return <EventSwatch type="run" />;
}
export function ShotSwatch() {
  return <EventSwatch type="shot" goal />;
}
export function PressureSwatch() {
  return <EventSwatch type="pressure" />;
}
