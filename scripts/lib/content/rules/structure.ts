// Structural rules: the lesson files can be read, lesson.json matches spec v1, the MDX steps and
// steps[] agree, and every step opens with one ## heading. Messages follow UI-SPEC "Terminal copy"
// ("what broke. how to fix it."). Erasable TypeScript only.
import { lessonSchema } from "../../../../src/schemas/lesson.ts";
import { lineOf } from "../parse.ts";
import { stepNodes } from "../steps.ts";
import type { Issue, LessonInput, RuleEntry } from "./index.ts";

function escapePointer(segment: PropertyKey): string {
  return String(segment).replaceAll("~", "~0").replaceAll("/", "~1");
}

function pointer(path: readonly PropertyKey[]): string {
  return path.map((p) => `/${escapePointer(p)}`).join("") || "/";
}

function withoutFinalStop(text: string): string {
  return text.trim().replace(/\.$/, "");
}

/** 1-based line of the first occurrence of `"value"` at or after the `"steps"` key; 1 if absent. */
function stepLineInSpec(specText: string, value: string): number {
  const lines = specText.replace(/\r\n/g, "\n").split("\n");
  const start = Math.max(
    0,
    lines.findIndex((l) => l.includes('"steps"')),
  );
  const needle = JSON.stringify(value);
  for (let i = start; i < lines.length; i += 1) {
    if (lines[i]?.includes(needle)) return i + 1;
  }
  return 1;
}

/** lesson.mdx exists and is valid MDX. Without this, every MDX rule would see an empty lesson. */
function mdxParse(lesson: LessonInput): Issue[] {
  const error = lesson.parseError;
  if (!error) return [];
  const message =
    error.reason === "missing"
      ? "lesson.mdx is missing. Add it next to lesson.json with one <Step> for each entry in steps[]."
      : `lesson.mdx is not valid MDX: ${withoutFinalStop(error.reason)}. Fix the markup on this line.`;
  return [{ file: lesson.mdxPath, line: error.line, ruleId: "mdx-parse", message }];
}

function schema(lesson: LessonInput): Issue[] {
  const issue = (path: string, detail: string): Issue => ({
    file: lesson.specPath,
    line: 1,
    ruleId: "schema",
    message: `lesson.json does not match the lesson schema at ${path}: ${withoutFinalStop(detail)}. Fix that field; schemas/lesson.schema.json lists every field.`,
  });
  let raw: unknown;
  try {
    raw = JSON.parse(lesson.specText);
  } catch (error) {
    return [issue("/", `not valid JSON (${(error as Error).message})`)];
  }
  const parsed = lessonSchema.safeParse(raw);
  if (parsed.success) return [];
  return parsed.error.issues.map((i) => issue(pointer(i.path), i.message));
}

function stepParity(lesson: LessonInput): Issue[] {
  if (!lesson.spec || lesson.parseError) return [];
  const issues: Issue[] = [];
  const specScreens = lesson.spec.steps.map((s) => s.screen ?? s.id);
  const specSet = new Set(specScreens);
  const mdxIds = lesson.steps.map((s) => s.id);
  const mdxSet = new Set(mdxIds);
  for (const step of lesson.steps) {
    if (specSet.has(step.id)) continue;
    issues.push({
      file: lesson.mdxPath,
      line: step.line,
      ruleId: "step-parity",
      message: `Step “${step.id}” is in lesson.mdx but not in steps[] of lesson.json. Add it to steps[] in the same order.`,
    });
  }
  for (const screen of specScreens) {
    if (mdxSet.has(screen)) continue;
    issues.push({
      file: lesson.specPath,
      line: stepLineInSpec(lesson.specText, screen),
      ruleId: "step-parity",
      message: `Step “${screen}” is in steps[] of lesson.json but not in lesson.mdx. Add a <Step id=“${screen}”> or remove the entry.`,
    });
  }
  // Order: compare the steps both files list, position by position.
  const sharedMdx = lesson.steps.filter((s) => specSet.has(s.id));
  const sharedSpec = specScreens.filter((s) => mdxSet.has(s));
  sharedMdx.forEach((step, index) => {
    if (sharedSpec[index] === step.id) return;
    issues.push({
      file: lesson.mdxPath,
      line: step.line,
      ruleId: "step-parity",
      message: `Step “${step.id}” is out of order: lesson.mdx and steps[] must list the steps in the same order.`,
    });
  });
  return issues;
}

function stepHeading(lesson: LessonInput): Issue[] {
  const issues: Issue[] = [];
  for (const node of stepNodes(lesson.tree)) {
    const children = node.children ?? [];
    const first = children[0];
    const opensWithH2 = first?.type === "heading" && first.depth === 2;
    const topHeadings = children.filter((c) => c.type === "heading" && (c.depth ?? 6) <= 2).length;
    if (opensWithH2 && topHeadings === 1) continue;
    const id = lesson.steps.find((s) => s.line === lineOf(node))?.id ?? "";
    issues.push({
      file: lesson.mdxPath,
      line: lineOf(node),
      ruleId: "step-heading",
      message: `Step “${id}” does not start with one ## heading. Start the step with a single ## heading line.`,
    });
  }
  return issues;
}

export const structureRules: readonly RuleEntry[] = [
  { id: "mdx-parse", run: mdxParse },
  { id: "schema", run: schema },
  { id: "step-parity", run: stepParity },
  { id: "step-heading", run: stepHeading },
];
