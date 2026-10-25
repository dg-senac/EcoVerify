"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, gte, inArray } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@/db";
import { missions, submissions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { detectFileType } from "@/lib/file-type";
import { saveFile } from "@/lib/storage";
import { isUniqueViolation, startOfTodayUTC } from "@/lib/utils";

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
  const userLatitude = Number(formData.get("latitude"));
  const userLongitude = Number(formData.get("longitude"));
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

  // ---- Location: user must be at the mission point --------------------------
  if (!mission.latitude || !mission.longitude) return { error: "mission_location_not_configured" };
  if (!Number.isFinite(userLatitude) || !Number.isFinite(userLongitude)) return { error: "outside_mission_area" };
  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy > MAX_GPS_ACCURACY_METERS)) {
    return { error: "location_inaccurate" };
  }
  if (distanceInMeters(userLatitude, userLongitude, Number(mission.latitude), Number(mission.longitude)) > MISSION_RADIUS_METERS) {
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
    .where(eq(submissions.photoHash, photoHash))
    .limit(1);
  if (duplicate) {
    return { error: "duplicate_photo" };
  }

  const photoUrl = await saveFile("proofs", buffer, detected.extension, detected.contentType);

  try {
    await db.insert(submissions).values({
      userId: user.id,
      missionId,
      photoUrl,
      photoHash,
      report,
      latitude: String(userLatitude),
      longitude: String(userLongitude),
    });
  } catch (error) {
    // The unique index on photo_hash also protects against two simultaneous uploads.
    if (isUniqueViolation(error)) return { error: "duplicate_photo" };
    throw error;
  }

  revalidatePath("/submissions");
  revalidatePath("/moderation");
  revalidatePath("/missions");

  return { success: true };
}
