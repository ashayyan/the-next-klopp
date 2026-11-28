// Source registry merge (RSCH-04). Pure function: no file access, so the unit tests and the CLI
// share one implementation. Erasable TypeScript only so `node file.ts` can import it.
import { canonicalUrl, type Excerpt, type Permission, type SourceEntry } from "./research-files.ts";

export interface MergeInput {
  /** Where the sources came from, for example "seed", a domain slug, or "jit-seed". */
  origin: string;
  sources: SourceEntry[];
}

export interface RegistryOverrides {
  schema_version: 1;
  /** Each group names sources (by id or by URL) that are the same work under different URLs. */
  same_as: string[][];
}

export interface MergeMember {
  origin: string;
  id: string;
  url: string;
}

export interface MergeConflict {
  id: string;
  field: string;
  values: { origin: string; value: string }[];
}

export interface MergeReport {
  inputs: { origin: string; count: number }[];
  entries: number;
  merges: { id: string; members: MergeMember[] }[];
  conflicts: MergeConflict[];
  excerptRenames: { id: string; from: string; to: string; origin: string }[];
  unverified: string[];
  unknownLicence: { id: string; fields: string[] }[];
}

export interface MergeResult {
  registry: SourceEntry[];
  aliases: Record<string, string>;
  excerptAliases: Record<string, string>;
  report: MergeReport;
}

export const LICENCE_FIELDS = ["read", "automated_access", "redistribute", "derivative"] as const;

/** Higher is more restrictive: no > unknown > conditional > yes. */
const RESTRICTIVENESS: Record<string, number> = { yes: 0, conditional: 1, unknown: 2, no: 3 };

interface Item {
  origin: string;
  index: number;
  source: SourceEntry;
  canon: string;
}

function find(parent: number[], i: number): number {
  let r = i;
  while (parent[r] !== r) r = parent[r] as number;
  let x = i;
  while (parent[x] !== r) {
    const next = parent[x] as number;
    parent[x] = r;
    x = next;
  }
  return r;
}

function union(parent: number[], a: number, b: number): void {
  const ra = find(parent, a);
  const rb = find(parent, b);
  if (ra === rb) return;
  // The smaller index stays the root, so the root is always the first-seen entry.
  if (ra < rb) parent[rb] = ra;
  else parent[ra] = rb;
}

function asPermission(p: Permission | string | undefined): Permission {
  if (p === undefined) return { value: "unknown", note: "" };
  if (typeof p === "string") return { value: p, note: "" };
  return p;
}

function distinct<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function joinNotes(parts: { origin: string; note: string }[], prefix: boolean): string {
  const nonEmpty = parts.filter((p) => p.note.trim() !== "");
  const unique = distinct(nonEmpty.map((p) => p.note));
  if (unique.length <= 1 || !prefix) return unique.join(" | ");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of nonEmpty) {
    if (seen.has(p.note)) continue;
    seen.add(p.note);
    out.push(`${p.origin}: ${p.note}`);
  }
  return out.join(" | ");
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortedRecord(rec: Map<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of [...rec.keys()].sort(compareText)) out[k] = rec.get(k) as string;
  return out;
}

/**
 * Merges ordered source lists into one deduplicated registry.
 * - Groups by canonical URL, then joins groups named together in `overrides.same_as`.
 * - Keeps the first-seen id per group; every other id becomes an alias of it.
 * - Licence fields take the most restrictive value (an unrecognised value throws); a differing
 *   licence name or terms URL is reported as a conflict. `regulation` wins over other types.
 * - Status: removed > active > unverified.
 * - Throws when one id names two different works (two canonical URLs outside an override group).
 */
export function mergeSources(
  inputs: MergeInput[],
  overrides: RegistryOverrides = { schema_version: 1, same_as: [] },
): MergeResult {
  const items: Item[] = [];
  for (const input of inputs) {
    for (const source of input.sources) {
      items.push({
        origin: input.origin,
        index: items.length,
        source,
        canon: canonicalUrl(source.url),
      });
    }
  }
  const parent = items.map((_, i) => i);

  const firstByCanon = new Map<string, number>();
  const idsToItems = new Map<string, number[]>();
  for (const it of items) {
    const first = firstByCanon.get(it.canon);
    if (first === undefined) firstByCanon.set(it.canon, it.index);
    else union(parent, first, it.index);
    idsToItems.set(it.source.id, [...(idsToItems.get(it.source.id) ?? []), it.index]);
  }

  for (const group of overrides.same_as) {
    const members: number[] = [];
    for (const ref of group) {
      const byId = idsToItems.get(ref);
      const byUrl = firstByCanon.get(canonicalUrl(ref));
      const hit = byId?.[0] ?? byUrl;
      if (hit === undefined) {
        throw new Error(`registry override names ${ref}, which matches no source id or URL`);
      }
      members.push(hit);
    }
    for (const m of members.slice(1)) union(parent, members[0] as number, m);
  }

  for (const [id, idx] of idsToItems) {
    const roots = distinct(idx.map((i) => find(parent, i)));
    if (roots.length > 1) {
      const urls = distinct(idx.map((i) => (items[i] as Item).source.url));
      throw new Error(`source id ${id} is used for different works: ${urls.join(" , ")}`);
    }
  }

  const groups = new Map<number, Item[]>();
  for (const it of items) {
    const r = find(parent, it.index);
    groups.set(r, [...(groups.get(r) ?? []), it]);
  }

  const aliases = new Map<string, string>();
  const excerptAliases = new Map<string, string>();
  const report: MergeReport = {
    inputs: inputs.map((i) => ({ origin: i.origin, count: i.sources.length })),
    entries: 0,
    merges: [],
    conflicts: [],
    excerptRenames: [],
    unverified: [],
    unknownLicence: [],
  };
  const registry: SourceEntry[] = [];

  for (const members of groups.values()) {
    const first = members[0] as Item;
    const id = first.source.id;
    for (const m of members) {
      if (m.source.id !== id) aliases.set(m.source.id, id);
    }
    if (members.length > 1) {
      report.merges.push({
        id,
        members: members.map((m) => ({ origin: m.origin, id: m.source.id, url: m.source.url })),
      });
    }

    const conflict = (field: string, pick: (s: SourceEntry) => unknown): void => {
      const values = members.map((m) => ({ origin: m.origin, value: String(pick(m.source)) }));
      if (distinct(values.map((v) => v.value)).length > 1) {
        report.conflicts.push({ id, field, values });
      }
    };

    // first-seen scalar fields, every differing value reported
    for (const field of ["title", "url", "type", "publisher", "recency"] as const) {
      conflict(field, (s) => s[field]);
    }
    conflict("status", (s) => s.status);
    conflict("free", (s) => s.free);
    conflict("quality", (s) => s.quality);
    conflict("as_of", (s) => s.as_of);

    // Name and terms URL come from the first member that has one; a second, different value is
    // a conflict the report must show (members without the field are not a conflict).
    for (const field of ["name", "terms_url"] as const) {
      const values = members
        .filter((m) => typeof m.source.license[field] === "string")
        .map((m) => ({ origin: m.origin, value: String(m.source.license[field]) }));
      if (distinct(values.map((v) => v.value)).length > 1) {
        report.conflicts.push({ id, field: `license.${field}`, values });
      }
    }

    const license: Record<string, Permission | string> = {};
    const name = members.find((m) => typeof m.source.license.name === "string")?.source.license
      .name;
    const termsUrl = members.find((m) => typeof m.source.license.terms_url === "string")?.source
      .license.terms_url;
    if (typeof name === "string") license.name = name;
    if (typeof termsUrl === "string") license.terms_url = termsUrl;
    const unknownFields: string[] = [];
    for (const field of LICENCE_FIELDS) {
      const perms = members.map((m) => ({
        origin: m.origin,
        perm: asPermission(m.source.license[field]),
      }));
      for (const p of perms) {
        if (!(p.perm.value in RESTRICTIVENESS)) {
          throw new Error(
            `source ${id} (${p.origin}) has license.${field} value ${JSON.stringify(p.perm.value)}; expected one of ${Object.keys(RESTRICTIVENESS).join(", ")}`,
          );
        }
      }
      let value = perms[0]?.perm.value ?? "unknown";
      for (const p of perms) {
        if ((RESTRICTIVENESS[p.perm.value] as number) > (RESTRICTIVENESS[value] as number))
          value = p.perm.value;
      }
      if (distinct(perms.map((p) => p.perm.value)).length > 1) {
        report.conflicts.push({
          id,
          field: `license.${field}`,
          values: perms.map((p) => ({ origin: p.origin, value: p.perm.value })),
        });
      }
      const note = joinNotes(
        perms.map((p) => ({ origin: p.origin, note: p.perm.note })),
        true,
      );
      license[field] = { value, note };
      if (value === "unknown") unknownFields.push(field);
    }

    const removed = members.find((m) => m.source.status === "removed");
    const status = removed
      ? "removed"
      : members.some((m) => m.source.status === "active")
        ? "active"
        : "unverified";

    const asOf = members.map((m) => String(m.source.as_of)).sort(compareText)[0] as string;
    const quality = Math.min(...members.map((m) => Number(m.source.quality)));
    const free = members.every((m) => m.source.free !== false);
    const bestFor = distinct(
      members.flatMap((m) =>
        Array.isArray(m.source.best_for) ? (m.source.best_for as string[]) : [],
      ),
    );
    const notes = joinNotes(
      members.map((m) => ({ origin: m.origin, note: m.source.notes ?? "" })),
      false,
    );

    const excerpts: Excerpt[] = [];
    const byExcerptId = new Map<string, Excerpt>();
    for (const m of members) {
      for (const ex of m.source.excerpts ?? []) {
        const known = byExcerptId.get(ex.id);
        if (!known) {
          byExcerptId.set(ex.id, ex);
          excerpts.push(ex);
          continue;
        }
        if (known.sha256 === ex.sha256) continue;
        const renamed = `${m.origin}-${ex.id}`;
        if (byExcerptId.has(renamed)) {
          throw new Error(`excerpt ${id}#${renamed} would be created twice`);
        }
        const copy: Excerpt = { ...ex, id: renamed };
        byExcerptId.set(renamed, copy);
        excerpts.push(copy);
        // When the member shares the surviving id, `id#ex.id` already names the first-seen excerpt.
        // An alias for that key would redirect the still-valid citation, so only other ids get one.
        if (m.source.id !== id) excerptAliases.set(`${m.source.id}#${ex.id}`, `${id}#${renamed}`);
        report.excerptRenames.push({ id, from: ex.id, to: renamed, origin: m.origin });
      }
    }

    const entry: SourceEntry = {
      id,
      title: first.source.title,
      url: first.source.url,
      // "regulation" is the stricter evidence class (it needs excerpts), so it wins over a looser
      // type another origin gave the same work; every other type is first-seen.
      type: members.some((m) => m.source.type === "regulation") ? "regulation" : first.source.type,
      publisher: first.source.publisher,
      free,
      license,
      quality,
      recency: first.source.recency,
      as_of: asOf,
      best_for: bestFor,
      notes,
      status,
    };
    if (removed) entry.removed_reason = removed.source.removed_reason;
    if (excerpts.length > 0) entry.excerpts = excerpts;
    registry.push(entry);

    if (status === "unverified") report.unverified.push(id);
    if (unknownFields.length > 0) report.unknownLicence.push({ id, fields: unknownFields });
  }

  registry.sort((a, b) => compareText(a.id, b.id));
  report.entries = registry.length;
  report.merges.sort((a, b) => compareText(a.id, b.id));
  report.unverified.sort(compareText);
  report.unknownLicence.sort((a, b) => compareText(a.id, b.id));

  return {
    registry,
    aliases: sortedRecord(aliases),
    excerptAliases: sortedRecord(excerptAliases),
    report,
  };
}
