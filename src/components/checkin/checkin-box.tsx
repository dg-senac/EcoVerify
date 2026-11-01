"use client";

import { useState, useTransition } from "react";
import type { Lang } from "@/lib/i18n";
import { checkinText, parseCheckinQr, type CheckinError, type CheckinPhase } from "@/lib/saas/checkin";
import { QrScanButton } from "@/components/qr/qr-scan-button";

/**
 * Participant side, on the event's proof page: read the organizer's QR (or type the 6 digits) to
 * confirm presence. A confirmed presence adds to the trust score. Shared by the web app and the APK.
 */
export function CheckinBox({
  lang,
  phase,
  checkedInAt,
  onCheckIn,
}: {
  lang: Lang;
  phase: CheckinPhase;
  checkedInAt: string | null;
  onCheckIn: (raw: string) => Promise<{ error?: CheckinError; checkedInAt?: string }>;
}) {
  const text = checkinText(lang);
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const [code, setCode] = useState("");
  const [doneAt, setDoneAt] = useState<string | null>(checkedInAt);
  const [error, setError] = useState<CheckinError | null>(null);
  const [pending, start] = useTransition();

  if (doneAt) {
    return (
      <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" data-testid="checkin-done">
        {text.done(new Date(doneAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }))}
      </p>
    );
  }
  if (phase === "closed") return null;

  const send = (raw: string) => {
    if (!parseCheckinQr(raw)) return setError("invalid_code");
    setError(null);
    start(async () => {
      const r = await onCheckIn(raw);
      if (r.error) setError(r.error);
      else setDoneAt(r.checkedInAt ?? new Date().toISOString());
    });
  };

  return (
    <section className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950" data-testid="checkin-box">
      <p className="font-bold">📍 {text.title}</p>
      <p className="mt-1 text-xs leading-relaxed">{phase === "early" ? text.early : text.hint}</p>
      {phase === "open" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-start">
          <QrScanButton label={text.scan} failedText={text.scanFailed} onResult={send} />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder={text.codeLabel}
            aria-label={text.codeLabel}
            className="rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-center font-mono text-lg font-bold tracking-[0.3em] outline-none focus:border-violet-400"
            data-testid="checkin-code-input"
          />
          <button
            type="button"
            disabled={pending || code.length !== 6}
            onClick={() => send(code)}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            data-testid="checkin-send"
          >
            {text.send}
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-red-700" data-testid="checkin-error">{text.errors[error]}</p>}
    </section>
  );
}
