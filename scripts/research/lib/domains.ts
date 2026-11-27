// Phase 2 research metadata. Erasable TypeScript only (no enums, namespaces or parameter
// properties) so `node file.ts` native type stripping can run it.
import type { DomainContext, Violation } from "./research-files.ts";

/** The ten Wave 1 research domains. Folder slugs under research/. Order is the CONTEXT order. */
export const DOMAIN_SLUGS: readonly string[] = [
  "laws-of-the-game",
  "pitch-geometry",
  "positions-and-numbering",
  "formations",
  "tactics-history",
  "how-analysts-watch",
  "learning-science-adhd",
  "role-definitions",
  "pl-data-sources",
  "interactive-explainers",
];

/** Per-domain caps from CONTEXT "Research method, caps and stop rules". */
export const CAPS = { maxSources: 25, findingsWords: 1500, visualWords: 600 } as const;

/** Slug-specific extra checks run after the shared rules. Filled in by Task 3. */
export const SLUG_RULES: Record<string, (ctx: DomainContext) => Violation[]> = {};
