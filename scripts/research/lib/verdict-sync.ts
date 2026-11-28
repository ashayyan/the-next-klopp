// Pure decisions for remember-verdicts.ts (kept apart so tests can import them without a server).
// A verdict is "current" when the exact text is already stored, "stale" when an older text with the
// same title is stored (the wording changed, for example the approval status), else "missing".
// A stale verdict is not deleted (the server API for that is not relied on): a superseding memory
// with SUPERSEDE_PREFIX is posted, and the next run finds it as "current".
export const SUPERSEDE_PREFIX = "Updated, supersedes the earlier entry with this title: ";

export type StoredState = "current" | "stale" | "missing";

export function storedState(
  existing: readonly string[],
  title: string,
  content: string,
): StoredState {
  if (existing.some((c) => c === content || c === `${SUPERSEDE_PREFIX}${content}`)) {
    return "current";
  }
  if (existing.some((c) => c.startsWith(title) || c.startsWith(`${SUPERSEDE_PREFIX}${title}`))) {
    return "stale";
  }
  return "missing";
}

/** Text to post for a verdict in the given state. */
export function textToPost(state: StoredState, content: string): string {
  return state === "stale" ? `${SUPERSEDE_PREFIX}${content}` : content;
}

/**
 * True when a list response says it holds more entries than it returned. The server's paging
 * fields are not documented here, so every common shape is checked; an idempotence check built on
 * a truncated list would post duplicates.
 */
export function listingTruncated(listed: Record<string, unknown>, returned: number): boolean {
  if (listed.hasMore === true || listed.has_more === true || listed.truncated === true) return true;
  for (const key of ["next", "nextCursor", "next_cursor", "nextPage", "next_page"]) {
    if (listed[key]) return true;
  }
  for (const key of ["total", "totalCount", "total_count", "count"]) {
    const n = listed[key];
    if (typeof n === "number" && n > returned) return true;
  }
  return false;
}
