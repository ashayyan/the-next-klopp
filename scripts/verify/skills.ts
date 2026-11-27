// verify-setup section: project-local agent skills (SETUP-01).
// Checks skills-lock.json, real (non-symlink) skill files, forbidden promotional skills,
// and that GSD injects the project-local taste skill without warnings.
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const root = process.cwd();

const DESIGN_SKILLS = ["design-taste-frontend", "web-design-guidelines", "ui-ux-pro-max"];
const KDENSE_SKILLS = [
  "statistical-analysis",
  "scikit-learn",
  "statsmodels",
  "matplotlib",
  "scientific-visualization",
  "literature-review",
  "scientific-writing",
  "peer-review",
  "shap",
  "experimental-design",
  "exploratory-data-analysis",
  "scientific-critical-thinking",
  "citation-management",
  "hypothesis-generation",
];
const REQUIRED = [...DESIGN_SKILLS, ...KDENSE_SKILLS];
const FORBIDDEN = [
  "offer-k-dense-web",
  "autoskill",
  "parallel-web",
  "exa-search",
  "get-available-resources",
];
const AGENTS = [
  "gsd-executor",
  "gsd-planner",
  "gsd-ui-researcher",
  "gsd-ui-checker",
  "gsd-ui-auditor",
];
const TASTE_PATH = ".claude/skills/design-taste-frontend/SKILL.md";

function fail(message: string): never {
  console.error(`verify skills: FAIL - ${message}`);
  process.exit(1);
}

function isSymlink(path: string): boolean {
  return lstatSync(path).isSymbolicLink();
}

const lockPath = join(root, "skills-lock.json");
if (!existsSync(lockPath)) fail("skills-lock.json is missing");

let lock: { skills?: Record<string, { installMode?: string; commit?: string }> };
try {
  lock = JSON.parse(readFileSync(lockPath, "utf8"));
} catch (error) {
  fail(`skills-lock.json is not valid JSON (${(error as Error).message})`);
}
const lockSkills = lock.skills ?? {};

for (const name of REQUIRED) {
  const entry = lockSkills[name];
  if (!entry) fail(`skills-lock.json has no entry for ${name}`);
  if (entry.installMode !== "copy") fail(`${name} lock entry installMode is not "copy"`);
  if (!entry.commit) fail(`${name} lock entry has no pinned commit`);

  const folder = join(root, ".claude", "skills", name);
  const file = join(folder, "SKILL.md");
  if (!existsSync(folder))
    fail(`.claude/skills/${name} is missing (restore from skills-lock.json)`);
  if (!existsSync(file)) fail(`.claude/skills/${name}/SKILL.md is missing`);
  if (isSymlink(folder)) fail(`.claude/skills/${name} is a symbolic link, expected a real folder`);
  if (isSymlink(file)) fail(`.claude/skills/${name}/SKILL.md is a symbolic link`);
}

for (const name of FORBIDDEN) {
  if (existsSync(join(root, ".claude", "skills", name))) {
    fail(`forbidden skill is installed: .claude/skills/${name}`);
  }
  if (name in lockSkills) fail(`forbidden skill is in skills-lock.json: ${name}`);
}

if (existsSync(join(root, ".agents", "skills"))) {
  fail(".agents/skills exists (duplicate skill listing); delete it");
}

const gsdTools = join(homedir(), ".claude", "gsd-core", "bin", "gsd-tools.cjs");
if (!existsSync(gsdTools)) fail(`gsd-tools.cjs not found at ${gsdTools}`);

for (const agent of AGENTS) {
  const result = spawnSync(
    process.execPath,
    [gsdTools, "query", "agent-skills", agent, "--skills-only"],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) fail(`gsd-tools agent-skills ${agent} exited ${result.status}`);
  const combined = `${result.stdout}\n${result.stderr}`;
  if (combined.includes("WARNING")) fail(`agent-skills ${agent} printed a WARNING`);
  if (!result.stdout.includes(TASTE_PATH)) {
    fail(`agent-skills ${agent} does not inject ${TASTE_PATH}`);
  }
}

console.log(`verify skills: ok (${REQUIRED.length} skills)`);
