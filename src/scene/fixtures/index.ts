// Fixed dev scene registry for /dev/pitch. The ?scene= query value is only ever looked up here by
// id (findDevScene); it is never used as a path or an import specifier, so a crafted URL cannot
// load anything that is not listed below.

export interface DevScene {
  id: string;
  label: string;
  /** Resolves to the raw scene JSON, or null for the pitch-only option. */
  load: () => Promise<unknown> | null;
}

export const DEV_SCENES: readonly DevScene[] = [
  { id: "pitch-only", label: "Pitch only", load: () => null },
  {
    id: "board",
    label: "Saved board (drag spike)",
    load: () => import("./board.json").then((m) => m.default),
  },
];

export function findDevScene(id: string | null | undefined): DevScene | undefined {
  return DEV_SCENES.find((s) => s.id === id);
}
