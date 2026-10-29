"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function markNotificationReadAction(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Only the owner can mark it (the id alone would let anyone change other people's notifications).
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)));

  // "layout" also refreshes the unread badge in the menu.
  revalidatePath("/notifications", "layout");
}

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));

  revalidatePath("/notifications", "layout");
}
