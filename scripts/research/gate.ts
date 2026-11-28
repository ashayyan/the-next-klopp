// CLI: node scripts/research/gate.ts  (npm run research:gate)
// Runs the research tests with RESEARCH_GATE=1 so the all-ten-domains completeness test is
// active. Spawns node with an argument array (no shell string), so spaces in the project path
// are safe.
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const result = spawnSync(
  process.execPath,
  [join(root, "node_modules", "vitest", "vitest.mjs"), "run", "scripts/research"],
  { cwd: root, env: { ...process.env, RESEARCH_GATE: "1" }, stdio: "inherit" },
);
process.exit(result.status ?? 1);
