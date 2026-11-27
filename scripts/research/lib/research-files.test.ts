import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { excerptSha256 } from "./excerpt-hash.ts";
import {
  canonicalUrl,
  countWords,
  loadSeedSources,
  parseCitations,
  type SourceEntry,
  validateDomainFolder,
} from "./research-files.ts";
import {
  makeTempRoot,
  type SampleFiles,
  sampleFiles,
  sampleSource,
  writeDomain,
} from "./sample-domain.ts";

const root = join(import.meta.dirname, "..", "..", "..");
const seed = loadSeedSources(root);

const TOUCHLINE = "Length (touchline): minimum 90 m (100 yds) maximum 120 m (130 yds)";

describe("excerptSha256", () => {
  it("reproduces the two IFAB golden hashes", () => {
    expect(excerptSha256("Effective from 1st July 2026")).toBe(
      "b93f6f59e7458b59d2a9abe37762bc2b6557ba0ffbcdf6df5796a0dfd88c0ee0",
    );
    expect(excerptSha256(TOUCHLINE)).toBe(
      "a5e8cee54bd909f003367c6d6b5f19925cc44623e63ee085b8dc3ff9c79c39da",
    );
  });

  it("ignores doubled spaces, tabs and a trailing newline", () => {
    const messy = "Length (touchline):  minimum 90 m\t(100 yds) maximum 120 m (130 yds)\n";
    expect(excerptSha256(messy)).toBe(excerptSha256(TOUCHLINE));
  });

  it("normalises to NFC", () => {
    expect(excerptSha256("é")).toBe(excerptSha256("é"));
  });
});

describe("canonicalUrl", () => {
  it("lower-cases, drops www, fragment, utm_* and a trailing slash", () => {
    expect(canonicalUrl("https://WWW.Example.org/a/?utm_source=x&b=1#frag")).toBe(
      "https://example.org/a?b=1",
    );
  });

  it("keeps the root slash and other query parameters", () => {
    expect(canonicalUrl("https://example.org/")).toBe("https://example.org/");
    expect(canonicalUrl("https://example.org/p?l=en&utm_medium=y")).toBe(
      "https://example.org/p?l=en",
    );
  });
});

describe("parseCitations and countWords", () => {
  it("finds [src-a] and [src-b#e-1] and ignores [not-a-cite]", () => {
    const found = parseCitations("one [src-a] two\n[not-a-cite] three [src-b#e-1]");
    expect(found).toEqual([
      { id: "src-a", excerpt: null, line: 1 },
      { id: "src-b", excerpt: "e-1", line: 2 },
    ]);
  });

  it("counts whitespace-separated tokens", () => {
    expect(countWords("  one two\n\nthree\tfour  ")).toBe(4);
  });
});

/** Validates a modified copy of the valid sample and returns the rule names that fired. */
function rulesFor(change: (f: SampleFiles) => void, slug = "laws-of-the-game"): string[] {
  const files = sampleFiles();
  change(files);
  const tmp = makeTempRoot(seed);
  writeDomain(tmp, slug, files);
  return validateDomainFolder(tmp, slug, seed).map((v) => v.rule);
}

describe("validateDomainFolder rejections", () => {
  it("accepts the unchanged sample", () => {
    expect(rulesFor(() => {})).toEqual([]);
  });

  it("rejects 26 sources", () => {
    const rules = rulesFor((f) => {
      f.sources = Array.from({ length: 26 }, (_, i) =>
        sampleSource(`src-bulk-${i}`, `https://example.org/bulk-${i}`),
      );
    });
    expect(rules).toContain("sources-count");
  });

  it("rejects findings of 1,501 words", () => {
    const rules = rulesFor((f) => {
      const filler = `${"word ".repeat(1501)}`;
      f.findings = `${f.findings}\n${filler}\n`;
    });
    expect(rules).toContain("findings-word-cap");
  });

  it("rejects visual_ideas of 601 words", () => {
    const rules = rulesFor((f) => {
      f.visual = `${f.visual}\n${"word ".repeat(601)}\n`;
    });
    expect(rules).toContain("visual-word-cap");
  });

  it("rejects a missing ## Misconceptions heading", () => {
    const rules = rulesFor((f) => {
      f.findings = f.findings.replace("## Misconceptions\n", "");
    });
    expect(rules).toContain("findings-headings");
  });

  it("rejects headings in the wrong order", () => {
    const rules = rulesFor((f) => {
      f.findings = f.findings
        .replace("## Must teach", "## TMP")
        .replace("## Misconceptions", "## Must teach")
        .replace("## TMP", "## Misconceptions");
    });
    expect(rules).toContain("findings-headings");
  });

  it("rejects a Contested paragraph citing one source", () => {
    const rules = rulesFor((f) => {
      f.findings = f.findings.replace(
        "another view says it does not [src-ifab-laws-2026-27]",
        "another view says it does not [src-sample-toy]",
      );
    });
    expect(rules).toContain("contested-sources");
  });

  it("rejects an uncited Must-teach bullet", () => {
    const rules = rulesFor((f) => {
      f.findings = f.findings.replace(
        "- Teach the idea in one visual step [src-sample-toy].",
        "- Teach the idea in one visual step.",
      );
    });
    expect(rules).toContain("claim-uncited");
  });

  it("rejects a 16.5 m line without an excerpt citation", () => {
    const rules = rulesFor((f) => {
      f.findings = f.findings.replace(
        "## Must teach\n",
        "## Must teach\n- The penalty area reaches 16.5 m from the goal line [src-sample-toy].\n",
      );
    });
    expect(rules).toContain("measured-needs-excerpt");
  });

  it("accepts a measured number that carries an excerpt citation", () => {
    const rules = rulesFor((f) => {
      f.findings = f.findings.replace(
        "## Must teach\n",
        "## Must teach\n- The touchline is 90 m to 120 m long [src-ifab-laws-2026-27#law1-touchline-length].\n",
      );
    });
    expect(rules).toEqual([]);
  });

  it("rejects a citation to an unknown source id", () => {
    const rules = rulesFor((f) => {
      f.findings = f.findings.replace(
        "[src-sample-toy].\n\n## Must",
        "[src-nope-nothing].\n\n## Must",
      );
    });
    expect(rules).toContain("cite-unknown-source");
  });

  it("rejects a citation to an unknown excerpt id", () => {
    const rules = rulesFor((f) => {
      f.findings = f.findings.replace("#effective-date", "#no-such-excerpt");
    });
    expect(rules).toContain("cite-unknown-excerpt");
  });

  it("rejects a regulation source without excerpts", () => {
    const rules = rulesFor((f) => {
      (f.sources[0] as SourceEntry).type = "regulation";
    });
    expect(rules).toContain("regulation-excerpt");
  });

  it("rejects an empty licence note", () => {
    const rules = rulesFor((f) => {
      const lic = (f.sources[0] as SourceEntry).license as Record<string, { note: string }>;
      (lic.redistribute as { note: string }).note = "   ";
    });
    expect(rules).toContain("license-note");
  });

  it("rejects a seed URL re-minted under a new id", () => {
    const ifab = seed.find((s) => s.id === "src-ifab-laws-2026-27") as SourceEntry;
    const rules = rulesFor((f) => {
      f.sources.push(sampleSource("src-my-own-ifab", ifab.url));
      f.findings = f.findings.replace(
        "[src-sample-toy].\n\n## Must",
        "[src-sample-toy][src-my-own-ifab].\n\n## Must",
      );
    });
    expect(rules).toContain("seed-url-new-id");
  });

  it("rejects a seed id pointing at a different URL", () => {
    const rules = rulesFor((f) => {
      f.sources.push(sampleSource("src-ifab-laws-2026-27", "https://example.org/other"));
    });
    expect(rules).toContain("seed-id-url-mismatch");
  });

  it("rejects a fenced code block in visual_ideas.md", () => {
    const rules = rulesFor((f) => {
      f.visual = `${f.visual}\n\`\`\`js\nconsole.log(1)\n\`\`\`\n`;
    });
    expect(rules).toContain("no-code-fence");
  });

  it("rejects duplicate ids, a bad id prefix, a repeated excerpt id and an uncited source", () => {
    const dup = rulesFor((f) => {
      f.sources.push(sampleSource("src-sample-toy", "https://example.org/another"));
    });
    expect(dup).toContain("source-id-unique");
    const prefix = rulesFor((f) => {
      f.sources[0] = sampleSource("sample-toy", "https://example.org/sample-toy");
    });
    expect(prefix).toContain("source-id-prefix");
    const excerpts = rulesFor((f) => {
      const ex = {
        id: "same-id",
        locator: "p.1",
        fetched_at: "2026-11-27T10:00:00Z",
        sha256: "a".repeat(64),
        paraphrase: "x",
      };
      (f.sources[0] as SourceEntry).excerpts = [ex, { ...ex }];
    });
    expect(excerpts).toContain("excerpt-id-unique");
    const uncited = rulesFor((f) => {
      f.sources.push(sampleSource("src-never-cited", "https://example.org/never"));
    });
    expect(uncited).toContain("source-uncited");
  });

  it("rejects visual_ideas.md with fewer than three level-2 headings", () => {
    const rules = rulesFor((f) => {
      f.visual = "# Visual ideas\n\n## Only one\nA dot.\n";
    });
    expect(rules).toContain("visual-headings");
  });

  it("rejects schema-invalid sources and a missing or empty file", () => {
    const schema = rulesFor((f) => {
      (f.sources[0] as SourceEntry).quality = 9;
    });
    expect(schema).toContain("source-schema");
    const tmp = makeTempRoot(seed);
    writeDomain(tmp, "formations", { ...sampleFiles(), findings: "  \n" });
    const empty = validateDomainFolder(tmp, "formations", seed).map((v) => v.rule);
    expect(empty).toContain("files-exist");
  });
});

describe("slug-specific rules", () => {
  const ALL_ROLES = [
    "sporting-director",
    "head-coach",
    "head-of-performance-analysis",
    "head-of-data-science",
    "head-of-recruitment",
    "academy-director",
    "club-ceo",
    "head-of-performance",
    "assistant-coach",
    "set-piece-coach",
    "loan-manager",
    "chief-scout",
    "first-team-analyst",
    "recruitment-analyst",
    "data-engineer",
  ];
  const NOTHING = "- Nothing else is known yet.";

  it("laws-of-the-game needs the edition and the effective date in findings", () => {
    const noEdition = rulesFor((f) => {
      f.findings = f.findings.replace("2026/27", "2025/26");
    }, "laws-of-the-game");
    expect(noEdition).toContain("slug-laws-edition");
    const noDate = rulesFor((f) => {
      f.findings = f.findings.replace("1 July 2026", "July");
    }, "laws-of-the-game");
    expect(noDate).toContain("slug-laws-edition");
  });

  it("learning-science-adhd needs an evidence grade on every paper and both evidence labels", () => {
    const withPaper = (notes: string) => (f: SampleFiles) => {
      const paper = sampleSource("src-review-retrieval", "https://example.org/review");
      paper.type = "paper";
      paper.notes = notes;
      f.sources.push(paper);
      f.findings = f.findings.replace(
        NOTHING,
        "- ADHD-specific evidence is thin. General learning science says retrieval helps [src-review-retrieval].",
      );
    };
    const slug = "learning-science-adhd";
    expect(
      rulesFor(withPaper("systematic review, children with ADHD, evidence grade: moderate"), slug),
    ).toEqual([]);
    expect(rulesFor(withPaper("systematic review, children with ADHD"), slug)).toContain(
      "slug-adhd-evidence-grade",
    );
    const noLabels = rulesFor((f) => {
      withPaper("review, evidence grade: low")(f);
      f.findings = f.findings.replace("ADHD-specific", "specific");
    }, slug);
    expect(noLabels).toContain("slug-adhd-sections");
  });

  it("role-definitions findings must mention every canonical role id", () => {
    const all = (f: SampleFiles) => {
      f.findings = f.findings.replace(NOTHING, `- Roles covered: ${ALL_ROLES.join(", ")}.`);
    };
    expect(rulesFor(all, "role-definitions")).toEqual([]);
    const missing = rulesFor((f) => {
      all(f);
      f.findings = f.findings.replace("data-engineer", "engineer");
    }, "role-definitions");
    expect(missing).toContain("slug-roles-covered");
  });

  it("pl-data-sources needs FBref advanced stats removed and a coverage-matrix mention", () => {
    const fbref = seed.find((s) => s.id === "src-fbref-advanced-stats") as SourceEntry;
    const matrix = (f: SampleFiles) => {
      f.findings = f.findings.replace(NOTHING, "- See coverage-matrix.json for the counts.");
    };
    const good = (f: SampleFiles) => {
      matrix(f);
      f.sources.push({ ...fbref });
      f.findings = f.findings.replace(
        "[src-sample-toy].\n\n## Must",
        "[src-sample-toy][src-fbref-advanced-stats].\n\n## Must",
      );
    };
    expect(rulesFor(good, "pl-data-sources")).toEqual([]);
    expect(rulesFor(matrix, "pl-data-sources")).toContain("slug-pl-fbref-removed");
    const noMatrix = rulesFor((f) => {
      good(f);
      f.findings = f.findings.replace("coverage-matrix.json", "the matrix");
    }, "pl-data-sources");
    expect(noMatrix).toContain("slug-pl-coverage-matrix");
  });

  it("interactive-explainers needs src-okabe-ito-cud with an excerpt", () => {
    const okabe = (withExcerpt: boolean) => (f: SampleFiles) => {
      const s = sampleSource("src-okabe-ito-cud", "https://example.org/okabe-ito");
      if (withExcerpt) {
        s.excerpts = [
          {
            id: "palette-hex",
            locator: "table 1",
            fetched_at: "2026-11-27T10:00:00Z",
            sha256: "b".repeat(64),
            paraphrase: "Seven colour-blind-safe hues.",
          },
        ];
      }
      f.sources.push(s);
      f.findings = f.findings.replace(
        "[src-sample-toy].\n\n## Must",
        "[src-sample-toy][src-okabe-ito-cud].\n\n## Must",
      );
    };
    const slug = "interactive-explainers";
    expect(rulesFor(okabe(true), slug)).toEqual([]);
    expect(rulesFor(okabe(false), slug)).toContain("slug-explainers-okabe-ito");
    expect(rulesFor(() => {}, slug)).toContain("slug-explainers-okabe-ito");
  });
});
