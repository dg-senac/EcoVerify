"use client";

import { useActionState } from "react";
import { approveSubmissionAction, retryAiVerificationAction, type ModerationActionState } from "@/lib/actions/moderation";
import { AiPanel, type AiPanelData } from "@/components/moderation/ai-panel";
import { isInternetCopyFlag, isRejectionCode, rejectionReasonText } from "@/lib/ai/decision";
import { categoryEmoji, categoryLabels, t, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { RejectModal } from "@/components/moderation/reject-modal";
import { HistoryPanel } from "@/components/moderation/history-panel";
import { formatKg, MATERIAL_EMOJI, MATERIAL_LABELS, type Material } from "@/lib/impact";

const initialState: ModerationActionState = {};

export function ModerationCard({
  lang,
  moderatorId,
  canRetryAi,
  submission,
  showHistory = true,
  canGiveCard = false,
}: {
  lang: Lang;
  moderatorId: string;
  canRetryAi: boolean;
  /** The user's full history is for platform staff only (organization managers don't see it). */
  showHistory?: boolean;
  /** Platform staff may add a yellow card when rejecting for fraud. */
  canGiveCard?: boolean;
  submission: AiPanelData & {
    appealedAt: Date | null;
    appealMessage: string | null;
    id: string;
    photoUrl: string;
    report: string;
    material?: Material | null;
    weightKg?: string | null;
    declaredWeightKg?: string | null;
    latitude: string | null;
    longitude: string | null;
    submittedAt: Date;
    missionTitle: string;
    missionCategory: string;
    authorId: string;
    authorName: string;
  };
}) {
  const [state, formAction, pending] = useActionState(approveSubmissionAction, initialState);
  const [retryState, retryAction, retrying] = useActionState(retryAiVerificationAction, initialState);
  const isOwn = submission.authorId === moderatorId;

  const weightError = state.error === "weight_invalid";
  if (state.success) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-700 animate-fade-in">
        <span className="text-2xl">✅</span>
        <p className="font-semibold">{t(lang, "proof_approved_ok")}</p>
      </div>
    );
  }

  return (
    <div className="card-surface overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_10px_30px_rgba(16,24,40,0.06)] animate-slide-up md:flex">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={submission.photoUrl} alt={submission.missionTitle} className="h-56 w-full object-cover md:h-auto md:w-64" />
      <div className="flex-1 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xl">{categoryEmoji[submission.missionCategory] ?? "🌱"}</span>
          <h3 className="font-bold text-slate-900">{submission.missionTitle}</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            {categoryLabels[submission.missionCategory]?.[lang]}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
          <span>por</span>
          {showHistory && <HistoryPanel lang={lang} userId={submission.authorId} userName={submission.authorName} />}
          <span>·</span>
          <span>{formatDate(submission.submittedAt, lang)}</span>
        </div>
        {submission.appealedAt && (
          <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900" data-testid="appeal">
            <p className="font-bold">⚖️ {t(lang, "appeal_badge")}</p>
            <p className="mt-1 text-xs font-semibold">{t(lang, "appeal_from_user")}</p>
            <p className="mt-0.5">“{submission.appealMessage}”</p>
            {submission.aiReasonCode && (
              <p className="mt-1.5 text-xs">
                <span className="font-semibold">{t(lang, "appeal_previous_reason")}:</span> {rejectionReasonText(submission.aiReasonCode, lang)}
              </p>
            )}
          </div>
        )}
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{submission.report}</p>
        {submission.material && (
          <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800" data-testid="delivery">
            <span aria-hidden="true">{MATERIAL_EMOJI[submission.material]}</span>
            {t(lang, "recycling_delivery")}: {MATERIAL_LABELS[submission.material][lang]} · {formatKg(Number(submission.weightKg ?? 0), lang)}
          </p>
        )}
        {submission.latitude && submission.longitude && (
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
            📍 {Number(submission.latitude).toFixed(4)}, {Number(submission.longitude).toFixed(4)}
          </p>
        )}

        {!submission.appealedAt && (
          <AiPanel
            lang={lang}
            data={submission}
            photoUrl={submission.photoUrl}
            action={
              canRetryAi && (
                <form action={retryAction}>
                  <input type="hidden" name="submissionId" value={submission.id} />
                  <button
                    type="submit"
                    disabled={retrying}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white disabled:opacity-60"
                  >
                    {retrying ? "…" : t(lang, "ai_retry")}
                  </button>
                  {retryState.error && <span className="ml-2 text-xs text-red-600">{t(lang, "ai_unavailable")}</span>}
                </form>
              )
            }
          />
        )}

        <div className="mt-5">
          {isOwn ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              {t(lang, "own_submission_warning")}
            </p>
          ) : (
            <div className="flex items-end gap-3">
              <form action={formAction} className="flex-1 space-y-2">
                <input type="hidden" name="submissionId" value={submission.id} />
                {submission.material && (
                  <label className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">
                    ⚖️ {t(lang, "recycling_weight_review")}
                    <input
                      name="weightKg"
                      inputMode="decimal"
                      defaultValue={String(submission.weightKg ?? "").replace(".", ",")}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm outline-none focus:border-emerald-500"
                      data-testid="review-weight"
                    />
                  </label>
                )}
                <button
                  type="submit"
                  disabled={pending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-70"
                >
                  {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                  ✓ {t(lang, "approve")}
                </button>
                {weightError && <p className="text-xs font-medium text-red-600">{t(lang, "error_weight_invalid")}</p>}
              </form>
              <RejectModal
                lang={lang}
                submissionId={submission.id}
                flagged={isInternetCopyFlag(submission.aiReasonCode)}
                canGiveCard={canGiveCard}
                suggestedCode={
                  isInternetCopyFlag(submission.aiReasonCode)
                    ? "internet_copy"
                    : submission.aiVerdict === "reject" && isRejectionCode(submission.aiReasonCode)
                      ? submission.aiReasonCode
                      : null
                }
                onDone={() => {}}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
