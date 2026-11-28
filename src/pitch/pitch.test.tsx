import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Pitch } from "./Pitch.tsx";

const root = process.cwd();

function markingIds(html: string): string[] {
  return [...html.matchAll(/data-marking="([a-z-]+)"/g)].map((m) => m[1] ?? "");
}

describe("<Pitch> static markup", () => {
  const html = renderToStaticMarkup(<Pitch title="Pitch only" />);

  it("renders a bottom and a top SVG, the top one titled", () => {
    expect(html.match(/<svg/g)?.length).toBe(2);
    const bottom = html.indexOf("<svg");
    const top = html.indexOf("<svg", bottom + 1);
    expect(html.slice(bottom, top)).toContain('aria-hidden="true"');
    expect(html.slice(top)).toContain("<title");
    expect(html.slice(top)).toContain("Pitch, 105 by 68 metres — Pitch only");
    expect(html.slice(top)).toContain('role="img"');
  });

  it("holds the markings inside the canonical-root group", () => {
    const rootAt = html.indexOf("data-canonical-root");
    expect(rootAt).toBeGreaterThan(-1);
    expect(html.indexOf('data-layer="markings"')).toBeGreaterThan(rootAt);
  });

  it("draws the full Law 1 marking set", () => {
    expect(new Set(markingIds(html))).toEqual(
      new Set([
        "field-boundary",
        "halfway-line",
        "centre-circle",
        "centre-mark",
        "goal-area-left",
        "goal-area-right",
        "penalty-area-left",
        "penalty-area-right",
        "penalty-mark-left",
        "penalty-mark-right",
        "penalty-arc-left",
        "penalty-arc-right",
        "corner-arc-top-left",
        "corner-arc-top-right",
        "corner-arc-bottom-right",
        "corner-arc-bottom-left",
        "goal-left",
        "goal-right",
      ]),
    );
    expect(markingIds(html)).toHaveLength(18);
  });

  it("uses role=group when interactive", () => {
    const interactive = renderToStaticMarkup(<Pitch title="Board" interactive />);
    expect(interactive).toContain('role="group"');
    expect(interactive).not.toContain('role="img"');
  });

  it("draws the field at the scene's own size", () => {
    const small = renderToStaticMarkup(<Pitch title="Fulham" length={100} width={65} />);
    expect(small).toContain("Pitch, 100 by 65 metres — Fulham");
    expect(small).toContain('viewBox="-3 -3 106 71"');
  });
});

// 3, 4, 6 or 8 hex digits after '#', ending at a word boundary.
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
  return out;
}

describe("palette lives only in src/index.css", () => {
  it("finds no hex colour literal in pitch, scene or dev-pitch TypeScript", () => {
    const files = ["src/pitch", "src/scene", "src/routes"]
      .flatMap((d) => walk(join(root, d)))
      .filter((f) => /pitch|scene/.test(relative(root, f).replaceAll("\\", "/")));
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((f) => HEX.test(readFileSync(f, "utf8")));
    expect(offenders.map((f) => relative(root, f))).toEqual([]);
  });

  it("declares every 03-UI-SPEC token in src/index.css", () => {
    const css = readFileSync(join(root, "src/index.css"), "utf8");
    const tokens = [
      "--surface-page",
      "--surface-panel",
      "--accent",
      "--danger",
      "--ink",
      "--ink-muted",
      "--control-border",
      "--pitch-runoff",
      "--pitch-surface",
      "--pitch-line",
      "--team-a",
      "--team-a-ink",
      "--team-b",
      "--team-b-fill",
      "--team-b-ink",
      "--ball-fill",
      "--ball-ring",
      "--zone-fill",
      "--zone-line",
      "--highlight",
      "--density-mark",
      "--label-bg",
      "--label-border",
      "--font-sans",
      "--font-mono",
      "--space-xs",
      "--space-sm",
      "--space-md",
      "--space-lg",
      "--space-xl",
      "--space-2xl",
      "--space-3xl",
    ];
    const missing = tokens.filter((t) => !new RegExp(`^\\s*${t}:`, "m").test(css));
    expect(missing).toEqual([]);
  });
});
