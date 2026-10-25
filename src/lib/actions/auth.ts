"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isUniqueViolation } from "@/lib/utils";
import { headers } from "next/headers";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";

export type ActionState = { error?: string };

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

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return { error: "invalid" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { error: "invalid" };
  }
  resetRateLimit(emailKey);

  if (user.isBanned) {
    return { error: "banned" };
  }

  await createSession(user.id);
  redirect("/missions");
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
    [user] = await db.insert(users).values({ name, email, passwordHash }).returning();
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "email_exists" };
    throw error;
  }

  await createSession(user.id);
  redirect("/wallet-setup");
}

export async function logoutAction() {
  "use server";
  await destroySession();
  redirect("/login");
}
