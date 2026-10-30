import { Star, MapPin } from "lucide-react";
import { categoryEmoji, categoryLabels, t, tf, type Lang } from "@/lib/i18n";
import { centsToFone } from "@/lib/fone";
import { Link } from "../router";
import { localizedDescription, localizedTitle, sponsorBalance, useStore, type Mission, type SubmissionStatus } from "../store";
import { StatusBadge, card } from "./ui";
import { FoneAmount } from "@/components/brand/fone";
import { formatKm } from "@/lib/region";
import { EventBadge } from "@/components/missions/event-badge";

export const categoryStyles: Record<string, string> = {
  planting: "from-emerald-400 to-emerald-600",
  donation: "from-amber-400 to-orange-500",
  recycling: "from-teal-400 to-teal-600",
  cleanup: "from-sky-400 to-blue-500",
  other: "from-lime-400 to-green-500",
};

/** Same look as src/components/missions/mission-card.tsx. */
export function MissionCard({ lang, mission, myStatus, distanceKm }: { lang: Lang; mission: Mission; myStatus?: SubmissionStatus; distanceKm?: number }) {
  const done = myStatus === "pending" || myStatus === "approved";
  const paysFone = Number(mission.foneReward) > 0;
  const anywhere = mission.scope === "anywhere";
  const sponsorLeftCents = useStore((s) => (mission.sponsorId ? sponsorBalance(s, mission.sponsorId).remainingCents : null));
  const sponsorEmpty = sponsorLeftCents !== null && paysFone && sponsorLeftCents < Math.round(Number(mission.foneReward) * 100);
  return (
    <div className={`${card} flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(16,24,40,0.1)] animate-slide-up`}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className={`grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br text-3xl text-white shadow-md ${categoryStyles[mission.category] ?? categoryStyles.other}`}>
          {categoryEmoji[mission.category] ?? "🌱"}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {myStatus && <StatusBadge status={myStatus} label={t(lang, `status_${myStatus}`)} />}
          {anywhere ? (
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700" data-testid="mission-anywhere">🌎 {t(lang, "mission_anywhere")}</span>
          ) : distanceKm !== undefined ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" data-testid="mission-distance">📍 {formatKm(distanceKm, lang)}</span>
          ) : null}
        </div>
      </div>
      <div className="mb-1 flex flex-wrap gap-1.5">
        <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {categoryLabels[mission.category]?.[lang] ?? mission.category}
        </span>
        {mission.origin === "auto" && mission.needsReview && (
          <span className="w-fit rounded-full bg-lime-50 px-2.5 py-1 text-xs font-semibold text-lime-700">✨ {t(lang, "mission_auto_badge")}</span>
        )}
      </div>
      <h3 className="text-lg font-bold text-slate-900">{localizedTitle(mission, lang)}</h3>
      <EventBadge lang={lang} mission={mission} />
      {mission.city && !anywhere && (
        <p className="flex items-center gap-1 text-xs font-medium text-slate-400">
          <MapPin className="h-3.5 w-3.5" /> {mission.city}
          {mission.stateCode ? `, ${mission.stateCode}` : ""}
        </p>
      )}
      <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-500">{localizedDescription(mission, lang)}</p>
      {mission.sponsorName && (
        <p className="mt-2 text-xs font-semibold text-slate-600">
          🤝 {t(lang, "mission_sponsor")}: {mission.sponsorName}
        </p>
      )}
      <div className="mt-4 flex items-center gap-3 text-sm font-semibold">
        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
          <Star className="h-4 w-4" /> {mission.pointsReward}
        </span>
        {paysFone && (
          <span className={`flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-teal-700 ${sponsorEmpty ? "line-through opacity-60" : ""}`}>
            <FoneAmount amount={mission.foneReward} size={16} />
          </span>
        )}
      </div>
      {sponsorLeftCents !== null && paysFone && (
        <p className={`mt-2 text-[11px] font-medium ${sponsorEmpty ? "text-amber-700" : "text-slate-500"}`} data-testid="mission-sponsor-budget">
          {sponsorEmpty ? t(lang, "mission_sponsor_empty") : tf(lang, "mission_sponsor_left", { fone: centsToFone(sponsorLeftCents) })}
        </p>
      )}
      {mission.needsReview && !paysFone && <p className="mt-2 text-[11px] text-slate-400">{t(lang, "mission_auto_points_only")}</p>}
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
