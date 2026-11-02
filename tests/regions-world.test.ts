import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import data from "@/data/municipios-br.json";
import { ANYWHERE_MISSIONS } from "@/lib/anywhere-missions";
import { COUNT_ITEMS, PROOF_TYPES } from "@/lib/proof";
import {
  groupMissionsByRegion,
  isWorldRegion,
  municipalityForGps,
  parseRegion,
  placeFromAreas,
  regionFromMunicipality,
  regionLabel,
  splitWithoutRegion,
  worldCellCode,
  worldRegion,
  type Municipality,
} from "@/lib/region";

const MUNICIPALITIES = data as unknown as Municipality[];
const LISBON = { lat: 38.7223, lng: -9.1393 };
const DUBAI = { lat: 25.2048, lng: 55.2708 };

describe("world regions", () => {
  it("keeps Brazilian GPS readings on their municipality and sends the rest of the world to world regions", () => {
    expect(municipalityForGps(MUNICIPALITIES, -8.0631, -34.8711)?.[1]).toBe("Recife");
    expect(municipalityForGps(MUNICIPALITIES, LISBON.lat, LISBON.lng)).toBeNull();
    expect(municipalityForGps(MUNICIPALITIES, DUBAI.lat, DUBAI.lng)).toBeNull();
  });

  it("gives every point a negative grid-cell code that never clashes with IBGE codes", () => {
    const lisbon = worldCellCode(LISBON.lat, LISBON.lng);
    expect(lisbon).toBeLessThan(0);
    expect(worldCellCode(LISBON.lat + 0.01, LISBON.lng + 0.01)).toBe(lisbon);
    expect(worldCellCode(DUBAI.lat, DUBAI.lng)).not.toBe(lisbon);
    expect(worldCellCode(90, 180)).toBeLessThan(0);
    expect(worldCellCode(-90, -180)).toBe(-1);
  });

  it("builds a world region that survives the cookie round trip, and rejects a tampered one", () => {
    const region = worldRegion(LISBON.lat, LISBON.lng, 30, { city: "Lisboa", country: "PT" }, "pt");
    expect(isWorldRegion(region)).toBe(true);
    expect(region).toMatchObject({ lat: 38.72, lng: -9.14, city: "Lisboa", uf: "PT", source: "gps" });
    expect(parseRegion(JSON.parse(JSON.stringify(region)))).toEqual(region);
    expect(parseRegion({ ...region, ibge: region.ibge - 1 })).toBeNull();
    expect(parseRegion({ ...region, city: "" })).toBeNull();
  });

  it("falls back to a generic name and an unknown country when the place could not be named", () => {
    expect(worldRegion(DUBAI.lat, DUBAI.lng, 10, null, "pt")).toMatchObject({ city: "Sua região", uf: "ZZ" });
    expect(worldRegion(DUBAI.lat, DUBAI.lng, 10, { city: "  ", country: "xx1" }, "en")).toMatchObject({ city: "Your area", uf: "ZZ" });
    expect(regionLabel(worldRegion(DUBAI.lat, DUBAI.lng, 10, null, "es"), "es")).toBe("Tu zona");
  });

  it("labels Brazilian regions with the state and world regions with the country in the user's language", () => {
    const recife = MUNICIPALITIES.find((m) => m[1] === "Recife")!;
    expect(regionLabel(regionFromMunicipality(recife, 30, "manual"), "en")).toBe("Recife, PE");
    const lisbon = worldRegion(LISBON.lat, LISBON.lng, 30, { city: "Lisboa", country: "PT" });
    expect(regionLabel(lisbon, "pt")).toBe("Lisboa, Portugal");
    expect(regionLabel(lisbon, "es")).toBe("Lisboa, Portugal");
    expect(regionLabel(worldRegion(1.29, 103.85, 10, { city: "Singapore", country: "SG" }), "en")).toBe("Singapore");
  });

  it("names a place from the OpenStreetMap areas that contain it", () => {
    const areas: { tags: Record<string, string> }[] = [
      { tags: { boundary: "administrative", admin_level: "2", name: "Portugal", "ISO3166-1": "PT" } },
      { tags: { boundary: "administrative", admin_level: "7", name: "Área Metropolitana de Lisboa" } },
      { tags: { boundary: "administrative", admin_level: "8", name: "Lisboa", "name:en": "Lisbon" } },
      { tags: { boundary: "administrative", admin_level: "9", name: "Santa Maria Maior" } },
    ];
    expect(placeFromAreas(areas, "en")).toEqual({ city: "Lisbon", country: "PT" });
    expect(placeFromAreas(areas, "pt")).toEqual({ city: "Lisbon", country: "PT" });
    const withPt = [...areas.slice(0, 2), { tags: { ...areas[2].tags, "name:pt": "Lisboa" } }];
    expect(placeFromAreas(withPt, "pt")).toEqual({ city: "Lisboa", country: "PT" });
    // City-state: no municipality level, the country names the place.
    expect(placeFromAreas([{ tags: { boundary: "administrative", admin_level: "2", name: "Singapore", "ISO3166-1:alpha2": "sg" } }], "en")).toEqual({
      city: "Singapore",
      country: "SG",
    });
    expect(placeFromAreas([], "en")).toEqual({ city: null, country: null });
  });

  it("filters missions around a world region by distance, like in Brazil", () => {
    const region = worldRegion(LISBON.lat, LISBON.lng, 10, { city: "Lisboa", country: "PT" });
    const list = [
      { id: "near", scope: "local" as const, latitude: 38.73, longitude: -9.15 },
      { id: "recife", scope: "local" as const, latitude: -8.06, longitude: -34.87 },
      { id: "home", scope: "anywhere" as const, latitude: null, longitude: null },
    ];
    const { nearby, anywhere, elsewhere } = groupMissionsByRegion(list, region);
    expect(nearby.map((m) => m.id)).toEqual(["near"]);
    expect(anywhere.map((m) => m.id)).toEqual(["home"]);
    expect(elsewhere).toBe(1);
  });
});

describe("mission list without a region", () => {
  it("puts anywhere missions first and keeps other cities' missions apart, with their cities", () => {
    const list = [
      { id: "a", scope: "local" as const, city: "Recife", stateCode: "PE", ibgeCode: 2611606 },
      { id: "b", scope: "anywhere" as const, city: null, stateCode: null, ibgeCode: null },
      { id: "c", scope: "local" as const, city: "Recife", stateCode: "PE", ibgeCode: 2611606 },
      { id: "d", scope: "local" as const, city: "Lisboa", stateCode: "PT", ibgeCode: worldCellCode(38.72, -9.14) },
    ];
    const { anywhere, local, cities } = splitWithoutRegion(list, "pt");
    expect(anywhere.map((m) => m.id)).toEqual(["b"]);
    expect(local.map((m) => m.id)).toEqual(["a", "c", "d"]);
    expect(cities).toEqual(["Recife, PE", "Lisboa, Portugal"]);
  });
});

describe("anywhere missions", () => {
  const sql07 = readFileSync("supabase/07_missoes_qualquer_lugar.sql", "utf8");
  const sql04 = readFileSync("supabase/04_missoes_iniciais.sql", "utf8");

  it("are verifiable by photo, points only, and complete in the three languages", () => {
    expect(ANYWHERE_MISSIONS.length).toBeGreaterThanOrEqual(6);
    const keys = new Set<string>();
    for (const m of ANYWHERE_MISSIONS) {
      expect(keys.has(m.key)).toBe(false);
      keys.add(m.key);
      expect(PROOF_TYPES).toContain(m.proofType);
      expect(m.proofType).not.toBe("partner");
      if (m.proofType === "count") {
        expect(COUNT_ITEMS).toContain(m.countItem);
        expect(m.countTarget).toBeGreaterThan(0);
      }
      expect(m.points).toBeGreaterThan(0);
      expect(m.points).toBeLessThanOrEqual(30);
      expect(m.aiChecklist.length).toBeGreaterThan(20);
      for (const text of [m.title, m.description, m.context, m.impact]) {
        expect(text.pt.trim()).not.toBe("");
        expect(text.en.trim()).not.toBe("");
        expect(text.es.trim()).not.toBe("");
      }
    }
  });

  it("match supabase/07 (same titles, no FONE) and don't repeat the initial missions", () => {
    for (const m of ANYWHERE_MISSIONS) {
      const title = m.title.pt.replace(/'/g, "''");
      expect(sql07).toContain(`"title": "${title}"`);
      expect(sql04).not.toContain(`"title": "${title}"`);
    }
    expect(sql07.match(/"title": /g)?.length).toBe(ANYWHERE_MISSIONS.length);
    expect(sql07).not.toMatch(/"fone_reward": [1-9]/);
    expect(sql07).toContain("where not exists");
  });
});
