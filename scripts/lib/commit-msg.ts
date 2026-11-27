// Conventional-commit rule. Pure. Erasable TypeScript only so `node file.ts` can run it.

const TYPES = "feat|fix|docs|chore|refactor|test|ci|build|perf|style|revert";
const CONVENTIONAL = new RegExp(`^(?:${TYPES})(?:\\([^()\\s]+\\))?!?: \\S`);
const PASS_THROUGH_PREFIXES: readonly string[] = [
  "Merge ",
  'Revert "',
  "fixup! ",
  "squash! ",
  "amend! ",
];

/** The first non-blank line, ignoring git's `#` template comments. */
export function firstLine(message: string): string {
  for (const line of message.split(/\r?\n/)) {
    if (line.startsWith("#")) continue;
    if (line.trim() === "") continue;
    return line;
  }
  return "";
}

export function isConventionalCommit(message: string): boolean {
  const line = firstLine(message);
  if (line === "") return false;
  for (const prefix of PASS_THROUGH_PREFIXES) {
    if (line.startsWith(prefix)) return true;
  }
  return CONVENTIONAL.test(line);
}
