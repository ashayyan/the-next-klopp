// Zod 4 schema of the design token document (DTCG-style: hex strings, no $schema).
// Lives here, not in schemas/, because schemas/schemas.test.ts demands a Zod mirror for every
// *.schema.json there (04-RESEARCH anti-pattern). Erasable TypeScript only, no node: imports.

import { z } from "zod";

export const HEX_COLOUR = /^#[0-9A-F]{6}(?:[0-9A-F]{2})?$/;
export const ALIAS = /^\{[a-z]+\.[a-z0-9-]+\}$/;
export const DIRECTION_ID = /^[a-z]+(?:-[a-z]+)*$/;
const FONT_FAMILY = /^[A-Za-z0-9 ]+$/;
const FONT_SRC = /^\/fonts\/[a-z0-9-]+\/[a-z0-9-]+\.woff2$/;
const GENERIC_FAMILIES = [
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "system-ui",
  "sans-serif",
  "serif",
  "monospace",
] as const;

export const REQUIRED_COLOR_KEYS = [
  "surface-page",
  "surface-panel",
  "surface-raised",
  "accent",
  "accent-ink",
  "ink",
  "ink-muted",
  "control-border",
  "danger",
  "focus-ring",
  "surface-highlight",
  "surface-highlight-ink",
] as const;

export const REQUIRED_PITCH_KEYS = [
  "pitch-runoff",
  "pitch-surface",
  "pitch-line",
  "team-a",
  "team-a-ink",
  "team-b",
  "team-b-fill",
  "team-b-ink",
  "ball-fill",
  "ball-ring",
  "zone-fill",
  "zone-fill-opacity",
  "zone-line",
  "highlight",
  "density-mark",
  "label-bg",
  "label-border",
] as const;

export const REQUIRED_DATA_KEYS = [
  "cat-1",
  "cat-2",
  "cat-3",
  "cat-other",
  "seq-1",
  "seq-2",
  "seq-3",
  "seq-4",
  "seq-5",
  "div-neg",
  "div-mid",
  "div-pos",
] as const;

export const SPACE_KEYS = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const;
export const TEXT_KEYS = ["label", "body", "heading", "display"] as const;
export const RADIUS_KEYS = ["sm", "md", "lg"] as const;
export const FONT_KEYS = ["sans", "mono", "display"] as const;

const colourValue = z.string().refine((s) => HEX_COLOUR.test(s) || ALIAS.test(s), {
  message: "colour must be #RRGGBB, #RRGGBBAA (upper case) or an alias like {color.accent}",
});

const colourLeaf = z.strictObject({ $type: z.literal("color"), $value: colourValue });
const numberLeaf = z.strictObject({
  $type: z.literal("number"),
  $value: z.number().min(0).max(1),
});
const themeMap = z.record(z.string(), z.union([colourLeaf, numberLeaf]));

const px = z.strictObject({ value: z.number().min(0).max(512), unit: z.literal("px") });
const ms = z.strictObject({ value: z.number().min(0).max(5000), unit: z.literal("ms") });
const dimensionLeaf = z.strictObject({ $type: z.literal("dimension"), $value: px });
const durationLeaf = z.strictObject({ $type: z.literal("duration"), $value: ms });

const fontAlias = z.string().regex(/^\{font\.(?:display|sans|mono)\}$/, {
  message: "fontFamily must be an alias {font.display}, {font.sans} or {font.mono}",
});
const typographyValue = z.strictObject({
  fontFamily: fontAlias,
  fontSize: px,
  fontWeight: z.number().int().min(100).max(900),
  lineHeight: z.number().min(0.8).max(3),
});
const typographyLeaf = z.strictObject({ $type: z.literal("typography"), $value: typographyValue });

const family = z
  .string()
  .refine((s) => FONT_FAMILY.test(s) || (GENERIC_FAMILIES as readonly string[]).includes(s), {
    message: "font family may hold only letters, digits and spaces (or a generic keyword)",
  });
const fontFile = z.strictObject({
  src: z
    .string()
    .regex(FONT_SRC, { message: "font file src must be /fonts/<family>/<name>.woff2" }),
  weight: z.string().regex(/^\d{3}(?: \d{3})?$/),
  stretch: z
    .string()
    .regex(/^\d+(?:\.\d+)?%(?: \d+(?:\.\d+)?%)?$/)
    .optional(),
  style: z.enum(["normal", "italic"]),
});
const fontLeaf = z.strictObject({
  $type: z.literal("fontFamily"),
  $value: z.array(family).min(2),
  $extensions: z
    .strictObject({
      tnk: z.strictObject({
        stretch: z
          .string()
          .regex(/^\d+(?:\.\d+)?%$/)
          .optional(),
        licence: z.string().regex(/^[A-Za-z0-9.-]+$/),
        files: z.array(fontFile),
      }),
    })
    .optional(),
});

const shadowLayer = z.strictObject({
  offsetX: px,
  offsetY: px,
  blur: px,
  spread: px,
  color: z.string().regex(HEX_COLOUR),
});
const shadowLeaf = z.strictObject({ $type: z.literal("shadow"), $value: z.array(shadowLayer) });

const bezier = z.tuple([
  z.number().min(0).max(1),
  z.number().min(-2).max(2),
  z.number().min(0).max(1),
  z.number().min(-2).max(2),
]);
const easingLeaf = z.strictObject({ $type: z.literal("cubicBezier"), $value: bezier });

const iconStroke = z.strictObject({
  $type: z.literal("dimension"),
  $value: px,
  $extensions: z.strictObject({
    tnk: z.strictObject({ linecap: z.enum(["square", "round", "butt"]) }),
  }),
});

export const tokenDocumentSchema = z.strictObject({
  meta: z.strictObject({
    direction: z.string().regex(DIRECTION_ID),
    tokensVersion: z.literal(1),
    primaryTheme: z.enum(["light", "dark"]),
  }),
  color: z.strictObject({ light: themeMap, dark: themeMap }),
  pitch: z.strictObject({ light: themeMap, dark: themeMap, glyphText: typographyLeaf }),
  data: z.strictObject({ light: themeMap, dark: themeMap }),
  font: z.strictObject({ display: fontLeaf, sans: fontLeaf, mono: fontLeaf }),
  text: z.strictObject({
    label: typographyLeaf,
    body: typographyLeaf,
    heading: typographyLeaf,
    display: typographyLeaf,
  }),
  space: z.strictObject({
    xs: dimensionLeaf,
    sm: dimensionLeaf,
    md: dimensionLeaf,
    lg: dimensionLeaf,
    xl: dimensionLeaf,
    "2xl": dimensionLeaf,
    "3xl": dimensionLeaf,
  }),
  radius: z.strictObject({ sm: dimensionLeaf, md: dimensionLeaf, lg: dimensionLeaf }),
  shadow: z.strictObject({ sheet: shadowLeaf }),
  border: z.strictObject({ rule: dimensionLeaf }),
  duration: z.strictObject({
    ui: durationLeaf,
    draw: durationLeaf,
    morph: durationLeaf,
    "stagger-line": durationLeaf,
  }),
  easing: z.strictObject({ ui: easingLeaf, morph: easingLeaf }),
  icon: z.strictObject({ stroke: iconStroke }),
});

export type RawTokenDocument = z.infer<typeof tokenDocumentSchema>;
