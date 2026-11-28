import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { LessonSpec } from "../../../src/schemas/lesson.ts";
import {
  buildModuleData,
  DATA_FILES,
  discoverLessons,
  isDataFile,
  isLessonFile,
  localDate,
  type ModuleData,
  readDataFiles,
  renderModule,
} from "./vite-plugin.ts";

const temps: string[] = [];

afterEach(() => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

/** A throwaway root with a space in its path, like the learner's project folder. */
function root(): string {
  const dir = mkdtempSync(join(tmpdir(), "tnk lessons "));
  temps.push(dir);
  return dir;
}

/** A minimal spec-v1 lesson; overrides replace top-level fields. */
function spec(overrides: Partial<LessonSpec> & Record<string, unknown> = {}): LessonSpec {
  return {
    id: "l-one",
    version: 1,
    title: "T",
    track: "t01-the-game",
    chapter: "part-a",
    concepts: ["scoring-a-goal"],
    prerequisites: [],
    durationMin: 5,
    effort: "low",
    status: "draft",
    author: "test",
    roles: [],
    competencies: [],
    template: "concept",
    steps: [{ id: "hook", stage: "hook", dataRefs: [] }],
    quiz: [],
    sources: [],
    dataRefs: [],
    ...overrides,
  } as LessonSpec;
}

function lesson(base: string, segments: string[], spec: Record<string, unknown>): void {
  const dir = join(base, ...segments);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "lesson.json"), JSON.stringify(spec));
  writeFileSync(join(dir, "lesson.mdx"), "");
}

describe("discoverLessons", () => {
  it("finds track lessons and fixtures, never content/_fixtures/invalid", () => {
    const base = root();
    lesson(base, ["content", "tracks", "t01", "part-a", "l-one"], spec({ id: "l-one" }));
    lesson(base, ["content", "_fixtures", "fx-one"], spec({ id: "fx-one" }));
    lesson(base, ["content", "_fixtures", "invalid", "no-frontmatter"], {
      id: "bad",
      status: "draft",
    });
    mkdirSync(join(base, "content", "_fixtures", "invalid"), { recursive: true });
    writeFileSync(
      join(base, "content", "_fixtures", "invalid", "lesson.json"),
      JSON.stringify({ id: "bad-top", status: "draft" }),
    );

    const found = discoverLessons(base);
    expect(found.map((l) => [l.spec.id, l.fixture, l.dir])).toEqual([
      ["l-one", false, "/content/tracks/t01/part-a/l-one"],
      ["fx-one", true, "/content/_fixtures/fx-one"],
    ]);
  });

  it("returns nothing when content/ is missing", () => {
    expect(discoverLessons(root())).toEqual([]);
  });

  it("names the file when a lesson.json is not JSON", () => {
    const base = root();
    const dir = join(base, "content", "_fixtures", "broken");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "lesson.json"), "{");
    expect(() => discoverLessons(base)).toThrow(/^\/content\/_fixtures\/broken\/lesson\.json/);
  });

  it("stops on a lesson.json that breaks spec v1, naming the file and the first issue", () => {
    const base = root();
    lesson(base, ["content", "_fixtures", "long-title"], spec({ title: "x".repeat(41) }));
    expect(() => discoverLessons(base)).toThrow(
      /^\/content\/_fixtures\/long-title\/lesson\.json: \/title: /,
    );
  });

  it("reports an unknown top-level key", () => {
    const base = root();
    lesson(base, ["content", "_fixtures", "extra"], spec({ summary: "no" }));
    expect(() => discoverLessons(base)).toThrow(
      /^\/content\/_fixtures\/extra\/lesson\.json: \/: .*summary/,
    );
  });
});

const data: ModuleData = {
  curriculum: { tracks: [] },
  sources: {},
  conceptSummaries: {},
  order: [],
  whatsNew: { schemaVersion: 1, entries: [] },
  buildDate: "2026-11-28",
};

describe("renderModule", () => {
  it("writes root-relative ids through JSON.stringify and no absolute path", () => {
    const code = renderModule(
      [{ spec: spec({ id: 'x"y', status: "shipped" }), fixture: false, dir: "/content/a b" }],
      data,
    );
    expect(code).toContain('"x\\"y": () => import("/content/a b/lesson.mdx"),');
    expect(code).toContain('"fixture":false,"dir":"/content/a b"');
    expect(code).not.toMatch(/[A-Za-z]:[\\/]/);
  });

  it("emits empty exports when nothing is included", () => {
    expect(renderModule([], data)).toBe(
      [
        "export const lessons = [];",
        "export const loaders = {\n\n};",
        'export const curriculum = {"tracks":[]};',
        "export const sources = {};",
        "export const conceptSummaries = {};",
        "export const order = [];",
        'export const whatsNew = {"schemaVersion":1,"entries":[]};',
        'export const buildDate = "2026-11-28";',
        "",
      ].join("\n"),
    );
  });
});

describe("readDataFiles", () => {
  it("stops on a What's new file that breaks its schema, naming the file", () => {
    const base = root();
    for (const rel of DATA_FILES) mkdirSync(join(base, rel, ".."), { recursive: true });
    writeFileSync(join(base, "research", "concept-map.json"), '{"concepts":[]}');
    writeFileSync(join(base, "research", "SOURCE_REGISTRY.json"), "[]");
    writeFileSync(join(base, "research", "SOURCE_ALIASES.json"), '{"aliases":{}}');
    writeFileSync(
      join(base, "content", "whats-new.json"),
      JSON.stringify({ schemaVersion: 1, entries: [{ date: "soon" }] }),
    );
    expect(() => readDataFiles(base)).toThrow(/^\/content\/whats-new\.json: \/entries\/0\//);
  });

  it("reads the real repo files and builds data for the fixture only", () => {
    const repo = join(import.meta.dirname, "..", "..", "..");
    const included = discoverLessons(repo).filter((l) => l.fixture);
    const out = buildModuleData(readDataFiles(repo), included, "2026-11-28");
    expect(out.curriculum.tracks).toHaveLength(29);
    expect(out.order).toEqual(included.map((l) => l.spec.id));
    expect(out.conceptSummaries).toHaveProperty("scoring-a-goal");
    expect(out.whatsNew.entries.length).toBeGreaterThanOrEqual(1);
  });
});

describe("isDataFile", () => {
  const base = join(tmpdir(), "tnk root");
  it.each([
    [join(base, "research", "concept-map.json"), true],
    [join(base, "content", "whats-new.json"), true],
    [join(base, "research", "roles.json"), false],
  ])("%s -> %s", (file, expected) => {
    expect(isDataFile(base, file)).toBe(expected);
  });
});

describe("localDate", () => {
  it("formats the local calendar date", () => {
    expect(localDate(new Date(2026, 10, 28, 23, 30))).toBe("2026-11-28");
  });
});

describe("isLessonFile", () => {
  const base = join(tmpdir(), "tnk root");
  it.each([
    [join(base, "content", "_fixtures", "fx", "lesson.json"), true],
    [join(base, "content", "tracks", "t", "c", "l", "lesson.mdx"), true],
    [join(base, "content", "whats-new.json"), false],
    [join(base, "src", "lesson.mdx"), false],
  ])("%s -> %s", (file, expected) => {
    expect(isLessonFile(base, file)).toBe(expected);
  });
});
