import { describe, expect, it } from "vitest";
import {
  ancestors,
  checkGraph,
  cycles,
  descendants,
  type GraphConcept,
  layers,
  studyOrder,
} from "./graph.ts";

const node = (id: string, prerequisites: string[] = [], track = "t01-the-game"): GraphConcept => ({
  id,
  track,
  prerequisites,
});

const prereqsOf = (cs: GraphConcept[]) => new Map(cs.map((c) => [c.id, c.prerequisites]));

describe("layers", () => {
  it("puts a concept one layer after its deepest prerequisite", () => {
    const { layer, cycle } = layers(
      prereqsOf([node("a"), node("b", ["a"]), node("c", ["a"]), node("d", ["b", "c"])]),
    );
    expect([...layer]).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 1],
      ["d", 2],
    ]);
    expect(cycle).toEqual([]);
  });

  it("leaves concepts on or behind a cycle unlayered", () => {
    const { layer, cycle } = layers(
      prereqsOf([node("root"), node("a", ["root", "c"]), node("b", ["a"]), node("c", ["b"])]),
    );
    expect([...layer.keys()]).toEqual(["root"]);
    expect(cycle.sort()).toEqual(["a", "b", "c"]);
  });
});

describe("checkGraph", () => {
  it("accepts a clean graph", () => {
    const res = checkGraph([node("a"), node("b", ["a"])]);
    expect(res.errors).toEqual([]);
    expect(res.warnings).toEqual([]);
  });

  it("reports a 3-cycle with all three members and not the concept hanging off it", () => {
    const res = checkGraph([
      node("root"),
      node("a", ["root", "c"]),
      node("b", ["a"]),
      node("c", ["b"]),
      node("tail", ["c"]),
    ]);
    const line = res.errors.find((e) => e.startsWith("prerequisite cycle"));
    expect(line).toBeDefined();
    for (const id of ["a", "b", "c"]) expect(line).toContain(id);
    expect(line).not.toContain("tail");
    expect(line).not.toContain("root");
  });

  it("reports a self-loop with the concept id", () => {
    const res = checkGraph([node("root"), node("loop", ["root", "loop"])]);
    expect(res.errors.some((e) => e.startsWith("self-loop") && e.includes("loop"))).toBe(true);
  });

  it("reports a prerequisite that is not a concept", () => {
    const res = checkGraph([node("a", ["ghost"]), node("b")]);
    expect(res.errors).toContain("dangling prerequisite: a -> ghost");
  });

  it("reports a duplicate concept id", () => {
    const res = checkGraph([node("a"), node("a")]);
    expect(res.errors).toContain("duplicate concept id: a");
  });

  it("reports a map with no root", () => {
    const res = checkGraph([node("a", ["b"]), node("b", ["a"])]);
    expect(res.errors.some((e) => e.startsWith("no root"))).toBe(true);
  });

  it("reports a concept id that is also a track id", () => {
    const res = checkGraph([node("t01-the-game")]);
    expect(res.errors).toContain("concept id is also a track id: t01-the-game");
  });

  it("warns above 4 prerequisites and above 14 layers but does not fail", () => {
    const wide = [
      node("p1"),
      node("p2"),
      node("p3"),
      node("p4"),
      node("p5"),
      node("hub", ["p1", "p2", "p3", "p4", "p5"]),
    ];
    const wideRes = checkGraph(wide);
    expect(wideRes.errors).toEqual([]);
    expect(wideRes.warnings.some((w) => w.includes("hub") && w.includes("5 prerequisites"))).toBe(
      true,
    );

    const chain = Array.from({ length: 15 }, (_, i) => node(`n${i}`, i === 0 ? [] : [`n${i - 1}`]));
    const chainRes = checkGraph(chain);
    expect(chainRes.errors).toEqual([]);
    expect(chainRes.warnings.some((w) => w.includes("15 layers"))).toBe(true);
    expect(checkGraph(chain.slice(0, 14)).warnings).toEqual([]);
  });
});

describe("cycles", () => {
  it("returns each strongly connected group once, members sorted", () => {
    expect(
      cycles(prereqsOf([node("a", ["b"]), node("b", ["a"]), node("c", ["a"]), node("d")])),
    ).toEqual([["a", "b"]]);
  });
});

describe("studyOrder", () => {
  const concepts = [
    node("a1", [], "t05-attacking-play"),
    node("a2", [], "t01-the-game"),
    node("a3", [], "t04-watch-gym"),
    node("b1", ["a1"], "t01-the-game"),
    node("b2", ["a2", "a3"], "t14-write-and-speak"),
    node("c1", ["b1", "b2"], "t00-start-here"),
  ];

  it("puts every concept after all of its prerequisites", () => {
    const { order } = studyOrder(concepts, {});
    for (const c of concepts) {
      for (const p of c.prerequisites) {
        expect(order.indexOf(p)).toBeLessThan(order.indexOf(c.id));
      }
    }
    expect(order).toHaveLength(concepts.length);
  });

  it("breaks ties inside a layer by thread starter, then track number, then id", () => {
    const plain = studyOrder(concepts, {}).order.slice(0, 3);
    expect(plain).toEqual(["a2", "a3", "a1"]);
    const boosted = studyOrder(concepts, { threadStarters: ["a1"] }).order.slice(0, 3);
    expect(boosted).toEqual(["a1", "a2", "a3"]);
    const sameTrack = studyOrder([node("z"), node("m"), node("b")], {}).order;
    expect(sameTrack).toEqual(["b", "m", "z"]);
  });

  it("gives the same order for any input order and reports stages", () => {
    const first = studyOrder(concepts, { threadStarters: ["a3"] });
    const second = studyOrder([...concepts].reverse(), { threadStarters: ["a3"] });
    expect(second.order).toEqual(first.order);
    expect(first.stage.get("a1")).toBe(0);
    expect(first.stage.get("c1")).toBe(2);
  });

  it("leaves cyclic concepts out of the order and names them", () => {
    const res = studyOrder([node("r"), node("a", ["b"]), node("b", ["a"])], {});
    expect(res.order).toEqual(["r"]);
    expect(res.cycle).toEqual(["a", "b"]);
  });
});

describe("ancestors and descendants", () => {
  const p = prereqsOf([node("a"), node("b", ["a"]), node("c", ["b"]), node("d", ["c"])]);

  it("walks prerequisites with distances up to a depth", () => {
    expect([...ancestors(p, "d", 2)]).toEqual([
      ["c", 1],
      ["b", 2],
    ]);
    expect(ancestors(p, "d").size).toBe(3);
  });

  it("walks unlocks with distances up to a depth", () => {
    expect([...descendants(p, "a", 1)]).toEqual([["b", 1]]);
    expect(descendants(p, "a").size).toBe(3);
  });
});
