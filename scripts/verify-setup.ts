// Dispatcher: node scripts/verify-setup.ts <section|all>
// Sections are the basenames of the .ts files in scripts/verify/, read at run time. That listing is
// the only allowlist, so an argument is never used as a path.
// Dependency-free. Erasable TypeScript only.

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const verifyDir = join(dirname(fileURLToPath(import.meta.url)), "verify");

function listSections(): string[] {
  return readdirSync(verifyDir)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => f.slice(0, -3))
    .sort();
}

function main(argv: string[]): number {
  const sections = listSections();
  const arg = argv[0];
  if (argv.length !== 1 || arg === undefined || (arg !== "all" && !sections.includes(arg))) {
    console.error(
      `usage: node scripts/verify-setup.ts <section|all>\nsections: ${sections.join(", ")}`,
    );
    return 2;
  }
  const selected = arg === "all" ? sections : [arg];
  let failed = 0;
  for (const section of selected) {
    const r = spawnSync(process.execPath, [join(verifyDir, `${section}.ts`)], { stdio: "inherit" });
    if (r.status === 0) {
      console.log(`verify ${section}: ok`);
    } else {
      console.log(`verify ${section}: FAILED`);
      failed += 1;
    }
  }
  return failed === 0 ? 0 : 1;
}

process.exit(main(process.argv.slice(2)));
