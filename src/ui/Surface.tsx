import type { ReactNode } from "react";

export type SurfaceLevel = "page" | "panel" | "raised";

export interface SurfaceProps {
  level: SurfaceLevel;
  /**
   * A sheet is a raised surface that floats a little: it draws `--shadow-sheet`, which is `none` in
   * a system whose elevation is tone only (DESIGN.md 3.4).
   */
  sheet?: boolean;
  className?: string;
  children?: ReactNode;
}

const LEVELS: Record<SurfaceLevel, string> = {
  page: "bg-surface-page",
  panel: "bg-surface-panel",
  raised: "border border-control-border bg-surface-raised",
};

/** The three tonal surfaces: page, panel and raised. Elevation is tone; the sheet adds the shadow token. */
export function Surface({ level, sheet = false, className, children }: SurfaceProps) {
  return (
    <div
      data-surface={sheet ? "sheet" : level}
      className={`${LEVELS[level]}${sheet ? " shadow-sheet" : ""}${className ? ` ${className}` : ""}`}
    >
      {children}
    </div>
  );
}
