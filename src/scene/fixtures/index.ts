// Fixed dev scene registry for /dev/pitch. The ?scene= query value is only ever looked up here by
// id (findDevScene); it is never used as a path or an import specifier, so a crafted URL cannot
// load anything that is not listed below.

export interface DevScene {
  id: string;
  label: string;
  /** Resolves to the raw scene JSON, or null for the pitch-only option. */
  load: () => Promise<unknown> | null;
}

// Order follows the 03-UI-SPEC "Scene options" table for the options that exist so far.
export const DEV_SCENES: readonly DevScene[] = [
  { id: "pitch-only", label: "Pitch only", load: () => null },
  {
    id: "glyph-sheet",
    label: "Glyph sheet",
    load: () => import("./glyph-sheet.json").then((m) => m.default),
  },
  {
    id: "authored",
    label: "Authored visual",
    load: () => import("./authored.json").then((m) => m.default),
  },
  {
    id: "board",
    label: "Saved board (drag spike)",
    load: () => import("./board.json").then((m) => m.default),
  },
  {
    id: "quiz-answer",
    label: "Quiz answer",
    load: () => import("./quiz-answer.json").then((m) => m.default),
  },
  {
    // Until 03-10 publishes the recipe artifact, this loads the 03-02 fixture.
    id: "reconstruction",
    label: "Reconstruction · Wyscout PL 2017/18",
    load: () => import("./reconstruction.json").then((m) => m.default),
  },
];

/** The scene shown when ?scene= names nothing known. */
export const FALLBACK_SCENE_ID = "glyph-sheet";

export function findDevScene(id: string | null | undefined): DevScene | undefined {
  return DEV_SCENES.find((s) => s.id === id);
}
