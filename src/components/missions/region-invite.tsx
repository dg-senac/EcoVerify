"use client";

import { useEffect } from "react";
import { t, type Lang } from "@/lib/i18n";

/**
 * One-time invite to choose a region, shown over the mission list the first time someone opens it
 * without a region (so nobody takes another city's missions for their own). Stays below the splash
 * (z-[200]), so it appears right after the opening animation.
 *
 * Shared by the Next.js app and the offline demo (no framework imports).
 */

export const REGION_INVITE_KEY = "ev-region-asked"; // localStorage

export function regionInviteSnapshot(): boolean {
  try {
    return window.localStorage.getItem(REGION_INVITE_KEY) === "1";
  } catch {
    return true; // No storage (private mode): never nag.
  }
}

/** Server render: treated as already asked, so the invite only ever appears on the client. */
export function regionInviteServerSnapshot(): boolean {
  return true;
}

export function rememberRegionInvite() {
  try {
    window.localStorage.setItem(REGION_INVITE_KEY, "1");
  } catch {
    // Ignore: the invite simply shows again next time.
  }
}

export function RegionInvite({ lang, onLocate, onPickCity, onLater }: { lang: Lang; onLocate: () => void; onPickCity: () => void; onLater: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onLater();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onLater]);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="region-invite-title"
      data-testid="region-invite"
      onClick={(event) => {
        if (event.target === event.currentTarget) onLater();
      }}
    >
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center shadow-2xl sm:rounded-3xl sm:pb-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-sky-100 text-3xl" aria-hidden>
          🌍
        </div>
        <h2 id="region-invite-title" className="mt-4 text-xl font-bold text-slate-900">
          {t(lang, "region_invite_title")}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{t(lang, "region_invite_text")}</p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onLocate}
            autoFocus
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
            data-testid="region-invite-locate"
          >
            📍 {t(lang, "region_use_location")}
          </button>
          <button
            type="button"
            onClick={onPickCity}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            data-testid="region-invite-city"
          >
            🏙️ {t(lang, "region_pick_city")}
          </button>
          <button
            type="button"
            onClick={onLater}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
            data-testid="region-invite-later"
          >
            {t(lang, "region_invite_later")}
          </button>
        </div>
      </div>
    </div>
  );
}
