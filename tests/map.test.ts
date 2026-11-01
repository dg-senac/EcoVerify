import { describe, expect, it } from "vitest";
import type { ImpactRow } from "@/lib/impact";
import { MIN_PEOPLE_PER_ROW } from "@/lib/impact";
import { dumpPins, heatColor, heatPins, missionPins, pinsBounds, RESOLVED_DUMP_DAYS, type MapDump } from "@/lib/map";
import { DAY } from "./helpers";

const RECIFE = { lat: -8.0631, lng: -34.8711, radiusKm: 10 };

function row(userId: string, lat: number | null, lng: number | null, scope: "local" | "anywhere" = "local"): ImpactRow {
  return {
    submissionId: `${userId}-${lat}-${lng}-${scope}`,
    userId,
    approvedAt: "2026-10-01T12:00:00.000Z",
    category: "cleanup",
    missionTitle: "Mutirão",
    scope,
    city: "Recife",
    stateCode: "PE",
    latitude: lat,
    longitude: lng,
    material: null,
    weightKg: null,
  };
}

const people = (n: number, lat = -8.1196, lng = -34.8956) => Array.from({ length: n }, (_, i) => row(`u${i}`, lat, lng));

describe("heat layer (privacy)", () => {
  it(`hides areas with fewer than ${MIN_PEOPLE_PER_ROW} different people`, () => {
    expect(heatPins(people(MIN_PEOPLE_PER_ROW - 1), "pt")).toHaveLength(0);
    // Many actions by the same few people still do not show.
    const repeated = [...people(MIN_PEOPLE_PER_ROW - 1), ...people(MIN_PEOPLE_PER_ROW - 1)].map((r, i) => ({ ...r, submissionId: `s${i}` }));
    expect(heatPins(repeated, "pt")).toHaveLength(0);
  });

  it(`shows an area once ${MIN_PEOPLE_PER_ROW} people acted there, as a ~1 km square without names`, () => {
    const [pin] = heatPins(people(MIN_PEOPLE_PER_ROW), "pt");
    expect(pin.layer).toBe("heat");
    expect(pin.people).toBe(MIN_PEOPLE_PER_ROW);
    expect(pin.target).toBeNull();
    expect(JSON.stringify(pin)).not.toMatch(/u0|u1/);
    const [[s, w], [n, e]] = pin.bounds!;
    expect(n - s).toBeCloseTo(0.01, 6);
    expect(e - w).toBeCloseTo(0.01, 6);
  });

  it("never uses missions done at home or without a point", () => {
    const home = Array.from({ length: 8 }, (_, i) => row(`h${i}`, -8.1, -34.9, "anywhere"));
    const noPoint = Array.from({ length: 8 }, (_, i) => row(`n${i}`, null, null));
    expect(heatPins([...home, ...noPoint], "pt")).toHaveLength(0);
  });

  it("filters by region and scales intensity to the busiest area", () => {
    const busy = Array.from({ length: 10 }, (_, i) => row(`b${i}`, -8.06, -34.87));
    const calm = people(MIN_PEOPLE_PER_ROW, -8.05, -34.9);
    const far = people(MIN_PEOPLE_PER_ROW, -23.55, -46.63); // São Paulo
    const pins = heatPins([...busy, ...calm, ...far], "en", RECIFE);
    expect(pins).toHaveLength(2);
    expect(Math.max(...pins.map((p) => p.intensity!))).toBe(1);
    expect(pins.find((p) => p.actions === 10)!.color).toBe(heatColor(1));
  });
});

describe("mission layer", () => {
  const base = { title: "Plantio", titleEn: "Planting", category: "planting", isActive: true };
  it("shows active local missions with a point, in the person's language", () => {
    const pins = missionPins([{ ...base, id: "a", scope: "local", latitude: "-8.04", longitude: "-34.90", pointsReward: 80, city: "Recife" }], "en");
    expect(pins).toHaveLength(1);
    expect(pins[0].title).toBe("Planting");
    expect(pins[0].target).toEqual({ kind: "mission", id: "a" });
    expect(pins[0].subtitle).toBe("Recife · +80 pts");
  });

  it("skips home missions, inactive ones, missing points and other regions", () => {
    const pins = missionPins(
      [
        { ...base, id: "home", scope: "anywhere", latitude: -8.04, longitude: -34.9 },
        { ...base, id: "off", scope: "local", latitude: -8.04, longitude: -34.9, isActive: false },
        { ...base, id: "nopoint", scope: "local", latitude: null, longitude: null },
        { ...base, id: "sp", scope: "local", latitude: -23.55, longitude: -46.63 },
      ],
      "pt",
      RECIFE,
    );
    expect(pins).toHaveLength(0);
  });
});

describe("dump layer", () => {
  const now = new Date("2026-11-01T12:00:00Z");
  const dump = (status: MapDump["status"], extra: Partial<MapDump> = {}): MapDump => ({ id: status, latitude: -8.06, longitude: -34.88, status, ...extra });

  it("shows only public spots, never pending, rejected or expired ones", () => {
    const pins = dumpPins([dump("open"), dump("confirmed", { missionId: "m1" }), dump("pending"), dump("rejected"), dump("expired")], "pt", null, now);
    expect(pins.map((p) => p.id)).toEqual(["d-open", "d-confirmed"]);
    expect(pins[1].target).toEqual({ kind: "dump", missionId: "m1" });
    expect(pins[0].target).toEqual({ kind: "dump", missionId: null });
  });

  it(`keeps cleaned spots for ${RESOLVED_DUMP_DAYS} days`, () => {
    const recent = dump("resolved", { id: "recent", resolvedAt: new Date(now.getTime() - 5 * DAY).toISOString() });
    const old = dump("resolved", { id: "old", resolvedAt: new Date(now.getTime() - (RESOLVED_DUMP_DAYS + 1) * DAY).toISOString() });
    expect(dumpPins([recent, old], "pt", null, now).map((p) => p.id)).toEqual(["d-recent"]);
  });

  it("never carries who reported the spot", () => {
    const pins = dumpPins([{ ...dump("open"), userId: "secret-user" } as MapDump], "pt", null, now);
    expect(JSON.stringify(pins)).not.toContain("secret-user");
  });
});

describe("pinsBounds", () => {
  it("frames all pins, or null when empty", () => {
    expect(pinsBounds([])).toBeNull();
    expect(
      pinsBounds([
        { lat: -8.1, lng: -34.9 },
        { lat: -8.0, lng: -34.8 },
      ]),
    ).toEqual([
      [-8.1, -34.9],
      [-8.0, -34.8],
    ]);
  });
});
