import type { Lang } from "@/lib/i18n";

/**
 * Texts of the initial data in the three languages. The seed registers every text it writes, so a
 * screen can show the reports, chat, photos and notes of the initial data in the viewer's language
 * (each profile on the device may use a different one). Texts written by people are left as typed.
 */
const table = new Map<string, Record<Lang, string>>();

export function registerText(text: Record<Lang, string>) {
  table.set(text.pt, text);
  table.set(text.en, text);
  table.set(text.es, text);
}

export function hasSeedTexts() {
  return table.size > 0;
}

export function seedText<T extends string | null | undefined>(text: T, lang: Lang): T {
  if (!text) return text;
  return (table.get(text)?.[lang] ?? text) as T;
}
