/**
 * Climate impact ESTIMATE of verified recycling: kg of CO₂e avoided per kg delivered, by material.
 * Pure: shared by the web app, the APK and the tests. Methodology and caveats: docs/IMPACTO.md.
 *
 * Every number on screen built from this file must be labelled as an estimate ("estimativa"):
 * - the factors are averages from life-cycle models (mostly US EPA WARM), not measurements of EcoVerify deliveries;
 * - the weight itself is estimated from the item count or weighed at a partner point (not a certified weighing);
 * - this is NOT a carbon credit and cannot be sold or used to offset emissions.
 *
 * Water is intentionally NOT estimated: we found no per-material water factor from a primary source
 * (only secondary figures repeated without methodology). See docs/IMPACTO.md.
 */
import type { Lang } from "@/lib/i18n";
// Type-only import: src/lib/impact.ts imports this file (CSV column), so no runtime import back.
import type { Material } from "@/lib/impact";

/** 1 short ton (US) = 907.18474 kg. WARM factors are MTCO₂E per short ton; t/short ton ÷ 0.90718474 = kg/kg. */
export const SHORT_TON_IN_TONNES = 0.90718474;

export type SourceId = "warm" | "red2" | "epa_eq";

export interface ImpactSource {
  id: SourceId;
  name: string;
  url: string;
}

export const IMPACT_SOURCES: Record<SourceId, ImpactSource> = {
  warm: {
    id: "warm",
    name: "US EPA — WARM v16, Documentation for GHG Emission and Energy Factors, Management Practices Chapters (Dec 2023, EPA-530-R-23-018), Exhibit 1-1",
    url: "https://www.epa.gov/waste-reduction-model/documentation-waste-reduction-model",
  },
  red2: {
    id: "red2",
    name: "EU — Directive (EU) 2018/2001 (RED II), Annex III (energy content) and Annex V (default value for waste cooking oil biodiesel; fossil fuel comparator)",
    url: "https://eur-lex.europa.eu/eli/dir/2018/2001/oj",
  },
  epa_eq: {
    id: "epa_eq",
    name: "US EPA — Greenhouse Gas Equivalencies Calculator, Calculations and References (miles driven by the average gasoline passenger vehicle)",
    url: "https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references",
  },
};

/** WARM v16 (Exhibit 1-1), MTCO₂E per short ton: net recycling vs net landfilling. Avoided = landfill − recycling. */
export const WARM_V16: Record<Exclude<Material, "oil">, { warmMaterial: string; recycling: number; landfilling: number }> = {
  plastic: { warmMaterial: "Mixed Plastics", recycling: -0.93, landfilling: 0.02 },
  paper: { warmMaterial: "Mixed Paper (general)", recycling: -3.55, landfilling: 0.07 },
  metal: { warmMaterial: "Mixed Metals", recycling: -4.39, landfilling: 0.02 },
  glass: { warmMaterial: "Glass", recycling: -0.28, landfilling: 0.02 },
  electronics: { warmMaterial: "Mixed Electronics", recycling: -0.9, landfilling: 0.02 },
  other: { warmMaterial: "Mixed Recyclables", recycling: -2.8, landfilling: 0.03 },
};

/**
 * Used cooking oil is not in WARM. We count the diesel it replaces once turned into biodiesel:
 * (fossil comparator 94 − default for waste cooking oil biodiesel 14.9) gCO₂e/MJ × 37 MJ/kg of biodiesel (RED II),
 * × 0.8 kg of biodiesel per kg of collected oil — a conservative EcoVerify assumption (water, residue, process losses).
 */
export const COOKING_OIL = {
  fossilComparatorG: 94,
  wasteOilBiodieselDefaultG: 14.9,
  biodieselMjPerKg: 37,
  biodieselYield: 0.8,
} as const;

const round3 = (n: number) => Math.round(n * 1000) / 1000;

function warmKgPerKg(material: Exclude<Material, "oil">): number {
  const f = WARM_V16[material];
  return round3((f.landfilling - f.recycling) / SHORT_TON_IN_TONNES);
}

function oilKgPerKg(): number {
  const o = COOKING_OIL;
  return round3(((o.fossilComparatorG - o.wasteOilBiodieselDefaultG) * o.biodieselMjPerKg * o.biodieselYield) / 1000);
}

export interface Co2Factor {
  material: Material;
  /** kg of CO₂e avoided per kg delivered (estimate). */
  kgPerKg: number;
  source: SourceId;
  /** What the factor compares, in each language. */
  basis: Record<Lang, string>;
}

const warmBasis = (m: Exclude<Material, "oil">): Record<Lang, string> => {
  const name = WARM_V16[m].warmMaterial;
  return {
    pt: `Reciclar em vez de mandar para o aterro (WARM: "${name}")`,
    en: `Recycling instead of landfilling (WARM: "${name}")`,
    es: `Reciclar en vez de enviar al relleno (WARM: "${name}")`,
  };
};

export const CO2_FACTORS: Record<Material, Co2Factor> = {
  plastic: { material: "plastic", kgPerKg: warmKgPerKg("plastic"), source: "warm", basis: warmBasis("plastic") },
  paper: { material: "paper", kgPerKg: warmKgPerKg("paper"), source: "warm", basis: warmBasis("paper") },
  metal: { material: "metal", kgPerKg: warmKgPerKg("metal"), source: "warm", basis: warmBasis("metal") },
  glass: { material: "glass", kgPerKg: warmKgPerKg("glass"), source: "warm", basis: warmBasis("glass") },
  electronics: { material: "electronics", kgPerKg: warmKgPerKg("electronics"), source: "warm", basis: warmBasis("electronics") },
  oil: {
    material: "oil",
    kgPerKg: oilKgPerKg(),
    source: "red2",
    basis: {
      pt: "Diesel substituído por biodiesel de óleo usado (RED II), com rendimento conservador de 80%",
      en: "Diesel replaced by used-oil biodiesel (RED II), with a conservative 80% yield",
      es: "Diésel sustituido por biodiésel de aceite usado (RED II), con rendimiento conservador del 80%",
    },
  },
  other: { material: "other", kgPerKg: warmKgPerKg("other"), source: "warm", basis: warmBasis("other") },
};

/** kg CO₂e per km driven by the average gasoline passenger car (EPA: 3.93 × 10⁻⁴ t/mile ÷ 1.609344 km/mile). */
export const CAR_KG_CO2E_PER_KM = round3(0.393 / 1.609344);

function materialKey(material: unknown): Material {
  return typeof material === "string" && Object.prototype.hasOwnProperty.call(CO2_FACTORS, material) ? (material as Material) : "other";
}

/** Avoided kg CO₂e for one delivery. Unknown/missing material counts as "mixed recyclables" (other). */
export function co2AvoidedKg(material: Material | string | null | undefined, kg: number | string | null | undefined): number {
  const weight = Number(kg ?? 0);
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  const key = materialKey(material);
  return weight * CO2_FACTORS[key].kgPerKg;
}

export interface Co2Estimate {
  /** kg CO₂e avoided (estimate), rounded to 0.1. */
  co2Kg: number;
  /** Same CO₂e as this many km by the average gasoline car (rounded). */
  carKm: number;
  byMaterial: { material: Material; kg: number; co2Kg: number }[];
}

/** Sum of the estimate for many deliveries (or per-material buckets). */
export function co2Estimate(items: { material: Material | string | null | undefined; kg: number | string | null | undefined }[]): Co2Estimate {
  const map = new Map<Material, { kg: number; co2Kg: number }>();
  for (const item of items) {
    const weight = Number(item.kg ?? 0);
    if (!Number.isFinite(weight) || weight <= 0) continue;
    const key = materialKey(item.material);
    const bucket = map.get(key) ?? { kg: 0, co2Kg: 0 };
    bucket.kg += weight;
    bucket.co2Kg += co2AvoidedKg(key, weight);
    map.set(key, bucket);
  }
  const byMaterial = [...map.entries()]
    .map(([material, b]) => ({ material, kg: Math.round(b.kg * 10) / 10, co2Kg: Math.round(b.co2Kg * 10) / 10 }))
    .sort((a, b) => b.co2Kg - a.co2Kg);
  const total = [...map.values()].reduce((sum, b) => sum + b.co2Kg, 0);
  return { co2Kg: Math.round(total * 10) / 10, carKm: Math.round(total / CAR_KG_CO2E_PER_KM), byMaterial };
}

const localeOf = (lang: Lang) => (lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR");

/** "≈ 12 kg CO₂e", "≈ 1,4 t CO₂e". Values under 10 kg keep one decimal. */
export function formatCo2(kg: number, lang: Lang = "pt"): string {
  const locale = localeOf(lang);
  if (kg >= 1000) return `≈ ${(kg / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} t CO₂e`;
  return `≈ ${kg.toLocaleString(locale, { maximumFractionDigits: kg < 10 ? 1 : 0 })} kg CO₂e`;
}

export function formatFactor(kgPerKg: number, lang: Lang = "pt"): string {
  return kgPerKg.toLocaleString(localeOf(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatKm(km: number, lang: Lang = "pt"): string {
  return `${km.toLocaleString(localeOf(lang), { maximumFractionDigits: 0 })} km`;
}
