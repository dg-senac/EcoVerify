import { categoryEmoji, categoryLabels, t, type Lang } from "@/lib/i18n";
import Link from "next/link";
import { Star, Sprout } from "@/components/ui/icons";
import { FoneAmount, FoneMark } from "@/components/brand/fone";

const categoryStyles: Record<string, string> = {
  planting: "from-emerald-400 to-emerald-600",
  donation: "from-amber-400 to-orange-500",
  recycling: "from-teal-400 to-teal-600",
  cleanup: "from-sky-400 to-blue-500",
  other: "from-lime-400 to-green-500",
};

export function MissionCard({
  lang,
  mission,
}: {
  lang: Lang;
  mission: {
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
  };
}) {
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

  return (
    <div className="card-surface flex flex-col rounded-2xl border border-black/5 bg-white p-5 shadow-[0_10px_30px_rgba(16,24,40,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(16,24,40,0.1)] animate-slide-up">
      <div
        className={`mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-md ${categoryStyles[mission.category] ?? categoryStyles.other}`}
      >
        <Sprout className="h-8 w-8" />
      </div>
      <span className="mb-1 w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
        {categoryLabels[mission.category]?.[lang] ?? mission.category}
      </span>
      <h3 className="text-lg font-bold text-slate-900">{getLocalizedTitle()}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-500 line-clamp-3">{getLocalizedDescription()}</p>
      <div className="mt-4 flex items-center gap-3 text-sm font-semibold">
        <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
          <Star className="h-4 w-4" /> {mission.pointsReward}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-teal-700">
          <FoneAmount amount={mission.foneReward} size={16} />
        </span>
      </div>
      <Link
        href={`/missions/${mission.id}/submit`}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 text-center"
      >
        {t(lang, "send_proof")}
      </Link>
    </div>
  );
}
