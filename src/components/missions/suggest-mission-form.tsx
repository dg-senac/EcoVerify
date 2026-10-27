"use client";

import { useActionState, useState } from "react";
import { categoryEmoji, categoryLabels, t, type Lang } from "@/lib/i18n";
import { suggestMissionAction, type RegionActionState } from "@/lib/actions/region";

const CATEGORIES = ["cleanup", "planting", "recycling", "donation", "other"] as const;
const initialState: RegionActionState = {};
const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";

export function SuggestMissionForm({ lang }: { lang: Lang }) {
  const [state, formAction, pending] = useActionState(suggestMissionAction, initialState);
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);

  if (state.success) {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-800" role="status">
        ✓ {t(lang, "suggest_sent")}
      </div>
    );
  }

  const locate = () => {
    setLocationError(false);
    if (!navigator.geolocation) return setLocationError(true);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationError(true);
      },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  };

  return (
    <form action={formAction} className="mt-6 space-y-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="suggest-title">{t(lang, "suggest_name")}</label>
        <input id="suggest-title" name="title" required minLength={5} maxLength={120} placeholder={t(lang, "suggest_name_placeholder")} className={input} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="suggest-description">{t(lang, "suggest_description")}</label>
        <textarea id="suggest-description" name="description" required minLength={30} maxLength={1000} rows={4} className={input} />
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-slate-700">{t(lang, "suggest_category")}</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category, index) => (
            <label key={category} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50">
              <input type="radio" name="category" value={category} defaultChecked={index === 0} className="accent-emerald-600" />
              {categoryEmoji[category]} {categoryLabels[category][lang]}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <p className="mb-1 text-sm font-semibold text-slate-700">{t(lang, "suggest_location")}</p>
        <input type="hidden" name="latitude" value={coords?.lat ?? ""} readOnly />
        <input type="hidden" name="longitude" value={coords?.lng ?? ""} readOnly />
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          📍 {locating ? t(lang, "region_locating") : t(lang, "use_current_location")}
        </button>
        {coords && (
          <p className="mt-1 text-xs font-semibold text-emerald-700" data-testid="suggest-coords">
            ✓ {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} (± {Math.round(coords.accuracy)} m)
          </p>
        )}
        {locationError && <p className="mt-1 text-xs text-red-600">{t(lang, "region_error_location")}</p>}
      </div>
      {state.error && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {t(lang, state.error === "limit" ? "suggest_error_limit" : "suggest_error_invalid")}
        </p>
      )}
      <button
        type="submit"
        disabled={pending || !coords}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
      >
        {t(lang, "suggest_send")}
      </button>
    </form>
  );
}
