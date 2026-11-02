import "server-only";
import { placeFromAreas, type OsmArea } from "@/lib/region";

/**
 * Names a place outside Brazil (city + country) from the OpenStreetMap administrative areas that
 * contain it, using the same Overpass API as the automatic missions. Only the rounded (~1 km)
 * coordinates are sent. Returns null on any failure: the region then gets a generic name.
 */

const DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const TIMEOUT_MS = 7_000;

export async function lookupPlaceName(lat: number, lng: number, lang: string): Promise<{ city: string | null; country: string | null } | null> {
  if (process.env.AUTO_MISSIONS_OSM?.trim().toLowerCase() === "off") return null;
  const url = process.env.OVERPASS_API_URL?.trim() || DEFAULT_OVERPASS_URL;
  const query = `[out:json][timeout:6];
is_in(${lat.toFixed(2)},${lng.toFixed(2)})->.a;
area.a["admin_level"];
out tags;`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": "EcoVerify/1.0 (regional missions)",
      },
      body: new URLSearchParams({ data: query }).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`overpass_http_${response.status}`);
    const json = (await response.json()) as { elements?: unknown };
    const areas = Array.isArray(json.elements) ? (json.elements as OsmArea[]) : [];
    const place = placeFromAreas(areas, lang);
    return place.city || place.country ? place : null;
  } catch (error) {
    console.error(`[regional] place name lookup failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
