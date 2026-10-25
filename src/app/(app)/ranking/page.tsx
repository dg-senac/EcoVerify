import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { initials } from "@/lib/utils";
import { Trophy, Medal } from "@/components/ui/icons";

const medalColors = ["text-amber-400", "text-slate-400", "text-amber-600"];
const RANKING_LIMIT = 100;

export default async function RankingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const visible = await db
    .select({ id: users.id, name: users.name, totalPoints: users.totalPoints })
    .from(users)
    .where(eq(users.isBanned, false))
    .orderBy(desc(users.totalPoints), users.createdAt)
    .limit(RANKING_LIMIT);

  return (
    <div>
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t(user.language, "ranking_title")}</h1>
          <p className="text-sm text-slate-500">{t(user.language, "ranking_subtitle")}</p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {visible.map((row, index) => {
          const isPodium = index < 3;
          const isMe = row.id === user.id;
          return (
            <div
              key={row.id}
              className={`flex items-center gap-4 rounded-2xl border px-4 py-3 shadow-sm animate-slide-up ${
                isPodium
                  ? "border-amber-200 bg-gradient-to-r from-amber-50 to-white"
                  : "border-black/5 bg-white"
              } ${isMe ? "ring-2 ring-emerald-400" : ""}`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center text-xl font-bold text-slate-500">
                {isPodium ? <Medal className={`h-6 w-6 ${medalColors[index]}`} /> : index + 1}
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
                {initials(row.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">
                  {row.name} {isMe && <span className="text-xs font-normal text-emerald-600">(você)</span>}
                </p>
              </div>
              <p className="text-lg font-extrabold text-emerald-700">
                {row.totalPoints} <span className="text-xs font-medium text-slate-400">{t(user.language, "points")}</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
