import { categoryLabels, t, tf, type Lang } from "@/lib/i18n";
import { PAYMENTS_ENABLED } from "@/lib/features";
import Link from "next/link";
import { Star, Sprout } from "@/components/ui/icons";
import { FoneAmount } from "@/components/brand/fone";
import { formatKm } from "@/lib/region";
import { EventBadge } from "@/components/missions/event-badge";

const categoryStyles: Record<string, string> = {
  planting: "from-emerald-400 to-emerald-600",
  donation: "from-amber-400 to-orange-500",
  recycling: "from-teal-400 to-teal-600",
  cleanup: "from-sky-400 to-blue-500",
  other: "from-lime-400 to-green-500",
};

export type MissionCardData = {
  id: string;
  title: string;
  titleEn?: string | null;
  titleEs?: string | null;
  description: string;
  descriptionEn?: string | null;
  descriptionEs?: string | null;
  category: string;
  pointsReward: number;
  foneReward: string;
  scope?: "local" | "anywhere";
  origin?: "admin" | "auto" | "suggestion";
  needsReview?: boolean;
  sponsorName?: string | null;
  /** For missions paid by a sponsor: FONE left in its budget. */
  sponsorRemainingFone?: string | null;
  city?: string | null;
  stateCode?: string | null;
  distanceKm?: number;
  /** Events (mutirões): date/time window. */
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
};

export function MissionCard({ lang, mission }: { lang: Lang; mission: MissionCardData }) {
  const getLocalizedTitle = () => {
    if (lang === "en" && mission.titleEn) return mission.titleEn;
    if (lang === "es" && mission.titleEs) return mission.titleEs;
    return mission.title;
  };

  const getLocalizedDescription = () => {
    if (lang === "en" && mission.descriptionEn) return mission.descriptionEn;
    if (lang === "es" && mission.descriptionEs) return mission.descriptionEs;
    return mission.description;
  };

  const paysFone = PAYMENTS_ENABLED && Number(mission.foneReward) > 0;
  const pointsOnly = PAYMENTS_ENABLED && mission.needsReview && !paysFone;
  const sponsored = mission.sponsorRemainingFone !== undefined && mission.sponsorRemainingFone !== null;
  const sponsorEmpty = sponsored && paysFone && Number(mission.sponsorRemainingFone) < Number(mission.foneReward);

  return (
    <div className="card-surface flex flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(16,24,40,0.1)] animate-slide-up">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div
          className={`grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md ${categoryStyles[mission.category] ?? categoryStyles.other}`}
        >
          <Sprout className="h-8 w-8" />
        </div>
        {mission.scope === "anywhere" ? (
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700" data-testid="mission-anywhere">
            🌎 {t(lang, "mission_anywhere")}
          </span>
        ) : mission.distanceKm !== undefined ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" data-testid="mission-distance">
            📍 {formatKm(mission.distanceKm, lang)}
          </span>
        ) : null}
      </div>
      <div className="mb-1 flex flex-wrap gap-1.5">
        <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {categoryLabels[mission.category]?.[lang] ?? mission.category}
        </span>
        {mission.origin === "auto" && mission.needsReview && (
          <span className="w-fit rounded-full bg-lime-50 px-2.5 py-1 text-xs font-semibold text-lime-700">✨ {t(lang, "mission_auto_badge")}</span>
        )}
        {mission.origin === "suggestion" && (
          <span className="w-fit rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">🙋 {t(lang, "mission_suggested_badge")}</span>
        )}
      </div>
      <h3 className="text-lg font-bold text-slate-900">{getLocalizedTitle()}</h3>
      <EventBadge lang={lang} mission={mission} />
      {mission.city && mission.scope !== "anywhere" && (
        <p className="text-xs font-medium text-slate-400">
          {mission.city}
          {mission.stateCode ? `, ${mission.stateCode}` : ""}
        </p>
      )}
      <p className="mt-1 flex-1 text-sm text-slate-500 line-clamp-3">{getLocalizedDescription()}</p>
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
      {sponsored && paysFone && (
        <p className={`mt-2 text-[11px] font-medium ${sponsorEmpty ? "text-amber-700" : "text-slate-500"}`} data-testid="mission-sponsor-budget">
          {sponsorEmpty
            ? t(lang, "mission_sponsor_empty")
            : tf(lang, "mission_sponsor_left", { fone: mission.sponsorRemainingFone ?? "0" })}
        </p>
      )}
      {pointsOnly && <p className="mt-2 text-[11px] text-slate-400">{t(lang, "mission_auto_points_only")}</p>}
      {mission.origin === "auto" && <p className="mt-1 text-[10px] text-slate-400">{t(lang, "osm_attribution")}</p>}
      <Link
        href={`/missions/${mission.id}/submit`}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 text-center"
      >
        {t(lang, "send_proof")}
      </Link>
    </div>
  );
}
