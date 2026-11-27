// Shared rule set for research domain folders (RSCH-01). Erasable TypeScript only so
// `node scripts/research/check-domain.ts <slug>` runs under native type stripping.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ErrorObject } from "ajv";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { CAPS, SLUG_RULES } from "./domains.ts";

export interface Violation {
  rule: string;
  detail: string;
}

export interface Excerpt {
  id: string;
  locator: string;
  fetched_at: string;
  sha256: string;
  paraphrase: string;
}

export interface Permission {
  value: string;
  note: string;
}

export interface SourceEntry {
  id: string;
  title: string;
  url: string;
  type: string;
  status: string;
  notes: string;
  license: Record<string, Permission | string | undefined>;
  excerpts?: Excerpt[];
  [key: string]: unknown;
}

export interface Citation {
  id: string;
  excerpt: string | null;
  line: number;
}

/** What a slug-specific rule gets to look at. */
export interface DomainContext {
  slug: string;
  sources: SourceEntry[];
  findings: string;
  visual: string;
}

export type ContractName = "source" | "concept" | "role" | "competency";

export interface ContractValidator {
  (data: unknown): boolean;
  errors?: ErrorObject[] | null;
}

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");

// Under moduleResolution "bundler" or native ESM the CJS default export may arrive as the namespace.
function callable<T>(mod: unknown): T {
  const m = mod as { default?: unknown };
  return (typeof mod === "function" ? mod : m.default) as T;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

let sharedAjv: InstanceType<typeof Ajv2020> | null = null;
const compiled = new Map<ContractName, ContractValidator>();

function getAjv(): InstanceType<typeof Ajv2020> {
  if (sharedAjv) return sharedAjv;
  const AjvCtor = callable<typeof Ajv2020>(Ajv2020);
  const addFormatsFn = callable<(ajv: InstanceType<typeof Ajv2020>) => void>(addFormats);
  const ajv = new AjvCtor({ strict: true, allErrors: true });
  addFormatsFn(ajv);
  ajv.addSchema(readJson(join(REPO_ROOT, "schemas", "common.schema.json")) as object);
  sharedAjv = ajv;
  return ajv;
}

/** One shared strict 2020-12 ajv instance (common.schema.json added first) per contract schema. */
export function compileContract(name: ContractName): ContractValidator {
  const cached = compiled.get(name);
  if (cached) return cached;
  const schema = readJson(join(REPO_ROOT, "schemas", `${name}.schema.json`)) as object;
  const validate = getAjv().compile(schema) as unknown as ContractValidator;
  compiled.set(name, validate);
  return validate;
}

/**
 * Lower-case scheme and host, drop a leading www., the fragment and every utm_* parameter,
 * and a trailing slash unless the path is "/". All other query parameters are kept.
 */
export function canonicalUrl(url: string): string {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return url.trim();
  }
  const host = u.host.toLowerCase().replace(/^www\./, "");
  let path = u.pathname;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  const query = u.search
    .replace(/^\?/, "")
    .split("&")
    .filter((p) => p !== "" && !/^utm_/i.test(p.split("=")[0] ?? ""))
    .join("&");
  return `${u.protocol.toLowerCase()}//${host}${path}${query === "" ? "" : `?${query}`}`;
}

const CITE_SOURCE = String.raw`\[(src-[a-z0-9]+(?:-[a-z0-9]+)*)(?:#([a-z0-9]+(?:-[a-z0-9]+)*))?\]`;

/** Every `[src-<kebab>]` or `[src-<kebab>#<excerpt-kebab>]` occurrence with its 1-based line. */
export function parseCitations(text: string): Citation[] {
  const out: Citation[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const m of (lines[i] ?? "").matchAll(new RegExp(CITE_SOURCE, "g"))) {
      out.push({ id: m[1] as string, excerpt: m[2] ?? null, line: i + 1 });
    }
  }
  return out;
}

/** Whitespace-split count of non-empty tokens. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((t) => t !== "").length;
}

/** Reads research/seed-sources.json (an array) under the repo root. */
export function loadSeedSources(root: string): SourceEntry[] {
  const path = join(root, "research", "seed-sources.json");
  if (!existsSync(path)) return [];
  const data = readJson(path);
  if (!Array.isArray(data)) throw new Error(`${path} is not an array`);
  return data as SourceEntry[];
}

const FINDINGS_HEADINGS = [
  "Key concepts",
  "Must teach",
  "Misconceptions",
  "Contested points",
  "Open questions",
] as const;
const CITED_SECTIONS: readonly string[] = FINDINGS_HEADINGS.slice(0, 4);

const H2_RE = /^##\s+(\S.*?)\s*$/;
const FENCE_RE = /^\s*(```|~~~)/m;
const MEASURE_RE =
  /\b\d+(?:[.,]\d+)?\s*(?:minutes|metres|meters|seconds|yards|mins|secs|yds|km|cm|fps|yd|m|%)(?![A-Za-z])/i;
const CONTESTED_RE = /^\s*(?:[-*+]\s+)?(?:\*\*)?Contested:/;
const BULLET_RE = /^\s*(?:[-*+]|\d+[.)])\s+/;

function citeRegexGlobal(): RegExp {
  return new RegExp(CITE_SOURCE, "g");
}

function isSkippableLine(line: string): boolean {
  const t = line.trim();
  if (t === "") return true;
  if (t.startsWith("#")) return true;
  if (/^[-*_]{3,}$/.test(t)) return true;
  if (/^\|?[\s:|-]+\|?$/.test(t) && t.includes("-")) return true;
  if (t.startsWith("<!--") && t.endsWith("-->")) return true;
  return false;
}

interface Section {
  name: string;
  lines: { n: number; text: string }[];
}

function splitSections(text: string): { headings: string[]; sections: Section[] } {
  const headings: string[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const m = H2_RE.exec(line);
    if (m) {
      headings.push(m[1] as string);
      current = { name: m[1] as string, lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push({ n: i + 1, text: line });
    }
  }
  return { headings, sections };
}

function checkHeadings(headings: string[], v: Violation[]): void {
  let last = -1;
  for (const name of FINDINGS_HEADINGS) {
    const idx = headings.indexOf(name);
    if (idx === -1) {
      v.push({ rule: "findings-headings", detail: `missing heading "## ${name}"` });
      continue;
    }
    if (idx < last) {
      v.push({ rule: "findings-headings", detail: `heading "## ${name}" is out of order` });
    }
    last = Math.max(last, idx);
  }
}

function lineCites(line: string): Citation[] {
  return parseCitations(line);
}

function checkClaimCitations(text: string, v: Violation[]): void {
  const { sections } = splitSections(text);
  const seen = new Set<string>();
  for (const section of sections) {
    if (!CITED_SECTIONS.includes(section.name) || seen.has(section.name)) continue;
    seen.add(section.name);
    for (const { n, text: line } of section.lines) {
      if (isSkippableLine(line)) continue;
      if (lineCites(line).length === 0) {
        v.push({
          rule: "claim-uncited",
          detail: `findings.md line ${n} in "## ${section.name}" has no [src-...] citation`,
        });
      }
    }
  }
}

function checkContested(file: string, text: string, v: Violation[]): void {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!CONTESTED_RE.test(lines[i] ?? "")) continue;
    const block = [lines[i] ?? ""];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j] ?? "";
      if (next.trim() === "" || next.trim().startsWith("#") || BULLET_RE.test(next)) break;
      block.push(next);
    }
    const ids = new Set(parseCitations(block.join("\n")).map((c) => c.id));
    if (ids.size < 2) {
      v.push({
        rule: "contested-sources",
        detail: `${file} line ${i + 1}: a Contested paragraph must cite at least two distinct sources (found ${ids.size})`,
      });
    }
  }
}

function checkMeasured(text: string, v: Violation[]): void {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (isSkippableLine(line)) continue;
    const bare = line.replace(citeRegexGlobal(), "");
    if (!MEASURE_RE.test(bare)) continue;
    if (!lineCites(line).some((c) => c.excerpt !== null)) {
      v.push({
        rule: "measured-needs-excerpt",
        detail: `findings.md line ${i + 1} holds a measured number but no [src-...#excerpt] citation`,
      });
    }
  }
}

function permissionNote(p: Permission | string | undefined): string | null {
  if (p === undefined || typeof p === "string") return null;
  return typeof p.note === "string" ? p.note : null;
}

/**
 * Judges research/<slug>/ against the shared contract. Returns the violations; an empty list is a
 * pass. `seed` is the parsed research/seed-sources.json.
 */
export function validateDomainFolder(root: string, slug: string, seed: SourceEntry[]): Violation[] {
  const v: Violation[] = [];
  const dir = join(root, "research", slug);
  const files = ["findings.md", "sources.json", "visual_ideas.md"];
  const contents = new Map<string, string>();
  for (const f of files) {
    const p = join(dir, f);
    if (!existsSync(p)) {
      v.push({ rule: "files-exist", detail: `research/${slug}/${f} is missing` });
      continue;
    }
    const text = readFileSync(p, "utf8");
    if (text.trim() === "") {
      v.push({ rule: "files-exist", detail: `research/${slug}/${f} is empty` });
      continue;
    }
    contents.set(f, text);
  }
  if (v.length > 0) return v;

  const findings = contents.get("findings.md") as string;
  const visual = contents.get("visual_ideas.md") as string;

  // sources.json
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents.get("sources.json") as string);
  } catch (e) {
    return [{ rule: "sources-json-parse", detail: (e as Error).message }];
  }
  if (!Array.isArray(parsed)) {
    return [{ rule: "sources-array", detail: "sources.json must be a JSON array" }];
  }
  const sources = parsed as SourceEntry[];
  if (sources.length < 1 || sources.length > CAPS.maxSources) {
    v.push({
      rule: "sources-count",
      detail: `sources.json has ${sources.length} entries, expected 1 to ${CAPS.maxSources}`,
    });
  }

  const validate = compileContract("source");
  const seedById = new Map(seed.map((s) => [s.id, s]));
  const seedByUrl = new Map(seed.map((s) => [canonicalUrl(s.url), s]));
  const ids = new Set<string>();
  sources.forEach((s, i) => {
    const label = `sources[${i}]${typeof s?.id === "string" ? ` (${s.id})` : ""}`;
    if (!validate(s)) {
      for (const err of validate.errors ?? []) {
        v.push({
          rule: "source-schema",
          detail: `${label} ${err.instancePath || "/"} ${err.message ?? "invalid"}`,
        });
      }
      return;
    }
    if (!s.id.startsWith("src-")) {
      v.push({ rule: "source-id-prefix", detail: `${label} id must start with "src-"` });
    }
    if (ids.has(s.id)) {
      v.push({ rule: "source-id-unique", detail: `${label} duplicates an id in this file` });
    }
    ids.add(s.id);

    for (const field of ["read", "automated_access", "redistribute", "derivative"]) {
      const note = permissionNote(s.license[field]);
      if (note === null || note.trim() === "") {
        v.push({ rule: "license-note", detail: `${label} license.${field}.note is empty` });
      }
    }

    const cUrl = canonicalUrl(s.url);
    const seedSame = seedById.get(s.id);
    if (seedSame && canonicalUrl(seedSame.url) !== cUrl) {
      v.push({
        rule: "seed-id-url-mismatch",
        detail: `${label} reuses a seed id but its URL differs from the seed URL ${seedSame.url}`,
      });
    }
    const seedUrl = seedByUrl.get(cUrl);
    if (seedUrl && seedUrl.id !== s.id) {
      v.push({
        rule: "seed-url-new-id",
        detail: `${label} re-mints the seed URL ${seedUrl.url}; use the seed id ${seedUrl.id}`,
      });
    }

    const excerpts = Array.isArray(s.excerpts) ? s.excerpts : [];
    if (s.type === "regulation" && excerpts.length === 0) {
      v.push({ rule: "regulation-excerpt", detail: `${label} is a regulation without an excerpt` });
    }
    const exIds = new Set<string>();
    for (const ex of excerpts) {
      if (exIds.has(ex.id)) {
        v.push({ rule: "excerpt-id-unique", detail: `${label} repeats excerpt id ${ex.id}` });
      }
      exIds.add(ex.id);
    }
  });

  // findings.md and visual_ideas.md
  const findingsWords = countWords(findings);
  if (findingsWords > CAPS.findingsWords) {
    v.push({
      rule: "findings-word-cap",
      detail: `findings.md has ${findingsWords} words, cap is ${CAPS.findingsWords}`,
    });
  }
  const visualWords = countWords(visual);
  if (visualWords > CAPS.visualWords) {
    v.push({
      rule: "visual-word-cap",
      detail: `visual_ideas.md has ${visualWords} words, cap is ${CAPS.visualWords}`,
    });
  }
  for (const [name, text] of [
    ["findings.md", findings],
    ["visual_ideas.md", visual],
  ] as const) {
    if (FENCE_RE.test(text)) {
      v.push({ rule: "no-code-fence", detail: `${name} contains a fenced code block` });
    }
  }

  const { headings } = splitSections(findings);
  checkHeadings(headings, v);
  if (splitSections(visual).headings.length < 3) {
    v.push({
      rule: "visual-headings",
      detail: "visual_ideas.md needs at least three level-2 headings",
    });
  }
  checkClaimCitations(findings, v);
  checkContested("findings.md", findings, v);
  checkContested("visual_ideas.md", visual, v);
  checkMeasured(findings, v);

  // citation resolution and coverage
  const byId = new Map<string, SourceEntry>();
  for (const s of seed) byId.set(s.id, s);
  for (const s of sources) if (typeof s?.id === "string") byId.set(s.id, s);
  const cited = new Set<string>();
  for (const [name, text] of [
    ["findings.md", findings],
    ["visual_ideas.md", visual],
  ] as const) {
    for (const c of parseCitations(text)) {
      cited.add(c.id);
      const src = byId.get(c.id);
      if (!src) {
        v.push({
          rule: "cite-unknown-source",
          detail: `${name} line ${c.line} cites ${c.id}, which is in neither sources.json nor the seed`,
        });
        continue;
      }
      if (c.excerpt !== null) {
        const known = Array.isArray(src.excerpts) && src.excerpts.some((e) => e.id === c.excerpt);
        if (!known) {
          v.push({
            rule: "cite-unknown-excerpt",
            detail: `${name} line ${c.line} cites ${c.id}#${c.excerpt}, but ${c.id} has no such excerpt`,
          });
        }
      }
    }
  }
  for (const s of sources) {
    if (typeof s?.id === "string" && !cited.has(s.id)) {
      v.push({
        rule: "source-uncited",
        detail: `${s.id} is in sources.json but never cited in findings.md or visual_ideas.md`,
      });
    }
  }

  const slugRule = SLUG_RULES[slug];
  if (slugRule) v.push(...slugRule({ slug, sources, findings, visual }));

  return v;
}
