// The probe's readout: a prompt while nothing converts, the canonical metres once it does.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConverterProbe, type ProbeInput } from "./ConverterProbe.tsx";
import { probeConvert } from "./probe.ts";

const PITCH = { length: 105, width: 68 };

function readout(input: ProbeInput): string {
  const html = renderToStaticMarkup(
    <ConverterProbe
      value={input}
      onChange={() => {}}
      result={probeConvert(input.provider, input.xText, input.yText, PITCH)}
    />,
  );
  return /data-readout="probe"[^>]*>([^<]*)</.exec(html)?.[1] ?? "";
}

describe("converter probe readout", () => {
  it("prompts for input while the fields are empty", () => {
    expect(readout({ provider: "statsbomb", xText: "", yText: "" })).toBe(
      "Enter provider coordinates to convert",
    );
  });

  it("prompts, not a dash placeholder, when the input is out of range", () => {
    const text = readout({ provider: "statsbomb", xText: "130", yText: "40" });
    expect(text).toBe("Enter provider coordinates to convert");
    expect(text).not.toContain("—");
  });

  it("shows the canonical point once the input converts", () => {
    expect(readout({ provider: "statsbomb", xText: "60", yText: "40" })).toBe(
      "Canonical x 52.50 m · y 34.00 m",
    );
  });
});
