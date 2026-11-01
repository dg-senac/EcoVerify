"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { DEFAULT_TILES_ATTRIBUTION, DEFAULT_TILES_URL, MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM, pinsBounds, type MapPin } from "@/lib/map";

/**
 * Leaflet map shared by the web app and the APK. Leaflet is loaded on the client only (it needs `window`).
 * Markers are plain HTML (emoji in a coloured circle) so there are no image assets to bundle.
 * The wrapper is `isolate` so Leaflet's z-indexes never cover the app's menus and dialogs.
 */
export type EcoMapProps = {
  pins: MapPin[];
  selectedId?: string | null;
  onSelect?: (pin: MapPin | null) => void;
  /** Region circle (radius in km). */
  region?: { lat: number; lng: number; radiusKm: number } | null;
  /** "You are here" dot (never stored). */
  me?: { lat: number; lng: number } | null;
  tilesUrl?: string;
  attribution?: string;
  label: string;
  className?: string;
};

function markerHtml(pin: MapPin, selected: boolean): string {
  const size = selected ? 38 : 30;
  return `<span style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:9999px;background:${pin.color};border:3px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.35);font-size:${selected ? 18 : 15}px;line-height:1;">${pin.emoji}</span>`;
}

export function EcoMap({ pins, selectedId, onSelect, region, me, tilesUrl, attribution, label, className }: EcoMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const fitted = useRef(false);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const lib = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      L.current = lib;
      const m = lib.map(el.current, { zoomControl: true, attributionControl: true }).setView([MAP_DEFAULT_CENTER.lat, MAP_DEFAULT_CENTER.lng], MAP_DEFAULT_ZOOM);
      m.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');
      lib.tileLayer(tilesUrl || DEFAULT_TILES_URL, { maxZoom: 19, attribution: attribution || DEFAULT_TILES_ATTRIBUTION }).addTo(m);
      m.on("click", () => onSelectRef.current?.(null));
      layer.current = lib.layerGroup().addTo(m);
      map.current = m;
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
      fitted.current = false;
    };
  }, [tilesUrl, attribution]);

  // (Re)draw pins, region and "me" whenever they change.
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const lib = L.current;
      const m = map.current;
      const group = layer.current;
      if (!lib || !m || !group) {
        raf = requestAnimationFrame(draw);
        return;
      }
      group.clearLayers();
      if (region) {
        lib.circle([region.lat, region.lng], { radius: region.radiusKm * 1000, color: "#059669", weight: 1.5, dashArray: "6 6", fill: false, interactive: false }).addTo(group);
      }
      // Areas first (below the markers).
      for (const pin of pins) {
        if (!pin.bounds) continue;
        const intensity = pin.intensity ?? 0.5;
        lib
          .rectangle(pin.bounds, { color: pin.color, weight: pin.id === selectedId ? 3 : 1, fillColor: pin.color, fillOpacity: 0.2 + intensity * 0.4 })
          .on("click", (e: Leaflet.LeafletMouseEvent) => {
            lib.DomEvent.stopPropagation(e);
            onSelectRef.current?.(pin);
          })
          .addTo(group);
      }
      for (const pin of pins) {
        if (pin.bounds) continue;
        const selected = pin.id === selectedId;
        const size = selected ? 38 : 30;
        lib
          .marker([pin.lat, pin.lng], {
            icon: lib.divIcon({ html: markerHtml(pin, selected), className: "", iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
            title: pin.title,
            alt: pin.title,
            keyboard: true,
            zIndexOffset: selected ? 1000 : 0,
          })
          .on("click", () => onSelectRef.current?.(pin))
          .addTo(group);
      }
      if (me) {
        lib.circleMarker([me.lat, me.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).addTo(group);
      }
      // First time there is something to show: frame it.
      if (!fitted.current) {
        const bounds = region
          ? lib.latLng(region.lat, region.lng).toBounds(region.radiusKm * 2000)
          : (() => {
              const b = pinsBounds(pins);
              return b ? lib.latLngBounds(b) : null;
            })();
        if (bounds) {
          m.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
          fitted.current = true;
        }
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [pins, selectedId, region, me]);

  // Center on "me" when it appears.
  useEffect(() => {
    if (me && map.current) map.current.setView([me.lat, me.lng], Math.max(map.current.getZoom(), 14));
  }, [me]);

  return (
    <div className={`relative isolate z-0 overflow-hidden rounded-2xl border border-black/5 bg-slate-100 shadow-sm ${className ?? "h-[60vh] min-h-[320px]"}`}>
      <div ref={el} className="h-full w-full" role="region" aria-label={label} data-testid="eco-map" />
    </div>
  );
}
