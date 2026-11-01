import { describe, expect, it } from "vitest";
import { DEFAULT_LANG, I18N_DICT, tf, tx } from "@/lib/i18n";
import { DEMO_DICT } from "../demo/src/i18n";

const LANGS = ["pt", "en", "es"] as const;
/** Intentionally empty in some language (e.g. "translation provided for convenience" has no Portuguese). */
const EMPTY_ON_PURPOSE = new Set(["legal_pt_only.pt"]);
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe.each([
  ["app", I18N_DICT],
  ["APK", DEMO_DICT],
] as const)("%s dictionary", (_name, dict) => {
  it("every text exists in Portuguese, English and Spanish", () => {
    const missing: string[] = [];
    for (const [key, value] of Object.entries(dict)) {
      for (const lang of LANGS) if (!value[lang]?.trim() && !EMPTY_ON_PURPOSE.has(`${key}.${lang}`)) missing.push(`${key}.${lang}`);
    }
    expect(missing).toEqual([]);
  });

  it("the {placeholders} are the same in every language", () => {
    const mismatched: string[] = [];
    for (const [key, value] of Object.entries(dict)) {
      const pt = placeholders(value.en ?? "");
      for (const lang of LANGS) if (placeholders(value[lang] ?? "").join() !== pt.join()) mismatched.push(`${key}.${lang}`);
    }
    expect(mismatched).toEqual([]);
  });
});

describe("helpers", () => {
  it("English is the default language", () => {
    expect(DEFAULT_LANG).toBe("en");
  });

  it("tx picks the language and tf fills placeholders", () => {
    expect(tx("es", "olá", "hello", "hola")).toBe("hola");
    const key = Object.keys(I18N_DICT).find((k) => placeholders(I18N_DICT[k as keyof typeof I18N_DICT].en ?? "").length > 0) as keyof typeof I18N_DICT;
    const vars = Object.fromEntries(placeholders(I18N_DICT[key].en!).map((name) => [name, "X"]));
    expect(tf("en", key, vars)).not.toMatch(/\{\w+\}/);
  });
});
