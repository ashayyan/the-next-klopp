// Step extraction: one record per top-level `<Step>` with its heading, line and visible words.
// Word counting follows 05-RESEARCH Pitfall 1 so the validator and `review:screens` agree:
// inside a paragraph, text and inline-element text join with no space ("line" + "." is one word);
// blocks join with one space; code, inline code, image alt, every JSX attribute value and the
// whole `<Visual>` subtree (rendered outside `[data-lesson-step]`) add nothing.
// Erasable TypeScript only.
import type { Root } from "mdast";
import { countWords } from "../words.ts";
import { asNode, lineOf, type MdNode, stringAttribute } from "./parse.ts";

export interface StepInfo {
  /** The `id` attribute (empty string when missing or not a plain string). */
  id: string;
  /** Line of the opening `<Step>` tag. */
  line: number;
  /** Text of the first depth-2 heading among the step's blocks, or `null`. */
  heading: string | null;
  /** Visible text, whitespace collapsed. */
  text: string;
  words: number;
}

/** Nodes that render nothing a learner reads as lesson text. */
const SILENT = new Set([
  "code",
  "inlineCode",
  "image",
  "imageReference",
  "definition",
  "html",
  "yaml",
  "mdxjsEsm",
  "mdxFlowExpression",
  "mdxTextExpression",
]);

/** Blocks whose children are phrasing content: their text joins with no separator. */
const PHRASING_PARENTS = new Set(["paragraph", "heading", "tableCell"]);

function isVisual(node: MdNode): boolean {
  return (
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
    node.name === "Visual"
  );
}

function inlineText(node: MdNode): string {
  if (SILENT.has(node.type) || isVisual(node)) return "";
  if (node.type === "text") return typeof node.value === "string" ? node.value : "";
  if (node.type === "break") return " ";
  return (node.children ?? []).map(inlineText).join("");
}

function collectBlocks(node: MdNode, out: string[]): void {
  if (SILENT.has(node.type) || isVisual(node)) return;
  if (PHRASING_PARENTS.has(node.type)) {
    out.push(inlineText(node));
    return;
  }
  for (const child of node.children ?? []) collectBlocks(child, out);
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Visible text of one block-level node (a Step, or any flow element inside it). */
export function visibleText(node: MdNode): string {
  const blocks: string[] = [];
  for (const child of node.children ?? []) collectBlocks(child, blocks);
  return collapse(
    blocks
      .map(collapse)
      .filter((b) => b !== "")
      .join(" "),
  );
}

/** Text of a heading node, formatting and code removed. */
export function headingText(node: MdNode): string {
  return collapse(inlineText(node));
}

/** The top-level `<Step>` elements of a lesson, in document order. */
export function stepNodes(tree: Root): MdNode[] {
  return (asNode(tree).children ?? []).filter(
    (n) => n.type === "mdxJsxFlowElement" && n.name === "Step",
  );
}

export function extractSteps(tree: Root): StepInfo[] {
  return stepNodes(tree).map((node) => {
    const heading = (node.children ?? []).find((c) => c.type === "heading" && c.depth === 2);
    const text = visibleText(node);
    return {
      id: stringAttribute(node, "id") ?? "",
      line: lineOf(node),
      heading: heading ? headingText(heading) : null,
      text,
      words: countWords(text),
    };
  });
}
