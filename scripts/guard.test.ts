// Demonstrates that the repo guard rejects raw-data paths, oversized files and secrets (SETUP-04).
// Every fake secret is assembled at runtime from fragments so neither this repo's guard nor an
// external scanner flags this file itself (RESEARCH Pattern 2, Pitfall 7).
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  checkFile,
  decodeForScan,
  findSecrets,
  isDeniedPath,
  MAX_FILE_BYTES,
} from "./lib/guard.ts";

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
const fakeStripe = ["sk", "_live_"].join("") + "a1B2c3D4".repeat(3);
const fakeGoogle = ["AI", "za"].join("") + "A".repeat(35);
const fakeNpm = ["npm", "_"].join("") + "a1".repeat(18);
const fakeBearer = `${["Authorization", ": Bearer "].join("")}${"abcdEFGH1234".repeat(2)}`;
const fakeAwsSecret = `${["aws_secret", "_access_key"].join("")} = "${"aB3/".repeat(10)}"`;

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

  it.each([
    ".ENV",
    ".Env.Local",
    "Raw/a.csv",
    "data/RAW/a",
    "Feedback/x",
    "sub/node_modules/x.js",
    "a/dist/x.js",
    "Public/Pyodide/x.wasm",
  ])("rejects case or depth variant %s", (p) => {
    expect(rules(p)).toContain("denied-path");
  });

  it.each(["x.webm", "clip.M4V", "a.wmv", "x.sqlite3", "x.db-wal", "x.db-shm"])(
    "rejects media or database file %s",
    (p) => {
      expect(rules(p)).toContain("denied-path");
    },
  );

  it("allows .env.example in any case", () => {
    expect(rules(".ENV.EXAMPLE")).toEqual([]);
  });

  it("allows .env.example", () => {
    expect(rules(".env.example")).toEqual([]);
  });

  it("rejects parquet outside public/data/", () => {
    expect(rules("data/derived/x.parquet")).toContain("denied-path");
  });

  it("allows parquet under public/data/", () => {
    expect(rules("public/data/wyscout/v1-abc/shots.parquet")).toEqual([]);
  });

  // The fixtures build output and the Vercel link folder (account-specific ids) never enter git.
  it.each([
    "dist-walker/index.html",
    "dist-walker/.vite/manifest.json",
    "Dist-Walker/assets/a.js",
    ".vercel/project.json",
    ".VERCEL/README.txt",
    "sub/.vercel/project.json",
  ])("rejects fixtures build or Vercel link path %s", (p) => {
    expect(rules(p)).toContain("denied-path");
  });
});

describe("guard: local-only datasets (ADR 0008)", () => {
  it.each([
    "data/statsbomb/v1-abc/scene-x.json",
    "DATA/StatsBomb/a.json",
    "sub/data/metrica/a.json",
    "data/last-row/clip.json",
    "data\\skillcorner\\a.json",
    "public/data/skillcorner/a.json",
    "public/data/statsbomb/v1-abc/manifest.json",
    "public/data/other/a.json",
    "public/data/stray.json",
    "public/metrica/sample.csv",
    "public/.cache/statsbomb.json",
    "public/clips/SkillCorner-a.json",
  ])("rejects %s", (p) => {
    expect(rules(p)).toContain("denied-path");
  });

  it.each([
    "data/wyscout/v1-abc/scene-x.json",
    "public/data/wyscout/v1-abc/manifest.json",
    "public/data/dfl/v1-abc/scene-y.json",
    "public/data/catalog.json",
    "pipeline/src/klopp_pipeline/recipes/statsbomb_shot.py",
    "docs/decisions/0008-watch-gym-l1-clip-supply.md",
  ])("allows %s", (p) => {
    expect(rules(p)).toEqual([]);
  });

  it("names the local-only reason", () => {
    expect(isDeniedPath("data/statsbomb/a.json")).toMatch(/local-only/);
  });

  it("denies the learner brief even when force-added", () => {
    expect(isDeniedPath("NEW_PROJECT_INPUT.md")).toBe("learner brief");
    expect(isDeniedPath("docs/new_project_input.md")).toBe("learner brief");
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

  it.each([
    ["password with symbols", `${["pass", "word"].join("")} = "P@ss!w0rd#longlongpass"`],
    ["hyphenated api-key", `${["api", "-key"].join("")}: "${"x".repeat(20)}"`],
    ["backtick token", `const ${["to", "ken"].join("")} = \`${"y".repeat(20)}\``],
    ["authorization header", fakeBearer],
    ["aws secret access key", fakeAwsSecret],
    ["stripe live key", fakeStripe],
    ["google api key", fakeGoogle],
    ["npm token", fakeNpm],
  ])("rejects %s", (_name, text) => {
    expect(findSecrets(text).length).toBeGreaterThan(0);
  });

  it("ignores template placeholders in assignments", () => {
    const text = `${["to", "ken"].join("")} = "${"$"}{PLACEHOLDER_VALUE_HERE}"`;
    expect(findSecrets(text)).toEqual([]);
  });

  it("scans text that contains NUL bytes (leading NUL)", () => {
    const bytes = Buffer.from(`\0${fakeGithub}`, "latin1");
    expect(findSecrets(decodeForScan(bytes))).toContain("github-token");
  });

  it("scans UTF-16 encoded text", () => {
    const bytes = Buffer.from(fakeGithub, "utf16le");
    expect(findSecrets(decodeForScan(bytes))).toContain("github-token");
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
