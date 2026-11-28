// Behaviour tests for the dist bundle gate (PIPE-03, ADR 0008 "Deploy deny-manifest").
// Pure checkBundle cases build DistFile lists in memory; the CLI cases use real temp folders.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  type BundleViolation,
  checkBundle,
  DEV_ONLY_MARKERS,
  type DistFile,
} from "./lib/bundle.ts";
import { loadDenyManifest, matches } from "./lib/globs.ts";

const MANIFEST = loadDenyManifest("deploy/deny-manifest.json");

function sha(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function file(path: string, text: string | null = "{}", bytes?: number): DistFile {
  const body = text ?? "";
  return { path, bytes: bytes ?? Buffer.byteLength(body), sha256: sha(body), text };
}

const SCENE_PATH = "data/wyscout/v1-abc/scene-x.json";
const SCENE_BODY = '{"scene":1}';

function catalogFor(scene: DistFile) {
  return {
    schemaVersion: 1,
    datasets: [
      {
        dataset: "wyscout",
        version: "v1-abc",
        license: "CC-BY-4.0",
        files: [
          {
            path: scene.path.replace(/^data\//, ""),
            sha256: scene.sha256,
            bytes: scene.bytes,
          },
        ],
      },
    ],
  };
}

function cleanDist(): { files: DistFile[]; catalog: unknown } {
  const scene = file(SCENE_PATH, SCENE_BODY);
  const catalog = catalogFor(scene);
  const catalogFile = file("data/catalog.json", JSON.stringify(catalog));
  return {
    files: [
      file("index.html", "<html></html>"),
      file("assets/index-abc123.js", "console.log(1)"),
      file("assets/index-abc123.css", "body{}"),
      catalogFile,
      scene,
    ],
    catalog,
  };
}

function rules(violations: BundleViolation[]): string[] {
  return violations.map((v) => v.rule);
}

describe("globs", () => {
  it("matches case-insensitively with posix separators", () => {
    expect(matches("Data\\StatsBomb\\a.json", "data/statsbomb/**")).toBe(true);
    expect(matches("x/Statsbomb.json", "**/*statsbomb*")).toBe(true);
    expect(matches("data/wyscout/a.json", "**/*statsbomb*")).toBe(false);
  });
});

describe("checkBundle", () => {
  it("passes a clean dist", () => {
    const { files, catalog } = cleanDist();
    expect(checkBundle(files, MANIFEST, catalog)).toEqual([]);
  });

  it.each([
    "data/statsbomb/x.json",
    "data/Last-Row/clip.json",
    "foo/StatsBomb-export.json",
    "data/metrica/a.json",
    "data/SkillCorner/a.json",
    "metrica/sample.csv",
    "assets/SkillCorner-tracking.json",
    ".cache/statsbomb.json",
    "data/statsbomb/.hidden.json",
  ])("denies %s", (path) => {
    const { files, catalog } = cleanDist();
    const out = checkBundle([...files, file(path)], MANIFEST, catalog);
    expect(rules(out)).toContain("denied");
    expect(out.find((v) => v.rule === "denied")?.path).toBe(path);
  });

  it("flags data outside the ship directories as unlisted-data", () => {
    const { files, catalog } = cleanDist();
    const out = checkBundle([...files, file("data/other-extra/a.json")], MANIFEST, catalog);
    expect(rules(out)).toContain("unlisted-data");
  });

  it.each(["assets/events.csv", "foo/x.parquet", "misc/archive.zip", "feed.xml"])(
    "flags the data-like file %s outside data/ as unlisted-data",
    (path) => {
      const { files, catalog } = cleanDist();
      const out = checkBundle([...files, file(path)], MANIFEST, catalog);
      expect(out.some((v) => v.rule === "unlisted-data" && v.path === path)).toBe(true);
    },
  );

  it("flags a data file one byte over the limit", () => {
    const { files, catalog } = cleanDist();
    const big = file("data/wyscout/v1-abc/big.json", "{}", MANIFEST.limits.dataFileBytes + 1);
    expect(rules(checkBundle([...files, big], MANIFEST, catalog))).toContain("oversize");
  });

  it("flags data total over the limit even when every file is under the file limit", () => {
    const { files, catalog } = cleanDist();
    const many = Array.from({ length: 6 }, (_, i) =>
      file(`data/wyscout/v1-abc/part-${i}.json`, "{}", MANIFEST.limits.dataFileBytes),
    );
    const out = checkBundle([...files, ...many], MANIFEST, catalog);
    expect(out.some((v) => v.rule === "oversize" && v.path === "data/")).toBe(true);
  });

  it("flags any dist file over the asset limit", () => {
    const { files, catalog } = cleanDist();
    const big = file("assets/huge.wasm", null, MANIFEST.limits.assetFileBytes + 1);
    expect(rules(checkBundle([...files, big], MANIFEST, catalog))).toContain("oversize");
  });

  it("flags a data file missing from the catalog", () => {
    const { files, catalog } = cleanDist();
    const extra = file("data/wyscout/v1-abc/other.json", '{"o":1}');
    const out = checkBundle([...files, extra], MANIFEST, catalog);
    expect(out.some((v) => v.rule === "catalog" && v.path === extra.path)).toBe(true);
  });

  it("flags a data file whose sha256 differs from the catalog", () => {
    const { files, catalog } = cleanDist();
    const tampered = files.map((f) =>
      f.path === SCENE_PATH ? { ...f, sha256: sha("changed") } : f,
    );
    const out = checkBundle(tampered, MANIFEST, catalog);
    expect(out.some((v) => v.rule === "catalog" && v.path === SCENE_PATH)).toBe(true);
  });

  it("flags data files when there is no catalog", () => {
    const { files } = cleanDist();
    const withoutCatalog = files.filter((f) => f.path !== "data/catalog.json");
    expect(rules(checkBundle(withoutCatalog, MANIFEST, null))).toContain("catalog");
  });

  it("flags a dataset licence outside the open set", () => {
    const { files, catalog } = cleanDist();
    const bad = JSON.parse(JSON.stringify(catalog));
    bad.datasets[0].license = "statsbomb-public-data-user-agreement";
    expect(rules(checkBundle(files, MANIFEST, bad))).toContain("catalog");
  });

  it("flags a content marker inside a hashed asset", () => {
    const { files, catalog } = cleanDist();
    const leaky = file("assets/index-abc123.js", 'fetch("/data/StatsBomb/x.json")');
    const swapped = files.map((f) => (f.path === leaky.path ? leaky : f));
    const out = checkBundle(swapped, MANIFEST, catalog);
    expect(rules(out)).toContain("marker");
  });

  it("flags every dev-only marker inside a code chunk as dev-leak (WR-06)", () => {
    const { files, catalog } = cleanDist();
    for (const { marker, source } of DEV_ONLY_MARKERS) {
      const leaky = file("assets/dev-abc123.js", `const s = ${JSON.stringify(marker)};`);
      const out = checkBundle([...files, leaky], MANIFEST, catalog);
      expect(out).toContainEqual({
        rule: "dev-leak",
        path: "assets/dev-abc123.js",
        detail: `contains dev-only text from ${source}`,
      });
    }
  });

  it("keeps each dev-only marker present in its source file, so the check stays armed", () => {
    for (const { marker, source } of DEV_ONLY_MARKERS) {
      expect(readFileSync(source, "utf8"), source).toContain(marker);
    }
  });

  it("does not deny a hashed asset by file name alone", () => {
    const { files, catalog } = cleanDist();
    const named = file("assets/statsbomb-xyz.js", "console.log(2)");
    expect(checkBundle([...files, named], MANIFEST, catalog)).toEqual([]);
  });
});

describe("check-bundle CLI", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  function makeDist(entries: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), "klopp-dist-"));
    dirs.push(root);
    for (const [rel, body] of Object.entries(entries)) {
      const full = join(root, rel);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, body);
    }
    return root;
  }

  function run(dist: string) {
    return spawnSync(process.execPath, ["scripts/check-bundle.ts", "--dist", dist], {
      encoding: "utf8",
    });
  }

  function cleanEntries(): Record<string, string> {
    const scene = file(SCENE_PATH, SCENE_BODY);
    return {
      "index.html": "<html></html>",
      "assets/index-abc123.js": "console.log(1)",
      "data/catalog.json": JSON.stringify(catalogFor(scene)),
      [SCENE_PATH]: SCENE_BODY,
    };
  }

  it("exits 0 on a clean dist", () => {
    const r = run(makeDist(cleanEntries()));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("bundle ok: 4 files");
  });

  it("exits 1 and names a planted file", () => {
    const r = run(makeDist({ ...cleanEntries(), "data/statsbomb/planted.json": "{}" }));
    expect(r.status).toBe(1);
    expect(`${r.stdout}${r.stderr}`).toContain("data/statsbomb/planted.json");
  });

  it("exits 1 on a content marker inside a source map", () => {
    const r = run(
      makeDist({ ...cleanEntries(), "assets/index-abc123.js.map": "data/statsbomb/x" }),
    );
    expect(r.status).toBe(1);
    expect(`${r.stdout}${r.stderr}`).toContain("marker");
  });

  it("exits 1 on a symbolic link", () => {
    const dist = makeDist(cleanEntries());
    try {
      symlinkSync(join(dist, "index.html"), join(dist, "linked.html"));
    } catch {
      return; // creating a symlink needs privileges on some Windows set-ups
    }
    const r = run(dist);
    expect(r.status).toBe(1);
    expect(`${r.stdout}${r.stderr}`).toContain("symlink");
  });

  it("exits 2 on a missing dist", () => {
    const r = run(join(tmpdir(), "klopp-no-such-dist-dir"));
    expect(r.status).toBe(2);
  });

  it("exits 2 on a bad argument", () => {
    const r = spawnSync(process.execPath, ["scripts/check-bundle.ts", "--nope"], {
      encoding: "utf8",
    });
    expect(r.status).toBe(2);
  });
});
