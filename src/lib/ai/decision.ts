/**
 * Automatic photo verification: reason catalogue and decision rules.
 *
 * Pure code with no server dependencies, shared by the web app (src/lib/ai/pipeline.ts) and the
 * offline demo (demo/src/store.ts), so both apply exactly the same policy.
 *
 * How a proof is decided:
 *   1. Local rules (free, no AI): exact duplicate (SHA-256, blocked on upload) and near-duplicate
 *      (perceptual hash of a photo already sent).
 *   2. The vision model describes the photo through fixed questions (AiAnalysis).
 *   3. decideProof() turns that into approve / reject / send to a moderator. It only acts alone on
 *      clear cases above the confidence thresholds set by the admin; everything else goes to a
 *      human together with the AI suggestion. Users can appeal automatic decisions (LGPD art. 20).
 */
import type { Lang } from "@/lib/i18n";

export type AiMode = "off" | "suggest" | "auto";
export type AiVerdict = "approve" | "reject" | "review";

export const REJECTION_CODES = [
  "similar_photo",
  "not_matching_mission",
  "screen_photo",
  "ai_generated",
  "inappropriate",
  "too_dark_blurry",
  "report_mismatch",
] as const;
export type RejectionCode = (typeof REJECTION_CODES)[number];

/** Reasons clear enough to reject without a moderator (when confidence is high enough). */
const AUTO_REJECTABLE: ReadonlySet<RejectionCode> = new Set([
  "similar_photo",
  "not_matching_mission",
  "screen_photo",
  "ai_generated",
  "inappropriate",
  "too_dark_blurry",
]);

export function isRejectionCode(value: unknown): value is RejectionCode {
  return typeof value === "string" && (REJECTION_CODES as readonly string[]).includes(value);
}

/** Text shown to the user and the moderator for each reason. */
export const REJECTION_REASONS: Record<RejectionCode, Record<Lang, string>> = {
  similar_photo: {
    pt: "Esta foto é igual ou muito parecida com outra já enviada. Envie uma foto nova, tirada por você no local.",
    en: "This photo is the same as, or very similar to, one already sent. Send a new photo you took on site.",
    es: "Esta foto es igual o muy parecida a otra ya enviada. Envía una foto nueva, tomada por ti en el lugar.",
  },
  not_matching_mission: {
    pt: "A foto não mostra a ação pedida na missão.",
    en: "The photo does not show the action the mission asks for.",
    es: "La foto no muestra la acción que pide la misión.",
  },
  screen_photo: {
    pt: "A foto parece ser de uma tela, impressão ou captura de tela, e não uma foto tirada no local.",
    en: "The photo looks like a picture of a screen, a print or a screenshot, not a photo taken on site.",
    es: "La foto parece ser de una pantalla, impresión o captura, y no una foto tomada en el lugar.",
  },
  ai_generated: {
    pt: "A imagem parece ter sido gerada ou editada por computador.",
    en: "The image looks computer-generated or edited.",
    es: "La imagen parece generada o editada por computadora.",
  },
  inappropriate: {
    pt: "A foto tem conteúdo impróprio para a plataforma.",
    en: "The photo contains content that is not allowed on the platform.",
    es: "La foto tiene contenido inapropiado para la plataforma.",
  },
  too_dark_blurry: {
    pt: "A foto está escura ou borrada demais para comprovar a ação. Tente de novo com mais luz.",
    en: "The photo is too dark or blurry to prove the action. Try again with more light.",
    es: "La foto está demasiado oscura o borrosa para comprobar la acción. Inténtalo de nuevo con más luz.",
  },
  report_mismatch: {
    pt: "O relato não corresponde ao que aparece na foto.",
    en: "The report does not match what the photo shows.",
    es: "El relato no corresponde a lo que aparece en la foto.",
  },
};

export function rejectionReasonText(code: string | null | undefined, lang: Lang): string | null {
  return isRejectionCode(code) ? REJECTION_REASONS[code][lang] : null;
}

/** Answers of the vision model (validated by parseAiAnalysis). */
export type AiAnalysis = {
  /** Short description of what is visible (Portuguese). */
  whatIsVisible: string;
  matchesMission: boolean;
  /** A camera photo of a real scene. */
  isRealPhoto: boolean;
  screenOrPrint: boolean;
  aiGeneratedOrEdited: boolean;
  inappropriate: boolean;
  tooDarkOrBlurry: boolean;
  reportConsistent: boolean;
  /** People's faces can be recognised (privacy hint for moderators). */
  identifiableFaces: boolean;
  verdict: AiVerdict;
  reasonCode: RejectionCode | null;
  /** 0-100 */
  confidence: number;
  /** One or two sentences for the user and the moderator (Portuguese). */
  explanation: string;
};

/** What is stored in submissions.ai_checks. */
export type AiChecks = Partial<AiAnalysis> & {
  /** Near-duplicate found by the perceptual hash. */
  similarSubmissionId?: string;
  similarDistance?: number;
};

export type AiSettingsValues = {
  mode: AiMode;
  approveMinConfidence: number;
  rejectMinConfidence: number;
  maxAutoApproveFone: number;
};

export const DEFAULT_AI_SETTINGS: AiSettingsValues = {
  mode: "auto",
  approveMinConfidence: 85,
  rejectMinConfidence: 90,
  maxAutoApproveFone: 50,
};

/**
 * Perceptual-hash Hamming distance (0-64) between two photos.
 * At or below SAME_PHOTO it is the same picture (re-saved, resized, lightly cropped): rejected.
 * Up to SIMILAR_PHOTO it may be a near copy, or two people photographing the same spot at a group
 * clean-up: a moderator decides.
 */
export const SAME_PHOTO_MAX_DISTANCE = 4;
export const SIMILAR_PHOTO_MAX_DISTANCE = 8;

export type ProofDecision = {
  /** What happens now. */
  action: "approve" | "reject" | "review";
  /** Suggestion shown to the moderator (may differ from action when confidence is low). */
  verdict: AiVerdict;
  confidence: number;
  reasonCode: RejectionCode | null;
};

function clampConfidence(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
}

/** First problem found in the model's answers, in order of severity. */
export function problemFromAnalysis(a: AiAnalysis): RejectionCode | null {
  if (a.inappropriate) return "inappropriate";
  if (a.screenOrPrint) return "screen_photo";
  if (a.aiGeneratedOrEdited || !a.isRealPhoto) return "ai_generated";
  if (!a.matchesMission) return "not_matching_mission";
  if (a.tooDarkOrBlurry) return "too_dark_blurry";
  if (!a.reportConsistent) return "report_mismatch";
  return null;
}

export function decideProof(input: {
  settings: AiSettingsValues;
  /** null when the model was not called or failed. */
  analysis: AiAnalysis | null;
  /** Near-duplicate found by the local rules. */
  similar: { distance: number } | null;
  foneReward: number;
}): ProofDecision {
  const { settings, analysis, similar } = input;
  const auto = settings.mode === "auto";

  if (similar && similar.distance <= SAME_PHOTO_MAX_DISTANCE) {
    return { action: auto ? "reject" : "review", verdict: "reject", confidence: 100, reasonCode: "similar_photo" };
  }
  if (similar && similar.distance <= SIMILAR_PHOTO_MAX_DISTANCE) {
    return { action: "review", verdict: "reject", confidence: analysis?.confidence ?? 0, reasonCode: "similar_photo" };
  }
  if (!analysis || settings.mode === "off") {
    return { action: "review", verdict: "review", confidence: 0, reasonCode: null };
  }

  const confidence = clampConfidence(analysis.confidence);
  const problem = problemFromAnalysis(analysis);

  if (analysis.verdict === "approve") {
    // An "approve" that contradicts the model's own answers is not trusted.
    if (problem) return { action: "review", verdict: "review", confidence, reasonCode: problem };
    const canAutoApprove =
      auto && confidence >= settings.approveMinConfidence && input.foneReward <= settings.maxAutoApproveFone;
    return { action: canAutoApprove ? "approve" : "review", verdict: "approve", confidence, reasonCode: null };
  }

  if (analysis.verdict === "reject") {
    const reasonCode = analysis.reasonCode ?? problem;
    if (!reasonCode) return { action: "review", verdict: "review", confidence, reasonCode: null };
    const canAutoReject = auto && confidence >= settings.rejectMinConfidence && AUTO_REJECTABLE.has(reasonCode);
    return { action: canAutoReject ? "reject" : "review", verdict: "reject", confidence, reasonCode };
  }

  return { action: "review", verdict: "review", confidence, reasonCode: analysis.reasonCode ?? problem };
}

/**
 * Validates the model output (it is untrusted text). Returns null when the answer is unusable,
 * in which case the proof simply goes to a moderator.
 */
export function parseAiAnalysis(raw: unknown): AiAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const bool = (key: string) => (typeof r[key] === "boolean" ? (r[key] as boolean) : null);
  const str = (key: string, max: number) => (typeof r[key] === "string" ? (r[key] as string).trim().slice(0, max) : "");

  const fields = {
    matchesMission: bool("matches_mission"),
    isRealPhoto: bool("is_real_photo"),
    screenOrPrint: bool("screen_or_print"),
    aiGeneratedOrEdited: bool("ai_generated_or_edited"),
    inappropriate: bool("inappropriate"),
    tooDarkOrBlurry: bool("too_dark_or_blurry"),
    reportConsistent: bool("report_consistent"),
    identifiableFaces: bool("identifiable_faces"),
  };
  if (Object.values(fields).some((value) => value === null)) return null;

  const verdict = r.verdict;
  if (verdict !== "approve" && verdict !== "reject" && verdict !== "review") return null;
  const confidence = typeof r.confidence === "number" ? clampConfidence(r.confidence) : null;
  if (confidence === null) return null;

  return {
    ...(fields as { [K in keyof typeof fields]: boolean }),
    whatIsVisible: str("what_is_visible", 300),
    verdict,
    reasonCode: isRejectionCode(r.reason_code) ? r.reason_code : null,
    confidence,
    explanation: str("explanation", 400),
  };
}
