// Glyph sizes are set in screen pixels, converted to metres with the live pxPerMetre and clamped so
// a glyph stays readable on a phone and does not bloat on a wide screen (03-UI-SPEC "Glyph sizing
// rule"). Positions stay exact canonical metres.
import { sizeInMetres } from "../view.ts";

/** Player disc diameter in metres: clamp(22 px, 2.0 m, 28 px). 22 px fits the 12 px numbers. */
export function discDiameter(pxPerMetre: number): number {
  return sizeInMetres(22, 2.0, 28, pxPerMetre);
}

/** Ball diameter in metres: clamp(10 px, 1.0 m, 14 px). */
export function ballDiameter(pxPerMetre: number): number {
  return sizeInMetres(10, 1.0, 14, pxPerMetre);
}

/** User units per screen pixel. Legend swatches are drawn at u = 1 (one unit is one pixel). */
export function unitsPerPx(pxPerMetre: number): number {
  return 1 / pxPerMetre;
}

/** Glyph text size: always 12 screen pixels. */
export const GLYPH_TEXT_PX = 12;

/** Cap height of the glyph face (Mona Sans) as a share of the font size, measured in Chrome. */
export const GLYPH_CAP_RATIO = 0.73;

/**
 * Widest advance of one character of 12 px semibold glyph text at the condensed width (75 %),
 * measured in Chrome over the position codes (RW is the widest pair, 13.5 px).
 */
export const CONDENSED_CHAR_PX = 7;

/**
 * The width, in screen pixels, a centred line of capitals may take inside a player disc: the chord
 * of the disc's inner edge (radius minus half the outline) at half the cap height. A 22 px disc
 * with the 3 px team B ring gives about 16.9 px.
 */
export function labelMaxWidthPx(discPx: number, strokePx: number): number {
  const r = discPx / 2 - strokePx / 2;
  const half = (GLYPH_TEXT_PX * GLYPH_CAP_RATIO) / 2;
  return 2 * Math.sqrt(Math.max(0, r * r - half * half));
}

export interface LabelFit {
  /** CSS font-stretch for the label; undefined keeps the normal width. */
  stretch?: "75%";
  /** Forced advance width in screen pixels (SVG textLength); undefined lets the text set it. */
  lengthPx?: number;
}

/**
 * How glyph text fits inside a disc of `discPx` with an outline of `strokePx`. A shirt number or a
 * single character keeps the normal width (22 px is sized for two digits). A label of two or more
 * letters (a position code such as CM, or initials) uses the same family's condensed width; one so
 * long that even the condensed width could pass the disc edge is also squeezed to the chord.
 */
export function fitLabel(text: string, discPx: number, strokePx: number): LabelFit {
  if (text.length < 2 || /^\d+$/.test(text)) return {};
  const max = labelMaxWidthPx(discPx, strokePx);
  return text.length * CONDENSED_CHAR_PX > max
    ? { stretch: "75%", lengthPx: max }
    : { stretch: "75%" };
}
