// Vite plugin for `virtual:tnk-lessons`: reads every lesson.json at build time and emits the
// lessons this build includes plus one lazy MDX loader each (05-RESEARCH Pattern 1).
// A lesson that is not emitted has no dynamic import, so it never becomes a chunk.
// Erasable TypeScript only.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { Plugin } from "vite";
import { type SelectMode, selectLessons } from "./select.ts";

export const VIRTUAL_ID = "virtual:tnk-lessons";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

/** Validator test material (05-03): never discovered as a lesson. */
const INVALID_FIXTURES = "invalid";

export interface DiscoveredLesson {
  spec: { id: string; status: string; [key: string]: unknown };
  fixture: boolean;
  /** Root-relative folder with forward slashes, e.g. `/content/_fixtures/fx-a-goal-in-ten-actions`. */
  dir: string;
}

function subdirs(abs: string): string[] {
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function readLesson(root: string, segments: string[], fixture: boolean): DiscoveredLesson | null {
  const file = join(root, ...segments, "lesson.json");
  if (!existsSync(file)) return null;
  const dir = `/${segments.join("/")}`;
  let spec: DiscoveredLesson["spec"];
  try {
    spec = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${dir}/lesson.json: not valid JSON (${(error as Error).message})`);
  }
  return { spec, fixture, dir };
}

/**
 * Finds `content/tracks/<track>/<chapter>/<lesson>/lesson.json` and
 * `content/_fixtures/<lesson>/lesson.json` under the Vite root, in a stable order.
 */
export function discoverLessons(root: string): DiscoveredLesson[] {
  const found: DiscoveredLesson[] = [];
  const tracks = join(root, "content", "tracks");
  for (const track of subdirs(tracks)) {
    for (const chapter of subdirs(join(tracks, track))) {
      for (const lesson of subdirs(join(tracks, track, chapter))) {
        const entry = readLesson(root, ["content", "tracks", track, chapter, lesson], false);
        if (entry) found.push(entry);
      }
    }
  }
  const fixtures = join(root, "content", "_fixtures");
  for (const lesson of subdirs(fixtures)) {
    if (lesson === INVALID_FIXTURES) continue;
    const entry = readLesson(root, ["content", "_fixtures", lesson], true);
    if (entry) found.push(entry);
  }
  return found;
}

/**
 * The module source. Every id is root-relative and written with JSON.stringify, never an absolute
 * path or string-built code (05-RESEARCH Pitfall 11, ADR 0006).
 */
export function renderModule(included: DiscoveredLesson[]): string {
  const lessons = included.map((l) => ({ ...l.spec, fixture: l.fixture, dir: l.dir }));
  const loaders = included
    .map(
      (l) =>
        `  ${JSON.stringify(l.spec.id)}: () => import(${JSON.stringify(`${l.dir}/lesson.mdx`)}),`,
    )
    .join("\n");
  return [
    `export const lessons = ${JSON.stringify(lessons)};`,
    `export const loaders = {\n${loaders}\n};`,
    "",
  ].join("\n");
}

// True for a `lesson.json` or `lesson.mdx` anywhere under content/, the files the module reads.
export function isLessonFile(root: string, file: string): boolean {
  const rel = relative(root, file).replaceAll("\\", "/");
  return /^content\/.+\/lesson\.(json|mdx)$/.test(rel);
}

export function lessonsPlugin(): Plugin {
  let root = process.cwd();
  let mode: SelectMode = { command: "build", includeFixtures: false, test: false };
  return {
    name: "tnk-lessons",
    configResolved(config) {
      root = config.root;
      mode = {
        command: config.command,
        includeFixtures: process.env.VITE_INCLUDE_FIXTURES === "1",
        test: config.mode === "test",
      };
    },
    configureServer(server) {
      // Adding, editing or deleting a lesson changes what the module lists: rebuild it and reload.
      const refresh = (file: string) => {
        if (!isLessonFile(root, file)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("add", refresh);
      server.watcher.on("change", refresh);
      server.watcher.on("unlink", refresh);
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      // Selection happens here, at build time: an excluded lesson gets no dynamic import, so no chunk.
      return renderModule(selectLessons(discoverLessons(root), mode));
    },
  };
}
