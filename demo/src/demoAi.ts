/**
 * Simulated automatic verification for the offline demo.
 *
 * There is no vision model in the demo, so the "analysis" comes from what the user picked:
 * a sample photo of a category (matching the mission or not), a "photo of a screen", a "photo from
 * the internet" (stock-photo watermark: always goes to a person), or a real
 * camera photo (which the demo cannot analyse, so it goes to the moderators). The decision itself
 * uses the same rules as the server (decideProof in src/lib/ai/decision.ts).
 */
import { categoryEmoji, categoryLabels, type Lang } from "@/lib/i18n";
import type { AiAnalysis } from "@/lib/ai/decision";
import type { ProofType } from "@/lib/proof";
import { dt } from "./i18n";
import type { Category } from "./store";
import type { WebMatches } from "@/lib/ai/web-detection-core";

export type SampleKind = Exclude<Category, "other"> | "screen" | "internet";
export const SAMPLE_KINDS: SampleKind[] = ["cleanup", "planting", "recycling", "donation", "screen", "internet"];

const GRADIENTS: Record<SampleKind, [string, string]> = {
  cleanup: ["#38bdf8", "#f5d0a9"],
  planting: ["#86efac", "#166534"],
  recycling: ["#5eead4", "#0f766e"],
  donation: ["#fda4af", "#9d174d"],
  screen: ["#1e293b", "#0f172a"],
  internet: ["#bae6fd", "#15803d"],
};

export function sampleEmoji(kind: SampleKind) {
  return kind === "screen" ? "📱" : kind === "internet" ? "🌐" : (categoryEmoji[kind] ?? "🌱");
}

export function sampleLabel(kind: SampleKind, lang: Lang) {
  if (kind === "screen") return dt(lang, "sample_screen");
  if (kind === "internet") return dt(lang, "sample_internet");
  return categoryLabels[kind]?.[lang] ?? kind;
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
  ctx.fillText(kind === "screen" || kind === "internet" ? "🌳" : sampleEmoji(kind), 400, kind === "screen" ? 300 : 310);
  if (kind === "internet") {
    // A "stock photo": watermark repeated diagonally and a site caption, what the AI should flag.
    ctx.save();
    ctx.translate(400, 300);
    ctx.rotate(-Math.PI / 7);
    ctx.font = "bold 46px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    for (let row = -3; row <= 3; row++) {
      for (let col = -2; col <= 2; col++) ctx.fillText("© fotosgratis", col * 330 + (row % 2) * 160, row * 110);
    }
    ctx.restore();
    ctx.fillStyle = "rgba(15,23,42,0.75)";
    ctx.fillRect(0, 548, 800, 52);
    ctx.font = "bold 20px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`fotosgratis.exemplo · ID ${Math.floor(100000 + Math.random() * 900000)}`, 400, 575);
    return canvas.toDataURL("image/jpeg", 0.8);
  }
  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("EcoVerify", 400, 570);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** Simulated model answer. null = real photo, which the demo cannot analyse. */
export function simulateAnalysis(
  sample: SampleKind | null,
  missionCategory: Category,
  lang: Lang,
  proof: { proofType?: ProofType; declaredCount?: number | null } = {},
): AiAnalysis | null {
  if (!sample) return null;
  // The sample scene "shows" what the person declared; before/after samples show the same place, cleaner.
  const extra: Partial<AiAnalysis> =
    proof.proofType === "count" && proof.declaredCount
      ? { itemCount: proof.declaredCount }
      : proof.proofType === "before_after"
        ? { sameScene: true, improvementVisible: true }
        : {};
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
    internetCopy: false,
    internetSigns: "",
    verdict: "approve",
    reasonCode: null,
    confidence: 92,
    explanation: dt(lang, "sim_match"),
    ...extra,
  };
  if (sample === "screen") {
    return { ...base, isRealPhoto: false, screenOrPrint: true, verdict: "reject", reasonCode: "screen_photo", confidence: 95, explanation: dt(lang, "sim_screen") };
  }
  if (sample === "internet") {
    return {
      ...base,
      internetCopy: true,
      internetSigns: dt(lang, "sim_internet_signs"),
      verdict: "review",
      reasonCode: "internet_copy",
      confidence: 88,
      explanation: dt(lang, "sim_internet"),
    };
  }
  // "Other" missions accept any kind of action photo, but not with full confidence.
  if (missionCategory === "other") return { ...base, verdict: "review", confidence: 70, explanation: dt(lang, "sim_other") };
  if (sample !== missionCategory) {
    return { ...base, matchesMission: false, verdict: "reject", reasonCode: "not_matching_mission", confidence: 93, explanation: dt(lang, "sim_mismatch") };
  }
  return base;
}

/**
 * Simulated reverse image search (Cloud Vision Web Detection on the server). The "internet" sample
 * is "found" on two example sites (reserved .example domains, nothing real); the others find nothing.
 */
export function simulateWebSearch(sample: SampleKind | null): WebMatches | null {
  if (!sample) return null;
  if (sample !== "internet") return { fullMatches: [], pages: [], partialCount: 0, bestGuess: null };
  return {
    fullMatches: ["https://banco-de-imagens.example/fotos/arvore-parque.jpg"],
    pages: [
      { url: "https://banco-de-imagens.example/fotos/arvore-parque", title: "Árvore no parque — foto grátis (exemplo simulado)" },
      { url: "https://noticias.example/meio-ambiente/plantio", title: "Mutirão de plantio na cidade (exemplo simulado)" },
    ],
    partialCount: 3,
    bestGuess: "tree planting",
  };
}

/**
 * Sample "extra proof": the scene of the mission with a sheet of paper and the code written by hand.
 * Random details keep every sample unique (duplicate-photo rule).
 */
export function drawExtraProofPhoto(kind: SampleKind, code: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext("2d");
  return ctx ? paintPaper(ctx, code, kind) : "";
}

function paintPaper(ctx: CanvasRenderingContext2D, code: string, kind: SampleKind): string {
  const [from, to] = GRADIENTS[kind];
  const gradient = ctx.createLinearGradient(0, 0, 0, 600);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 600);
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.25).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 800, Math.random() * 600, 6 + Math.random() * 40, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = "180px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(sampleEmoji(kind), 250, 300);
  // The sheet of paper, slightly rotated, with the code "handwritten".
  ctx.save();
  ctx.translate(560, 310);
  ctx.rotate((-6 + Math.random() * 12) * (Math.PI / 180));
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#fefce8";
  ctx.fillRect(-150, -110, 300, 220);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(59,130,246,0.25)";
  for (let y = -70; y < 110; y += 32) {
    ctx.beginPath();
    ctx.moveTo(-140, y);
    ctx.lineTo(140, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#1e3a8a";
  ctx.font = "italic bold 92px 'Comic Sans MS', 'Segoe Print', cursive";
  ctx.fillText(code, 0, 8);
  ctx.restore();
  return ctx.canvas.toDataURL("image/jpeg", 0.8);
}

/** Simulated analysis of the sample extra proof: the code is readable and it is the same place. */
export function simulateExtraAnalysis(lang: Lang, proof: { proofType?: ProofType; declaredCount?: number | null } = {}): AiAnalysis {
  return {
    whatIsVisible: dt(lang, "sim_seen", { what: "📄" }),
    matchesMission: true,
    isRealPhoto: true,
    screenOrPrint: false,
    aiGeneratedOrEdited: false,
    inappropriate: false,
    tooDarkOrBlurry: false,
    reportConsistent: true,
    identifiableFaces: false,
    internetCopy: false,
    internetSigns: "",
    verdict: "approve",
    reasonCode: null,
    confidence: 93,
    explanation: dt(lang, "sim_match"),
    sameScene: true,
    codeVisible: true,
    ...(proof.proofType === "count" && proof.declaredCount ? { itemCount: proof.declaredCount } : {}),
  };
}
