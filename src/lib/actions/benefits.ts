"use server";

import { randomInt } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications, offerRedemptions, partnerOffers, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isUniqueViolation } from "@/lib/utils";
import {
  firstName,
  codeUsedNotification,
  formatRedemptionCode,
  localizeOffer,
  isPartnerToken,
  newPartnerToken,
  newRedemptionCode,
  normalizeRedemptionCode,
  parseOfferInput,
  redeemError,
  validateError,
  type OfferInput,
  type RedeemError,
  type ValidateError,
} from "@/lib/benefits";

const cryptoRandom = () => randomInt(0, 1_000_000) / 1_000_000;
const MINUTE = 60_000;

async function clientIp() {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
}

/* ------------------------------------------------------------------ */
/* Citizen                                                             */
/* ------------------------------------------------------------------ */

/** Unique code for one offer (doesn't spend points). Returns the existing code if already redeemed. */
export async function redeemOfferAction(offerId: string): Promise<{ error?: RedeemError | "invalid" | "too_many"; code?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/beneficios");
  if (user.isBanned) return { error: "invalid" };
  if (!rateLimit(`redeem:${user.id}`, 20, 60 * MINUTE)) return { error: "too_many" };
  const [offer] = await db.select().from(partnerOffers).where(eq(partnerOffers.id, offerId)).limit(1);
  if (!offer) return { error: "offer_unavailable" };
  const [existing] = await db
    .select({ code: offerRedemptions.code })
    .from(offerRedemptions)
    .where(and(eq(offerRedemptions.offerId, offerId), eq(offerRedemptions.userId, user.id)))
    .limit(1);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(offerRedemptions).where(eq(offerRedemptions.offerId, offerId));
  const error = redeemError({ offer, user, alreadyRedeemed: !!existing, redeemedCount: n });
  if (error) return error === "already_redeemed" && existing ? { code: existing.code } : { error };

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newRedemptionCode(cryptoRandom);
    try {
      await db.insert(offerRedemptions).values({ offerId, userId: user.id, code });
      revalidatePath("/beneficios");
      return { code };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Same person twice at the same time: return the code that won.
      const [again] = await db
        .select({ code: offerRedemptions.code })
        .from(offerRedemptions)
        .where(and(eq(offerRedemptions.offerId, offerId), eq(offerRedemptions.userId, user.id)))
        .limit(1);
      if (again) return { code: again.code };
    }
  }
  return { error: "invalid" };
}

/** Self-declaration of 18+ (same rule as the wallet): unlocks the 18+ offers. */
export async function declareAdultAction(): Promise<{ error?: string; success?: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/beneficios");
  if (!user.adultDeclaredAt) await db.update(users).set({ adultDeclaredAt: new Date() }).where(eq(users.id, user.id));
  revalidatePath("/beneficios");
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Partner (/parceiro/<token>, no account)                             */
/* ------------------------------------------------------------------ */

export async function validateRedemptionAction(token: string, rawCode: string): Promise<{ error?: ValidateError | "invalid" | "too_many"; firstName?: string }> {
  if (!isPartnerToken(token)) return { error: "invalid" };
  // Brute-force guard: per link and per IP.
  if (!rateLimit(`partner:${token}`, 60, 10 * MINUTE) || !rateLimit(`partner-ip:${await clientIp()}`, 60, 10 * MINUTE)) return { error: "too_many" };
  const [offer] = await db.select().from(partnerOffers).where(eq(partnerOffers.partnerToken, token)).limit(1);
  if (!offer || !offer.isActive) return { error: "invalid" };
  const code = normalizeRedemptionCode(rawCode);
  const [row] = await db
    .select({ id: offerRedemptions.id, usedAt: offerRedemptions.usedAt, userId: offerRedemptions.userId, name: users.name, language: users.language })
    .from(offerRedemptions)
    .innerJoin(users, eq(users.id, offerRedemptions.userId))
    .where(and(eq(offerRedemptions.code, code), eq(offerRedemptions.offerId, offer.id)))
    .limit(1);
  const error = validateError(row ?? null, offer);
  if (error) return { error };
  // Only one counter can use it (two cashiers at the same time).
  const updated = await db
    .update(offerRedemptions)
    .set({ usedAt: new Date() })
    .where(and(eq(offerRedemptions.id, row!.id), isNull(offerRedemptions.usedAt)))
    .returning({ id: offerRedemptions.id });
  if (updated.length === 0) return { error: "code_used" };
  await db.insert(notifications).values({
    userId: row!.userId,
    type: "system",
    ...codeUsedNotification(row!.language, code, offer.partnerName, localizeOffer(offer, row!.language).title),
  });
  revalidatePath(`/parceiro/${token}`);
  return { firstName: firstName(row!.name) };
}

/* ------------------------------------------------------------------ */
/* Admin (Admin → 🎁 Benefícios)                                       */
/* ------------------------------------------------------------------ */

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/missions");
  return user;
}

export async function createOfferAction(input: OfferInput): Promise<{ error?: string; success?: boolean }> {
  const admin = await requireAdmin();
  const parsed = parseOfferInput(input);
  if ("error" in parsed) return { error: parsed.error };
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await db.insert(partnerOffers).values({ ...parsed.value, partnerToken: newPartnerToken(cryptoRandom), createdBy: admin.id });
      revalidatePath("/admin");
      revalidatePath("/beneficios");
      return { success: true };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  return { error: "invalid" };
}

export async function toggleOfferAction(offerId: string): Promise<{ error?: string; success?: boolean }> {
  await requireAdmin();
  await db.update(partnerOffers).set({ isActive: sql`not ${partnerOffers.isActive}` }).where(eq(partnerOffers.id, offerId));
  revalidatePath("/admin");
  revalidatePath("/beneficios");
  return { success: true };
}

/** New validation link (when the old one leaked). */
export async function regenerateOfferTokenAction(offerId: string): Promise<{ error?: string; success?: boolean }> {
  await requireAdmin();
  await db.update(partnerOffers).set({ partnerToken: newPartnerToken(cryptoRandom) }).where(eq(partnerOffers.id, offerId));
  revalidatePath("/admin");
  return { success: true };
}
