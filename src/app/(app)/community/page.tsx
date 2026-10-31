import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/nav";
import { moderatorsEnabled } from "@/lib/staff-config";
import { fetchCommunityMessages } from "@/lib/community";
import { t } from "@/lib/i18n";
import { CommunityChatRealtime } from "@/components/community/community-chat-realtime";

export default async function CommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "citizen") redirect(homeFor(user.role, moderatorsEnabled()));

  const { messages, favoriteIds } = await fetchCommunityMessages(user.id);
  const favoriteMessageIds = new Set(favoriteIds);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t(user.language, "nav_community")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t(user.language, "community_subtitle")}</p>

      <CommunityChatRealtime
        lang={user.language}
        initialMessages={messages}
        currentUserId={user.id}
        currentUserName={user.name}
        initialFavoriteIds={favoriteMessageIds}
      />
    </div>
  );
}