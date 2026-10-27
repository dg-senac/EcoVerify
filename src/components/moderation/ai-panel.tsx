import type { ReactNode } from "react";
import { rejectionReasonText, type AiChecks } from "@/lib/ai/decision";
import { t, type Lang } from "@/lib/i18n";

/**
 * Result of the automatic verification, shown to moderators on each pending proof.
 * Presentational only: shared by the web app and the offline demo.
 */
export type AiPanelData = {
  aiStatus: "queued" | "done" | "failed" | null;
  aiVerdict: "approve" | "reject" | "review" | null;
  aiConfidence: number | null;
  aiReasonCode: string | null;
  aiSummary: string | null;
  aiChecks: AiChecks | null;
};

const VERDICT_STYLE = {
  approve: "border-emerald-200 bg-emerald-50 text-emerald-800",
  reject: "border-red-200 bg-red-50 text-red-800",
  review: "border-amber-200 bg-amber-50 text-amber-800",
} as const;

export function AiPanel({ lang, data, action }: { lang: Lang; data: AiPanelData; action?: ReactNode }) {
  if (!data.aiStatus) return null;

  if (data.aiStatus === "queued") {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" aria-hidden="true" />
        <span className="font-semibold">🤖 {t(lang, "ai_queued")}</span>
      </div>
    );
  }

  if (data.aiStatus === "failed") {
    return (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>🤖 {t(lang, "ai_failed")}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    );
  }

  const verdict = data.aiVerdict ?? "review";
  const checks = data.aiChecks ?? {};
  const reason = rejectionReasonText(data.aiReasonCode, lang);
  const title =
    verdict === "approve" ? t(lang, "ai_suggests_approve") : verdict === "reject" ? t(lang, "ai_suggests_reject") : t(lang, "ai_suggests_review");

  return (
    <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${VERDICT_STYLE[verdict]}`} data-testid="ai-panel">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">🤖 {title}</span>
        {data.aiConfidence !== null && (
          <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-xs font-semibold">
            {data.aiConfidence}% {t(lang, "ai_confidence")}
          </span>
        )}
      </div>
      {reason && <p className="mt-1.5 font-medium">{reason}</p>}
      {data.aiSummary && <p className="mt-1.5 opacity-90">{data.aiSummary}</p>}
      {checks.whatIsVisible && (
        <p className="mt-1.5 text-xs opacity-80">
          <span className="font-semibold">{t(lang, "ai_seen")}:</span> {checks.whatIsVisible}
        </p>
      )}
      {(checks.similarSubmissionId || checks.identifiableFaces) && (
        <ul className="mt-2 space-y-0.5 text-xs font-semibold">
          {checks.similarSubmissionId && (
            <li>
              ⚠️ {t(lang, "ai_flag_similar")} ({checks.similarDistance}/64)
            </li>
          )}
          {checks.identifiableFaces && <li>👤 {t(lang, "ai_flag_faces")}</li>}
        </ul>
      )}
      {!checks.whatIsVisible && !data.aiSummary && <p className="mt-1 text-xs opacity-80">{t(lang, "ai_rules_only")}</p>}
    </div>
  );
}
