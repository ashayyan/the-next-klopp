import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { useSearchParams } from "react-router";
// The system tokens (src/styles/tokens.css) are already loaded by the app entry; the primary
// theme is read from the DESIGN.md tokens block. Dev-only chunk: this module is never in the study build.
import designMd from "../../../docs/DESIGN.md?raw";
import { extractTokensBlock } from "../../../scripts/design/tokens.ts";
import { ShellBar, type ShellBarProps } from "../../ui/lesson/ShellBar.tsx";
import {
  applyDocumentTheme,
  readStoredTheme,
  resolveTheme,
  type ThemeChoice,
  type ThemeName,
} from "../../ui/theme.ts";

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

const systemMeta = (JSON.parse(extractTokensBlock(designMd)) as { meta: { primaryTheme: string } })
  .meta;

/**
 * The fixed direction list: only the picked direction (ADR 0010). A URL `:id` is only ever looked
 * up here, never used as a path.
 */
export const DIRECTIONS: readonly Direction[] = [
  {
    id: "floodlit",
    name: "Floodlit",
    idea: "The analysts’ video room at night: the pitch is the one lit object.",
    primaryTheme: primaryOf(systemMeta),
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
    // Stores the choice and sets <html> too, as the app-wide choice does, so the whole page (not
    // only this screen's subtree and <body>) follows it without a reload.
    applyDocumentTheme(next);
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
    // Restore the values that were there before this screen, not just delete them.
    const prior = { direction: body.dataset.direction, theme: body.dataset.theme };
    body.dataset.direction = direction.id;
    body.dataset.theme = theme;
    return () => {
      for (const key of ["direction", "theme"] as const) {
        const value = prior[key];
        if (value === undefined) delete body.dataset[key];
        else body.dataset[key] = value;
      }
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
