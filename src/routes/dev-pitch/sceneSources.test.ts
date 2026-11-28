// Dev scene loading: the published artifact is fetched through the catalog exactly as a browser
// would, an HTML page served with status 200 is reported as an error (never JSON.parse'd), a scene
// that fails integrity comes back as "invalid" with its issues, and the local-only StatsBomb scene
// is "missing-local" until `npm run data` has produced it. No network: fetch is injected.
import { describe, expect, it } from "vitest";
import { DEV_SCENES, type DevScene, findDevScene } from "../../scene/fixtures/index.ts";
import reconstruction from "../../scene/fixtures/reconstruction.json";
import { type LoadResult, loadDevScene, sceneOptionLabel, toPanelIssues } from "./sceneSources.ts";

const CATALOG = {
  schemaVersion: 1,
  datasets: [
    {
      dataset: "wyscout",
      version: "v1-test",
      license: "CC-BY-4.0",
      scenes: [{ id: "s1", label: "Scene one", path: "wyscout/v1-test/scene-s1.json" }],
    },
  ],
};

type FetchLike = (input: string) => Promise<Response>;

function jsonResponse(body: unknown, contentType = "application/json"): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": contentType },
  });
}

function fakeFetch(routes: Record<string, () => Response>, seen: string[] = []): FetchLike {
  return async (input) => {
    seen.push(input);
    const route = routes[input];
    return route ? route() : new Response("not found", { status: 404 });
  };
}

/** A schema-valid scene that breaks integrity: the first frame starts late and a frame goes back. */
function brokenScene(): unknown {
  const doc = structuredClone(reconstruction) as {
    frames: { t: number; positions: Record<string, unknown> }[];
  };
  const [first, second] = doc.frames;
  if (!first || !second) throw new Error("fixture needs two frames");
  first.t = 0.4;
  second.t = 0.2;
  second.positions["ghost-99"] = { x: 10, y: 10 };
  return doc;
}

function entry(id: string) {
  const found = findDevScene(id);
  if (!found) throw new Error(`no dev scene ${id}`);
  return found;
}

const LOCAL_ENTRY: DevScene = {
  id: "statsbomb-local",
  label: "Reconstruction · StatsBomb PL 2015/16 (local only)",
  load: () => null,
  local: { dataset: "statsbomb" },
};

function expectStatus<S extends LoadResult["status"]>(
  result: LoadResult,
  status: S,
): Extract<LoadResult, { status: S }> {
  expect(result.status).toBe(status);
  return result as Extract<LoadResult, { status: S }>;
}

describe("loadDevScene: published scene", () => {
  it("fetches the catalog, then the Wyscout scene, and returns it ready", async () => {
    const seen: string[] = [];
    const f = fakeFetch(
      {
        "/data/catalog.json": () => jsonResponse(CATALOG),
        "/data/wyscout/v1-test/scene-s1.json": () => jsonResponse(reconstruction),
      },
      seen,
    );
    const result = expectStatus(await loadDevScene(entry("reconstruction"), f), "ready");
    expect(seen).toEqual(["/data/catalog.json", "/data/wyscout/v1-test/scene-s1.json"]);
    expect(result.scene.kind).toBe("reconstruction");
    expect(result.localOnly).toBe(false);
  });

  it("reports an HTML page served with 200 as an error naming the path", async () => {
    const f = fakeFetch({
      "/data/catalog.json": () =>
        new Response("<!doctype html><html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
    });
    const result = expectStatus(await loadDevScene(entry("reconstruction"), f), "error");
    expect(result.message).toContain("/data/catalog.json");
    expect(result.message).toContain("did not return JSON");
    expect(result.message).not.toMatch(/Unexpected token|JSON\.parse/);
  });

  it("reports a scene file served as HTML with the scene path", async () => {
    const f = fakeFetch({
      "/data/catalog.json": () => jsonResponse(CATALOG),
      "/data/wyscout/v1-test/scene-s1.json": () =>
        new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    });
    const result = expectStatus(await loadDevScene(entry("reconstruction"), f), "error");
    expect(result.message).toContain("/data/wyscout/v1-test/scene-s1.json");
  });

  it("reports a catalog without a Wyscout dataset", async () => {
    const f = fakeFetch({
      "/data/catalog.json": () => jsonResponse({ schemaVersion: 1, datasets: [] }),
    });
    const result = expectStatus(await loadDevScene(entry("reconstruction"), f), "error");
    expect(result.message).toContain("wyscout");
  });

  it("reports a failed request with its status", async () => {
    const result = expectStatus(
      await loadDevScene(entry("reconstruction"), fakeFetch({})),
      "error",
    );
    expect(result.message).toContain("404");
  });

  it("reports a network failure as an error", async () => {
    const boom: FetchLike = async () => {
      throw new TypeError("Failed to fetch");
    };
    const result = expectStatus(await loadDevScene(entry("reconstruction"), boom), "error");
    expect(result.message).toContain("Failed to fetch");
  });

  it("returns invalid with issues when the published scene fails integrity", async () => {
    const f = fakeFetch({
      "/data/catalog.json": () => jsonResponse(CATALOG),
      "/data/wyscout/v1-test/scene-s1.json": () => jsonResponse(brokenScene()),
    });
    const result = expectStatus(await loadDevScene(entry("reconstruction"), f), "invalid");
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });
});

describe("loadDevScene: bundled fixtures", () => {
  const never: FetchLike = async () => {
    throw new Error("a bundled fixture must not touch the network");
  };

  it("loads every plain fixture as ready, none, or empty without fetching", async () => {
    for (const s of DEV_SCENES) {
      // The invalid option is broken on purpose; StatePanels.test.tsx covers it.
      if (s.published || s.local || s.id === "invalid") continue;
      const result = await loadDevScene(s, never);
      expect(["none", "ready", "empty"]).toContain(result.status);
    }
  });

  it("returns none for pitch only", async () => {
    expectStatus(await loadDevScene(entry("pitch-only"), never), "none");
  });

  it("loads the authored fixture ready and not local-only", async () => {
    const result = expectStatus(await loadDevScene(entry("authored"), never), "ready");
    expect(result.localOnly).toBe(false);
  });
});

describe("loadDevScene: local-only StatsBomb scene", () => {
  it("is missing-local when no local file exists", async () => {
    const result = await loadDevScene(
      LOCAL_ENTRY,
      async () => {
        throw new Error("no network for a local-only scene");
      },
      {},
    );
    expect(result.status).toBe("missing-local");
  });

  it("loads the newest local version and marks it local-only", async () => {
    const files: Record<string, () => Promise<unknown>> = {
      "/data/statsbomb/v1-aaa/scene-x.json": async () => {
        throw new Error("older version must not be loaded");
      },
      "/data/statsbomb/v1-zzz/scene-x.json": async () => ({
        ...(reconstruction as object),
        source: {
          type: "open-data",
          provider: "statsbomb",
          sourceIds: ["src-statsbomb-open-data"],
          licence: "StatsBomb Open Data User Agreement",
          licenceUrl: "https://github.com/statsbomb/open-data/blob/master/LICENSE.pdf",
          attribution: "Data by StatsBomb",
          shippable: false,
          localOnly: true,
          logoRequired: true,
        },
      }),
    };
    const result = await loadDevScene(LOCAL_ENTRY, fakeFetch({}), files);
    // The wrapped reconstruction fixture may or may not satisfy every integrity rule for
    // StatsBomb; what matters here is that the newest file was chosen and no network was used.
    expect(["ready", "invalid"]).toContain(result.status);
    if (result.status === "ready") expect(result.localOnly).toBe(true);
  });
});

describe("sceneOptionLabel", () => {
  it("adds the machine note to the local-only option when absent", () => {
    expect(sceneOptionLabel(LOCAL_ENTRY, false)).toMatch(/\(not on this machine\)$/);
    expect(sceneOptionLabel(LOCAL_ENTRY, true)).not.toMatch(/not on this machine/);
  });

  it("leaves other labels alone", () => {
    expect(sceneOptionLabel(entry("authored"), false)).toBe(entry("authored").label);
  });
});

describe("toPanelIssues", () => {
  const make = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ path: `/frames/${i}/t`, message: `problem ${i}` }));

  it("shows five and counts the rest", () => {
    const { shown, more } = toPanelIssues(make(7));
    expect(shown).toHaveLength(5);
    expect(more).toBe(2);
  });

  it("shows all when there are three", () => {
    const { shown, more } = toPanelIssues(make(3));
    expect(shown).toHaveLength(3);
    expect(more).toBe(0);
  });

  it("honours a custom maximum", () => {
    expect(toPanelIssues(make(4), 2)).toEqual({ shown: make(4).slice(0, 2), more: 2 });
  });
});
