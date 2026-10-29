import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";
import type { Lang } from "@/lib/i18n";

type StaffRole = "moderator" | "admin";

/**
 * Sends an in-app alert to the platform staff (each one in their own language).
 * Work alerts ignore the "notifications enabled" preference: someone has to act on them.
 */
export async function notifyStaff(roles: StaffRole[], build: (lang: Lang) => { title: string; message: string }): Promise<number> {
  const staff = await db
    .select({ id: users.id, language: users.language })
    .from(users)
    .where(and(inArray(users.role, roles), eq(users.isBanned, false), isNull(users.deletedAt)));
  if (staff.length === 0) return 0;
  await db.insert(notifications).values(
    staff.map((member) => {
      const { title, message } = build(member.language);
      return { userId: member.id, type: "alert" as const, title: title.slice(0, 200), message };
    }),
  );
  return staff.length;
}
