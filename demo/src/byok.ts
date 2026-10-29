/**
 * "Bring your own key": the tester pastes their own Gemini API key in Settings and camera/gallery
 * photos are analysed by the real model, still without a server or database.
 *
 * - The key is kept only in this device's localStorage, under its own entry: it is not part of the
 *   demo state, so it never shows up in "Export my data" and is never sent anywhere except to Google.
 * - The public demo never ships a key: without one, everything stays simulated as before.
 * - Sample photos keep the simulated analysis (they are drawings, a real model would reject them).
 */
import { useSyncExternalStore } from "react";
import type { AiAnalysis } from "@/lib/ai/decision";
import { checkGeminiKey, GEMINI_DEFAULT_MODEL, requestGeminiAnalysis, type MissionForAi } from "@/lib/ai/gemini-core";
import type { Lang } from "@/lib/i18n";
import { dt } from "./i18n";

const STORAGE_KEY = "ecoverify-demo-gemini-key";
export const BYOK_MODEL = GEMINI_DEFAULT_MODEL;
export const AI_STUDIO_KEYS_URL = "https://aistudio.google.com/apikey";

const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

let current = typeof window === "undefined" ? null : read();

function emit() {
  current = read();
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) emit();
  });
}

export function getGeminiKey(): string | null {
  return current;
}

export function useGeminiKey(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}

/** Light format check: Google AI Studio keys start with "AIza" and have 39 characters. */
export function looksLikeGeminiKey(value: string): boolean {
  return /^AIza[0-9A-Za-z_-]{30,60}$/.test(value.trim());
}

export function saveGeminiKey(value: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, value.trim());
    emit();
    return true;
  } catch {
    return false;
  }
}

export function removeGeminiKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/** Shows only the start and the end of the key. */
export function maskKey(key: string): string {
  return key.length <= 10 ? "••••" : `${key.slice(0, 6)}••••${key.slice(-4)}`;
}

/** Friendly text for a failed key test or analysis. */
export function byokErrorText(lang: Lang, kind: string): string {
  if (kind === "invalid_key" || kind === "not_configured") return dt(lang, "byok_err_invalid_key");
  if (kind === "quota") return dt(lang, "byok_err_quota");
  if (kind === "network") return dt(lang, "byok_err_network");
  return dt(lang, "byok_err_other");
}

export function testGeminiKey(key: string) {
  return checkGeminiKey(key, BYOK_MODEL);
}

/** Sends the (already downscaled, metadata-free) JPEG data URL to Gemini with the tester's key. */
export async function analyzeWithMyKey(input: {
  key: string;
  dataUrl: string;
  mission: MissionForAi;
  report: string;
  lang: Lang;
}): Promise<{ analysis: AiAnalysis; model: string }> {
  const match = /^data:(image\/[a-z+]+);base64,(.+)$/.exec(input.dataUrl);
  const image = match ? { mimeType: match[1], base64: match[2] } : { mimeType: "image/jpeg", base64: input.dataUrl };
  return requestGeminiAnalysis({ apiKey: input.key, model: BYOK_MODEL, image, mission: input.mission, report: input.report, lang: input.lang });
}
