"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, notifications, pointsLedger, rewardQueue, submissions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export type ModerationActionState = { error?: string; success?: boolean };

async function assertModerator() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "moderator" && user.role !== "admin") redirect("/missions");
  return user;
}

export async function approveSubmissionAction(
  _prev: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  const moderator = await assertModerator();
  const submissionId = String(formData.get("submissionId") ?? "");
  if (!submissionId) return { error: "not_found" };

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!submission) return { error: "not_found" };
  if (submission.status !== "pending") return { error: "already_reviewed" };
  if (submission.userId === moderator.id) return { error: "own_submission" };

  const [mission] = await db.select().from(missions).where(eq(missions.id, submission.missionId)).limit(1);
  if (!mission) return { error: "mission_not_found" };

  // Everything below happens atomically. The status update only matches while the
  // submission is still pending, so two moderators (or a double click) approving at
  // the same time can never award points or FONE twice. The unique indexes on
  // points_ledger/reward_queue (submission_id) are a second safety net.
  const approved = await db.transaction(async (tx) => {
    const updated = await tx
      .update(submissions)
      .set({
        status: "approved",
        reviewedBy: moderator.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      })
      .where(and(eq(submissions.id, submissionId), eq(submissions.status, "pending")))
      .returning({ id: submissions.id });

    if (updated.length === 0) return false;

    await tx.insert(pointsLedger).values({
      userId: submission.userId,
      submissionId: submission.id,
      points: mission.pointsReward,
    });

    await tx
      .update(users)
      .set({ totalPoints: sql`${users.totalPoints} + ${mission.pointsReward}` })
      .where(eq(users.id, submission.userId));

    await tx.insert(rewardQueue).values({
      userId: submission.userId,
      submissionId: submission.id,
      foneAmount: mission.foneReward,
      status: "pending",
    });

    const [submitter] = await tx
      .select({ notificationsEnabled: users.notificationsEnabled })
      .from(users)
      .where(eq(users.id, submission.userId))
      .limit(1);
    if (submitter?.notificationsEnabled) {
      await tx.insert(notifications).values({
        userId: submission.userId,
        type: "system",
        title: "Comprovação aprovada! 🎉",
        message: `Sua comprovação para "${mission.title}" foi aprovada. Você ganhou ${mission.pointsReward} pontos e ${mission.foneReward} FONE entrou na fila de pagamento.`,
      });
    }

    return true;
  });

  if (!approved) return { error: "already_reviewed" };

  revalidatePath("/moderation");
  revalidatePath("/submissions");
  revalidatePath("/ranking");
  revalidatePath("/profile");
  revalidatePath("/admin");
  revalidatePath("/notifications");

  return { success: true };
}

export async function rejectSubmissionAction(
  _prev: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  const moderator = await assertModerator();
  const submissionId = String(formData.get("submissionId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (reason.length < 5) {
    return { error: "reason_too_short" };
  }
  if (!submissionId) return { error: "not_found" };

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!submission) return { error: "not_found" };
  if (submission.status !== "pending") return { error: "already_reviewed" };
  if (submission.userId === moderator.id) return { error: "own_submission" };

  const [mission] = await db.select().from(missions).where(eq(missions.id, submission.missionId)).limit(1);

  const rejected = await db.transaction(async (tx) => {
    const updated = await tx
      .update(submissions)
      .set({
        status: "rejected",
        reviewedBy: moderator.id,
        reviewedAt: new Date(),
        rejectionReason: reason,
      })
      .where(and(eq(submissions.id, submissionId), eq(submissions.status, "pending")))
      .returning({ id: submissions.id });

    if (updated.length === 0) return false;

    const [submitter] = await tx
      .select({ notificationsEnabled: users.notificationsEnabled })
      .from(users)
      .where(eq(users.id, submission.userId))
      .limit(1);
    if (submitter?.notificationsEnabled) {
      await tx.insert(notifications).values({
        userId: submission.userId,
        type: "alert",
        title: "Comprovação rejeitada",
        message: `Sua comprovação para "${mission?.title ?? "missão"}" foi rejeitada. Motivo: ${reason}. Você pode enviar uma nova comprovação para esta missão.`,
      });
    }
    return true;
  });

  if (!rejected) return { error: "already_reviewed" };

  revalidatePath("/moderation");
  revalidatePath("/submissions");
  revalidatePath("/notifications");
  revalidatePath("/missions");

  return { success: true };
}

export async function getUserHistory(userId: string) {
  await assertModerator();
  return db
    .select({
      id: submissions.id,
      status: submissions.status,
      report: submissions.report,
      submittedAt: submissions.submittedAt,
      missionTitle: missions.title,
      rejectionReason: submissions.rejectionReason,
    })
    .from(submissions)
    .innerJoin(missions, eq(submissions.missionId, missions.id))
    .where(eq(submissions.userId, userId))
    .orderBy(sql`${submissions.submittedAt} desc`);
}
