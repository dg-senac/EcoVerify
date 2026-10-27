import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import {
  DEFAULT_REGION_RADIUS_KM,
  nearestMunicipality,
  REGION_RADIUS_OPTIONS_KM,
  regionFromMunicipality,
  searchMunicipalities,
  type Municipality,
  type Region,
  type RegionRadius,
} from "@/lib/region";
import { setRegion, setRegionRadius } from "../store";
import { getCurrentPosition } from "../media";
import { dt } from "../i18n";
import { loadMunicipalities } from "../municipalities";
import { btnPrimary, btnSecondary, card, input } from "./ui";

const RECIFE = 2611606;

/** Same behaviour as src/components/missions/region-bar.tsx, without a server. */
export function RegionBar({ lang, region }: { lang: Lang; region: Region | null }) {
  const [picking, setPicking] = useState(!region);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Municipality[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const radius: RegionRadius = region?.radiusKm ?? DEFAULT_REGION_RADIUS_KM;

  useEffect(() => {
    const q = query.trim();
    if (!searching || q.length < 2) return;
    let alive = true;
    const timer = setTimeout(async () => {
      const list = await loadMunicipalities();
      if (alive) setResults(searchMunicipalities(list, q));
    }, 150);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, searching]);

  const choose = (m: Municipality, source: Region["source"], at?: { lat: number; lng: number }) => {
    setRegion(regionFromMunicipality(m, radius, source, at));
    setPicking(false);
    setSearching(false);
    setQuery("");
    setResults(null);
    setError(null);
  };

  const locate = async () => {
    setError(null);
    setBusy(true);
    try {
      const pos = await getCurrentPosition();
      const m = nearestMunicipality(await loadMunicipalities(), pos.latitude, pos.longitude);
      if (!m) setError(t(lang, "region_error_outside"));
      else choose(m, "gps", { lat: pos.latitude, lng: pos.longitude });
    } catch {
      setError(t(lang, "region_error_location"));
    } finally {
      setBusy(false);
    }
  };

  const chooseRecife = async () => {
    const m = (await loadMunicipalities()).find((x) => x[0] === RECIFE);
    if (m) choose(m, "manual");
  };

  const visible = query.trim().length >= 2 ? results : null;
  const picker = (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={locate} disabled={busy} className={btnPrimary}>
          📍 {busy ? t(lang, "region_locating") : t(lang, "region_use_location")}
        </button>
        <button type="button" onClick={() => setSearching((v) => !v)} className={btnSecondary}>
          🏙️ {t(lang, "region_pick_city")}
        </button>
        <button type="button" onClick={chooseRecife} className={btnSecondary}>
          {dt(lang, "demo_region_recife")}
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
            className={input}
          />
          {visible && (
            <ul className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white" data-testid="city-results">
              {visible.length === 0 ? (
                <li className="px-3.5 py-2.5 text-sm text-slate-400">{t(lang, "region_no_results")}</li>
              ) : (
                visible.map((m) => (
                  <li key={m[0]}>
                    <button type="button" onClick={() => choose(m, "manual")} className="w-full px-3.5 py-2.5 text-left text-sm text-slate-700 transition hover:bg-emerald-50">
                      <b>{m[1]}</b>, {m[2]}
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
      <section className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5" data-testid="region-prompt">
        <h2 className="font-bold text-slate-900">📍 {t(lang, "region_prompt_title")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t(lang, "region_prompt_text")}</p>
        {picker}
      </section>
    );
  }

  return (
    <section className={`${card} mb-5 p-4`} data-testid="region-bar">
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
              onChange={(e) => setRegionRadius(Number(e.target.value) as RegionRadius)}
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
          <button type="button" onClick={() => setPicking((v) => !v)} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            {t(lang, "region_change")}
          </button>
          <button type="button" onClick={() => setRegion(null)} className="rounded-lg px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50">
            {t(lang, "region_clear")}
          </button>
        </div>
      </div>
      {picking && picker}
    </section>
  );
}
