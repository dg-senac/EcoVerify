import "server-only";
import { and, count, eq, gt, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { eventCheckins, missions, notifications, pointsLedger, rewardQueue, submissions, userCards, users } from "@/db/schema";
import { REJECTION_REASONS, composeRejectionMessage, decideProof, isRejectionCode, type AiAnalysis, type AiChecks, type AiSettingsValues, type ProofDecision } from "@/lib/ai/decision";
import { isCardActive } from "@/lib/cards";
import { tx, type Lang } from "@/lib/i18n";
import { MAX_AUTO_APPROVE_KG } from "@/lib/impact";
import { countCheck, proofTypeOf } from "@/lib/proof";
import { approveSubmission, rejectSubmission } from "@/lib/review";
import {
  addHours,
  AI_RETRY_AFTER_MINUTES,
  EXTRA_PROOF_HOURS,
  newChallengeCode,
  planVerification,
  shouldAudit,
  trustScore,
  VERIFY_WINDOW_HOURS,
  type TrustInput,
  type VerificationPlan,
} from "@/lib/verification";
import { PARTNER_CONFIRM_HOURS } from "@/lib/partner";

type SubmissionRow = typeof submissions.$inferSelect;
type MissionRow = typeof missions.$inferSelect;

/** Track record of the author before this proof (feeds the confidence score). */
export async function historyOf(userId: string, exceptSubmissionId: string): Promise<TrustInput["history"]> {
  const [counts, cards, [author]] = await Promise.all([
    db
      .select({ status: submissions.status, n: count() })
      .from(submissions)
      .where(and(eq(submissions.userId, userId), ne(submissions.id, exceptSubmissionId)))
      .groupBy(submissions.status),
    db.select({ type: userCards.type, createdAt: userCards.createdAt, expiresAt: userCards.expiresAt, revokedAt: userCards.revokedAt, consumedAt: userCards.consumedAt }).from(userCards).where(eq(userCards.userId, userId)),
    db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, userId)).limit(1),
  ]);
  const n = (status: string) => counts.find((c) => c.status === status)?.n ?? 0;
  return {
    approved: n("approved"),
    rejected: n("rejected"),
    activeCards: cards.filter((card) => isCardActive(card)).length,
    accountAgeDays: author ? Math.floor((Date.now() - author.createdAt.getTime()) / 86_400_000) : 0,
  };
}

export function verifyDeadline(submission: Pick<SubmissionRow, "verifyBy" | "submittedAt">): Date {
  return submission.verifyBy ?? addHours(submission.submittedAt, VERIFY_WINDOW_HOURS);
}

function capExceeded(settings: AiSettingsValues, mission: MissionRow, submission: SubmissionRow) {
  // A weight from the point's scale is not an estimate: only the FONE cap applies to it.
  const heavy = submission.weightSource !== "partner" && Number(submission.weightKg ?? 0) > MAX_AUTO_APPROVE_KG;
  return Number(mission.foneReward) > settings.maxAutoApproveFone || heavy;
}

/** Event missions: presence confirmed with the organizer's QR. */
async function checkedInAt(mission: MissionRow, userId: string): Promise<boolean> {
  if (!mission.startsAt || !mission.endsAt) return false;
  const [row] = await db
    .select({ id: eventCheckins.id })
    .from(eventCheckins)
    .where(and(eq(eventCheckins.missionId, mission.id), eq(eventCheckins.userId, userId)))
    .limit(1);
  return !!row;
}

function trustInput(mission: MissionRow, submission: SubmissionRow, history: TrustInput["history"], checkedIn: boolean): Omit<TrustInput, "analysis"> {
  return {
    proofType: proofTypeOf(mission),
    declaredCount: submission.itemCount,
    location: { accuracy: submission.gpsAccuracy, simulated: false, anywhere: mission.scope === "anywhere" },
    history,
    partnerConfirmed: !!submission.partnerConfirmedAt,
    checkedIn,
  };
}

const EXTRA_TEXT = {
  title: (lang: Lang) => tx(lang, "📸 Falta uma prova extra", "📸 One extra proof needed", "📸 Falta una prueba extra"),
  message: (lang: Lang, mission: string, code: string) =>
    tx(
      lang,
      `Para concluir a verificação de "${mission}", escreva o código ${code} num papel e tire uma foto dele junto do local ou dos itens. Envie em "Meus envios" em até ${EXTRA_PROOF_HOURS} horas.`,
      `To finish checking "${mission}", write the code ${code} on a piece of paper and take a photo of it next to the place or the items. Send it in "My Submissions" within ${EXTRA_PROOF_HOURS} hours.`,
      `Para terminar la verificación de "${mission}", escribe el código ${code} en un papel y toma una foto junto al lugar o los artículos. Envíala en "Mis Envíos" en hasta ${EXTRA_PROOF_HOURS} horas.`,
    ),
};

async function notifyUser(userId: string, text: (lang: Lang) => { title: string; message: string }) {
  const [person] = await db.select({ language: users.language, enabled: users.notificationsEnabled }).from(users).where(eq(users.id, userId)).limit(1);
  if (!person?.enabled) return;
  await db.insert(notifications).values({ userId, type: "system", ...text(person.language) });
}

/** Carries out the plan. Returns what happened. */
export async function applyPlan(
  plan: VerificationPlan,
  submission: SubmissionRow,
  mission: MissionRow,
  approvedBefore: number,
): Promise<"approved" | "rejected" | "review" | "extra_proof" | "waiting"> {
  switch (plan.action) {
    case "approve": {
      const ok = await approveSubmission(submission.id, { kind: "ai" });
      if (!ok) return "review";
      if (shouldAudit({ approvedBefore, forced: plan.forceAudit, random: Math.random() })) {
        await db.update(submissions).set({ auditStatus: "pending" }).where(eq(submissions.id, submission.id));
      }
      return "approved";
    }
    case "reject": {
      const ok = await rejectSubmission(submission.id, { kind: "ai" }, { code: plan.reasonCode, text: REJECTION_REASONS[plan.reasonCode].pt });
      return ok ? "rejected" : "review";
    }
    case "extra_proof": {
      const code = newChallengeCode();
      const updated = await db
        .update(submissions)
        .set({ extraProofStatus: "requested", extraProofCode: code, extraProofDueAt: addHours(new Date(), EXTRA_PROOF_HOURS) })
        .where(and(eq(submissions.id, submission.id), eq(submissions.status, "pending"), isNull(submissions.extraProofStatus)))
        .returning({ id: submissions.id });
      if (updated.length === 0) return "review";
      await notifyUser(submission.userId, (lang) => ({ title: EXTRA_TEXT.title(lang), message: EXTRA_TEXT.message(lang, mission.title, code) }));
      return "extra_proof";
    }
    case "wait":
      return "waiting";
    default:
      return "review";
  }
}

/**
 * Called by runProofVerification after the first analysis: computes the score, stores it and
 * applies the plan.
 */
export async function planAfterAnalysis(input: {
  submission: SubmissionRow;
  mission: MissionRow;
  settings: AiSettingsValues;
  analysis: AiAnalysis | null;
  decision: ProofDecision;
  aiExpected: boolean;
  web: "copy" | "partial" | "none" | null;
  similar: { distance: number } | null;
}) {
  const { mission, settings } = input;
  // Fresh copy: the collection point may have confirmed the delivery while the AI was looking.
  const [fresh] = await db.select().from(submissions).where(eq(submissions.id, input.submission.id)).limit(1);
  const submission = fresh ?? input.submission;
  const [history, checkedIn] = await Promise.all([historyOf(submission.userId, submission.id), checkedInAt(mission, submission.userId)]);
  const trust = trustScore({ ...trustInput(mission, submission, history, checkedIn), analysis: input.analysis, web: input.web, similar: input.similar });
  const isPartner = proofTypeOf(mission) === "partner";
  const windowClosed = Date.now() >= verifyDeadline(submission).getTime();
  const plan = planVerification({
    mode: settings.mode,
    decision: input.decision,
    analyzed: !!input.analysis,
    aiExpected: input.aiExpected,
    score: trust.score,
    extraProofAsked: !!submission.extraProofStatus,
    windowClosed,
    capExceeded: capExceeded(settings, mission, submission),
    awaitingPartner: isPartner && !submission.partnerConfirmedAt,
    partnerConfirmed: isPartner && !!submission.partnerConfirmedAt,
  });
  await db
    .update(submissions)
    .set({
      trustScore: trust.score,
      aiChecks: sql`coalesce(${submissions.aiChecks}, '{}'::jsonb) || ${JSON.stringify({ trustFactors: trust.factors })}::jsonb`,
      // "review": nothing else happens automatically, so the window closes now and a person decides.
      verifyBy: plan.action === "review" ? new Date() : verifyDeadline(submission),
    })
    .where(eq(submissions.id, submission.id));
  return applyPlan(plan, submission, mission, history.approved);
}

/**
 * Second step: the AI analysed the extra photo (original photo + extra photo with the code).
 */
export async function planAfterExtraProof(input: {
  submission: SubmissionRow;
  mission: MissionRow;
  settings: AiSettingsValues;
  extra: AiAnalysis | null;
  verdict: "ok" | "failed" | null;
}) {
  const { submission, mission, settings, extra, verdict } = input;
  const checks = (submission.aiChecks as AiChecks | null) ?? {};
  if (!extra || !verdict) {
    // The AI could not look at the extra photo: retried inside the window, then a person decides.
    if (Date.now() < verifyDeadline(submission).getTime()) return "waiting" as const;
    await db.update(submissions).set({ extraProofStatus: "failed" }).where(eq(submissions.id, submission.id));
    return "review" as const;
  }

  const [history, checkedIn] = await Promise.all([historyOf(submission.userId, submission.id), checkedInAt(mission, submission.userId)]);
  // The original analysis, with the count of the extra photo when it is better.
  const original = (checks.verdict ? (checks as AiAnalysis) : null) as AiAnalysis | null;
  const extraCountOk = proofTypeOf(mission) === "count" && countCheck(submission.itemCount, extra.itemCount) === "ok";
  const analysis = original ? { ...original, itemCount: extraCountOk ? extra.itemCount : original.itemCount } : null;
  const trust = trustScore({ ...trustInput(mission, submission, history, checkedIn), analysis, extraProofOk: verdict === "ok" });

  let plan: VerificationPlan;
  if (verdict === "failed") {
    // A clear problem in the extra photo (screen, edited, inappropriate...) is rejected like a first photo.
    const extraDecision = decideProof({ settings, analysis: extra, similar: null, foneReward: Number(mission.foneReward) });
    plan = extraDecision.action === "reject" && extraDecision.reasonCode ? { action: "reject", reasonCode: extraDecision.reasonCode } : { action: "review" };
  } else {
    // The first decision, with the count mismatch cleared when the extra photo shows all the items.
    const reasonCode = submission.aiReasonCode === "count_mismatch" && extraCountOk ? null : submission.aiReasonCode;
    const decision: ProofDecision = {
      action: "review",
      verdict: reasonCode ? (submission.aiVerdict ?? "review") : submission.aiVerdict === "reject" && !extraCountOk ? "reject" : "approve",
      confidence: submission.aiConfidence ?? 0,
      reasonCode: reasonCode as ProofDecision["reasonCode"],
    };
    plan = planVerification({
      mode: settings.mode,
      decision,
      analyzed: true,
      aiExpected: true,
      score: trust.score,
      extraProofAsked: true,
      windowClosed: false,
      capExceeded: capExceeded(settings, mission, submission),
      extraProofOk: true,
    });
  }

  await db
    .update(submissions)
    .set({
      extraProofStatus: verdict,
      trustScore: trust.score,
      aiChecks: { ...checks, trustFactors: trust.factors, extra },
      verifyBy: plan.action === "review" ? new Date() : submission.verifyBy,
    })
    .where(eq(submissions.id, submission.id));
  return applyPlan(plan, submission, mission, history.approved);
}

/**
 * The collection point confirmed the delivery (src/lib/actions/points.ts). If the AI already looked
 * at the photo, the plan is made now; otherwise the pipeline makes it when the analysis arrives.
 */
export async function planAfterPartner(submissionId: string) {
  const [row] = await db
    .select({ submission: submissions, mission: missions })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (!row || row.submission.status !== "pending" || !row.submission.partnerConfirmedAt) return "skipped" as const;
  const { submission, mission } = row;
  if (submission.aiStatus === "queued") return "waiting" as const;
  const { getAiSettings, willAnalyzeWithModel } = await import("@/lib/ai/pipeline");
  const settings = await getAiSettings();
  const checks = (submission.aiChecks as AiChecks | null) ?? {};
  const analysis = checks.verdict ? (checks as AiAnalysis) : null;
  const reasonCode = submission.aiReasonCode as ProofDecision["reasonCode"];
  const decision: ProofDecision = {
    action: submission.aiVerdict === "approve" && !reasonCode ? "approve" : "review",
    verdict: submission.aiVerdict ?? "review",
    confidence: submission.aiConfidence ?? 0,
    reasonCode,
  };
  return planAfterAnalysis({
    submission,
    mission,
    settings,
    analysis,
    decision,
    // A failed analysis is retried by the sweep; without a model there is nothing to wait for.
    aiExpected: submission.aiStatus === "failed" && willAnalyzeWithModel(settings),
    web: null,
    similar: checks.similarSubmissionId && checks.similarDistance != null ? { distance: checks.similarDistance } : null,
  });
}

/* ------------------------------------------------------------------ */
/* Sweep: deadlines and retries                                        */
/* ------------------------------------------------------------------ */

let lastSweep = 0;

/**
 * Closes expired extra proofs and retries the AI on proofs still inside their window.
 * Runs from /api/cron/verify (external scheduler) and, at most every 2 minutes, when the
 * moderation or submissions pages are opened.
 */
export async function sweepVerifications(options: { force?: boolean; limit?: number } = {}) {
  if (!options.force && Date.now() - lastSweep < 120_000) return { skipped: true as const };
  lastSweep = Date.now();
  const now = new Date();
  const result = { expired: 0, retried: 0, closed: 0 };

  // 1. Extra proof not sent in time: rejected (the person can send a new proof).
  const expired = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(and(eq(submissions.status, "pending"), eq(submissions.extraProofStatus, "requested"), lt(submissions.extraProofDueAt, now)))
    .limit(50);
  for (const { id } of expired) {
    const ok = await rejectSubmission(id, { kind: "ai" }, { code: "extra_proof_missing", text: REJECTION_REASONS.extra_proof_missing.pt });
    if (ok) {
      await db.update(submissions).set({ extraProofStatus: "expired" }).where(eq(submissions.id, id));
      result.expired++;
    }
  }

  // 1b. Delivery never confirmed by the collection point: refused (the person can deliver again).
  const unconfirmed = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.status, "pending"),
        isNotNull(submissions.deliveryCode),
        isNull(submissions.partnerConfirmedAt),
        isNull(submissions.appealedAt),
        lt(submissions.submittedAt, new Date(now.getTime() - PARTNER_CONFIRM_HOURS * 3_600_000)),
      ),
    )
    .limit(50);
  for (const { id } of unconfirmed) {
    const ok = await rejectSubmission(id, { kind: "ai" }, { code: "partner_missing", text: REJECTION_REASONS.partner_missing.pt });
    if (ok) await db.update(submissions).set({ verifyBy: null }).where(eq(submissions.id, id));
    if (ok) result.expired++;
  }

  // 2. AI not available earlier: try again (inside the window) or close the window (fallback).
  const retryBefore = new Date(now.getTime() - AI_RETRY_AFTER_MINUTES * 60_000);
  const waiting = await db
    .select({ id: submissions.id, verifyBy: submissions.verifyBy })
    .from(submissions)
    .where(
      and(
        eq(submissions.status, "pending"),
        isNull(submissions.appealedAt),
        isNotNull(submissions.verifyBy),
        or(
          and(
            inArray(submissions.aiStatus, ["queued", "failed"]),
            isNull(submissions.extraProofStatus),
            lt(submissions.submittedAt, retryBefore),
            or(isNull(submissions.aiAnalyzedAt), lt(submissions.aiAnalyzedAt, retryBefore)),
          ),
          // Extra photo sent at least AI_RETRY_AFTER_MINUTES ago (its window is sent + VERIFY_WINDOW_HOURS).
          and(eq(submissions.extraProofStatus, "sent"), lt(submissions.verifyBy, addHours(retryBefore, VERIFY_WINDOW_HOURS))),
        ),
        gt(submissions.verifyBy, new Date(now.getTime() - 7 * 86_400_000)),
      ),
    )
    .limit(options.limit ?? 5);
  // Loaded lazily: the pipeline imports this module.
  const { runProofVerification } = await import("@/lib/ai/pipeline");
  for (const row of waiting) {
    const closing = row.verifyBy && row.verifyBy <= now;
    await runProofVerification(row.id).catch((error) => console.error("[verify] retry failed:", error));
    if (closing) {
      // The window is over: whatever happened, nothing else runs automatically for this proof.
      await db
        .update(submissions)
        .set({ verifyBy: null, aiStatus: sql`case when ${submissions.aiStatus} = 'queued' then 'failed'::ai_status else ${submissions.aiStatus} end` })
        .where(and(eq(submissions.id, row.id), eq(submissions.status, "pending")));
      result.closed++;
    } else result.retried++;
  }
  // Irregular dumping reports nobody confirmed in time.
  const { expireDumpReports } = await import("@/lib/dumps-server");
  const dumpsExpired = await expireDumpReports(now).catch((error) => {
    console.error("[verify] dump expiry failed:", error);
    return 0;
  });
  return { ...result, dumpsExpired };
}

/** SQL condition: the proof is still being handled automatically (not for the moderators yet). */
export function inAutomaticVerification() {
  const now = new Date();
  const condition = or(
    eq(submissions.extraProofStatus, "requested"),
    // Waiting for the collection point (unless the AI already sent it to a person: verifyBy = now).
    and(isNotNull(submissions.deliveryCode), isNull(submissions.partnerConfirmedAt), isNull(submissions.appealedAt), gt(submissions.verifyBy, now)),
    and(isNull(submissions.appealedAt), gt(submissions.verifyBy, now), or(inArray(submissions.aiStatus, ["queued", "failed"]), eq(submissions.extraProofStatus, "sent"))),
  );
  // NULL columns must count as "not in verification" (NOT NULL would hide the row from both lists).
  return sql<boolean>`coalesce((${condition}), false)`;
}

/* ------------------------------------------------------------------ */
/* Sample audit                                                        */
/* ------------------------------------------------------------------ */

export async function confirmAudit(submissionId: string, auditorId: string): Promise<boolean> {
  const updated = await db
    .update(submissions)
    .set({ auditStatus: "ok", auditedBy: auditorId, auditedAt: new Date() })
    .where(and(eq(submissions.id, submissionId), eq(submissions.auditStatus, "pending")))
    .returning({ id: submissions.id });
  return updated.length > 0;
}

/**
 * The audit found a problem in an automatic approval: the proof becomes rejected, the points are
 * taken back and an unpaid FONE payment is cancelled. Returns false when it was already audited.
 */
export async function revokeApproval(submissionId: string, auditorId: string, reason: { code: string | null; text: string }): Promise<{ paidFone: boolean } | null> {
  const result = await db.transaction(async (t) => {
    const [row] = await t
      .select({ submission: submissions, title: missions.title })
      .from(submissions)
      .innerJoin(missions, eq(missions.id, submissions.missionId))
      .where(and(eq(submissions.id, submissionId), eq(submissions.status, "approved"), eq(submissions.auditStatus, "pending")))
      .for("update");
    if (!row) return null;
    const { submission } = row;
    await t
      .update(submissions)
      .set({
        status: "rejected",
        auditStatus: "revoked",
        auditedBy: auditorId,
        auditedAt: new Date(),
        reviewedBy: auditorId,
        decidedBy: "human",
        reviewedAt: new Date(),
        rejectionReason: reason.text || (isRejectionCode(reason.code) ? REJECTION_REASONS[reason.code].pt : ""),
        rejectionCode: isRejectionCode(reason.code) ? reason.code : null,
      })
      .where(eq(submissions.id, submissionId));
    const ledger = await t.delete(pointsLedger).where(eq(pointsLedger.submissionId, submissionId)).returning({ points: pointsLedger.points });
    const points = ledger.reduce((sum, l) => sum + l.points, 0);
    if (points > 0) {
      await t.update(users).set({ totalPoints: sql`greatest(0, ${users.totalPoints} - ${points})` }).where(eq(users.id, submission.userId));
    }
    // Unpaid FONE is cancelled; an already paid one is only reported to the team.
    await t.delete(rewardQueue).where(and(eq(rewardQueue.submissionId, submissionId), inArray(rewardQueue.status, ["pending", "failed"])));
    const [paid] = await t
      .select({ id: rewardQueue.id })
      .from(rewardQueue)
      .where(and(eq(rewardQueue.submissionId, submissionId), inArray(rewardQueue.status, ["processing", "paid"])))
      .limit(1);
    return { userId: submission.userId, title: row.title, points, paidFone: !!paid };
  });
  if (!result) return null;
  // Catalogued reason in the person's language plus the auditor's own words.
  const why = (lang: Lang) => composeRejectionMessage(isRejectionCode(reason.code) ? reason.code : null, reason.text, lang).replace(/[.!\s]+$/, "") + ".";
  await notifyUser(result.userId, (lang) => ({
    title: tx(lang, "Comprovação revista pela auditoria", "Proof reviewed by the audit", "Comprobación revisada por la auditoría"),
    message: tx(
      lang,
      `A auditoria por amostragem revisou sua comprovação para "${result.title}" e não pôde mantê-la. Motivo: ${why(lang)} Os ${result.points} pontos foram retirados.`,
      `The sample audit reviewed your proof for "${result.title}" and could not keep it. Reason: ${why(lang)} The ${result.points} points were removed.`,
      `La auditoría por muestreo revisó tu comprobación para "${result.title}" y no pudo mantenerla. Motivo: ${why(lang)} Se retiraron los ${result.points} puntos.`,
    ),
  }));
  return { paidFone: result.paidFone };
}

/** Kept for the moderation page: approved proofs waiting for the sample audit. */
export function auditQueueCondition() {
  return and(eq(submissions.status, "approved"), eq(submissions.auditStatus, "pending"));
}
