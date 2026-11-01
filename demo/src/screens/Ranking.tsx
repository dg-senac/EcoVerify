import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { t } from "@/lib/i18n";
import { previousSeason, rankingTab, schoolCup, seasonAt, seasonRanking } from "@/lib/seasons";
import { SeasonBoard } from "@/components/ranking/season-board";
import { useLang, useStore, type User } from "../store";
import { PageHeader } from "../components/ui";
import { navigate } from "../router";

/** Same screen as the web /ranking: current season, all time and the Schools Cup (docs/COPA.md). */
export function RankingScreen({ user, tab }: { user: User; tab?: string | null }) {
  const lang = useLang();
  const users = useStore((s) => s.users);
  const orgs = useStore((s) => s.orgs ?? []);
  const members = useStore((s) => s.orgMembers ?? []);
  const log = useStore((s) => s.pointsLog ?? []);

  // Fixed when the screen opens ("ends in N days" doesn't need to tick).
  const [now] = useState(() => Date.now());
  const board = useMemo(() => {
    const season = seasonAt(now);
    const previous = previousSeason(season);
    const players = users.filter((u) => u.role !== "admin" && !u.isBanned && !u.deletedAt);
    const playerIds = new Set(players.map((u) => u.id));
    const schools = orgs.filter((o) => o.type === "school").map((o) => ({ id: o.id, name: o.name, city: o.city }));
    const memberships = members.filter((m) => playerIds.has(m.userId)).map((m) => ({ orgId: m.orgId, userId: m.userId, joinedAt: m.joinedAt }));
    const schoolIds = new Set(schools.map((s) => s.id));
    const mine = memberships
      .filter((m) => m.userId === user.id && schoolIds.has(m.orgId))
      .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())[0];
    const people = players.map((u) => ({ id: u.id, name: u.name }));
    return {
      now,
      season,
      previous,
      people: seasonRanking(people, log, season),
      previousPeople: seasonRanking(people, log, previous).filter((r) => r.position <= 3),
      allTime: players
        .filter((u) => u.totalPoints > 0)
        .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name))
        .map((u) => ({ id: u.id, name: u.name, points: u.totalPoints })),
      cup: schoolCup({ schools, memberships, entries: log, season }),
      previousCup: schoolCup({ schools, memberships, entries: log, season: previous }).filter((r) => r.position !== null && r.position <= 3),
      mySchoolId: mine?.orgId ?? null,
    };
  }, [users, orgs, members, log, user.id, now]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t(lang, "ranking_title")} subtitle={t(lang, "ranking_subtitle")} icon={Trophy} />
      <SeasonBoard
        lang={lang}
        viewerId={user.id}
        initialTab={rankingTab(tab)}
        seasonId={board.season.id}
        previousId={board.previous.id}
        now={board.now}
        people={board.people}
        previousPeople={board.previousPeople}
        allTime={board.allTime}
        cup={board.cup}
        previousCup={board.previousCup}
        mySchoolId={board.mySchoolId}
        joinHintAction={
          <button type="button" className="font-bold text-emerald-700 underline underline-offset-2" onClick={() => navigate("/org")}>
            {t(lang, "nav_orgs")} →
          </button>
        }
      />
    </div>
  );
}
