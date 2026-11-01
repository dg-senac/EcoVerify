"use client";

import { useCallback, useEffect, useState } from "react";
import { QrCode, Users, X } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { checkinText } from "@/lib/saas/checkin";
import { QrImage } from "@/components/qr/qr-image";

export type CheckinDisplayResult = { error?: string; code?: string; payload?: string; expiresAt?: string; present?: number };

/**
 * Organizer side: a button that opens a full-screen rotating QR for the event entrance, with the
 * 6-digit code, a countdown and the live number of check-ins. Shared by the web app and the APK.
 */
export function CheckinDisplay({ lang, title, load }: { lang: Lang; title: string; load: () => Promise<CheckinDisplayResult> }) {
  const text = checkinText(lang);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-bold text-violet-800 hover:bg-violet-100"
        data-testid="checkin-open"
      >
        <QrCode className="h-4 w-4" /> {text.showQr}
      </button>
      {open && <CheckinOverlay lang={lang} title={title} load={load} onClose={() => setOpen(false)} />}
    </>
  );
}

function CheckinOverlay({ lang, title, load, onClose }: { lang: Lang; title: string; load: () => Promise<CheckinDisplayResult>; onClose: () => void }) {
  const text = checkinText(lang);
  const [data, setData] = useState<CheckinDisplayResult | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const refresh = useCallback(() => {
    load().then(setData, () => setData({ error: "invalid" }));
  }, [load]);

  useEffect(() => {
    let alive = true;
    load().then(
      (d) => alive && setData(d),
      () => alive && setData({ error: "invalid" }),
    );
    return () => {
      alive = false;
    };
  }, [load]);
  // Tick every second; refresh the count every 15 s and the code as soon as it expires.
  useEffect(() => {
    let ticks = 0;
    const id = setInterval(() => {
      ticks++;
      setNow(Date.now());
      if (ticks % 15 === 0) refresh();
    }, 1000);
    return () => clearInterval(id);
  }, [refresh]);
  const expires = data?.expiresAt ? new Date(data.expiresAt).getTime() : 0;
  const left = Math.max(0, Math.round((expires - now) / 1000));
  useEffect(() => {
    if (data?.expiresAt && left === 0) refresh();
  }, [left, data?.expiresAt, refresh]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" data-testid="checkin-display">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
        <button type="button" onClick={onClose} aria-label={text.close} className="absolute right-3 top-3 rounded-full p-2 text-slate-500 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
        <p className="text-xs font-bold uppercase tracking-wide text-violet-600">{title}</p>
        <h2 className="mt-1 text-lg font-extrabold text-slate-900">{text.displayTitle}</h2>
        {data?.payload && data.code ? (
          <>
            <div className="mt-4">
              <QrImage text={data.payload} size={260} label={text.showQr} />
            </div>
            <p className="mt-3 font-mono text-5xl font-black tracking-[0.2em] text-violet-700" data-testid="checkin-code">
              {data.code.slice(0, 3)} {data.code.slice(3)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              ⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
            </p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-bold text-emerald-700" data-testid="checkin-present">
              <Users className="h-4 w-4" /> {text.present(data.present ?? 0)}
            </p>
            <p className="mt-3 text-xs text-slate-500">{text.displayHint}</p>
          </>
        ) : data?.error ? (
          <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{text.errors.wrong_event}</p>
        ) : (
          <p className="mt-6 text-sm text-slate-400">…</p>
        )}
      </div>
    </div>
  );
}
