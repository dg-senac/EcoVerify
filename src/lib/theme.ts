/** Colour theme preference (users.theme). "system" follows the phone / computer setting. */
export type Theme = "system" | "light" | "dark";

/** Light order in Settings: the default first. */
export const THEMES: readonly Theme[] = ["light", "dark", "system"] as const;

/** The app always opens in light mode; dark or "follow the phone" are opt-in in Settings. */
export const DEFAULT_THEME: Theme = "light";

export function parseTheme(value: unknown): Theme {
  return THEMES.find((theme) => theme === value) ?? DEFAULT_THEME;
}

/** Browser UI colour (Android status bar / address bar) for each theme. */
export const THEME_COLORS = { light: "#f7f8f7", dark: "#0a100e" } as const;
