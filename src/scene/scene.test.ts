// Scene fixtures: every top-level src/scene/fixtures/*.json must pass ajv (strict, 2020-12),
// the Zod mirror and the semantic integrity checks.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { sceneSchema } from "./schema.ts";

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
  it("has a fixture for the authored kind", () => {
    expect(fixtureFiles).toContain("authored.json");
  });

  it.each(fixtureFiles)("%s passes ajv and Zod", (file) => {
    const doc = readJson(join(fixturesDir, file));
    const ok = validate(doc) as boolean;
    expect(ok, JSON.stringify(validate.errors ?? [])).toBe(true);
    const parsed = sceneSchema.safeParse(doc);
    expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [])).toBe(true);
  });
});
