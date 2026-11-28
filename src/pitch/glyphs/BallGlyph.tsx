import { usePitch } from "../Pitch.tsx";
import { ballDiameter } from "./glyphSize.ts";
import { SwatchFrame } from "./Swatch.tsx";

export function BallShape({ x, y, d }: { x: number; y: number; d: number }) {
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: an SVG group without tabindex is not focusable; the ball is decorative
    <g data-glyph="ball" aria-hidden="true">
      <circle
        cx={x}
        cy={y}
        r={d / 2}
        fill="var(--ball-fill)"
        stroke="var(--ball-ring)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

/** The ball at canonical (x, y); drawn above the players. */
export function BallGlyph({ x, y }: { x: number; y: number }) {
  const { view } = usePitch();
  return <BallShape x={x} y={y} d={ballDiameter(view.pxPerMetre)} />;
}

export function BallSwatch() {
  return (
    <SwatchFrame>
      <BallShape x={16} y={10} d={12} />
    </SwatchFrame>
  );
}
