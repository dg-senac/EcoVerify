import Link from "next/link";
import { and, desc, eq, gt, isNull, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { citizenOnly } from "@/lib/role-guard";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { RANKING_LIMIT, rankingTab } from "@/lib/seasons";
import { loadSeasonBoard } from "@/lib/seasons-server";
import { SeasonBoard } from "@/components/ranking/season-board";
import { Trophy } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  citizenOnly(user.role);
  const query = await searchParams;
  const now = new Date();

  const [board, allTime] = await Promise.all([
    loadSeasonBoard(user.id, now),
    db
      .select({ id: users.id, name: users.name, points: users.totalPoints })
      .from(users)
      // The admin never plays: citizens and moderators in good standing.
      .where(and(ne(users.role, "admin"), eq(users.isBanned, false), isNull(users.deletedAt), gt(users.totalPoints, 0)))
      .orderBy(desc(users.totalPoints), users.createdAt)
      .limit(RANKING_LIMIT),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center gap-3">
        <Trophy className="h-8 w-8 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t(user.language, "ranking_title")}</h1>
          <p className="text-sm text-slate-500">{t(user.language, "ranking_subtitle")}</p>
        </div>
      </div>
      <SeasonBoard
        lang={user.language}
        viewerId={user.id}
        initialTab={rankingTab(query.tab)}
        seasonId={board.season.id}
        previousId={board.previous.id}
        now={now.getTime()}
        people={board.people.slice(0, RANKING_LIMIT)}
        viewerRank={board.people.find((r) => r.item.id === user.id) ?? null}
        previousPeople={board.previousPeople}
        allTime={allTime}
        cup={board.cup.slice(0, RANKING_LIMIT)}
        previousCup={board.previousCup}
        mySchoolId={board.mySchoolId}
        joinHintAction={
          <Link href="/org" className="font-bold text-emerald-700 underline underline-offset-2">
            {t(user.language, "nav_orgs")} →
          </Link>
        }
      />
    </div>
  );
}
