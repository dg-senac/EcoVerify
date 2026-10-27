/** Colour theme preference (users.theme). "system" follows the phone / computer setting. */
export type Theme = "system" | "light" | "dark";

export const THEMES: readonly Theme[] = ["system", "light", "dark"] as const;

export function parseTheme(value: unknown): Theme {
  return THEMES.find((theme) => theme === value) ?? "system";
}

/** Browser UI colour (Android status bar / address bar) for each theme. */
export const THEME_COLORS = { light: "#f7f8f7", dark: "#0a100e" } as const;
