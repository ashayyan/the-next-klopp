import { useId, useState } from "react";
// The gallery shows exactly the system: every value on this page comes from the DESIGN.md tokens
// block, parsed here with the same schema the build uses. Dev-only chunk.
import designMd from "../../../../docs/DESIGN.md?raw";
import { composite, contrast, parseCssColor, toHex } from "../../../../scripts/design/lib/color.ts";
import { extractTokensBlock, parseTokens } from "../../../../scripts/design/tokens.ts";
import {
  CheckIcon,
  ChevronIcon,
  CloseIcon,
  CrossIcon,
  MoreIcon,
  QuestionIcon,
  ThemeIcon,
} from "../../../ui/icons/index.tsx";
import { cubicBezier } from "../../dev-directions/morph.ts";
import { useGalleryTheme } from "../StateCell.tsx";

export const TOKENS = parseTokens(JSON.parse(extractTokensBlock(designMd)), "docs/DESIGN.md");

const DISPLAY = "font-display [font-stretch:var(--font-display-stretch)]";
const MONO = "font-mono text-label tabular-nums";

// ---------------------------------------------------------------- colour

export type ColourGroup = "color" | "pitch" | "data";

/** Contrast of a token against the page: a translucent colour is composited over the page first. */
export function contrastOnPage(hex: string, pageHex: string): number | null {
  const top = parseCssColor(hex);
  const page = parseCssColor(pageHex);
  if (!top || !page) return null;
  return contrast(toHex(composite(top, page)), toHex(page));
}

export function ColourDemo({ state }: { state: string }) {
  const theme = useGalleryTheme();
  const group: ColourGroup = state === "pitch" || state === "data" ? state : "color";
  const resolved = TOKENS.resolved[theme];
  const page = resolved.color["surface-page"] ?? "";
  const rows = Object.entries(resolved[group]);
  return (
    <table className="w-full border-collapse text-left text-label">
      <caption className="sr-only">{`${group} tokens, ${theme} theme`}</caption>
      <thead>
        <tr className="border-control-border border-b text-ink-muted">
          <th scope="col" className="py-1 pr-2 font-normal">
            Swatch
          </th>
          <th scope="col" className="py-1 pr-2 font-normal">
            Name
          </th>
          <th scope="col" className="py-1 pr-2 font-normal">
            Hex
          </th>
          <th scope="col" className="py-1 text-right font-normal">
            vs page
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([key, value]) => {
          const isColour = value.startsWith("#");
          const ratio = isColour ? contrastOnPage(value, page) : null;
          return (
            <tr key={key} data-token={key} className="border-control-border border-b align-middle">
              <td className="py-1 pr-2">
                {isColour ? (
                  <span
                    aria-hidden="true"
                    className="block h-6 w-10 rounded-sm border border-control-border"
                    style={{ backgroundColor: value }}
                  />
                ) : null}
              </td>
              <th scope="row" className="py-1 pr-2 font-normal">
                {key}
              </th>
              <td className={`py-1 pr-2 ${MONO}`}>{value}</td>
              <td className={`py-1 text-right ${MONO}`}>
                {ratio === null ? "n/a" : `${ratio.toFixed(1)}:1`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------- type

const ROLES = ["display", "heading", "body", "label"] as const;
const WEIGHTS = [400, 600] as const;
const ROLE_CLASS: Record<(typeof ROLES)[number], string> = {
  display: `text-display ${DISPLAY}`,
  heading: `text-heading ${DISPLAY}`,
  body: "text-body",
  label: "text-label",
};

export function TypeDemo({ state }: { state: string }) {
  if (state === "numerals") {
    return (
      <div className="flex flex-col gap-2">
        <p className="font-mono text-body tabular-nums">0123456789</p>
        <p className="font-mono text-body tabular-nums">+31.5 m at 9.7 s</p>
        <p className="font-mono text-body tabular-nums">−15.3 m, n = 48</p>
        <p className="text-label text-ink-muted">
          Geist Mono with tabular figures: columns of numbers line up.
        </p>
      </div>
    );
  }
  if (state === "glyph-sample") {
    const g = TOKENS.pitch.glyphText.$value;
    return (
      <div className="flex flex-col gap-2">
        <p
          className="font-mono"
          style={{ fontSize: "var(--pitch-glyph-text)", fontWeight: g.fontWeight }}
        >
          7 8 9 GK CB ST
        </p>
        <p className="text-label text-ink-muted">{`Glyph text: ${g.fontSize.value} px, weight ${g.fontWeight}. It labels a disc and never goes below this size.`}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {ROLES.map((role) => {
        const t = TOKENS.text[role].$value;
        return (
          <div key={role} className="flex flex-col gap-1">
            <p className="font-mono text-label text-ink-muted">{`${role}: ${t.fontSize.value} px, line ${t.lineHeight}`}</p>
            {WEIGHTS.map((w) => (
              <p key={w} className={`${ROLE_CLASS[role]} text-balance`} style={{ fontWeight: w }}>
                {`Pressing traps ${w}`}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- space and radius

const SPACE = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"] as const;
const RADII = ["sm", "md", "lg"] as const;
const RADIUS_BOX: Record<(typeof RADII)[number], string> = {
  sm: "w-20 rounded-sm",
  md: "w-28 rounded-md",
  lg: "w-36 rounded-lg",
};

export function SpaceRadiusDemo({ state }: { state: string }) {
  if (state === "radius") {
    return (
      <ul className="flex flex-col gap-3">
        {RADII.map((r) => (
          <li key={r} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`block h-12 border border-control-border bg-surface-panel ${RADIUS_BOX[r]}`}
            />
            <span className={MONO}>{`${r} ${TOKENS.radius[r].$value.value} px`}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (state === "elevation") {
    const layers = TOKENS.shadow.sheet.$value;
    return (
      <div className="flex flex-col gap-3">
        <div
          className="rounded-lg border border-control-border bg-surface-raised p-4 text-label"
          style={{ boxShadow: "var(--shadow-sheet)" }}
        >
          Sheet surface
        </div>
        <p className="text-label text-ink-muted">
          {layers.length === 0
            ? "Elevation: none. Depth comes from the page, panel and raised tone steps and a hairline border."
            : `Elevation: ${layers.length} shadow layer(s) on the sheet.`}
        </p>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {SPACE.map((k) => {
        const px = TOKENS.space[k].$value.value;
        return (
          <li key={k} className="flex items-center gap-3">
            <span className={`w-20 shrink-0 ${MONO}`}>{`${k} ${px} px`}</span>
            <span
              aria-hidden="true"
              className="block h-3 bg-control-border"
              style={{ width: `${px}px` }}
            />
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------- icons

const ICONS = [
  { name: "Check", Icon: CheckIcon },
  { name: "Cross", Icon: CrossIcon },
  { name: "Question", Icon: QuestionIcon },
  { name: "Theme", Icon: ThemeIcon },
  { name: "More", Icon: MoreIcon },
  { name: "Close", Icon: CloseIcon },
  { name: "Chevron", Icon: ChevronIcon },
] as const;

export function IconsDemo({ state }: { state: string }) {
  const tone =
    state === "muted"
      ? "text-ink-muted"
      : state === "on-accent"
        ? "bg-accent text-accent-ink"
        : "text-ink";
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-3">
      {ICONS.map(({ name, Icon }) => (
        <li key={name} className="flex flex-col items-start gap-1">
          <span className={`inline-flex size-11 items-center justify-center rounded-md ${tone}`}>
            <Icon />
          </span>
          <span className="text-label text-ink-muted">{name}</span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- motion

interface MotionSpec {
  title: string;
  ms: number;
  easingName: "ui" | "morph";
}

function motionSpec(state: string): MotionSpec | null {
  const d = TOKENS.duration;
  if (state === "ui") return { title: "UI transition", ms: d.ui.$value.value, easingName: "ui" };
  if (state === "draw") return { title: "Draw in", ms: d.draw.$value.value, easingName: "ui" };
  if (state === "morph") return { title: "Morph", ms: d.morph.$value.value, easingName: "morph" };
  return null;
}

const MARK = 16;

/** A mark on a track, driven by a range input: nothing plays by itself, so a screenshot is stable. */
function ScrubDemo({ spec }: { spec: MotionSpec }) {
  const id = useId();
  const [p, setP] = useState(0);
  const bezier = TOKENS.easing[spec.easingName].$value;
  const eased = cubicBezier(bezier[0], bezier[1], bezier[2], bezier[3])(p);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label">{`${spec.title}: ${spec.ms} ms, cubic-bezier(${bezier.join(", ")})`}</p>
      <div
        aria-hidden="true"
        className="relative h-6 rounded-sm border border-control-border bg-surface-panel"
      >
        <span
          className="absolute top-1/2 block -translate-y-1/2 rounded-full bg-ink"
          style={{
            width: MARK,
            height: MARK,
            left: `calc(${eased} * (100% - ${MARK}px))`,
          }}
        />
      </div>
      <label htmlFor={id} className="text-label">
        Progress
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={p}
        onChange={(e) => setP(Number(e.target.value))}
        className="min-h-11 w-full accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      />
      <p
        className={`${MONO} text-ink-muted`}
      >{`time ${p.toFixed(2)}, eased ${eased.toFixed(2)}`}</p>
    </div>
  );
}

export function MotionDemo({ state }: { state: string }) {
  const spec = motionSpec(state);
  if (spec) return <ScrubDemo spec={spec} />;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label">Reduced motion: 0 ms</p>
      <div
        aria-hidden="true"
        className="relative h-6 rounded-sm border border-control-border bg-surface-panel"
      >
        <span
          className="absolute top-1/2 block -translate-y-1/2 rounded-full bg-ink"
          style={{ width: MARK, height: MARK, left: `calc(100% - ${MARK}px)` }}
        />
      </div>
      <p className="text-label text-ink-muted">
        With the system setting on, every transition lasts 0 ms and the mark is already at its end
        position.
      </p>
    </div>
  );
}
