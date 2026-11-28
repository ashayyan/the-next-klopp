import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import { CanvasLayer } from "../../../pitch/CanvasLayer.tsx";
import { PlayerGlyph } from "../../../pitch/glyphs/PlayerGlyph.tsx";
import { drawDensity, SceneLayer } from "../../../pitch/glyphs/SceneLayer.tsx";
import { describeScene } from "../../../pitch/legend/glyphIds.ts";
import { Legend } from "../../../pitch/legend/Legend.tsx";
import { Pitch } from "../../../pitch/Pitch.tsx";
import type { Orientation } from "../../../pitch/view.ts";
import emptyJson from "../../../scene/fixtures/empty.json";
import reconstructionJson from "../../../scene/fixtures/reconstruction.json";
import { PlaybackBar } from "../../../scene/playback/PlaybackBar.tsx";
import { createPlaybackStore, type PlaybackState } from "../../../scene/playback/store.ts";
import type { Scene } from "../../../scene/schema.ts";
import { parseScene } from "../../../scene/validate.ts";
import { ConverterProbe, type ProbeInput } from "../../dev-pitch/ConverterProbe.tsx";
import { probeConvert } from "../../dev-pitch/probe.ts";

/** Parses a scene the demo owns; a bad scene is a bug in the gallery, so it throws. */
export function mustParse(input: unknown): Scene {
  const result = parseScene(input);
  if (!result.ok) {
    throw new Error(`gallery scene is invalid: ${result.issues.map((i) => i.message).join("; ")}`);
  }
  return result.scene;
}

const EMPTY = mustParse(emptyJson);
const RECONSTRUCTION = mustParse(reconstructionJson);

/**
 * A saved board with six draggable players, far enough apart that their 44 px targets stay clear of
 * each other on a 343 px pitch. (The 22-player board of /dev/pitch cannot: see deferred-items.md.)
 */
export const GALLERY_BOARD: Scene = mustParse({
  id: "gallery-board",
  schemaVersion: 1,
  kind: "board",
  label: "Saved board, six players",
  pitch: { length: 105, width: 68 },
  teams: [
    { id: "home", name: "Home", side: "a", venue: "home", attack: { "1": "ltr" } },
    { id: "away", name: "Away", side: "b", venue: "away", attack: { "1": "rtl" } },
  ],
  entities: [
    { id: "home-4", type: "player", team: "home", number: 4 },
    { id: "home-8", type: "player", team: "home", number: 8 },
    { id: "home-10", type: "player", team: "home", number: 10 },
    { id: "away-5", type: "player", team: "away", number: 5 },
    { id: "away-9", type: "player", team: "away", number: 9 },
    { id: "away-11", type: "player", team: "away", number: 11 },
  ],
  frames: [
    {
      t: 0,
      positions: {
        "home-4": { x: 24, y: 16 },
        "home-8": { x: 24, y: 52 },
        "home-10": { x: 50, y: 34 },
        "away-5": { x: 76, y: 16 },
        "away-9": { x: 76, y: 52 },
        "away-11": { x: 96, y: 34 },
      },
    },
  ],
  events: [],
  annotations: [],
  source: {
    type: "authored",
    sourceIds: [],
    licence: "project-authored",
    attribution: "Authored for The Next Klopp",
    shippable: true,
  },
});

// ---------------------------------------------------------------- the glyph sheet

export type SheetSide = "a" | "b";

const pt = (x: number, y: number) => ({ x, y });

/**
 * A gallery-only scene that draws the registry's glyphs spaced so that none overlaps another. The
 * acting team does every event (pass, carry, run, shot, pressure) and the other team holds the
 * pressed player and a goalkeeper. Side "b" is the same sheet for team B: ring discs, hollow
 * arrowheads, the amber line colour.
 */
export function glyphSheet(side: SheetSide): Scene {
  const me = side === "a" ? "home" : "away";
  const other = side === "a" ? "away" : "home";
  const outfield = (n: number, role: string) => ({
    id: `${me}-${n}`,
    type: "player" as const,
    team: me,
    number: n,
    role,
  });
  const positions: Record<string, { x: number; y: number }> = {
    [`${me}-1`]: pt(96, 62),
    [`${me}-2`]: pt(64, 32),
    [`${me}-3`]: pt(76, 32),
    [`${me}-4`]: pt(88, 32),
    [`${me}-6`]: pt(10, 56),
    [`${me}-7`]: pt(10, 8),
    [`${me}-8`]: pt(34, 8),
    [`${me}-9`]: pt(10, 20),
    [`${me}-10`]: pt(10, 32),
    [`${me}-11`]: pt(10, 44),
    [`${other}-1`]: pt(100, 50),
    [`${other}-4`]: pt(30, 56),
    ball: pt(50, 62),
  };
  return mustParse({
    id: `gallery-glyphs-${side}`,
    schemaVersion: 1,
    kind: "authored",
    label: side === "a" ? "Glyph sheet, team A" : "Glyph sheet, team B",
    pitch: { length: 105, width: 68 },
    teams: [
      { id: "home", name: "Home", side: "a", venue: "home", attack: { "1": "ltr" } },
      { id: "away", name: "Away", side: "b", venue: "away", attack: { "1": "rtl" } },
    ],
    entities: [
      { id: `${me}-1`, type: "goalkeeper", team: me, number: 1, role: "Goalkeeper" },
      outfield(2, "Centre-back"),
      outfield(3, "Centre-back"),
      outfield(4, "Centre-back"),
      outfield(6, "Defensive midfielder"),
      outfield(7, "Winger"),
      outfield(8, "Central midfielder"),
      outfield(9, "Striker"),
      outfield(10, "Playmaker"),
      outfield(11, "Winger"),
      { id: `${other}-1`, type: "goalkeeper", team: other, number: 1, role: "Goalkeeper" },
      { id: `${other}-4`, type: "player", team: other, number: 4, role: "Centre-back" },
      { id: "ball", type: "ball" },
    ],
    frames: [{ t: 0, positions }],
    events: [
      {
        id: "ev-pass",
        type: "pass",
        t: 0,
        team: me,
        player: `${me}-7`,
        receiver: `${me}-8`,
        start: pt(10, 8),
        end: pt(34, 8),
      },
      {
        id: "ev-carry",
        type: "carry",
        t: 0,
        team: me,
        player: `${me}-9`,
        start: pt(10, 20),
        end: pt(34, 20),
      },
      {
        id: "ev-run",
        type: "run",
        t: 0,
        team: me,
        player: `${me}-10`,
        start: pt(10, 32),
        end: pt(34, 32),
      },
      {
        id: "ev-shot",
        type: "shot",
        t: 0,
        team: me,
        player: `${me}-11`,
        start: pt(10, 44),
        end: pt(44, 44),
        goal: true,
      },
      {
        id: "ev-pressure",
        type: "pressure",
        t: 0,
        team: me,
        player: `${me}-6`,
        target: `${other}-4`,
        start: pt(10, 56),
        end: pt(30, 56),
      },
    ],
    annotations: [
      {
        id: "zone-box",
        type: "zone",
        points: [pt(62, 4), pt(96, 4), pt(96, 20), pt(62, 20)],
        label: "Zone",
      },
      { id: "shape-line", type: "shape", team: me, members: [`${me}-2`, `${me}-3`, `${me}-4`] },
      { id: "highlight-four", type: "highlight", target: `${me}-4` },
      {
        id: "note-pin",
        type: "note",
        text: "A note pins to the pitch.",
        at: pt(80, 46),
        anchor: pt(76, 32),
      },
      { id: "point-spot", type: "point", at: pt(62, 58), label: "Spot" },
      { id: "chain", type: "sequence", events: ["ev-pass", "ev-carry", "ev-shot"] },
    ],
    source: {
      type: "authored",
      sourceIds: [],
      licence: "project-authored",
      attribution: "Authored for The Next Klopp",
      shippable: true,
    },
  });
}

// ---------------------------------------------------------------- shared frame

interface GalleryPitchProps {
  scene: Scene | null;
  label: string;
  orientation?: Orientation;
  length?: number;
  width?: number;
  /** Draw the Canvas density layer for the scene's events. */
  density?: boolean;
  children?: ReactNode;
  /** Legend state on first render. The gallery keeps it collapsed so a cell stays compact. */
  legendExpanded?: boolean;
  /** Limits the pitch's width, for a vertical pitch that would otherwise be tall. */
  maxWidth?: string;
  interactive?: boolean;
}

/** One pitch with its legend below it: a pitch is never shown without the key to its marks. */
function GalleryPitch({
  scene,
  label,
  orientation = "horizontal",
  length,
  width,
  density = false,
  children,
  legendExpanded = false,
  maxWidth,
  interactive = false,
}: GalleryPitchProps) {
  const draw = useMemo(() => (scene && density ? drawDensity(scene) : null), [scene, density]);
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="w-full" style={maxWidth ? { maxWidth } : undefined}>
        <Pitch
          title={label}
          desc={scene ? describeScene(scene) : undefined}
          length={length ?? scene?.pitch.length}
          width={width ?? scene?.pitch.width}
          orientation={orientation}
          interactive={interactive}
          canvas={draw ? <CanvasLayer draw={draw} /> : undefined}
        >
          {children}
        </Pitch>
      </div>
      <Legend
        scene={scene}
        density={density}
        sticky={false}
        initialExpanded={legendExpanded}
        columnsClassName="grid-cols-1"
      />
    </div>
  );
}

// ---------------------------------------------------------------- pitch

export function PitchDemo({ state }: { state: string }) {
  if (state === "vertical") {
    return <GalleryPitch scene={null} label="vertical" orientation="vertical" maxWidth="18rem" />;
  }
  if (state === "100x65") {
    return <GalleryPitch scene={null} label="small pitch" length={100} width={65} />;
  }
  if (state === "density") {
    return (
      <GalleryPitch scene={RECONSTRUCTION} label="event density" density>
        <SceneLayer scene={RECONSTRUCTION} t={0} mode="smooth" />
      </GalleryPitch>
    );
  }
  return <GalleryPitch scene={null} label="horizontal" />;
}

// ---------------------------------------------------------------- glyphs

/** The sheet for one side. State "team-a" draws all 17 registry glyphs; "team-b" mirrors them. */
export function GlyphsDemo({ state }: { state: string }) {
  const side: SheetSide = state === "team-b" ? "b" : "a";
  const scene = useMemo(() => glyphSheet(side), [side]);
  return (
    <GalleryPitch scene={scene} label={scene.label} density={side === "a"}>
      <SceneLayer scene={scene} t={0} mode="smooth" />
    </GalleryPitch>
  );
}

// ---------------------------------------------------------------- legend

export function LegendDemo({ state }: { state: string }) {
  const scene = useMemo(() => glyphSheet("a"), []);
  if (state === "empty") {
    return <Legend scene={EMPTY} density={false} sticky={false} columnsClassName="grid-cols-1" />;
  }
  return (
    <Legend
      scene={scene}
      density
      sticky={false}
      initialExpanded={state === "expanded"}
      columnsClassName="grid-cols-1"
    />
  );
}

// ---------------------------------------------------------------- playback

/** Draws the scene at the clock's time. The gallery never starts the animation loop. */
function ClockLayer({ scene, store }: { scene: Scene; store: StoreApi<PlaybackState> }) {
  const t = useStore(store, (s) => s.t);
  return <SceneLayer scene={scene} t={t} mode="smooth" />;
}

function makeStore(scene: Scene, state: string): StoreApi<PlaybackState> {
  const store = createPlaybackStore(scene, { motion: "smooth" });
  if (state === "playing") {
    // Playing at a fixed time with no loop running: the bar shows Pause, the frame never moves.
    store.setState({ playing: true, t: store.getState().duration * 0.4 });
  } else if (state === "at-end") {
    store.getState().last();
  }
  return store;
}

export function PlaybackDemo({ state }: { state: string }) {
  const still = state === "still";
  const scene = useMemo(() => (still ? glyphSheet("a") : RECONSTRUCTION), [still]);
  const [store] = useState(() => (still ? null : makeStore(scene, state)));
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <GalleryPitch scene={scene} label={scene.label}>
        {store ? (
          <ClockLayer scene={scene} store={store} />
        ) : (
          <SceneLayer scene={scene} t={0} mode="smooth" />
        )}
      </GalleryPitch>
      {store ? <PlaybackBar store={store} /> : <p className="text-label">Still scene — 1 frame</p>}
    </div>
  );
}

// ---------------------------------------------------------------- drag

const BOARD_PLAYER = "home-8";
const isOutfield = (e: { type: string }) => e.type === "player";

/** The board scene, draggable. "focused" forces the keyboard ring; "dragging" forces the ghost. */
export function DragDemo({ state }: { state: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({});
  const start = GALLERY_BOARD.frames[0]?.positions[BOARD_PLAYER] ?? { x: 24, y: 52 };
  const entity = GALLERY_BOARD.entities.find((e) => e.id === BOARD_PLAYER);
  const team = GALLERY_BOARD.teams.find((t) => t.id === entity?.team);

  // Forced focus: the same attribute rule the focus-visible selector uses, set on one player.
  useEffect(() => {
    if (state !== "focused") return;
    ref.current
      ?.querySelector(`[data-entity="${BOARD_PLAYER}"]`)
      ?.setAttribute("data-state", "focus-visible");
  }, [state]);

  const positions =
    state === "dragging"
      ? { ...moved, [BOARD_PLAYER]: { x: start.x + 14, y: start.y + 8 } }
      : moved;
  return (
    <div ref={ref} className="w-full min-w-0">
      <GalleryPitch scene={GALLERY_BOARD} label="board" interactive>
        {state === "dragging" && entity ? (
          <PlayerGlyph entity={entity} team={team} x={start.x} y={start.y} decorative ghost />
        ) : null}
        <SceneLayer
          scene={GALLERY_BOARD}
          t={0}
          mode="smooth"
          positions={positions}
          draggable={isOutfield}
          onEntityMove={(id, p) => setMoved((prev) => ({ ...prev, [id]: p }))}
        />
      </GalleryPitch>
    </div>
  );
}

// ---------------------------------------------------------------- converter probe

const PROBE_START: Record<string, ProbeInput> = {
  idle: { provider: "statsbomb", xText: "", yText: "" },
  valid: { provider: "statsbomb", xText: "60", yText: "40" },
  "range-error": { provider: "statsbomb", xText: "150", yText: "40" },
};

export function ConverterProbeDemo({ state }: { state: string }) {
  const [value, setValue] = useState<ProbeInput>(
    () => PROBE_START[state] ?? (PROBE_START.idle as ProbeInput),
  );
  const result = probeConvert(value.provider, value.xText, value.yText, { length: 105, width: 68 });
  return (
    <div className="w-full min-w-0">
      <ConverterProbe value={value} onChange={setValue} result={result} />
    </div>
  );
}
