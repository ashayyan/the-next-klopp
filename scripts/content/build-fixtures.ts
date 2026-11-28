// `npm run build:fixtures`: the fixtures build into dist-walker/ with VITE_INCLUDE_FIXTURES=1.
// It includes shipped and shippable lessons plus content/_fixtures/ and writes .vite/manifest.json.
// The env var is set here, not in package.json: cmd.exe has no `VAR=1 cmd` syntax, and no
// `.env.fixtures` file exists because .gitignore ignores `.env.*`. Vite is spawned by path with
// process.execPath and no shell, as scripts/smoke.ts does. Erasable TypeScript only.
import { spawnSync } from "node:child_process";
import { join } from "node:path";

export const OUT_DIR = "dist-walker";

export function main(argv: readonly string[]): number {
  const vite = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
  const result = spawnSync(process.execPath, [vite, "build", "--outDir", OUT_DIR, ...argv], {
    stdio: "inherit",
    shell: false,
    env: { ...process.env, VITE_INCLUDE_FIXTURES: "1" },
  });
  if (result.error) {
    console.error(`build:fixtures: could not start Vite (${result.error.message})`);
    return 1;
  }
  return result.status ?? 1;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
