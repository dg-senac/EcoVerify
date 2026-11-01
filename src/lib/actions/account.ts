"use server";

import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import {
  authTokens,
  chatBlocks,
  communityChat,
  messageFavorites,
  messageReports,
  missionRequests,
  missionSuggestions,
  notifications,
  rewardQueue,
  sessions,
  submissions,
  users,
} from "@/db/schema";
import { SESSION_COOKIE, getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import type { ActionState } from "@/lib/actions/auth";
import { REGION_COOKIE } from "@/lib/regional/cookie";
import { sendVerificationEmail } from "@/lib/account-email";
import { consumeAuthToken, createAuthToken } from "@/lib/auth-tokens";
import { appUrl, buildAccountEmail, emailMode, sendEmail } from "@/lib/email";
import { TERMS_VERSION } from "@/lib/legal";
import { rateLimit } from "@/lib/rate-limit";
import { deleteStoredFile } from "@/lib/storage";

const MIN_PASSWORD_LENGTH = 8;
const HOUR = 60 * 60 * 1000;

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

async function clientIp() {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
}

export async function resendVerificationAction(): Promise<ActionState> {
  const user = await requireUser();
  if (user.emailVerifiedAt) return { success: true };
  if (emailMode() === "off") return { error: "email_unavailable" };
  if (!rateLimit(`verify-email:${user.id}`, 3, HOUR)) return { error: "too_many_attempts" };
  const sent = await sendVerificationEmail(user);
  return sent ? { success: true } : { error: "email_failed" };
}

export async function requestPasswordResetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return { error: "invalid" };
  if (emailMode() === "off") return { error: "email_unavailable" };
  if (!rateLimit(`reset:ip:${await clientIp()}`, 10, HOUR)) return { error: "too_many_attempts" };

  // Same answer whether the account exists or not (doesn't reveal who is registered).
  if (rateLimit(`reset:email:${email}`, 3, HOUR)) {
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, language: users.language })
      .from(users)
      .where(and(eq(users.email, email), eq(users.isBanned, false), isNull(users.deletedAt)))
      .limit(1);
    const base = appUrl();
    if (user && base) {
      const token = await createAuthToken(user.id, "reset_password");
      await sendEmail(buildAccountEmail("reset", user.language, user.name, `${base}/reset-password?token=${token}`, user.email));
    }
  }
  return { success: true };
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) return { error: "weak_password" };
  if (password !== confirm) return { error: "password_mismatch" };
  if (!rateLimit(`reset-submit:ip:${await clientIp()}`, 20, HOUR)) return { error: "too_many_attempts" };

  const userId = await consumeAuthToken(token, "reset_password");
  if (!userId) return { error: "invalid_token" };

  const passwordHash = await hashPassword(password);
  const [target] = await db.select({ emailVerifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.id, userId)).limit(1);
  await db
    .update(users)
    // Opening the link proves access to the inbox, so the e-mail counts as confirmed.
    .set({ passwordHash, emailVerifiedAt: target?.emailVerifiedAt ?? new Date() })
    .where(eq(users.id, userId));
  // Log out every device (someone else may have had the old password).
  await db.delete(sessions).where(eq(sessions.userId, userId));
  redirect("/login?reset=1");
}

export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const current = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");
  if (!rateLimit(`change-password:${user.id}`, 5, 15 * 60 * 1000)) return { error: "too_many_attempts" };
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "wrong_password" };
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) return { error: "weak_password" };
  if (password !== confirm) return { error: "password_mismatch" };

  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, user.id));
  // Keep this device logged in, end the others.
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.token, token)));
  return { success: true };
}

export async function acceptTermsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (formData.get("accept") !== "on") return { error: "terms_required" };
  await db.update(users).set({ termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION }).where(eq(users.id, user.id));
  redirect("/missions");
}

/**
 * LGPD "eliminação": the account is anonymised instead of hard-deleted.
 *
 * Removed: name, e-mail, password, wallet data, 18+ declaration, notifications, sessions,
 * favourites/reports, chat contents (and quotes of them in other people's replies),
 * proof photos, report text and GPS, pending submissions and unpaid rewards.
 * Kept without identification (legal/anti-fraud records, LGPD art. 16): approved/rejected
 * submissions (no photo/text/GPS), the photo hash (blocks reuse of the same photo), points
 * ledger and payouts already made (amount, wallet and transaction are public on the blockchain).
 */
export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const password = String(formData.get("password") ?? "");
  if (formData.get("confirm") !== "on") return { error: "confirm_required" };
  if (!rateLimit(`delete-account:${user.id}`, 5, 15 * 60 * 1000)) return { error: "too_many_attempts" };
  if (!(await verifyPassword(password, user.passwordHash))) return { error: "wrong_password" };

  if (user.role === "admin") {
    const otherAdmins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), ne(users.id, user.id), eq(users.isBanned, false), isNull(users.deletedAt)))
      .limit(1);
    if (!otherAdmins.length) return { error: "last_admin" };
  }

  const unusablePassword = await hashPassword(crypto.randomBytes(32).toString("hex"));
  const files = await db.transaction(async (tx) => {
    const ownSubmissions = await tx
      .select({ id: submissions.id, photoUrl: submissions.photoUrl })
      .from(submissions)
      .where(eq(submissions.userId, user.id));
    const ownMessages = await tx
      .select({ id: communityChat.id, mediaUrl: communityChat.mediaUrl })
      .from(communityChat)
      .where(eq(communityChat.userId, user.id));

    await tx
      .delete(rewardQueue)
      .where(and(eq(rewardQueue.userId, user.id), inArray(rewardQueue.status, ["pending", "processing", "failed"])));
    await tx.delete(submissions).where(and(eq(submissions.userId, user.id), eq(submissions.status, "pending")));
    await tx
      .update(submissions)
      .set({
        photoUrl: "",
        report: "[removido a pedido do titular]",
        latitude: null,
        longitude: null,
        // The AI description and the appeal text describe the photo/the person: removed too.
        aiSummary: null,
        aiChecks: null,
        appealMessage: null,
      })
      .where(eq(submissions.userId, user.id));

    if (ownMessages.length) {
      const ids = ownMessages.map((m) => m.id);
      await tx.update(communityChat).set({ replyToMessage: null }).where(inArray(communityChat.replyToId, ids));
    }
    await tx
      .update(communityChat)
      .set({ message: null, mediaUrl: null, replyToMessage: null, deletedAt: new Date(), deleteForEveryone: true })
      .where(eq(communityChat.userId, user.id));
    await tx.delete(messageFavorites).where(eq(messageFavorites.userId, user.id));
    await tx.delete(messageReports).where(eq(messageReports.reporterId, user.id));
    await tx.delete(chatBlocks).where(or(eq(chatBlocks.blockerId, user.id), eq(chatBlocks.blockedId, user.id)));
    await tx.delete(missionRequests).where(eq(missionRequests.userId, user.id));
    // Approved suggestions became public missions and stay (the link to the person is anonymised with the account).
    await tx
      .delete(missionSuggestions)
      .where(and(eq(missionSuggestions.userId, user.id), ne(missionSuggestions.status, "approved")));
    await tx.delete(notifications).where(eq(notifications.userId, user.id));
    await tx.delete(authTokens).where(eq(authTokens.userId, user.id));
    await tx.delete(sessions).where(eq(sessions.userId, user.id));

    await tx
      .update(users)
      .set({
        name: "Conta excluída",
        email: `deleted-${user.id}@deleted.invalid`,
        passwordHash: unusablePassword,
        totalPoints: 0,
        walletAddress: null,
        walletVerifiedAt: null,
        // walletVerificationTx is kept: a public on-chain hash that must not prove another account.
        pendingWalletAddress: null,
        walletChallengeAmount: null,
        walletChallengeCreatedAt: null,
        walletChallengeTx: null,
        adultDeclaredAt: null,
        emailVerifiedAt: null,
        notificationsEnabled: false,
        isBanned: true,
        banReason: "Conta excluída pelo titular",
        deletedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return [...ownSubmissions.map((s) => s.photoUrl), ...ownMessages.map((m) => m.mediaUrl)];
  });

  await Promise.all(files.map((url) => deleteStoredFile(url)));
  (await cookies()).delete(SESSION_COOKIE);
  (await cookies()).delete(REGION_COOKIE);
  redirect("/login?deleted=1");
}
