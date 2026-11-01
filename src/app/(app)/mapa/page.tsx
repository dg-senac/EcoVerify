import { and, between, eq, inArray, isNull, type SQL } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { dumpReports, missions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { citizenOnly } from "@/lib/role-guard";
import { getRegion } from "@/lib/regional/cookie";
import { loadImpactRows } from "@/lib/impact-server";
import { dumpPins, heatPins, mapText, missionPins, type MapData } from "@/lib/map";
import { MapScreenWeb } from "@/components/map/map-screen-web";

export const dynamic = "force-dynamic";

/** Bounding box of the region (the exact radius is applied by src/lib/map.ts). */
function box(lat: number, lng: number, km: number, latCol: typeof missions.latitude | typeof dumpReports.latitude, lngCol: typeof missions.longitude | typeof dumpReports.longitude): SQL[] {
  const dLat = km / 111;
  const dLng = km / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return [between(latCol, String(lat - dLat), String(lat + dLat)), between(lngCol, String(lng - dLng), String(lng + dLng))];
}

export default async function MapPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  citizenOnly(user.role);
  const lang = user.language;
  const text = mapText(lang);
  const region = await getRegion();
  const km = region?.radiusKm ?? 0;

  const missionRows = await db
    .select({
      id: missions.id,
      title: missions.title,
      titleEn: missions.titleEn,
      titleEs: missions.titleEs,
      category: missions.category,
      scope: missions.scope,
      latitude: missions.latitude,
      longitude: missions.longitude,
      pointsReward: missions.pointsReward,
      city: missions.city,
    })
    .from(missions)
    // Public missions only (organization missions are private to their members).
    .where(and(eq(missions.isActive, true), eq(missions.scope, "local"), isNull(missions.organizationId), ...(region ? box(region.lat, region.lng, km, missions.latitude, missions.longitude) : [])))
    .limit(500);

  const dumpRows = await db
    .select({
      id: dumpReports.id,
      latitude: dumpReports.latitude,
      longitude: dumpReports.longitude,
      status: dumpReports.status,
      missionId: dumpReports.missionId,
      city: dumpReports.city,
      resolvedAt: dumpReports.resolvedAt,
    })
    .from(dumpReports)
    .where(and(inArray(dumpReports.status, ["open", "confirmed", "resolved"]), ...(region ? box(region.lat, region.lng, km, dumpReports.latitude, dumpReports.longitude) : [])))
    .limit(500);

  const impactRows = await loadImpactRows(region ? { lat: region.lat, lng: region.lng, km } : undefined);

  const data: MapData = {
    region: region ? { lat: region.lat, lng: region.lng, radiusKm: region.radiusKm, city: region.city } : null,
    pins: [...heatPins(impactRows, lang, region), ...missionPins(missionRows, lang, region), ...dumpPins(dumpRows, lang, region)],
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">🗺️ {text.title}</h1>
      <p className="mt-1 mb-4 text-sm leading-relaxed text-slate-500">{text.subtitle}</p>
      <MapScreenWeb lang={lang} data={data} tilesUrl={process.env.NEXT_PUBLIC_MAP_TILES_URL || undefined} />
    </div>
  );
}
