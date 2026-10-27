/**
 * Regional missions: pure helpers shared by the web app and the offline demo.
 *
 * The user's region is the municipality closest to their GPS reading (or the city they picked).
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
  ibge: number;
  city: string;
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
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInBrazil(lat, lng) || !Number.isInteger(ibge)) return null;
  if (typeof r.city !== "string" || typeof r.uf !== "string" || !/^[A-Z]{2}$/.test(r.uf)) return null;
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

export function formatKm(km: number, lang: string) {
  const locale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR";
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${km.toLocaleString(locale, { maximumFractionDigits: km < 10 ? 1 : 0 })} km`;
}
