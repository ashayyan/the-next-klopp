import type { ComponentType } from "react";
import {
  ButtonDemo,
  ChoiceDemo,
  InputDemo,
  LinkDemo,
  SegmentedDemo,
  SelectDemo,
  SliderDemo,
  TabsDemo,
} from "./demos/controls.tsx";
import { ChartPrimitivesDemo, DataTableDemo, ScalesDemo, StatCardDemo } from "./demos/data.tsx";
import {
  ColourDemo,
  IconsDemo,
  MotionDemo,
  SpaceRadiusDemo,
  TypeDemo,
} from "./demos/foundations.tsx";
import {
  BadgeDemo,
  ConfusionButtonDemo,
  FocusToggleDemo,
  GlossaryCardDemo,
  ProgressRingDemo,
  QuizOptionDemo,
  ShellBarDemo,
  StepRailDemo,
  SurfaceDemo,
} from "./demos/lesson.tsx";
import {
  AlertDialogDemo,
  DialogDemo,
  PopoverDemo,
  ToastDemo,
  TooltipDemo,
} from "./demos/overlays.tsx";
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
    id: "input",
    group: "Controls",
    label: "Input",
    states: ["empty", "filled", "focus", "invalid", "disabled", "long-value"],
    Demo: InputDemo,
  },
  {
    id: "link",
    group: "Controls",
    label: "Link",
    states: [
      "inline-default",
      "inline-hover",
      "inline-focus-visible",
      "standalone-default",
      "standalone-hover",
      "standalone-focus-visible",
    ],
    Demo: LinkDemo,
  },
  {
    id: "select",
    group: "Controls",
    label: "Select",
    states: ["closed", "open", "focus", "disabled"],
    Demo: SelectDemo,
  },
  {
    id: "checkbox-radio-switch",
    group: "Controls",
    label: "Checkbox, radio and switch",
    states: ["off", "on", "focus", "disabled"],
    Demo: ChoiceDemo,
  },
  {
    id: "segmented",
    group: "Controls",
    label: "Segmented",
    states: ["two-option", "three-first", "three-second", "three-third", "focus", "wrap"],
    Demo: SegmentedDemo,
  },
  {
    id: "slider",
    group: "Controls",
    label: "Slider",
    states: ["min", "mid", "max", "focus", "disabled"],
    Demo: SliderDemo,
  },
  {
    id: "tabs",
    group: "Controls",
    label: "Tabs",
    states: ["first", "second", "focus", "many"],
    Demo: TabsDemo,
  },
  {
    id: "dialog",
    group: "Overlays",
    label: "Dialog",
    states: ["open", "interactive"],
    Demo: DialogDemo,
  },
  {
    id: "alert-dialog",
    group: "Overlays",
    label: "Alert dialog",
    states: ["open", "interactive"],
    Demo: AlertDialogDemo,
  },
  {
    id: "popover",
    group: "Overlays",
    label: "Popover",
    states: ["short", "long-text"],
    Demo: PopoverDemo,
  },
  {
    id: "tooltip",
    group: "Overlays",
    label: "Tooltip",
    states: ["open"],
    Demo: TooltipDemo,
  },
  {
    id: "toast",
    group: "Overlays",
    label: "Toast",
    states: ["saved"],
    Demo: ToastDemo,
  },
  {
    id: "shell-bar",
    group: "Lesson",
    label: "Shell bar",
    states: ["default", "focus-mode-on", "overflow-menu-open"],
    Demo: ShellBarDemo,
    wide: true,
  },
  {
    id: "step-rail",
    group: "Lesson",
    label: "Step rail",
    states: [
      "hook",
      "see-it",
      "touch-it",
      "predict",
      "do-it",
      "lock-it-in",
      "connect-it",
      "compact",
    ],
    Demo: StepRailDemo,
    wide: true,
  },
  {
    id: "focus-toggle",
    group: "Lesson",
    label: "Focus toggle",
    states: ["off", "on"],
    Demo: FocusToggleDemo,
  },
  {
    id: "confusion-button",
    group: "Lesson",
    label: "Confusion button",
    states: ["idle", "note-open", "note-typed"],
    Demo: ConfusionButtonDemo,
  },
  {
    id: "glossary-card",
    group: "Lesson",
    label: "Glossary card",
    states: ["short-term", "long-definition", "mini-pitch"],
    Demo: GlossaryCardDemo,
  },
  {
    id: "quiz-option",
    group: "Lesson",
    label: "Quiz option",
    states: ["idle", "hover", "focus", "selected", "correct", "incorrect", "disabled"],
    Demo: QuizOptionDemo,
  },
  {
    id: "progress-ring",
    group: "Lesson",
    label: "Progress ring",
    states: ["0-percent", "40-percent", "100-percent", "labelled"],
    Demo: ProgressRingDemo,
  },
  {
    id: "badge",
    group: "Lesson",
    label: "Badge",
    states: ["neutral", "done", "new"],
    Demo: BadgeDemo,
  },
  {
    id: "surface",
    group: "Lesson",
    label: "Surface",
    states: ["page", "panel", "raised", "sheet", "stat-card"],
    Demo: SurfaceDemo,
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
