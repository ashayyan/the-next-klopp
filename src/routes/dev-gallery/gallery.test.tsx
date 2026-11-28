import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { GLYPH_IDS } from "../../pitch/glyphs/registry.ts";
import { glyphIdsForScene } from "../../pitch/legend/glyphIds.ts";
import { GalleryIndex, GalleryPrimitive, parseTheme, parseWidth } from "../dev-gallery.tsx";
import { ColourDemo, contrastOnPage, TOKENS } from "./demos/foundations.tsx";
import { glyphSheet } from "./demos/pitch.tsx";
import { frameSrc } from "./Frames.tsx";
import inventoryJson from "./inventory.json";
import { findPrimitive, GALLERY, GROUPS, groupedPrimitives, stateFromHash } from "./registry.ts";
import { GalleryThemeProvider } from "./StateCell.tsx";

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
interface InventoryEntry {
  id: string;
  group: string;
  states: string[];
}
const inventory: InventoryEntry[] = inventoryJson;
const count = (html: string, needle: string) => html.split(needle).length - 1;

function page(path: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dev/gallery" element={<GalleryIndex />} />
        <Route path="/dev/gallery/:primitiveId" element={<GalleryPrimitive />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("registry", () => {
  it("finds a registered primitive and returns undefined for an unknown id", () => {
    expect(findPrimitive("button")?.label).toBe("Button");
    expect(findPrimitive("nope")).toBeUndefined();
    expect(findPrimitive(undefined)).toBeUndefined();
  });

  it("holds unique kebab-case ids and kebab-case state names in a known group", () => {
    const ids = GALLERY.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of GALLERY) {
      expect(p.id, p.id).toMatch(KEBAB);
      expect(GROUPS).toContain(p.group);
      expect(p.states.length, `${p.id} states`).toBeGreaterThan(0);
      expect(new Set(p.states).size).toBe(p.states.length);
      for (const s of p.states) expect(s, `${p.id}/${s}`).toMatch(KEBAB);
    }
  });

  it("registers the five Foundations primitives", () => {
    const foundations = GALLERY.filter((p) => p.group === "Foundations").map((p) => p.id);
    expect(foundations).toEqual(["colour", "type", "space-radius", "icons", "motion"]);
  });

  it("reads a state name only from a well formed #state- fragment", () => {
    expect(stateFromHash("#state-disabled")).toBe("disabled");
    expect(stateFromHash("#state-focus-visible")).toBe("focus-visible");
    expect(stateFromHash("#nope")).toBeNull();
    expect(stateFromHash("#state-<script>")).toBeNull();
    expect(stateFromHash("")).toBeNull();
  });
});

describe("query values", () => {
  it("falls back to all widths and both themes", () => {
    expect(parseWidth(null)).toBe("all");
    expect(parseWidth("500")).toBe("all");
    expect(parseWidth("768")).toBe("768");
    expect(parseTheme(null)).toBe("both");
    expect(parseTheme("sepia")).toBe("both");
    expect(parseTheme("dark")).toBe("dark");
  });

  it("builds frame URLs only from a registry id and a listed state", () => {
    expect(frameSrc("button", "dark", "disabled")).toBe(
      "/dev/gallery/button?bare=1&theme=dark#state-disabled",
    );
    expect(frameSrc("button", "light", "nope")).toBe("/dev/gallery/button?bare=1&theme=light");
    expect(frameSrc("button", "light", null)).toBe("/dev/gallery/button?bare=1&theme=light");
    expect(() => frameSrc("../etc", "light", null)).toThrow(/unknown primitive/);
  });
});

describe("index", () => {
  const html = page("/dev/gallery");

  it("has the page title, the subline and every group that has entries", () => {
    expect(html).toContain("Component gallery");
    expect(html).toContain(
      "Every primitive and interaction, with its states, at 375, 768 and 1440 px. Dev only.",
    );
    for (const { group, primitives } of groupedPrimitives()) {
      expect(html).toContain(group);
      for (const p of primitives) {
        expect(html).toContain(`href="/dev/gallery/${p.id}"`);
        const n = p.states.length;
        expect(html).toContain(`${n} ${n === 1 ? "state" : "states"}`);
      }
    }
    expect(html).not.toContain(">1 states<");
  });

  it("is a plain list: one list item per primitive and no grid of cards", () => {
    expect(count(html, "<li")).toBe(GALLERY.length);
    expect(html).not.toContain("grid-cols");
  });
});

describe("fallbacks", () => {
  it("names an unknown primitive and lists the real ones", () => {
    const html = page("/dev/gallery/nope");
    expect(html).toContain("No primitive called “nope”. Pick one from the list.");
    expect(html).toContain('href="/dev/gallery/button"');
  });

  it("names an unknown state anchor and still shows every frame", () => {
    const html = page("/dev/gallery/button#state-nope");
    expect(html).toContain("No state called “nope” for Button. Showing all states.");
    expect(count(html, "<iframe")).toBe(6);
    expect(html).not.toContain("#state-nope");
  });

  it("passes a listed state into the frames", () => {
    const html = page("/dev/gallery/button?w=375&theme=dark#state-disabled");
    expect(count(html, "<iframe")).toBe(1);
    expect(html).toContain("theme=dark#state-disabled");
    expect(html).not.toContain("No state called");
  });
});

describe("colour demo", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const group of ["color", "pitch", "data"] as const) {
      it(`${theme} ${group}: lists every key with its name, hex and contrast to one decimal`, () => {
        const html = renderToStaticMarkup(
          <GalleryThemeProvider value={theme}>
            <ColourDemo state={group} />
          </GalleryThemeProvider>,
        );
        const resolved = TOKENS.resolved[theme];
        const page = resolved.color["surface-page"] as string;
        const entries = Object.entries(resolved[group]);
        expect(count(html, "data-token=")).toBe(entries.length);
        for (const [key, value] of entries) {
          expect(html).toContain(`data-token="${key}"`);
          expect(html).toContain(value);
          if (value.startsWith("#")) {
            const ratio = contrastOnPage(value, page) as number;
            expect(html).toContain(`${ratio.toFixed(1)}:1`);
          }
        }
      });
    }
  }

  it("reports 1.0:1 for the page against itself", () => {
    const page = TOKENS.resolved.dark.color["surface-page"] as string;
    expect(contrastOnPage(page, page)?.toFixed(1)).toBe("1.0");
  });
});

describe("glyph sheet", () => {
  const a = glyphSheet("a");
  const b = glyphSheet("b");

  it("is a valid scene for both sides", () => {
    expect(a.id).toBe("gallery-glyphs-a");
    expect(b.id).toBe("gallery-glyphs-b");
    expect(a.events.map((e) => e.team)).toEqual(Array(5).fill("home"));
    expect(b.events.map((e) => e.team)).toEqual(Array(5).fill("away"));
  });

  it("draws all 17 registry glyphs between the two sides", () => {
    const ids = new Set([
      ...glyphIdsForScene(a, { density: true }),
      ...glyphIdsForScene(b, { density: false }),
    ]);
    expect([...ids].sort()).toEqual([...GLYPH_IDS].sort());
  });

  it("shows team B's own marks in the team B sheet", () => {
    const ids = new Set(glyphIdsForScene(b, { density: false }));
    expect(ids.has("player-b")).toBe(true);
    expect(ids.has("goalkeeper-b")).toBe(true);
  });

  it("spaces every pair of entities at least 8 m apart", () => {
    for (const scene of [a, b]) {
      const positions = Object.entries(scene.frames[0]?.positions ?? {});
      for (let i = 0; i < positions.length; i += 1) {
        for (let j = i + 1; j < positions.length; j += 1) {
          const [ida, pa] = positions[i] as [string, { x: number; y: number }];
          const [idb, pb] = positions[j] as [string, { x: number; y: number }];
          expect(
            Math.hypot(pa.x - pb.x, pa.y - pb.y),
            `${scene.id} ${ida} ${idb}`,
          ).toBeGreaterThanOrEqual(8);
        }
      }
    }
  });
});

describe("registry after the Pitch and Interactions groups", () => {
  it("registers the pitch, glyphs and legend and the three interactions", () => {
    const ids = (group: string) => GALLERY.filter((p) => p.group === group).map((p) => p.id);
    expect(ids("Pitch")).toEqual(["pitch", "glyphs", "legend"]);
    expect(ids("Interactions")).toEqual(["playback", "drag", "converter-probe"]);
  });

  it("lists the playback and legend states of the gallery table", () => {
    expect(findPrimitive("playback")?.states).toEqual(["paused", "playing", "at-end", "still"]);
    expect(findPrimitive("legend")?.states).toEqual(["expanded", "collapsed", "empty"]);
  });
});

describe("registry after the Controls and Overlays groups", () => {
  it("registers every control and overlay primitive with its states", () => {
    const ids = (group: string) => GALLERY.filter((p) => p.group === group).map((p) => p.id);
    expect(ids("Controls")).toEqual([
      "button",
      "input",
      "link",
      "select",
      "checkbox-radio-switch",
      "segmented",
      "slider",
      "tabs",
    ]);
    expect(ids("Overlays")).toEqual(["dialog", "alert-dialog", "popover", "tooltip", "toast"]);
    expect(findPrimitive("input")?.states).toEqual([
      "empty",
      "filled",
      "focus",
      "invalid",
      "disabled",
      "long-value",
    ]);
    expect(findPrimitive("slider")?.states).toEqual(["min", "mid", "max", "focus", "disabled"]);
  });

  it("renders the destructive confirmation copy in the alert dialog's static open state", () => {
    const html = page("/dev/gallery/alert-dialog?bare=1&theme=light");
    // The popup draws into its cell after mount, so the server markup holds the cell, not the copy.
    expect(html).toContain('data-gallery-state="alert-dialog/open"');
    expect(html).toContain('data-gallery-state="alert-dialog/interactive"');
    expect(html).toContain("Clear board");
  });
});

describe("inventory (the 04-UI-SPEC gallery table)", () => {
  it("holds the 37 primitives of the contract, each id once, in a known group", () => {
    expect(inventory.length).toBe(37);
    expect(new Set(inventory.map((e) => e.id)).size).toBe(37);
    for (const e of inventory) {
      expect(GROUPS, e.id).toContain(e.group);
      for (const s of e.states) expect(s, `${e.id}/${s}`).toMatch(KEBAB);
    }
  });

  for (const entry of inventory) {
    it(`${entry.id}: registered in ${entry.group} with exactly its states`, () => {
      const primitive = findPrimitive(entry.id);
      expect(primitive, `${entry.id} missing from GALLERY`).toBeDefined();
      expect(primitive?.group).toBe(entry.group);
      expect(primitive?.states).toEqual(entry.states);
    });
  }

  it("registers nothing outside the contract", () => {
    const ids = new Set(inventory.map((e) => e.id));
    for (const p of GALLERY) expect(ids.has(p.id), `${p.id} is not in the inventory`).toBe(true);
  });

  it("renders every state of every registered primitive with its data-gallery-state attribute", () => {
    for (const entry of inventory) {
      const html = page(`/dev/gallery/${entry.id}?bare=1&theme=light`);
      for (const state of entry.states) {
        expect(html, `${entry.id}/${state}`).toContain(`data-gallery-state="${entry.id}/${state}"`);
      }
    }
  });
});
