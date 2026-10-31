import { useState } from "react";
import { t, tf } from "@/lib/i18n";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { formatDate } from "@/lib/utils";
import { isSuspended } from "@/lib/cards";
import { errorText } from "../i18n";
import { appealBan, BAN_APPEAL_MIN, useLang, useStore } from "../store";
import { Modal, btnPrimary } from "./ui";

/**
 * "Account blocked" screen of the demo, the same as /conta-bloqueada on the server: shown when a
 * tester picks a blocked profile. Reason, date and a one-time appeal that alerts the admins.
 */
export function BlockedAccountModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const lang = useLang();
  const user = useStore((s) => s.users.find((u) => u.id === userId));
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;
  // Suspended (3rd yellow card) or blocked (ban / red card): same screen, different texts.
  const suspended = !user.isBanned && isSuspended(user.suspendedUntil);

  const send = () => {
    const result = appealBan(user.id, message);
    if (result.error) setError(errorText(lang, result.error));
  };
  const short = message.trim().length < BAN_APPEAL_MIN;

  return (
    <Modal title={suspended ? `🟨 ${t(lang, "suspended_title")}` : `🚫 ${t(lang, "banned_title")}`} onClose={onClose}>
      <div data-testid={suspended ? "suspended-screen" : "banned-screen"}>
        <p className="text-sm text-slate-500">{t(lang, suspended ? (PAYMENTS_ENABLED ? "suspended_intro" : "suspended_intro_free") : "banned_intro")}</p>
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="text-xs font-bold uppercase tracking-wide text-red-700">{t(lang, "banned_reason")}</p>
          <p className="mt-1" data-testid="banned-reason">{(suspended ? user.suspensionReason : user.banReason) || t(lang, "banned_no_reason")}</p>
          {suspended && user.suspendedUntil && (
            <p className="mt-2 text-sm font-bold text-red-800" data-testid="suspended-until">
              {t(lang, "suspended_until")}: {formatDate(user.suspendedUntil, lang)}
            </p>
          )}
          {!suspended && user.bannedAt && (
            <p className="mt-2 text-xs text-red-700">
              {t(lang, "banned_since")}: {formatDate(user.bannedAt, lang)}
            </p>
          )}
        </div>
        <h3 className="mt-5 font-bold text-slate-900">{t(lang, "banned_appeal_title")}</h3>
        {user.banAppealedAt ? (
          <div className="mt-2 grid gap-2">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" data-testid="ban-appeal-sent">
              ✅ {tf(lang, "banned_appeal_sent", { date: formatDate(user.banAppealedAt, lang), email: user.email })}
            </p>
            {user.banAppealMessage && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm italic text-slate-600">“{user.banAppealMessage}”</p>}
          </div>
        ) : (
          <div className="mt-1 grid gap-2">
            <p className="text-sm text-slate-500">{t(lang, "banned_appeal_hint")}</p>
            <textarea
              rows={5}
              maxLength={1500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t(lang, "banned_appeal_placeholder")}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              data-testid="ban-appeal-message"
            />
            {message.length > 0 && short && <p className="text-xs font-medium text-amber-600">{t(lang, "banned_appeal_too_short")}</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="button" className={`${btnPrimary} disabled:opacity-60`} disabled={short} onClick={send} data-testid="ban-appeal-send">
              {t(lang, "banned_appeal_send")}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
