// Vite plugin for `virtual:tnk-lessons`: reads every lesson.json at build time and emits the
// lessons this build includes plus one lazy MDX loader each (05-RESEARCH Pattern 1).
// A lesson that is not emitted has no dynamic import, so it never becomes a chunk.
// It also emits the curriculum facts the app needs (track list, cited registry slice, concept
// summaries, study order, What's new, build date), so the app never bundles the research files.
// Erasable TypeScript only.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { Plugin } from "vite";
import {
  type LessonSpec,
  lessonSchema,
  type WhatsNew,
  whatsNewSchema,
} from "../../../src/schemas/lesson.ts";
import {
  type AliasesLike,
  buildConceptSummaries,
  buildCurriculum,
  buildSourcesSlice,
  type ConceptMapLike,
  type Curriculum,
  type RegistryEntryLike,
  type SourceSummary,
  studyOrder,
} from "./curriculum.ts";
import { type SelectMode, selectLessons } from "./select.ts";

export const VIRTUAL_ID = "virtual:tnk-lessons";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

/** Validator test material (05-03): never discovered as a lesson. */
const INVALID_FIXTURES = "invalid";

export interface DiscoveredLesson {
  /** The parsed, schema-valid lesson.json (lesson spec v1). */
  spec: LessonSpec;
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

/** The first schema issue as `<json-pointer>: <message>`, e.g. `/steps/0/stage: Invalid option…`. */
export function firstIssue(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): string {
  const issue = issues[0];
  if (!issue) return "invalid lesson spec";
  const pointer = issue.path.map((p) => `/${String(p)}`).join("") || "/";
  return `${pointer}: ${issue.message}`;
}

function readLesson(root: string, segments: string[], fixture: boolean): DiscoveredLesson | null {
  const file = join(root, ...segments, "lesson.json");
  if (!existsSync(file)) return null;
  const dir = `/${segments.join("/")}`;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${dir}/lesson.json: not valid JSON (${(error as Error).message})`);
  }
  // A lesson that breaks spec v1 stops the build and the dev server (threat T-05-16).
  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${dir}/lesson.json: ${firstIssue(parsed.error.issues)}`);
  }
  return { spec: parsed.data, fixture, dir };
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

/** Root-relative data files the module reads besides the lessons; editing one rebuilds it in dev. */
export const DATA_FILES: readonly string[] = [
  "research/concept-map.json",
  "research/SOURCE_REGISTRY.json",
  "research/SOURCE_ALIASES.json",
  "content/whats-new.json",
];

/** Everything the module exports besides `lessons` and `loaders`. */
export interface ModuleData {
  curriculum: Curriculum;
  sources: Record<string, SourceSummary>;
  conceptSummaries: Record<string, string>;
  order: string[];
  whatsNew: WhatsNew;
  buildDate: string;
}

/** The research and What's new files, read once per build (and again after a dev edit). */
export interface DataFiles {
  conceptMap: ConceptMapLike;
  registry: RegistryEntryLike[];
  aliases: AliasesLike;
  whatsNew: WhatsNew;
}

function readJsonFile(root: string, rel: string): unknown {
  try {
    return JSON.parse(readFileSync(join(root, ...rel.split("/")), "utf8"));
  } catch (error) {
    throw new Error(`/${rel}: not readable JSON (${(error as Error).message})`);
  }
}

/** Reads {@link DATA_FILES}; content/whats-new.json must pass `whatsNewSchema` or the build stops. */
export function readDataFiles(root: string): DataFiles {
  const whatsNew = whatsNewSchema.safeParse(readJsonFile(root, "content/whats-new.json"));
  if (!whatsNew.success) {
    throw new Error(`/content/whats-new.json: ${firstIssue(whatsNew.error.issues)}`);
  }
  return {
    conceptMap: readJsonFile(root, "research/concept-map.json") as ConceptMapLike,
    registry: readJsonFile(root, "research/SOURCE_REGISTRY.json") as RegistryEntryLike[],
    aliases: readJsonFile(root, "research/SOURCE_ALIASES.json") as AliasesLike,
    whatsNew: whatsNew.data,
  };
}

/** Local calendar date as YYYY-MM-DD. */
export function localDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The curriculum facts for the included lessons only (threat T-05-17). */
export function buildModuleData(
  files: DataFiles,
  included: readonly DiscoveredLesson[],
  buildDate: string,
): ModuleData {
  const specs = included.map((l) => l.spec);
  return {
    curriculum: buildCurriculum(files.conceptMap),
    sources: buildSourcesSlice(
      files.registry,
      files.aliases,
      specs.flatMap((s) => s.sources),
    ),
    conceptSummaries: buildConceptSummaries(files.conceptMap, specs),
    order: studyOrder(files.conceptMap, specs),
    whatsNew: files.whatsNew,
    buildDate,
  };
}

/**
 * The module source. Every id is root-relative and written with JSON.stringify, never an absolute
 * path or string-built code (05-RESEARCH Pitfall 11, ADR 0006).
 */
export function renderModule(included: readonly DiscoveredLesson[], data: ModuleData): string {
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
    `export const curriculum = ${JSON.stringify(data.curriculum)};`,
    `export const sources = ${JSON.stringify(data.sources)};`,
    `export const conceptSummaries = ${JSON.stringify(data.conceptSummaries)};`,
    `export const order = ${JSON.stringify(data.order)};`,
    `export const whatsNew = ${JSON.stringify(data.whatsNew)};`,
    `export const buildDate = ${JSON.stringify(data.buildDate)};`,
    "",
  ].join("\n");
}

/** True for one of {@link DATA_FILES}. */
export function isDataFile(root: string, file: string): boolean {
  const rel = relative(root, file).replaceAll("\\", "/");
  return DATA_FILES.includes(rel);
}

// True for a `lesson.json` or `lesson.mdx` anywhere under content/, the files the module reads.
export function isLessonFile(root: string, file: string): boolean {
  const rel = relative(root, file).replaceAll("\\", "/");
  return /^content\/.+\/lesson\.(json|mdx)$/.test(rel);
}

export function lessonsPlugin(): Plugin {
  let root = process.cwd();
  let mode: SelectMode = { command: "build", includeFixtures: false, test: false };
  let files: DataFiles | null = null;
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
      // Adding, editing or deleting a lesson or a data file changes the module: rebuild and reload.
      server.watcher.add(DATA_FILES.map((rel) => join(root, ...rel.split("/"))));
      const refresh = (file: string) => {
        const data = isDataFile(root, file);
        if (!data && !isLessonFile(root, file)) return;
        if (data) files = null;
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
      const included = selectLessons(discoverLessons(root), mode);
      files ??= readDataFiles(root);
      return renderModule(included, buildModuleData(files, included, localDate()));
    },
  };
}
