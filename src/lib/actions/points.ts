"use server";

import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { collectionPoints, missions, notifications, submissions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isUniqueViolation } from "@/lib/utils";
import { firstName, isPartnerToken, localizeOffer, newPartnerToken } from "@/lib/benefits";
import { formatKg } from "@/lib/impact";
import { isLang, type Lang } from "@/lib/i18n";
import { deliveryError, parseDeliveryInput, parseDeliveryQr, pointText, type DeliveryError } from "@/lib/partner";
import { planAfterPartner } from "@/lib/verification-server";

const MINUTE = 60_000;
const cryptoRandom = () => randomInt(0, 1_000_000) / 1_000_000;

async function clientIp() {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
}

export type DeliveryLookup = { error?: DeliveryError; firstName?: string; missionTitle?: string; submittedAt?: string; code?: string };

/** The delivery behind a code, if it belongs to a mission of this point. */
async function findDelivery(token: string, raw: string) {
  if (!isPartnerToken(token)) return { error: "invalid" as const };
  // Brute-force guard: per link and per IP.
  if (!rateLimit(`point:${token}`, 120, 10 * MINUTE) || !rateLimit(`point-ip:${await clientIp()}`, 120, 10 * MINUTE)) return { error: "too_many" as const };
  const [point] = await db.select().from(collectionPoints).where(eq(collectionPoints.token, token)).limit(1);
  if (!point || !point.isActive) return { error: "invalid" as const };
  const code = parseDeliveryQr(raw);
  if (!code) return { error: "invalid" as const };
  const [row] = await db
    .select({
      id: submissions.id,
      status: submissions.status,
      partnerConfirmedAt: submissions.partnerConfirmedAt,
      submittedAt: submissions.submittedAt,
      userId: submissions.userId,
      name: users.name,
      language: users.language,
      notificationsEnabled: users.notificationsEnabled,
      mission: { title: missions.title, titleEn: missions.titleEn, titleEs: missions.titleEs, description: missions.description },
    })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .innerJoin(users, eq(users.id, submissions.userId))
    .where(and(eq(submissions.deliveryCode, code), eq(missions.collectionPointId, point.id)))
    .limit(1);
  return { point, code, row: row ?? null };
}

/** Step 1 at the counter: who is delivering (first name only) and for which mission. */
export async function lookupDeliveryAction(token: string, lang: Lang, raw: string): Promise<DeliveryLookup> {
  const found = await findDelivery(token, raw);
  if ("error" in found) return { error: found.error };
  const error = deliveryError(found.row);
  if (error) return { error };
  const row = found.row!;
  if (!isLang(lang)) lang = "pt";
  return { firstName: firstName(row.name), missionTitle: localizeOffer(row.mission, lang).title, submittedAt: row.submittedAt.toISOString(), code: found.code };
}

/** Step 2: the point weighed the material. The weight becomes "checked at the collection point". */
export async function confirmDeliveryAction(token: string, raw: string, material: string, kg: string): Promise<{ error?: DeliveryError; firstName?: string; kg?: number }> {
  const found = await findDelivery(token, raw);
  if ("error" in found) return { error: found.error };
  const error = deliveryError(found.row);
  if (error) return { error };
  const parsed = parseDeliveryInput(material, kg);
  if ("error" in parsed) return { error: parsed.error };
  const row = found.row!;
  // Only one counter can confirm it (two people at the same time).
  const updated = await db
    .update(submissions)
    .set({ material: parsed.material, weightKg: String(parsed.kg), weightSource: "partner", partnerConfirmedAt: new Date(), partnerPointId: found.point.id })
    .where(and(eq(submissions.id, row.id), eq(submissions.status, "pending"), isNull(submissions.partnerConfirmedAt)))
    .returning({ id: submissions.id });
  if (updated.length === 0) return { error: "already_confirmed" };
  if (row.notificationsEnabled) {
    const text = pointText(row.language);
    await db.insert(notifications).values({
      userId: row.userId,
      type: "system",
      title: text.notifTitle,
      message: text.notifMessage(found.point.name, formatKg(parsed.kg, row.language), localizeOffer(row.mission, row.language).title),
    });
  }
  try {
    await planAfterPartner(row.id);
  } catch (err) {
    // The sweep and the moderators still see it; the confirmation itself is saved.
    console.error("[partner] plan after confirmation failed:", err);
  }
  revalidatePath(`/ponto/${token}`);
  revalidatePath("/submissions");
  return { firstName: firstName(row.name), kg: parsed.kg };
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/missions");
  return user;
}

export async function createCollectionPointAction(input: { name: string; address: string; city: string; organizationId?: string | null }): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin();
  const name = input.name.trim().slice(0, 80);
  if (name.length < 3) return { error: "name" };
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await db.insert(collectionPoints).values({
        name,
        address: input.address.trim().slice(0, 160) || null,
        city: input.city.trim().slice(0, 80) || null,
        organizationId: input.organizationId || null,
        token: newPartnerToken(cryptoRandom),
        createdBy: admin.id,
      });
      revalidatePath("/admin");
      return { success: true };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  return { error: "invalid" };
}

export async function toggleCollectionPointAction(pointId: string): Promise<{ error?: string; success?: boolean }> {
  await requireAdmin();
  await db.update(collectionPoints).set({ isActive: sql`not ${collectionPoints.isActive}` }).where(eq(collectionPoints.id, pointId));
  revalidatePath("/admin");
  return { success: true };
}

/** New secret link (when the old one leaked). */
export async function regenerateCollectionPointLinkAction(pointId: string): Promise<{ error?: string; success?: boolean }> {
  await requireAdmin();
  await db.update(collectionPoints).set({ token: newPartnerToken(cryptoRandom) }).where(eq(collectionPoints.id, pointId));
  revalidatePath("/admin");
  return { success: true };
}
