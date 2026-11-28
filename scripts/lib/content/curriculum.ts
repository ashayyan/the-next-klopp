// Pure builders for the curriculum facts `virtual:tnk-lessons` gives the app (05-02): track list
// with per-part concept counts, the slice of the source registry that included lessons cite,
// concept summaries and study order. The app never bundles research/concept-map.json or
// research/SOURCE_REGISTRY.json; only these outputs ship (threat T-05-17).
// Vite-free and Node-free so they are unit-tested on their own. Erasable TypeScript only.
import { type Part, TRACKS } from "../../../src/content/tracks.ts";

export interface ConceptLike {
  id: string;
  track: string;
  part: string;
  summary: string;
}

export interface ConceptMapLike {
  concepts: readonly ConceptLike[];
}

export interface CurriculumPart {
  /** Concept-map part letter, `A` to `G`. */
  letter: string;
  /** Chapter id used in lesson folders and routes, `part-a` to `part-g`. */
  chapter: string;
  conceptCount: number;
}

export interface CurriculumTrack {
  id: string;
  number: number;
  title: string;
  parts: CurriculumPart[];
}

export interface Curriculum {
  tracks: CurriculumTrack[];
}

/** The registry fields a source chip shows. Notes, excerpts and verdicts never ship. */
export interface SourceSummary {
  id: string;
  title: string;
  publisher: string;
  type: string;
  licence: string | null;
  url: string;
  as_of: string;
  effective_date?: string;
}

export interface RegistryEntryLike {
  id: string;
  title: string;
  publisher: string;
  type: string;
  url: string;
  as_of: string;
  effective_date?: string;
  license?: { name?: string };
  [key: string]: unknown;
}

export interface AliasesLike {
  aliases: Record<string, string>;
}

export interface LessonLike {
  id: string;
  track: string;
  chapter: string;
  concepts: readonly string[];
}

/** `A` to `part-a`. */
export function chapterForPart(letter: string): string {
  return `part-${letter.toLowerCase()}`;
}

/** Track ids used in the concept map that have no title in TRACKS, sorted. */
export function unknownTracks(conceptMap: ConceptMapLike): string[] {
  const known = new Set(TRACKS.map((t) => t.id));
  return [...new Set(conceptMap.concepts.map((c) => c.track))]
    .filter((id) => !known.has(id))
    .sort();
}

/**
 * All 29 tracks in number order. Each part lists the concept-map parts the track uses, with their
 * concept counts; a track with no concepts yet gets its own part with a zero count, so every track
 * still has one chapter to show as "coming next".
 */
export function buildCurriculum(conceptMap: ConceptMapLike): Curriculum {
  const unknown = unknownTracks(conceptMap);
  if (unknown.length > 0) {
    throw new Error(`concept-map.json uses tracks with no title in TRACKS: ${unknown.join(", ")}`);
  }
  const counts = new Map<string, Map<string, number>>();
  for (const c of conceptMap.concepts) {
    const byPart = counts.get(c.track) ?? new Map<string, number>();
    byPart.set(c.part, (byPart.get(c.part) ?? 0) + 1);
    counts.set(c.track, byPart);
  }
  const tracks = [...TRACKS]
    .sort((a, b) => a.number - b.number)
    .map((t) => {
      const byPart = counts.get(t.id);
      const letters: string[] = byPart ? [...byPart.keys()].sort() : [t.part satisfies Part];
      return {
        id: t.id,
        number: t.number,
        title: t.title,
        parts: letters.map((letter) => ({
          letter,
          chapter: chapterForPart(letter),
          conceptCount: byPart?.get(letter) ?? 0,
        })),
      };
    });
  return { tracks };
}

/** Follows alias links to a canonical id; a cycle stops after as many hops as there are aliases. */
function resolveAlias(id: string, aliases: Record<string, string>): string {
  let current = id;
  for (let hops = 0; hops <= Object.keys(aliases).length; hops += 1) {
    const next = aliases[current];
    if (next === undefined) return current;
    current = next;
  }
  return current;
}

/**
 * Registry entries for the cited ids, keyed by the id as cited (an alias keeps its own key and
 * carries the target entry). An id the registry does not hold is left out; the validator's
 * `citation` rule reports it with a fix.
 */
export function buildSourcesSlice(
  registry: readonly RegistryEntryLike[],
  aliases: AliasesLike,
  citedIds: Iterable<string>,
): Record<string, SourceSummary> {
  const byId = new Map(registry.map((entry) => [entry.id, entry]));
  const slice: Record<string, SourceSummary> = {};
  for (const cited of new Set(citedIds)) {
    const entry = byId.get(resolveAlias(cited, aliases.aliases));
    if (!entry) continue;
    const summary: SourceSummary = {
      id: entry.id,
      title: entry.title,
      publisher: entry.publisher,
      type: entry.type,
      licence: entry.license?.name ?? null,
      url: entry.url,
      as_of: entry.as_of,
    };
    if (entry.effective_date !== undefined) summary.effective_date = entry.effective_date;
    slice[cited] = summary;
  }
  return slice;
}

/** Summary of the first concept of every lesson, keyed by concept id. */
export function buildConceptSummaries(
  conceptMap: ConceptMapLike,
  lessons: readonly LessonLike[],
): Record<string, string> {
  const byId = new Map(conceptMap.concepts.map((c) => [c.id, c.summary]));
  const out: Record<string, string> = {};
  for (const lesson of lessons) {
    const first = lesson.concepts[0];
    const summary = first === undefined ? undefined : byId.get(first);
    if (first !== undefined && summary !== undefined) out[first] = summary;
  }
  return out;
}

function trackNumber(trackId: string): number {
  const m = /^t(\d{2})-/.exec(trackId);
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY;
}

/**
 * Lesson ids in study order: track number, chapter letter, index of the lesson's first concept in
 * concept-map.json (unknown concepts last), then id.
 */
export function studyOrder(conceptMap: ConceptMapLike, lessons: readonly LessonLike[]): string[] {
  const index = new Map(conceptMap.concepts.map((c, i) => [c.id, i]));
  const conceptIndex = (l: LessonLike) => {
    const first = l.concepts[0];
    return (first === undefined ? undefined : index.get(first)) ?? Number.POSITIVE_INFINITY;
  };
  const compare = (a: number | string, b: number | string) => (a < b ? -1 : a > b ? 1 : 0);
  return [...lessons]
    .sort(
      (a, b) =>
        compare(trackNumber(a.track), trackNumber(b.track)) ||
        compare(a.chapter, b.chapter) ||
        compare(conceptIndex(a), conceptIndex(b)) ||
        compare(a.id, b.id),
    )
    .map((l) => l.id);
}
