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
import { composeRejectionMessage, isInternetCopyFlag, isRejectionCode, ownWords, REJECTION_REASONS, validateRejection } from "@/lib/ai/decision";
import { CARD_NOTE_MIN, cardReasonForRejection } from "@/lib/cards";
import { issueCard } from "@/lib/cards-server";
import { canReview } from "@/lib/nav";
import { moderatorsEnabled } from "@/lib/staff-config";
import { getAiSettings, runProofVerification, willAnalyzeWithModel } from "@/lib/ai/pipeline";
import { parseWeightKg } from "@/lib/impact";

export type ModerationActionState = { error?: string; success?: boolean };

/**
 * Platform staff review everything; organization owners/managers review the proofs of their
 * organization's missions.
 */
async function assertReviewer(submissionId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (canReview(user.role, moderatorsEnabled())) return user;
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
  if (!canReview(user.role, moderatorsEnabled())) redirect("/missions");
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

  // Recycling delivery: the reviewer may correct the declared weight after looking at the photo.
  if (submission.material) {
    const typed = String(formData.get("weightKg") ?? "").trim();
    if (typed) {
      const checked = parseWeightKg(typed);
      if (checked === null) return { error: "weight_invalid" };
      if (checked !== Number(submission.weightKg)) {
        await db
          .update(submissions)
          .set({ weightKg: String(checked) })
          .where(and(eq(submissions.id, submissionId), eq(submissions.status, "pending")));
      }
    }
  }

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
  const typed = String(formData.get("reason") ?? "").trim().slice(0, 1000);

  const [submission] = await db.select().from(submissions).where(eq(submissions.id, submissionId)).limit(1);
  if (!submission) return { error: "not_found" };
  if (submission.status !== "pending") return { error: "already_reviewed" };
  if (submission.userId === moderator.id) return { error: "own_submission" };

  // A proof flagged as a possible internet copy needs the moderator's own explanation.
  const flagged = isInternetCopyFlag(submission.aiReasonCode);
  const reason = typed || (code && !flagged ? REJECTION_REASONS[code].pt : "");
  const invalid = validateRejection({ flagged, text: reason });
  if (invalid) return { error: invalid };

  // Optional yellow card (platform staff only, fraud reasons only), explained by the same text.
  const giveCard = formData.get("giveCard") === "on" && canReview(moderator.role, moderatorsEnabled());
  if (giveCard && composeRejectionMessage(null, reason, "pt").length < CARD_NOTE_MIN) return { error: "card_note_short" };

  const rejected = await rejectSubmission(submissionId, { kind: "human", userId: moderator.id }, { code, text: reason });
  if (!rejected) return { error: "already_reviewed" };

  if (giveCard) {
    await issueCard({
      userId: submission.userId,
      type: "yellow",
      reason: cardReasonForRejection(code),
      note: ownWords(reason) || reason,
      issuerId: moderator.id,
      submissionId,
    });
    revalidatePath("/admin");
  }

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
