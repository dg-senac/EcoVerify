import "server-only";
import { and, desc, eq, isNull, notInArray, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { chatBlocks, communityChat, messageFavorites, users } from "@/db/schema";

const MESSAGE_LIMIT = 50;

/**
 * Latest community messages (oldest → newest for display) plus the user's favorites, blocks and
 * mute. Everything sensitive is decided here, so it never reaches the browser:
 *
 * - content of messages deleted "for everyone" is stripped;
 * - hidden messages (reports / AI / staff) only reach their author, flagged as hidden;
 * - messages of people the user blocked are left out;
 * - an image still being checked by the AI is only shown to its author.
 */
export async function fetchCommunityMessages(userId: string) {
  const [blocked, [me]] = await Promise.all([
    db
      .select({ id: chatBlocks.blockedId, name: users.name })
      .from(chatBlocks)
      .innerJoin(users, eq(users.id, chatBlocks.blockedId))
      .where(eq(chatBlocks.blockerId, userId)),
    db.select({ chatMutedUntil: users.chatMutedUntil, adultDeclaredAt: users.adultDeclaredAt }).from(users).where(eq(users.id, userId)),
  ]);

  const filters: SQL[] = [or(isNull(communityChat.hiddenAt), eq(communityChat.userId, userId))!];
  if (blocked.length > 0) filters.push(notInArray(communityChat.userId, blocked.map((b) => b.id)));

  const latest = await db
    .select({
      id: communityChat.id,
      message: communityChat.message,
      messageType: communityChat.messageType,
      mediaUrl: communityChat.mediaUrl,
      replyToId: communityChat.replyToId,
      replyToMessage: communityChat.replyToMessage,
      userId: communityChat.userId,
      userName: users.name,
      createdAt: communityChat.createdAt,
      editedAt: communityChat.editedAt,
      deletedAt: communityChat.deletedAt,
      deleteForEveryone: communityChat.deleteForEveryone,
      hiddenAt: communityChat.hiddenAt,
      aiStatus: communityChat.aiStatus,
    })
    .from(communityChat)
    .leftJoin(users, eq(communityChat.userId, users.id))
    .where(and(...filters))
    .orderBy(desc(communityChat.createdAt))
    .limit(MESSAGE_LIMIT);

  const messages = latest.reverse().map(({ hiddenAt, aiStatus, ...message }) => {
    const own = message.userId === userId;
    const base = { ...message, hidden: !!hiddenAt, checking: aiStatus === "checking" };
    if (message.deletedAt && message.deleteForEveryone) return { ...base, message: null, mediaUrl: null, replyToMessage: null };
    if (base.checking && !own) return { ...base, mediaUrl: null };
    return base;
  });

  const favorites = await db
    .select({ messageId: messageFavorites.messageId })
    .from(messageFavorites)
    .where(eq(messageFavorites.userId, userId));

  return {
    messages,
    favoriteIds: favorites.map((favorite) => favorite.messageId),
    blocked: blocked.map((b) => ({ id: b.id, name: b.name })),
    chatMutedUntil: me?.chatMutedUntil?.toISOString() ?? null,
    adult: !!me?.adultDeclaredAt,
  };
}

export type CommunityFeed = Awaited<ReturnType<typeof fetchCommunityMessages>>;
export type CommunityMessage = CommunityFeed["messages"][number];

const MEDIA_PATTERNS: Record<string, RegExp> = {
  image: /^\/api\/files\/image\/[a-zA-Z0-9-]+\.[a-z0-9]{2,5}$/,
  audio: /^\/api\/files\/audio\/[a-zA-Z0-9-]+\.[a-z0-9]{2,5}$/,
  video: /^\/api\/files\/video\/[a-zA-Z0-9-]+\.[a-z0-9]{2,5}$/,
  gif: /^https:\/\/media[0-9]?\.giphy\.com\/[A-Za-z0-9/_.\-?=&]+$/,
};

/** Media URLs must point to our own upload route (or Giphy for GIFs), never arbitrary sites. */
export function isAllowedMediaUrl(messageType: string, url: string) {
  return MEDIA_PATTERNS[messageType]?.test(url) ?? false;
}
