import { type ReactNode, useEffect, useLayoutEffect, useState } from "react";
import { useSearchParams } from "react-router";
import floodlitTokens from "./tokens/floodlit.tokens.json";
import notebookTokens from "./tokens/notebook.tokens.json";
import programmeTokens from "./tokens/programme.tokens.json";
// The three scoped token files: each one only applies under its own [data-direction="<id>"].
import "./tokens/floodlit.css";
import "./tokens/programme.css";
import "./tokens/notebook.css";

export type ThemeName = "light" | "dark";

export interface Direction {
  id: "floodlit" | "programme" | "notebook";
  name: string;
  idea: string;
  primaryTheme: ThemeName;
}

export type DirectionId = Direction["id"];

function primaryOf(meta: { primaryTheme: string }): ThemeName {
  return meta.primaryTheme === "dark" ? "dark" : "light";
}

/** The fixed direction list. A URL `:id` is only ever looked up here, never used as a path. */
export const DIRECTIONS: readonly Direction[] = [
  {
    id: "floodlit",
    name: "Floodlit",
    idea: "The analysts’ video room at night: the pitch is the one lit object.",
    primaryTheme: primaryOf(floodlitTokens.meta),
  },
  {
    id: "programme",
    name: "Matchday Programme",
    idea: "The printed matchday programme and team sheet: condensed type, ink rules, one yellow block.",
    primaryTheme: primaryOf(programmeTokens.meta),
  },
  {
    id: "notebook",
    name: "Analyst’s Notebook",
    idea: "A clean page from an analyst’s notebook: one sheet, the pitch drawn on it, notes in the margin.",
    primaryTheme: primaryOf(notebookTokens.meta),
  },
];

export function findDirection(id: string | undefined): Direction | undefined {
  return DIRECTIONS.find((d) => d.id === id);
}

/** `?theme=light|dark` wins; anything else falls back to the direction's primary theme. */
export function themeFromQuery(param: string | null, primary: ThemeName): ThemeName {
  return param === "light" || param === "dark" ? param : primary;
}

export interface DirectionScopeProps {
  direction: Direction;
  /** False while the screen's scene is still loading; data-ready waits for it and the fonts. */
  ready?: boolean;
  children: ReactNode;
}

/**
 * The root of a direction screen: `data-direction` scopes the direction's token CSS and
 * `data-theme` picks its light or dark set. The same two attributes are mirrored on <body> while
 * the screen is mounted, so the page background and Base UI popups (portalled into <body>) read the
 * direction's tokens too. `data-ready="1"` tells the review command the fonts and scene are drawn.
 */
export function DirectionScope({ direction, ready = true, children }: DirectionScopeProps) {
  const [params] = useSearchParams();
  const theme = themeFromQuery(params.get("theme"), direction.primaryTheme);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    if (!fonts) {
      setFontsReady(true);
      return;
    }
    fonts.ready.then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const body = document.body;
    body.dataset.direction = direction.id;
    body.dataset.theme = theme;
    return () => {
      delete body.dataset.direction;
      delete body.dataset.theme;
    };
  }, [direction.id, theme]);

  return (
    <div
      data-direction={direction.id}
      data-theme={theme}
      data-ready={fontsReady && ready ? "1" : "0"}
      className="min-h-dvh bg-surface-page font-sans text-body text-ink"
    >
      {children}
    </div>
  );
}
