import { Star, Sprout, MapPin } from "lucide-react";
import { categoryEmoji, categoryLabels, t, type Lang } from "@/lib/i18n";
import { Link } from "../router";
import { localizedDescription, localizedTitle, type Mission, type SubmissionStatus } from "../store";
import { StatusBadge, card } from "./ui";

export const categoryStyles: Record<string, string> = {
  planting: "from-emerald-400 to-emerald-600",
  donation: "from-amber-400 to-orange-500",
  recycling: "from-teal-400 to-teal-600",
  cleanup: "from-sky-400 to-blue-500",
  other: "from-lime-400 to-green-500",
};

/** Same look as src/components/missions/mission-card.tsx. */
export function MissionCard({ lang, mission, myStatus }: { lang: Lang; mission: Mission; myStatus?: SubmissionStatus }) {
  const done = myStatus === "pending" || myStatus === "approved";
  return (
    <div className={`${card} flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(16,24,40,0.1)] animate-slide-up`}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className={`grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br text-3xl text-white shadow-md ${categoryStyles[mission.category] ?? categoryStyles.other}`}>
          {categoryEmoji[mission.category] ?? "🌱"}
        </div>
        {myStatus && <StatusBadge status={myStatus} label={t(lang, `status_${myStatus}`)} />}
      </div>
      <span className="mb-1 w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
        {categoryLabels[mission.category]?.[lang] ?? mission.category}
      </span>
      <h3 className="text-lg font-bold text-slate-900">{localizedTitle(mission, lang)}</h3>
      <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-500">{localizedDescription(mission, lang)}</p>
      <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
        <MapPin className="h-3.5 w-3.5" /> {mission.latitude.toFixed(4)}, {mission.longitude.toFixed(4)}
      </p>
      <div className="mt-4 flex items-center gap-3 text-sm font-semibold">
        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
          <Star className="h-4 w-4" /> {mission.pointsReward}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-teal-700">
          <Sprout className="h-4 w-4" /> {mission.foneReward} FONE
        </span>
      </div>
      {done ? (
        <span className="mt-4 w-full rounded-xl bg-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-slate-500">
          {t(lang, `status_${myStatus}`)}
        </span>
      ) : (
        <Link
          to={`/missions/${mission.id}/submit`}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          {t(lang, "send_proof")}
        </Link>
      )}
    </div>
  );
}
