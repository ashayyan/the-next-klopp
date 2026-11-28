// Python -> TypeScript round trip: every dataset version the pipeline wrote (data/<dataset>/<version>/
// and the served copy public/data/<dataset>/<version>/) is checked against its manifest, its content
// hash version id, the scene JSON Schema (ajv, strict), the Zod mirror and the integrity rules.
// Versions are immutable and shipped files are listed in public/data/catalog.json with sha256 and
// byte counts, so a changed byte anywhere fails here.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { type Scene, sceneSchema } from "./schema.ts";
import { checkSceneIntegrity } from "./validate.ts";

const root = process.cwd();
const dataRoot = join(root, "data");
const publicRoot = join(root, "public", "data");
const MAX_SHIPPED_FILE_BYTES = 1024 * 1024;

interface ManifestFile {
  path: string;
  sha256: string;
  bytes: number;
}
interface Manifest {
  schemaVersion: number;
  dataset: string;
  version: string;
  sourceId: string;
  recipe: string;
  license: string;
  licenceUrl: string;
  attribution: string;
  shippable: boolean;
  logoRequired: boolean;
  kloppyVersion: string;
  generatedAt: string;
  rowCounts: Record<string, number>;
  files: ManifestFile[];
  inputs: { name: string; sha256: string }[];
}
interface CatalogEntry {
  dataset: string;
  version: string;
  license: string;
  licenceUrl: string;
  attribution: string;
  manifest: string;
  files: ManifestFile[];
  scenes: { id: string; label: string; path: string }[];
}
interface Catalog {
  schemaVersion: number;
  datasets: CatalogEntry[];
}

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
const validateScene = ajv.compile(readJson(join(root, "schemas", "scene.schema.json")) as object);

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function subdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith(".") && statSync(join(dir, name)).isDirectory())
    .sort();
}

interface Version {
  area: "data" | "public/data";
  dataset: string;
  version: string;
  dir: string;
}

function versionsUnder(area: Version["area"], base: string): Version[] {
  return subdirs(base).flatMap((dataset) =>
    subdirs(join(base, dataset))
      .filter((version) => existsSync(join(base, dataset, version, "manifest.json")))
      .map((version) => ({ area, dataset, version, dir: join(base, dataset, version) })),
  );
}

const dataVersions = versionsUnder("data", dataRoot);
const publicVersions = versionsUnder("public/data", publicRoot);
const allVersions = [...dataVersions, ...publicVersions];

function readManifest(v: Version): Manifest {
  return readJson(join(v.dir, "manifest.json")) as Manifest;
}

function filesOnDisk(dir: string): string[] {
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isFile())
    .sort();
}

function versionId(files: ManifestFile[]): string {
  const lines = [...files]
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((f) => `${f.path}:${f.sha256}\n`)
    .join("");
  return `v1-${createHash("sha256").update(lines).digest("hex").slice(0, 12)}`;
}

describe("pipeline output versions", () => {
  it("finds at least the committed Wyscout version in data/ and public/data/", () => {
    expect(dataVersions.some((v) => v.dataset === "wyscout")).toBe(true);
    expect(publicVersions.some((v) => v.dataset === "wyscout")).toBe(true);
  });

  describe.each(allVersions.map((v) => [`${v.area}/${v.dataset}/${v.version}`, v] as const))(
    "%s",
    (_label, v) => {
      it("matches its manifest: names, sha256, bytes, version id and the files on disk", () => {
        const manifest = readManifest(v);
        expect(manifest.schemaVersion).toBe(1);
        expect(manifest.dataset).toBe(v.dataset);
        expect(manifest.version).toBe(v.version);
        expect(v.version).toMatch(/^v1-[0-9a-f]{12}$/);
        expect(versionId(manifest.files)).toBe(v.version);
        expect(filesOnDisk(v.dir)).toEqual(
          ["manifest.json", ...manifest.files.map((f) => f.path)].sort(),
        );
        for (const f of manifest.files) {
          const bytes = readFileSync(join(v.dir, f.path));
          expect(sha256(bytes), f.path).toBe(f.sha256);
          expect(bytes.length, f.path).toBe(f.bytes);
          expect(bytes.includes(13), `${f.path} has a carriage return`).toBe(false);
          if (manifest.shippable) expect(bytes.length).toBeLessThanOrEqual(MAX_SHIPPED_FILE_BYTES);
        }
        expect(manifest.inputs.length).toBeGreaterThan(0);
        for (const input of manifest.inputs) expect(input.sha256).toMatch(/^[0-9a-f]{64}$/);
      });

      it("holds scenes that pass ajv, Zod and the integrity checks", () => {
        const manifest = readManifest(v);
        const scenes = manifest.files.filter((f) => f.path.startsWith("scene-"));
        expect(scenes.length).toBeGreaterThan(0);
        for (const f of scenes) {
          const doc = readJson(join(v.dir, f.path));
          expect(validateScene(doc), JSON.stringify(validateScene.errors)).toBe(true);
          const parsed = sceneSchema.safeParse(doc);
          expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
          expect(checkSceneIntegrity(doc as Scene)).toEqual([]);
          expect(f.path).toBe(`scene-${(doc as Scene).id}.json`);
        }
      });
    },
  );
});

describe("public/data is the shippable copy of data/", () => {
  it.each(publicVersions.map((v) => [`${v.dataset}/${v.version}`, v] as const))(
    "%s is shippable, licensed and byte-identical to its data/ source",
    (_label, v) => {
      const manifest = readManifest(v);
      expect(manifest.shippable).toBe(true);
      expect(manifest.logoRequired).toBe(false);
      expect(["CC-BY-4.0"]).toContain(manifest.license);
      const source = join(dataRoot, v.dataset, v.version);
      expect(existsSync(source), `${source} is missing`).toBe(true);
      const names = filesOnDisk(v.dir);
      expect(filesOnDisk(source)).toEqual(names);
      for (const name of names) {
        expect(readFileSync(join(v.dir, name)).equals(readFileSync(join(source, name))), name).toBe(
          true,
        );
      }
    },
  );
});

describe("public/data/catalog.json", () => {
  const catalogPath = join(publicRoot, "catalog.json");

  it("lists exactly the shipped versions and files, with matching sha256 and bytes", () => {
    const catalog = readJson(catalogPath) as Catalog;
    expect(catalog.schemaVersion).toBe(1);
    expect(JSON.stringify(catalog)).not.toMatch(/generatedAt|timestamp/);
    expect(catalog.datasets.map((d) => `${d.dataset}/${d.version}`)).toEqual(
      publicVersions.map((v) => `${v.dataset}/${v.version}`),
    );
    for (const entry of catalog.datasets) {
      const dir = join(publicRoot, entry.dataset, entry.version);
      const manifest = readJson(join(dir, "manifest.json")) as Manifest;
      expect(entry.manifest).toBe(`${entry.dataset}/${entry.version}/manifest.json`);
      expect(entry.license).toBe(manifest.license);
      expect(entry.licenceUrl).toBe(manifest.licenceUrl);
      expect(entry.attribution).toBe(manifest.attribution);
      expect(entry.files.map((f) => f.path).sort()).toEqual(
        filesOnDisk(dir)
          .map((name) => `${entry.dataset}/${entry.version}/${name}`)
          .sort(),
      );
      for (const f of entry.files) {
        const bytes = readFileSync(join(publicRoot, f.path));
        expect(sha256(bytes), f.path).toBe(f.sha256);
        expect(bytes.length, f.path).toBe(f.bytes);
      }
      for (const s of entry.scenes) {
        const scene = readJson(join(publicRoot, s.path)) as Scene;
        expect(scene.id).toBe(s.id);
        expect(scene.label).toBe(s.label);
      }
    }
  });

  it("has nothing but the catalog and dataset folders at the top of public/data", () => {
    const top = readdirSync(publicRoot).sort();
    expect(top).toContain("catalog.json");
    for (const name of top) {
      if (name === "catalog.json") continue;
      expect(statSync(join(publicRoot, name)).isDirectory(), name).toBe(true);
    }
  });
});

describe("the published Wyscout goal", () => {
  const entry = (readJson(join(publicRoot, "catalog.json")) as Catalog).datasets.find(
    (d) => d.dataset === "wyscout",
  );

  it("is the Manchester City goal by Leroy Sané under CC BY 4.0 with the Pappalardo credit", () => {
    expect(entry).toBeDefined();
    const path = entry?.scenes[0]?.path ?? "";
    const scene = readJson(join(publicRoot, path)) as Scene;
    expect(scene.kind).toBe("reconstruction");
    expect(scene.events).toHaveLength(10);
    const shot = scene.events[scene.events.length - 1];
    expect(shot?.type).toBe("shot");
    const shooter = scene.entities.find((e) => e.id === shot?.player);
    expect(shooter?.name).toBe("Leroy Sané");
    expect(scene.teams[0]?.name).toBe("Manchester City");
    expect(scene.source.licence).toBe("CC-BY-4.0");
    expect(scene.source.attribution).toContain("Pappalardo");
    expect(scene.source.shippable).toBe(true);
    expect(entry?.license).toBe("CC-BY-4.0");
    expect(entry?.attribution).toContain("Pappalardo");
  });
});

describe("the reconstruction fixture", () => {
  it("is the published Wyscout scene (same parsed value), not a hand-made copy", () => {
    const catalog = readJson(join(publicRoot, "catalog.json")) as Catalog;
    const entry = catalog.datasets.find((d) => d.dataset === "wyscout");
    const published = readJson(join(publicRoot, entry?.scenes[0]?.path ?? "")) as Scene;
    const fixture = readJson(join(root, "src", "scene", "fixtures", "reconstruction.json"));
    expect(fixture).toEqual(published);
  });
});
