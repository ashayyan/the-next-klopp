// RED stub: the behaviour tests run against these placeholders before the module is written.
export type ThemeChoice = "system" | "light" | "dark";
export type ThemeName = "light" | "dark";
export const THEME_KEY = "";

export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function readStoredTheme(_storage?: ThemeStorage | null): ThemeChoice {
  return "light";
}

export function writeStoredTheme(_value: ThemeChoice, _storage?: ThemeStorage | null): void {}

export function resolveTheme(_input: {
  param: string | null | undefined;
  stored: ThemeChoice;
  prefersDark: boolean;
  primary?: ThemeName;
}): ThemeName {
  return "light";
}
