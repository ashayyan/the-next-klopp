import type { ReactNode } from "react";

/** Legend swatch: 32 x 20 px, one user unit per pixel, decorative (the label carries the meaning). */
export function SwatchFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      width={32}
      height={20}
      viewBox="0 0 32 20"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

/** Stand-in swatch for an id whose glyph is drawn by a later task. */
export function PlaceholderSwatch() {
  return (
    <SwatchFrame>
      <rect
        x={4}
        y={4}
        width={24}
        height={12}
        fill="none"
        stroke="var(--pitch-line)"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        vectorEffect="non-scaling-stroke"
      />
    </SwatchFrame>
  );
}
