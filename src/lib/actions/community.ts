"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { chatBlocks, communityChat, messageFavorites, messageReports, notifications, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isAllowedMediaUrl } from "@/lib/community";
import { rateLimit } from "@/lib/rate-limit";
import {
  CHAT_REPORT_DETAIL_MAX,
  canSendChatMedia,
  chatTextIssue,
  isChatMuted,
  isChatReportReason,
  shouldHideForReports,
} from "@/lib/chat-moderation";
import { chatImagesCheckedByAi, checkChatImage, hideChatMessage } from "@/lib/chat-moderation-server";
export type ActionState = { error?: string };

const MESSAGE_TYPES = ["text", "image", "audio", "video", "gif"] as const;
type MessageType = (typeof MESSAGE_TYPES)[number];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COMMUNITY_NOTIFICATION_TITLE = "Nova mensagem na comunidade";

export async function sendMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "citizen") return { error: "not_citizen" };
  if (isChatMuted(user.chatMutedUntil)) return { error: "muted" };

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
  // Safety rules (src/lib/chat-moderation.ts): no contact data or links; audio/video only 18+.
  const textIssue = chatTextIssue(message);
  if (textIssue) return { error: textIssue };
  if (!canSendChatMedia(messageType, !!user.adultDeclaredAt)) return { error: "adult_media" };

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

  const checkImage = messageType === "image" && (await chatImagesCheckedByAi());
  const [created] = await db
    .insert(communityChat)
    .values({
      message: message || null,
      messageType,
      mediaUrl: messageType === "text" ? null : mediaUrl,
      replyToId,
      replyToMessage,
      userId: user.id,
      aiStatus: checkImage ? "checking" : null,
    })
    .returning({ id: communityChat.id });
  // Others only see the image after the AI checks it (an inappropriate one is hidden + staff alert).
  if (checkImage && created && mediaUrl) after(() => checkChatImage(created.id, mediaUrl));

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
  const textIssue = chatTextIssue(newMessage);
  if (textIssue) return { error: textIssue };

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

/**
 * Report with a reason. Enough different people reporting (3, or 2 for sexual content/violence)
 * hide the message at once; the staff then keeps or removes it (Moderation → Chat reports).
 */
export async function reportMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "citizen") return { error: "not_citizen" };

  const messageId = String(formData.get("messageId") ?? "");
  const reasonCode = String(formData.get("reasonCode") ?? "");
  const detail = String(formData.get("reason") ?? "").trim();

  if (!UUID_PATTERN.test(messageId) || !isChatReportReason(reasonCode) || detail.length > CHAT_REPORT_DETAIL_MAX) {
    return { error: "invalid" };
  }
  if (!rateLimit(`chat-report:${user.id}`, 10, 60 * 60 * 1000)) return { error: "too_many_messages" };

  const [target] = await db
    .select({ userId: communityChat.userId, hiddenAt: communityChat.hiddenAt })
    .from(communityChat)
    .where(eq(communityChat.id, messageId))
    .limit(1);
  if (!target) return { error: "not_found" };
  if (target.userId === user.id) return { error: "invalid" };

  const inserted = await db
    .insert(messageReports)
    .values({ messageId, reporterId: user.id, reason: detail, reasonCode })
    .onConflictDoNothing()
    .returning({ id: messageReports.id });
  if (inserted.length === 0) return { error: "already_reported" };

  if (!target.hiddenAt) {
    const reports = await db
      .select({ reason: messageReports.reasonCode })
      .from(messageReports)
      .where(and(eq(messageReports.messageId, messageId), eq(messageReports.status, "pending")));
    if (shouldHideForReports(reports.map((r) => r.reason))) await hideChatMessage(messageId, "reports");
  }

  revalidatePath("/community");
  return {};
}

/** Personal block: stop seeing someone's messages (they are not told). */
export async function blockChatUserAction(blockedId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "citizen") return { error: "not_citizen" };
  if (!UUID_PATTERN.test(blockedId) || blockedId === user.id) return { error: "invalid" };
  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, blockedId)).limit(1);
  if (!target) return { error: "not_found" };
  await db.insert(chatBlocks).values({ blockerId: user.id, blockedId }).onConflictDoNothing();
  revalidatePath("/community");
  return {};
}

export async function unblockChatUserAction(blockedId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!UUID_PATTERN.test(blockedId)) return { error: "invalid" };
  await db.delete(chatBlocks).where(and(eq(chatBlocks.blockerId, user.id), eq(chatBlocks.blockedId, blockedId)));
  revalidatePath("/community");
  return {};
}
