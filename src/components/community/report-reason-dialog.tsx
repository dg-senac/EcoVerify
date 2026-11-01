"use client";

import { useState } from "react";
import { CHAT_REPORT_DETAIL_MAX, CHAT_REPORT_REASONS, chatModText, type ChatReportReason } from "@/lib/chat-moderation";
import type { Lang } from "@/lib/i18n";

/**
 * Report a chat message with a reason (shared by the web app and the APK).
 * `onSubmit` returns an error code ("already_reported", …) or nothing on success.
 */
export function ReportReasonDialog({
  lang,
  onSubmit,
  onClose,
}: {
  lang: Lang;
  onSubmit: (reason: ChatReportReason, detail: string) => Promise<string | null | undefined | void> | string | null | undefined | void;
  onClose: () => void;
}) {
  const text = chatModText(lang);
  const [reason, setReason] = useState<ChatReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!reason) {
      setError(text.reportChoose);
      return;
    }
    setBusy(true);
    const code = await onSubmit(reason, detail.trim());
    setBusy(false);
    if (code) setError(code === "already_reported" ? text.reportAlready : text.errorGeneric);
    else setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" data-report-dialog>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900">{text.reportTitle}</h3>
        {done ? (
          <>
            <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">✅ {text.reportDone}</p>
            <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">
              OK
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">{text.reportWhy}</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {CHAT_REPORT_REASONS.map((code) => (
                <button
                  key={code}
                  type="button"
                  data-reason={code}
                  onClick={() => {
                    setReason(code);
                    setError(null);
                  }}
                  className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${
                    reason === code ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {text.reasons[code]}
                </button>
              ))}
            </div>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={CHAT_REPORT_DETAIL_MAX}
              rows={2}
              placeholder={text.reportDetail}
              className="mt-3 w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                {text.cancel}
              </button>
              <button
                type="button"
                onClick={send}
                disabled={busy}
                data-report-send
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
              >
                {busy ? "…" : text.reportSend}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
