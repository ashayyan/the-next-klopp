// Behaviour tests for the artifact immutability gate (PIPE-03, T-03-23): published version
// directories may only gain files. Parser cases are pure; CLI cases use a throwaway git repo.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findImmutableViolations, parseNameStatus } from "./check-immutable.ts";

const SCRIPT = resolve("scripts/check-immutable.ts");

function out(lines: string[]): string {
  return `${lines.join("\n")}\n`;
}

describe("parseNameStatus", () => {
  it("passes additions in version directories", () => {
    const text = out([
      "A\tdata/wyscout/v1-abc/scene.json",
      "A\tpublic/data/dfl/v1-abc/manifest.json",
    ]);
    expect(findImmutableViolations(parseNameStatus(text))).toEqual([]);
  });

  it.each([
    ["M", "M\tdata/wyscout/v1-abc/scene.json", "data/wyscout/v1-abc/scene.json"],
    [
      "D",
      "D\tpublic/data/wyscout/v1-abc/manifest.json",
      "public/data/wyscout/v1-abc/manifest.json",
    ],
    [
      "R100",
      "R100\tdata/wyscout/v1-abc/a.json\tdata/wyscout/v1-abc/b.json",
      "data/wyscout/v1-abc/a.json",
    ],
  ])("fails %s inside a version directory", (_name, line, path) => {
    const violations = findImmutableViolations(parseNameStatus(out([line])));
    expect(violations.map((v) => v.path)).toEqual([path]);
  });

  it("fails a rename that moves a file out of a version directory", () => {
    const text = out(["R090\tdata/wyscout/v1-abc/a.json\tdocs/a.json"]);
    expect(findImmutableViolations(parseNameStatus(text))).toHaveLength(1);
  });

  it("treats a rename into a version directory as an addition", () => {
    const text = out(["R100\tdocs/a.json\tdata/wyscout/v1-abc/a.json"]);
    expect(findImmutableViolations(parseNameStatus(text))).toEqual([]);
  });

  it("lets catalog.json change", () => {
    const text = out(["M\tpublic/data/catalog.json", "M\tdata/catalog.json"]);
    expect(findImmutableViolations(parseNameStatus(text))).toEqual([]);
  });

  it("ignores paths outside the data trees", () => {
    const text = out(["M\tsrc/App.tsx", "D\tpipeline/src/x.py", "M\tpublic/favicon.svg"]);
    expect(findImmutableViolations(parseNameStatus(text))).toEqual([]);
  });

  it("is case-insensitive and accepts backslashes", () => {
    const text = out(["M\tDATA\\Wyscout\\v1-abc\\scene.json"]);
    expect(findImmutableViolations(parseNameStatus(text))).toHaveLength(1);
  });
});

describe("check-immutable CLI", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  function git(cwd: string, args: string[]) {
    const r = spawnSync(
      "git",
      [
        "-c",
        "user.name=t",
        "-c",
        "user.email=t@example.com",
        "-c",
        "commit.gpgsign=false",
        ...args,
      ],
      { cwd, encoding: "utf8" },
    );
    if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout;
  }

  function repo(): string {
    const root = mkdtempSync(join(tmpdir(), "klopp-imm-"));
    dirs.push(root);
    git(root, ["init", "-q"]);
    put(root, "data/wyscout/v1-abc/scene.json", '{"a":1}');
    put(root, "public/data/catalog.json", '{"v":1}');
    git(root, ["add", "-A"]);
    git(root, ["commit", "-q", "-m", "base"]);
    return root;
  }

  function put(root: string, rel: string, body: string): void {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }

  function run(cwd: string, args: string[]) {
    return spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: "utf8" });
  }

  it("--base passes when only additions and a catalog edit follow the base", () => {
    const root = repo();
    put(root, "data/wyscout/v2-def/scene.json", '{"b":1}');
    put(root, "public/data/catalog.json", '{"v":2}');
    git(root, ["add", "-A"]);
    git(root, ["commit", "-q", "-m", "add"]);
    const r = run(root, ["--base", "HEAD~1"]);
    expect(r.status).toBe(0);
  });

  it("--base fails when a version file was modified", () => {
    const root = repo();
    put(root, "data/wyscout/v1-abc/scene.json", '{"a":2}');
    git(root, ["add", "-A"]);
    git(root, ["commit", "-q", "-m", "mutate"]);
    const r = run(root, ["--base", "HEAD~1"]);
    expect(r.status).toBe(1);
    expect(`${r.stdout}${r.stderr}`).toContain("data/wyscout/v1-abc/scene.json");
  });

  it("--staged fails on a staged modification", () => {
    const root = repo();
    put(root, "data/wyscout/v1-abc/scene.json", '{"a":3}');
    git(root, ["add", "-A"]);
    expect(run(root, ["--staged"]).status).toBe(1);
  });

  it("--staged passes with nothing staged", () => {
    expect(run(repo(), ["--staged"]).status).toBe(0);
  });

  it("an all-zero base exits 0 with a note", () => {
    const r = run(repo(), ["--base", "0000000000000000000000000000000000000000"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/first push/);
  });

  it("an unknown ref exits 2", () => {
    expect(run(repo(), ["--base", "no-such-ref"]).status).toBe(2);
  });

  it("bad arguments exit 2", () => {
    expect(run(repo(), []).status).toBe(2);
    expect(run(repo(), ["--base"]).status).toBe(2);
  });
});
