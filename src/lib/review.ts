import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, notifications, pointsLedger, rewardQueue, submissions, users } from "@/db/schema";
import { composeRejectionMessage, rejectionReasonText, type RejectionCode } from "@/lib/ai/decision";
import type { Lang } from "@/lib/i18n";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { holdReasonForNewReward } from "@/lib/payouts";
import type { HoldReason } from "@/lib/payout-rules";

/**
 * Approving / rejecting a proof. Used by moderators (actions/moderation.ts) and by the automatic
 * verification (lib/ai/pipeline.ts), so both follow exactly the same rules:
 * everything happens in one transaction and only while the proof is still pending, so a double
 * click, two moderators or the AI and a moderator at the same time can never pay twice.
 */

export type Reviewer = { kind: "human"; userId: string } | { kind: "ai" };

const AI_TEXT: Record<
  Lang,
  {
    approvedTitle: string;
    approved: (m: string, p: number, f: string | null) => string;
    approvedByTeam: (m: string, p: number, f: string | null) => string;
    rejectedTitle: string;
    rejected: (m: string, r: string) => string;
    rejectedByTeamTitle: string;
    rejectedByTeam: (m: string, r: string) => string;
  }
> = {
  pt: {
    approvedTitle: "Comprovação aprovada! 🎉",
    approved: (m, p, f) =>
      `Sua comprovação para "${m}" foi aprovada pela verificação automática. Você ganhou ${p} pontos${f ? ` e ${f} FONE entrou na fila de pagamento` : ""}.`,
    approvedByTeam: (m, p, f) => `Sua comprovação para "${m}" foi aprovada. Você ganhou ${p} pontos${f ? ` e ${f} FONE entrou na fila de pagamento` : ""}.`,
    rejectedTitle: "Comprovação rejeitada pela verificação automática",
    rejectedByTeamTitle: "Comprovação rejeitada",
    rejectedByTeam: (m, r) => `Sua comprovação para "${m}" foi rejeitada. Motivo: ${r}. Você pode enviar uma nova comprovação para esta missão.`,
    rejected: (m, r) =>
      `Sua comprovação para "${m}" foi rejeitada. Motivo: ${r} Se achar que houve engano, abra "Minhas Submissões" e toque em "Contestar" para um moderador revisar. Você também pode enviar uma nova comprovação.`,
  },
  en: {
    approvedTitle: "Proof approved! 🎉",
    approved: (m, p, f) =>
      `Your proof for "${m}" was approved by the automatic verification. You earned ${p} points${f ? ` and ${f} FONE was added to the payment queue` : ""}.`,
    approvedByTeam: (m, p, f) => `Your proof for "${m}" was approved. You earned ${p} points${f ? ` and ${f} FONE was added to the payment queue` : ""}.`,
    rejectedTitle: "Proof rejected by the automatic verification",
    rejectedByTeamTitle: "Proof rejected",
    rejectedByTeam: (m, r) => `Your proof for "${m}" was rejected. Reason: ${r}. You can send a new proof for this mission.`,
    rejected: (m, r) =>
      `Your proof for "${m}" was rejected. Reason: ${r} If you think this is a mistake, open "My Submissions" and tap "Appeal" so a moderator reviews it. You can also send a new proof.`,
  },
  es: {
    approvedTitle: "¡Comprobación aprobada! 🎉",
    approved: (m, p, f) =>
      `Tu comprobación para "${m}" fue aprobada por la verificación automática. Ganaste ${p} puntos${f ? ` y ${f} FONE entró en la cola de pago` : ""}.`,
    approvedByTeam: (m, p, f) => `Tu comprobación para "${m}" fue aprobada. Ganaste ${p} puntos${f ? ` y ${f} FONE entró en la cola de pago` : ""}.`,
    rejectedTitle: "Comprobación rechazada por la verificación automática",
    rejectedByTeamTitle: "Comprobación rechazada",
    rejectedByTeam: (m, r) => `Tu comprobación para "${m}" fue rechazada. Motivo: ${r}. Puedes enviar una nueva comprobación para esta misión.`,
    rejected: (m, r) =>
      `Tu comprobación para "${m}" fue rechazada. Motivo: ${r} Si crees que es un error, abre "Mis Envíos" y toca "Apelar" para que un moderador la revise. También puedes enviar una nueva comprobación.`,
  },
};

/** Sent when the FONE of an approved proof is kept by a budget/cap (points are always credited). */
const HOLD_TEXT: Record<Lang, { title: string; message: (f: string, reason: HoldReason) => string }> = {
  pt: {
    title: "Seu FONE ficou em espera",
    message: (f, r) =>
      `Os pontos já foram creditados, mas ${f} FONE ficou em espera porque ${
        r === "user_cap" ? "você atingiu o limite mensal de FONE por pessoa" : r === "sponsor_budget" ? "o orçamento do patrocinador desta missão acabou" : "o orçamento de FONE deste mês foi atingido"
      }. A equipe libera o pagamento quando houver orçamento — nada é perdido.`,
  },
  en: {
    title: "Your FONE is on hold",
    message: (f, r) =>
      `Your points were credited, but ${f} FONE is on hold because ${
        r === "user_cap" ? "you reached the monthly FONE limit per person" : r === "sponsor_budget" ? "this mission's sponsor budget ran out" : "this month's FONE budget was reached"
      }. The team releases the payment when there is budget — nothing is lost.`,
  },
  es: {
    title: "Tu FONE quedó en espera",
    message: (f, r) =>
      `Los puntos ya fueron acreditados, pero ${f} FONE quedó en espera porque ${
        r === "user_cap" ? "alcanzaste el límite mensual de FONE por persona" : r === "sponsor_budget" ? "se acabó el presupuesto del patrocinador de esta misión" : "se alcanzó el presupuesto de FONE de este mes"
      }. El equipo libera el pago cuando haya presupuesto — no se pierde nada.`,
  },
};

/** Returns false when the proof was no longer pending (someone else decided first). */
export async function approveSubmission(submissionId: string, reviewer: Reviewer): Promise<boolean> {
  const [row] = await db
    .select({ submission: submissions, mission: missions })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (!row || row.submission.status !== "pending") return false;
  const { submission, mission } = row;

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(submissions)
      .set({
        status: "approved",
        reviewedBy: reviewer.kind === "human" ? reviewer.userId : null,
        decidedBy: reviewer.kind,
        reviewedAt: new Date(),
        rejectionReason: null,
        rejectionCode: null,
      })
      .where(and(eq(submissions.id, submissionId), eq(submissions.status, "pending")))
      .returning({ id: submissions.id });
    if (updated.length === 0) return false;

    await tx.insert(pointsLedger).values({ userId: submission.userId, submissionId, points: mission.pointsReward });
    await tx
      .update(users)
      .set({ totalPoints: sql`${users.totalPoints} + ${mission.pointsReward}` })
      .where(eq(users.id, submission.userId));
    // Missions worth 0 FONE (points only) don't create an empty payment; nothing is queued while payments are off.
    let holdReason: HoldReason | null = null;
    const paysFone = PAYMENTS_ENABLED && Number(mission.foneReward) > 0;
    if (paysFone) {
      holdReason = await holdReasonForNewReward(tx, {
        userId: submission.userId,
        amount: mission.foneReward,
        sponsorId: mission.sponsorId,
      });
      await tx.insert(rewardQueue).values({
        userId: submission.userId,
        submissionId,
        foneAmount: mission.foneReward,
        status: "pending",
        holdReason,
        sponsorId: mission.sponsorId,
      });
    }

    const [submitter] = await tx
      .select({ notificationsEnabled: users.notificationsEnabled, language: users.language })
      .from(users)
      .where(eq(users.id, submission.userId))
      .limit(1);
    if (submitter?.notificationsEnabled) {
      const text = AI_TEXT[submitter.language];
      await tx.insert(notifications).values({
        userId: submission.userId,
        type: "system",
        title: text.approvedTitle,
        message: (reviewer.kind === "ai" ? text.approved : text.approvedByTeam)(mission.title, mission.pointsReward, paysFone && !holdReason ? mission.foneReward : null),
      });
      if (holdReason) {
        const hold = HOLD_TEXT[submitter.language];
        await tx.insert(notifications).values({
          userId: submission.userId,
          type: "system",
          title: hold.title,
          message: hold.message(mission.foneReward, holdReason),
        });
      }
    }
    return true;
  });
}

/** Returns false when the proof was no longer pending. */
export async function rejectSubmission(
  submissionId: string,
  reviewer: Reviewer,
  reason: { code: RejectionCode | null; text: string },
): Promise<boolean> {
  const [row] = await db
    .select({ submission: submissions, missionTitle: missions.title })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (!row || row.submission.status !== "pending") return false;
  const { submission, missionTitle } = row;

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(submissions)
      .set({
        status: "rejected",
        reviewedBy: reviewer.kind === "human" ? reviewer.userId : null,
        decidedBy: reviewer.kind,
        reviewedAt: new Date(),
        rejectionReason: reason.text,
        rejectionCode: reason.code,
      })
      .where(and(eq(submissions.id, submissionId), eq(submissions.status, "pending")))
      .returning({ id: submissions.id });
    if (updated.length === 0) return false;

    const [submitter] = await tx
      .select({ notificationsEnabled: users.notificationsEnabled, language: users.language })
      .from(users)
      .where(eq(users.id, submission.userId))
      .limit(1);
    if (submitter?.notificationsEnabled) {
      const text = AI_TEXT[submitter.language];
      const localizedReason = rejectionReasonText(reason.code, submitter.language) ?? reason.text;
      await tx.insert(notifications).values({
        userId: submission.userId,
        type: "alert",
        title: reviewer.kind === "ai" ? text.rejectedTitle : text.rejectedByTeamTitle,
        message:
          reviewer.kind === "ai"
            ? text.rejected(missionTitle, localizedReason)
            : text.rejectedByTeam(missionTitle, composeRejectionMessage(reason.code, reason.text, submitter.language).replace(/[.!\s]+$/, "")),
      });
    }
    return true;
  });
}
