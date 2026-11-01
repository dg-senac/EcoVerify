/**
 * Recycling (material + weight of each delivery) and anonymous aggregated data.
 * Pure: shared by the server (src/lib/impact-server.ts, admin tabs, CSV routes) and the offline demo.
 * See docs/MONETIZACAO.md, sections 6 and 7.
 */
import type { Lang } from "@/lib/i18n";
import { weightSourceLabel, type WeightSource } from "@/lib/proof";
import { co2AvoidedKg } from "@/lib/impact-factors";

/* ------------------------------------------------------------------ */
/* Recycling: material and weight                                      */
/* ------------------------------------------------------------------ */

export const MATERIALS = ["plastic", "paper", "metal", "glass", "electronics", "oil", "other"] as const;
export type Material = (typeof MATERIALS)[number];

export const MATERIAL_EMOJI: Record<Material, string> = {
  plastic: "🧴",
  paper: "📦",
  metal: "🥫",
  glass: "🍾",
  electronics: "🔌",
  oil: "🛢️",
  other: "♻️",
};

export const MATERIAL_LABELS: Record<Material, Record<Lang, string>> = {
  plastic: { pt: "Plástico", en: "Plastic", es: "Plástico" },
  paper: { pt: "Papel e papelão", en: "Paper and cardboard", es: "Papel y cartón" },
  metal: { pt: "Metal e latas", en: "Metal and cans", es: "Metal y latas" },
  glass: { pt: "Vidro", en: "Glass", es: "Vidrio" },
  electronics: { pt: "Eletrônicos", en: "Electronics", es: "Electrónicos" },
  oil: { pt: "Óleo de cozinha", en: "Cooking oil", es: "Aceite de cocina" },
  other: { pt: "Outro", en: "Other", es: "Otro" },
};

export function isMaterial(value: unknown): value is Material {
  return typeof value === "string" && (MATERIALS as readonly string[]).includes(value);
}

export const MIN_WEIGHT_KG = 0.1;
/** One delivery by one person: more than this is almost certainly a typo (or a lie). */
export const MAX_WEIGHT_KG = 200;
/** Heavier deliveries always go to a person, even when the AI would approve them alone. */
export const MAX_AUTO_APPROVE_KG = 20;

/** Accepts "2,5", "2.5", " 3 kg ". Returns kg rounded to 0.1, or null when invalid/out of range. */
export function parseWeightKg(raw: unknown): number | null {
  const text = String(raw ?? "").trim().toLowerCase().replace(/\s*kg$/, "").replace(",", ".");
  if (!/^\d{1,4}(\.\d+)?$/.test(text)) return null;
  const kg = Math.round(Number(text) * 10) / 10;
  return kg >= MIN_WEIGHT_KG && kg <= MAX_WEIGHT_KG ? kg : null;
}

export function formatKg(kg: number, lang: Lang = "pt"): string {
  const locale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR";
  if (kg >= 1000) return `${(kg / 1000).toLocaleString(locale, { maximumFractionDigits: 2 })} t`;
  return `${kg.toLocaleString(locale, { maximumFractionDigits: 1 })} kg`;
}

/* ------------------------------------------------------------------ */
/* Rows used by the reports                                            */
/* ------------------------------------------------------------------ */

/** One approved proof. Never leaves the server as-is: only aggregates and anonymous CSVs do. */
export interface ImpactRow {
  submissionId: string;
  userId: string;
  approvedAt: string;
  category: string;
  missionTitle: string;
  /** "anywhere" missions (done at home) never go to the map grid: the point would be the person's home. */
  scope: "local" | "anywhere";
  city: string | null;
  stateCode: string | null;
  /** Mission point (not the person's GPS reading). */
  latitude: number | null;
  longitude: number | null;
  material: Material | null;
  weightKg: number | null;
  /** Count proofs: items counted. Older proofs (weight typed by the person) have none. */
  itemCount?: number | null;
  weightSource?: WeightSource | null;
}

/** Where the weight of a delivery came from (older proofs: typed by the person). */
export function weightSourceOf(row: Pick<ImpactRow, "itemCount" | "weightSource">): WeightSource {
  return row.weightSource ?? (row.itemCount == null ? "declared" : "estimated");
}

export function monthKey(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function cityLabel(row: Pick<ImpactRow, "city" | "stateCode">): string {
  if (!row.city) return "Sem cidade (missões em casa)";
  return row.stateCode ? `${row.city}, ${row.stateCode}` : row.city;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/* ------------------------------------------------------------------ */
/* Recycling report                                                    */
/* ------------------------------------------------------------------ */

export interface KgBucket {
  key: string;
  kg: number;
  deliveries: number;
}

export interface RecyclingSummary {
  totalKg: number;
  deliveries: number;
  people: number;
  byMaterial: (KgBucket & { material: Material })[];
  byMonth: KgBucket[];
  byCity: KgBucket[];
}

function bucketize(rows: ImpactRow[], keyOf: (row: ImpactRow) => string): KgBucket[] {
  const map = new Map<string, KgBucket>();
  for (const row of rows) {
    const key = keyOf(row);
    const bucket = map.get(key) ?? { key, kg: 0, deliveries: 0 };
    bucket.kg += row.weightKg ?? 0;
    bucket.deliveries += 1;
    map.set(key, bucket);
  }
  return [...map.values()].map((b) => ({ ...b, kg: round1(b.kg) }));
}

export function recyclingRows(rows: ImpactRow[]): ImpactRow[] {
  return rows.filter((row) => row.material && row.weightKg);
}

export function recyclingSummary(allRows: ImpactRow[]): RecyclingSummary {
  const rows = recyclingRows(allRows);
  const byMaterial = bucketize(rows, (row) => row.material as string)
    .map((b) => ({ ...b, material: b.key as Material }))
    .sort((a, b) => b.kg - a.kg);
  return {
    totalKg: round1(rows.reduce((sum, row) => sum + (row.weightKg ?? 0), 0)),
    deliveries: rows.length,
    people: new Set(rows.map((row) => row.userId)).size,
    byMaterial,
    byMonth: bucketize(rows, (row) => monthKey(row.approvedAt)).sort((a, b) => b.key.localeCompare(a.key)),
    byCity: bucketize(rows, cityLabel).sort((a, b) => b.kg - a.kg),
  };
}

/** Short public code of a proof (first 8 characters of its id), printed on the CSV and reports. */
export function proofCode(submissionId: string): string {
  return submissionId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

/** Verified deliveries, one per line, without names (for cooperatives and campaign sponsors). */
export function recyclingCsv(allRows: ImpactRow[]): string {
  const rows = recyclingRows(allRows).sort((a, b) => b.approvedAt.localeCompare(a.approvedAt));
  return toCsv(
    ["data", "cidade", "uf", "ponto", "material", "itens", "kg", "kg_co2e_evitado_estimativa", "origem_do_peso", "codigo_comprovacao"],
    rows.map((row) => [
      row.approvedAt.slice(0, 10),
      row.city ?? "",
      row.stateCode ?? "",
      row.missionTitle,
      MATERIAL_LABELS[row.material as Material].pt,
      row.itemCount == null ? "" : String(row.itemCount),
      formatDecimal(row.weightKg ?? 0),
      formatDecimal(co2AvoidedKg(row.material, row.weightKg)),
      weightSourceLabel(weightSourceOf(row), "pt"),
      proofCode(row.submissionId),
    ]),
  );
}

/* ------------------------------------------------------------------ */
/* Anonymous aggregated data                                           */
/* ------------------------------------------------------------------ */

/** Rows with fewer distinct people than this are hidden, so nobody is identified by elimination. */
export const MIN_PEOPLE_PER_ROW = 5;
/** Map grid: 0.01° ≈ 1.1 km. */
export const GRID_DEGREES = 0.01;

export const DATA_VIEWS = ["city", "month", "category", "grid"] as const;
export type DataView = (typeof DATA_VIEWS)[number];

export function isDataView(value: unknown): value is DataView {
  return typeof value === "string" && (DATA_VIEWS as readonly string[]).includes(value);
}

export const DATA_VIEW_LABELS: Record<DataView, string> = {
  city: "Por cidade",
  month: "Por mês",
  category: "Por categoria",
  grid: "Por área (~1 km)",
};

/** Centre of the ~1 km cell of a point, as "lat,lng" (3 decimals). */
export function gridCell(latitude: number, longitude: number): string {
  const snap = (value: number) => (Math.floor(value / GRID_DEGREES) * GRID_DEGREES + GRID_DEGREES / 2).toFixed(3);
  return `${snap(latitude)},${snap(longitude)}`;
}

export interface DataRow {
  key: string;
  label: string;
  actions: number;
  people: number;
  kg: number;
}

export interface DataTable {
  view: DataView;
  rows: DataRow[];
  /** Rows hidden because they had fewer than MIN_PEOPLE_PER_ROW people. */
  hiddenRows: number;
  hiddenActions: number;
  totals: { actions: number; people: number; kg: number };
}

const CATEGORY_PT: Record<string, string> = {
  planting: "Plantio",
  donation: "Doação",
  recycling: "Reciclagem",
  cleanup: "Mutirão de limpeza",
  other: "Outro",
};

export function aggregate(rows: ImpactRow[], view: DataView): DataTable {
  const groups = new Map<string, { label: string; actions: number; people: Set<string>; kg: number }>();
  for (const row of rows) {
    let key: string;
    let label: string;
    if (view === "city") {
      key = row.city ? `${row.city}|${row.stateCode ?? ""}` : "-";
      label = cityLabel(row);
    } else if (view === "month") {
      key = monthKey(row.approvedAt);
      label = key;
    } else if (view === "category") {
      key = row.category;
      label = CATEGORY_PT[row.category] ?? row.category;
    } else {
      // Done at home or without a point: never on the map.
      if (row.scope === "anywhere" || row.latitude === null || row.longitude === null) continue;
      key = gridCell(row.latitude, row.longitude);
      label = key;
    }
    const group = groups.get(key) ?? { label, actions: 0, people: new Set<string>(), kg: 0 };
    group.actions += 1;
    group.people.add(row.userId);
    group.kg += row.weightKg ?? 0;
    groups.set(key, group);
  }

  const visible: DataRow[] = [];
  let hiddenRows = 0;
  let hiddenActions = 0;
  for (const [key, group] of groups) {
    if (group.people.size < MIN_PEOPLE_PER_ROW) {
      hiddenRows += 1;
      hiddenActions += group.actions;
      continue;
    }
    visible.push({ key, label: group.label, actions: group.actions, people: group.people.size, kg: round1(group.kg) });
  }
  visible.sort((a, b) => (view === "month" ? b.key.localeCompare(a.key) : b.actions - a.actions));

  const counted = view === "grid" ? rows.filter((r) => r.scope !== "anywhere" && r.latitude !== null && r.longitude !== null) : rows;
  const totalPeople = new Set(counted.map((r) => r.userId)).size;
  return {
    view,
    rows: visible,
    hiddenRows,
    hiddenActions,
    // Totals are only shown when they also respect the minimum.
    totals: totalPeople >= MIN_PEOPLE_PER_ROW
      ? { actions: counted.length, people: totalPeople, kg: round1(counted.reduce((s, r) => s + (r.weightKg ?? 0), 0)) }
      : { actions: 0, people: 0, kg: 0 },
  };
}

/** The four tables of Admin → Dados (server page and demo). */
export function dataTables(rows: ImpactRow[]): Record<DataView, DataTable> {
  return Object.fromEntries(DATA_VIEWS.map((view) => [view, aggregate(rows, view)])) as Record<DataView, DataTable>;
}

export function dataCsv(table: DataTable): string {
  const first = table.view === "grid" ? ["latitude_centro", "longitude_centro"] : [table.view === "city" ? "cidade" : table.view === "month" ? "mes" : "categoria"];
  const body = table.rows.map((row) => [
    ...(table.view === "grid" ? row.key.split(",") : [row.label]),
    row.actions,
    row.people,
    formatDecimal(row.kg),
  ]);
  const note = `# Dados agregados e anônimos do EcoVerify. Linhas com menos de ${MIN_PEOPLE_PER_ROW} pessoas foram ocultadas (${table.hiddenRows} linha(s), ${table.hiddenActions} ação(ões)).`;
  return `\uFEFF${note}\n${csvLines([...first, "acoes_verificadas", "pessoas", "kg_reciclados"], body)}`;
}

/* ------------------------------------------------------------------ */
/* CSV (Excel / Google Planilhas em português)                         */
/* ------------------------------------------------------------------ */

/** "2,5": decimal comma, as Brazilian spreadsheets expect. */
export function formatDecimal(value: number): string {
  return String(round1(value)).replace(".", ",");
}

function csvCell(value: string | number): string {
  const text = String(value);
  // Formula injection: a cell starting with = + - @ would run in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(text) && !/^-?\d+([.,]\d+)?$/.test(text) ? `'${text}` : text;
  return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Semicolon-separated with BOM, so Excel in Portuguese opens it with accents and columns right. */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  return `\uFEFF${csvLines(header, rows)}`;
}

function csvLines(header: string[], rows: (string | number)[][]): string {
  return `${[header, ...rows].map((line) => line.map(csvCell).join(";")).join("\n")}\n`;
}
