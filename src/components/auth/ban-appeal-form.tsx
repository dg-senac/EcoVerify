"use client";

import { useActionState, useState } from "react";
import { submitBanAppealAction, type BanAppealState } from "@/lib/actions/ban-appeal";
import { t, tf, type Lang } from "@/lib/i18n";

/** Keep in sync with lib/actions/ban-appeal.ts. */
const BAN_APPEAL_MIN = 20;

export function BanAppealForm({ lang, token, maskedEmail, today }: { lang: Lang; token: string; maskedEmail: string; today: string }) {
  const [message, setMessage] = useState("");
  const [state, formAction, pending] = useActionState<BanAppealState, FormData>(submitBanAppealAction, {});

  if (state.success || state.error === "already_sent") {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" data-testid="ban-appeal-sent">
        ✅ {tf(lang, "banned_appeal_sent", { date: today, email: maskedEmail })}
      </p>
    );
  }

  const short = message.trim().length < BAN_APPEAL_MIN;
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <textarea
        name="message"
        required
        minLength={BAN_APPEAL_MIN}
        maxLength={1500}
        rows={5}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t(lang, "banned_appeal_placeholder")}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        data-testid="ban-appeal-message"
      />
      {(state.error === "too_short" || (message.length > 0 && short)) && (
        <p className="text-xs font-medium text-amber-600">{t(lang, "banned_appeal_too_short")}</p>
      )}
      {state.error === "expired" && <p className="text-xs font-medium text-red-600">{t(lang, "banned_expired")}</p>}
      {state.error === "too_many_attempts" && <p className="text-xs font-medium text-red-600">{t(lang, "error_too_many_attempts")}</p>}
      <button
        type="submit"
        disabled={pending || short}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
      >
        {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {t(lang, "banned_appeal_send")}
      </button>
    </form>
  );
}
