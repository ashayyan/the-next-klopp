// Decision rules for remember-verdicts.ts (WR-07). No server involved.
import { describe, expect, it } from "vitest";
import { listingTruncated, SUPERSEDE_PREFIX, storedState, textToPost } from "./verdict-sync.ts";

const TITLE = "Phase 2 verdict: research approval (RSCH-06).";
const PENDING = `${TITLE} no approval record yet (research/APPROVAL.md missing).`;
const APPROVED = `${TITLE} Status approved, reviewed 2026-11-28 by an independent reviewer.`;

describe("storedState", () => {
  it("is missing when nothing with the title is stored", () => {
    expect(storedState(["other"], TITLE, APPROVED)).toBe("missing");
  });

  it("is current only when the exact text is stored", () => {
    expect(storedState([APPROVED], TITLE, APPROVED)).toBe("current");
  });

  it("is stale when only an older text with the same title is stored", () => {
    expect(storedState([PENDING], TITLE, APPROVED)).toBe("stale");
  });

  it("finds a superseding memory as current, so the next run does not post again", () => {
    const posted = textToPost("stale", APPROVED);
    expect(posted.startsWith(SUPERSEDE_PREFIX)).toBe(true);
    expect(storedState([PENDING, posted], TITLE, APPROVED)).toBe("current");
  });

  it("treats a later wording change as stale even after a supersede", () => {
    const posted = textToPost("stale", APPROVED);
    expect(storedState([PENDING, posted], TITLE, `${APPROVED} Re-opened.`)).toBe("stale");
  });
});

describe("textToPost", () => {
  it("posts a missing verdict unchanged", () => {
    expect(textToPost("missing", APPROVED)).toBe(APPROVED);
  });
});

describe("listingTruncated", () => {
  it("is false for a plain complete list", () => {
    expect(listingTruncated({ memories: [] }, 0)).toBe(false);
    expect(listingTruncated({ memories: [], total: 3 }, 3)).toBe(false);
  });

  it("is true for a paging flag, a next cursor or a total above the returned count", () => {
    expect(listingTruncated({ hasMore: true }, 1)).toBe(true);
    expect(listingTruncated({ next_cursor: "abc" }, 1)).toBe(true);
    expect(listingTruncated({ total: 120 }, 100)).toBe(true);
  });
});
