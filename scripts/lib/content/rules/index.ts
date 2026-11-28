// The rule contract of the content validator (CONT-02). Every rule is a pure function from one
// lesson plus the shared context to a list of issues; nothing throws, nothing reads files.
// Later plans append rules to RULES only: the generic fixture test (rules.test.ts) picks up a new
// `content/_fixtures/invalid/<rule-id>/` folder with no edit. Erasable TypeScript only.
import type { Root } from "mdast";
import type { LessonSpec } from "../../../../src/schemas/lesson.ts";
import type { DenyManifest } from "../../globs.ts";
import type { AliasesLike, ConceptMapLike, RegistryEntryLike } from "../curriculum.ts";
import type { StepInfo } from "../steps.ts";
import { structureRules } from "./structure.ts";

export interface Issue {
  /** Repo-relative path with forward slashes. */
  file: string;
  line: number;
  ruleId: string;
  message: string;
}

export interface ParseError {
  line: number;
  reason: string;
}

export interface LessonInput {
  /** Repo-relative lesson folder, forward slashes, e.g. `content/_fixtures/fx-a-goal-in-ten-actions`. */
  dir: string;
  specPath: string;
  mdxPath: string;
  specText: string;
  mdxText: string;
  /** The schema-valid spec, or `null` when lesson.json is not valid JSON or breaks spec v1. */
  spec: LessonSpec | null;
  tree: Root;
  /** Set when lesson.mdx is missing or is not valid MDX; `tree` is then empty. */
  parseError: ParseError | null;
  steps: StepInfo[];
  fixture: boolean;
}

export interface RuleContext {
  lessons: LessonInput[];
  registry: RegistryEntryLike[];
  aliases: AliasesLike;
  /** public/data/catalog.json, or `null` when absent. */
  catalog: unknown;
  /** research/roles.json and research/competencies.json (arrays of `{ id, … }`). */
  roles: unknown[];
  competencies: unknown[];
  conceptMap: ConceptMapLike;
  denyManifest: DenyManifest | null;
  /** Interaction registry props schemas, keyed by id (filled by 05-11). */
  interactions: Record<string, unknown>;
}

export type Rule = (lesson: LessonInput, ctx: RuleContext) => Issue[];

export interface RuleEntry {
  id: string;
  run: Rule;
}

export const RULES: readonly RuleEntry[] = [...structureRules];

export function compareIssues(a: Issue, b: Issue): number {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  if (a.line !== b.line) return a.line - b.line;
  if (a.ruleId !== b.ruleId) return a.ruleId < b.ruleId ? -1 : 1;
  return a.message < b.message ? -1 : a.message > b.message ? 1 : 0;
}

/** Every rule over every lesson, sorted by file, line and rule id. */
export function runRules(ctx: RuleContext, rules: readonly RuleEntry[] = RULES): Issue[] {
  const issues: Issue[] = [];
  for (const lesson of ctx.lessons) {
    for (const rule of rules) issues.push(...rule.run(lesson, ctx));
  }
  return issues.sort(compareIssues);
}

/** One output line: `<file>:<line> <rule-id>: <message>`. */
export function formatIssue(issue: Issue): string {
  return `${issue.file}:${issue.line} ${issue.ruleId}: ${issue.message}`;
}
