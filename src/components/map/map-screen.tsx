"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { MAP_LAYERS, heatColor, mapText, type MapData, type MapLayer, type MapPin } from "@/lib/map";
import { EcoMap } from "./eco-map";

/** Classes for the action link/button rendered by each platform under the selected pin. */
export const MAP_ACTION_CLASS = "inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700";

const LAYER_EMOJI: Record<MapLayer, string> = { missions: "🎯", dumps: "🗑️", heat: "🔥" };

/**
 * Citizen map: layer switches, the map, the selected pin and the privacy note.
 * Shared by the web app (/mapa) and the APK. Each platform renders its own links (`renderAction`).
 */
export function MapScreen({
  lang,
  data,
  renderAction,
  regionHint,
  tilesUrl,
}: {
  lang: Lang;
  data: MapData;
  /** Button/link for the selected pin (mission → its page, dump → the Rubbish screen or the clean-up). */
  renderAction: (pin: MapPin, text: ReturnType<typeof mapText>) => ReactNode;
  /** Shown when there is no region (e.g. a link to the missions screen). */
  regionHint?: ReactNode;
  tilesUrl?: string;
}) {
  const text = mapText(lang);
  const [layers, setLayers] = useState<Record<MapLayer, boolean>>({ missions: true, dumps: true, heat: true });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState(false);

  const counts = useMemo(() => {
    const c: Record<MapLayer, number> = { missions: 0, dumps: 0, heat: 0 };
    for (const p of data.pins) c[p.layer]++;
    return c;
  }, [data.pins]);
  const visible = useMemo(() => data.pins.filter((p) => layers[p.layer]), [data.pins, layers]);
  const selected = visible.find((p) => p.id === selectedId) ?? null;

  const locate = () => {
    if (!navigator.geolocation) {
      setLocateError(true);
      return;
    }
    setLocating(true);
    setLocateError(false);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setMe({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocateError(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3" data-testid="map-screen">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {MAP_LAYERS.map((layer) => (
          <button
            key={layer}
            type="button"
            aria-pressed={layers[layer]}
            onClick={() => setLayers((l) => ({ ...l, [layer]: !l[layer] }))}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${layers[layer] ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-500"}`}
            data-map-layer={layer}
          >
            {LAYER_EMOJI[layer]} {text.layers[layer]} <span className="opacity-75">({counts[layer]})</span>
          </button>
        ))}
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          data-testid="map-locate"
        >
          📍 {locating ? text.locating : text.locate}
        </button>
      </div>

      {data.region ? (
        <p className="text-xs text-slate-500" data-testid="map-region">
          {text.regionNote(data.region.city, data.region.radiusKm)}
        </p>
      ) : (
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900" data-testid="map-no-region">
          {text.noRegion} {regionHint}
        </p>
      )}
      {locateError && <p className="text-xs font-semibold text-rose-600">{text.locateError}</p>}

      <div className="relative min-w-0">
        <EcoMap
          pins={visible}
          selectedId={selectedId}
          onSelect={(pin) => setSelectedId(pin?.id ?? null)}
          region={data.region}
          me={me}
          tilesUrl={tilesUrl}
          label={text.mapLabel}
        />
        {/* Floating over the map (the map has its own stacking context), so it is visible on phones. */}
        {selected && (
          <div className="absolute inset-x-3 bottom-3 z-10 grid min-w-0 gap-2 rounded-2xl border border-black/5 bg-white/95 p-3 shadow-lg backdrop-blur" data-testid="map-selected">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg text-white" style={{ background: selected.color }} aria-hidden="true">
                {selected.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">{selected.title}</p>
                {selected.subtitle && <p className="truncate text-xs text-slate-500">{selected.subtitle}</p>}
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100" aria-label={text.close}>
                ✕
              </button>
            </div>
            {selected.target && <div className="flex justify-end">{renderAction(selected, text)}</div>}
          </div>
        )}
      </div>
      {visible.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">{text.empty}</p>}

      {layers.heat && counts.heat > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-slate-500" aria-hidden="true">
          <span>🔥</span>
          {[0.1, 0.5, 0.9].map((i) => (
            <span key={i} className="h-3 w-6 rounded" style={{ background: heatColor(i), opacity: 0.2 + i * 0.4 + 0.2 }} />
          ))}
          <span>{text.heatLegend}</span>
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-slate-400" data-testid="map-privacy">
        🔒 {text.privacy}
      </p>
    </div>
  );
}
