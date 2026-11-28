// Scene fixtures: every top-level src/scene/fixtures/*.json must pass ajv (strict, 2020-12),
// the Zod mirror and the semantic integrity checks. The integrity rules are then tested one by
// one on mutated clones of the fixtures.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { type Scene, sceneSchema } from "./schema.ts";
import { checkSceneIntegrity, parseScene, RUNOFF_METRES } from "./validate.ts";

const root = process.cwd();
const fixturesDir = join(root, "src", "scene", "fixtures");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

// Under moduleResolution "bundler" the CJS default export may arrive as the module namespace.
function callable<T>(mod: unknown): T {
  const m = mod as { default?: unknown };
  return (typeof mod === "function" ? mod : m.default) as T;
}

const AjvCtor = callable<typeof Ajv2020>(Ajv2020);
const addFormatsFn = callable<(ajv: InstanceType<typeof Ajv2020>) => void>(addFormats);
const ajv = new AjvCtor({ strict: true, allErrors: true });
addFormatsFn(ajv);
ajv.addSchema(readJson(join(root, "schemas", "common.schema.json")) as object);
const validate = ajv.compile(readJson(join(root, "schemas", "scene.schema.json")) as object);

// Top-level files only: subfolders such as invalid/ hold deliberately broken scenes.
const fixtureFiles = readdirSync(fixturesDir)
  .filter((f) => f.endsWith(".json") && statSync(join(fixturesDir, f)).isFile())
  .sort();

describe("scene fixtures", () => {
  it("has one fixture of each kind", () => {
    expect(fixtureFiles).toEqual(
      expect.arrayContaining([
        "authored.json",
        "board.json",
        "quiz-answer.json",
        "reconstruction.json",
      ]),
    );
  });

  it.each(fixtureFiles)("%s passes ajv and Zod", (file) => {
    const doc = readJson(join(fixturesDir, file));
    const ok = validate(doc) as boolean;
    expect(ok, JSON.stringify(validate.errors ?? [])).toBe(true);
    const parsed = sceneSchema.safeParse(doc);
    expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [])).toBe(true);
  });

  it.each(fixtureFiles)("%s has no integrity issues", (file) => {
    const scene = sceneSchema.parse(readJson(join(fixturesDir, file)));
    expect(checkSceneIntegrity(scene)).toEqual([]);
  });
});

function fixture(name: string): Scene {
  return sceneSchema.parse(readJson(join(fixturesDir, `${name}.json`)));
}

/** Deep clone of a fixture, mutated by `edit`, then checked. Returns the issue paths. */
function issuePaths(name: string, edit: (s: Scene) => void): string[] {
  const scene = structuredClone(fixture(name));
  edit(scene);
  return checkSceneIntegrity(scene).map((i) => i.path);
}

function at<T>(arr: readonly T[], i: number): T {
  const v = arr[i];
  if (v === undefined) throw new Error(`no item ${i}`);
  return v;
}

describe("checkSceneIntegrity: frames", () => {
  it("requires the first frame at t 0", () => {
    expect(
      issuePaths("authored", (s) => {
        at(s.frames, 0).t = 0.5;
      }),
    ).toContain("/frames/0/t");
  });

  it("requires strictly increasing frame times", () => {
    expect(
      issuePaths("authored", (s) => {
        at(s.frames, 2).t = 2;
      }),
    ).toContain("/frames/2/t");
  });

  it("rejects a positions key that is not an entity", () => {
    const paths = issuePaths("authored", (s) => {
      at(s.frames, 1).positions.ghost = { x: 10, y: 10 };
    });
    expect(paths).toContain("/frames/1/positions/ghost");
  });

  it("rejects a ballOwner that is not a player or goalkeeper", () => {
    expect(
      issuePaths("authored", (s) => {
        at(s.frames, 0).ballOwner = "ball";
      }),
    ).toContain("/frames/0/ballOwner");
    expect(
      issuePaths("authored", (s) => {
        at(s.frames, 0).ballOwner = "nobody";
      }),
    ).toContain("/frames/0/ballOwner");
  });

  it("requires every entity to appear in at least one frame", () => {
    const paths = issuePaths("authored", (s) => {
      s.entities.push({ id: "home-6", type: "player", team: "home", number: 6 });
    });
    expect(paths).toContain("/entities/8");
  });
});

describe("checkSceneIntegrity: entities and teams", () => {
  it("rejects a duplicate entity id", () => {
    const paths = issuePaths("authored", (s) => {
      s.entities.push({ ...at(s.entities, 1) });
    });
    expect(paths).toContain("/entities/8/id");
  });

  it("requires a team on players and none on the ball", () => {
    expect(
      issuePaths("authored", (s) => {
        delete at(s.entities, 1).team;
      }),
    ).toContain("/entities/1/team");
    expect(
      issuePaths("authored", (s) => {
        at(s.entities, 7).team = "home";
      }),
    ).toContain("/entities/7/team");
  });

  it("rejects a player whose team is unknown", () => {
    expect(
      issuePaths("authored", (s) => {
        at(s.entities, 1).team = "nobody";
      }),
    ).toContain("/entities/1/team");
  });

  it("allows only one ball", () => {
    const paths = issuePaths("authored", (s) => {
      s.entities.push({ id: "ball-2", type: "ball" });
      at(s.frames, 0).positions["ball-2"] = { x: 50, y: 30 };
    });
    expect(paths).toContain("/entities/8/type");
  });

  it("rejects two teams on the same side", () => {
    expect(
      issuePaths("authored", (s) => {
        at(s.teams, 1).side = "a";
      }),
    ).toContain("/teams/1/side");
  });
});

describe("checkSceneIntegrity: events", () => {
  it("rejects an unknown event team", () => {
    expect(
      issuePaths("authored", (s) => {
        at(s.events, 0).team = "nobody";
      }),
    ).toContain("/events/0/team");
  });

  it("rejects an unknown player or a player from another team", () => {
    expect(
      issuePaths("authored", (s) => {
        at(s.events, 0).player = "nobody";
      }),
    ).toContain("/events/0/player");
    expect(
      issuePaths("authored", (s) => {
        at(s.events, 0).player = "home-4";
      }),
    ).toContain("/events/0/player");
  });

  it("rejects an unknown pass receiver", () => {
    const paths = issuePaths("authored", (s) => {
      const ev = at(s.events, 0);
      if (ev.type === "pass") ev.receiver = "nobody";
    });
    expect(paths).toContain("/events/0/receiver");
  });

  it("rejects an unknown pressure target", () => {
    const paths = issuePaths("authored", (s) => {
      s.events.push({
        id: "ev-press",
        type: "pressure",
        t: 1,
        team: "home",
        player: "home-4",
        target: "nobody",
        start: { x: 23, y: 27 },
        end: { x: 30, y: 25 },
      });
    });
    expect(paths).toContain("/events/2/target");
  });

  it("rejects tEnd before t", () => {
    const paths = issuePaths("authored", (s) => {
      const ev = at(s.events, 1);
      ev.tEnd = ev.t - 1;
    });
    expect(paths).toContain("/events/1/tEnd");
  });

  it("rejects a sequence that lists an unknown event", () => {
    const paths = issuePaths("reconstruction", (s) => {
      const seq = at(s.annotations, 0);
      if (seq.type === "sequence") seq.events.push("ev-missing");
    });
    expect(paths).toContain("/annotations/0/events/10");
  });
});

describe("checkSceneIntegrity: coordinates", () => {
  it("allows the 3 m run-off inclusive and rejects points beyond it", () => {
    expect(RUNOFF_METRES).toBe(3);
    const ok = issuePaths("authored", (s) => {
      at(s.frames, 0).positions["home-1"] = { x: -3, y: 34 };
      at(s.frames, 1).positions["home-1"] = { x: 108, y: 71 };
    });
    expect(ok).toEqual([]);
    const bad = issuePaths("authored", (s) => {
      at(s.frames, 0).positions["home-1"] = { x: -3.5, y: 34 };
    });
    expect(bad).toContain("/frames/0/positions/home-1");
  });

  it("checks event and annotation points against the pitch", () => {
    expect(
      issuePaths("authored", (s) => {
        at(s.events, 0).end = { x: 109, y: 30 };
      }),
    ).toContain("/events/0/end");
    const paths = issuePaths("authored", (s) => {
      const zone = at(s.annotations, 0);
      if (zone.type === "zone") at(zone.points, 2).y = 72;
    });
    expect(paths).toContain("/annotations/0/points/2");
  });
});

describe("checkSceneIntegrity: annotations", () => {
  it("rejects a time range whose from is after to", () => {
    const paths = issuePaths("authored", (s) => {
      const zone = at(s.annotations, 0);
      if (zone.type === "zone") {
        zone.from = 3;
        zone.to = 1;
      }
    });
    expect(paths).toContain("/annotations/0/to");
  });

  it("requires a highlight to have exactly one of target and at", () => {
    const both = issuePaths("authored", (s) => {
      s.annotations.push({ id: "hl", type: "highlight", target: "home-4", at: { x: 1, y: 1 } });
    });
    expect(both).toContain("/annotations/3");
    const neither = issuePaths("authored", (s) => {
      s.annotations.push({ id: "hl", type: "highlight" });
    });
    expect(neither).toContain("/annotations/3");
  });

  it("rejects a shape member from another team", () => {
    const paths = issuePaths("authored", (s) => {
      const shape = at(s.annotations, 1);
      if (shape.type === "shape") shape.members[1] = "away-9";
    });
    expect(paths).toContain("/annotations/1/members/1");
  });
});

describe("checkSceneIntegrity: source licence rules", () => {
  it("never lets a local-only scene be shippable", () => {
    expect(
      issuePaths("reconstruction", (s) => {
        s.source.localOnly = true;
      }),
    ).toContain("/source/shippable");
  });

  it("requires provider and licenceUrl on open data", () => {
    expect(
      issuePaths("reconstruction", (s) => {
        delete s.source.provider;
      }),
    ).toContain("/source/provider");
    expect(
      issuePaths("reconstruction", (s) => {
        delete s.source.licenceUrl;
      }),
    ).toContain("/source/licenceUrl");
  });

  it("keeps StatsBomb scenes local and logo-credited (ADR 0008)", () => {
    const paths = issuePaths("reconstruction", (s) => {
      s.source.provider = "statsbomb";
    });
    expect(paths).toContain("/source/shippable");
    expect(paths).toContain("/source/logoRequired");
    const ok = issuePaths("reconstruction", (s) => {
      s.source.provider = "statsbomb";
      s.source.shippable = false;
      s.source.localOnly = true;
      s.source.logoRequired = true;
    });
    expect(ok).toEqual([]);
  });
});

describe("parseScene", () => {
  it("returns the scene for a valid fixture", () => {
    const result = parseScene(readJson(join(fixturesDir, "board.json")));
    expect(result.ok).toBe(true);
  });

  it("maps Zod issues to JSON Pointers", () => {
    const doc = readJson(join(fixturesDir, "board.json")) as Record<string, unknown>;
    const result = parseScene({ ...doc, kind: "replay", extra: 1 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const paths = result.issues.map((i) => i.path);
    expect(paths).toContain("/kind");
    expect(paths).toContain("/extra");
  });

  it("reports integrity issues after a successful parse", () => {
    const doc = structuredClone(fixture("authored"));
    at(doc.frames, 0).t = 1;
    const result = parseScene(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map((i) => i.path)).toContain("/frames/0/t");
  });

  it("returns ok false for non-object input", () => {
    expect(parseScene("not a scene").ok).toBe(false);
    expect(parseScene(null).ok).toBe(false);
  });
});
