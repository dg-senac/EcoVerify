"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { communityChat, messageFavorites, messageReports, notifications, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isAllowedMediaUrl } from "@/lib/community";
import { rateLimit } from "@/lib/rate-limit";
export type ActionState = { error?: string };

const MESSAGE_TYPES = ["text", "image", "audio", "video", "gif"] as const;
type MessageType = (typeof MESSAGE_TYPES)[number];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMMUNITY_NOTIFICATION_TITLE = "Nova mensagem na comunidade";

export async function sendMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "citizen") return { error: "not_citizen" };

  if (!rateLimit(`chat:${user.id}`, 20, 60 * 1000)) {
    return { error: "too_many_messages" };
  }

  const message = String(formData.get("message") ?? "").trim();
  const messageType = String(formData.get("messageType") ?? "text") as MessageType;
  const mediaUrl = String(formData.get("mediaUrl") ?? "").trim() || null;
  const replyToIdRaw = String(formData.get("replyToId") ?? "").trim();

  if (!MESSAGE_TYPES.includes(messageType)) {
    return { error: "invalid" };
  }

  // Para mensagens de mídia, não requer texto
  if (messageType === "text" && !message) {
    return { error: "empty_message" };
  }
  if (messageType !== "text" && (!mediaUrl || !isAllowedMediaUrl(messageType, mediaUrl))) {
    return { error: "invalid" };
  }

  if (message && message.length > 1000) {
    return { error: "message_too_long" };
  }

  // The quoted text is read from the database instead of trusting the client,
  // so nobody can fake a reply quoting something another user never said.
  let replyToId: string | null = null;
  let replyToMessage: string | null = null;
  if (replyToIdRaw && UUID_PATTERN.test(replyToIdRaw)) {
    const [original] = await db
      .select({
        id: communityChat.id,
        message: communityChat.message,
        messageType: communityChat.messageType,
        deleteForEveryone: communityChat.deleteForEveryone,
      })
      .from(communityChat)
      .where(eq(communityChat.id, replyToIdRaw))
      .limit(1);
    if (original && !original.deleteForEveryone) {
      replyToId = original.id;
      replyToMessage = (original.message ?? `[${original.messageType}]`).slice(0, 200);
    }
  }

  await db.insert(communityChat).values({
    message: message || null,
    messageType,
    mediaUrl: messageType === "text" ? null : mediaUrl,
    replyToId,
    replyToMessage,
    userId: user.id,
  });

  // Notify other citizens with a single query (previously one INSERT per user per message).
  // Users that already have an unread community notification don't get another one.
  await db.execute(sql`
    insert into ${notifications} (user_id, type, title, message)
    select u.id, 'system', ${COMMUNITY_NOTIFICATION_TITLE}, 'Há novas mensagens no chat da comunidade.'
    from ${users} u
    where u.role = 'citizen'
      and u.is_banned = false
      and u.notifications_enabled = true
      and u.id <> ${user.id}
      and not exists (
        select 1 from ${notifications} n
        where n.user_id = u.id and n.is_read = false and n.title = ${COMMUNITY_NOTIFICATION_TITLE}
      )
  `);

  revalidatePath("/community");
  revalidatePath("/notifications");
  return {};
}

export async function editMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "citizen") return { error: "not_citizen" };

  const messageId = String(formData.get("messageId") ?? "");
  const newMessage = String(formData.get("message") ?? "").trim();

  if (!messageId || !newMessage) {
    return { error: "invalid" };
  }

  if (newMessage.length > 1000) {
    return { error: "message_too_long" };
  }

  // Verificar se a mensagem pertence ao usuário e se já foi editada
  const existingMessage = await db
    .select()
    .from(communityChat)
    .where(eq(communityChat.id, messageId))
    .limit(1);

  if (!existingMessage[0]) {
    return { error: "not_found" };
  }

  if (existingMessage[0].userId !== user.id) {
    return { error: "not_owner" };
  }

  if (existingMessage[0].editedAt) {
    return { error: "already_edited" };
  }

  await db
    .update(communityChat)
    .set({
      message: newMessage,
      editedAt: new Date(),
    })
    .where(eq(communityChat.id, messageId));

  revalidatePath("/community");
  return {};
}

export async function deleteMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "citizen") return { error: "not_citizen" };

  const messageId = String(formData.get("messageId") ?? "");
  const deleteForEveryone = formData.get("deleteForEveryone") === "true";

  if (!messageId) {
    return { error: "invalid" };
  }

  const existingMessage = await db
    .select()
    .from(communityChat)
    .where(eq(communityChat.id, messageId))
    .limit(1);

  if (!existingMessage[0]) {
    return { error: "not_found" };
  }

  if (existingMessage[0].userId !== user.id) {
    return { error: "not_owner" };
  }

  if (deleteForEveryone) {
    await db
      .update(communityChat)
      .set({
        deletedAt: new Date(),
        deletedBy: user.id,
        deleteForEveryone: true,
      })
      .where(eq(communityChat.id, messageId));
  } else {
    await db
      .update(communityChat)
      .set({
        deletedAt: new Date(),
        deletedBy: user.id,
        deleteForEveryone: false,
      })
      .where(eq(communityChat.id, messageId));
  }

  revalidatePath("/community");
  return {};
}

export async function toggleFavoriteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "citizen") return { error: "not_citizen" };

  const messageId = String(formData.get("messageId") ?? "");

  if (!messageId) {
    return { error: "invalid" };
  }

  const existingFavorite = await db
    .select()
    .from(messageFavorites)
    .where(
      and(
        eq(messageFavorites.messageId, messageId),
        eq(messageFavorites.userId, user.id)
      )
    )
    .limit(1);

  if (existingFavorite[0]) {
    await db
      .delete(messageFavorites)
      .where(eq(messageFavorites.id, existingFavorite[0].id));
  } else {
    await db.insert(messageFavorites).values({
      messageId,
      userId: user.id,
    });
  }

  revalidatePath("/community");
  return {};
}

export async function reportMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "citizen") return { error: "not_citizen" };

  const messageId = String(formData.get("messageId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!messageId || !reason || reason.length > 200) {
    return { error: "invalid" };
  }

  // Verificar se já denunciou
  const existingReport = await db
    .select()
    .from(messageReports)
    .where(
      and(
        eq(messageReports.messageId, messageId),
        eq(messageReports.reporterId, user.id)
      )
    )
    .limit(1);

  if (existingReport[0]) {
    return { error: "already_reported" };
  }

  await db.insert(messageReports).values({
    messageId,
    reporterId: user.id,
    reason,
  });

  revalidatePath("/community");
  return {};
}
