// File I/O for the content validator: reads every lesson once (parse, spec, steps) and the shared
// inputs the rules need. Rules stay pure; only this module and the CLI touch the disk.
// A missing research or catalog file gives an empty input (so `--root <tmp>` works); a missing
// or broken lesson file becomes an issue, never a throw. Erasable TypeScript only.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Root } from "mdast";
import { lessonSchema } from "../../../src/schemas/lesson.ts";
import { DenyManifestSchema } from "../globs.ts";
import type { AliasesLike, ConceptMapLike, RegistryEntryLike } from "./curriculum.ts";
import { parseLesson } from "./parse.ts";
import type { LessonInput, ParseError, RuleContext } from "./rules/index.ts";
import { extractSteps } from "./steps.ts";

/** Validator test material: never part of a normal run (05-03). */
export const INVALID_FIXTURES_DIR = "content/_fixtures/invalid";

function subdirs(abs: string): string[] {
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function abs(root: string, rel: string): string {
  return join(root, ...rel.split("/"));
}

function readText(root: string, rel: string): string | null {
  const file = abs(root, rel);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

function readJson(root: string, rel: string): unknown {
  const text = readText(root, rel);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const EMPTY_ROOT: Root = { type: "root", children: [] };

/** Reads one lesson folder (repo-relative, forward slashes) into a rule input. */
export function loadLesson(root: string, dir: string, fixture: boolean): LessonInput {
  const specPath = `${dir}/lesson.json`;
  const mdxPath = `${dir}/lesson.mdx`;
  const specText = readText(root, specPath) ?? "";
  const mdxSource = readText(root, mdxPath);
  const mdxText = (mdxSource ?? "").replace(/\r\n/g, "\n");

  let spec: LessonInput["spec"] = null;
  try {
    const parsed = lessonSchema.safeParse(JSON.parse(specText));
    if (parsed.success) spec = parsed.data;
  } catch {
    spec = null;
  }

  let tree = EMPTY_ROOT;
  let parseError: ParseError | null = null;
  if (mdxSource === null) {
    parseError = { line: 1, reason: "missing" };
  } else {
    try {
      tree = parseLesson(mdxPath, mdxText);
    } catch (error) {
      // micromark-extension-mdx-jsx puts the place in the reason, e.g. "… `<Step>` (57:1-57:25)".
      const e = error as { line?: number | null; reason?: string; message?: string };
      const raw = e.reason ?? e.message ?? "unreadable MDX";
      const place = /\s*\((\d+):\d+(?:-\d+:\d+)?\)\s*$/.exec(raw);
      parseError = {
        line: e.line ?? (place ? Number(place[1]) : 1),
        reason: place ? raw.slice(0, place.index) : raw,
      };
    }
  }

  return {
    dir,
    specPath,
    mdxPath,
    specText,
    mdxText,
    spec,
    tree,
    parseError,
    steps: extractSteps(tree),
    fixture,
  };
}

/**
 * Lesson folders under the root, in a stable order:
 * `content/tracks/<track>/<chapter>/<lesson>/` and `content/_fixtures/<lesson>/`
 * (never `content/_fixtures/invalid/`). A folder is a lesson when it holds lesson.json.
 */
export function discoverLessonDirs(root: string): { dir: string; fixture: boolean }[] {
  const found: { dir: string; fixture: boolean }[] = [];
  const tracks = "content/tracks";
  for (const track of subdirs(abs(root, tracks))) {
    for (const chapter of subdirs(abs(root, `${tracks}/${track}`))) {
      for (const lesson of subdirs(abs(root, `${tracks}/${track}/${chapter}`))) {
        const dir = `${tracks}/${track}/${chapter}/${lesson}`;
        if (existsSync(abs(root, `${dir}/lesson.json`))) found.push({ dir, fixture: false });
      }
    }
  }
  for (const lesson of subdirs(abs(root, "content/_fixtures"))) {
    const dir = `content/_fixtures/${lesson}`;
    if (dir === INVALID_FIXTURES_DIR) continue;
    if (existsSync(abs(root, `${dir}/lesson.json`))) found.push({ dir, fixture: true });
  }
  return found;
}

function arrayOrEmpty(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** The shared inputs, with `lessons` left empty (tests swap in their own lessons). */
export function loadSharedInputs(root: string): RuleContext {
  const deny = DenyManifestSchema.safeParse(readJson(root, "deploy/deny-manifest.json"));
  const conceptMap = readJson(root, "research/concept-map.json");
  const aliases = readJson(root, "research/SOURCE_ALIASES.json");
  return {
    lessons: [],
    registry: arrayOrEmpty(readJson(root, "research/SOURCE_REGISTRY.json")) as RegistryEntryLike[],
    aliases: (aliases ?? { aliases: {} }) as AliasesLike,
    catalog: readJson(root, "public/data/catalog.json"),
    roles: arrayOrEmpty(readJson(root, "research/roles.json")),
    competencies: arrayOrEmpty(readJson(root, "research/competencies.json")),
    conceptMap: (conceptMap ?? { concepts: [] }) as ConceptMapLike,
    denyManifest: deny.success ? deny.data : null,
    interactions: {},
  };
}

/** Every lesson of the tree plus the shared inputs. */
export function loadContext(root: string): RuleContext {
  const lessons = discoverLessonDirs(root).map((l) => loadLesson(root, l.dir, l.fixture));
  return { ...loadSharedInputs(root), lessons };
}
