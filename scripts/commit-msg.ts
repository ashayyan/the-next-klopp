// commit-msg hook CLI: node scripts/commit-msg.ts <message-file>
// Exit 0 accepted, 1 rejected, 2 no path given. Dependency-free. Erasable TypeScript only.

import { readFileSync } from "node:fs";
import { firstLine, isConventionalCommit } from "./lib/commit-msg.ts";

function main(argv: string[]): number {
  const path = argv[0];
  if (path === undefined || path === "") {
    console.error("usage: node scripts/commit-msg.ts <message-file>");
    return 2;
  }
  const message = readFileSync(path, "utf8");
  if (isConventionalCommit(message)) return 0;
  console.error(`commit-msg: not a conventional commit: "${firstLine(message)}"`);
  console.error(
    "example: feat(01-04): add the thing  (types: feat fix docs chore refactor test ci build perf style revert)",
  );
  return 1;
}

process.exit(main(process.argv.slice(2)));
