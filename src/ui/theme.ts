// Theme choice per device (04-CONTEXT: light and dark both first-class, the learner's choice
// persists in localStorage, wrapped in try/catch). Pure: storage and the media query are passed in.

export type ThemeChoice = "system" | "light" | "dark";
export type ThemeName = "light" | "dark";

/** The one localStorage key for the theme choice. */
export const THEME_KEY = "tnk:theme";

export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): ThemeStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Reading `localStorage` itself throws when storage is blocked.
    return null;
  }
}

function isChoice(value: unknown): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

/** The stored choice; any other value, a missing storage or a throwing one gives "system". */
export function readStoredTheme(storage: ThemeStorage | null = defaultStorage()): ThemeChoice {
  try {
    const value = storage?.getItem(THEME_KEY);
    return isChoice(value) ? value : "system";
  } catch {
    return "system";
  }
}

/** Stores the choice; a blocked or full storage is ignored (the choice then lasts the visit). */
export function writeStoredTheme(
  value: ThemeChoice,
  storage: ThemeStorage | null = defaultStorage(),
): void {
  try {
    storage?.setItem(THEME_KEY, value);
  } catch {
    // Nothing to do: the page keeps working without persistence.
  }
}

export interface ResolveThemeInput {
  /** The `?theme=` query value; only "light" and "dark" count. */
  param: string | null | undefined;
  stored: ThemeChoice;
  prefersDark: boolean;
  /** A direction screen's primary theme: with it, "system" means the primary, for a fair comparison. */
  primary?: ThemeName;
}

/** Precedence: a valid param, then a stored light or dark, then the primary theme, then the system. */
export function resolveTheme({
  param,
  stored,
  prefersDark,
  primary,
}: ResolveThemeInput): ThemeName {
  if (param === "light" || param === "dark") return param;
  if (stored === "light" || stored === "dark") return stored;
  if (primary) return primary;
  return prefersDark ? "dark" : "light";
}

/** The part of `document.documentElement` the theme touches; a plain object in unit tests. */
export interface ThemeRoot {
  dataset: Record<string, string | undefined>;
}

export interface ApplyThemeOptions {
  root?: ThemeRoot | null;
  storage?: ThemeStorage | null;
}

function defaultRoot(): ThemeRoot | null {
  return typeof document === "undefined" ? null : document.documentElement;
}

/**
 * Applies and remembers the learner's theme choice for the whole app: "light" or "dark" sets
 * `data-theme` on the html element, "system" removes it so the `prefers-color-scheme` block of
 * tokens.css applies. The same rule as the inline script in index.html, which applies a stored
 * choice before first paint. A blocked storage only loses persistence; the attribute still changes.
 */
export function applyDocumentTheme(
  choice: ThemeChoice,
  { root = defaultRoot(), storage = defaultStorage() }: ApplyThemeOptions = {},
): void {
  writeStoredTheme(choice, storage);
  if (!root) return;
  if (choice === "light" || choice === "dark") root.dataset.theme = choice;
  else delete root.dataset.theme;
}
