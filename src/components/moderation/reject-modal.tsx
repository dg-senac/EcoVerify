"use client";

import { useActionState, useState } from "react";
import { rejectSubmissionAction, type ModerationActionState } from "@/lib/actions/moderation";
import { t, type Lang } from "@/lib/i18n";
import { CARDABLE_REJECTIONS } from "@/lib/cards";
import { INTERNET_COPY_MIN_EXPLANATION, ownWords, REJECTION_CODES, REJECTION_REASONS, type RejectionCode } from "@/lib/ai/decision";

const initialState: ModerationActionState = {};

export function RejectModal({
  lang,
  submissionId,
  suggestedCode = null,
  flagged = false,
  canGiveCard = false,
  onDone,
}: {
  lang: Lang;
  submissionId: string;
  /**
   * Flagged by the AI as a possible copy from the internet: the reason chips only pick the reason
   * and the moderator must write the explanation in their own words.
   */
  flagged?: boolean;
  /** Platform staff can add a yellow card for fraud reasons (src/lib/cards.ts). */
  canGiveCard?: boolean;
  /** Reason suggested by the automatic verification, pre-selected. */
  suggestedCode?: RejectionCode | null;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [giveCard, setGiveCard] = useState(false);
  const [code, setCode] = useState<RejectionCode | null>(suggestedCode);
  const [reason, setReason] = useState(suggestedCode && !flagged ? REJECTION_REASONS[suggestedCode][lang] : "");
  const pickCode = (value: RejectionCode) => {
    setCode(value);
    if (!flagged) setReason(REJECTION_REASONS[value][lang]);
  };
  const [state, formAction, pending] = useActionState(
    async (prev: ModerationActionState, formData: FormData) => {
      const result = await rejectSubmissionAction(prev, formData);
      if (result.success) {
        setOpen(false);
        onDone();
      }
      return result;
    },
    initialState,
  );

  const tooShort = reason.length > 0 && reason.length < 5;
  const ownLength = ownWords(reason).length;
  const needsMore = flagged && ownLength < INTERNET_COPY_MIN_EXPLANATION;
  // Flagged proofs always keep the chosen reason code (the text is the moderator's explanation).
  const codeToSend = flagged ? (code ?? "") : code && reason === REJECTION_REASONS[code][lang] ? code : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-red-500 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
      >
        ✕ {t(lang, "reject")}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900">{t(lang, "rejection_reason_title")}</h3>
            <form action={formAction} className="mt-4 space-y-3">
              <input type="hidden" name="submissionId" value={submissionId} />
              <input type="hidden" name="reasonCode" value={codeToSend} />
              {flagged && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
                  ⚠️ {t(lang, "internet_explain_required")}
                </p>
              )}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">{t(lang, "reject_quick_reasons")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {REJECTION_CODES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => pickCode(value)}
                      className={`rounded-full border px-2.5 py-1 text-left text-xs transition ${
                        code === value ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {REJECTION_REASONS[value][lang].split(/[.!]/)[0]}
                    </button>
                  ))}
                </div>
              </div>
              {flagged && (
                <>
                  {code && <p className="text-xs text-slate-600">{REJECTION_REASONS[code][lang]}</p>}
                  <label htmlFor={`reason-${submissionId}`} className="block text-xs font-bold text-slate-700">
                    {t(lang, "internet_explain_label")}
                  </label>
                </>
              )}
              <textarea
                id={`reason-${submissionId}`}
                name="reason"
                required
                minLength={flagged ? INTERNET_COPY_MIN_EXPLANATION : 5}
                maxLength={1000}
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={flagged ? t(lang, "internet_explain_placeholder") : t(lang, "reject_placeholder")}
                data-testid="reject-reason"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
              {tooShort && !flagged && <p className="text-xs font-medium text-amber-600">Escreva pelo menos 5 caracteres.</p>}
              {flagged && reason.length > 0 && needsMore && (
                <p className="text-xs font-medium text-amber-600">
                  {ownLength}/{INTERNET_COPY_MIN_EXPLANATION}
                </p>
              )}
              {canGiveCard && code && CARDABLE_REJECTIONS.has(code) && (
                <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <input
                    type="checkbox"
                    name="giveCard"
                    checked={giveCard}
                    onChange={(e) => setGiveCard(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-amber-500"
                    data-testid="give-card"
                  />
                  <span>
                    <span className="font-bold">{t(lang, "card_give_label")}</span>
                    <span className="mt-0.5 block text-amber-800">{t(lang, "card_give_hint")}</span>
                  </span>
                </label>
              )}
              {state.error === "card_note_short" && <p className="text-xs font-medium text-red-500">{t(lang, "card_note_short")}</p>}
              {state.error === "explanation_required" && (
                <p className="text-xs font-medium text-red-500">{t(lang, "internet_explain_required")}</p>
              )}
              {state.error === "reason_too_short" && (
                <p className="text-xs font-medium text-red-500">Motivo muito curto. Tente novamente.</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t(lang, "cancel")}
                </button>
                <button
                  type="submit"
                  disabled={pending || needsMore}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-70"
                >
                  {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                  {t(lang, "confirm_rejection")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
