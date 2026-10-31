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
import { MAX_AUTO_APPROVE_KG } from "@/lib/impact";
import { countCheck } from "@/lib/proof";

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
  "internet_copy",
  "count_mismatch",
  "before_after_mismatch",
] as const;
export type RejectionCode = (typeof REJECTION_CODES)[number];

/**
 * Reasons clear enough to reject without a moderator (when confidence is high enough).
 * "internet_copy" is deliberately absent: the model cannot search the web, so a suspected copy is
 * always decided by a person (see decideProof and INTERNET_COPY_MIN_EXPLANATION).
 */
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
  count_mismatch: {
    pt: "A quantidade de itens na foto é bem menor do que a informada. Espalhe os itens para que todos apareçam e envie de novo.",
    en: "The photo shows far fewer items than the number you entered. Spread the items so they all show and send it again.",
    es: "La foto muestra muchos menos artículos que la cantidad informada. Extiéndelos para que se vean todos y envíala de nuevo.",
  },
  before_after_mismatch: {
    pt: "As fotos de antes e depois não parecem ser do mesmo lugar. Tire as duas do mesmo ponto, com o mesmo enquadramento.",
    en: "The before and after photos do not look like the same place. Take both from the same spot, with the same framing.",
    es: "Las fotos de antes y después no parecen del mismo lugar. Tómalas desde el mismo punto, con el mismo encuadre.",
  },
  internet_copy: {
    pt: "A foto parece ter sido copiada da internet (marca d'água, banco de imagens ou foto de outro site). Envie uma foto tirada por você no local.",
    en: "The photo looks copied from the internet (watermark, stock photo or a picture from another site). Send a photo you took on site.",
    es: "La foto parece copiada de internet (marca de agua, banco de imágenes o foto de otro sitio). Envía una foto tomada por ti en el lugar.",
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
  /**
   * Signs that the picture was downloaded from the internet (stock-photo watermark, site logo or
   * caption, professional studio look, frame of a social-network post). Only a hint: it always
   * sends the proof to a person, who can check it with a reverse image search.
   */
  internetCopy: boolean;
  /** Which signs were seen (short text, empty when none). */
  internetSigns: string;
  /** Count missions: how many of the asked items the model counted in the photo (null = not asked/unsure). */
  itemCount?: number | null;
  /** Before/after missions: both photos show the same place. */
  sameScene?: boolean | null;
  /** Before/after missions: the "after" photo shows the improvement (cleaner, planted...). */
  improvementVisible?: boolean | null;
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
  /** Reverse image search (Cloud Vision Web Detection), when configured. */
  webChecked?: boolean;
  webFullMatches?: string[];
  webPages?: { url: string; title: string | null }[];
  webPartialCount?: number;
  webBestGuess?: string | null;
  webError?: string;
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
  if (a.internetCopy) return "internet_copy";
  if (a.sameScene === false) return "before_after_mismatch";
  if (!a.matchesMission || a.improvementVisible === false) return "not_matching_mission";
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
  /** Reverse image search result: "copy" = the same picture is on the internet. */
  web?: "copy" | "partial" | "none" | null;
  /** Declared weight of a recycling delivery: heavy ones always go to a person. */
  weightKg?: number | null;
  /** Count missions: number of items the person declared. */
  declaredCount?: number | null;
}): ProofDecision {
  const { settings, analysis, similar, web } = input;
  const auto = settings.mode === "auto";

  if (similar && similar.distance <= SAME_PHOTO_MAX_DISTANCE) {
    return { action: auto ? "reject" : "review", verdict: "reject", confidence: 100, reasonCode: "similar_photo" };
  }
  if (similar && similar.distance <= SIMILAR_PHOTO_MAX_DISTANCE) {
    return { action: "review", verdict: "reject", confidence: analysis?.confidence ?? 0, reasonCode: "similar_photo" };
  }
  if (settings.mode === "off") {
    return { action: "review", verdict: "review", confidence: 0, reasonCode: null };
  }
  // The same picture was found on the internet: strong evidence, but still decided by a person
  // (it may be the author's own photo published elsewhere). Inappropriate content keeps its path.
  if (web === "copy" && !analysis?.inappropriate) {
    return { action: "review", verdict: "review", confidence: analysis ? clampConfidence(analysis.confidence) : 0, reasonCode: "internet_copy" };
  }
  if (!analysis) {
    return { action: "review", verdict: "review", confidence: 0, reasonCode: null };
  }

  const confidence = clampConfidence(analysis.confidence);
  const problem = problemFromAnalysis(analysis);

  // Suspected internet copy: never decided by the AI alone, in either direction. A person checks it
  // (reverse image search) and, when rejecting, writes the explanation themselves.
  // Inappropriate content keeps its own (stricter) path.
  if (analysis.internetCopy && !analysis.inappropriate) {
    return { action: "review", verdict: "review", confidence, reasonCode: "internet_copy" };
  }

  if (analysis.verdict === "approve") {
    // An "approve" that contradicts the model's own answers is not trusted.
    if (problem) return { action: "review", verdict: "review", confidence, reasonCode: problem };
    // Count missions: far fewer items in the photo than declared is not approved automatically.
    if (countCheck(input.declaredCount, analysis.itemCount) === "low") {
      return { action: "review", verdict: "reject", confidence, reasonCode: "count_mismatch" };
    }
    // Crops/edits of the picture found online: not enough to flag, but enough to need a person.
    const canAutoApprove =
      auto &&
      web !== "partial" &&
      confidence >= settings.approveMinConfidence &&
      input.foneReward <= settings.maxAutoApproveFone &&
      !((input.weightKg ?? 0) > MAX_AUTO_APPROVE_KG);
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
  // Optional for compatibility with answers produced before the field existed.
  const internetCopy = bool("internet_copy") ?? false;
  const itemCountRaw = r.item_count;
  const itemCount = typeof itemCountRaw === "number" && Number.isFinite(itemCountRaw) && itemCountRaw >= 0 ? Math.round(itemCountRaw) : null;

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
    internetCopy,
    internetSigns: internetCopy ? str("internet_signs", 300) : "",
    itemCount,
    sameScene: bool("same_scene"),
    improvementVisible: bool("improvement_visible"),
  };
}

/** True when the automatic verification flagged the proof as a possible copy from the internet. */
export function isInternetCopyFlag(aiReasonCode: string | null | undefined): boolean {
  return aiReasonCode === "internet_copy";
}

/** Minimum length of the explanation a moderator must write to reject a flagged proof. */
export const INTERNET_COPY_MIN_EXPLANATION = 15;

/** What the moderator actually wrote: the text without any ready-made reason pasted into it. */
export function ownWords(text: string): string {
  let value = text;
  for (const code of REJECTION_CODES) {
    for (const preset of Object.values(REJECTION_REASONS[code])) value = value.split(preset).join(" ");
  }
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Validates a moderator's rejection. Proofs flagged as a possible internet copy need an explanation
 * written by the moderator (what they found, e.g. "the same photo is on site X"), not just a
 * ready-made reason: the person deserves to know why, and it keeps the decision human (LGPD art. 20).
 */
export function validateRejection(input: { flagged: boolean; text: string }): "reason_too_short" | "explanation_required" | null {
  const text = input.text.trim();
  if (input.flagged && ownWords(text).length < INTERNET_COPY_MIN_EXPLANATION) return "explanation_required";
  if (text.length < 5) return "reason_too_short";
  return null;
}

const EXPLANATION_LABEL: Record<Lang, string> = {
  pt: "Explicação da equipe",
  en: "Team explanation",
  es: "Explicación del equipo",
};

/**
 * Message shown to the user: the standard reason in their language, plus the moderator's own words
 * when they wrote something other than the ready-made text.
 */
export function composeRejectionMessage(code: string | null | undefined, text: string, lang: Lang): string {
  const standard = rejectionReasonText(code, lang);
  if (!standard) return text.trim();
  const custom = ownWords(text);
  if (!custom) return standard;
  return `${standard} ${EXPLANATION_LABEL[lang]}: ${custom}`;
}

