"use client";

import { useActionState, useState } from "react";
import { appealSubmissionAction, type AppealActionState } from "@/lib/actions/submissions";
import { t, type Lang } from "@/lib/i18n";

const initialState: AppealActionState = {};

/** LGPD art. 20: ask a human moderator to review a proof rejected by the automatic verification. */
export function AppealForm({ lang, submissionId }: { lang: Lang; submissionId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, formAction, pending] = useActionState(appealSubmissionAction, initialState);

  if (state.success) {
    return <p className="mt-2 text-xs font-semibold text-emerald-700">✓ {t(lang, "appeal_sent")}</p>;
  }
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

  const ERRORS = {
    appeal_length: "appeal_error_appeal_length",
    appeal_already_sent: "appeal_error_appeal_already_sent",
    appeal_other_active: "appeal_error_appeal_other_active",
  } as const;
  const errorKey = state.error ? (ERRORS[state.error as keyof typeof ERRORS] ?? "appeal_error_generic") : null;

  return (
    <form action={formAction} className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="submissionId" value={submissionId} />
      <p className="text-sm font-bold text-slate-900">{t(lang, "appeal_title")}</p>
      <p className="text-xs text-slate-500">{t(lang, "appeal_hint")}</p>
      <textarea
        name="message"
        required
        minLength={10}
        maxLength={500}
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400"
      />
      {errorKey && <p className="text-xs font-medium text-red-600">{t(lang, errorKey)}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
          {t(lang, "cancel")}
        </button>
        <button
          type="submit"
          disabled={pending || message.trim().length < 10}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {t(lang, "appeal_send")}
        </button>
      </div>
    </form>
  );
}
