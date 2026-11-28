// Glob helpers shared by the bundle gate and the manifest tests. Erasable TypeScript only.
// Matching is lowercase on both sides and always POSIX: Windows `path.matchesGlob` is
// case-insensitive and the Linux runner's is not, so this makes both behave the same.

import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { z } from "zod";

export function normaliseGlobPath(path: string): string {
  let p = path.replace(/\\/g, "/");
  while (p.startsWith("./")) p = p.slice(2);
  return p;
}

/**
 * `path.matchesGlob` follows minimatch defaults (`dot: false`): a wildcard never matches a segment
 * that starts with a dot, so `.cache/statsbomb.json` would slip past `**` + `/*statsbomb*`. Each
 * path is therefore tested twice: as written, and with the leading dots stripped from every segment.
 */
function stripLeadingDots(path: string): string {
  return path
    .split("/")
    .map((segment) => segment.replace(/^\.+(?=.)/, ""))
    .join("/");
}

export function matches(path: string, glob: string): boolean {
  const lowerPath = normaliseGlobPath(path).toLowerCase();
  const lowerGlob = glob.toLowerCase();
  return (
    posix.matchesGlob(lowerPath, lowerGlob) ||
    posix.matchesGlob(stripLeadingDots(lowerPath), lowerGlob)
  );
}

const LimitsSchema = z.object({
  dataFileBytes: z.number().int().positive(),
  dataTotalBytes: z.number().int().positive(),
  assetFileBytes: z.number().int().positive(),
});

export const DenyManifestSchema = z.object({
  schemaVersion: z.literal(1),
  scope: z.array(z.string()).min(1),
  denyGlobs: z.array(z.string()).min(1),
  shipDirs: z.array(z.string()).min(1),
  localOnlyDatasets: z.array(z.string()).min(1),
  contentMarkers: z.array(z.string()).min(1),
  limits: LimitsSchema,
});

export type DenyManifest = z.infer<typeof DenyManifestSchema>;

export function loadDenyManifest(file: string): DenyManifest {
  return DenyManifestSchema.parse(JSON.parse(readFileSync(file, "utf8")));
}
