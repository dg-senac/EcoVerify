"use client";

import { useRef, useState, type ChangeEvent } from "react";
import jsQR from "jsqr";

/** Decodes the first QR code in an image file (camera photo). null when none is found. */
export async function decodeQrFromFile(file: Blob): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    // Phone photos are big: a QR still decodes well at ~1000 px and it is much faster.
    for (const max of [1000, 1600, 600]) {
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const found = jsQR(data.data, data.width, data.height, { inversionAttempts: "attemptBoth" });
      if (found?.data) return found.data;
    }
    return null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * "Scan QR with the camera": opens the camera (or the gallery), reads the QR in the photo and hands
 * the text to onResult. Works in any browser and in the Android WebView (no live video needed).
 */
export function QrScanButton({
  label,
  failedText,
  onResult,
  className = "",
}: {
  label: string;
  failedText: string;
  onResult: (text: string) => void;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setFailed(false);
    const text = await decodeQrFromFile(file);
    setBusy(false);
    if (text) onResult(text);
    else setFailed(true);
  };
  return (
    <div className="grid gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className={`flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 ${className}`}
        data-testid="qr-scan"
      >
        📷 {busy ? "…" : label}
      </button>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      {failed && <p className="text-xs font-medium text-amber-700">{failedText}</p>}
    </div>
  );
}
