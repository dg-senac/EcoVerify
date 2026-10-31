"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { and, count, eq, gte, inArray, or } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@/db";
import { missions, submissions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { membershipRole } from "@/lib/saas/orgs";
import { detectFileType } from "@/lib/file-type";
import { saveFile } from "@/lib/storage";
import { isUniqueViolation, startOfTodayUTC } from "@/lib/utils";
import { prepareProofPhoto } from "@/lib/ai/photo";
import { getAiSettings, runProofVerification, willAnalyzeWithModel } from "@/lib/ai/pipeline";
import { checkCountInput, proofTypeOf } from "@/lib/proof";
import { eventSubmissionError } from "@/lib/saas/events";

export type SubmissionActionState = { error?: string; success?: boolean };

/** The user must be within this distance of the mission point. */
const MISSION_RADIUS_METERS = 150;
/** Reject GPS readings less precise than this: a 2 km accuracy would make the radius check meaningless. */
const MAX_GPS_ACCURACY_METERS = 150;
const DAILY_SUBMISSION_LIMIT = 5;
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

function distanceInMeters(latitude: number, longitude: number, targetLatitude: number, targetLongitude: number) {
  const earthRadius = 6371000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(targetLatitude - latitude);
  const longitudeDelta = toRadians(targetLongitude - longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitude)) * Math.cos(toRadians(targetLatitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function createSubmissionAction(
  _prev: SubmissionActionState,
  formData: FormData,
): Promise<SubmissionActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isBanned) return { error: "banned" };

  const missionId = String(formData.get("missionId") ?? "");
  const report = String(formData.get("report") ?? "").trim();
  const photo = formData.get("photo");
  // Number("") is 0: an empty field must not become the point 0,0.
  const coordinate = (name: string) => {
    const raw = String(formData.get(name) ?? "").trim();
    return raw === "" ? NaN : Number(raw);
  };
  const userLatitude = coordinate("latitude");
  const userLongitude = coordinate("longitude");
  const accuracyRaw = formData.get("accuracy");
  const accuracy = accuracyRaw === null || accuracyRaw === "" ? null : Number(accuracyRaw);

  if (!missionId) return { error: "invalid" };

  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "photo_required" };
  }
  if (photo.size > MAX_PHOTO_SIZE) {
    return { error: "photo_too_large" };
  }

  if (report.length < 50 || report.length > 1000) {
    return { error: "report_length" };
  }

  const [mission] = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission || !mission.isActive) {
    return { error: "mission_not_found" };
  }
  if (mission.organizationId && !(await membershipRole(mission.organizationId, user.id))) {
    return { error: "mission_not_found" };
  }
  // Events (mutirões): only inside the date/time window.
  const eventError = eventSubmissionError(mission);
  if (eventError) return { error: eventError };

  // Count missions: number of items (the weight is estimated from it; nobody weighs anything).
  const proofType = proofTypeOf(mission);
  const counted = checkCountInput(mission, formData.get("itemCount"));
  if (counted.error) return { error: counted.error };
  const photoBefore = formData.get("photoBefore");
  if (proofType === "before_after") {
    if (!(photoBefore instanceof File) || photoBefore.size === 0) return { error: "photo_before_required" };
    if (photoBefore.size > MAX_PHOTO_SIZE) return { error: "photo_too_large" };
  }

  // ---- Location: user must be at the mission point --------------------------
  // "Anywhere" missions (e.g. at home) still record a GPS reading, but have no distance check.
  const anywhere = mission.scope === "anywhere";
  if (!anywhere && (!mission.latitude || !mission.longitude)) return { error: "mission_location_not_configured" };
  if (!Number.isFinite(userLatitude) || !Number.isFinite(userLongitude)) return { error: "outside_mission_area" };
  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy > MAX_GPS_ACCURACY_METERS)) {
    return { error: "location_inaccurate" };
  }
  if (
    !anywhere &&
    distanceInMeters(userLatitude, userLongitude, Number(mission.latitude), Number(mission.longitude)) > MISSION_RADIUS_METERS
  ) {
    return { error: "outside_mission_area" };
  }

  // ---- One active submission per mission (resubmitting after a rejection is allowed)
  const [existing] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.userId, user.id),
        eq(submissions.missionId, missionId),
        inArray(submissions.status, ["pending", "approved"]),
      ),
    )
    .limit(1);
  if (existing) return { error: "already_submitted" };

  // ---- Daily limit -----------------------------------------------------------
  const [{ value: todayCount }] = await db
    .select({ value: count() })
    .from(submissions)
    .where(and(eq(submissions.userId, user.id), gte(submissions.submittedAt, startOfTodayUTC())));
  if (todayCount >= DAILY_SUBMISSION_LIMIT) {
    return { error: "daily_limit" };
  }

  // ---- Photo: check the real format from the bytes, not the browser MIME ------
  const buffer = Buffer.from(await photo.arrayBuffer());
  const detected = detectFileType(buffer, "image");
  if (!detected || detected.contentType === "image/gif") {
    return { error: "invalid_photo" };
  }

  const photoHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const [duplicate] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(or(eq(submissions.photoHash, photoHash), eq(submissions.photoBeforeHash, photoHash)))
    .limit(1);
  if (duplicate) {
    return { error: "duplicate_photo" };
  }

  // Before/after missions: the "before" photo gets the same checks and is stored the same way.
  let before: { url: string; hash: string } | null = null;
  if (proofType === "before_after" && photoBefore instanceof File) {
    const beforeBuffer = Buffer.from(await photoBefore.arrayBuffer());
    const beforeType = detectFileType(beforeBuffer, "image");
    if (!beforeType || beforeType.contentType === "image/gif") return { error: "invalid_photo" };
    const beforeHash = crypto.createHash("sha256").update(beforeBuffer).digest("hex");
    if (beforeHash === photoHash) return { error: "before_after_same_photo" };
    const [usedBefore] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(or(eq(submissions.photoHash, beforeHash), eq(submissions.photoBeforeHash, beforeHash)))
      .limit(1);
    if (usedBefore) return { error: "duplicate_photo" };
    const preparedBefore = await prepareProofPhoto(beforeBuffer);
    if (!preparedBefore) return { error: "invalid_photo" };
    before = {
      url: await saveFile("proofs", preparedBefore.buffer, preparedBefore.extension, preparedBefore.contentType),
      hash: beforeHash,
    };
  }

  // Stored copy without EXIF (exact GPS, phone model, date) + perceptual hash for near-duplicates.
  const prepared = await prepareProofPhoto(buffer);
  if (!prepared) return { error: "invalid_photo" };
  const photoUrl = await saveFile("proofs", prepared.buffer, prepared.extension, prepared.contentType);

  const aiConfig = await getAiSettings();
  let submissionId: string;
  try {
    const [created] = await db
      .insert(submissions)
      .values({
        userId: user.id,
        missionId,
        photoUrl,
        photoHash,
        photoPhash: prepared.phash,
        report,
        latitude: String(userLatitude),
        longitude: String(userLongitude),
        material: counted.material,
        weightKg: counted.weightKg === null ? null : String(counted.weightKg),
        itemCount: counted.count,
        weightSource: counted.weightKg === null ? null : "estimated",
        photoBeforeUrl: before?.url ?? null,
        photoBeforeHash: before?.hash ?? null,
        aiStatus: willAnalyzeWithModel(aiConfig) ? "queued" : null,
      })
      .returning({ id: submissions.id });
    submissionId = created.id;
  } catch (error) {
    // The unique index on photo_hash also protects against two simultaneous uploads.
    if (isUniqueViolation(error)) return { error: "duplicate_photo" };
    throw error;
  }

  // Automatic verification runs after the response, so the user does not wait for the AI.
  if (aiConfig.mode !== "off") {
    after(async () => {
      try {
        await runProofVerification(submissionId, prepared.buffer);
      } catch (error) {
        console.error("[ai] verification crashed:", error);
      }
    });
  }

  revalidatePath("/submissions");
  revalidatePath("/moderation");
  revalidatePath("/missions");

  return { success: true };
}

export type AppealActionState = { error?: string; success?: boolean };

/**
 * LGPD art. 20: a proof rejected by the automatic verification can be sent once to a human
 * moderator. It goes back to the moderation queue (marked as an appeal) and the AI does not run again.
 */
export async function appealSubmissionAction(_prev: AppealActionState, formData: FormData): Promise<AppealActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isBanned) return { error: "banned" };

  const submissionId = String(formData.get("submissionId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (message.length < 10 || message.length > 500) return { error: "appeal_length" };

  const [submission] = await db
    .select()
    .from(submissions)
    .where(and(eq(submissions.id, submissionId), eq(submissions.userId, user.id)))
    .limit(1);
  if (!submission || submission.status !== "rejected" || submission.decidedBy !== "ai") return { error: "appeal_not_allowed" };
  if (submission.appealedAt) return { error: "appeal_already_sent" };

  // A new proof for the same mission is already in progress (or approved): no double reward.
  const [other] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.userId, user.id),
        eq(submissions.missionId, submission.missionId),
        inArray(submissions.status, ["pending", "approved"]),
      ),
    )
    .limit(1);
  if (other) return { error: "appeal_other_active" };

  const updated = await db
    .update(submissions)
    .set({
      status: "pending",
      appealedAt: new Date(),
      appealMessage: message,
      decidedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      rejectionCode: null,
    })
    .where(and(eq(submissions.id, submissionId), eq(submissions.status, "rejected")))
    .returning({ id: submissions.id });
  if (updated.length === 0) return { error: "appeal_not_allowed" };

  revalidatePath("/submissions");
  revalidatePath("/moderation");
  return { success: true };
}
