"use client";

import { useState, useTransition } from "react";
import { resendVerificationAction } from "@/lib/actions/account";
import { actionErrorMessage } from "@/lib/action-errors";
import { t, type Lang } from "@/lib/i18n";

/** Reminder shown while the account e-mail is not confirmed, with a "resend link" button. */
export function EmailBanner({ lang, email, compact = false }: { lang: Lang; email: string; compact?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);

  function resend() {
    startTransition(async () => {
      const res = await resendVerificationAction();
      setResult(res.error ? { error: res.error } : { ok: true });
    });
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${compact ? "" : "mb-6"}`}
      role="status"
    >
      <span className="flex-1">✉️ {t(lang, "email_banner").replace("{email}", email)}</span>
      {result?.ok ? (
        <span className="font-semibold text-emerald-700">{t(lang, "email_sent")}</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={pending}
          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
        >
          {t(lang, "email_resend")}
        </button>
      )}
      {result?.error && <span className="w-full text-xs font-medium text-red-600">{actionErrorMessage(lang, result.error)}</span>}
    </div>
  );
}
