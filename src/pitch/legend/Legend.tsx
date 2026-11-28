import { useId, useState } from "react";
import type { Scene } from "../../scene/schema.ts";
import { GLYPHS, type GlyphEntry, type GlyphId } from "../glyphs/registry.ts";
import { glyphIdsForScene } from "./glyphIds.ts";

export interface LegendProps {
  /** The scene on the pitch, or null for a pitch with no scene. */
  scene: Scene | null;
  /** True when the Canvas density layer is drawn. */
  density: boolean;
  /** Glyph ids drawn outside the scene (dev overlays such as the probe point). */
  extraGlyphs?: readonly GlyphId[];
  /** Legend state on first render. Default expanded at every width. */
  initialExpanded?: boolean;
  /** Sticks to the top of its column from 1024 px. Default true (the /dev/pitch side column). */
  sticky?: boolean;
  /** Grid classes for the expanded list. Default: 1 column, 2 from 600 px, 1 again from 1024 px. */
  columnsClassName?: string;
}

const DEFAULT_COLUMNS = "grid-cols-1 min-[600px]:grid-cols-2 lg:grid-cols-1";

function labelFor(entry: GlyphEntry, scene: Scene | null): string {
  if (!entry.label.includes("{team}")) return entry.label;
  const side = entry.id.endsWith("-b") ? "b" : "a";
  const team = scene?.teams.find((t) => t.side === side);
  // Without a team name the dash and the placeholder go, so no brace ever reaches the screen.
  return team ? entry.label.replace("{team}", team.name) : entry.label.replace(" — {team}", "");
}

/**
 * The notation legend: always visible, generated from the glyph ids the scene draws, in registry
 * order. Two states only, expanded and collapsed. Collapsed keeps every swatch with its label so no
 * entry is ever a bare shape or colour (03-UI-SPEC "Legend Contract").
 */
export function Legend({
  scene,
  density,
  extraGlyphs = [],
  initialExpanded = true,
  sticky = true,
  columnsClassName = DEFAULT_COLUMNS,
}: LegendProps) {
  const headingId = useId();
  const listId = useId();
  const [expanded, setExpanded] = useState(initialExpanded);
  const ids: readonly GlyphId[] = [
    ...(scene ? glyphIdsForScene(scene, { density }) : []),
    ...extraGlyphs,
  ];
  const entries = GLYPHS.filter((g) => ids.includes(g.id));

  return (
    <section
      aria-labelledby={headingId}
      data-legend
      data-expanded={expanded}
      className={`bg-surface-panel p-4${sticky ? " lg:sticky lg:top-6" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-base leading-tight font-semibold">
          Notation
        </h2>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((v) => !v)}
          className="min-h-11 rounded-sm border border-control-border bg-transparent px-3 text-sm text-ink hover:bg-surface-page focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {expanded ? "Collapse notation" : "Expand notation"}
        </button>
      </div>

      {entries.length === 0 ? (
        <p id={listId} className="mt-2 text-sm text-ink-muted">
          No marks to explain yet.
        </p>
      ) : (
        <ul
          id={listId}
          className={
            expanded ? `mt-2 grid gap-2 ${columnsClassName}` : "mt-2 flex flex-wrap gap-x-4 gap-y-2"
          }
        >
          {entries.map((entry) => {
            const Sample = entry.sample;
            return (
              <li
                key={entry.id}
                data-legend-entry={entry.id}
                className="flex min-w-0 items-center gap-1 text-sm leading-snug"
              >
                <Sample />
                <span className="min-w-0">
                  <span className="text-ink">{labelFor(entry, scene)}</span>
                  {expanded ? (
                    <span className="block text-ink-muted">{entry.description}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
