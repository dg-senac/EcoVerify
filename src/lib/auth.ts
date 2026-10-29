import "server-only";
import { isSeedEmail, seedAccountsAllowed } from "@/lib/staff-config";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "ecoverify_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type SessionUser = typeof users.$inferSelect;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const [session] = await db
    .insert(sessions)
    .values({ userId, expiresAt })
    .returning();

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  cookieStore.delete(SESSION_COOKIE);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  // Avoid a database error (invalid uuid) when the cookie was tampered with.
  if (!token || !UUID_PATTERN.test(token)) return null;

  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }
  // Banned users lose access to every page and server action immediately.
  if (row.user.isBanned) return null;
  // Seed accounts (known password) are switched off in production, even with an old session.
  if (isSeedEmail(row.user.email) && !seedAccountsAllowed()) return null;
  // Suspended (3rd yellow card) until the date passes: same as blocked, but temporary.
  if (row.user.suspendedUntil && row.user.suspendedUntil.getTime() > Date.now()) return null;

  return row.user;
}

/**
 * A person who was suspended or blocked while logged in still has the session cookie, but every page
 * sends them to /login with no explanation. This ends that session and returns the user id, so the
 * login page can show the reason and the appeal form (/conta-bloqueada) instead of a silent logout.
 */
export async function takeBlockedSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token || !UUID_PATTERN.test(token)) return null;

  const [row] = await db
    .select({ userId: users.id, isBanned: users.isBanned, suspendedUntil: users.suspendedUntil, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);
  if (!row || row.expiresAt.getTime() < Date.now()) return null;
  const suspended = !!row.suspendedUntil && row.suspendedUntil.getTime() > Date.now();
  if (!row.isBanned && !suspended) return null;

  // One-time: the next visit to /login is a normal login page (no redirect loop).
  await db.delete(sessions).where(eq(sessions.token, token));
  return row.userId;
}
