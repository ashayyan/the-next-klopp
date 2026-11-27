// verify-setup section: model routing and Fable log (SETUP-02).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const gsdTools = join(homedir(), ".claude", "gsd-core", "bin", "gsd-tools.cjs");

const EXPECTED_TIERS: Record<string, string> = {
  "gsd-research-synthesizer": "opus",
  "gsd-ui-researcher": "opus",
  "gsd-roadmapper": "opus",
  "gsd-planner": "opus",
  "gsd-executor": "sonnet",
  "gsd-verifier": "sonnet",
  "gsd-codebase-mapper": "haiku",
};

const FABLE_LOG_HEADER =
  "| Date | Milestone | Question | Why Opus was not enough | Result | Worth it? |";

function fail(message: string): never {
  console.error(`verify routing: FAIL - ${message}`);
  process.exit(1);
}

function gsd(args: string[]): string {
  const result = spawnSync(process.execPath, [gsdTools, ...args], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    fail(`gsd-tools ${args.join(" ")} exited ${result.status}: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

if (!existsSync(gsdTools)) fail(`gsd-tools.cjs not found at ${gsdTools}`);

const profile = gsd(["query", "config-get", "model_profile", "--raw"]);
if (profile !== "balanced") fail(`model_profile is "${profile}", expected "balanced"`);

for (const [agent, tier] of Object.entries(EXPECTED_TIERS)) {
  const actual = gsd(["query", "resolve-model", agent, "--pick", "tier"]);
  if (actual !== tier) fail(`${agent} resolves to "${actual}", expected "${tier}"`);
}

const config = JSON.parse(readFileSync(join(root, ".planning", "config.json"), "utf8")) as {
  model_overrides?: Record<string, unknown>;
};
for (const [agent, value] of Object.entries(config.model_overrides ?? {})) {
  if (String(value).toLowerCase().includes("fable")) {
    fail(`model_overrides.${agent} routes to fable; Fable runs only through docs/FABLE_LOG.md`);
  }
}

const logPath = join(root, "docs", "FABLE_LOG.md");
if (!existsSync(logPath)) fail("docs/FABLE_LOG.md is missing");
const log = readFileSync(logPath, "utf8");
if (!log.includes("3 per milestone")) fail('docs/FABLE_LOG.md lacks "3 per milestone"');
for (const n of [1, 2, 3, 4]) {
  if (!new RegExp(`^${n}\\. `, "m").test(log)) fail(`docs/FABLE_LOG.md lacks numbered step ${n}.`);
}
if (!log.includes(FABLE_LOG_HEADER)) fail("docs/FABLE_LOG.md lacks the log table header");

console.log("verify routing: ok");
