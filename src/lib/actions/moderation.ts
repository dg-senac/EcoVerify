"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, submissions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { membershipRole } from "@/lib/saas/orgs";
import { canManage } from "@/lib/saas/org-rules";
import { approveSubmission, rejectSubmission } from "@/lib/review";
import { isRejectionCode, REJECTION_REASONS } from "@/lib/ai/decision";
import { getAiSettings, runProofVerification, willAnalyzeWithModel } from "@/lib/ai/pipeline";

export type ModerationActionState = { error?: string; success?: boolean };

/**
 * Platform staff review everything; organization owners/managers review the proofs of their
 * organization's missions.
 */
async function assertReviewer(submissionId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "moderator" || user.role === "admin") return user;
  const [row] = await db
    .select({ orgId: missions.organizationId })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (row?.orgId && canManage(await membershipRole(row.orgId, user.id))) return user;
  redirect("/missions");
}

async function revalidateOrgPages(submissionId: string) {
  const [row] = await db
    .select({ slug: sql<string | null>`(select o.slug from organizations o where o.id = ${missions.organizationId})` })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(eq(submissions.id, submissionId))
    .limit(1);
  if (row?.slug) revalidatePath(`/org/${row.slug}`);
}

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
  const submissionId = String(formData.get("submissionId") ?? "");
  if (!submissionId) return { error: "not_found" };
  const moderator = await assertReviewer(submissionId);

  const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
  if (!submission) return { error: "not_found" };
  if (submission.status !== "pending") return { error: "already_reviewed" };
  if (submission.userId === moderator.id) return { error: "own_submission" };

  // Same transactional rules as the automatic verification (lib/review.ts).
  const approved = await approveSubmission(submissionId, { kind: "human", userId: moderator.id });
  if (!approved) return { error: "already_reviewed" };

  revalidatePath("/moderation");
  revalidatePath("/submissions");
  revalidatePath("/ranking");
  revalidatePath("/profile");
  revalidatePath("/admin");
  revalidatePath("/notifications");
  await revalidateOrgPages(submissionId);

  return { success: true };
}

export async function rejectSubmissionAction(
  _prev: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  const submissionId = String(formData.get("submissionId") ?? "");
  if (!submissionId) return { error: "not_found" };
  const moderator = await assertReviewer(submissionId);
  const codeInput = String(formData.get("reasonCode") ?? "");
  const code = isRejectionCode(codeInput) ? codeInput : null;
  const reason = String(formData.get("reason") ?? "").trim() || (code ? REJECTION_REASONS[code].pt : "");

  if (reason.length < 5) {
    return { error: "reason_too_short" };
  }
  if (!submissionId) return { error: "not_found" };

  const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
  if (!submission) return { error: "not_found" };
  if (submission.status !== "pending") return { error: "already_reviewed" };
  if (submission.userId === moderator.id) return { error: "own_submission" };

  const rejected = await rejectSubmission(submissionId, { kind: "human", userId: moderator.id }, { code, text: reason });
  if (!rejected) return { error: "already_reviewed" };

  revalidatePath("/moderation");
  revalidatePath("/submissions");
  revalidatePath("/notifications");
  revalidatePath("/missions");
  await revalidateOrgPages(submissionId);

  return { success: true };
}

/** Runs the automatic verification again (e.g. after the free daily quota ran out). */
export async function retryAiVerificationAction(
  _prev: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  await assertModerator();
  const submissionId = String(formData.get("submissionId") ?? "");
  if (!submissionId) return { error: "not_found" };
  const settings = await getAiSettings();
  if (!willAnalyzeWithModel(settings)) return { error: "ai_unavailable" };

  await db
    .update(submissions)
    .set({ aiStatus: "queued", aiError: null })
    .where(and(eq(submissions.id, submissionId), eq(submissions.status, "pending")));
  await runProofVerification(submissionId);

  revalidatePath("/moderation");
  revalidatePath("/submissions");
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
