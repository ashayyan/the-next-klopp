// ADR 0010 structure and arithmetic test (DSGN-01). Parses the gate, score, evidence and screenshot
// tables of docs/decisions/0010-visual-direction.md, recomputes every weighted total and the winner
// with the 04-UI-SPEC tie-break, so a hand-edited score that no longer adds up fails CI.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ADR = join(import.meta.dirname, "..", "..", "docs", "decisions", "0010-visual-direction.md");
const text = readFileSync(ADR, "utf8");
const lines = text.split(/\r?\n/);

const DIRECTIONS = ["floodlit", "programme", "notebook"] as const;
const CRITERIA: Array<[string, number]> = [
  ["ADHD calm and focus", 20],
  ["Pitch legibility", 20],
  ["Readability at 375", 15],
  ["Visual-first", 15],
  ["Anti-slop and taste", 15],
  ["Colour-blind safety in use", 10],
  ["Premier League feel", 5],
];
const DELEGATION = "picked by Claude under learner delegation; learner may override by asking";

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

// Rows of the first markdown table whose header row matches `header`, separator row skipped.
function tableAfter(header: RegExp): string[][] {
  const start = lines.findIndex((l) => header.test(l.trim()));
  if (start < 0) return [];
  const rows: string[][] = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.trim().startsWith("|")) break;
    rows.push(cells(line));
  }
  return rows;
}

type Gate = { G1: string; G2: string; G3: string };
function gates(): Map<string, Gate> {
  const out = new Map<string, Gate>();
  for (const row of tableAfter(/^\| Direction \|.*\| G1 \| G2 \| G3 \|$/)) {
    const [id, , g1, g2, g3] = row;
    out.set(id.replace(/`/g, ""), { G1: g1, G2: g2, G3: g3 });
  }
  return out;
}

function qualified(): string[] {
  const g = gates();
  return DIRECTIONS.filter((d) => {
    const row = g.get(d);
    return row !== undefined && row.G1 === "pass" && row.G2 === "pass" && row.G3 === "pass";
  });
}

const SCORE_HEADER = /^\| # \| Criterion \| Weight \| floodlit \| programme \| notebook \|$/;

function scoreRows(): string[][] {
  return tableAfter(SCORE_HEADER);
}

function scores(): Map<string, Map<string, number>> {
  const byDir = new Map<string, Map<string, number>>();
  for (const d of DIRECTIONS) byDir.set(d, new Map());
  for (const row of scoreRows()) {
    const [, name, , ...values] = row;
    if (name === "Total") continue;
    DIRECTIONS.forEach((d, i) => {
      const n = Number(values[i]);
      if (Number.isInteger(n)) byDir.get(d)?.set(name, n);
    });
  }
  return byDir;
}

function recomputed(dir: string): number {
  const s = scores().get(dir) as Map<string, number>;
  return CRITERIA.reduce((sum, [name, w]) => sum + (w * (s.get(name) ?? 0)) / 4, 0);
}

function winner(): string {
  const q = qualified();
  const total = (d: string) => recomputed(d);
  const s = scores();
  const best = Math.max(...q.map(total));
  const contenders = q.filter((d) => best - total(d) <= 3);
  contenders.sort(
    (a, b) =>
      (s.get(b)?.get("Pitch legibility") ?? 0) - (s.get(a)?.get("Pitch legibility") ?? 0) ||
      (s.get(b)?.get("ADHD calm and focus") ?? 0) - (s.get(a)?.get("ADHD calm and focus") ?? 0) ||
      total(b) - total(a),
  );
  return contenders[0];
}

describe("ADR 0010: gates and evidence", () => {
  it("has one gate row per direction, each gate pass or fail", () => {
    const g = gates();
    expect([...g.keys()].sort()).toEqual([...DIRECTIONS].sort());
    for (const [id, row] of g) {
      for (const k of ["G1", "G2", "G3"] as const) {
        expect(row[k], `${id} ${k}`).toMatch(/^(pass|fail)$/);
      }
    }
  });

  it("records the route commit as 40 hex characters", () => {
    expect(text).toMatch(/^Route commit: `[0-9a-f]{40}`/m);
  });

  it("lists at least 36 screenshots with a SHA-256, covering every default capture", () => {
    const evidence = lines.filter((l) =>
      /test-results\/review\/dev-directions-[a-z]+-(tactics|data)\/[A-Za-z0-9.-]+\.png.*\b[0-9a-f]{64}\b/.test(
        l,
      ),
    );
    expect(evidence.length).toBeGreaterThanOrEqual(36);
    for (const d of DIRECTIONS) {
      for (const screen of ["tactics", "data"]) {
        for (const width of [375, 768, 1440]) {
          for (const theme of ["dark", "light"]) {
            const path = `test-results/review/dev-directions-${d}-${screen}/${width}-${theme}.png`;
            expect(
              evidence.some((l) => l.includes(`${path}\``) || l.includes(`${path} `)),
              path,
            ).toBe(true);
          }
        }
      }
    }
  });
});

describe("ADR 0010: scores, totals and the pick", () => {
  it("has the 7 criteria with the rubric weights", () => {
    const rows = scoreRows().filter((r) => r[1] !== "Total");
    expect(rows.map((r) => [r[1], Number(r[2])])).toEqual(CRITERIA);
  });

  it("scores every qualified direction 1-4 on every criterion with an evidence line", () => {
    const s = scores();
    const evidence = tableAfter(/^\| Criterion \| Direction \| Score \| Evidence \|$/);
    for (const d of qualified()) {
      for (const [name] of CRITERIA) {
        const score = s.get(d)?.get(name);
        expect(score, `${d} ${name}`).toBeGreaterThanOrEqual(1);
        expect(score, `${d} ${name}`).toBeLessThanOrEqual(4);
        const row = evidence.find((r) => r[0] === name && r[1].replace(/`/g, "") === d);
        expect(row, `evidence for ${d} ${name}`).toBeDefined();
        expect(Number(row?.[2]), `evidence score for ${d} ${name}`).toBe(score);
        expect((row?.[3] ?? "").length, `evidence text for ${d} ${name}`).toBeGreaterThan(20);
      }
    }
  });

  it("does not score a direction that failed a gate", () => {
    const q = qualified();
    for (const d of DIRECTIONS.filter((x) => !q.includes(x))) {
      expect(scores().get(d)?.size ?? 0, d).toBe(0);
    }
  });

  it("totals equal sum of weight x score / 4 within 0.05", () => {
    const total = scoreRows().find((r) => r[1] === "Total");
    expect(total).toBeDefined();
    DIRECTIONS.forEach((d, i) => {
      if (!qualified().includes(d)) return;
      expect(Math.abs(Number(total?.[3 + i]) - recomputed(d)), d).toBeLessThan(0.05);
    });
  });

  it("names the highest total after the tie-break as the pick", () => {
    const picked = lines.filter((l) => l.startsWith("Picked: "));
    expect(picked).toHaveLength(1);
    expect(picked[0].replace("Picked: ", "").replace(/`/g, "").trim()).toBe(winner());
  });

  it("carries the delegation line verbatim, once", () => {
    expect(text.split(DELEGATION).length - 1).toBe(1);
  });

  it("is Accepted", () => {
    const i = lines.findIndex((l) => l.trim() === "## Status");
    const first = lines.slice(i + 1).find((l) => l.trim() !== "") ?? "";
    expect(first).toMatch(/^Accepted\b/);
  });
});
