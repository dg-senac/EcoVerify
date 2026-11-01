import { describe, expect, it } from "vitest";
import { MATERIALS, recyclingCsv, type ImpactRow } from "@/lib/impact";
import {
  CAR_KG_CO2E_PER_KM,
  CO2_FACTORS,
  IMPACT_SOURCES,
  SHORT_TON_IN_TONNES,
  WARM_V16,
  co2AvoidedKg,
  co2Estimate,
  formatCo2,
} from "@/lib/impact-factors";
import { personalImpact } from "@/lib/achievements";

describe("CO₂e factors (docs/IMPACTO.md)", () => {
  it("has a factor and a cited source for every material", () => {
    for (const m of MATERIALS) {
      const f = CO2_FACTORS[m];
      expect(f.kgPerKg).toBeGreaterThan(0);
      expect(IMPACT_SOURCES[f.source].url).toMatch(/^https:\/\//);
      expect(f.basis.pt && f.basis.en && f.basis.es).toBeTruthy();
    }
  });

  it("converts WARM (MTCO₂E per short ton, landfill − recycling) to kg per kg", () => {
    // Mixed Plastics: (0.02 − (−0.93)) / 0.90718474 = 1.047
    expect(CO2_FACTORS.plastic.kgPerKg).toBeCloseTo(1.047, 3);
    expect(CO2_FACTORS.paper.kgPerKg).toBeCloseTo(3.99, 3);
    expect(CO2_FACTORS.metal.kgPerKg).toBeCloseTo(4.861, 3);
    expect(CO2_FACTORS.glass.kgPerKg).toBeCloseTo(0.331, 3);
    expect(CO2_FACTORS.electronics.kgPerKg).toBeCloseTo(1.014, 3);
    // Mixed Recyclables 2.83 t/short ton — the same net value the EPA equivalencies page uses.
    expect(CO2_FACTORS.other.kgPerKg).toBeCloseTo(3.12, 3);
    for (const [m, f] of Object.entries(WARM_V16)) {
      expect(CO2_FACTORS[m as keyof typeof WARM_V16].kgPerKg).toBeCloseTo((f.landfilling - f.recycling) / SHORT_TON_IN_TONNES, 3);
    }
  });

  it("derives the cooking-oil factor from RED II with a conservative yield", () => {
    // (94 − 14.9) g/MJ × 37 MJ/kg × 0.8 = 2.341 kg/kg
    expect(CO2_FACTORS.oil.kgPerKg).toBeCloseTo(2.341, 3);
    expect(CO2_FACTORS.oil.source).toBe("red2");
  });

  it("uses the EPA average gasoline car (3.93e-4 t/mile)", () => {
    expect(CAR_KG_CO2E_PER_KM).toBeCloseTo(0.244, 3);
  });
});

describe("co2AvoidedKg / co2Estimate", () => {
  it("multiplies kg by the material factor", () => {
    expect(co2AvoidedKg("glass", 10)).toBeCloseTo(3.31, 2);
    expect(co2AvoidedKg("metal", "2.5")).toBeCloseTo(12.15, 2);
  });

  it("treats missing or unknown materials as mixed recyclables", () => {
    expect(co2AvoidedKg(null, 1)).toBeCloseTo(CO2_FACTORS.other.kgPerKg, 6);
    expect(co2AvoidedKg("toString", 1)).toBeCloseTo(CO2_FACTORS.other.kgPerKg, 6);
  });

  it("ignores empty, zero, negative and invalid weights", () => {
    expect(co2AvoidedKg("paper", 0)).toBe(0);
    expect(co2AvoidedKg("paper", -3)).toBe(0);
    expect(co2AvoidedKg("paper", "abc")).toBe(0);
    expect(co2AvoidedKg("paper", null)).toBe(0);
  });

  it("sums by material, sorted by CO₂e, with car km", () => {
    const est = co2Estimate([
      { material: "plastic", kg: 2 },
      { material: "plastic", kg: 3 },
      { material: "metal", kg: 1 },
      { material: "glass", kg: 0 },
    ]);
    expect(est.byMaterial.map((b) => b.material)).toEqual(["plastic", "metal"]);
    expect(est.byMaterial[0].kg).toBe(5);
    expect(est.co2Kg).toBeCloseTo(5 * 1.047 + 4.861, 1);
    expect(est.carKm).toBe(Math.round((5 * CO2_FACTORS.plastic.kgPerKg + CO2_FACTORS.metal.kgPerKg) / CAR_KG_CO2E_PER_KM));
  });

  it("returns zeros when there is nothing recycled", () => {
    expect(co2Estimate([])).toEqual({ co2Kg: 0, carKm: 0, byMaterial: [] });
  });
});

describe("where the estimate shows up", () => {
  it("personal impact counts only recycling actions", () => {
    const impact = personalImpact([
      { category: "recycling", at: "2026-10-01", weightKg: "4", material: "paper" },
      { category: "cleanup", at: "2026-10-02", weightKg: 50, material: "metal" },
    ]);
    expect(impact.recycledKg).toBe(4);
    expect(impact.co2Kg).toBeCloseTo(4 * 3.99, 1);
    expect(impact.carKm).toBeGreaterThan(0);
  });

  it("the cooperative CSV has an estimated CO₂e column", () => {
    const row: ImpactRow = {
      submissionId: "11111111-2222-3333-4444-555555555555",
      userId: "u1",
      approvedAt: "2026-10-10T12:00:00.000Z",
      category: "recycling",
      missionTitle: "Ponto Boa Viagem",
      scope: "local",
      city: "Recife",
      stateCode: "PE",
      latitude: null,
      longitude: null,
      material: "glass",
      weightKg: 10,
    };
    const [header, line] = recyclingCsv([row]).trim().split(/\r?\n/);
    expect(header).toContain("kg_co2e_evitado_estimativa");
    expect(line).toContain("3,3");
  });

  it("formats as an approximation", () => {
    expect(formatCo2(3.31, "pt")).toBe("≈ 3,3 kg CO₂e");
    expect(formatCo2(12.4, "en")).toBe("≈ 12 kg CO₂e");
    expect(formatCo2(1450, "pt")).toBe("≈ 1,5 t CO₂e");
  });
});
