import type { ComponentType } from "react";
import { ButtonDemo } from "./demos/controls.tsx";
import {
  ColourDemo,
  IconsDemo,
  MotionDemo,
  SpaceRadiusDemo,
  TypeDemo,
} from "./demos/foundations.tsx";
import {
  ConverterProbeDemo,
  DragDemo,
  GlyphsDemo,
  LegendDemo,
  PitchDemo,
  PlaybackDemo,
} from "./demos/pitch.tsx";

// The gallery's primitive registry. A URL `:primitiveId` is only ever looked up here by id
// (findPrimitive); it is never used as a path or an import specifier (threat T-04-26).

export const GROUPS = [
  "Foundations",
  "Controls",
  "Overlays",
  "Lesson",
  "Data",
  "Pitch",
  "Interactions",
] as const;

export type GroupName = (typeof GROUPS)[number];

export interface Primitive {
  /** Kebab-case, unique. Used in the URL, in `data-gallery-state` and in baseline file names. */
  id: string;
  group: GroupName;
  label: string;
  /** Kebab-case state names, in the order the matrix draws them. */
  states: readonly string[];
  /** Draws one state. The matrix wraps it in a StateCell. */
  Demo: ComponentType<{ state: string }>;
  /**
   * The state needs room (a pitch with its bar): the matrix uses one column below 1280 px and two
   * from there, so a cell is never narrower than about 680 px next to a wide viewport's media queries.
   */
  wide?: boolean;
}

export const GALLERY: readonly Primitive[] = [
  {
    id: "colour",
    group: "Foundations",
    label: "Colour",
    states: ["color", "pitch", "data"],
    Demo: ColourDemo,
  },
  {
    id: "type",
    group: "Foundations",
    label: "Type",
    states: ["roles", "numerals", "glyph-sample"],
    Demo: TypeDemo,
  },
  {
    id: "space-radius",
    group: "Foundations",
    label: "Space and radius",
    states: ["space", "radius", "elevation"],
    Demo: SpaceRadiusDemo,
  },
  {
    id: "icons",
    group: "Foundations",
    label: "Icons",
    states: ["ink", "muted", "on-accent"],
    Demo: IconsDemo,
  },
  {
    id: "motion",
    group: "Foundations",
    label: "Motion",
    states: ["ui", "draw", "morph", "reduced-motion"],
    Demo: MotionDemo,
  },
  {
    id: "button",
    group: "Controls",
    label: "Button",
    states: ["default", "hover", "focus-visible", "pressed", "disabled", "loading"],
    Demo: ButtonDemo,
  },
  {
    id: "pitch",
    group: "Pitch",
    label: "Pitch",
    states: ["horizontal", "vertical", "100x65", "density"],
    Demo: PitchDemo,
  },
  {
    id: "glyphs",
    group: "Pitch",
    label: "Glyphs",
    states: ["team-a", "team-b"],
    Demo: GlyphsDemo,
    wide: true,
  },
  {
    id: "legend",
    group: "Pitch",
    label: "Legend",
    states: ["expanded", "collapsed", "empty"],
    Demo: LegendDemo,
  },
  {
    id: "playback",
    group: "Interactions",
    label: "Playback",
    states: ["paused", "playing", "at-end", "still"],
    Demo: PlaybackDemo,
    wide: true,
  },
  {
    id: "drag",
    group: "Interactions",
    label: "Drag",
    states: ["board", "focused", "dragging"],
    Demo: DragDemo,
    wide: true,
  },
  {
    id: "converter-probe",
    group: "Interactions",
    label: "Converter probe",
    states: ["idle", "valid", "range-error"],
    Demo: ConverterProbeDemo,
  },
];

export function findPrimitive(id: string | undefined): Primitive | undefined {
  return GALLERY.find((p) => p.id === id);
}

/** The groups that have at least one primitive, in `GROUPS` order, with their primitives. */
export function groupedPrimitives(): { group: GroupName; primitives: Primitive[] }[] {
  return GROUPS.flatMap((group) => {
    const primitives = GALLERY.filter((p) => p.group === group);
    return primitives.length > 0 ? [{ group, primitives }] : [];
  });
}

const STATE_ANCHOR = /^state-([a-z0-9-]+)$/;

/** The state name in a `#state-<name>` fragment, or null when the fragment is anything else. */
export function stateFromHash(hash: string): string | null {
  return STATE_ANCHOR.exec(hash.replace(/^#/, ""))?.[1] ?? null;
}
