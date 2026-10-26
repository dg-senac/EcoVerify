import { useState } from "react";
import { FileText, RotateCcw, Star, Sprout } from "lucide-react";
import { categoryEmoji, t } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { Link } from "../router";
import { dt } from "../i18n";
import { localizedTitle, useLang, useStore, type User } from "../store";
import { EmptyState, PageHeader, StatusBadge, card } from "../components/ui";
import { PhotoViewer } from "../components/PhotoViewer";

export function SubmissionsScreen({ user }: { user: User }) {
  const lang = useLang();
  const [viewing, setViewing] = useState<string | null>(null);
  const submissions = useStore((s) => s.submissions);
  const missions = useStore((s) => s.missions);
  const rewards = useStore((s) => s.rewards);
  const mine = submissions.filter((s) => s.userId === user.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  // A rejected submission can be resent if there's no newer one for the same mission.
  const hasOpen = (missionId: string) => mine.some((s) => s.missionId === missionId && s.status !== "rejected");

  return (
    <>
      <PageHeader title={t(lang, "my_submissions_title")} icon={FileText} />
      {mine.length === 0 ? (
        <EmptyState emoji="📸" text={t(lang, "submissions_empty")} />
      ) : (
        <div className="grid gap-3">
          {mine.map((sub) => {
            const mission = missions.find((m) => m.id === sub.missionId);
            const reward = rewards.find((r) => r.submissionId === sub.id);
            return (
              <div key={sub.id} className={`${card} flex gap-4 p-4 animate-slide-up`}>
                <button type="button" onClick={() => setViewing(sub.photo)} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  <img src={sub.photo} alt="" className="h-full w-full object-cover" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900">
                      {mission ? `${categoryEmoji[mission.category] ?? "🌱"} ${localizedTitle(mission, lang)}` : "—"}
                    </h3>
                    <StatusBadge status={sub.status} label={t(lang, `status_${sub.status}`)} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{dt(lang, "submitted_at")} {formatDate(sub.submittedAt, lang)}</p>
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{sub.report}</p>
                  {sub.status === "approved" && mission && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700"><Star className="h-3.5 w-3.5" /> +{mission.pointsReward}</span>
                      <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-teal-700">
                        <Sprout className="h-3.5 w-3.5" /> {reward?.foneAmount ?? mission.foneReward} FONE · {dt(lang, reward?.status === "paid" ? "reward_paid" : "reward_pending")}
                      </span>
                    </div>
                  )}
                  {sub.status === "rejected" && (
                    <div className="mt-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
                      <b>{dt(lang, "rejection_reason")}:</b> {sub.rejectionReason}
                      {mission?.isActive && !hasOpen(sub.missionId) && (
                        <Link to={`/missions/${sub.missionId}/submit`} className="mt-2 flex w-fit items-center gap-1 font-bold text-red-800 underline">
                          <RotateCcw className="h-3.5 w-3.5" /> {t(lang, "send_proof")}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {viewing && <PhotoViewer src={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
