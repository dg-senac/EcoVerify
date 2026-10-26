import { Trophy } from "lucide-react";
import { t } from "@/lib/i18n";
import { levelForPoints } from "@/lib/utils";
import { dt } from "../i18n";
import { useLang, useStore, type User } from "../store";
import { Avatar, PageHeader, card } from "../components/ui";

const medals = ["🥇", "🥈", "🥉"];

export function RankingScreen({ user }: { user: User }) {
  const lang = useLang();
  const users = useStore((s) => s.users);
  const ranked = users
    .filter((u) => u.role === "citizen" && !u.isBanned)
    .sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
  const podium = ranked.slice(0, 3);
  // Visual order 2nd, 1st, 3rd.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean) as User[];

  return (
    <>
      <PageHeader title={t(lang, "ranking_title")} subtitle={t(lang, "ranking_subtitle")} icon={Trophy} />
      {podium.length > 0 && (
        <div className="mb-6 grid grid-cols-3 items-end gap-2 sm:gap-4">
          {podiumOrder.map((u) => {
            const pos = ranked.indexOf(u);
            const heights = ["h-32", "h-24", "h-20"];
            return (
              <div key={u.id} className="flex flex-col items-center gap-2 animate-slide-up">
                <Avatar name={u.name} size={pos === 0 ? 64 : 52} tone={pos === 0 ? "from-amber-400 to-orange-500" : "from-emerald-500 to-teal-600"} />
                <p className={`max-w-full truncate text-center text-xs font-bold sm:text-sm ${u.id === user.id ? "text-emerald-700" : "text-slate-800"}`}>{u.name.split(" ")[0]}</p>
                <div className={`flex w-full flex-col items-center justify-start rounded-t-2xl bg-gradient-to-b pt-3 ${heights[pos]} ${pos === 0 ? "from-amber-200 to-amber-50" : "from-emerald-100 to-emerald-50"}`}>
                  <span className="text-2xl">{medals[pos]}</span>
                  <span className="text-sm font-extrabold text-slate-800">{u.totalPoints}</span>
                  <span className="text-[10px] font-semibold text-slate-500">{t(lang, "reward_points")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className={`${card} divide-y divide-slate-100`}>
        {ranked.map((u, index) => {
          const level = levelForPoints(u.totalPoints, lang);
          const isMe = u.id === user.id;
          return (
            <div key={u.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? "bg-emerald-50/70" : ""}`}>
              <span className="w-7 text-center text-sm font-extrabold text-slate-400">{index < 3 ? medals[index] : index + 1}</span>
              <Avatar name={u.name} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {u.name} {isMe && <span className="text-xs font-bold text-emerald-600">({dt(lang, "you")})</span>}
                </p>
                <p className="text-xs text-slate-500">{level.emoji} {level.name}</p>
              </div>
              <span className="text-sm font-extrabold text-slate-800">
                {u.totalPoints} <span className="text-xs font-semibold text-slate-400">{t(lang, "reward_points")}</span>
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
