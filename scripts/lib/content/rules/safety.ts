// Safety rules: lesson MDX is compiled to JavaScript that runs in the learner's browser, so a
// lesson may hold only prose and the provider's components (threat T-05-03), with links that are
// https or inside the app (T-05-04), no stray metadata block, and block and inline components in
// the places they render correctly (05-RESEARCH Pitfall 2). Erasable TypeScript only.
import {
  asNode,
  isJsxElement,
  lineOf,
  type MdAttributeExpression,
  type MdNode,
  stringAttribute,
  walk,
} from "../parse.ts";
import type { Issue, LessonInput, RuleEntry } from "./index.ts";

/** Components that render a block: opening tag on its own line, then a blank line. */
const FLOW_COMPONENTS = ["Step", "Visual", "Rule", "Contested"] as const;
/** Components that sit inside a sentence. `<Stat variant="figure">` is the one flow use of Stat. */
const TEXT_COMPONENTS = ["Fact", "Stat", "Num"] as const;
const FLOW = new Set<string>(FLOW_COMPONENTS);
const TEXT = new Set<string>(TEXT_COMPONENTS);
const KNOWN = new Set<string>([...FLOW_COMPONENTS, ...TEXT_COMPONENTS]);

const displayName = (node: MdNode) => node.name ?? "";

function mdxFrontmatter(lesson: LessonInput): Issue[] {
  return (asNode(lesson.tree).children ?? [])
    .filter((n) => n.type === "yaml" || n.type === "toml")
    .map((n) => ({
      file: lesson.mdxPath,
      line: lineOf(n),
      ruleId: "mdx-frontmatter",
      message:
        "lesson.mdx starts with a frontmatter block. Lessons keep all metadata in lesson.json; delete the block.",
    }));
}

interface EsNode {
  type: string;
  [key: string]: unknown;
}

const asEs = (value: unknown): EsNode | null =>
  typeof value === "object" && value !== null && typeof (value as EsNode).type === "string"
    ? (value as EsNode)
    : null;

/** `{ claim: "…", source: "…" }` written with plain keys and string literals only. */
function isSideLiteral(node: EsNode | null): boolean {
  if (node?.type !== "ObjectExpression" || !Array.isArray(node.properties)) return false;
  const keys: string[] = [];
  for (const raw of node.properties) {
    const property = asEs(raw);
    if (
      property?.type !== "Property" ||
      property.kind !== "init" ||
      property.computed === true ||
      property.method === true ||
      property.shorthand === true
    ) {
      return false;
    }
    const key = asEs(property.key);
    const name =
      key?.type === "Identifier"
        ? key.name
        : key?.type === "Literal" && typeof key.value === "string"
          ? key.value
          : null;
    const value = asEs(property.value);
    if (typeof name !== "string" || value?.type !== "Literal" || typeof value.value !== "string") {
      return false;
    }
    keys.push(name);
  }
  return keys.length === 2 && keys.includes("claim") && keys.includes("source");
}

/** `sides={[…]}` is static: an array literal of side objects, nothing computed (Pattern 2). */
export function isStaticSides(expression: MdAttributeExpression): boolean {
  const program = asEs(expression.data?.estree);
  const body = program && Array.isArray(program.body) ? program.body : [];
  if (body.length !== 1) return false;
  const statement = asEs(body[0]);
  const array = statement?.type === "ExpressionStatement" ? asEs(statement.expression) : null;
  if (array?.type !== "ArrayExpression" || !Array.isArray(array.elements)) return false;
  return array.elements.every((element) => isSideLiteral(asEs(element)));
}

function mdxCode(lesson: LessonInput): Issue[] {
  const issues: Issue[] = [];
  const add = (line: number, kind: string) =>
    issues.push({
      file: lesson.mdxPath,
      line,
      ruleId: "mdx-code",
      message: `Line ${line} holds code (${kind}). Lessons may not contain import, export or {…} expressions; use a lesson component instead.`,
    });
  walk(asNode(lesson.tree), (node) => {
    if (node.type === "mdxjsEsm") add(lineOf(node), "import or export");
    else if (node.type === "mdxFlowExpression" || node.type === "mdxTextExpression") {
      add(lineOf(node), "expression");
    } else if (isJsxElement(node)) {
      for (const attribute of node.attributes ?? []) {
        const line = lineOf(attribute, lineOf(node));
        const kind = `attribute expression on <${displayName(node)}>`;
        if (attribute.type === "mdxJsxExpressionAttribute") {
          add(line, kind);
          continue;
        }
        const value = attribute.value;
        if (value === null || value === undefined || typeof value === "string") continue;
        const allowed =
          node.name === "Contested" && attribute.name === "sides" && isStaticSides(value);
        if (!allowed) add(line, kind);
      }
    }
  });
  return issues;
}

function blockComponent(lesson: LessonInput): Issue[] {
  const issues: Issue[] = [];
  walk(asNode(lesson.tree), (node) => {
    const name = node.name;
    if (!isJsxElement(node) || typeof name !== "string") return;
    if (FLOW.has(name) && node.type === "mdxJsxTextElement") {
      issues.push({
        file: lesson.mdxPath,
        line: lineOf(node),
        ruleId: "block-component",
        message: `<${name}> must sit on its own line with a blank line after it. Put the opening tag on a line of its own.`,
      });
    } else if (
      TEXT.has(name) &&
      node.type === "mdxJsxFlowElement" &&
      !(name === "Stat" && stringAttribute(node, "variant") === "figure")
    ) {
      issues.push({
        file: lesson.mdxPath,
        line: lineOf(node),
        ruleId: "block-component",
        message: `<${name}> belongs inside a sentence, not on its own line. Move it into the paragraph.`,
      });
    }
  });
  return issues;
}

function unknownComponent(lesson: LessonInput): Issue[] {
  const issues: Issue[] = [];
  walk(asNode(lesson.tree), (node) => {
    if (!isJsxElement(node) || (typeof node.name === "string" && KNOWN.has(node.name))) return;
    issues.push({
      file: lesson.mdxPath,
      line: lineOf(node),
      ruleId: "unknown-component",
      message: `<${displayName(node)}> is not a lesson component. Use one of Step, Visual, Fact, Stat, Rule, Contested or Num.`,
    });
  });
  return issues;
}

/** `https:` or a root-relative path inside the app (not `//host`, which leaves the app). */
export function isAllowedUrl(url: string): boolean {
  const trimmed = url.trim();
  if (/^https:\/\//i.test(trimmed)) return true;
  return trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\");
}

function linkScheme(lesson: LessonInput): Issue[] {
  const issues: Issue[] = [];
  walk(asNode(lesson.tree), (node, ancestors) => {
    const urls: string[] = [];
    if (
      (node.type === "link" || node.type === "image" || node.type === "definition") &&
      typeof node.url === "string"
    ) {
      urls.push(node.url);
    }
    if (isJsxElement(node)) {
      for (const name of ["href", "src"]) {
        const value = stringAttribute(node, name);
        if (value !== undefined) urls.push(value);
      }
    }
    if (urls.length === 0) return;
    const stepNode = [...ancestors]
      .reverse()
      .find((a) => a.type === "mdxJsxFlowElement" && a.name === "Step");
    const step = stepNode ? stringAttribute(stepNode, "id") : undefined;
    for (const url of urls) {
      if (isAllowedUrl(url)) continue;
      const where = step !== undefined ? ` in step “${step}”` : "";
      issues.push({
        file: lesson.mdxPath,
        line: lineOf(node),
        ruleId: "link-scheme",
        message: `Link “${url}”${where} is not https or a path inside the app. Use an https link or cite the source with a claim component.`,
      });
    }
  });
  return issues;
}

export const safetyRules: readonly RuleEntry[] = [
  { id: "mdx-frontmatter", run: mdxFrontmatter },
  { id: "mdx-code", run: mdxCode },
  { id: "block-component", run: blockComponent },
  { id: "unknown-component", run: unknownComponent },
  { id: "link-scheme", run: linkScheme },
];
