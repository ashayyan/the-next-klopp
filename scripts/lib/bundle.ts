// Pure dist bundle checker (PIPE-03, ADR 0008 "Deploy deny-manifest"). No I/O.
// Erasable TypeScript only so `node file.ts` native type stripping can run it.

import { z } from "zod";
import { type DenyManifest, matches, normaliseGlobPath } from "./globs.ts";

export interface DistFile {
  /** Relative to dist, forward slashes. */
  path: string;
  bytes: number;
  sha256: string;
  /** Text for the text-like extensions listed in check-bundle.ts only; null for everything else. */
  text: string | null;
}

export interface BundleViolation {
  rule: "denied" | "unlisted-data" | "oversize" | "catalog" | "marker" | "dev-leak" | "symlink";
  path: string;
  detail: string;
}

const OPEN_LICENCES: readonly string[] = ["CC-BY-4.0"];

/**
 * Text that exists only in a dev-only module (routes under /dev, gated by import.meta.env.DEV).
 * Any of it in a built code chunk means a dev route, or the raw DESIGN.md it imports, shipped in the
 * study build. Each marker is copied from its source; check-bundle.test.ts asserts it is still there,
 * so a copy edit fails a test instead of silently disarming the check.
 */
export const DEV_ONLY_MARKERS: readonly { marker: string; source: string }[] = [
  { marker: "left out of the study build", source: "src/routes/dev.tsx" },
  { marker: "Dev view of the canonical pitch", source: "src/routes/dev-pitch.tsx" },
  {
    marker: "Every primitive and interaction, with its states",
    source: "src/routes/dev-gallery.tsx",
  },
  {
    marker: "The picked direction renders the two sample lesson screens",
    source: "src/routes/dev-directions.tsx",
  },
  {
    marker: "This page exists so the review command can be tested",
    source: "src/routes/dev-review-fixture.tsx",
  },
  // DirectionScope imports docs/DESIGN.md?raw; its first section heading marks the whole file.
  { marker: "## 1. Principles and anti-slop rules", source: "docs/DESIGN.md" },
];

const CatalogSchema = z.object({
  datasets: z.array(
    z.object({
      dataset: z.string(),
      version: z.string(),
      license: z.string(),
      files: z.array(z.object({ path: z.string(), sha256: z.string(), bytes: z.number() })),
    }),
  ),
});

/** Hashed code chunks may be named after a source module; only their content is scanned. */
function isCodeAsset(path: string): boolean {
  return /^assets\/.+\.(?:js|css|map)$/i.test(path);
}

function isDataPath(path: string): boolean {
  return path.toLowerCase().startsWith("data/");
}

/** Data-like files must live under data/ and a ship directory, wherever they sit in dist/. */
const DATA_EXTENSIONS = /\.(?:parquet|csv|tsv|zip|ndjson|jsonl|xml|arrow|feather)$/i;

function matchesAny(path: string, globs: readonly string[]): boolean {
  return globs.some((g) => matches(path, g));
}

/** Files in dist/ appear without the `public/` prefix, so test both forms. */
function matchesInScope(path: string, globs: readonly string[]): boolean {
  return matchesAny(path, globs) || matchesAny(`public/${path}`, globs);
}

export function checkBundle(
  files: readonly DistFile[],
  manifest: DenyManifest,
  catalog: unknown | null,
): BundleViolation[] {
  const out: BundleViolation[] = [];
  const denied = new Set<string>();

  for (const f of files) {
    const path = normaliseGlobPath(f.path);

    if (!isCodeAsset(path) && matchesInScope(path, manifest.denyGlobs)) {
      out.push({ rule: "denied", path, detail: "matches a deny-manifest glob" });
      denied.add(path);
    }

    if (!isDataPath(path) && DATA_EXTENSIONS.test(path) && !denied.has(path)) {
      out.push({
        rule: "unlisted-data",
        path,
        detail: "data file outside data/ and the ship directories",
      });
    }

    if (f.bytes > manifest.limits.assetFileBytes) {
      out.push({
        rule: "oversize",
        path,
        detail: `${f.bytes} bytes > ${manifest.limits.assetFileBytes}`,
      });
    }

    if (f.text !== null) {
      const lower = f.text.toLowerCase();
      for (const marker of manifest.contentMarkers) {
        if (lower.includes(marker.toLowerCase())) {
          out.push({ rule: "marker", path, detail: `contains "${marker}"` });
        }
      }
      if (isCodeAsset(path)) {
        for (const { marker, source } of DEV_ONLY_MARKERS) {
          if (f.text.includes(marker)) {
            out.push({ rule: "dev-leak", path, detail: `contains dev-only text from ${source}` });
          }
        }
      }
    }
  }

  const dataFiles = files
    .map((f) => ({ ...f, path: normaliseGlobPath(f.path) }))
    .filter((f) => isDataPath(f.path));

  let dataTotal = 0;
  for (const f of dataFiles) {
    dataTotal += f.bytes;
    if (f.bytes > manifest.limits.dataFileBytes) {
      out.push({
        rule: "oversize",
        path: f.path,
        detail: `${f.bytes} bytes > ${manifest.limits.dataFileBytes} (data file)`,
      });
    }
    const isCatalog = f.path.toLowerCase() === "data/catalog.json";
    if (!isCatalog && !denied.has(f.path) && !matchesInScope(f.path, manifest.shipDirs)) {
      out.push({
        rule: "unlisted-data",
        path: f.path,
        detail: "data file outside the ship directories",
      });
    }
  }
  if (dataTotal > manifest.limits.dataTotalBytes) {
    out.push({
      rule: "oversize",
      path: "data/",
      detail: `${dataTotal} bytes > ${manifest.limits.dataTotalBytes} (data total)`,
    });
  }

  const shipped = dataFiles.filter(
    (f) => f.path.toLowerCase() !== "data/catalog.json" && !denied.has(f.path),
  );
  if (shipped.length === 0) return out;

  const parsed = catalog === null ? null : CatalogSchema.safeParse(catalog);
  if (parsed === null || !parsed.success) {
    out.push({
      rule: "catalog",
      path: "data/catalog.json",
      detail:
        parsed === null
          ? "data files present but no catalog"
          : "catalog does not match the expected shape",
    });
    return out;
  }

  const listed = new Map<string, { sha256: string; bytes: number; license: string }>();
  for (const ds of parsed.data.datasets) {
    for (const entry of ds.files) {
      listed.set(entry.path.toLowerCase(), {
        sha256: entry.sha256,
        bytes: entry.bytes,
        license: ds.license,
      });
    }
  }

  for (const f of shipped) {
    const entry = listed.get(f.path.slice("data/".length).toLowerCase());
    if (!entry) {
      out.push({ rule: "catalog", path: f.path, detail: "not listed in catalog.json" });
      continue;
    }
    if (entry.sha256 !== f.sha256 || entry.bytes !== f.bytes) {
      out.push({ rule: "catalog", path: f.path, detail: "sha256 or size differs from catalog" });
    }
    if (!OPEN_LICENCES.includes(entry.license)) {
      out.push({
        rule: "catalog",
        path: f.path,
        detail: `licence ${entry.license} is not in ${OPEN_LICENCES.join(", ")}`,
      });
    }
  }
  return out;
}
