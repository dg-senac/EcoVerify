"use client";

import { useRouter } from "next/navigation";
import { muteChatUserAction, reviewChatMessageAction } from "@/lib/actions/chat-moderation";
import type { ChatReportItem } from "@/lib/chat-moderation";
import type { Lang } from "@/lib/i18n";
import { ChatReportsPanel } from "@/components/community/chat-reports-panel";

/** Web binding of the shared chat reports queue to the server actions. */
export function ChatReportsWeb({ lang, items, isAdmin }: { lang: Lang; items: ChatReportItem[]; isAdmin: boolean }) {
  const router = useRouter();
  async function done<T extends { error?: string }>(promise: Promise<T>): Promise<T> {
    const result = await promise;
    if (!result.error) router.refresh();
    return result;
  }
  return (
    <ChatReportsPanel
      lang={lang}
      items={items}
      isAdmin={isAdmin}
      onKeep={(id) => done(reviewChatMessageAction(id, "keep"))}
      onRemove={(id, note) => done(reviewChatMessageAction(id, "remove", note))}
      onMute={(userId, hours) => done(muteChatUserAction(userId, hours))}
    />
  );
}
