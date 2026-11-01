import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, THEMES, parseTheme } from "@/lib/theme";

describe("theme", () => {
  it("opens in light mode by default", () => {
    expect(DEFAULT_THEME).toBe("light");
    expect(THEMES[0]).toBe("light");
  });

  it("falls back to light for missing or unknown values", () => {
    expect(parseTheme(null)).toBe("light");
    expect(parseTheme("purple")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("system")).toBe("system");
  });
});
