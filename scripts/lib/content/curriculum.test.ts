import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TRACKS } from "../../../src/content/tracks.ts";
import { whatsNewSchema } from "../../../src/schemas/lesson.ts";
import {
  buildConceptSummaries,
  buildCurriculum,
  buildSourcesSlice,
  type ConceptMapLike,
  type RegistryEntryLike,
  studyOrder,
  unknownTracks,
} from "./curriculum.ts";
import { renderModule } from "./vite-plugin.ts";

const repo = join(import.meta.dirname, "..", "..", "..");
function readJson<T>(...segments: string[]): T {
  return JSON.parse(readFileSync(join(repo, ...segments), "utf8")) as T;
}

const conceptMap = readJson<ConceptMapLike>("research", "concept-map.json");

describe("TRACKS (src/content/tracks.ts)", () => {
  it("names every track id used in research/concept-map.json", () => {
    expect(unknownTracks(conceptMap)).toEqual([]);
    const ids = new Set(TRACKS.map((t) => t.id));
    for (const c of conceptMap.concepts) expect(ids.has(c.track), c.track).toBe(true);
  });

  it("is re-exported unchanged by scripts/research/lib/domains.ts", async () => {
    const research = await import("../../research/lib/domains.ts");
    expect(research.TRACKS).toBe(TRACKS);
  });
});

describe("buildCurriculum", () => {
  const curriculum = buildCurriculum(conceptMap);

  it("gives 29 tracks in number order with their titles", () => {
    expect(curriculum.tracks).toHaveLength(29);
    expect(curriculum.tracks.map((t) => t.number)).toEqual([...Array(29).keys()]);
    expect(curriculum.tracks[0]).toMatchObject({ id: "t00-start-here", title: "Start here" });
  });

  it("gives t01-the-game one part A with the concept-map count", () => {
    const t01 = curriculum.tracks.find((t) => t.id === "t01-the-game");
    const count = conceptMap.concepts.filter(
      (c) => c.track === "t01-the-game" && c.part === "A",
    ).length;
    expect(count).toBeGreaterThan(0);
    expect(t01?.parts).toEqual([{ letter: "A", chapter: "part-a", conceptCount: count }]);
  });

  it("gives a track with no concepts its own part with a zero count", () => {
    const single = buildCurriculum({ concepts: [] });
    expect(single.tracks[13]?.parts).toEqual([{ letter: "C", chapter: "part-c", conceptCount: 0 }]);
  });

  it("stops on a concept whose track has no title", () => {
    const bad = { concepts: [{ id: "x", track: "t99-unknown", part: "G", summary: "s" }] };
    expect(() => buildCurriculum(bad)).toThrow(/t99-unknown/);
  });
});

const registry: RegistryEntryLike[] = [
  {
    id: "src-a",
    title: "A",
    publisher: "Pub A",
    type: "regulation",
    url: "https://a.example/",
    as_of: "2026-11-27",
    effective_date: "2026-07-01",
    license: { name: "CC BY 4.0" },
    notes: "never shipped",
    excerpts: [{ id: "e", paraphrase: "never shipped" }],
  },
  {
    id: "src-b",
    title: "B",
    publisher: "Pub B",
    type: "article",
    url: "https://b.example/",
    as_of: "2026-11-20",
    license: {},
  },
  {
    id: "src-c",
    title: "C",
    publisher: "Pub C",
    type: "book",
    url: "https://c.example/",
    as_of: "2026-11-20",
    license: { name: "Publisher copyright" },
  },
];

describe("buildSourcesSlice", () => {
  const slice = buildSourcesSlice(registry, { aliases: { "src-old-b": "src-b" } }, [
    "src-a",
    "src-old-b",
    "src-a",
  ]);

  it("returns only the cited ids", () => {
    expect(Object.keys(slice).sort()).toEqual(["src-a", "src-old-b"]);
  });

  it("carries the seven display fields and effective_date when present, nothing else", () => {
    expect(slice["src-a"]).toEqual({
      id: "src-a",
      title: "A",
      publisher: "Pub A",
      type: "regulation",
      licence: "CC BY 4.0",
      url: "https://a.example/",
      as_of: "2026-11-27",
      effective_date: "2026-07-01",
    });
  });

  it("resolves an alias to its target entry and gives a missing licence name as null", () => {
    expect(slice["src-old-b"]).toEqual({
      id: "src-b",
      title: "B",
      publisher: "Pub B",
      type: "article",
      licence: null,
      url: "https://b.example/",
      as_of: "2026-11-20",
    });
  });

  it("leaves out an id the registry does not hold (the validator's citation rule reports it)", () => {
    expect(buildSourcesSlice(registry, { aliases: {} }, ["src-missing"])).toEqual({});
  });
});

const miniMap: ConceptMapLike = {
  concepts: [
    { id: "c-first", track: "t01-the-game", part: "A", summary: "First summary." },
    { id: "c-second", track: "t01-the-game", part: "A", summary: "Second summary." },
    { id: "c-zero", track: "t00-start-here", part: "A", summary: "Zero summary." },
  ],
};

function lesson(id: string, track: string, chapter: string, concepts: string[]) {
  return { id, track, chapter, concepts };
}

describe("buildConceptSummaries", () => {
  it("maps the first concept of every lesson to its summary", () => {
    const out = buildConceptSummaries(miniMap, [
      lesson("l1", "t01-the-game", "part-a", ["c-second", "c-first"]),
      lesson("l2", "t00-start-here", "part-a", ["c-unknown"]),
    ]);
    expect(out).toEqual({ "c-second": "Second summary." });
  });
});

describe("studyOrder", () => {
  it("sorts by track number, chapter letter, first-concept index, then id", () => {
    const order = studyOrder(miniMap, [
      lesson("l-b", "t01-the-game", "part-b", ["c-first"]),
      lesson("l-second", "t01-the-game", "part-a", ["c-second"]),
      lesson("l-first-z", "t01-the-game", "part-a", ["c-first"]),
      lesson("l-first-a", "t01-the-game", "part-a", ["c-first"]),
      lesson("l-zero", "t00-start-here", "part-a", ["c-zero"]),
      lesson("l-t10", "t10-coaching-and-game-models", "part-b", ["c-zero"]),
    ]);
    expect(order).toEqual(["l-zero", "l-first-a", "l-first-z", "l-second", "l-b", "l-t10"]);
  });
});

describe("content/whats-new.json", () => {
  it("validates and holds the seed entry", () => {
    const parsed = whatsNewSchema.parse(readJson("content", "whats-new.json"));
    expect(parsed.entries.at(-1)).toMatchObject({
      date: "2026-11-28",
      title: "The app is ready for lessons",
      lessonIds: [],
    });
  });
});

describe("renderModule with curriculum data", () => {
  it("emits every export and no absolute filesystem path", () => {
    const code = renderModule([], {
      curriculum: buildCurriculum(conceptMap),
      sources: buildSourcesSlice(registry, { aliases: {} }, ["src-a"]),
      conceptSummaries: {},
      order: [],
      whatsNew: { schemaVersion: 1, entries: [] },
      buildDate: "2026-11-28",
    });
    for (const name of [
      "lessons",
      "loaders",
      "curriculum",
      "sources",
      "conceptSummaries",
      "order",
      "whatsNew",
      "buildDate",
    ]) {
      expect(code).toContain(`export const ${name} = `);
    }
    expect(code).not.toMatch(/[A-Za-z]:[\\/]/);
    expect(code).not.toContain(repo);
    expect(code).not.toContain("never shipped");
  });
});
