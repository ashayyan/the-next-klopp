// copy-fonts tests: byte-identical copies, licence record, budget, and the --check and --prune
// modes. Check and prune cases run on a temporary root; the repo tree is only read.
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collectReferences, FONT_BUDGET_BYTES } from "./copy-fonts.ts";
import { DIRECTION_DIR } from "./tokens.ts";

const root = join(import.meta.dirname, "..", "..");
const packages = join(root, "node_modules", "@fontsource-variable");
const SCRIPT = join(root, "scripts", "design", "copy-fonts.ts");
const run = (args: string[]) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: "utf8" });

/** A temp root holding only the token sets; fonts come from the repo's node_modules. */
function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "tnk-fonts-"));
  mkdirSync(join(dir, DIRECTION_DIR), { recursive: true });
  for (const f of readdirSync(join(root, DIRECTION_DIR))) {
    if (f.endsWith(".tokens.json"))
      cpSync(join(root, DIRECTION_DIR, f), join(dir, DIRECTION_DIR, f));
  }
  return dir;
}

const args = (dir: string, ...more: string[]) => ["--root", dir, "--packages", packages, ...more];
const MONA = "mona-sans/mona-sans-latin-wdth-normal.woff2";

describe("tracer: Mona Sans is copied byte for byte with its licence", () => {
  const dir = tempRoot();
  const r = run(args(dir));

  it("exits 0", () => {
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
  });

  it("copies the Mona Sans file unmodified", () => {
    const copied = readFileSync(join(dir, "public", "fonts", MONA));
    const source = readFileSync(
      join(packages, "mona-sans", "files", "mona-sans-latin-wdth-normal.woff2"),
    );
    expect(Buffer.compare(copied, source)).toBe(0);
  });

  it("writes a Mona Sans section with package, version, OFL-1.1 and the copyright line", () => {
    const md = readFileSync(join(dir, "public", "fonts", "LICENSES.md"), "utf8");
    expect(md).toContain("## Mona Sans");
    expect(md).toContain("@fontsource-variable/mona-sans 5.3.0");
    expect(md).toContain("OFL-1.1");
    expect(md).toContain("Copyright 2022 The Mona Sans Project Authors");
    expect(md).toContain("SIL Open Font License");
  });
});

describe("all seven families", () => {
  const refs = collectReferences(root);
  const files = [...new Set(refs.flatMap((i) => i.refs.map((x) => x.src)))];

  it("references seven families and eight files across the three directions", () => {
    expect(new Set(refs.flatMap((i) => i.refs.map((x) => x.family))).size).toBe(7);
    expect(files).toHaveLength(7);
  });

  it("serves every referenced file from public/fonts, byte for byte", () => {
    for (const i of refs) {
      for (const f of i.refs) {
        const shipped = readFileSync(join(root, "public", f.src));
        const source = readFileSync(join(packages, f.family, "files", f.file));
        expect(Buffer.compare(shipped, source), f.src).toBe(0);
      }
    }
  });

  it("keeps each token input within 200 KB of fonts", () => {
    for (const i of refs) {
      const total = i.refs.reduce((n, f) => n + statSync(join(root, "public", f.src)).size, 0);
      expect(total, i.input).toBeLessThanOrEqual(FONT_BUDGET_BYTES);
    }
  });

  it("lists one OFL-1.1 section per family with version 5.3.0 and the licence text", () => {
    const md = readFileSync(join(root, "public", "fonts", "LICENSES.md"), "utf8");
    expect(md.match(/^## /gm)).toHaveLength(7);
    expect(md.match(/- Licence: OFL-1\.1/g)).toHaveLength(7);
    expect(md.match(/ 5\.3\.0$/gm)).toHaveLength(7);
    expect(md.match(/SIL Open Font License, Version 1\.1/g)?.length).toBeGreaterThanOrEqual(7);
  });

  it("--check exits 0 on the repo tree", () => {
    const check = run(["--check"]);
    expect(check.stderr).toBe("");
    expect(check.status).toBe(0);
  });
});

describe("--check and --prune", () => {
  it("--check exits 0 on a freshly copied tree", () => {
    const dir = tempRoot();
    expect(run(args(dir)).status).toBe(0);
    const check = run(args(dir, "--check"));
    expect(check.status).toBe(0);
    expect(check.stdout).toContain("fonts ok");
  });

  it("--check exits 1 and names the file after one byte of a font changes", () => {
    const dir = tempRoot();
    run(args(dir));
    const file = join(dir, "public", "fonts", MONA);
    const bytes = readFileSync(file);
    bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 0xff;
    writeFileSync(file, bytes);
    const check = run(args(dir, "--check"));
    expect(check.status).toBe(1);
    expect(check.stderr).toContain(`differs from package: /fonts/${MONA}`);
  });

  it("--check exits 1 for a missing file, a stale licence file and an unreferenced font", () => {
    const dir = tempRoot();
    run(args(dir));
    mkdirSync(join(dir, "public", "fonts", "extra-face"), { recursive: true });
    writeFileSync(
      join(dir, "public", "fonts", "extra-face", "extra-face-latin-wght-normal.woff2"),
      "x",
    );
    writeFileSync(join(dir, "public", "fonts", "LICENSES.md"), "old\n");
    const check = run(args(dir, "--check"));
    expect(check.status).toBe(1);
    expect(check.stderr).toContain(
      "unreferenced: /fonts/extra-face/extra-face-latin-wght-normal.woff2",
    );
    expect(check.stderr).toContain("stale: public/fonts/LICENSES.md");
    const missingDir = tempRoot();
    expect(run(args(missingDir, "--check")).stderr).toContain(`missing: /fonts/${MONA}`);
  });

  it("--prune removes an unreferenced family folder and keeps referenced ones", () => {
    const dir = tempRoot();
    run(args(dir));
    const extra = join(dir, "public", "fonts", "extra-face");
    mkdirSync(extra, { recursive: true });
    writeFileSync(join(extra, "extra-face-latin-wght-normal.woff2"), "x");
    const pruned = run(args(dir, "--prune"));
    expect(pruned.status).toBe(0);
    expect(existsSync(extra)).toBe(false);
    expect(existsSync(join(dir, "public", "fonts", MONA))).toBe(true);
    expect(run(args(dir, "--check")).status).toBe(0);
  });

  it("exits 2 on an unknown option and when --family meets --check", () => {
    expect(run(["--nope"]).status).toBe(2);
    expect(run(["--family", "mona-sans", "--check"]).status).toBe(2);
  });
});
