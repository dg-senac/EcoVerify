"use client";

import { useState, useTransition } from "react";
import { categoryEmoji, categoryLabels, t, type Lang } from "@/lib/i18n";
import { reviewSuggestionAction } from "@/lib/actions/region";

export type SuggestionCardData = {
  id: string;
  title: string;
  description: string;
  category: string;
  latitude: string;
  longitude: string;
  city: string | null;
  stateCode: string | null;
  authorName: string;
  createdAt: string;
};

/** A community-proposed action: moderators turn it into a (points-only) mission or decline it. */
export function SuggestionCard({ lang, suggestion }: { lang: Lang; suggestion: SuggestionCardData }) {
  const [done, setDone] = useState<null | "approved" | "rejected">(null);
  const [pending, startTransition] = useTransition();
  const review = (approve: boolean) =>
    startTransition(async () => {
      const result = await reviewSuggestionAction(suggestion.id, approve);
      if (result.success) setDone(approve ? "approved" : "rejected");
    });
  const mapUrl = `https://www.openstreetmap.org/?mlat=${suggestion.latitude}&mlon=${suggestion.longitude}#map=17/${suggestion.latitude}/${suggestion.longitude}`;

  return (
    <div className="card-surface rounded-2xl border border-black/5 bg-white p-4 shadow-sm" data-testid="suggestion">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xl">{categoryEmoji[suggestion.category] ?? "🌱"}</span>
        <p className="font-bold text-slate-900">{suggestion.title}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          {categoryLabels[suggestion.category]?.[lang] ?? suggestion.category}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {suggestion.authorName} · {suggestion.createdAt}
        {suggestion.city ? ` · ${suggestion.city}${suggestion.stateCode ? `, ${suggestion.stateCode}` : ""}` : ""} ·{" "}
        <a href={mapUrl} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline">
          📍 {Number(suggestion.latitude).toFixed(4)}, {Number(suggestion.longitude).toFixed(4)}
        </a>
      </p>
      <p className="mt-2 text-sm text-slate-600">{suggestion.description}</p>
      {done ? (
        <p className="mt-3 text-sm font-semibold text-emerald-700">✓ {done === "approved" ? t(lang, "suggestion_done_approved") : t(lang, "suggestion_done_rejected")}</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => review(false)}
              className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              ✕ {t(lang, "suggestion_reject")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => review(true)}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
            >
              ✓ {t(lang, "suggestion_approve")}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{t(lang, "suggestion_points_hint")}</p>
        </>
      )}
    </div>
  );
}
