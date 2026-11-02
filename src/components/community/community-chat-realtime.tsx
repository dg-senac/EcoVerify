"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n";
import type { CommunityFeed } from "@/lib/community";
import { CommunityChat } from "./community-chat";
import { useRealtimeMessages } from "./use-realtime-messages";

interface CommunityChatRealtimeProps {
  lang: Lang;
  initial: CommunityFeed;
  currentUserId: string;
  currentUserName: string;
}

export function CommunityChatRealtime({ lang, initial, currentUserId, currentUserName }: CommunityChatRealtimeProps) {
  const [feed, setFeed] = useState(initial);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set(initial.favoriteIds));
  const { shouldRefresh } = useRealtimeMessages(5000); // refresh every 5 seconds

  const organizationId = initial.organizationId;
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/community/messages?org=${encodeURIComponent(organizationId)}`, { cache: "no-store" });
      if (response.ok) {
        const data = (await response.json()) as CommunityFeed;
        setFeed(data);
        setFavoriteIds(new Set(data.favoriteIds));
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, [organizationId]);

  useEffect(() => {
    // The server already rendered the latest messages: only poll from the first tick on.
    if (shouldRefresh === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMessages();
  }, [shouldRefresh, fetchMessages]);

  return (
    <CommunityChat
      lang={lang}
      organizationId={organizationId}
      messages={feed.messages}
      currentUserId={currentUserId}
      currentUserName={currentUserName}
      favoriteMessageIds={favoriteIds}
      blocked={feed.blocked}
      chatMutedUntil={feed.chatMutedUntil}
      adult={feed.adult}
      onChanged={fetchMessages}
    />
  );
}
