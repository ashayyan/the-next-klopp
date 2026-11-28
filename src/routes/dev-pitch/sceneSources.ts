// Where /dev/pitch gets its scenes, and what state each load ends in. Three sources:
//   - bundled fixtures (a dynamic import of a JSON file under src/scene/fixtures);
//   - the published pipeline artifact, fetched exactly as a browser would, through
//     /data/catalog.json, so the page proves the whole path from Python to pixels;
//   - the local-only StatsBomb artifact under data/statsbomb/, read through import.meta.glob.
//     This module is only reachable from the dev-only route chunk, so that glob can never put a
//     StatsBomb file into the study or Vercel build (scripts/check-bundle.ts still enforces it).
import { z } from "zod";
import type { DevScene } from "../../scene/fixtures/index.ts";
import type { Scene } from "../../scene/schema.ts";
import { parseScene, type SceneIssue } from "../../scene/validate.ts";

export type LoadResult =
  | { status: "none" }
  | { status: "ready"; scene: Scene; localOnly: boolean }
  | { status: "empty"; scene: Scene; localOnly: boolean }
  | { status: "invalid"; issues: SceneIssue[] }
  | { status: "missing-local" }
  | { status: "error"; message: string };

export type FetchLike = (input: string) => Promise<Response>;

/** Lazy loaders for the local-only StatsBomb scenes, keyed by project-root path. */
export type LocalGlob = Record<string, () => Promise<unknown>>;

// Vite replaces import.meta.glob at build time. Nothing in the repo matches in a clean checkout
// (data/statsbomb/ is git-ignored), so the object is empty until `npm run data` has run here.
// The manifests are globbed beside the scenes: they carry `generatedAt`, which orders versions.
export const LOCAL_STATSBOMB: LocalGlob = import.meta.glob(
  ["/data/statsbomb/*/scene-*.json", "/data/statsbomb/*/manifest.json"],
  { import: "default" },
);

const LOCAL_SCENE = /\/scene-[^/]+\.json$/;

const CATALOG_PATH = "/data/catalog.json";

const catalogSchema = z.object({
  datasets: z.array(
    z.object({
      dataset: z.string(),
      version: z.string().optional(),
      // The manifest's generation time. Version ids are content hashes, so only this orders them.
      generatedAt: z.string().optional(),
      scenes: z.array(z.object({ id: z.string(), label: z.string(), path: z.string() })),
    }),
  ),
});

/** A load failure that already carries a plain-English message. */
class SourceError extends Error {}

/**
 * Fetch one JSON file. A missing file under Vite's dev server (or any SPA host) answers 200 with
 * the app's HTML page, so the content type is checked before the body is parsed.
 */
async function fetchJson(fetchImpl: FetchLike, path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(path);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new SourceError(`Could not fetch ${path}: ${reason}.`);
  }
  if (!response.ok) {
    throw new SourceError(`${path} answered ${response.status}. Is the file in public/data?`);
  }
  const type = response.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("json")) {
    throw new SourceError(
      `${path} did not return JSON (content type “${type || "none"}”). The file is probably missing.`,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new SourceError(`${path} returned JSON that could not be read.`);
  }
}

async function loadPublished(entry: DevScene, fetchImpl: FetchLike): Promise<unknown> {
  const dataset = entry.published?.dataset ?? "";
  const rawCatalog = await fetchJson(fetchImpl, CATALOG_PATH);
  const catalog = catalogSchema.safeParse(rawCatalog);
  if (!catalog.success) {
    throw new SourceError(`${CATALOG_PATH} is not a data catalog.`);
  }
  // Versions are add-only and their ids are content hashes, so "newest" is the latest generatedAt.
  const found = newestBy(
    catalog.data.datasets.filter((d) => d.dataset === dataset),
    (d) => d.generatedAt,
    (d) => d.version,
  );
  const scene = found?.scenes[0];
  if (!scene) {
    throw new SourceError(`${CATALOG_PATH} lists no “${dataset}” scene. Run npm run data.`);
  }
  return fetchJson(fetchImpl, `/data/${scene.path}`);
}

/**
 * The newest item by timestamp. Items without one rank oldest; a tie falls back to the tie-break
 * string, so the result never depends on input order.
 */
function newestBy<T>(
  items: readonly T[],
  stamp: (item: T) => string | undefined,
  tieBreak: (item: T) => string | undefined,
): T | undefined {
  let best: T | undefined;
  for (const item of items) {
    if (best === undefined) {
      best = item;
      continue;
    }
    const stampA = stamp(item) ?? "";
    const stampB = stamp(best) ?? "";
    const newer =
      stampA === stampB ? (tieBreak(item) ?? "") > (tieBreak(best) ?? "") : stampA > stampB;
    if (newer) best = item;
  }
  return best;
}

async function manifestStamp(glob: LocalGlob, sceneKey: string): Promise<string | undefined> {
  const load = glob[sceneKey.replace(LOCAL_SCENE, "/manifest.json")];
  if (!load) return undefined;
  const manifest = await load();
  const parsed = z.object({ generatedAt: z.string() }).safeParse(manifest);
  return parsed.success ? parsed.data.generatedAt : undefined;
}

/** The newest local version, ordered by its manifest's generatedAt (path order breaks ties). */
async function newestLocal(glob: LocalGlob): Promise<(() => Promise<unknown>) | undefined> {
  const keys = Object.keys(glob).filter((k) => LOCAL_SCENE.test(k));
  const stamped = await Promise.all(
    keys.map(async (key) => ({ key, at: await manifestStamp(glob, key) })),
  );
  const best = newestBy(
    stamped,
    (e) => e.at,
    (e) => e.key,
  );
  return best === undefined ? undefined : glob[best.key];
}

function classify(raw: unknown): LoadResult {
  const parsed = parseScene(raw);
  if (!parsed.ok) return { status: "invalid", issues: parsed.issues };
  const { scene } = parsed;
  const localOnly = scene.source.localOnly === true;
  const empty =
    scene.entities.length === 0 && scene.events.length === 0 && scene.annotations.length === 0;
  return { status: empty ? "empty" : "ready", scene, localOnly };
}

/**
 * Load one registry entry. Never throws: every failure is a LoadResult the page can draw.
 * `fetchImpl` and `localGlob` are injected so tests need neither a network nor local data.
 */
export async function loadDevScene(
  entry: DevScene,
  fetchImpl: FetchLike = (input) => fetch(input),
  localGlob: LocalGlob = LOCAL_STATSBOMB,
): Promise<LoadResult> {
  try {
    if (entry.published) return classify(await loadPublished(entry, fetchImpl));
    if (entry.local) {
      const loader = await newestLocal(localGlob);
      return loader ? classify(await loader()) : { status: "missing-local" };
    }
    const pending = entry.load();
    return pending ? classify(await pending) : { status: "none" };
  } catch (cause) {
    if (cause instanceof SourceError) return { status: "error", message: cause.message };
    const reason = cause instanceof Error ? cause.message : String(cause);
    return { status: "error", message: `Could not load “${entry.id}”: ${reason}.` };
  }
}

/** True when a local-only StatsBomb scene exists on this machine. */
export function hasLocalStatsbomb(localGlob: LocalGlob = LOCAL_STATSBOMB): boolean {
  return Object.keys(localGlob).some((k) => LOCAL_SCENE.test(k));
}

/** The label shown in the Scene select: the local-only option says when its file is absent. */
export function sceneOptionLabel(entry: DevScene, localPresent: boolean): string {
  return entry.local && !localPresent ? `${entry.label} (not on this machine)` : entry.label;
}

/** The first `max` issues for the error panel, and how many were left out. */
export function toPanelIssues(
  issues: readonly SceneIssue[],
  max = 5,
): { shown: SceneIssue[]; more: number } {
  return { shown: issues.slice(0, max), more: Math.max(0, issues.length - max) };
}
