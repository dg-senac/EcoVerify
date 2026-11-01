"use client";

import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import type { MapData } from "@/lib/map";
import { MapScreen, MAP_ACTION_CLASS } from "./map-screen";

/** Web wrapper: the shared map screen with Next links. */
export function MapScreenWeb({ lang, data, tilesUrl }: { lang: Lang; data: MapData; tilesUrl?: string }) {
  return (
    <MapScreen
      lang={lang}
      data={data}
      tilesUrl={tilesUrl}
      regionHint={
        <Link href="/missions" className="font-bold underline underline-offset-2">
          →
        </Link>
      }
      renderAction={(pin, text) => {
        const target = pin.target;
        if (!target) return null;
        if (target.kind === "mission") {
          return (
            <Link href={`/missions/${target.id}`} className={MAP_ACTION_CLASS} data-testid="map-action">
              {text.openMission}
            </Link>
          );
        }
        return target.missionId ? (
          <Link href={`/missions/${target.missionId}/submit`} className={MAP_ACTION_CLASS} data-testid="map-action">
            🧹 {text.openCleanup}
          </Link>
        ) : (
          <Link href="/lixo" className={MAP_ACTION_CLASS} data-testid="map-action">
            {text.openDumps}
          </Link>
        );
      }}
    />
  );
}
