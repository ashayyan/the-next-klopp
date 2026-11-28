// One parse for every lesson rule: the build's own MDX parser (`@mdx-js/mdx` createProcessor,
// with remark-frontmatter registered so a stray YAML block becomes a node a rule can reject
// instead of rendered text). 05-RESEARCH Pattern 2 and Code Example 2. Erasable TypeScript only.
import { createProcessor } from "@mdx-js/mdx";
import type { Root } from "mdast";
import remarkFrontmatter from "remark-frontmatter";

/**
 * The parts of an mdast / mdx node the validator reads. The full node types live in `mdast` and
 * the `mdast-util-mdx*` packages; the rules only need this structural view.
 */
export interface MdNode {
  type: string;
  children?: MdNode[];
  /** JSX element name (`null` for a fragment). */
  name?: string | null;
  attributes?: MdAttribute[];
  value?: unknown;
  depth?: number;
  url?: string;
  alt?: string | null;
  position?: { start: { line: number } };
}

/** `mdxJsxAttribute` (`name="…"` or `name={…}`) or `mdxJsxExpressionAttribute` (`{...spread}`). */
export interface MdAttribute {
  type: string;
  name?: string;
  value?: string | null | MdAttributeExpression;
  position?: { start: { line: number } };
}

export interface MdAttributeExpression {
  type: string;
  value: string;
  data?: { estree?: unknown };
}

/** Parses lesson MDX (CRLF normalised to LF) exactly as the build does. Throws on bad MDX. */
export function parseLesson(path: string, text: string): Root {
  const processor = createProcessor({ remarkPlugins: [remarkFrontmatter] });
  return processor.parse({ path, value: text.replace(/\r\n/g, "\n") });
}

/** The structural view of a parsed tree. */
export function asNode(tree: Root): MdNode {
  return tree as unknown as MdNode;
}

export function lineOf(node: { position?: { start: { line: number } } }, fallback = 1): number {
  return node.position?.start.line ?? fallback;
}

export function isJsxElement(node: MdNode): boolean {
  return node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement";
}

/** A string-valued JSX attribute, or `undefined` when absent or written as an expression. */
export function stringAttribute(node: MdNode, name: string): string | undefined {
  for (const attribute of node.attributes ?? []) {
    if (attribute.type === "mdxJsxAttribute" && attribute.name === name) {
      return typeof attribute.value === "string" ? attribute.value : undefined;
    }
  }
  return undefined;
}

/** Depth-first, document order. `ancestors` runs from the root to the parent. */
export function walk(
  node: MdNode,
  visit: (node: MdNode, ancestors: readonly MdNode[]) => void,
  ancestors: MdNode[] = [],
): void {
  visit(node, ancestors);
  const children = node.children;
  if (!children) return;
  ancestors.push(node);
  for (const child of children) walk(child, visit, ancestors);
  ancestors.pop();
}
