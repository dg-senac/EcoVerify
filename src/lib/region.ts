/**
 * Regional missions: pure helpers shared by the web app and the offline demo.
 *
 * The user's region is the municipality closest to their GPS reading (or the city they picked).
 * Outside Brazil (no IBGE municipality nearby) the region is the area around the GPS reading: a
 * "world region" identified by a grid cell, named after the place from OpenStreetMap when possible.
 * Location is only used to filter the mission list: it is rounded (~1 km) and kept in a cookie on
 * the device, never in the database.
 */

/** [IBGE code, name, UF, latitude, longitude] — see src/data/README.md */
export type Municipality = [number, string, string, number, number];

export const REGION_RADIUS_OPTIONS_KM = [10, 30, 100] as const;
export type RegionRadius = (typeof REGION_RADIUS_OPTIONS_KM)[number];
export const DEFAULT_REGION_RADIUS_KM: RegionRadius = 30;

/** Below this many local missions in the radius, the region counts as "needs more missions". */
export const MIN_LOCAL_MISSIONS = 3;

export type Region = {
  /** Rounded to 2 decimals (~1 km). */
  lat: number;
  lng: number;
  /** IBGE municipality code in Brazil; a negative grid-cell code for world regions (see worldCellCode). */
  ibge: number;
  city: string;
  /** Brazilian state (UF) for municipalities; ISO 3166-1 country code (or "ZZ" when unknown) for world regions. */
  uf: string;
  radiusKm: RegionRadius;
  source: "gps" | "manual";
};

export function roundCoord(value: number) {
  return Math.round(value * 100) / 100;
}

export function isRegionRadius(value: unknown): value is RegionRadius {
  return REGION_RADIUS_OPTIONS_KM.includes(Number(value) as RegionRadius);
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Brazil's bounding box (with margin): readings outside it get no municipality. */
export function isInBrazil(lat: number, lng: number) {
  return lat > -34.5 && lat < 5.8 && lng > -74.5 && lng < -28.5;
}

export function nearestMunicipality(list: readonly Municipality[], lat: number, lng: number): Municipality | null {
  if (!isInBrazil(lat, lng)) return null;
  let best: Municipality | null = null;
  let bestDistance = Infinity;
  for (const m of list) {
    // Cheap pre-filter before the trigonometry.
    if (Math.abs(m[3] - lat) > 1.5 || Math.abs(m[4] - lng) > 1.5) continue;
    const d = distanceKm(lat, lng, m[3], m[4]);
    if (d < bestDistance) {
      best = m;
      bestDistance = d;
    }
  }
  return best;
}

/**
 * A Brazilian municipality only counts as "your city" when its seat is this close. Farther than that
 * (abroad, or across a border) the region is the area around the reading instead.
 */
export const MAX_MUNICIPALITY_KM = 60;

/** The Brazilian municipality of a GPS reading, or null when there is none close enough. */
export function municipalityForGps(list: readonly Municipality[], lat: number, lng: number): Municipality | null {
  const m = nearestMunicipality(list, lat, lng);
  if (!m) return null;
  return distanceKm(lat, lng, m[3], m[4]) <= MAX_MUNICIPALITY_KM ? m : null;
}

/* ------------------------------------------------------------------ */
/* World regions (outside Brazil)                                      */
/* ------------------------------------------------------------------ */

/** Grid cell size of world regions (~28 km): one automatic OpenStreetMap search per cell. */
export const WORLD_CELL_DEG = 0.25;
export const UNKNOWN_COUNTRY = "ZZ";

export function isValidCoord(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** Negative integer id of the grid cell of a point (IBGE codes are positive, so they never clash). */
export function worldCellCode(lat: number, lng: number): number {
  const rows = Math.round(180 / WORLD_CELL_DEG);
  const cols = Math.round(360 / WORLD_CELL_DEG);
  const row = Math.min(rows - 1, Math.max(0, Math.floor((lat + 90) / WORLD_CELL_DEG)));
  const col = Math.min(cols - 1, Math.max(0, Math.floor((lng + 180) / WORLD_CELL_DEG)));
  return -(row * cols + col + 1);
}

export function isWorldRegion(region: Pick<Region, "ibge">) {
  return region.ibge < 0;
}

/** Name used when the place could not be identified (no connection to OpenStreetMap). */
export const AREA_FALLBACK_NAME = { pt: "Sua região", en: "Your area", es: "Tu zona" } as const;

export function worldRegion(
  lat: number,
  lng: number,
  radiusKm: RegionRadius,
  place: { city?: string | null; country?: string | null } | null,
  lang: keyof typeof AREA_FALLBACK_NAME = "en",
): Region {
  const country = place?.country && /^[A-Z]{2}$/.test(place.country) ? place.country : UNKNOWN_COUNTRY;
  const city = (place?.city ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || AREA_FALLBACK_NAME[lang] || AREA_FALLBACK_NAME.en;
  const rLat = roundCoord(lat);
  const rLng = roundCoord(lng);
  // The cell comes from the rounded coordinates (the ones kept in the cookie), so it always matches.
  return { lat: rLat, lng: rLng, ibge: worldCellCode(rLat, rLng), city, uf: country, radiusKm, source: "gps" };
}

/** Country name in the user's language ("PT" → "Portugal"), or null when unknown. */
export function countryName(code: string, lang: string): string | null {
  if (!/^[A-Z]{2}$/.test(code) || code === UNKNOWN_COUNTRY) return null;
  try {
    const name = new Intl.DisplayNames([lang === "pt" ? "pt-BR" : lang], { type: "region" }).of(code);
    return name && name !== code ? name : code;
  } catch {
    return code;
  }
}

/** "Olinda, PE" in Brazil; "Lisboa, Portugal" (or just "Your area") elsewhere. */
export function regionLabel(region: Pick<Region, "ibge" | "city" | "uf">, lang: string): string {
  if (!isWorldRegion(region)) return `${region.city}, ${region.uf}`;
  const country = countryName(region.uf, lang);
  return country && country !== region.city ? `${region.city}, ${country}` : region.city;
}

/** An OpenStreetMap area returned by an Overpass `is_in` query (only the tags are used). */
export type OsmArea = { tags?: Record<string, string> };

/** Admin levels tried for the "city", most specific first (8 = municipality in most countries). */
const CITY_ADMIN_LEVELS = ["8", "7", "9", "6", "10", "5", "4"];

/**
 * City and country of a point from the administrative areas that contain it, with the name in the
 * user's language when OpenStreetMap has it.
 */
export function placeFromAreas(areas: readonly OsmArea[], lang: string): { city: string | null; country: string | null } {
  const nameOf = (tags: Record<string, string>) => tags[`name:${lang}`] || tags["name:en"] || tags.name || null;
  const admin = areas.map((a) => a.tags ?? {}).filter((tags) => tags.boundary === "administrative" || tags.admin_level);
  const countryTags = admin.find((tags) => tags.admin_level === "2");
  const rawCountry = (countryTags?.["ISO3166-1"] || countryTags?.["ISO3166-1:alpha2"] || "").toUpperCase();
  const country = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;
  let city: string | null = null;
  for (const level of CITY_ADMIN_LEVELS) {
    const found = admin.find((tags) => tags.admin_level === level && nameOf(tags));
    if (found) {
      city = nameOf(found);
      break;
    }
  }
  // City-states (Singapore, Monaco...): the country is the city.
  if (!city && countryTags) city = nameOf(countryTags);
  return { city: city ? city.slice(0, 80) : null, country };
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Accent-insensitive search; names that start with the query come first. "olinda pe" also works. */
export function searchMunicipalities(list: readonly Municipality[], query: string, limit = 8): Municipality[] {
  const q = normalizeText(query).replace(/[,/-]+/g, " ").replace(/\s+/g, " ");
  if (q.length < 2) return [];
  const ufMatch = q.match(/^(.*\S)\s+([a-z]{2})$/);
  const name = ufMatch ? ufMatch[1] : q;
  const uf = ufMatch ? ufMatch[2].toUpperCase() : null;
  const starts: Municipality[] = [];
  const contains: Municipality[] = [];
  for (const m of list) {
    if (uf && m[2] !== uf) continue;
    const n = normalizeText(m[1]);
    if (n.startsWith(name)) starts.push(m);
    else if (n.includes(name)) contains.push(m);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

export function regionFromMunicipality(m: Municipality, radiusKm: RegionRadius, source: Region["source"], at?: { lat: number; lng: number }): Region {
  return {
    lat: roundCoord(at?.lat ?? m[3]),
    lng: roundCoord(at?.lng ?? m[4]),
    ibge: m[0],
    city: m[1],
    uf: m[2],
    radiusKm,
    source,
  };
}

/** Validates a region read from a cookie / localStorage (untrusted). */
export function parseRegion(raw: unknown): Region | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const lat = Number(r.lat);
  const lng = Number(r.lng);
  const ibge = Number(r.ibge);
  if (!isValidCoord(lat, lng) || !Number.isInteger(ibge) || ibge === 0) return null;
  // Brazilian municipalities must be in Brazil; world regions must match their own grid cell.
  if (ibge > 0 ? !isInBrazil(lat, lng) : ibge !== worldCellCode(lat, lng)) return null;
  if (typeof r.city !== "string" || r.city.trim() === "" || typeof r.uf !== "string" || !/^[A-Z]{2}$/.test(r.uf)) return null;
  return {
    lat: roundCoord(lat),
    lng: roundCoord(lng),
    ibge,
    city: r.city.slice(0, 80),
    uf: r.uf,
    radiusKm: isRegionRadius(r.radiusKm) ? (Number(r.radiusKm) as RegionRadius) : DEFAULT_REGION_RADIUS_KM,
    source: r.source === "manual" ? "manual" : "gps",
  };
}

export type MissionPlace = { scope: "local" | "anywhere"; latitude: number | string | null; longitude: number | string | null };

/**
 * Splits missions for a region: local ones inside the radius (closest first, with the distance),
 * "anywhere" missions, and how many local missions are elsewhere.
 */
export function groupMissionsByRegion<T extends MissionPlace>(list: T[], region: Region) {
  const nearby: (T & { distanceKm: number })[] = [];
  const anywhere: T[] = [];
  let elsewhere = 0;
  for (const mission of list) {
    if (mission.scope === "anywhere") {
      anywhere.push(mission);
      continue;
    }
    if (mission.latitude === null || mission.longitude === null) continue;
    const d = distanceKm(region.lat, region.lng, Number(mission.latitude), Number(mission.longitude));
    if (d <= region.radiusKm) nearby.push({ ...mission, distanceKm: d });
    else elsewhere++;
  }
  nearby.sort((a, b) => a.distanceKm - b.distanceKm);
  return { nearby, anywhere, elsewhere };
}

/**
 * Without a region: missions that work anywhere, and the local ones (which belong to some city) with
 * the list of their cities, so they can be shown apart instead of mixed in as if they were nearby.
 */
export function splitWithoutRegion<T extends { scope: "local" | "anywhere"; city?: string | null; stateCode?: string | null; ibgeCode?: number | null }>(
  list: T[],
  lang: string,
) {
  const anywhere: T[] = [];
  const local: T[] = [];
  const cities = new Map<string, number>();
  for (const mission of list) {
    if (mission.scope === "anywhere") {
      anywhere.push(mission);
      continue;
    }
    local.push(mission);
    if (mission.city) {
      const label =
        typeof mission.ibgeCode === "number" && mission.ibgeCode < 0
          ? regionLabel({ ibge: mission.ibgeCode, city: mission.city, uf: mission.stateCode ?? UNKNOWN_COUNTRY }, lang)
          : mission.stateCode
            ? `${mission.city}, ${mission.stateCode}`
            : mission.city;
      cities.set(label, (cities.get(label) ?? 0) + 1);
    }
  }
  return { anywhere, local, cities: [...cities.entries()].sort((a, b) => b[1] - a[1]).map(([label]) => label) };
}

export function formatKm(km: number, lang: string) {
  const locale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR";
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${km.toLocaleString(locale, { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}
