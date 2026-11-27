// verify-setup section: docs/SETUP.md completeness and no secrets (SETUP-01, SETUP-02).
// Standalone, dependency-free, erasable TypeScript.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { findSecrets } from "../lib/guard.ts";

const root = process.cwd();
const SETUP = join(root, "docs", "SETUP.md");

function fail(message: string): never {
  console.error(`verify docs: FAIL - ${message}`);
  process.exit(1);
}

if (!existsSync(SETUP)) fail("docs/SETUP.md is missing");
const text = readFileSync(SETUP, "utf8");

const SECTIONS = [
  "Machine",
  "Tools",
  "README vs brief",
  "Fresh clone",
  "Model routing",
  "Package legitimacy",
  "agentmemory",
  "Known issues",
];

/** Returns the body of a `## <title>` section, up to the next `## ` heading. */
function section(title: string): string | null {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === `## ${title}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

for (const title of SECTIONS) {
  if (section(title) === null) fail(`missing section "## ${title}"`);
}

const tools = section("Tools") ?? "";
const rows = tools
  .split("\n")
  .filter((l) => l.trim().startsWith("|"))
  .map((l) =>
    l
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim()),
  );

const REQUIRED_TOOLS = [
  "GSD Core",
  "agentmemory",
  "K-Dense",
  "design-taste-frontend",
  "frontend-design",
  "web-design-guidelines",
  "ui-ux-pro-max",
  "dataviz",
];
const VERSION_OK = /(\d+\.\d+)|(\b[0-9a-f]{7,}\b)|(\bbuilt-in\b)/i;

for (const tool of REQUIRED_TOOLS) {
  const row = rows.find((r) => r[0]?.startsWith(tool));
  if (!row) fail(`Tools table has no row for ${tool}`);
  const version = row[1] ?? "";
  if (!VERSION_OK.test(version))
    fail(`Tools row ${tool} has no version, commit or built-in (got "${version}")`);
  if ((row[4] ?? "").length === 0) fail(`Tools row ${tool} has an empty Verification cell`);
}

const offer = rows.find((r) => r[0] === "offer-k-dense-web");
if (!offer) fail("Tools table has no offer-k-dense-web row");
if (!/disabled/i.test(offer.join(" "))) fail("offer-k-dense-web row does not say disabled");

const routing = section("Model routing") ?? "";
for (const needle of ["Fable 5.2", "Opus 5.5", "Sonnet 5.5", "Haiku 5.5", "FABLE_LOG.md"]) {
  if (!routing.includes(needle)) fail(`Model routing section lacks "${needle}"`);
}

const secretHits = findSecrets(text);
if (secretHits.length > 0) fail(`secret shape found in SETUP.md (${secretHits.join(", ")})`);

const secretFile = join(homedir(), ".agentmemory", "secret");
if (existsSync(secretFile)) {
  const secret = readFileSync(secretFile, "utf8").trim();
  if (secret.length > 0 && text.includes(secret))
    fail("the agentmemory secret text appears in SETUP.md");
}

console.log("verify docs: ok");
