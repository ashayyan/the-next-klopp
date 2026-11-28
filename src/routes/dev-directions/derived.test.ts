import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Scene } from "../../scene/schema.ts";
import { parseScene } from "../../scene/validate.ts";
import { deriveGoal, formatMetres } from "./derived.ts";

/** The published scene named in public/data/catalog.json, read the way the build ships it. */
function publishedGoal(): Scene {
  const root = resolve(import.meta.dirname, "../../..");
  const catalog = JSON.parse(readFileSync(resolve(root, "public/data/catalog.json"), "utf8")) as {
    datasets: { dataset: string; scenes: { path: string }[] }[];
  };
  const path = catalog.datasets.find((d) => d.dataset === "wyscout")?.scenes[0]?.path;
  if (!path) throw new Error("no wyscout scene in the catalog");
  const parsed = parseScene(JSON.parse(readFileSync(resolve(root, "public/data", path), "utf8")));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.scene;
}

describe("deriveGoal on the published Sané goal", () => {
  const goal = deriveGoal(publishedGoal());

  it("lists the ten actions with times, players, receivers and actions", () => {
    expect(goal.rows.map((r) => r.t.toFixed(1))).toEqual([
      "0.0",
      "1.3",
      "3.7",
      "5.3",
      "7.7",
      "9.7",
      "11.5",
      "14.4",
      "16.0",
      "18.4",
    ]);
    expect(goal.rows.map((r) => (r.receiver ? `${r.who} to ${r.receiver}` : r.who))).toEqual([
      "Mangala to Danilo",
      "Danilo to Mangala",
      "Mangala to Stones",
      "Stones to Walker",
      "Walker to Mangala",
      "Mangala to De Bruyne",
      "De Bruyne to Sané",
      "Sané to Mendy",
      "Mendy to Sané",
      "Sané",
    ]);
    expect(goal.rows.map((r) => r.action)).toEqual([...Array(9).fill("Pass"), "Shot, goal"]);
    expect(goal.rows.map((r) => r.approximate)).toEqual([...Array(9).fill(false), true]);
  });

  it("computes metres forward for every action", () => {
    expect(goal.rows.map((r) => formatMetres(r.metres))).toEqual([
      "+14.4",
      "−15.3",
      "−4.9",
      "+4.9",
      "−1.0",
      "+31.5",
      "+12.9",
      "+12.8",
      "+4.1",
      "+5.5",
    ]);
  });

  it("gives 18.4 s first pass to shot, 59.3 m upfield and 7 players on the ball", () => {
    expect(goal.firstToShotSec).toBe(18.4);
    expect(goal.upfieldMetres).toBe(59.3);
    expect(goal.playersOnBall).toBe(7);
  });
});

describe("formatMetres", () => {
  it("writes a plus sign, a U+2212 minus and one decimal", () => {
    expect(formatMetres(31.49)).toBe("+31.5");
    expect(formatMetres(-15.34)).toBe("−15.3");
    expect(formatMetres(0)).toBe("0.0");
  });
});
