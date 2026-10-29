import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isOwnerEmail } from "@/lib/staff-config";

/**
 * Owner accounts (ADMIN_EMAILS) become admin as soon as the e-mail is confirmed. Requiring the
 * confirmation stops someone from registering the owner's e-mail first and getting the role.
 * No password ever goes through the environment, the chat or the repository.
 */
export async function promoteOwnerIfNeeded(user: { id: string; email: string; role: string; emailVerifiedAt: Date | null; deletedAt?: Date | null }) {
  if (user.role === "admin" || !user.emailVerifiedAt || user.deletedAt || !isOwnerEmail(user.email)) return false;
  await db.update(users).set({ role: "admin" }).where(and(eq(users.id, user.id), ne(users.role, "admin")));
  console.info(`[admin] ${user.email} promovido a admin (ADMIN_EMAILS).`);
  return true;
}
