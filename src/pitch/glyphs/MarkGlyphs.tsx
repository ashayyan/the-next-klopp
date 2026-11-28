import type { ReactNode } from "react";
import type { ScenePoint } from "../../scene/schema.ts";
import { usePitch } from "../Pitch.tsx";
import { type Orientation, screenToCanonical } from "../view.ts";
import { type Side, teamColour } from "./EventGlyphs.tsx";
import { discDiameter, GLYPH_TEXT_PX, unitsPerPx } from "./glyphSize.ts";
import { SwatchFrame } from "./Swatch.tsx";

/** Notes are truncated on the pitch; the full text goes in the SVG <desc>. */
export const NOTE_MAX_CHARS = 40;

/** 39 characters and an ellipsis when the text is over the limit. */
export function truncateNote(text: string): string {
  return text.length > NOTE_MAX_CHARS ? `${text.slice(0, NOTE_MAX_CHARS - 1)}…` : text;
}

// Average advance of 12 px semibold sans text. Chips are sized from it, so a label never needs a
// text measurement (which the server render cannot do).
const CHAR_PX = 7.2;
const CHIP_PAD_PX = 4;

/**
 * A text chip (12 px ink on a white chip, 1 px border, 4 px padding, radius 2 px). The chip is drawn
 * in screen axes inside a group that undoes the vertical rotation, so it reads upright. `anchor`
 * says which chip corner sits at (x, y): the top-left corner, or the centre.
 */
function Chip({
  x,
  y,
  text,
  u,
  orientation,
  anchor,
  part,
}: {
  x: number;
  y: number;
  text: string;
  u: number;
  orientation: Orientation;
  anchor: "top-left" | "centre";
  part?: string;
}) {
  const w = (text.length * CHAR_PX + 2 * CHIP_PAD_PX) * u;
  const h = (GLYPH_TEXT_PX + 2 * CHIP_PAD_PX) * u;
  const ox = anchor === "centre" ? -w / 2 : 0;
  const oy = anchor === "centre" ? -h / 2 : 0;
  const rotate = orientation === "vertical" ? " rotate(90)" : "";
  return (
    <g transform={`translate(${x} ${y})${rotate}`}>
      <rect
        x={ox}
        y={oy}
        width={w}
        height={h}
        rx={2 * u}
        fill="var(--label-bg)"
        stroke="var(--label-border)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <text
        data-part={part}
        x={ox + w / 2}
        y={oy + h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={GLYPH_TEXT_PX * u}
        fontWeight={600}
        fill="var(--ink)"
        style={{ fontFamily: "var(--font-sans)", userSelect: "none" }}
      >
        {text}
      </text>
    </g>
  );
}

function pointsAttr(points: readonly ScenePoint[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(" ");
}

export function ZoneShape({
  points,
  chip,
}: {
  points: readonly ScenePoint[];
  /** Optional label chip, already positioned by the caller. */
  chip?: ReactNode;
}) {
  return (
    <g data-glyph="zone">
      <polygon
        points={pointsAttr(points)}
        fill="var(--zone-fill)"
        stroke="var(--zone-line)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
        style={{ fillOpacity: "var(--zone-fill-opacity)" }}
      />
      {chip}
    </g>
  );
}

/** A zone with its optional label chip at the screen top-left of the zone's bounding box. */
export function ZoneGlyph({ points, label }: { points: readonly ScenePoint[]; label?: string }) {
  const { view, orientation } = usePitch();
  const u = unitsPerPx(view.pxPerMetre);
  let chip: ReactNode = null;
  if (label) {
    // Find the screen top-left corner of the zone, then map it back to canonical metres.
    const screen = points.map((p) => {
      const [a, b, c, d, e, f] = view.cssMatrix;
      return { x: a * p.x + c * p.y + e, y: b * p.x + d * p.y + f };
    });
    const corner = screenToCanonical(
      view,
      Math.min(...screen.map((p) => p.x)),
      Math.min(...screen.map((p) => p.y)),
    );
    chip = (
      <Chip
        x={corner.x}
        y={corner.y}
        text={label}
        u={u}
        orientation={orientation}
        anchor="top-left"
        part="zone-label"
      />
    );
  }
  return <ZoneShape points={points} chip={chip} />;
}

export function ShapeGlyph({
  points,
  side,
  closed,
}: {
  points: readonly ScenePoint[];
  side: Side;
  closed?: boolean;
}) {
  const common = {
    points: pointsAttr(points),
    fill: "none",
    stroke: teamColour(side),
    strokeWidth: 2,
    strokeOpacity: 0.6,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };
  return <g data-glyph="shape">{closed ? <polygon {...common} /> : <polyline {...common} />}</g>;
}

export function HighlightShape({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g data-glyph="highlight">
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke="var(--highlight)"
        strokeWidth={2}
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

/** A 2 px dashed ring at the player disc radius plus 4 px. */
export function HighlightGlyph({ x, y }: { x: number; y: number }) {
  const { view } = usePitch();
  const u = unitsPerPx(view.pxPerMetre);
  return <HighlightShape x={x} y={y} r={discDiameter(view.pxPerMetre) / 2 + 4 * u} />;
}

export function NoteGlyph({
  text,
  at,
  anchor,
}: {
  text: string;
  at: ScenePoint;
  anchor?: ScenePoint;
}) {
  const { view, orientation } = usePitch();
  const u = unitsPerPx(view.pxPerMetre);
  return (
    <g data-glyph="annotation">
      {anchor ? (
        <line
          x1={at.x}
          y1={at.y}
          x2={anchor.x}
          y2={anchor.y}
          stroke="var(--ink)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <Chip
        x={at.x}
        y={at.y}
        text={truncateNote(text)}
        u={u}
        orientation={orientation}
        anchor="centre"
        part="note-text"
      />
    </g>
  );
}

export function PointShape({ x, y, u }: { x: number; y: number; u: number }) {
  const arm = 5 * u;
  return (
    <g data-glyph="point">
      <circle
        cx={x}
        cy={y}
        r={7 * u}
        fill="var(--label-bg)"
        stroke="var(--label-border)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${x - arm} ${y - arm} L ${x + arm} ${y + arm} M ${x - arm} ${y + arm} L ${x + arm} ${y - arm}`}
        fill="none"
        stroke="var(--ink)"
        strokeWidth={2}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

/** A marked spot: a cross on a white circle, with an optional label chip beside it. */
export function PointGlyph({ at, label }: { at: ScenePoint; label?: string }) {
  const { view, orientation } = usePitch();
  const u = unitsPerPx(view.pxPerMetre);
  return (
    <g>
      <PointShape x={at.x} y={at.y} u={u} />
      {label ? (
        <g
          transform={`translate(${at.x} ${at.y})${orientation === "vertical" ? " rotate(90)" : ""}`}
        >
          <Chip
            x={(12 + (label.length * CHAR_PX + 2 * CHIP_PAD_PX) / 2) * u}
            y={0}
            text={label}
            u={u}
            orientation="horizontal"
            anchor="centre"
          />
        </g>
      ) : null}
    </g>
  );
}

export function BadgeShape({ x, y, n, u, textTransform }: BadgeProps) {
  return (
    <g data-glyph="sequence-badge">
      <circle
        cx={x}
        cy={y}
        r={8 * u}
        fill="var(--label-bg)"
        stroke="var(--ink)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={x}
        y={y}
        transform={textTransform}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={GLYPH_TEXT_PX * u}
        fontWeight={600}
        fill="var(--ink)"
        style={{ fontFamily: "var(--font-sans)", userSelect: "none" }}
      >
        {n}
      </text>
    </g>
  );
}

interface BadgeProps {
  x: number;
  y: number;
  n: number;
  u: number;
  textTransform?: string;
}

/** The order number of an action in the possession chain, at the event's start point. */
export function SequenceBadgeGlyph({ x, y, n }: { x: number; y: number; n: number }) {
  const { view, upright } = usePitch();
  return (
    <BadgeShape x={x} y={y} n={n} u={unitsPerPx(view.pxPerMetre)} textTransform={upright(x, y)} />
  );
}

export function ZoneSwatch() {
  return (
    <SwatchFrame>
      <ZoneShape
        points={[
          { x: 4, y: 3 },
          { x: 28, y: 3 },
          { x: 28, y: 17 },
          { x: 4, y: 17 },
        ]}
      />
    </SwatchFrame>
  );
}

export function ShapeSwatch() {
  return (
    <SwatchFrame>
      <ShapeGlyphSwatch />
    </SwatchFrame>
  );
}

function ShapeGlyphSwatch() {
  const pts = [
    { x: 6, y: 15 },
    { x: 15, y: 5 },
    { x: 26, y: 12 },
  ];
  return (
    <g>
      <g data-glyph="shape">
        <polyline
          points={pointsAttr(pts)}
          fill="none"
          stroke="var(--team-a)"
          strokeWidth={2}
          strokeOpacity={0.6}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
      {pts.map((p) => (
        <circle key={`${p.x}-${p.y}`} cx={p.x} cy={p.y} r={3} fill="var(--team-a)" />
      ))}
    </g>
  );
}

export function HighlightSwatch() {
  return (
    <SwatchFrame>
      <HighlightShape x={16} y={10} r={8.5} />
    </SwatchFrame>
  );
}

export function NoteSwatch() {
  return (
    <SwatchFrame>
      <g data-glyph="annotation">
        <Chip x={16} y={10} text="Aa" u={1} orientation="horizontal" anchor="centre" />
      </g>
    </SwatchFrame>
  );
}

export function PointSwatch() {
  return (
    <SwatchFrame>
      <PointShape x={16} y={10} u={1} />
    </SwatchFrame>
  );
}

export function DensitySwatch() {
  const dots = [
    [6, 6],
    [11, 14],
    [16, 8],
    [21, 13],
    [26, 5],
  ] as const;
  return (
    <SwatchFrame>
      <g data-glyph="density">
        {dots.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={1.5} fill="var(--density-mark)" />
        ))}
      </g>
    </SwatchFrame>
  );
}

export function SequenceBadgeSwatch() {
  return (
    <SwatchFrame>
      <BadgeShape x={16} y={10} n={1} u={1} />
    </SwatchFrame>
  );
}
