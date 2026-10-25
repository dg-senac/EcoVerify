"use client";

import { useActionState, useState } from "react";
import { rejectSubmissionAction, type ModerationActionState } from "@/lib/actions/moderation";
import { t, type Lang } from "@/lib/i18n";

const initialState: ModerationActionState = {};

export function RejectModal({
  lang,
  submissionId,
  onDone,
}: {
  lang: Lang;
  submissionId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
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
              <textarea
                name="reason"
                required
                minLength={5}
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explique por que a comprovação está sendo rejeitada..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
              {tooShort && <p className="text-xs font-medium text-amber-600">Escreva pelo menos 5 caracteres.</p>}
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
                  disabled={pending}
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
