import { createContext, type ReactNode, useContext, useId, useMemo } from "react";
import { type PitchGeometry, pitchGeometry } from "./geometry.ts";
import { makeView, type Orientation, type View } from "./view.ts";

export interface PitchProps {
  /** Field length in metres. Default 105 (PL Handbook Rule K.17). */
  length?: number;
  /** Field width in metres. Default 68. */
  width?: number;
  orientation?: Orientation;
  /** Run-off margin in metres. Default 3. */
  runoff?: number;
  /** Scene label used in the accessible name. */
  title: string;
  desc?: string;
  /** True when the pitch holds focusable children (draggable players): role="group". */
  interactive?: boolean;
  /** The Canvas layer slot, rendered between the bottom and the top SVG. */
  canvas?: ReactNode;
  /** Pointer position in canonical metres, or null when the pointer leaves the pitch. */
  onPointerCanonical?: (p: { x: number; y: number } | null) => void;
  /** CSS width used until the container is measured. Default 960. */
  initialCssWidth?: number;
  children?: ReactNode;
}

export interface PitchContextValue {
  view: View;
  length: number;
  width: number;
  orientation: Orientation;
  runoff: number;
  /** Counter-rotation for text at (x, y) so it reads upright; undefined in horizontal. */
  upright: (x: number, y: number) => string | undefined;
}

const PitchContext = createContext<PitchContextValue | null>(null);

export function usePitch(): PitchContextValue {
  const value = useContext(PitchContext);
  if (value === null) throw new Error("usePitch() must be called inside <Pitch>");
  return value;
}

const LINE = {
  fill: "none",
  stroke: "var(--pitch-line)",
  strokeWidth: 1.5,
  vectorEffect: "non-scaling-stroke",
} as const;

function Markings({ g, pxPerMetre }: { g: PitchGeometry; pxPerMetre: number }) {
  // Centre and penalty marks are dots of 3 px screen radius at every pitch size.
  const dot = 3 / pxPerMetre;
  const sides = ["left", "right"] as const;
  const corners = ["top-left", "top-right", "bottom-right", "bottom-left"] as const;
  return (
    <g data-layer="markings">
      <rect
        data-marking="field-boundary"
        x={g.field.x}
        y={g.field.y}
        width={g.field.width}
        height={g.field.height}
        {...LINE}
      />
      <line
        data-marking="halfway-line"
        x1={g.halfwayLine.x1}
        y1={g.halfwayLine.y1}
        x2={g.halfwayLine.x2}
        y2={g.halfwayLine.y2}
        {...LINE}
      />
      <circle
        data-marking="centre-circle"
        cx={g.centreCircle.cx}
        cy={g.centreCircle.cy}
        r={g.centreCircle.r}
        {...LINE}
      />
      <circle
        data-marking="centre-mark"
        cx={g.centreMark.x}
        cy={g.centreMark.y}
        r={dot}
        style={{ fill: "var(--pitch-line)" }}
      />
      {sides.map((side, i) => {
        const goalArea = g.goalAreas[i];
        const penaltyArea = g.penaltyAreas[i];
        const mark = g.penaltyMarks[i];
        const arc = g.penaltyArcs[i];
        const goal = g.goals[i];
        if (!goalArea || !penaltyArea || !mark || !arc || !goal) return null;
        return (
          <g key={side}>
            <rect
              data-marking={`goal-area-${side}`}
              x={goalArea.x}
              y={goalArea.y}
              width={goalArea.width}
              height={goalArea.height}
              {...LINE}
            />
            <rect
              data-marking={`penalty-area-${side}`}
              x={penaltyArea.x}
              y={penaltyArea.y}
              width={penaltyArea.width}
              height={penaltyArea.height}
              {...LINE}
            />
            <circle
              data-marking={`penalty-mark-${side}`}
              cx={mark.x}
              cy={mark.y}
              r={dot}
              style={{ fill: "var(--pitch-line)" }}
            />
            <path data-marking={`penalty-arc-${side}`} d={arc.d} {...LINE} />
            <path data-marking={`goal-${side}`} d={goal.d} {...LINE} />
          </g>
        );
      })}
      {corners.map((corner, i) => {
        const d = g.cornerArcs[i];
        if (d === undefined) return null;
        return <path key={corner} data-marking={`corner-arc-${corner}`} d={d} {...LINE} />;
      })}
    </g>
  );
}

/**
 * The canonical pitch: a bottom SVG (run-off, field), an optional Canvas slot, and a transparent
 * top SVG holding the markings and children. All three share one view and one transform; children
 * draw in canonical metres inside `<g data-canonical-root>`. Only the top SVG takes pointer events.
 */
export function Pitch({
  length = 105,
  width = 68,
  orientation = "horizontal",
  runoff = 3,
  title,
  desc,
  interactive = false,
  canvas,
  initialCssWidth = 960,
  children,
}: PitchProps) {
  const titleId = useId();
  const descId = useId();
  const cssWidth = initialCssWidth;

  const view = useMemo(
    () => makeView({ length, width, runoff, orientation, cssWidth }),
    [length, width, runoff, orientation, cssWidth],
  );
  const geometry = useMemo(() => pitchGeometry(length, width), [length, width]);

  const context = useMemo<PitchContextValue>(
    () => ({
      view,
      length,
      width,
      orientation,
      runoff,
      upright: (x, y) => (orientation === "vertical" ? `rotate(90 ${x} ${y})` : undefined),
    }),
    [view, length, width, orientation, runoff],
  );

  const layer = "absolute inset-0 block h-full w-full";

  return (
    <PitchContext.Provider value={context}>
      <div
        data-pitch
        className="relative w-full"
        style={{ aspectRatio: `${view.vbWidth} / ${view.vbHeight}` }}
      >
        <svg
          aria-hidden="true"
          className={`${layer} pointer-events-none`}
          viewBox={view.viewBox}
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={view.groupTransform}>
            <rect
              data-layer="runoff"
              x={-runoff}
              y={-runoff}
              width={length + 2 * runoff}
              height={width + 2 * runoff}
              style={{ fill: "var(--pitch-runoff)" }}
            />
            <rect
              data-layer="field"
              x={0}
              y={0}
              width={length}
              height={width}
              style={{ fill: "var(--pitch-surface)" }}
            />
          </g>
        </svg>
        {canvas}
        <svg
          role={interactive ? "group" : "img"}
          aria-labelledby={titleId}
          aria-describedby={desc ? descId : undefined}
          className={layer}
          viewBox={view.viewBox}
          preserveAspectRatio="xMidYMid meet"
        >
          <title id={titleId}>{`Pitch, ${length} by ${width} metres — ${title}`}</title>
          {desc ? <desc id={descId}>{desc}</desc> : null}
          <g data-canonical-root transform={view.groupTransform}>
            <Markings g={geometry} pxPerMetre={view.pxPerMetre} />
            {children}
          </g>
        </svg>
      </div>
    </PitchContext.Provider>
  );
}
