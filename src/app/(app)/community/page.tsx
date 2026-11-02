import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isParticipant } from "@/lib/nav";
import { redirect } from "next/navigation";
import { homeFor } from "@/lib/nav";
import { moderatorsEnabled } from "@/lib/staff-config";
import { communitiesOf, fetchCommunityMessages } from "@/lib/community";
import { t, tf } from "@/lib/i18n";
import { CommunityChatRealtime } from "@/components/community/community-chat-realtime";

/**
 * Community = the chat of an organization. Each organization has its own, only for its members.
 * People in more than one organization switch between them; people in none are invited to join or
 * create one (the tab itself is hidden for them, see the app layout).
 */
export default async function CommunityPage({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isParticipant(user.role)) redirect(homeFor(user.role, moderatorsEnabled()));
  const lang = user.language;

  const [{ org: slug }, communities] = await Promise.all([searchParams, communitiesOf(user.id)]);

  if (communities.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t(lang, "nav_community")}</h1>
        <div
          className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center card-surface"
          data-testid="community-no-org"
        >
          <div className="text-5xl">💬</div>
          <h2 className="mt-3 text-lg font-bold text-slate-900">{t(lang, "community_no_org_title")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{t(lang, "community_no_org_text")}</p>
          <Link
            href="/org"
            className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md"
          >
            {t(lang, "community_no_org_cta")}
          </Link>
        </div>
      </div>
    );
  }

  const current = communities.find((community) => community.slug === slug) ?? communities[0];
  const feed = await fetchCommunityMessages(user.id, current.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t(lang, "nav_community")}</h1>
      <p className="mt-1 text-sm text-slate-500">{tf(lang, "community_subtitle", { org: current.name })}</p>

      {communities.length > 1 && (
        <nav aria-label={t(lang, "community_pick")} className="mt-4 flex gap-2 overflow-x-auto pb-1" data-testid="community-switch">
          {communities.map((community) => {
            const active = community.id === current.id;
            return (
              <Link
                key={community.id}
                href={`/community?org=${encodeURIComponent(community.slug)}`}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  active ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {community.name}
              </Link>
            );
          })}
        </nav>
      )}

      <CommunityChatRealtime
        key={current.id}
        lang={lang}
        initial={feed}
        currentUserId={user.id}
        currentUserName={user.name}
      />
    </div>
  );
}
