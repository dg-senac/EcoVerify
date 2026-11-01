/**
 * How each mission is proven ("tipo de prova"). The proof type decides what the person sends,
 * what the automatic verification checks and how much a moderator ever needs to look at.
 *
 * Pure module: shared by the web app (forms, server actions, AI pipeline) and the APK.
 *
 * Weighing: citizens never weigh anything. Recycling missions ask for a COUNT of items the AI can
 * see in the photo (bottles, cans, cartons...), and the app turns it into an ESTIMATED weight with
 * the fixed table below. A real weight only comes from a partner collection point with a scale.
 */
import { tx, type Lang } from "@/lib/i18n";
import type { Material } from "@/lib/impact";

export const PROOF_TYPES = ["photo", "before_after", "count", "partner"] as const;
export type ProofType = (typeof PROOF_TYPES)[number];

export function isProofType(value: unknown): value is ProofType {
  return typeof value === "string" && (PROOF_TYPES as readonly string[]).includes(value);
}

/** Missions saved before proof types existed are plain photo missions. */
export function proofTypeOf(mission: { proofType?: string | null }): ProofType {
  return isProofType(mission.proofType) ? mission.proofType : "photo";
}

type Text3 = [pt: string, en: string, es: string];

export const PROOF_TYPE_INFO: Record<ProofType, { emoji: string; name: Text3; hint: Text3 }> = {
  photo: {
    emoji: "📷",
    name: ["Foto no local", "Photo on site", "Foto en el lugar"],
    hint: [
      "Uma foto tirada na hora, no local da missão, mostrando a ação ou o resultado.",
      "One photo taken on the spot, at the mission place, showing the action or its result.",
      "Una foto tomada en el momento, en el lugar de la misión, mostrando la acción o el resultado.",
    ],
  },
  before_after: {
    emoji: "🔁",
    name: ["Antes e depois", "Before and after", "Antes y después"],
    hint: [
      "Duas fotos do mesmo lugar: uma antes e outra depois. A IA compara as duas.",
      "Two photos of the same place: one before and one after. The AI compares them.",
      "Dos fotos del mismo lugar: una antes y otra después. La IA las compara.",
    ],
  },
  count: {
    emoji: "🔢",
    name: ["Contagem de itens", "Item count", "Conteo de artículos"],
    hint: [
      "Espalhe os itens para todos aparecerem na foto e informe quantos são. A IA confere a contagem.",
      "Spread the items so they all show in the photo and say how many there are. The AI checks the count.",
      "Extiende los artículos para que todos salgan en la foto e indica cuántos son. La IA verifica el conteo.",
    ],
  },
  partner: {
    emoji: "⚖️",
    name: ["Pesagem no ponto de coleta", "Weighed at a collection point", "Pesaje en el punto de recolección"],
    hint: [
      "Tire uma foto da entrega no ponto de coleta. A equipe do ponto lê o seu QR, pesa o material e confirma: o peso vale como conferido.",
      "Take a photo of the delivery at the collection point. The point's team scans your QR, weighs the material and confirms: the weight counts as checked.",
      "Toma una foto de la entrega en el punto de recolección. El equipo del punto lee tu QR, pesa el material y confirma: el peso cuenta como verificado.",
    ],
  },
};

export function proofTypeName(type: ProofType, lang: Lang): string {
  return tx(lang, ...PROOF_TYPE_INFO[type].name);
}

export function proofTypeHint(type: ProofType, lang: Lang): string {
  return tx(lang, ...PROOF_TYPE_INFO[type].hint);
}

/* ------------------------------------------------------------------ */
/* Counting instead of weighing                                        */
/* ------------------------------------------------------------------ */

export const COUNT_ITEMS = ["pet_bottle", "can", "glass_bottle", "carton", "battery", "oil_bottle", "recyclables_bag", "clothing", "book"] as const;
export type CountItem = (typeof COUNT_ITEMS)[number];

export function isCountItem(value: unknown): value is CountItem {
  return typeof value === "string" && (COUNT_ITEMS as readonly string[]).includes(value);
}

/**
 * Average weight of one item (kg) and its recycling material. Sources: typical packaging weights
 * used by Brazilian recycling programs (PET 2 L ≈ 45-50 g, aluminium can ≈ 13.5-15 g, carton ≈ 27 g,
 * AA battery ≈ 23 g, 2 L bottle of used cooking oil ≈ 1.8 kg). Donations (clothes, books) count items
 * but add no recycling weight.
 */
export const COUNT_ITEM_INFO: Record<CountItem, { emoji: string; kgEach: number; material: Material | null; name: Text3 }> = {
  pet_bottle: { emoji: "🧴", kgEach: 0.048, material: "plastic", name: ["Garrafas PET", "PET bottles", "Botellas PET"] },
  can: { emoji: "🥫", kgEach: 0.0145, material: "metal", name: ["Latinhas de alumínio", "Aluminium cans", "Latas de aluminio"] },
  glass_bottle: { emoji: "🍾", kgEach: 0.4, material: "glass", name: ["Garrafas de vidro", "Glass bottles", "Botellas de vidrio"] },
  carton: { emoji: "🧃", kgEach: 0.027, material: "paper", name: ["Caixas longa vida", "Drink cartons", "Envases de cartón"] },
  battery: { emoji: "🔋", kgEach: 0.023, material: "electronics", name: ["Pilhas e baterias", "Batteries", "Pilas y baterías"] },
  oil_bottle: { emoji: "🛢️", kgEach: 1.8, material: "oil", name: ["Garrafas de 2 L com óleo usado", "2 L bottles of used cooking oil", "Botellas de 2 L con aceite usado"] },
  recyclables_bag: { emoji: "🛍️", kgEach: 2, material: "other", name: ["Sacos de 60 L cheios de recicláveis", "Full 60 L bags of recyclables", "Bolsas de 60 L llenas de reciclables"] },
  clothing: { emoji: "👕", kgEach: 0, material: null, name: ["Peças de roupa", "Pieces of clothing", "Prendas de ropa"] },
  book: { emoji: "📚", kgEach: 0, material: null, name: ["Livros", "Books", "Libros"] },
};

export function countItemName(item: CountItem, lang: Lang): string {
  return tx(lang, ...COUNT_ITEM_INFO[item].name);
}

/** One person, one photo: more than this is a typo (or a lie). */
export const MAX_ITEM_COUNT = 300;

/** Estimated weight of `count` items (kg, 0.1 precision), or null when the item has no recycling weight. */
export function estimatedKg(item: CountItem, count: number): number | null {
  const each = COUNT_ITEM_INFO[item].kgEach;
  if (!each || !(count > 0)) return null;
  return Math.max(0.1, Math.round(count * each * 10) / 10);
}

export type CountMission = { proofType?: string | null; countItem?: string | null; countTarget?: number | null };

/** The item and the minimum a count mission asks for (sane defaults for incomplete data). */
export function countRule(mission: CountMission): { item: CountItem; target: number } {
  const item = isCountItem(mission.countItem) ? mission.countItem : "recyclables_bag";
  const target = Math.min(MAX_ITEM_COUNT, Math.max(1, Math.round(Number(mission.countTarget) || 1)));
  return { item, target };
}

/**
 * Validates the declared count. Error keys match the i18n dictionaries (error_*).
 * Returns the material and estimated weight to store with the proof.
 */
export function checkCountInput(
  mission: CountMission,
  raw: unknown,
): { count: number | null; material: Material | null; weightKg: number | null; error?: "count_invalid" | "count_below_target" } {
  if (proofTypeOf(mission) !== "count") return { count: null, material: null, weightKg: null };
  const { item, target } = countRule(mission);
  const text = String(raw ?? "").trim();
  if (!/^\d{1,4}$/.test(text)) return { count: null, material: null, weightKg: null, error: "count_invalid" };
  const count = Number(text);
  if (count < 1 || count > MAX_ITEM_COUNT) return { count: null, material: null, weightKg: null, error: "count_invalid" };
  if (count < target) return { count, material: null, weightKg: null, error: "count_below_target" };
  return { count, material: COUNT_ITEM_INFO[item].material, weightKg: estimatedKg(item, count) };
}

/**
 * Compares the declared count with what the AI counted in the photo.
 * - "ok": the photo backs the number (small differences are normal: items overlap).
 * - "low": clearly fewer items in the photo than declared.
 * - "unknown": the AI did not count.
 */
export function countCheck(declared: number | null | undefined, counted: number | null | undefined): "ok" | "low" | "unknown" {
  if (declared == null || counted == null || !Number.isFinite(counted)) return "unknown";
  const tolerance = Math.max(2, Math.ceil(declared * 0.2));
  return counted + tolerance >= declared ? "ok" : "low";
}

/** Items that count for the record: never more than what the photo shows when the AI counted. */
export function verifiedCount(declared: number, counted: number | null | undefined): number {
  return counted != null && Number.isFinite(counted) && counted < declared ? Math.max(0, Math.round(counted)) : declared;
}

/** Where the weight of a recycling proof came from (shown next to the kg). */
export type WeightSource = "estimated" | "partner" | "declared";

export function weightSourceLabel(source: WeightSource | null | undefined, lang: Lang): string {
  if (source === "partner") return tx(lang, "conferido no ponto de coleta", "checked at the collection point", "verificado en el punto de recolección");
  if (source === "declared") return tx(lang, "informado pela pessoa", "typed by the person", "informado por la persona");
  return tx(lang, "estimado pela contagem", "estimated from the count", "estimado por el conteo");
}

/** Reads the proof fields of a mission form ("proofType", "countItem", "countTarget", "collectionPointId"). */
export function parseProofFields(get: (name: string) => unknown): {
  proofType: ProofType;
  countItem: CountItem | null;
  countTarget: number | null;
  collectionPointId: string | null;
  error?: "count_item_required" | "collection_point_required";
} {
  const proofType = isProofType(get("proofType")) ? (get("proofType") as ProofType) : "photo";
  if (proofType === "partner") {
    const point = String(get("collectionPointId") ?? "").trim();
    if (!point) return { proofType, countItem: null, countTarget: null, collectionPointId: null, error: "collection_point_required" };
    return { proofType, countItem: null, countTarget: null, collectionPointId: point };
  }
  if (proofType !== "count") return { proofType, countItem: null, countTarget: null, collectionPointId: null };
  const item = get("countItem");
  if (!isCountItem(item)) return { proofType, countItem: null, countTarget: null, collectionPointId: null, error: "count_item_required" };
  const target = Math.min(MAX_ITEM_COUNT, Math.max(1, Math.round(Number(get("countTarget")) || 1)));
  return { proofType, countItem: item, countTarget: target, collectionPointId: null };
}

/** Suggested proof type for a category (what the mission forms start with). */
export function defaultProofType(category: string): ProofType {
  return category === "recycling" ? "count" : category === "cleanup" ? "before_after" : "photo";
}
