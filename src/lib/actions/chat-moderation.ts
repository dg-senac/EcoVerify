"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { communityChat, messageReports, notifications, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { CARD_NOTE_MIN } from "@/lib/cards";
import { issueCard } from "@/lib/cards-server";
import { chatModText, isChatMuteHours } from "@/lib/chat-moderation";
import { canReview } from "@/lib/nav";
import { moderatorsEnabled } from "@/lib/staff-config";
import { formatDate } from "@/lib/utils";

export type ChatModState = { error?: string };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function assertStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canReview(user.role, moderatorsEnabled())) redirect("/missions");
  return user;
}

function refresh() {
  revalidatePath("/moderation");
  revalidatePath("/admin");
  revalidatePath("/community");
}

/**
 * Staff decision on a reported / hidden message.
 * keep → visible again, reports dismissed. remove → hidden for good, reports upheld, author told;
 * with `cardNote` the author also gets a yellow card ("Ofensa na comunidade").
 */
export async function reviewChatMessageAction(messageId: string, decision: "keep" | "remove", cardNote?: string): Promise<ChatModState> {
  const staff = await assertStaff();
  if (!UUID_PATTERN.test(messageId) || (decision !== "keep" && decision !== "remove")) return { error: "invalid" };
  const note = cardNote?.trim() ?? "";
  if (cardNote !== undefined && note.length < CARD_NOTE_MIN) return { error: "card_note_short" };

  const [message] = await db
    .select({ userId: communityChat.userId, hiddenAt: communityChat.hiddenAt })
    .from(communityChat)
    .where(eq(communityChat.id, messageId))
    .limit(1);
  if (!message) return { error: "not_found" };

  if (decision === "keep") {
    await db.update(communityChat).set({ hiddenAt: null, hiddenReason: null, aiStatus: "ok" }).where(eq(communityChat.id, messageId));
    await db
      .update(messageReports)
      .set({ status: "dismissed" })
      .where(and(eq(messageReports.messageId, messageId), eq(messageReports.status, "pending")));
    refresh();
    return {};
  }

  await db
    .update(communityChat)
    .set({ hiddenAt: message.hiddenAt ?? new Date(), hiddenReason: "staff" })
    .where(eq(communityChat.id, messageId));
  await db
    .update(messageReports)
    .set({ status: "upheld" })
    .where(and(eq(messageReports.messageId, messageId), eq(messageReports.status, "pending")));

  const [author] = await db.select({ language: users.language }).from(users).where(eq(users.id, message.userId));
  if (author) {
    const text = chatModText(author.language);
    await db.insert(notifications).values({ userId: message.userId, type: "alert", title: text.removedTitle, message: text.removed });
  }
  if (note && message.userId !== staff.id) {
    await issueCard({ userId: message.userId, type: "yellow", reason: "chat_offense", note, issuerId: staff.id });
  }
  refresh();
  return {};
}

/** Admin: mute someone in the chat (they can still read). hours = 0 lifts the mute. */
export async function muteChatUserAction(userId: string, hours: number): Promise<ChatModState> {
  const staff = await assertStaff();
  if (staff.role !== "admin") return { error: "forbidden" };
  if (!UUID_PATTERN.test(userId) || userId === staff.id) return { error: "invalid" };
  if (hours !== 0 && !isChatMuteHours(hours)) return { error: "invalid" };

  const until = hours === 0 ? null : new Date(Date.now() + hours * 60 * 60 * 1000);
  const [target] = await db
    .update(users)
    .set({ chatMutedUntil: until })
    .where(eq(users.id, userId))
    .returning({ language: users.language });
  if (!target) return { error: "not_found" };
  if (until) {
    const text = chatModText(target.language);
    await db.insert(notifications).values({
      userId,
      type: "alert",
      title: text.mutedTitle,
      message: text.mutedMsg(formatDate(until, target.language)),
    });
  }
  refresh();
  return {};
}
