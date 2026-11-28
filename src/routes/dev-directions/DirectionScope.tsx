import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { useSearchParams } from "react-router";
import { ShellBar, type ShellBarProps } from "../../ui/lesson/ShellBar.tsx";
import {
  readStoredTheme,
  resolveTheme,
  type ThemeChoice,
  type ThemeName,
  writeStoredTheme,
} from "../../ui/theme.ts";
import floodlitTokens from "./tokens/floodlit.tokens.json";
import notebookTokens from "./tokens/notebook.tokens.json";
import programmeTokens from "./tokens/programme.tokens.json";
// The three scoped token files: each one only applies under its own [data-direction="<id>"].
import "./tokens/floodlit.css";
import "./tokens/programme.css";
import "./tokens/notebook.css";
import "./directions.css";

export type { ThemeName };

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

export interface DirectionTheme {
  /** The theme on screen. */
  theme: ThemeName;
  /** The learner's stored choice. */
  choice: ThemeChoice;
  /** Stores the choice and drops `?theme=` from the URL so the choice shows. */
  choose: (choice: ThemeChoice) => void;
}

const DirectionThemeContext = createContext<DirectionTheme | null>(null);

/** The direction screen's theme and the learner's choice; only inside <DirectionScope>. */
export function useDirectionTheme(): DirectionTheme {
  const value = useContext(DirectionThemeContext);
  if (!value) throw new Error("useDirectionTheme() must be called inside <DirectionScope>");
  return value;
}

function usePrefersDark(): boolean {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.(query).matches === true,
  );
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const update = () => setDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return dark;
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
  const [params, setParams] = useSearchParams();
  const [choice, setChoice] = useState<ThemeChoice>(() => readStoredTheme());
  const prefersDark = usePrefersDark();
  // ?theme= wins, then a stored light or dark, then the direction's primary theme (a fair
  // comparison: "Match my system" on a direction screen shows the direction as designed).
  const theme = resolveTheme({
    param: params.get("theme"),
    stored: choice,
    prefersDark,
    primary: direction.primaryTheme,
  });
  const choose = (next: ThemeChoice) => {
    writeStoredTheme(next);
    setChoice(next);
    if (params.has("theme")) {
      const rest = new URLSearchParams(params);
      rest.delete("theme");
      setParams(rest, { replace: true });
    }
  };
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
      <DirectionThemeContext.Provider value={{ theme, choice, choose }}>
        {children}
      </DirectionThemeContext.Provider>
    </div>
  );
}

/** The lesson top bar wired to the direction screen's theme choice. */
export function DirectionShellBar(props: Omit<ShellBarProps, "theme" | "onThemeChange">) {
  const { choice, choose } = useDirectionTheme();
  return <ShellBar {...props} theme={choice} onThemeChange={choose} />;
}
