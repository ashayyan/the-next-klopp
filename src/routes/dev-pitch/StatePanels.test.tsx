// The three scene states that are not "drawn": empty, invalid and missing-local (and a failed
// fetch). Copy is frozen by 03-UI-SPEC, so the exact strings are asserted. The empty and invalid
// fixtures are the real files the page lists, loaded through the same loader.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { findDevScene } from "../../scene/fixtures/index.ts";
import { StatePanel } from "./StatePanels.tsx";
import { type LoadResult, loadDevScene } from "./sceneSources.ts";

async function load(id: string): Promise<LoadResult> {
  const entry = findDevScene(id);
  if (!entry) throw new Error(`no dev scene ${id}`);
  return loadDevScene(entry, async () => {
    throw new Error("fixtures never fetch");
  });
}

describe("fixtures behind the empty and invalid options", () => {
  it("loads the empty fixture with status empty and no marks", async () => {
    const result = await load("empty");
    expect(result.status).toBe("empty");
    if (result.status !== "empty") return;
    expect(result.scene.entities).toEqual([]);
    expect(result.scene.events).toEqual([]);
    expect(result.scene.annotations).toEqual([]);
    expect(result.scene.frames).toHaveLength(1);
  });

  it("loads the invalid fixture with at least two issues under /frames/", async () => {
    const result = await load("invalid");
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
    expect(result.issues.every((i) => i.path.startsWith("/frames/"))).toBe(true);
  });
});

describe("StatePanel", () => {
  it("renders the empty copy", () => {
    const html = renderToStaticMarkup(<StatePanel state={{ status: "empty" }} sceneId="empty" />);
    expect(html).toContain("This scene has no marks");
    expect(html).toContain(
      "The pitch is drawn, but the scene holds no players, ball, events or annotations. Pick another scene, or add entities to the fixture file.",
    );
  });

  it("renders the invalid copy with five issues and the remainder", () => {
    const issues = Array.from({ length: 7 }, (_, i) => ({
      path: `/frames/${i}/t`,
      message: `problem ${i}`,
    }));
    const html = renderToStaticMarkup(
      <StatePanel state={{ status: "invalid", issues }} sceneId="invalid" />,
    );
    expect(html).toContain("Scene failed validation");
    expect(html).toContain("7 problems in “invalid”.");
    expect(html).toContain("Fix the fixture file and save; the page reloads with the change.");
    expect(html).toContain("/frames/4/t: problem 4");
    expect(html).not.toContain("/frames/5/t");
    expect(html).toContain("and 2 more");
    expect(html).toContain('role="alert"');
  });

  it("uses the singular for one problem and omits the remainder line", () => {
    const html = renderToStaticMarkup(
      <StatePanel
        state={{ status: "invalid", issues: [{ path: "/frames/0/t", message: "x" }] }}
        sceneId="s"
      />,
    );
    expect(html).toContain("1 problem in “s”.");
    expect(html).not.toContain("more");
  });

  it("renders the missing-local copy", () => {
    const html = renderToStaticMarkup(
      <StatePanel state={{ status: "missing-local" }} sceneId="statsbomb-local" />,
    );
    expect(html).toContain("Local data not on this machine");
    expect(html).toContain("This StatsBomb scene is local-only and is never shipped. Run ");
    expect(html).toContain("npm run data");
    expect(html).toContain(" on this machine, then reload this page.");
  });

  it("renders a load error with its message", () => {
    const html = renderToStaticMarkup(
      <StatePanel
        state={{ status: "error", message: "/data/catalog.json answered 404." }}
        sceneId="r"
      />,
    );
    expect(html).toContain("This scene could not be loaded");
    expect(html).toContain("/data/catalog.json answered 404.");
    expect(html).toContain('role="alert"');
  });
});
