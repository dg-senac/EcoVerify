import { categoryEmoji, t, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { composeRejectionMessage } from "@/lib/ai/decision";
import { AppealForm } from "@/components/submissions/appeal-form";
import { formatKg, MATERIAL_EMOJI, MATERIAL_LABELS, type Material } from "@/lib/impact";

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

export function SubmissionCard({
  lang,
  submission,
}: {
  lang: Lang;
  submission: {
    id: string;
    photoUrl: string;
    report: string;
    material?: Material | null;
    weightKg?: string | null;
    declaredWeightKg?: string | null;
    status: string;
    rejectionReason: string | null;
    rejectionCode: string | null;
    decidedBy: "human" | "ai" | null;
    aiStatus: "queued" | "done" | "failed" | null;
    appealedAt: Date | null;
    submittedAt: Date;
    missionTitle: string;
    missionCategory: string;
  };
}) {
  const style = statusStyles[submission.status] ?? statusStyles.pending;
  const byAi = submission.decidedBy === "ai";
  const statusKey =
    submission.status === "approved"
      ? byAi
        ? "decided_ai_approved"
        : "status_approved"
      : submission.status === "rejected"
        ? byAi
          ? "decided_ai_rejected"
          : "status_rejected"
        : submission.appealedAt
          ? "status_appealed"
          : submission.aiStatus === "queued"
            ? "status_ai_checking"
            : "status_pending";
  // Catalogued reasons are shown in the user's language, plus the moderator's own explanation.
  const reasonText = submission.rejectionReason || submission.rejectionCode
    ? composeRejectionMessage(submission.rejectionCode, submission.rejectionReason ?? "", lang)
    : null;

  return (
    <div className="card-surface flex flex-col gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-[0_10px_24px_rgba(16,24,40,0.05)] animate-slide-up sm:flex-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={submission.photoUrl}
        alt={submission.missionTitle}
        className="h-40 w-full shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg">{categoryEmoji[submission.missionCategory] ?? "🌱"}</span>
          <h3 className="font-semibold text-slate-900">{submission.missionTitle}</h3>
          <span className={`ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${style.bg} ${style.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {t(lang, statusKey)}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">{formatDate(submission.submittedAt, lang)}</p>
        <p className="mt-2 text-sm text-slate-600 line-clamp-2">{submission.report}</p>
        {submission.material && (
          <p className="mt-2 text-xs font-semibold text-emerald-700" data-testid="delivery">
            {MATERIAL_EMOJI[submission.material]} {MATERIAL_LABELS[submission.material][lang]} · {formatKg(Number(submission.weightKg ?? 0), lang)}
            {submission.declaredWeightKg && submission.weightKg && Number(submission.declaredWeightKg) !== Number(submission.weightKg) && (
              <span className="font-normal text-slate-400"> ({t(lang, "recycling_weight_corrected")})</span>
            )}
          </p>
        )}
        {submission.status === "rejected" && reasonText && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {reasonText}
          </p>
        )}
        {byAi && <p className="mt-1.5 text-[11px] text-slate-400">🤖 {t(lang, "ai_decision_notice")}</p>}
        {submission.status === "rejected" && byAi && !submission.appealedAt && (
          <AppealForm lang={lang} submissionId={submission.id} />
        )}
      </div>
    </div>
  );
}
