import "server-only";
import { and, count, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { dumpConfirmations, dumpReports, missions, notifications, users } from "@/db/schema";
import type { Lang } from "@/lib/i18n";
import { awardPoints } from "@/lib/points-award";
import {
  DUMP_CONFIRM_POINTS,
  DUMP_EXPIRY_DAYS,
  DUMP_REPORT_POINTS,
  cleanupMission,
  dumpOutcome,
  dumpText,
  type DumpItem,
  type DumpRejection,
} from "@/lib/dumps";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Report = typeof dumpReports.$inferSelect;

async function notify(tx: Tx | typeof db, userId: string, build: (lang: Lang) => { title: string; message: string }) {
  const [u] = await tx.select({ language: users.language, enabled: users.notificationsEnabled }).from(users).where(eq(users.id, userId)).limit(1);
  if (!u?.enabled) return;
  await tx.insert(notifications).values({ userId, type: "system", ...build(u.language) });
}

/**
 * Confirmation (by another person on site, or by the admin as a last resort): the report becomes
 * a cleanup mission at the spot, the reporter and the confirmer get their points. Runs only once:
 * the status change is conditional.
 */
export async function confirmDumpReport(tx: Tx, report: Report, confirmerId: string | null): Promise<string | null> {
  const fields = cleanupMission({ size: report.size, city: report.city, note: report.note });
  const updated = await tx
    .update(dumpReports)
    .set({ status: "confirmed", confirmedAt: new Date(), needsReview: false })
    .where(and(eq(dumpReports.id, report.id), inArray(dumpReports.status, ["open", "pending"])))
    .returning({ id: dumpReports.id });
  if (updated.length === 0) return null;
  const [mission] = await tx
    .insert(missions)
    .values({
      ...fields,
      latitude: report.latitude,
      longitude: report.longitude,
      city: report.city,
      stateCode: report.stateCode,
      origin: "auto",
      needsReview: false,
    })
    .returning({ id: missions.id });
  await tx.update(dumpReports).set({ missionId: mission.id }).where(eq(dumpReports.id, report.id));
  await awardPoints(tx, { userId: report.userId, points: DUMP_REPORT_POINTS, source: "dump_report", refKey: `dump_report:${report.id}` });
  if (confirmerId) {
    await awardPoints(tx, { userId: confirmerId, points: DUMP_CONFIRM_POINTS, source: "dump_confirm", refKey: `dump_confirm:${report.id}:${confirmerId}` });
  }
  await notify(tx, report.userId, (lang) => ({ title: dumpText(lang).notifyConfirmedTitle, message: dumpText(lang).notifyConfirmed }));
  return mission.id;
}

export async function rejectDumpReport(reportId: string, code: DumpRejection, aiReason: string | null = null): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(dumpReports)
      .set({ status: "rejected", rejectionCode: code, needsReview: false, ...(aiReason ? { aiReason } : {}) })
      .where(and(eq(dumpReports.id, reportId), inArray(dumpReports.status, ["pending", "open"])))
      .returning({ userId: dumpReports.userId });
    if (!row) return false;
    await notify(tx, row.userId, (lang) => ({ title: dumpText(lang).notifyRejectedTitle, message: dumpText(lang).notifyRejected(dumpText(lang).rejection[code]) }));
    return true;
  });
}

/** AI check of a new report photo (after the response; the report stays "pending" meanwhile). */
export async function analyzeDumpReport(reportId: string, photo: Buffer): Promise<void> {
  const [report] = await db.select().from(dumpReports).where(eq(dumpReports.id, reportId)).limit(1);
  if (!report || report.status !== "pending" || report.needsReview) return;
  // Lazy import: keeps the Gemini adapter out of modules that only need the rules.
  const { analyzeProofWithGemini, AiUnavailableError } = await import("@/lib/ai/gemini");
  const { photoForAi } = await import("@/lib/ai/photo");
  const { DUMP_AI_MISSION } = await import("@/lib/dumps");
  let analysis = null;
  try {
    analysis = (await analyzeProofWithGemini({ image: await photoForAi(photo), mission: DUMP_AI_MISSION, report: report.note ?? "" })).analysis;
  } catch (error) {
    // AI unavailable: publish it, the confirmation by another person is the real check.
    if (!(error instanceof AiUnavailableError)) console.error("[dumps] analysis failed:", error);
  }
  const outcome = dumpOutcome(analysis);
  const aiReason = analysis?.explanation ?? null;
  if (outcome.status === "rejected") {
    await rejectDumpReport(reportId, outcome.code, aiReason);
  } else {
    await db
      .update(dumpReports)
      .set(outcome.status === "open" ? { status: "open", aiReason } : { needsReview: true, aiReason })
      .where(and(eq(dumpReports.id, reportId), eq(dumpReports.status, "pending")));
  }
}

/** Called inside the approval transaction (src/lib/review.ts): an approved cleanup closes the spot. */
export async function resolveDumpForMission(tx: Tx, missionId: string): Promise<void> {
  const [resolved] = await tx
    .update(dumpReports)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(and(eq(dumpReports.missionId, missionId), eq(dumpReports.status, "confirmed")))
    .returning({ userId: dumpReports.userId });
  if (!resolved) return;
  await tx.update(missions).set({ isActive: false }).where(eq(missions.id, missionId));
  await notify(tx, resolved.userId, (lang) => ({ title: dumpText(lang).notifyResolvedTitle, message: dumpText(lang).notifyResolved }));
}

/** Reports nobody confirmed in DUMP_EXPIRY_DAYS: expired (no points). Part of the verification sweep. */
export async function expireDumpReports(at: Date = new Date()): Promise<number> {
  const limit = new Date(at.getTime() - DUMP_EXPIRY_DAYS * 86_400_000);
  const rows = await db
    .update(dumpReports)
    .set({ status: "expired", needsReview: false })
    .where(and(inArray(dumpReports.status, ["open", "pending"]), lt(dumpReports.createdAt, limit)))
    .returning({ id: dumpReports.id });
  return rows.length;
}

export function dumpItem(r: typeof dumpReports.$inferSelect & { distanceM?: number }, userId: string): DumpItem {
  return {
    id: r.id,
    photoUrl: r.photoUrl,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    size: r.size,
    status: r.status,
    needsReview: r.needsReview,
    createdAt: r.createdAt.toISOString(),
    city: r.city,
    note: r.note,
    rejectionCode: r.rejectionCode,
    missionId: r.missionId,
    distanceM: r.distanceM,
    mine: r.userId === userId,
  };
}

export async function myDumpReports(userId: string): Promise<DumpItem[]> {
  const rows = await db.select().from(dumpReports).where(eq(dumpReports.userId, userId)).orderBy(desc(dumpReports.createdAt)).limit(30);
  return rows.map((r) => dumpItem(r, userId));
}

/** Admin list: newest first, with reporter name and number of confirmations. */
export async function adminDumpList(viewerId: string): Promise<DumpItem[]> {
  const rows = await db
    .select({ report: dumpReports, reporterName: users.name })
    .from(dumpReports)
    .innerJoin(users, eq(users.id, dumpReports.userId))
    .orderBy(desc(dumpReports.needsReview), desc(dumpReports.createdAt))
    .limit(200);
  const ids = rows.map((r) => r.report.id);
  const counts = ids.length
    ? await db
        .select({ reportId: dumpConfirmations.reportId, n: count() })
        .from(dumpConfirmations)
        .where(inArray(dumpConfirmations.reportId, ids))
        .groupBy(dumpConfirmations.reportId)
    : [];
  const byId = new Map(counts.map((c) => [c.reportId, c.n]));
  return rows.map((r) => ({ ...dumpItem(r.report, viewerId), reporterName: r.reporterName, confirmations: byId.get(r.report.id) ?? 0, aiReason: r.report.aiReason }));
}
