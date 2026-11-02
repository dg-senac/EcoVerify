import "server-only";
import { and, eq, isNotNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, regionSeeds } from "@/db/schema";
import { distanceKm, isWorldRegion, UNKNOWN_COUNTRY, type Region } from "@/lib/region";
import { municipalityByIbge, placeOf } from "@/lib/municipalities";
import { OSM_TEMPLATES, type OsmKind } from "@/lib/regional/templates";

/**
 * Supplies empty regions with missions generated from OpenStreetMap: beaches, parks and squares,
 * recycling and cooking-oil collection points near the user. Generated missions pay points only
 * until an admin reviews them (needsReview).
 *
 * Runs on the server, at most once per municipality every 30 days (1 day after a failure). Outside
 * Brazil the "municipality" is the region's grid cell (negative code, see worldCellCode).
 * OSM data © OpenStreetMap contributors (ODbL): the app shows the attribution on these missions.
 */

const DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const SEARCH_RADIUS_M = 15_000;
const TIMEOUT_MS = 25_000;
const RETRY_AFTER_DONE_DAYS = 30;
const RETRY_AFTER_FAILURE_HOURS = 24;
/** A running search older than this is considered dead (server restarted). */
const STALE_RUNNING_MINUTES = 10;
const MAX_PER_KIND: Record<OsmKind, number> = { beach: 2, park: 2, recycling: 2, cooking_oil: 1 };
const MAX_TOTAL = 6;
/** Don't create a mission this close to an existing one of the same category. */
const MIN_GAP_KM = 0.3;

export function osmAutoMissionsEnabled() {
  return process.env.AUTO_MISSIONS_OSM?.trim().toLowerCase() !== "off";
}

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function classify(tags: Record<string, string>): OsmKind | null {
  if (tags.natural === "beach") return "beach";
  if (tags.leisure === "park") return "park";
  if (tags.amenity === "recycling") return tags["recycling:cooking_oil"] === "yes" ? "cooking_oil" : "recycling";
  return null;
}

function buildQuery(lat: number, lng: number) {
  const around = `(around:${SEARCH_RADIUS_M},${lat},${lng})`;
  return `[out:json][timeout:20];
(
  nwr["natural"="beach"]["name"]${around};
  nwr["leisure"="park"]["name"]${around};
  nwr["amenity"="recycling"]["recycling:cooking_oil"="yes"]${around};
  nwr["amenity"="recycling"]["name"]${around};
  nwr["amenity"="recycling"]["recycling_type"="centre"]${around};
);
out center tags 200;`;
}

async function fetchOsmPlaces(lat: number, lng: number): Promise<OsmElement[]> {
  const url = process.env.OVERPASS_API_URL?.trim() || DEFAULT_OVERPASS_URL;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      // Overpass asks clients to identify themselves.
      "user-agent": "EcoVerify/1.0 (regional missions)",
    },
    body: new URLSearchParams({ data: buildQuery(lat, lng) }).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`overpass_http_${response.status}`);
  const json = (await response.json()) as { elements?: unknown };
  return Array.isArray(json.elements) ? (json.elements as OsmElement[]) : [];
}

/** Claims the municipality so two requests don't search at the same time. */
async function claim(region: Region): Promise<boolean> {
  const now = Date.now();
  const rows = await db
    .insert(regionSeeds)
    .values({ ibgeCode: region.ibge, city: region.city, stateCode: region.uf, status: "running" })
    .onConflictDoUpdate({
      target: regionSeeds.ibgeCode,
      set: { status: "running", attemptedAt: new Date(), error: null },
      where: or(
        and(eq(regionSeeds.status, "done"), lt(regionSeeds.attemptedAt, new Date(now - RETRY_AFTER_DONE_DAYS * 86_400_000))),
        and(eq(regionSeeds.status, "failed"), lt(regionSeeds.attemptedAt, new Date(now - RETRY_AFTER_FAILURE_HOURS * 3_600_000))),
        and(eq(regionSeeds.status, "running"), lt(regionSeeds.attemptedAt, new Date(now - STALE_RUNNING_MINUTES * 60_000))),
      ),
    })
    .returning({ ibge: regionSeeds.ibgeCode });
  return rows.length > 0;
}

/**
 * running: a search is in progress ("come back in a few minutes").
 * due: a new search may start now (never searched, or the retry window passed).
 */
export async function regionSeedState(ibge: number): Promise<{ running: boolean; due: boolean }> {
  const [row] = await db
    .select({ status: regionSeeds.status, attemptedAt: regionSeeds.attemptedAt })
    .from(regionSeeds)
    .where(eq(regionSeeds.ibgeCode, ibge))
    .limit(1);
  if (!row) return { running: false, due: true };
  const age = Date.now() - row.attemptedAt.getTime();
  if (row.status === "running") {
    const stale = age > STALE_RUNNING_MINUTES * 60_000;
    return { running: !stale, due: stale };
  }
  if (row.status === "failed") return { running: false, due: age > RETRY_AFTER_FAILURE_HOURS * 3_600_000 };
  return { running: false, due: age > RETRY_AFTER_DONE_DAYS * 86_400_000 };
}

/** Returns how many missions were created (0 when skipped). Never throws. */
export async function seedRegionFromOsm(region: Region): Promise<number> {
  if (!osmAutoMissionsEnabled()) return 0;
  try {
    if (!(await claim(region))) return 0;
  } catch (error) {
    console.error("[regional] could not claim region", error);
    return 0;
  }

  try {
    // Brazil: the municipality centre (never the person's position). Elsewhere there is no municipality
    // list, so the search uses the region's rounded point (~1 km).
    const municipality = isWorldRegion(region) ? null : municipalityByIbge(region.ibge);
    const center = municipality ? { lat: municipality[3], lng: municipality[4] } : { lat: region.lat, lng: region.lng };
    const elements = await fetchOsmPlaces(center.lat, center.lng);
    const existing = await db
      .select({ category: missions.category, latitude: missions.latitude, longitude: missions.longitude })
      .from(missions)
      .where(and(isNotNull(missions.latitude), sql`abs(${missions.latitude} - ${center.lat}) < 0.5`, sql`abs(${missions.longitude} - ${center.lng}) < 0.5`));

    const candidates = elements
      .map((element) => {
        const tags = element.tags ?? {};
        const kind = classify(tags);
        const lat = element.lat ?? element.center?.lat;
        const lng = element.lon ?? element.center?.lon;
        if (!kind || typeof lat !== "number" || typeof lng !== "number") return null;
        return { element, tags, kind, lat, lng, distance: distanceKm(center.lat, center.lng, lat, lng) };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => a.distance - b.distance);

    const perKind: Record<OsmKind, number> = { beach: 0, park: 0, recycling: 0, cooking_oil: 0 };
    const chosen: typeof candidates = [];
    for (const c of candidates) {
      if (chosen.length >= MAX_TOTAL) break;
      if (perKind[c.kind] >= MAX_PER_KIND[c.kind]) continue;
      const category = OSM_TEMPLATES[c.kind].category;
      const tooClose = [...existing, ...chosen.map((x) => ({ category: OSM_TEMPLATES[x.kind].category, latitude: String(x.lat), longitude: String(x.lng) }))].some(
        (m) => m.category === category && distanceKm(c.lat, c.lng, Number(m.latitude), Number(m.longitude)) < MIN_GAP_KM,
      );
      if (tooClose) continue;
      perKind[c.kind]++;
      chosen.push(c);
    }

    let created = 0;
    for (const c of chosen) {
      const template = OSM_TEMPLATES[c.kind];
      const rawName = (c.tags.name ?? "").trim().slice(0, 80);
      const street = (c.tags["addr:street"] ?? "").trim().slice(0, 60);
      const name = (lang: "pt" | "en" | "es") => rawName || (street ? `${template.fallbackName[lang]} (${street})` : template.fallbackName[lang]);
      // Outside Brazil there is no IBGE municipality: the mission takes the name and code of the region.
      const place = isWorldRegion(region)
        ? { city: region.city, stateCode: region.uf === UNKNOWN_COUNTRY ? null : region.uf, ibgeCode: region.ibge }
        : placeOf(c.lat, c.lng);
      const rows = await db
        .insert(missions)
        .values({
          title: template.title(name("pt")).pt,
          titleEn: template.title(name("en")).en,
          titleEs: template.title(name("es")).es,
          description: template.description.pt,
          descriptionEn: template.description.en,
          descriptionEs: template.description.es,
          context: template.context.pt,
          contextEn: template.context.en,
          contextEs: template.context.es,
          impact: template.impact.pt,
          impactEn: template.impact.en,
          impactEs: template.impact.es,
          aiChecklist: template.aiChecklist,
          latitude: c.lat.toFixed(6),
          longitude: c.lng.toFixed(6),
          scope: "local",
          ...place,
          origin: "auto",
          needsReview: true,
          osmRef: `${c.element.type}/${c.element.id}`,
          category: template.category,
          pointsReward: template.points,
          foneReward: "0.00",
        })
        .onConflictDoNothing({ target: missions.osmRef })
        .returning({ id: missions.id });
      created += rows.length;
    }

    await db.update(regionSeeds).set({ status: "done", missionsCreated: created }).where(eq(regionSeeds.ibgeCode, region.ibge));
    return created;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[regional] OpenStreetMap search for ${region.city}/${region.uf} failed: ${message}`);
    await db
      .update(regionSeeds)
      .set({ status: "failed", error: message.slice(0, 300) })
      .where(eq(regionSeeds.ibgeCode, region.ibge))
      .catch(() => {});
    return 0;
  }
}
