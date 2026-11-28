// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import wyscout from "../../../public/data/wyscout/v1-809b8aff1fda/scene-wyscout-2499754-sane-goal.json";
import city from "../../routes/dev-directions/scenes/city-2022-23-shapes.json";
import board from "../../scene/fixtures/board.json";
import type { Scene } from "../../scene/schema.ts";
import { parseScene } from "../../scene/validate.ts";
import { GLYPH_IDS, glyph } from "../glyphs/registry.ts";
import { SceneLayer } from "../glyphs/SceneLayer.tsx";
import { Pitch } from "../Pitch.tsx";
import { describeDiscText, discTextKinds, glyphIdsForScene } from "./glyphIds.ts";
import { Legend } from "./Legend.tsx";

function load(raw: unknown): Scene {
  const parsed = parseScene(raw);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.scene;
}

const boardScene = load(board);

function renderedIds(markup: string): string[] {
  return [...new Set([...markup.matchAll(/data-glyph="([^"]+)"/g)].map((m) => m[1] ?? ""))];
}

function inRegistryOrder(ids: string[]): string[] {
  return GLYPH_IDS.filter((id) => ids.includes(id));
}

describe("legend equals what the pitch draws", () => {
  it("renders exactly the glyph ids glyphIdsForScene predicts for the board scene", () => {
    const markup = renderToStaticMarkup(
      <Pitch title={boardScene.label}>
        <SceneLayer scene={boardScene} t={0} mode="smooth" />
      </Pitch>,
    );
    const expected = glyphIdsForScene(boardScene, { density: false });
    expect(inRegistryOrder(renderedIds(markup))).toEqual(expected);
    expect(expected).toContain("goalkeeper-a");
    expect(expected).toContain("ball");
  });

  it("lists the same ids in registry order in the legend", () => {
    const markup = renderToStaticMarkup(<Legend scene={boardScene} density={false} />);
    const listed = [...markup.matchAll(/data-legend-entry="([^"]+)"/g)].map((m) => m[1]);
    expect(listed).toEqual(glyphIdsForScene(boardScene, { density: false }));
  });

  it("fills team labels from the scene's team names", () => {
    const markup = renderToStaticMarkup(<Legend scene={boardScene} density={false} />);
    expect(markup).toContain("Team A player — Home 4-3-3");
    expect(markup).toContain("Team B player — Away 4-4-2");
    expect(markup).not.toContain("{team}");
  });

  it("keeps every label (swatch plus word) when collapsed, and hides the descriptions", () => {
    const expanded = renderToStaticMarkup(<Legend scene={boardScene} density={false} />);
    const collapsed = renderToStaticMarkup(
      <Legend scene={boardScene} density={false} initialExpanded={false} />,
    );
    expect(collapsed).toContain("Expand notation");
    expect(collapsed).toContain('aria-expanded="false"');
    expect(collapsed).toContain("Ball");
    expect(collapsed).toContain("Team A player — Home 4-3-3");
    expect(collapsed).not.toContain("Small white circle with a dark ring.");
    expect(expanded).toContain("Collapse notation");
    expect(expanded).toContain("Small white circle with a dark ring.");
  });

  it("says so when there is nothing to explain", () => {
    const markup = renderToStaticMarkup(<Legend scene={null} density={false} />);
    expect(markup).toContain("No marks to explain yet.");
    expect(markup).not.toContain("data-legend-entry");
  });

  it("treats an id outside the registry as an error, not a silent draw", () => {
    expect(() => glyph("nope")).toThrow(/unknown glyph id/);
    expect(glyph("pass").id).toBe("pass");
  });
});

describe("the legend names what the discs show (DESIGN.md section 4)", () => {
  const cityScene = load(city);
  const wyscoutScene = load(wyscout);
  const legend = (scene: Scene) => renderToStaticMarkup(<Legend scene={scene} density={false} />);

  it("says shirt number for numbered discs", () => {
    expect(discTextKinds(boardScene, "a")).toEqual(["shirt number"]);
    expect(legend(boardScene)).toContain("Filled disc with shirt number.");
    expect(legend(boardScene)).toContain("White disc with a coloured ring and shirt number.");
  });

  it("says position code for the City shapes, which label discs GK, CB, ST", () => {
    expect(discTextKinds(cityScene, "a")).toEqual(["position code"]);
    expect(legend(cityScene)).toContain("Filled disc with position code.");
    expect(legend(cityScene)).not.toContain("shirt number");
  });

  it("says player initials for the Wyscout goal, which labels discs EM, KD, LS", () => {
    expect(discTextKinds(wyscoutScene, "a")).toEqual(["player initials"]);
    expect(legend(wyscoutScene)).toContain("Filled disc with player initials.");
    expect(legend(wyscoutScene)).not.toContain("shirt number");
  });

  it("names both kinds when a side mixes them, and drops the clause when discs carry no text", () => {
    const mixed = load({
      ...structuredClone(board),
      entities: [
        { id: "home-2", type: "player", team: "home", number: 2 },
        { id: "home-3", type: "player", team: "home", label: "CB", role: "Centre-back" },
        { id: "away-9", type: "player", team: "away" },
      ],
      frames: [
        {
          t: 0,
          positions: {
            "home-2": { x: 20, y: 30 },
            "home-3": { x: 30, y: 30 },
            "away-9": { x: 60, y: 30 },
          },
        },
      ],
      events: [],
      annotations: [],
    });
    expect(legend(mixed)).toContain("Filled disc with shirt number or position code.");
    expect(legend(mixed)).toContain("White disc with a coloured ring.");
    expect(describeDiscText("Filled disc with {disc-text}.", null, "a")).toBe(
      "Filled disc with shirt number.",
    );
    expect(legend(mixed)).not.toContain("{disc-text}");
  });
});
