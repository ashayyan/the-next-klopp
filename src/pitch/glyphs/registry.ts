// The glyph registry (PITCH-03). Glyph ids and legend wording become the learner's vocabulary for
// every pitch view, so they change only through a decision record. The order of GLYPHS is the
// legend order.
import type { ComponentType } from "react";
import { BallSwatch } from "./BallGlyph.tsx";
import { CarrySwatch, PassSwatch, PressureSwatch, RunSwatch, ShotSwatch } from "./EventGlyphs.tsx";
import {
  DensitySwatch,
  HighlightSwatch,
  NoteSwatch,
  PointSwatch,
  SequenceBadgeSwatch,
  ShapeSwatch,
  ZoneSwatch,
} from "./MarkGlyphs.tsx";
import {
  GoalkeeperASwatch,
  GoalkeeperBSwatch,
  PlayerASwatch,
  PlayerBSwatch,
} from "./PlayerGlyph.tsx";

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
  /**
   * Legend description. `{disc-text}` is replaced by what the scene's discs carry (shirt number,
   * position code, player initials), so the legend names what is shown (DESIGN.md section 4).
   */
  description: string;
  /** Draws the glyph in a 32 x 20 px legend swatch. */
  sample: ComponentType;
}

export const GLYPHS: readonly GlyphEntry[] = [
  {
    id: "player-a",
    label: "Team A player — {team}",
    description: "Filled disc with {disc-text}.",
    sample: PlayerASwatch,
  },
  {
    id: "player-b",
    label: "Team B player — {team}",
    description: "White disc with a coloured ring and {disc-text}.",
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
    sample: PassSwatch,
  },
  {
    id: "carry",
    label: "Carry",
    description: "Dashed line: the player runs with the ball.",
    sample: CarrySwatch,
  },
  {
    id: "run",
    label: "Run without the ball",
    description: "Dotted line: movement off the ball.",
    sample: RunSwatch,
  },
  {
    id: "shot",
    label: "Shot",
    description: "Heavier line ending in a circle at the target.",
    sample: ShotSwatch,
  },
  {
    id: "pressure",
    label: "Pressure",
    description: "Wedge from the presser toward the player pressed.",
    sample: PressureSwatch,
  },
  {
    id: "zone",
    label: "Zone",
    description: "Shaded area of the pitch.",
    sample: ZoneSwatch,
  },
  {
    id: "shape",
    label: "Shape line",
    description: "Line joining players in one unit.",
    sample: ShapeSwatch,
  },
  {
    id: "highlight",
    label: "Highlighted",
    description: "Dashed ring around a player or point to look at.",
    sample: HighlightSwatch,
  },
  {
    id: "annotation",
    label: "Note",
    description: "Short label pinned to the pitch.",
    sample: NoteSwatch,
  },
  {
    id: "point",
    label: "Point",
    description: "A marked spot, such as a tapped answer.",
    sample: PointSwatch,
  },
  {
    id: "density",
    label: "Event location (Canvas)",
    description: "One dot per event, drawn on the Canvas layer.",
    sample: DensitySwatch,
  },
  {
    id: "sequence-badge",
    label: "Sequence order",
    description: "Number of each action in the possession chain.",
    sample: SequenceBadgeSwatch,
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
