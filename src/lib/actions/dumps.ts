"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { and, between, count, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { dumpConfirmations, dumpReports, submissions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { detectFileType } from "@/lib/file-type";
import { saveFile } from "@/lib/storage";
import { isUniqueViolation, startOfTodayUTC } from "@/lib/utils";
import { prepareProofPhoto } from "@/lib/ai/photo";
import { getAiSettings, willAnalyzeWithModel } from "@/lib/ai/pipeline";
import { placeOf } from "@/lib/municipalities";
import { moderatorsEnabled } from "@/lib/staff-config";
import { isStaffExperience } from "@/lib/nav";
import { rateLimit } from "@/lib/rate-limit";
import { analyzeDumpReport, confirmDumpReport, dumpItem, rejectDumpReport } from "@/lib/dumps-server";
import {
  DUMP_CONFIRM_DAILY_LIMIT,
  DUMP_CONFIRM_RADIUS_M,
  DUMP_DAILY_LIMIT,
  DUMP_DEDUPE_M,
  DUMP_MAX_ACCURACY_M,
  DUMP_NEARBY_KM,
  distanceMeters,
  isDumpSize,
  type DumpError,
  type DumpItem,
} from "@/lib/dumps";

export type DumpActionState = { error?: DumpError; success?: boolean; missionId?: string | null };

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

async function citizen() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isBanned || isStaffExperience(user.role, moderatorsEnabled())) return null;
  return user;
}

function readLocation(formData: FormData): { lat: number; lng: number; accuracy: number | null } | DumpError {
  const num = (name: string) => {
    const raw = String(formData.get(name) ?? "").trim();
    return raw === "" ? NaN : Number(raw);
  };
  const lat = num("latitude");
  const lng = num("longitude");
  const accuracy = num("accuracy");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return "location_required";
  if (Number.isFinite(accuracy) && accuracy > DUMP_MAX_ACCURACY_M) return "location_inaccurate";
  return { lat, lng, accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null };
}

/** Same photo checks as mission proofs: real format, size, never used before anywhere. */
async function readPhoto(formData: FormData): Promise<{ buffer: Buffer; hash: string } | DumpError> {
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return "photo_required";
  if (photo.size > MAX_PHOTO_SIZE) return "photo_too_large";
  const buffer = Buffer.from(await photo.arrayBuffer());
  const type = detectFileType(buffer, "image");
  if (!type || type.contentType === "image/gif") return "invalid_photo";
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const [a] = await db.select({ id: dumpReports.id }).from(dumpReports).where(eq(dumpReports.photoHash, hash)).limit(1);
  const [b] = await db.select({ id: dumpConfirmations.id }).from(dumpConfirmations).where(eq(dumpConfirmations.photoHash, hash)).limit(1);
  const [c] = await db.select({ id: submissions.id }).from(submissions).where(eq(submissions.photoHash, hash)).limit(1);
  if (a || b || c) return "duplicate_photo";
  return { buffer, hash };
}

/** Reports around a point (rough box first, exact distance after). */
async function reportsNear(lat: number, lng: number, meters: number, statuses: ("pending" | "open" | "confirmed")[]) {
  const dLat = meters / 111_000;
  const dLng = meters / (111_000 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  const rows = await db
    .select()
    .from(dumpReports)
    .where(
      and(
        inArray(dumpReports.status, statuses),
        between(dumpReports.latitude, String(lat - dLat), String(lat + dLat)),
        between(dumpReports.longitude, String(lng - dLng), String(lng + dLng)),
      ),
    )
    .limit(200);
  return rows
    .map((r) => ({ ...r, distanceM: distanceMeters(lat, lng, Number(r.latitude), Number(r.longitude)) }))
    .filter((r) => r.distanceM <= meters)
    .sort((x, y) => x.distanceM - y.distanceM);
}

export async function reportDumpAction(_prev: DumpActionState, formData: FormData): Promise<DumpActionState> {
  const user = await citizen();
  if (!user) return { error: "not_allowed" };
  if (!rateLimit(`dump:${user.id}`, 10, 10 * 60_000)) return { error: "daily_limit" };
  const size = String(formData.get("size") ?? "");
  if (!isDumpSize(size)) return { error: "invalid_size" };
  const note = String(formData.get("note") ?? "").trim().slice(0, 280) || null;
  const location = readLocation(formData);
  if (typeof location === "string") return { error: location };

  const [{ value: today }] = await db
    .select({ value: count() })
    .from(dumpReports)
    .where(and(eq(dumpReports.userId, user.id), gte(dumpReports.createdAt, startOfTodayUTC())));
  if (today >= DUMP_DAILY_LIMIT) return { error: "daily_limit" };
  if ((await reportsNear(location.lat, location.lng, DUMP_DEDUPE_M, ["pending", "open", "confirmed"])).length > 0) return { error: "nearby_open" };

  const photo = await readPhoto(formData);
  if (typeof photo === "string") return { error: photo };
  const prepared = await prepareProofPhoto(photo.buffer);
  if (!prepared) return { error: "invalid_photo" };
  const photoUrl = await saveFile("proofs", prepared.buffer, prepared.extension, prepared.contentType);
  const place = placeOf(location.lat, location.lng);
  const analyze = willAnalyzeWithModel(await getAiSettings());

  let reportId: string;
  try {
    const [created] = await db
      .insert(dumpReports)
      .values({
        userId: user.id,
        photoUrl,
        photoHash: photo.hash,
        photoPhash: prepared.phash,
        latitude: String(location.lat),
        longitude: String(location.lng),
        accuracyM: location.accuracy,
        city: place.city,
        stateCode: place.stateCode,
        size,
        note,
        // Without the AI the report is published at once: the confirmation by someone else checks it.
        status: analyze ? "pending" : "open",
      })
      .returning({ id: dumpReports.id });
    reportId = created.id;
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "duplicate_photo" };
    throw error;
  }
  if (analyze) {
    after(async () => {
      try {
        await analyzeDumpReport(reportId, prepared.buffer);
      } catch (error) {
        console.error("[dumps] check crashed:", error);
      }
      revalidatePath("/lixo");
    });
  }
  revalidatePath("/lixo");
  revalidatePath("/admin");
  return { success: true };
}

export async function confirmDumpAction(_prev: DumpActionState, formData: FormData): Promise<DumpActionState> {
  const user = await citizen();
  if (!user) return { error: "not_allowed" };
  if (!rateLimit(`dump-confirm:${user.id}`, 20, 10 * 60_000)) return { error: "daily_limit" };
  const reportId = String(formData.get("reportId") ?? "");
  const location = readLocation(formData);
  if (typeof location === "string") return { error: location };
  const [report] = reportId ? await db.select().from(dumpReports).where(eq(dumpReports.id, reportId)).limit(1) : [];
  if (!report || report.status !== "open") return { error: "not_found" };
  if (report.userId === user.id) return { error: "own_report" };
  const [already] = await db
    .select({ id: dumpConfirmations.id })
    .from(dumpConfirmations)
    .where(and(eq(dumpConfirmations.reportId, report.id), eq(dumpConfirmations.userId, user.id)))
    .limit(1);
  if (already) return { error: "already_confirmed" };
  if (distanceMeters(location.lat, location.lng, Number(report.latitude), Number(report.longitude)) > DUMP_CONFIRM_RADIUS_M) return { error: "too_far" };
  const [{ value: today }] = await db
    .select({ value: count() })
    .from(dumpConfirmations)
    .where(and(eq(dumpConfirmations.userId, user.id), gte(dumpConfirmations.createdAt, startOfTodayUTC())));
  if (today >= DUMP_CONFIRM_DAILY_LIMIT) return { error: "daily_limit" };

  const photo = await readPhoto(formData);
  if (typeof photo === "string") return { error: photo };
  const prepared = await prepareProofPhoto(photo.buffer);
  if (!prepared) return { error: "invalid_photo" };
  const photoUrl = await saveFile("proofs", prepared.buffer, prepared.extension, prepared.contentType);

  let missionId: string | null = null;
  try {
    missionId = await db.transaction(async (tx) => {
      await tx.insert(dumpConfirmations).values({
        reportId: report.id,
        userId: user.id,
        photoUrl,
        photoHash: photo.hash,
        latitude: String(location.lat),
        longitude: String(location.lng),
      });
      return confirmDumpReport(tx, report, user.id);
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "already_confirmed" };
    throw error;
  }
  if (!missionId) return { error: "not_found" };
  revalidatePath("/lixo");
  revalidatePath("/missions");
  revalidatePath("/admin");
  return { success: true, missionId };
}

/** Open spots around the person (to confirm) and confirmed ones (cleanup missions). */
export async function nearbyDumpsAction(lat: number, lng: number): Promise<DumpItem[]> {
  const user = await citizen();
  if (!user || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const rows = await reportsNear(lat, lng, DUMP_NEARBY_KM * 1000, ["open", "confirmed"]);
  const mineConfirmed = new Set(
    rows.length
      ? (
          await db
            .select({ reportId: dumpConfirmations.reportId })
            .from(dumpConfirmations)
            .where(and(eq(dumpConfirmations.userId, user.id), inArray(dumpConfirmations.reportId, rows.map((r) => r.id))))
        ).map((c) => c.reportId)
      : [],
  );
  return rows.slice(0, 30).map((r) => ({ ...dumpItem(r, user.id), confirmedByMe: mineConfirmed.has(r.id) }));
}

/* ---- Admin (last resort) ------------------------------------------------- */

export async function adminDumpDecisionAction(reportId: string, decision: "publish" | "confirm" | "reject"): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") return { error: "forbidden" };
  const [report] = await db.select().from(dumpReports).where(eq(dumpReports.id, reportId)).limit(1);
  if (!report) return { error: "not_found" };
  if (decision === "reject") {
    if (!(await rejectDumpReport(reportId, "admin"))) return { error: "not_found" };
  } else if (decision === "publish") {
    const rows = await db
      .update(dumpReports)
      .set({ status: "open", needsReview: false })
      .where(and(eq(dumpReports.id, reportId), eq(dumpReports.status, "pending")))
      .returning({ id: dumpReports.id });
    if (rows.length === 0) return { error: "not_found" };
  } else {
    const missionId = await db.transaction((tx) => confirmDumpReport(tx, report, null));
    if (!missionId) return { error: "not_found" };
  }
  revalidatePath("/admin");
  revalidatePath("/lixo");
  revalidatePath("/missions");
  return {};
}
