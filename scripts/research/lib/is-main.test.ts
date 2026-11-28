// isMainModule must see through a directory junction or symlink in the argv path (WR-02).
import { mkdtempSync, rmdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isMainModule } from "./is-main.ts";

describe("isMainModule", () => {
  it("is false without an argv path", () => {
    expect(isMainModule(import.meta.filename, undefined)).toBe(false);
  });

  it("is true for the same path and false for another file", () => {
    expect(isMainModule(import.meta.filename, import.meta.filename)).toBe(true);
    expect(isMainModule(import.meta.filename, join(import.meta.dirname, "views.ts"))).toBe(false);
  });

  it("is true when argv goes through a directory junction", () => {
    const real = mkdtempSync(join(tmpdir(), "is-main-real-"));
    const holder = mkdtempSync(join(tmpdir(), "is-main-link-"));
    const link = join(holder, "link");
    try {
      const file = join(real, "m.ts");
      writeFileSync(file, "export {};\n");
      symlinkSync(real, link, "junction");
      expect(isMainModule(file, join(link, "m.ts"))).toBe(true);
    } finally {
      try {
        rmdirSync(link);
      } catch {
        // link was never created
      }
      rmSync(real, { recursive: true, force: true });
      rmSync(holder, { recursive: true, force: true });
    }
  });
});
