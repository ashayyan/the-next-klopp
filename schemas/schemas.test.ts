// Dual-validator agreement test (SETUP-07): ajv (strict, 2020-12) and the hand-written Zod mirror
// must reach the same verdict on every fixture of every contract schema. Every invalid fixture
// also names the JSON Pointer it must fail at (`expect_path`), and both validators must report it,
// so a fixture cannot pass because both validators reject it for an unrelated reason.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { contractSchemas } from "../src/schemas/contracts.ts";

const schemasDir = import.meta.dirname;
const fixturesDir = join(schemasDir, "fixtures");

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
ajv.addSchema(readJson(join(schemasDir, "common.schema.json")) as object);

interface FixtureEntry {
  name: string;
  reason?: string;
  /** JSON Pointer both validators must report; required on invalid fixtures. */
  expect_path?: string;
  doc: unknown;
}

interface AjvErrorLike {
  instancePath: string;
  params: Record<string, unknown>;
}
interface ZodIssueLike {
  code: string;
  path: PropertyKey[];
  keys?: string[];
}

/** JSON Pointers where ajv reports a failure; a missing or extra property is reported at that property. */
function ajvPaths(errors: AjvErrorLike[] | null | undefined): string[] {
  return (errors ?? []).map((e) => {
    const missing = e.params.missingProperty;
    const extra = e.params.additionalProperty;
    if (typeof missing === "string") return `${e.instancePath}/${missing}`;
    if (typeof extra === "string") return `${e.instancePath}/${extra}`;
    return e.instancePath;
  });
}

/** JSON Pointers where Zod reports a failure, in the same shape as ajvPaths. */
function zodPaths(issues: ZodIssueLike[]): string[] {
  return issues.flatMap((issue) => {
    const base = issue.path.map((p) => `/${String(p)}`).join("");
    if (issue.code === "unrecognized_keys") return (issue.keys ?? []).map((k) => `${base}/${k}`);
    return [base];
  });
}
interface FixtureFile {
  valid: FixtureEntry[];
  invalid: FixtureEntry[];
}

const schemaNames = readdirSync(schemasDir)
  .filter((f) => f.endsWith(".schema.json") && f !== "common.schema.json")
  .map((f) => f.slice(0, -".schema.json".length))
  .sort();

describe("contract schemas", () => {
  it("every schema file has a Zod mirror and every mirror has a schema file", () => {
    expect(schemaNames).toEqual(Object.keys(contractSchemas).sort());
  });

  it("has at least one contract schema", () => {
    expect(schemaNames.length).toBeGreaterThan(0);
  });
});

const mirrors = contractSchemas as unknown as Record<
  string,
  {
    safeParse: (v: unknown) => { success: boolean; error?: { issues: ZodIssueLike[] } };
  }
>;

describe.each(schemaNames)("%s schema", (name) => {
  const schema = readJson(join(schemasDir, `${name}.schema.json`)) as { $id?: string };
  const fixturesPath = join(fixturesDir, `${name}.fixtures.json`);
  const fixtures = readJson(fixturesPath) as FixtureFile;
  const validate = ajv.compile(schema);
  const mirror = mirrors[name];

  it("compiles under ajv strict mode and has a Zod mirror", () => {
    expect(typeof validate).toBe("function");
    expect(mirror).toBeDefined();
  });

  it("has at least one valid and one invalid fixture", () => {
    expect(fixtures.valid.length).toBeGreaterThanOrEqual(1);
    expect(fixtures.invalid.length).toBeGreaterThanOrEqual(1);
  });

  const cases: Array<[string, FixtureEntry, boolean]> = [
    ...fixtures.valid.map((f): [string, FixtureEntry, boolean] => [`valid: ${f.name}`, f, true]),
    ...fixtures.invalid.map((f): [string, FixtureEntry, boolean] => [
      `invalid: ${f.name}`,
      f,
      false,
    ]),
  ];

  it.each(cases)("%s: ajv and Zod agree", (_label, fixture, expected) => {
    const ajvOk = validate(fixture.doc) as boolean;
    const zodResult = mirror?.safeParse(fixture.doc);
    const zodOk = zodResult?.success ?? false;
    const detail = JSON.stringify(validate.errors ?? []);
    expect(ajvOk, `ajv verdict for ${fixture.name} (${detail})`).toBe(expected);
    expect(zodOk, `Zod verdict for ${fixture.name} (${fixture.reason ?? "valid"})`).toBe(expected);
    if (expected) return;
    expect(fixture.expect_path, `invalid fixture ${fixture.name} needs expect_path`).toBeDefined();
    const want = fixture.expect_path as string;
    expect(
      ajvPaths(validate.errors as AjvErrorLike[]),
      `ajv failure paths for ${fixture.name}`,
    ).toContain(want);
    expect(
      zodPaths(zodResult?.error?.issues ?? []),
      `Zod failure paths for ${fixture.name}`,
    ).toContain(want);
  });
});
