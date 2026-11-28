// True when `moduleFile` (the caller's import.meta.filename) is the script node was started with.
// Both paths go through realpath, so a directory junction or symlink in the argv path no longer
// makes a staleness gate silently skip main() and exit 0.
import { realpathSync } from "node:fs";

export function isMainModule(moduleFile: string, argv1: string | undefined): boolean {
  if (!argv1) return false;
  try {
    return realpathSync(moduleFile) === realpathSync(argv1);
  } catch {
    return moduleFile === argv1;
  }
}
