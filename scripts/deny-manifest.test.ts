// Keeps the deny-manifest, the source allow-list, the git guard, the ADR and .gitignore in sync
// (PIPE-03). A new local-only source cannot skip a gate without one of these failing.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadDenyManifest } from "./lib/globs.ts";
import { LOCAL_ONLY_DATASETS, SHIP_DATASETS } from "./lib/guard.ts";

const MANIFEST = loadDenyManifest("deploy/deny-manifest.json");

interface AllowSource {
  id: string;
  shippable: boolean;
}

const SOURCES: AllowSource[] = JSON.parse(
  readFileSync("pipeline/sources.allow.json", "utf8"),
).sources;

const localOnly = SOURCES.filter((s) => !s.shippable)
  .map((s) => s.id)
  .sort();
const shippable = SOURCES.filter((s) => s.shippable)
  .map((s) => s.id)
  .sort();

describe("deny-manifest consistency", () => {
  it("localOnlyDatasets equals the allow-list sources with shippable false", () => {
    expect([...MANIFEST.localOnlyDatasets].sort()).toEqual(localOnly);
  });

  it("shipDirs equals public/data/<id>/** for the shippable sources", () => {
    expect([...MANIFEST.shipDirs].sort()).toEqual(shippable.map((id) => `public/data/${id}/**`));
  });

  it("guard.ts constants equal the manifest", () => {
    expect([...LOCAL_ONLY_DATASETS].sort()).toEqual(localOnly);
    expect([...SHIP_DATASETS].sort()).toEqual(shippable);
  });

  it("every local-only dataset has a deny glob and a content marker", () => {
    for (const id of localOnly) {
      expect(MANIFEST.denyGlobs).toContain(`public/data/${id}/**`);
      expect(MANIFEST.contentMarkers).toContain(`data/${id}/`);
    }
  });

  it("scope keeps the token globs off the rest of the repository", () => {
    expect(MANIFEST.scope).toEqual(["public/**", "dist/**"]);
  });

  it("contains every ADR 0008 deny pattern", () => {
    const adr = readFileSync("docs/decisions/0008-watch-gym-l1-clip-supply.md", "utf8");
    const start = adr.indexOf("### Deploy deny-manifest");
    const end = adr.indexOf("Reversibility", start);
    const section = adr.slice(start, end);
    const bullets = section.split("\n").filter((l) => l.startsWith("- `"));
    const denyBullets = bullets.filter((l) => !l.startsWith("- Only"));
    const denyPatterns = denyBullets
      .flatMap((l) => l.match(/`([^`]+)`/g) ?? [])
      .map((m) => m.slice(1, -1));
    expect(denyPatterns.length).toBeGreaterThanOrEqual(6);
    for (const pattern of denyPatterns) {
      expect(MANIFEST.denyGlobs, pattern).toContain(pattern);
    }
    const shipLine = section.split("\n").find((l) => l.startsWith("- Only paths")) ?? "";
    const shipPatterns = (shipLine.match(/`([^`]+)`/g) ?? []).map((m) => m.slice(1, -1));
    expect(shipPatterns.length).toBeGreaterThan(0);
    for (const pattern of shipPatterns) {
      expect(MANIFEST.shipDirs, pattern).toContain(pattern);
    }
  });
});

describe(".gitignore local-only block", () => {
  it.each(localOnly)("ignores local-only dataset %s under data/ and public/data/", (id) => {
    for (const path of [`data/${id}/x.json`, `public/data/${id}/x.json`]) {
      const r = spawnSync("git", ["check-ignore", "-q", path], { encoding: "utf8" });
      expect(r.status, path).toBe(0);
    }
  });

  it("does not ignore the shipped dataset folders", () => {
    for (const id of shippable) {
      const r = spawnSync("git", ["check-ignore", "-q", `public/data/${id}/v1-abc/scene.json`], {
        encoding: "utf8",
      });
      expect(r.status, id).toBe(1);
    }
  });
});
