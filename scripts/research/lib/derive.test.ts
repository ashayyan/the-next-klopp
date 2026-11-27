import { describe, expect, it } from "vitest";
import { deriveLinks, toJson } from "./derive.ts";
import type { Competency, Concept, Edge, Role } from "./research-io.ts";

function concept(id: string, over: Partial<Concept> = {}): Concept {
  return {
    id,
    title: id,
    track: "t01-the-game",
    part: "A",
    summary: `${id} summary`,
    prerequisites: [],
    roles: [],
    competencies: [],
    sources: ["src-a"],
    status: "draft",
    ...over,
  };
}

function competency(id: string, concepts: string[] = []): Competency {
  return {
    id,
    title: id,
    domain: "tactics",
    levels: [1, 2, 3, 4].map((level) => ({ level, descriptor: `${id} level ${level}` })),
    concepts,
  };
}

function role(id: string, competencies: string[]): Role {
  return {
    id,
    title: id,
    summary: `${id} summary`,
    competencies: competencies.map((k) => ({ id: k, target_level: 2 })),
    sources: ["src-a"],
  };
}

const roles: Role[] = [
  role("head-coach", ["match-reading", "game-planning"]),
  role("first-team-analyst", ["match-reading"]),
  role("chief-scout", ["scouting-reports"]),
];
const competencies: Competency[] = [
  competency("match-reading", ["stale-id"]),
  competency("game-planning"),
  competency("scouting-reports"),
];
const related: Edge = { from: "pitch-markings", to: "formation-notation", kind: "related" };
const contrasts: Edge = { from: "offside-offence", to: "pitch-markings", kind: "contrasts" };
const map = {
  concepts: [
    concept("offside-offence", {
      prerequisites: ["offside-position"],
      competencies: ["match-reading"],
    }),
    concept("watch-one-player", {
      track: "t04-watch-gym",
      prerequisites: ["offside-position"],
      competencies: ["scouting-reports"],
    }),
    concept("offside-position", { prerequisites: ["pitch-markings"] }),
    concept("pitch-markings", { competencies: ["game-planning", "match-reading"] }),
    concept("formation-notation", { prerequisites: ["pitch-markings"] }),
    concept("how-the-app-works", { track: "t00-start-here" }),
  ],
  edges: [
    related,
    contrasts,
    related,
    { from: "nothing", to: "stale", kind: "prerequisite" as const },
  ],
};

describe("deriveLinks", () => {
  const out = deriveLinks(map, competencies, roles);
  const byId = new Map(out.conceptMap.concepts.map((c) => [c.id, c]));

  it("is idempotent: deriving its own output gives byte-equal JSON", () => {
    const again = deriveLinks(out.conceptMap, out.competencies, roles);
    expect(toJson(again.conceptMap)).toBe(toJson(out.conceptMap));
    expect(toJson(again.competencies)).toBe(toJson(out.competencies));
  });

  it("does not mutate its inputs", () => {
    const before = JSON.stringify([map, competencies, roles]);
    deriveLinks(map, competencies, roles);
    expect(JSON.stringify([map, competencies, roles])).toBe(before);
  });

  it("sorts concepts by track number then id", () => {
    expect(out.conceptMap.concepts.map((c) => c.id)).toEqual([
      "how-the-app-works",
      "formation-notation",
      "offside-offence",
      "offside-position",
      "pitch-markings",
      "watch-one-player",
    ]);
  });

  it("puts a concept into the concepts list of every competency it lists", () => {
    const k = new Map(out.competencies.map((c) => [c.id, c.concepts]));
    expect(k.get("match-reading")).toEqual(["offside-offence", "pitch-markings"]);
    expect(k.get("game-planning")).toEqual(["pitch-markings"]);
    expect(k.get("scouting-reports")).toEqual(["watch-one-player"]);
  });

  it("drops stale competency.concepts entries that no concept supports", () => {
    const k = out.competencies.find((c) => c.id === "match-reading");
    expect(k?.concepts).not.toContain("stale-id");
  });

  it("gives a concept every role that requires one of its competencies", () => {
    expect(byId.get("pitch-markings")?.roles).toEqual(["first-team-analyst", "head-coach"]);
    expect(byId.get("offside-offence")?.roles).toEqual(["first-team-analyst", "head-coach"]);
    expect(byId.get("watch-one-player")?.roles).toEqual(["chief-scout"]);
  });

  it("gives a concept with no competencies an empty roles list", () => {
    expect(byId.get("how-the-app-works")?.roles).toEqual([]);
    expect(byId.get("offside-position")?.roles).toEqual([]);
  });

  it("generates one prerequisite edge per prerequisite pair and drops stale ones", () => {
    const pre = out.conceptMap.edges.filter((e) => e.kind === "prerequisite");
    expect(pre).toEqual([
      { from: "offside-position", to: "offside-offence", kind: "prerequisite" },
      { from: "offside-position", to: "watch-one-player", kind: "prerequisite" },
      { from: "pitch-markings", to: "formation-notation", kind: "prerequisite" },
      { from: "pitch-markings", to: "offside-position", kind: "prerequisite" },
    ]);
  });

  it("keeps authored related and contrasts edges once each, ahead of prerequisite edges", () => {
    expect(out.conceptMap.edges.slice(0, 2)).toEqual([contrasts, related]);
  });

  it("removing a prerequisite removes its edge and leaves related and contrasts untouched", () => {
    const edited = {
      concepts: out.conceptMap.concepts.map((c) =>
        c.id === "watch-one-player" ? { ...c, prerequisites: [] } : c,
      ),
      edges: out.conceptMap.edges,
    };
    const after = deriveLinks(edited, out.competencies, roles).conceptMap.edges;
    expect(after).not.toContainEqual({
      from: "offside-position",
      to: "watch-one-player",
      kind: "prerequisite",
    });
    expect(after.filter((e) => e.kind !== "prerequisite")).toEqual([contrasts, related]);
    expect(after.filter((e) => e.kind === "prerequisite")).toHaveLength(3);
  });
});
