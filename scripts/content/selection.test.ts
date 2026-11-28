// Proves the build-time selection on real build output (threat T-05-06): the study build carries
// no fixture, the fixtures build carries the fixture's MDX chunk and a Vite manifest.
// Vite is spawned by path with process.execPath and no shell, as scripts/smoke.ts does.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const ROOT = process.cwd();
const VITE = join(ROOT, "node_modules", "vite", "bin", "vite.js");
const FIXTURE_DIR = join(ROOT, "content", "_fixtures", "fx-a-goal-in-ten-actions");
const FIXTURE_MDX = "content/_fixtures/fx-a-goal-in-ten-actions/lesson.mdx";
const fixtureTitle: string = JSON.parse(
  readFileSync(join(FIXTURE_DIR, "lesson.json"), "utf8"),
).title;

const temps: string[] = [];

afterEach(() => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

/** Runs `vite build` into a fresh temp folder and returns it. */
function build(includeFixtures: boolean): string {
  const outDir = mkdtempSync(join(tmpdir(), "tnk-selection-"));
  temps.push(outDir);
  // The child must not inherit vitest's mode or a stray flag from the parent shell.
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key === "NODE_ENV" || key === "MODE" || key.startsWith("VITEST")) delete env[key];
  }
  delete env.VITE_INCLUDE_FIXTURES;
  if (includeFixtures) env.VITE_INCLUDE_FIXTURES = "1";
  const result = spawnSync(
    process.execPath,
    [VITE, "build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "error"],
    { cwd: ROOT, env, shell: false, encoding: "utf8" },
  );
  expect(result.status, `vite build failed: ${result.stderr}`).toBe(0);
  return outDir;
}

function chunksWith(outDir: string, needle: string): string[] {
  const assets = join(outDir, "assets");
  return readdirSync(assets)
    .filter((name) => name.endsWith(".js"))
    .filter((name) => readFileSync(join(assets, name), "utf8").includes(needle));
}

describe("build-time lesson selection", () => {
  it("reads the fixture title from its lesson.json", () => {
    expect(fixtureTitle.length).toBeGreaterThan(0);
  });

  it("study build: no chunk holds the fixture and no manifest is written", () => {
    const outDir = build(false);
    expect(chunksWith(outDir, fixtureTitle)).toEqual([]);
    expect(existsSync(join(outDir, ".vite", "manifest.json"))).toBe(false);
  }, 120_000);

  it("fixtures build: the fixture's MDX becomes a chunk and the manifest lists it", () => {
    const outDir = build(true);
    expect(chunksWith(outDir, fixtureTitle).length).toBeGreaterThanOrEqual(1);
    const manifestPath = join(outDir, ".vite", "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);
    const manifest: Record<string, { file: string }> = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    );
    const entry = manifest[FIXTURE_MDX];
    expect(entry, `manifest has ${FIXTURE_MDX}`).toBeDefined();
    expect(existsSync(join(outDir, entry?.file ?? "missing"))).toBe(true);
  }, 120_000);
});
