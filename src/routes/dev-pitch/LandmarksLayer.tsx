import { useMemo } from "react";
import { unitsPerPx } from "../../pitch/glyphs/glyphSize.ts";
import { Chip, PointShape } from "../../pitch/glyphs/MarkGlyphs.tsx";
import { usePitch } from "../../pitch/Pitch.tsx";
import { canonicalToScreen } from "../../pitch/view.ts";
import { landmarkMarks, PROBE_PROVIDERS } from "./probe.ts";

// 12 px chip text: average advance 7.2 px plus 4 px padding each side, as in MarkGlyphs.
const CHIP_WIDTH_PX = 7.2 + 8;
const CHIP_GAP_PX = 1;

/**
 * Provider landmarks overlay (03-UI-SPEC "Provider landmarks layer"): every shared landmark of the
 * parity fixture, converted live from each provider's own coordinates and drawn as a point glyph
 * with a provider chip (S, O, W, T). The chips sit in a row beside the point, so when the
 * converters are right the four points coincide and the row reads S O W T; a wrong converter moves
 * its own point and chip away from the others.
 */
export function LandmarksLayer() {
  const { view, orientation, length, width } = usePitch();
  const u = unitsPerPx(view.pxPerMetre);
  const marks = useMemo(() => landmarkMarks({ length, width }), [length, width]);
  return (
    <g data-layer="provider-landmarks">
      {marks.map((m) => {
        const order = PROBE_PROVIDERS.findIndex((p) => p.id === m.provider);
        // Chips run to the right of the point, or to the left near the right edge so none is clipped.
        const nearRightEdge = canonicalToScreen(view, m.point).x > view.cssWidth - 90;
        const along = 12 + CHIP_WIDTH_PX / 2 + order * (CHIP_WIDTH_PX + CHIP_GAP_PX);
        const dx = nearRightEdge ? -along : along;
        const rotate = orientation === "vertical" ? " rotate(90)" : "";
        return (
          <g key={`${m.provider}:${m.name}`} data-landmark={m.name} data-provider={m.provider}>
            <title>{`${m.name}: ${m.provider} lands at x ${m.point.x.toFixed(2)} m, y ${m.point.y.toFixed(2)} m`}</title>
            <PointShape x={m.point.x} y={m.point.y} u={u} />
            <g transform={`translate(${m.point.x} ${m.point.y})${rotate}`}>
              <Chip
                x={dx * u}
                y={0}
                text={m.chip}
                u={u}
                orientation="horizontal"
                anchor="centre"
                part="provider-chip"
              />
            </g>
          </g>
        );
      })}
    </g>
  );
}
