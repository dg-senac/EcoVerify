"use server";

import { redirect } from "next/navigation";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isUniqueViolation, safeNextPath } from "@/lib/utils";
import { headers } from "next/headers";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { isSeedEmail, seedAccountsAllowed } from "@/lib/staff-config";
import { promoteOwnerIfNeeded } from "@/lib/admin-bootstrap";
import { sendVerificationEmail } from "@/lib/account-email";
import { createAuthToken } from "@/lib/auth-tokens";
import { isSuspended } from "@/lib/cards";
import { TERMS_VERSION } from "@/lib/legal";
import { DEFAULT_LANG, isLang } from "@/lib/i18n";

export type ActionState = { error?: string; success?: boolean };

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIFTEEN_MINUTES = 15 * 60 * 1000;

async function clientIp() {
  const headerList = await headers();
  return headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "invalid" };
  }

  // Brute-force protection: per e-mail and per IP.
  const ip = await clientIp();
  const emailKey = `login:email:${email}`;
  if (!rateLimit(emailKey, 8, FIFTEEN_MINUTES) || !rateLimit(`login:ip:${ip}`, 30, FIFTEEN_MINUTES)) {
    return { error: "too_many_attempts" };
  }

  // Seed accounts have a public password: never usable in production (ALLOW_SEED_ACCOUNTS overrides).
  if (isSeedEmail(email) && !seedAccountsAllowed()) {
    return { error: "invalid" };
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return { error: "invalid" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "invalid" };
  }
  resetRateLimit(emailKey);

  if (user.isBanned || isSuspended(user.suspendedUntil)) {
    // No session: a short-lived token only lets the person read the reason and appeal.
    const token = await createAuthToken(user.id, "ban_appeal");
    redirect(`/conta-bloqueada?t=${token}`);
  }

  const promoted = await promoteOwnerIfNeeded(user);
  await createSession(user.id);
  redirect(safeNextPath(formData.get("next")) ?? (promoted || user.role === "admin" ? "/admin" : "/missions"));
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || name.length > 200 || !EMAIL_PATTERN.test(email) || email.length > 255) {
    return { error: "invalid" };
  }
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
    return { error: "weak_password" };
  }
  // LGPD: explicit acceptance of the Terms/Privacy Policy and minimum age (guardian if under 18).
  if (formData.get("acceptTerms") !== "on") return { error: "terms_required" };
  if (formData.get("ageConfirm") !== "on") return { error: "age_required" };
  const rawLanguage = formData.get("language");
  const language = isLang(rawLanguage) ? rawLanguage : DEFAULT_LANG;

  // Limits mass account creation (multiple accounts = multiple rewards).
  if (!rateLimit(`register:ip:${await clientIp()}`, 5, 60 * 60 * 1000)) {
    return { error: "too_many_attempts" };
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return { error: "email_exists" };
  }

  const passwordHash = await hashPassword(password);
  let user: typeof users.$inferSelect;
  try {
    [user] = await db
      .insert(users)
      .values({ name, email, passwordHash, language, termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION })
      .returning();
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "email_exists" };
    throw error;
  }

  await createSession(user.id);
  // A failure to send must not block the sign-up: the user can resend from Settings.
  await sendVerificationEmail(user).catch((error) => console.error("[email] verification", error));
  redirect(safeNextPath(formData.get("next")) ?? (PAYMENTS_ENABLED ? "/wallet-setup" : "/missions"));
}

export async function logoutAction() {
  "use server";
  await destroySession();
  redirect("/login");
}
