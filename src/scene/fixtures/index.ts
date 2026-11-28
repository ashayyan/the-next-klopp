// Fixed dev scene registry for /dev/pitch. The ?scene= query value is only ever looked up here by
// id (findDevScene); it is never used as a path or an import specifier, so a crafted URL cannot
// load anything that is not listed below.

export interface DevScene {
  id: string;
  label: string;
  /** Resolves to the raw scene JSON, or null for the pitch-only and the fetched/local options. */
  load: () => Promise<unknown> | null;
  /** No scene at all: the page draws only the pitch markings, so there is nothing to load. */
  blank?: true;
  /** Fetched through /data/catalog.json, the way the shipped app would read the pipeline output. */
  published?: { dataset: string };
  /** Read from a local-only artifact under data/ (never shipped); see routes/dev-pitch/sceneSources.ts. */
  local?: { dataset: string };
}

// Order follows the 03-UI-SPEC "Scene options" table for the options that exist so far.
export const DEV_SCENES: readonly DevScene[] = [
  { id: "pitch-only", label: "Pitch only", load: () => null, blank: true },
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
    // The published pipeline output, fetched from the catalog. reconstruction.json stays as the
    // schema fixture the tests check; the page no longer imports it.
    id: "reconstruction",
    label: "Reconstruction · Wyscout PL 2017/18",
    load: () => null,
    published: { dataset: "wyscout" },
  },
  {
    id: "stress",
    label: "Stress · 22 players",
    load: () => import("./stress.ts").then((m) => m.makeStressScene()),
  },
  {
    id: "empty",
    label: "Empty scene",
    load: () => import("./empty.json").then((m) => m.default),
  },
  {
    // Deliberately broken: lives in invalid/ so the valid-fixture tests never see it.
    id: "invalid",
    label: "Invalid scene",
    load: () => import("./invalid/frames-out-of-order.json").then((m) => m.default),
  },
];

/** The scene shown when ?scene= names nothing known. */
export const FALLBACK_SCENE_ID = "glyph-sheet";

export function findDevScene(id: string | null | undefined): DevScene | undefined {
  return DEV_SCENES.find((s) => s.id === id);
}
