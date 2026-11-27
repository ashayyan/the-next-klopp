// CLI: node scripts/research/check-domain.ts <slug>
// Judges research/<slug>/ with the shared rule set. Prints each violation as `<rule>: <detail>`
// and exits 1, or prints a one-line ok verdict and exits 0.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DOMAIN_SLUGS } from "./lib/domains.ts";
import { countWords, loadSeedSources, validateDomainFolder } from "./lib/research-files.ts";

const root = join(import.meta.dirname, "..", "..");
const slug = process.argv[2];

if (!slug || !DOMAIN_SLUGS.includes(slug)) {
  console.error("usage: node scripts/research/check-domain.ts <slug>");
  console.error(`slugs: ${DOMAIN_SLUGS.join(", ")}`);
  process.exit(1);
}

const violations = validateDomainFolder(root, slug, loadSeedSources(root));
if (violations.length > 0) {
  for (const v of violations) console.error(`${v.rule}: ${v.detail}`);
  console.error(`research/${slug}: ${violations.length} violation(s)`);
  process.exit(1);
}

const dir = join(root, "research", slug);
const sources = JSON.parse(readFileSync(join(dir, "sources.json"), "utf8")) as unknown[];
const words = countWords(readFileSync(join(dir, "findings.md"), "utf8"));
console.log(`research/${slug}: ok (${sources.length} sources, ${words} findings words)`);
