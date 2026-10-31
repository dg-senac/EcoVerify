import { useState } from "react";
import { FileText, RotateCcw, Star } from "lucide-react";
import { categoryEmoji, t, type Lang } from "@/lib/i18n";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { formatDate } from "@/lib/utils";
import { Link } from "../router";
import { dt, errorText } from "../i18n";
import { appealSubmission, localizedTitle, useLang, useStore, type User } from "../store";
import { composeRejectionMessage } from "@/lib/ai/decision";
import { EmptyState, PageHeader, StatusBadge, card, toast } from "../components/ui";
import { PhotoViewer } from "../components/PhotoViewer";
import { FoneAmount } from "@/components/brand/fone";
import { formatKg, MATERIAL_EMOJI, MATERIAL_LABELS } from "@/lib/impact";
import { COUNT_ITEM_INFO, countItemName, isCountItem, weightSourceLabel } from "@/lib/proof";

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
                    <StatusBadge
                      status={sub.status}
                      label={
                        sub.decidedBy === "ai"
                          ? t(lang, sub.status === "approved" ? "decided_ai_approved" : "decided_ai_rejected")
                          : sub.status === "pending" && sub.appealedAt
                            ? t(lang, "status_appealed")
                            : t(lang, `status_${sub.status}`)
                      }
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{dt(lang, "submitted_at")} {formatDate(sub.submittedAt, lang)}</p>
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-600">{sub.report}</p>
                  {sub.itemCount != null && mission && isCountItem(mission.countItem) && (
                    <p className="mt-1 text-xs font-semibold text-emerald-700" data-testid="delivery">
                      {COUNT_ITEM_INFO[mission.countItem].emoji} {sub.itemCount} · {countItemName(mission.countItem, lang)}
                      {(sub.weightKg ?? 0) > 0 && (
                        <span className="font-normal text-slate-500">
                          {" "}
                          · ≈ {formatKg(sub.weightKg ?? 0, lang)} ({weightSourceLabel(sub.weightSource, lang)})
                        </span>
                      )}
                    </p>
                  )}
                  {sub.material && sub.itemCount == null && (
                    <p className="mt-1 text-xs font-semibold text-emerald-700" data-testid="delivery">
                      {MATERIAL_EMOJI[sub.material]} {MATERIAL_LABELS[sub.material][lang]} · {formatKg(sub.weightKg ?? 0, lang)}
                      {sub.declaredWeightKg != null && sub.weightKg != null && sub.declaredWeightKg !== sub.weightKg && (
                        <span className="font-normal text-slate-400"> ({t(lang, "recycling_weight_corrected")})</span>
                      )}
                    </p>
                  )}
                  {sub.status === "approved" && mission && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700"><Star className="h-3.5 w-3.5" /> +{mission.pointsReward}</span>
                      {PAYMENTS_ENABLED && (
                        <span className="flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-teal-700">
                          <FoneAmount amount={reward?.foneAmount ?? mission.foneReward} size={14} /> · {dt(lang, reward?.status === "paid" ? "reward_paid" : "reward_pending")}
                        </span>
                      )}
                    </div>
                  )}
                  {sub.status === "rejected" && (
                    <div className="mt-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700">
                      <b>{dt(lang, "rejection_reason")}:</b> {composeRejectionMessage(sub.rejectionCode ?? null, sub.rejectionReason ?? "", lang)}
                      {mission?.isActive && !hasOpen(sub.missionId) && (
                        <Link to={`/missions/${sub.missionId}/submit`} className="mt-2 flex w-fit items-center gap-1 font-bold text-red-800 underline">
                          <RotateCcw className="h-3.5 w-3.5" /> {t(lang, "send_proof")}
                        </Link>
                      )}
                    </div>
                  )}
                  {sub.decidedBy === "ai" && <p className="mt-1.5 text-[11px] text-slate-400">🤖 {t(lang, "ai_decision_notice")}</p>}
                  {sub.status === "rejected" && sub.decidedBy === "ai" && !sub.appealedAt && <AppealBox lang={lang} submissionId={sub.id} />}
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

/** LGPD art. 20: ask a person to review an automatic rejection (same rules as the web app). */
function AppealBox({ lang, submissionId }: { lang: Lang; submissionId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        ⚖️ {t(lang, "appeal_button")}
      </button>
    );
  }
  const send = () => {
    const result = appealSubmission(submissionId, message);
    if (result.error) return setError(errorText(lang, result.error));
    toast(t(lang, "appeal_sent"));
  };
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-bold text-slate-900">{t(lang, "appeal_title")}</p>
      <p className="text-xs text-slate-500">{t(lang, "appeal_hint")}</p>
      <textarea
        rows={3}
        maxLength={500}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        aria-label={t(lang, "appeal_title")}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
      />
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
          {t(lang, "cancel")}
        </button>
        <button
          type="button"
          onClick={send}
          disabled={message.trim().length < 10}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {t(lang, "appeal_send")}
        </button>
      </div>
    </div>
  );
}
