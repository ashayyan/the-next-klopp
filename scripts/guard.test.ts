// Demonstrates that the repo guard rejects raw-data paths, oversized files and secrets (SETUP-04).
// Every fake secret is assembled at runtime from fragments so neither this repo's guard nor an
// external scanner flags this file itself (RESEARCH Pattern 2, Pitfall 7).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkFile, findSecrets, MAX_FILE_BYTES } from "./lib/guard.ts";

function rules(path: string, size = 10, content: string | null = null): string[] {
  return checkFile({ path, size, content }).map((v) => v.rule);
}

// Runtime-built fake secrets.
const awsPrefix = ["AK", "IA"].join("");
const awsBody = ["ABCDEFGH", "12345678"].join("");
const fakeAws = awsPrefix + awsBody;
const fakeAwsExample = `${awsPrefix}IOSFODNN7EXAMPLE`;
const fakeGithub = ["gh", "p_"].join("") + "a".repeat(36);
const fakePem = ["-----BEGIN", "RSA", "PRIVATE", "KEY-----"].join(" ");
const fakeAssignment = `${["api", "_key"].join("")} = "${"x".repeat(20)}"`;

describe("guard: denied paths", () => {
  it.each(["raw/x.txt", "data/raw/pl.json", "pipeline/data/raw/a.csv", "data\\raw\\b.csv"])(
    "rejects raw-data path %s",
    (p) => {
      expect(rules(p)).toContain("denied-path");
    },
  );

  it.each([".env", ".env.local"])("rejects env file %s", (p) => {
    expect(rules(p)).toContain("denied-path");
  });

  it("allows .env.example", () => {
    expect(rules(".env.example")).toEqual([]);
  });

  it("rejects parquet outside public/data/", () => {
    expect(rules("data/derived/x.parquet")).toContain("denied-path");
  });

  it("allows parquet under public/data/", () => {
    expect(rules("public/data/pl-2024/shots.parquet")).toEqual([]);
  });
});

describe("guard: file size", () => {
  it("rejects a file one byte over the limit", () => {
    expect(rules("src/big.bin", MAX_FILE_BYTES + 1)).toContain("oversize");
  });

  it("allows a file exactly at the limit", () => {
    expect(rules("src/big.bin", MAX_FILE_BYTES)).not.toContain("oversize");
  });
});

describe("guard: secrets", () => {
  it("rejects an AWS-shaped access key", () => {
    expect(rules("src/a.ts", 10, `key: ${fakeAws}`)).toContain("secret:aws-access-key");
  });

  it("ignores a documented EXAMPLE access key", () => {
    expect(rules("src/a.ts", 10, `key: ${fakeAwsExample}`)).not.toContain("secret:aws-access-key");
  });

  it("rejects a GitHub token", () => {
    expect(rules("src/a.ts", 10, fakeGithub)).toContain("secret:github-token");
  });

  it("rejects a PEM private-key header", () => {
    expect(rules("src/a.ts", 10, fakePem)).toContain("secret:private-key");
  });

  it("rejects a quoted api_key assignment", () => {
    expect(rules("src/a.ts", 10, fakeAssignment)).toContain("secret:generic-secret-assignment");
  });

  it("finds nothing in ordinary text", () => {
    expect(findSecrets("const answer = 42; // nothing to see")).toEqual([]);
  });

  it("self-scan: the guard's own source holds no secret-shaped text", () => {
    const own = readFileSync(new URL("./lib/guard.ts", import.meta.url), "utf8");
    expect(findSecrets(own)).toEqual([]);
  });
});

describe("guard: CLI", () => {
  it("exits 2 on an unknown flag", () => {
    const r = spawnSync(process.execPath, ["scripts/guard-files.ts", "--bogus"], {
      encoding: "utf8",
    });
    expect(r.status).toBe(2);
  });

  it("exits 0 on --tracked for the current tree", () => {
    const r = spawnSync(process.execPath, ["scripts/guard-files.ts", "--tracked"], {
      encoding: "utf8",
    });
    expect(r.status).toBe(0);
  });
});
