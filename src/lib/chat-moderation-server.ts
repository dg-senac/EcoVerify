import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { communityChat, messageReports, users } from "@/db/schema";
import { analyzeProofWithGemini } from "@/lib/ai/gemini";
import { photoForAi } from "@/lib/ai/photo";
import { getAiSettings, willAnalyzeWithModel } from "@/lib/ai/pipeline";
import { CHAT_IMAGE_AI_MISSION, chatModText, type ChatHiddenReason, type ChatReportItem } from "@/lib/chat-moderation";
import { notifyStaff } from "@/lib/staff-alerts";
import { FILES_ROUTE_PREFIX, isValidStoragePath, readStoredFile } from "@/lib/storage";

/** True when chat images are checked by the AI before others see them. */
export async function chatImagesCheckedByAi(): Promise<boolean> {
  return willAnalyzeWithModel(await getAiSettings());
}

/** Hides a message for everybody but its author and alerts the staff (once). */
export async function hideChatMessage(messageId: string, reason: ChatHiddenReason): Promise<void> {
  const [row] = await db
    .update(communityChat)
    .set({ hiddenAt: new Date(), hiddenReason: reason })
    .where(and(eq(communityChat.id, messageId), isNull(communityChat.hiddenAt)))
    .returning({ userId: communityChat.userId });
  if (!row || reason === "staff") return;
  const [author] = await db.select({ name: users.name }).from(users).where(eq(users.id, row.userId));
  await notifyStaff(["moderator", "admin"], (lang) => {
    const text = chatModText(lang);
    return { title: text.staffHiddenTitle, message: text.staffHidden(author?.name ?? "?", text.hiddenBy[reason]) };
  });
}

/**
 * Checks a chat image with the vision model (run after the response). Others only see the image
 * once it is "ok". If the AI fails, the image is released: reports still protect the chat.
 */
export async function checkChatImage(messageId: string, mediaUrl: string): Promise<void> {
  let flagged = false;
  try {
    const [folder, fileName] = mediaUrl.slice(FILES_ROUTE_PREFIX.length).split("/");
    if (mediaUrl.startsWith(FILES_ROUTE_PREFIX) && folder && fileName && isValidStoragePath(folder, fileName)) {
      const file = await readStoredFile(folder, fileName);
      if (file) {
        const image = await photoForAi(Buffer.from(file.body));
        const { analysis } = await analyzeProofWithGemini({ image, mission: CHAT_IMAGE_AI_MISSION, report: "" });
        flagged = analysis.inappropriate === true;
      }
    }
  } catch (error) {
    console.error("[chat] image check failed", error);
  }
  await db.update(communityChat).set({ aiStatus: flagged ? "flagged" : "ok" }).where(eq(communityChat.id, messageId));
  if (flagged) await hideChatMessage(messageId, "ai");
}

/** Staff queue: messages with pending reports, or hidden by reports / the AI and not reviewed yet. */
export async function chatReportQueue(limit = 50): Promise<ChatReportItem[]> {
  const pendingIds = db
    .selectDistinct({ id: messageReports.messageId })
    .from(messageReports)
    .where(eq(messageReports.status, "pending"));
  const rows = await db
    .select({
      id: communityChat.id,
      userId: communityChat.userId,
      authorName: users.name,
      authorMutedUntil: users.chatMutedUntil,
      message: communityChat.message,
      messageType: communityChat.messageType,
      mediaUrl: communityChat.mediaUrl,
      createdAt: communityChat.createdAt,
      hiddenAt: communityChat.hiddenAt,
      hiddenReason: communityChat.hiddenReason,
    })
    .from(communityChat)
    .innerJoin(users, eq(users.id, communityChat.userId))
    .where(
      and(
        or(isNull(communityChat.deleteForEveryone), eq(communityChat.deleteForEveryone, false)),
        or(
          inArray(communityChat.id, pendingIds),
          and(isNotNull(communityChat.hiddenAt), inArray(communityChat.hiddenReason, ["reports", "ai"])),
        ),
      ),
    )
    .orderBy(desc(sql`${communityChat.hiddenAt} is not null`), desc(communityChat.createdAt))
    .limit(limit);
  if (rows.length === 0) return [];

  const reports = await db
    .select({
      messageId: messageReports.messageId,
      reason: messageReports.reasonCode,
      detail: messageReports.reason,
      reporterName: users.name,
      createdAt: messageReports.createdAt,
    })
    .from(messageReports)
    .innerJoin(users, eq(users.id, messageReports.reporterId))
    .where(and(inArray(messageReports.messageId, rows.map((r) => r.id)), eq(messageReports.status, "pending")))
    .orderBy(messageReports.createdAt);

  return rows.map((row) => ({
    messageId: row.id,
    authorId: row.userId,
    authorName: row.authorName,
    authorMutedUntil: row.authorMutedUntil?.toISOString() ?? null,
    text: row.message,
    messageType: row.messageType,
    mediaUrl: row.mediaUrl,
    createdAt: row.createdAt.toISOString(),
    hidden: !!row.hiddenAt,
    hiddenReason: (row.hiddenReason as ChatHiddenReason | null) ?? null,
    reports: reports
      .filter((r) => r.messageId === row.id)
      .map((r) => ({ reason: r.reason, detail: r.detail || null, reporterName: r.reporterName, createdAt: r.createdAt.toISOString() })),
  }));
}
