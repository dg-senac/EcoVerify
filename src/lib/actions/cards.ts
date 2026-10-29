"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { userCards, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { CARD_APPEAL_MIN, CARD_NOTE_MIN, isCardActive, isCardReason } from "@/lib/cards";
import { issueCard, keepCardAfterAppeal, liftSuspension, revokeCard } from "@/lib/cards-server";
import { notifyStaff } from "@/lib/staff-alerts";
import { canReview } from "@/lib/nav";
import { moderatorsEnabled } from "@/lib/staff-config";
import { t, tf } from "@/lib/i18n";

export type CardActionState = { error?: string; success?: boolean };

async function assertStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canReview(user.role, moderatorsEnabled())) redirect("/missions");
  return user;
}

async function assertAdmin() {
  const user = await assertStaff();
  if (user.role !== "admin") redirect("/missions");
  return user;
}

/** Yellow card: moderators and admins. Red card (blocks the account): admins only. */
export async function giveCardAction(_prev: CardActionState, formData: FormData): Promise<CardActionState> {
  const staff = await assertStaff();
  const userId = String(formData.get("userId") ?? "");
  const type = formData.get("type") === "red" ? "red" : "yellow";
  const reason = String(formData.get("reason") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!userId || !isCardReason(reason)) return { error: "invalid" };
  if (userId === staff.id) return { error: "self" };
  if (type === "red" && staff.role !== "admin") return { error: "forbidden" };
  if (note.length < CARD_NOTE_MIN) return { error: "card_note_short" };

  const done = await issueCard({ userId, type, reason, note, issuerId: staff.id });
  if (!done) return { error: "not_found" };
  revalidatePath("/admin");
  revalidatePath("/ranking");
  return { success: true };
}

/** The person appeals one of their cards (once). The admins are alerted. */
export async function appealCardAction(_prev: CardActionState, formData: FormData): Promise<CardActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const cardId = String(formData.get("cardId") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (message.length < CARD_APPEAL_MIN) return { error: "banned_appeal_too_short" };

  const [card] = await db.select().from(userCards).where(and(eq(userCards.id, cardId), eq(userCards.userId, user.id))).limit(1);
  if (!card || !isCardActive(card)) return { error: "not_found" };
  const updated = await db
    .update(userCards)
    .set({ appealMessage: message.slice(0, 1500), appealedAt: new Date() })
    .where(and(eq(userCards.id, cardId), isNull(userCards.appealedAt)))
    .returning({ id: userCards.id });
  if (updated.length === 0) return { error: "already_sent" };

  try {
    await notifyStaff(["admin"], (lang) => ({ title: t(lang, "staff_card_appeal_title"), message: tf(lang, "staff_card_appeal_message", { name: user.name }) }));
  } catch (error) {
    console.error("[cards] could not alert the admins:", (error as Error).message);
  }
  revalidatePath("/profile");
  revalidatePath("/admin");
  return { success: true };
}

export async function revokeCardAction(cardId: string) {
  const admin = await assertAdmin();
  await revokeCard(cardId, admin.id);
  revalidatePath("/admin");
}

export async function keepCardAction(cardId: string) {
  await assertAdmin();
  await keepCardAfterAppeal(cardId);
  revalidatePath("/admin");
}

export async function liftSuspensionAction(userId: string) {
  await assertAdmin();
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (target) await liftSuspension(userId);
  revalidatePath("/admin");
}
