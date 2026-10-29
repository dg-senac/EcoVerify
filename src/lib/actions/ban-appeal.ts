"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { peekAuthTokenUser } from "@/lib/auth-tokens";
import { rateLimit } from "@/lib/rate-limit";
import { notifyStaff } from "@/lib/staff-alerts";
import { t, tf } from "@/lib/i18n";

export type BanAppealState = { error?: "expired" | "too_short" | "already_sent" | "too_many_attempts"; success?: boolean };

/** Keep in sync with the form (components/auth/ban-appeal-form.tsx). */
const BAN_APPEAL_MIN = 20;
const BAN_APPEAL_MAX = 1500;

/**
 * Appeal of a blocked account. The person has no session (banned users never get one): the
 * short-lived "ban_appeal" token, created when they typed the right password, identifies them.
 * One appeal per block; the admins are alerted and read it in Admin → Users.
 */
export async function submitBanAppealAction(_prev: BanAppealState, formData: FormData): Promise<BanAppealState> {
  const token = String(formData.get("token") ?? "");
  const message = String(formData.get("message") ?? "").trim();

  const userId = token.length <= 128 ? await peekAuthTokenUser(token, "ban_appeal") : null;
  if (!userId) return { error: "expired" };
  if (!rateLimit(`ban-appeal:${userId}`, 5, 60 * 60 * 1000)) return { error: "too_many_attempts" };
  if (message.length < BAN_APPEAL_MIN) return { error: "too_short" };

  const updated = await db
    .update(users)
    .set({ banAppealMessage: message.slice(0, BAN_APPEAL_MAX), banAppealedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.isBanned, true), isNull(users.banAppealedAt), isNull(users.deletedAt)))
    .returning({ name: users.name });
  if (updated.length === 0) return { error: "already_sent" };

  try {
    await notifyStaff(["admin"], (lang) => ({
      title: t(lang, "staff_ban_appeal_title"),
      message: tf(lang, "staff_ban_appeal_message", { name: updated[0].name }),
    }));
  } catch (error) {
    console.error("[ban-appeal] could not alert the admins:", (error as Error).message);
  }
  revalidatePath("/admin");
  return { success: true };
}
