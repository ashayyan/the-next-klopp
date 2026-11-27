// Merge-rule unit tests for mergeSources (RSCH-04).
import { describe, expect, it } from "vitest";
import { mergeSources } from "./registry.ts";
import type { SourceEntry } from "./research-files.ts";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function perm(value: string, note: string) {
  return { value, note };
}

function src(id: string, url: string, over: Partial<SourceEntry> = {}): SourceEntry {
  return {
    id,
    title: `Title ${id}`,
    url,
    type: "website",
    publisher: "Publisher",
    free: true,
    license: {
      read: perm("yes", `read ${id}`),
      automated_access: perm("yes", `auto ${id}`),
      redistribute: perm("yes", `redist ${id}`),
      derivative: perm("yes", `deriv ${id}`),
    },
    quality: 4,
    recency: "2026-01-01",
    as_of: "2026-11-27",
    best_for: [`use of ${id}`],
    notes: `notes ${id}`,
    status: "active",
    ...over,
  };
}

function licence(entry: SourceEntry | undefined, field: string): { value: string; note: string } {
  return entry?.license[field] as { value: string; note: string };
}

describe("mergeSources", () => {
  it("merges URLs that differ only by www., a trailing slash and a utm parameter", () => {
    const result = mergeSources([
      { origin: "seed", sources: [src("src-first", "https://example.org/page")] },
      {
        origin: "formations",
        sources: [src("src-second", "https://www.example.org/page/?utm_source=x")],
      },
    ]);
    expect(result.registry.map((s) => s.id)).toEqual(["src-first"]);
    expect(result.aliases).toEqual({ "src-second": "src-first" });
    expect(result.report.merges).toHaveLength(1);
    expect(result.registry[0]?.best_for).toEqual(["use of src-first", "use of src-second"]);
  });

  it("takes the most restrictive licence value per field and keeps notes from both origins", () => {
    const a = src("src-a", "https://example.org/a", {
      license: {
        read: perm("yes", "a read"),
        automated_access: perm("conditional", "a auto"),
        redistribute: perm("yes", "a may redistribute"),
        derivative: perm("yes", "a deriv"),
      },
    });
    const b = src("src-a", "https://example.org/a", {
      license: {
        read: perm("yes", "a read"),
        automated_access: perm("unknown", "b auto"),
        redistribute: perm("no", "b forbids redistribution"),
        derivative: perm("conditional", "b deriv"),
      },
    });
    const { registry, report } = mergeSources([
      { origin: "seed", sources: [a] },
      { origin: "pl-data-sources", sources: [b] },
    ]);
    const merged = registry[0];
    expect(licence(merged, "redistribute").value).toBe("no");
    expect(licence(merged, "automated_access").value).toBe("unknown");
    expect(licence(merged, "derivative").value).toBe("conditional");
    expect(licence(merged, "read")).toEqual({ value: "yes", note: "a read" });
    const note = licence(merged, "redistribute").note;
    expect(note).toContain("seed: a may redistribute");
    expect(note).toContain("pl-data-sources: b forbids redistribution");
    expect(report.conflicts.map((c) => c.field)).toContain("license.redistribute");
    expect(report.unknownLicence).toEqual([{ id: "src-a", fields: ["automated_access"] }]);
  });

  it("gives removed plus active as removed with the reason kept, and reports the mixed status", () => {
    const { registry, report } = mergeSources([
      { origin: "seed", sources: [src("src-x", "https://example.org/x")] },
      {
        origin: "pl-data-sources",
        sources: [
          src("src-x", "https://example.org/x", {
            status: "removed",
            removed_reason: "data feed ended",
          }),
        ],
      },
    ]);
    expect(registry[0]?.status).toBe("removed");
    expect(registry[0]?.removed_reason).toBe("data feed ended");
    const mixed = report.conflicts.find((c) => c.field === "status");
    expect(mixed?.values.map((v) => v.value)).toEqual(["active", "removed"]);
  });

  it("applies the scalar rules: free false wins, minimum quality, earliest as_of", () => {
    const { registry, report } = mergeSources([
      { origin: "seed", sources: [src("src-q", "https://example.org/q", { quality: 5 })] },
      {
        origin: "formations",
        sources: [
          src("src-q", "https://example.org/q", {
            quality: 3,
            free: false,
            as_of: "2026-10-01",
            title: "Other title",
          }),
        ],
      },
    ]);
    const e = registry[0];
    expect(e?.quality).toBe(3);
    expect(e?.free).toBe(false);
    expect(e?.as_of).toBe("2026-10-01");
    expect(e?.title).toBe("Title src-q");
    expect(report.conflicts.map((c) => c.field)).toEqual(
      expect.arrayContaining(["title", "quality", "free", "as_of"]),
    );
  });

  it("renames a clashing excerpt id with a different hash and records the excerpt alias", () => {
    const ex = (sha256: string, paraphrase: string) => ({
      id: "edition",
      locator: "p.4",
      fetched_at: "2026-11-27T00:00:00Z",
      sha256,
      paraphrase,
    });
    const { registry, excerptAliases, report } = mergeSources([
      {
        origin: "seed",
        sources: [src("src-e", "https://example.org/e", { excerpts: [ex(HASH_A, "first")] })],
      },
      {
        origin: "laws-of-the-game",
        sources: [src("src-e", "https://example.org/e", { excerpts: [ex(HASH_A, "same")] })],
      },
      {
        origin: "pitch-geometry",
        sources: [src("src-e", "https://example.org/e", { excerpts: [ex(HASH_B, "other")] })],
      },
    ]);
    expect(registry[0]?.excerpts?.map((e) => e.id)).toEqual(["edition", "pitch-geometry-edition"]);
    expect(excerptAliases).toEqual({ "src-e#edition": "src-e#pitch-geometry-edition" });
    expect(report.excerptRenames).toHaveLength(1);
  });

  it("throws, naming the id, when one id is used on two different canonical URLs", () => {
    expect(() =>
      mergeSources([
        { origin: "seed", sources: [src("src-dup", "https://example.org/one")] },
        { origin: "formations", sources: [src("src-dup", "https://example.org/two")] },
      ]),
    ).toThrow(/src-dup/);
  });

  it("joins two different URLs into one entry through a same_as override", () => {
    const inputs = [
      { origin: "seed", sources: [src("src-paper", "https://doi.org/10.1/abc")] },
      {
        origin: "formations",
        sources: [src("src-paper-landing", "https://publisher.example/abc")],
      },
    ];
    expect(mergeSources(inputs).registry).toHaveLength(2);
    const joined = mergeSources(inputs, {
      schema_version: 1,
      same_as: [["src-paper", "https://publisher.example/abc"]],
    });
    expect(joined.registry.map((s) => s.id)).toEqual(["src-paper"]);
    expect(joined.aliases).toEqual({ "src-paper-landing": "src-paper" });
  });

  it("rejects an override that names nothing", () => {
    expect(() =>
      mergeSources([{ origin: "seed", sources: [src("src-a", "https://example.org/a")] }], {
        schema_version: 1,
        same_as: [["src-a", "src-missing"]],
      }),
    ).toThrow(/src-missing/);
  });

  it("allows one id on two URLs when an override joins them", () => {
    const result = mergeSources(
      [
        { origin: "seed", sources: [src("src-a", "https://example.org/a.pdf")] },
        { origin: "formations", sources: [src("src-a", "https://example.org/a")] },
      ],
      { schema_version: 1, same_as: [["https://example.org/a.pdf", "https://example.org/a"]] },
    );
    expect(result.registry).toHaveLength(1);
    expect(result.aliases).toEqual({});
  });

  it("sorts the registry by id and lists unverified ids", () => {
    const { registry, report } = mergeSources([
      {
        origin: "jit-seed",
        sources: [
          src("src-zz", "https://example.org/zz", { status: "unverified" }),
          src("src-aa", "https://example.org/aa", { status: "unverified" }),
        ],
      },
    ]);
    expect(registry.map((s) => s.id)).toEqual(["src-aa", "src-zz"]);
    expect(report.unverified).toEqual(["src-aa", "src-zz"]);
  });

  it("reports a differing licence name or terms URL and keeps the first one", () => {
    const withLicence = (name: string, terms: string) => {
      const base = src("src-a", "https://example.org/a");
      return { ...base, license: { ...base.license, name, terms_url: terms } };
    };
    const { registry, report } = mergeSources([
      { origin: "seed", sources: [withLicence("CC BY 4.0", "https://example.org/by")] },
      {
        origin: "formations",
        sources: [
          {
            ...withLicence("All rights reserved", "https://example.org/arr"),
            id: "src-b",
            url: "https://example.org/a/",
          },
        ],
      },
    ]);
    expect(registry[0]?.license.name).toBe("CC BY 4.0");
    const fields = report.conflicts.map((c) => c.field);
    expect(fields).toContain("license.name");
    expect(fields).toContain("license.terms_url");
  });

  it("does not report a licence name conflict when only one member has a name", () => {
    const named = src("src-a", "https://example.org/a");
    named.license.name = "CC BY 4.0";
    const { report } = mergeSources([
      { origin: "seed", sources: [named] },
      { origin: "formations", sources: [src("src-b", "https://example.org/a/")] },
    ]);
    expect(report.conflicts.map((c) => c.field)).not.toContain("license.name");
  });

  it("lets type regulation win over a looser first-seen type", () => {
    const { registry } = mergeSources([
      {
        origin: "pitch-geometry",
        sources: [src("src-a", "https://example.org/a", { type: "official-document" })],
      },
      {
        origin: "positions",
        sources: [src("src-b", "https://example.org/a/", { type: "regulation" })],
      },
    ]);
    expect(registry[0]?.type).toBe("regulation");
  });

  it("rejects a licence value that is not yes, conditional, unknown or no", () => {
    const bad = src("src-a", "https://example.org/a");
    bad.license.read = { value: "maybe", note: "typo" };
    expect(() => mergeSources([{ origin: "seed", sources: [bad] }])).toThrow(
      /license\.read.*maybe/,
    );
  });
});
