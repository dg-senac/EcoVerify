"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { t, type Lang } from "@/lib/i18n";
import { REGION_RADIUS_OPTIONS_KM, type Region } from "@/lib/region";
import {
  clearRegionAction,
  searchCitiesAction,
  setRegionFromCityAction,
  setRegionFromLocationAction,
  setRegionRadiusAction,
} from "@/lib/actions/region";

type City = { ibge: number; name: string; uf: string };

/**
 * Region picker for the mission list: GPS (rounded, device-only) or a city typed by the user.
 */
export function RegionBar({ lang, region }: { lang: Lang; region: Region | null }) {
  const [picking, setPicking] = useState(!region);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [pending, startTransition] = useTransition();
  const searchId = useRef(0);

  useEffect(() => {
    if (!searching) return;
    const q = query.trim();
    if (q.length < 2) return;
    const id = ++searchId.current;
    const timer = setTimeout(async () => {
      const found = await searchCitiesAction(q);
      if (id === searchId.current) setResults(found);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, searching]);

  const locate = () => {
    setError(null);
    if (!navigator.geolocation) return setError(t(lang, "region_error_location"));
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        startTransition(async () => {
          const result = await setRegionFromLocationAction(pos.coords.latitude, pos.coords.longitude);
          setLocating(false);
          if (result.error) setError(t(lang, result.error === "outside" ? "region_error_outside" : "region_error_location"));
          else {
            setPicking(false);
            setSearching(false);
          }
        });
      },
      () => {
        setLocating(false);
        setError(t(lang, "region_error_location"));
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  };

  const chooseCity = (city: City) => {
    startTransition(async () => {
      const result = await setRegionFromCityAction(city.ibge);
      if (result.error) return setError(t(lang, "region_error_location"));
      setPicking(false);
      setSearching(false);
      setQuery("");
      setResults(null);
    });
  };

  const busy = pending || locating;
  const visibleResults = query.trim().length >= 2 ? results : null;

  const picker = (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={locate}
          disabled={busy}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
        >
          📍 {locating ? t(lang, "region_locating") : t(lang, "region_use_location")}
        </button>
        <button
          type="button"
          onClick={() => setSearching((v) => !v)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          🏙️ {t(lang, "region_pick_city")}
        </button>
      </div>
      {searching && (
        <div>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(lang, "region_search_placeholder")}
            aria-label={t(lang, "region_pick_city")}
            data-testid="city-search"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          />
          {visibleResults && (
            <ul className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white" data-testid="city-results">
              {visibleResults.length === 0 ? (
                <li className="px-3.5 py-2.5 text-sm text-slate-400">{t(lang, "region_no_results")}</li>
              ) : (
                visibleResults.map((city) => (
                  <li key={city.ibge}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => chooseCity(city)}
                      className="w-full px-3.5 py-2.5 text-left text-sm text-slate-700 transition hover:bg-emerald-50"
                    >
                      <b>{city.name}</b>, {city.uf}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
      {error && (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );

  if (!region) {
    return (
      <section className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5" data-testid="region-prompt">
        <h2 className="font-bold text-slate-900">📍 {t(lang, "region_prompt_title")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t(lang, "region_prompt_text")}</p>
        {picker}
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-2xl border border-black/5 bg-white p-4 shadow-sm" data-testid="region-bar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">
            📍 {t(lang, "region_near_you")} · <span data-testid="region-city">{region.city}, {region.uf}</span>
          </p>
          <p className="text-xs text-slate-400">{t(lang, region.source === "gps" ? "region_by_gps" : "region_by_choice")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            {t(lang, "region_radius")}
            <select
              value={region.radiusKm}
              disabled={busy}
              onChange={(e) => startTransition(async () => void (await setRegionRadiusAction(Number(e.target.value))))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
              data-testid="region-radius"
            >
              {REGION_RADIUS_OPTIONS_KM.map((km) => (
                <option key={km} value={km}>
                  {km} km
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setPicking((v) => !v)}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t(lang, "region_change")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => startTransition(async () => void (await clearRegionAction()))}
            className="rounded-lg px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            {t(lang, "region_clear")}
          </button>
        </div>
      </div>
      {picking && picker}
    </section>
  );
}
