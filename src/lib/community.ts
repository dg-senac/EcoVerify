import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { communityChat, messageFavorites, users } from "@/db/schema";

const MESSAGE_LIMIT = 50;

/**
 * Latest community messages (oldest → newest for display) plus the user's favorites.
 *
 * Content of messages deleted "for everyone" is stripped on the server, so it never
 * reaches the browser (previously the text was still present in the JSON).
 */
export async function fetchCommunityMessages(userId: string) {
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
    })
    .from(communityChat)
    .leftJoin(users, eq(communityChat.userId, users.id))
    .orderBy(desc(communityChat.createdAt))
    .limit(MESSAGE_LIMIT);

  const messages = latest.reverse().map((message) =>
    message.deletedAt && message.deleteForEveryone
      ? { ...message, message: null, mediaUrl: null, replyToMessage: null }
      : message,
  );

  const favorites = await db
    .select({ messageId: messageFavorites.messageId })
    .from(messageFavorites)
    .where(eq(messageFavorites.userId, userId));

  return { messages, favoriteIds: favorites.map((favorite) => favorite.messageId) };
}

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
