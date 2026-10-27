/**
 * Simulated automatic verification for the offline demo.
 *
 * There is no vision model in the demo, so the "analysis" comes from what the user picked:
 * a sample photo of a category (matching the mission or not), a "photo of a screen", or a real
 * camera photo (which the demo cannot analyse, so it goes to the moderators). The decision itself
 * uses the same rules as the server (decideProof in src/lib/ai/decision.ts).
 */
import { categoryEmoji, categoryLabels, type Lang } from "@/lib/i18n";
import type { AiAnalysis } from "@/lib/ai/decision";
import { dt } from "./i18n";
import type { Category } from "./store";

export type SampleKind = Exclude<Category, "other"> | "screen";
export const SAMPLE_KINDS: SampleKind[] = ["cleanup", "planting", "recycling", "donation", "screen"];

const GRADIENTS: Record<SampleKind, [string, string]> = {
  cleanup: ["#38bdf8", "#f5d0a9"],
  planting: ["#86efac", "#166534"],
  recycling: ["#5eead4", "#0f766e"],
  donation: ["#fda4af", "#9d174d"],
  screen: ["#1e293b", "#0f172a"],
};

export function sampleEmoji(kind: SampleKind) {
  return kind === "screen" ? "📱" : (categoryEmoji[kind] ?? "🌱");
}

export function sampleLabel(kind: SampleKind, lang: Lang) {
  return kind === "screen" ? dt(lang, "sample_screen") : (categoryLabels[kind]?.[lang] ?? kind);
}

/**
 * Draws a sample "photo" (a stylised scene) on a canvas. Random details make every sample unique,
 * so the duplicate-photo rule does not block a second try.
 */
export function drawSamplePhoto(kind: SampleKind): string {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const [from, to] = GRADIENTS[kind];
  const gradient = ctx.createLinearGradient(0, 0, 0, 600);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 600);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.25).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 800, Math.random() * 600, 6 + Math.random() * 40, 0, Math.PI * 2);
    ctx.fill();
  }
  if (kind === "screen") {
    // A phone screen with a photo inside, glare and visible pixels: what the AI should flag.
    ctx.fillStyle = "#020617";
    ctx.fillRect(250, 60, 300, 480);
    const inner = ctx.createLinearGradient(0, 100, 0, 500);
    inner.addColorStop(0, "#86efac");
    inner.addColorStop(1, "#166534");
    ctx.fillStyle = inner;
    ctx.fillRect(265, 100, 270, 400);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(265, 100);
    ctx.lineTo(420, 100);
    ctx.lineTo(265, 330);
    ctx.fill();
  }
  ctx.font = "220px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(kind === "screen" ? "🌳" : sampleEmoji(kind), 400, kind === "screen" ? 300 : 310);
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("EcoVerify · demo", 400, 570);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** Simulated model answer. null = real photo, which the demo cannot analyse. */
export function simulateAnalysis(sample: SampleKind | null, missionCategory: Category, lang: Lang): AiAnalysis | null {
  if (!sample) return null;
  const base: AiAnalysis = {
    whatIsVisible: dt(lang, "sim_seen", { what: sampleLabel(sample, lang) }),
    matchesMission: true,
    isRealPhoto: true,
    screenOrPrint: false,
    aiGeneratedOrEdited: false,
    inappropriate: false,
    tooDarkOrBlurry: false,
    reportConsistent: true,
    identifiableFaces: false,
    verdict: "approve",
    reasonCode: null,
    confidence: 92,
    explanation: dt(lang, "sim_match"),
  };
  if (sample === "screen") {
    return { ...base, isRealPhoto: false, screenOrPrint: true, verdict: "reject", reasonCode: "screen_photo", confidence: 95, explanation: dt(lang, "sim_screen") };
  }
  // "Other" missions accept any kind of action photo, but not with full confidence.
  if (missionCategory === "other") return { ...base, verdict: "review", confidence: 70, explanation: dt(lang, "sim_other") };
  if (sample !== missionCategory) {
    return { ...base, matchesMission: false, verdict: "reject", reasonCode: "not_matching_mission", confidence: 93, explanation: dt(lang, "sim_mismatch") };
  }
  return base;
}
