import { useMemo } from "react";
import { Map as MapIcon } from "lucide-react";
import { dumpPins, heatPins, mapText, missionPins, type MapData } from "@/lib/map";
import { MapScreen, MAP_ACTION_CLASS } from "@/components/map/map-screen";
import { impactRows, useLang, useStore } from "../store";
import { PageHeader } from "../components/ui";
import { navigate } from "../router";

/** Same screen as the web /mapa, built from the local data. */
export function MapScreenDemo() {
  const lang = useLang();
  const text = mapText(lang);
  const missions = useStore((s) => s.missions);
  const dumps = useStore((s) => s.dumps ?? []);
  const region = useStore((s) => s.region ?? null);
  const rows = useStore((s) => impactRows(s));

  const data = useMemo<MapData>(() => {
    const publicMissions = missions.filter((m) => m.isActive && !m.organizationId);
    return {
      region: region ? { lat: region.lat, lng: region.lng, radiusKm: region.radiusKm, city: region.city } : null,
      pins: [...heatPins(rows, lang, region), ...missionPins(publicMissions, lang, region), ...dumpPins(dumps, lang, region)],
    };
  }, [missions, dumps, region, rows, lang]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={text.title} subtitle={text.subtitle} icon={MapIcon} />
      <MapScreen
        lang={lang}
        data={data}
        tilesUrl={(import.meta.env as unknown as Record<string, string | undefined>).VITE_MAP_TILES_URL || undefined}
        regionHint={
          <button type="button" className="font-bold underline underline-offset-2" onClick={() => navigate("/missions")}>
            →
          </button>
        }
        renderAction={(pin, t) => {
          const target = pin.target;
          if (!target) return null;
          const go = (path: string, label: string) => (
            <button type="button" className={MAP_ACTION_CLASS} onClick={() => navigate(path)} data-testid="map-action">
              {label}
            </button>
          );
          if (target.kind === "mission") return go(`/missions/${target.id}/submit`, t.openMission);
          return target.missionId ? go(`/missions/${target.missionId}/submit`, `🧹 ${t.openCleanup}`) : go("/lixo", t.openDumps);
        }}
      />
    </div>
  );
}
