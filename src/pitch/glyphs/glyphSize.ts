// Glyph sizes are set in screen pixels, converted to metres with the live pxPerMetre and clamped so
// a glyph stays readable on a phone and does not bloat on a wide screen (03-UI-SPEC "Glyph sizing
// rule"). Positions stay exact canonical metres.
import { sizeInMetres } from "../view.ts";

/** Player disc diameter in metres: clamp(20 px, 2.0 m, 28 px). */
export function discDiameter(pxPerMetre: number): number {
  return sizeInMetres(20, 2.0, 28, pxPerMetre);
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
