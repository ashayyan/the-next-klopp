// The glyph registry (PITCH-03). Glyph ids and legend wording become the learner's vocabulary for
// every pitch view, so they change only through a decision record. The order of GLYPHS is the
// legend order.
import type { ComponentType } from "react";
import { BallSwatch } from "./BallGlyph.tsx";
import {
  GoalkeeperASwatch,
  GoalkeeperBSwatch,
  PlayerASwatch,
  PlayerBSwatch,
} from "./PlayerGlyph.tsx";
import { PlaceholderSwatch } from "./Swatch.tsx";

export type GlyphId =
  | "player-a"
  | "player-b"
  | "goalkeeper-a"
  | "goalkeeper-b"
  | "ball"
  | "pass"
  | "carry"
  | "run"
  | "shot"
  | "pressure"
  | "zone"
  | "shape"
  | "highlight"
  | "annotation"
  | "point"
  | "density"
  | "sequence-badge";

export interface GlyphEntry {
  id: GlyphId;
  /** Legend label. `{team}` is replaced by the team name from the scene's teams[]. */
  label: string;
  description: string;
  /** Draws the glyph in a 32 x 20 px legend swatch. */
  sample: ComponentType;
}

export const GLYPHS: readonly GlyphEntry[] = [
  {
    id: "player-a",
    label: "Team A player — {team}",
    description: "Filled disc with shirt number.",
    sample: PlayerASwatch,
  },
  {
    id: "player-b",
    label: "Team B player — {team}",
    description: "White disc with a coloured ring and shirt number.",
    sample: PlayerBSwatch,
  },
  {
    id: "goalkeeper-a",
    label: "Goalkeeper — {team}",
    description: "Rounded square instead of a disc.",
    sample: GoalkeeperASwatch,
  },
  {
    id: "goalkeeper-b",
    label: "Goalkeeper — {team}",
    description: "Rounded square instead of a disc.",
    sample: GoalkeeperBSwatch,
  },
  {
    id: "ball",
    label: "Ball",
    description: "Small white circle with a dark ring.",
    sample: BallSwatch,
  },
  {
    id: "pass",
    label: "Pass",
    description: "Solid line, arrowhead at the receiver.",
    sample: PlaceholderSwatch,
  },
  {
    id: "carry",
    label: "Carry",
    description: "Dashed line: the player runs with the ball.",
    sample: PlaceholderSwatch,
  },
  {
    id: "run",
    label: "Run without the ball",
    description: "Dotted line: movement off the ball.",
    sample: PlaceholderSwatch,
  },
  {
    id: "shot",
    label: "Shot",
    description: "Heavier line ending in a circle at the target.",
    sample: PlaceholderSwatch,
  },
  {
    id: "pressure",
    label: "Pressure",
    description: "Wedge from the presser toward the player pressed.",
    sample: PlaceholderSwatch,
  },
  {
    id: "zone",
    label: "Zone",
    description: "Shaded area of the pitch.",
    sample: PlaceholderSwatch,
  },
  {
    id: "shape",
    label: "Shape line",
    description: "Line joining players in one unit.",
    sample: PlaceholderSwatch,
  },
  {
    id: "highlight",
    label: "Highlighted",
    description: "Dashed ring around a player or point to look at.",
    sample: PlaceholderSwatch,
  },
  {
    id: "annotation",
    label: "Note",
    description: "Short label pinned to the pitch.",
    sample: PlaceholderSwatch,
  },
  {
    id: "point",
    label: "Point",
    description: "A marked spot, such as a tapped answer.",
    sample: PlaceholderSwatch,
  },
  {
    id: "density",
    label: "Event location (Canvas)",
    description: "One dot per event, drawn on the Canvas layer.",
    sample: PlaceholderSwatch,
  },
  {
    id: "sequence-badge",
    label: "Sequence order",
    description: "Number of each action in the possession chain.",
    sample: PlaceholderSwatch,
  },
];

/** Glyph ids in legend order. */
export const GLYPH_IDS: readonly GlyphId[] = GLYPHS.map((g) => g.id);

/** Looks an id up in the registry. An id that is not registered is an error, never a silent draw. */
export function glyph(id: string): GlyphEntry {
  const entry = GLYPHS.find((g) => g.id === id);
  if (!entry) throw new Error(`unknown glyph id "${id}"; add it to the registry first`);
  return entry;
}
