import { describe, expect, it } from "vitest";
import { parseLesson } from "./parse.ts";
import { extractSteps } from "./steps.ts";

const steps = (mdx: string) => extractSteps(parseLesson("lesson.mdx", mdx));

describe("extractSteps", () => {
  it("reads the id, line and first ## heading of each top-level Step", () => {
    const result = steps(
      '<Step id="one">\n\n## First screen\n\nSome words.\n\n</Step>\n\n<Step id="two">\n\n## Second\n\nMore.\n\n</Step>\n',
    );
    expect(result.map((s) => [s.id, s.line, s.heading])).toEqual([
      ["one", 1, "First screen"],
      ["two", 9, "Second"],
    ]);
  });

  it("counts “line” followed by an inline element ending in “.” as one word", () => {
    const [step] = steps(
      '<Step id="s">\n\n## Goal\n\nThe whole ball crosses the line<Fact id="f">.</Fact>\n\n</Step>\n',
    );
    expect(step?.text).toBe("Goal The whole ball crosses the line.");
    expect(step?.words).toBe(7);
  });

  it("joins inline formatting without a space and blocks with one", () => {
    const [step] = steps(
      '<Step id="s">\n\n## Over the **line**\n\nA *quick*ly taken kick.\n\n- one\n- two\n\n</Step>\n',
    );
    expect(step?.text).toBe("Over the line A quickly taken kick. one two");
    expect(step?.words).toBe(9);
  });

  it("adds nothing for a <Visual> paragraph, code, inline code, image alt or attribute values", () => {
    const [step] = steps(
      [
        '<Step id="s">',
        "",
        "## Heading",
        "",
        'Two words `skipped code` ![alt words here](https://example.org/x.png) <Fact id="attribute words" />',
        "",
        "```",
        "code block words",
        "```",
        "",
        "<Visual>",
        "",
        "Hidden words inside the visual.",
        "",
        "</Visual>",
        "",
        "</Step>",
        "",
      ].join("\n"),
    );
    expect(step?.text).toBe("Heading Two words");
    expect(step?.words).toBe(3);
  });

  it("gives heading null when the step has no ## heading", () => {
    const [step] = steps('<Step id="s">\n\nJust a paragraph.\n\n</Step>\n');
    expect(step?.heading).toBeNull();
    expect(step?.words).toBe(3);
  });

  it("normalises CRLF so lines match an LF checkout", () => {
    const result = steps(
      '<Step id="a">\r\n\r\n## A\r\n\r\n</Step>\r\n\r\n<Step id="b">\r\n\r\n## B\r\n\r\n</Step>\r\n',
    );
    expect(result.map((s) => s.line)).toEqual([1, 7]);
  });
});
