// Pure placement of sequence badges and note chips (04-UI-SPEC "Phase 3 open observations").
//
// Badges are placed in screen space around the event start point, so the rule holds in both
// orientations, and returned in canonical metres. Chips are placed in screen pixels after the
// orientation transform. No React, no DOM.

import type { ScenePoint } from "../../scene/schema.ts";
import { canonicalToScreen, type Pt, screenToCanonical, type View } from "../view.ts";
import { discDiameter, GLYPH_TEXT_PX } from "./glyphSize.ts";

/** A box in CSS pixels relative to the pitch container's top-left corner. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Badge circle radius in screen pixels (BadgeShape draws r = 8 u). */
export const BADGE_RADIUS_PX = 8;
/** Gap between the disc edge and the badge centre beyond the badge radius: disc radius + 8 px. */
export const BADGE_OFFSET_PX = 8;
/** Clear space kept between two badges, so their 1 px ink rings never touch. */
export const BADGE_GAP_PX = 2;
// Average advance of 12 px semibold sans text; chips are sized from it so no text is measured.
export const CHAR_PX = 7.2;
export const CHIP_PAD_PX = 4;

/** Boxes that only touch along an edge do not intersect. */
export function boxesIntersect(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Chip size in screen pixels for a label of `text.length` characters. */
export function chipSizePx(text: string): { width: number; height: number } {
  return {
    width: text.length * CHAR_PX + 2 * CHIP_PAD_PX,
    height: GLYPH_TEXT_PX + 2 * CHIP_PAD_PX,
  };
}

function centredBox(c: Pt, w: number, h: number): Box {
  return { x: c.x - w / 2, y: c.y - h / 2, w, h };
}

function insideView(b: Box, view: View): boolean {
  return b.x >= 0 && b.y >= 0 && b.x + b.w <= view.cssWidth && b.y + b.h <= view.cssHeight;
}

export interface PlaceBadgeInput {
  /** Event start point, canonical metres. */
  start: ScenePoint;
  /** Event end point, canonical metres. Gives the direction of travel. */
  end: ScenePoint;
  /** Player disc centres, canonical metres. */
  discs: readonly Pt[];
  /** Centres of the badges already placed in this frame, canonical metres. Default none. */
  badges?: readonly Pt[];
  view: View;
}

/**
 * Canonical position of the badge centre. The badge starts disc radius + 8 px from the event start
 * point and tries the left of travel, the right of travel, behind the start and ahead of it. A
 * sloping direction of travel puts the square box of the badge on the corner of the start disc's
 * box, so the same four sides are tried again further out (x 1.42 then x 2). A side is clear when
 * the badge box stays inside the pitch and meets no player disc and no badge placed before it (with
 * a 2 px gap). When no side clears both, the first side clear of the discs alone wins, so a badge
 * never lands on a disc to dodge another badge; failing that, the left-of-travel position at the
 * base distance.
 */
export function placeBadge({ start, end, discs, badges = [], view }: PlaceBadgeInput): ScenePoint {
  const s = canonicalToScreen(view, start);
  const e = canonicalToScreen(view, end);
  let dx = e.x - s.x;
  let dy = e.y - s.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    dx = 0;
    dy = -1; // a zero-length event: up the screen
  } else {
    dx /= len;
    dy /= len;
  }
  const discPx = discDiameter(view.pxPerMetre) * view.pxPerMetre;
  const base = discPx / 2 + BADGE_OFFSET_PX;
  const sides: Pt[] = [
    { x: dy, y: -dx }, // left of travel (screen y runs down)
    { x: -dy, y: dx }, // right of travel
    { x: -dx, y: -dy }, // behind the start
    { x: dx, y: dy }, // ahead of the start
  ];
  const discBoxes = discs.map((d) => centredBox(canonicalToScreen(view, d), discPx, discPx));
  const size = 2 * BADGE_RADIUS_PX;
  const badgeBoxes = badges.map((b) =>
    centredBox(canonicalToScreen(view, b), size + 2 * BADGE_GAP_PX, size + 2 * BADGE_GAP_PX),
  );
  for (const obstacles of [[...discBoxes, ...badgeBoxes], discBoxes]) {
    for (const scale of [1, Math.SQRT2, 2]) {
      for (const side of sides) {
        const c = { x: s.x + side.x * base * scale, y: s.y + side.y * base * scale };
        const box = centredBox(c, size, size);
        if (insideView(box, view) && obstacles.every((o) => !boxesIntersect(box, o))) {
          return screenToCanonical(view, c.x, c.y);
        }
      }
    }
  }
  const left = sides[0] as Pt;
  return screenToCanonical(view, s.x + left.x * base, s.y + left.y * base);
}

export interface PlaceChipInput {
  /** The point the chip belongs to, in CSS pixels after the orientation transform. */
  anchor: Pt;
  width: number;
  height: number;
  view: View;
  /** Screen offset from the anchor to the preferred chip centre. Default (0, 0): centred. */
  offset?: Pt;
}

/**
 * Chip centre in CSS pixels. The chip sits where the current code draws it (centred on the anchor
 * plus `offset`). When that box would cross an edge it moves to the opposite side of the anchor on
 * that axis, then the centre is clamped so the box lies inside the SVG.
 */
export function placeChip({ anchor, width, height, view, offset }: PlaceChipInput): Pt {
  const off = offset ?? { x: 0, y: 0 };
  let cx = anchor.x + off.x;
  let cy = anchor.y + off.y;
  const crossesX = cx - width / 2 < 0 || cx + width / 2 > view.cssWidth;
  const crossesY = cy - height / 2 < 0 || cy + height / 2 > view.cssHeight;
  if (crossesX) {
    if (off.x !== 0) cx = anchor.x - off.x;
    else cx = cx + width / 2 > view.cssWidth ? anchor.x - width / 2 : anchor.x + width / 2;
  }
  if (crossesY) {
    if (off.y !== 0) cy = anchor.y - off.y;
    else cy = cy + height / 2 > view.cssHeight ? anchor.y - height / 2 : anchor.y + height / 2;
  }
  const clamp = (v: number, size: number, max: number) =>
    size >= max ? max / 2 : Math.min(max - size / 2, Math.max(size / 2, v));
  return { x: clamp(cx, width, view.cssWidth), y: clamp(cy, height, view.cssHeight) };
}
