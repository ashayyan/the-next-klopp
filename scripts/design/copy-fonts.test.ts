// copy-fonts tests: byte-identical copies, licence record, budget, and the --check and --prune
// modes. Check and prune cases run on a temporary root; the repo tree is only read.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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
