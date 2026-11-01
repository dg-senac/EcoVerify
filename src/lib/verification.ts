/**
 * Automatic verification over a time window (part 2 of the verification redesign).
 *
 * Pure code shared by the web app (src/lib/ai/pipeline.ts) and the APK (demo/src/store.ts).
 *
 * 1. Every proof gets a CONFIDENCE SCORE (0-100) from independent signals: what the AI saw,
 *    the GPS reading, the person's history and the extra evidence of the mission type.
 * 2. planVerification() turns the AI decision + score into the next step:
 *      approve → done (some approvals are picked for a SAMPLE AUDIT afterwards);
 *      extra_proof → the person is automatically asked for one more photo with a handwritten code;
 *      wait → the AI was not available: try again later, inside the VERIFICATION WINDOW;
 *      reject → clear problem (same rules as before);
 *      review → a moderator decides: the last resort.
 * 3. The window closes after VERIFY_WINDOW_HOURS: a proof the AI never managed to analyse is approved
 *    for trusted people (always audited) or goes to a moderator. An extra proof not sent in time
 *    rejects the proof (the person can send a new one).
 */
import { tx, type Lang } from "@/lib/i18n";
import type { AiAnalysis, ProofDecision, RejectionCode } from "@/lib/ai/decision";
import { problemFromAnalysis } from "@/lib/ai/decision";
import { countCheck, type ProofType } from "@/lib/proof";

/** Score needed to approve without anybody. */
export const TRUST_APPROVE_MIN = 75;
/** Without any AI analysis (quota, outage), only people this trusted are approved when the window closes. */
export const TRUST_FALLBACK_MIN = 40;
/** How long the automatic verification keeps trying before the fallback. */
export const VERIFY_WINDOW_HOURS = 24;
/** How long the person has to send the extra proof. */
export const EXTRA_PROOF_HOURS = 24;
/** First retry of an unavailable AI only after this (the free quota resets, outages pass). */
export const AI_RETRY_AFTER_MINUTES = 10;
/** Share of automatic approvals checked afterwards by a person. */
export const AUDIT_RATE = 0.05;
/** New people (few approved proofs) are audited more often. */
export const AUDIT_RATE_NEW = 0.25;
export const NEW_ACCOUNT_APPROVED = 3;
/** Points the extra proof adds when the AI confirms it. */
export const EXTRA_PROOF_BONUS = 15;

/* ------------------------------------------------------------------ */
/* Confidence score                                                    */
/* ------------------------------------------------------------------ */

export type TrustFactorKey =
  | "ai_approve"
  | "ai_review"
  | "ai_missing"
  | "ai_problem"
  | "gps_precise"
  | "gps_ok"
  | "gps_mission_point"
  | "gps_anywhere"
  | "history"
  | "history_new"
  | "evidence_count"
  | "evidence_count_unknown"
  | "evidence_before_after"
  | "evidence_photo"
  | "extra_proof"
  | "web_partial"
  | "similar_photo"
  | "count_low";

export type TrustFactor = { key: TrustFactorKey; points: number };

export type TrustInput = {
  analysis: AiAnalysis | null;
  proofType: ProofType;
  declaredCount?: number | null;
  location: {
    /** GPS accuracy in metres (null = unknown). */
    accuracy: number | null;
    /** The person used the mission point instead of a GPS reading (APK button). */
    simulated: boolean;
    anywhere: boolean;
  };
  history: {
    /** Approved proofs before this one. */
    approved: number;
    rejected: number;
    activeCards: number;
    accountAgeDays: number;
  };
  web?: "copy" | "partial" | "none" | null;
  similar?: { distance: number } | null;
  extraProofOk?: boolean;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function historyPoints(h: TrustInput["history"]): number {
  return clamp(5 + Math.min(12, h.approved * 2) + (h.accountAgeDays >= 30 ? 3 : 0) - h.rejected * 4 - h.activeCards * 8, 0, 20);
}

export function trustScore(input: TrustInput): { score: number; factors: TrustFactor[] } {
  const factors: TrustFactor[] = [];
  const add = (key: TrustFactorKey, points: number) => factors.push({ key, points: Math.round(points) });
  const a = input.analysis;

  // What the AI saw (up to 50).
  if (!a) add("ai_missing", 0);
  else if (problemFromAnalysis(a) || a.verdict === "reject") add("ai_problem", 0);
  else if (a.verdict === "approve") add("ai_approve", clamp(a.confidence, 0, 100) * 0.5);
  else add("ai_review", 20);

  // Where the photo was taken (up to 20).
  const { accuracy, simulated, anywhere } = input.location;
  if (simulated) add("gps_mission_point", 10);
  else if (anywhere) add("gps_anywhere", 15);
  else if (accuracy !== null && accuracy <= 30) add("gps_precise", 20);
  else add("gps_ok", 15);

  // Who sent it (up to 20).
  add(input.history.approved < NEW_ACCOUNT_APPROVED ? "history_new" : "history", historyPoints(input.history));

  // Evidence of the mission type (up to 10).
  if (input.proofType === "count") {
    const check = a ? countCheck(input.declaredCount, a.itemCount) : "unknown";
    if (check === "ok") add("evidence_count", 10);
    else if (check === "low") add("count_low", -30);
    else add("evidence_count_unknown", 3);
  } else if (input.proofType === "before_after") {
    add("evidence_before_after", a && a.sameScene !== false && a.improvementVisible !== false ? 10 : 0);
  } else add("evidence_photo", 5);

  if (input.extraProofOk) add("extra_proof", EXTRA_PROOF_BONUS);
  if (input.web === "partial") add("web_partial", -15);
  if (input.similar) add("similar_photo", -25);

  return { score: clamp(factors.reduce((sum, f) => sum + f.points, 0), 0, 100), factors };
}

const FACTOR_TEXT: Record<TrustFactorKey, [string, string, string]> = {
  ai_approve: ["A IA confirmou a foto", "The AI confirmed the photo", "La IA confirmó la foto"],
  ai_review: ["A IA ficou em dúvida", "The AI was unsure", "La IA tuvo dudas"],
  ai_missing: ["Sem análise da IA", "No AI analysis", "Sin análisis de la IA"],
  ai_problem: ["A IA viu um problema", "The AI saw a problem", "La IA vio un problema"],
  gps_precise: ["GPS preciso no local", "Precise GPS on site", "GPS preciso en el lugar"],
  gps_ok: ["GPS no local", "GPS on site", "GPS en el lugar"],
  gps_mission_point: ["Usou o ponto da missão (sem GPS)", "Used the mission point (no GPS)", "Usó el punto de la misión (sin GPS)"],
  gps_anywhere: ["Missão em qualquer lugar", "Anywhere mission", "Misión en cualquier lugar"],
  history: ["Histórico da pessoa", "Person's history", "Historial de la persona"],
  history_new: ["Conta nova (pouco histórico)", "New account (little history)", "Cuenta nueva (poco historial)"],
  evidence_count: ["A contagem confere", "The count matches", "El conteo coincide"],
  evidence_count_unknown: ["A IA não contou os itens", "The AI did not count the items", "La IA no contó los artículos"],
  evidence_before_after: ["Antes e depois do mesmo lugar", "Before and after of the same place", "Antes y después del mismo lugar"],
  evidence_photo: ["Foto da ação", "Photo of the action", "Foto de la acción"],
  extra_proof: ["Prova extra confirmada", "Extra proof confirmed", "Prueba extra confirmada"],
  web_partial: ["Imagem parecida na internet", "Similar image online", "Imagen parecida en internet"],
  similar_photo: ["Parecida com outra foto enviada", "Similar to another photo sent", "Parecida a otra foto enviada"],
  count_low: ["Menos itens do que o informado", "Fewer items than declared", "Menos artículos de lo informado"],
};

export function trustFactorLabel(key: TrustFactorKey, lang: Lang): string {
  const [pt, en, es] = FACTOR_TEXT[key];
  return tx(lang, pt, en, es);
}

export function trustBand(score: number): "high" | "medium" | "low" {
  return score >= TRUST_APPROVE_MIN ? "high" : score >= 50 ? "medium" : "low";
}

/* ------------------------------------------------------------------ */
/* Next step                                                           */
/* ------------------------------------------------------------------ */

export type VerificationPlan =
  | { action: "approve"; forceAudit: boolean }
  | { action: "reject"; reasonCode: RejectionCode }
  | { action: "extra_proof" }
  | { action: "wait" }
  | { action: "review" };

/** Reasons that always go to a person (never handled by an extra proof). */
const PERSON_ONLY: ReadonlySet<RejectionCode | null> = new Set(["internet_copy", "similar_photo", "inappropriate"]);

export function planVerification(input: {
  mode: "off" | "suggest" | "auto";
  decision: ProofDecision;
  /** The AI analysed this proof (or the extra proof). */
  analyzed: boolean;
  /** A model is configured, so waiting makes sense. */
  aiExpected: boolean;
  score: number;
  /** The extra proof was already asked for (it is only asked once). */
  extraProofAsked: boolean;
  /** The verification window is over. */
  windowClosed: boolean;
  /** FONE above the auto-approval cap or a very heavy delivery: always a person. */
  capExceeded: boolean;
  /** This evaluation comes after the AI confirmed the extra proof. */
  extraProofOk?: boolean;
}): VerificationPlan {
  const { decision } = input;
  if (input.mode !== "auto") return { action: "review" };
  if (decision.action === "reject" && decision.reasonCode) return { action: "reject", reasonCode: decision.reasonCode };
  if (PERSON_ONLY.has(decision.reasonCode)) return { action: "review" };

  if (!input.analyzed) {
    if (input.aiExpected && !input.windowClosed) return { action: "wait" };
    // Window over (or no model configured) without any analysis: trusted people are approved
    // (always audited), the others go to a person.
    return input.score >= TRUST_FALLBACK_MIN && !input.capExceeded ? { action: "approve", forceAudit: true } : { action: "review" };
  }

  const aiAgrees = decision.verdict === "approve" && !decision.reasonCode;
  if (input.extraProofOk) return aiAgrees && input.score >= TRUST_APPROVE_MIN && !input.capExceeded ? { action: "approve", forceAudit: false } : { action: "review" };
  if (decision.action === "approve" && input.score >= TRUST_APPROVE_MIN) return { action: "approve", forceAudit: false };
  // Big rewards / heavy deliveries are always decided by a person: no point asking for more photos.
  if (input.capExceeded) return { action: "review" };
  if (!input.extraProofAsked) return { action: "extra_proof" };
  return { action: "review" };
}

/** Random sample audit of an automatic approval. `random` in [0, 1). */
export function shouldAudit(input: { approvedBefore: number; forced: boolean; random: number }): boolean {
  if (input.forced) return true;
  return input.random < (input.approvedBefore < NEW_ACCOUNT_APPROVED ? AUDIT_RATE_NEW : AUDIT_RATE);
}

/* ------------------------------------------------------------------ */
/* Extra proof                                                         */
/* ------------------------------------------------------------------ */

/** 4 digits, easy to write by hand. Never starts with 0 (people drop it). */
export function newChallengeCode(random: () => number = Math.random): string {
  let code = String(1 + Math.floor(random() * 9));
  for (let i = 0; i < 3; i++) code += String(Math.floor(random() * 10));
  return code;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

/** How the AI judged the extra photo: "ok" (code visible, same place, no problem) or "failed". */
export function extraProofVerdict(analysis: AiAnalysis): "ok" | "failed" {
  if (analysis.codeVisible !== true) return "failed";
  if (analysis.sameScene === false) return "failed";
  if (analysis.inappropriate || analysis.screenOrPrint || analysis.aiGeneratedOrEdited || !analysis.isRealPhoto || analysis.internetCopy) return "failed";
  return "ok";
}

export type ExtraProofStatus = "requested" | "sent" | "ok" | "failed" | "expired";

/** What the person sees about a pending proof. */
export type PendingStage = "analyzing" | "extra_proof" | "extra_sent" | "team";

export function pendingStage(s: {
  aiStatus?: string | null;
  extraProofStatus?: string | null;
  appealedAt?: unknown;
  /** End of the verification window; when given, a closed window means the team is looking at it. */
  verifyBy?: Date | string | null;
}, now: Date = new Date()): PendingStage {
  if (s.appealedAt) return "team";
  if (s.extraProofStatus === "requested") return "extra_proof";
  if (s.extraProofStatus === "sent") return "extra_sent";
  const windowOpen = s.verifyBy === undefined || (s.verifyBy !== null && new Date(s.verifyBy) > now);
  if ((s.aiStatus === "queued" || s.aiStatus === "failed") && windowOpen) return "analyzing";
  return "team";
}
