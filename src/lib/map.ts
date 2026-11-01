/**
 * Map of actions (docs/MAPA.md). Pure: shared by the web app, the APK and the tests.
 *
 * Three layers:
 * - missions: active LOCAL missions (the mission point, set by whoever created the mission);
 * - dumps: irregular dumping spots that are public (open, confirmed or recently cleaned) — never the reporter;
 * - heat: verified actions per ~1 km area, ONLY where at least MIN_PEOPLE_PER_ROW different people acted
 *   (same rule as the anonymous data in src/lib/impact.ts). Missions done at home never enter the map.
 *
 * Nobody's GPS reading is ever shown: proofs are placed at the mission point, and only as aggregates.
 */
import type { Lang } from "@/lib/i18n";
import { categoryEmoji } from "@/lib/i18n";
import { aggregate, GRID_DEGREES, MIN_PEOPLE_PER_ROW, type DataTable, type ImpactRow } from "@/lib/impact";
import { distanceKm } from "@/lib/region";
import type { DumpStatus } from "@/lib/dumps";

/** Circle the map data is filtered to (the person's region). */
export type MapArea = { lat: number; lng: number; radiusKm: number };

export const MAP_LAYERS = ["missions", "dumps", "heat"] as const;
export type MapLayer = (typeof MAP_LAYERS)[number];

/** Recife (Marco Zero): first view when there is no region and nothing to show. */
export const MAP_DEFAULT_CENTER = { lat: -8.0631, lng: -34.8711 };
export const MAP_DEFAULT_ZOOM = 12;

/**
 * Map tiles. Default: the OpenStreetMap standard tiles (free, attribution required, fair use).
 * For heavier traffic, point NEXT_PUBLIC_MAP_TILES_URL (web) / VITE_MAP_TILES_URL (APK) to a tile provider.
 */
export const DEFAULT_TILES_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const DEFAULT_TILES_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

/** Cleaned dumps stay on the map for this long (shows the result of the cleanup). */
export const RESOLVED_DUMP_DAYS = 30;

export type MapTarget = { kind: "mission"; id: string } | { kind: "dump"; missionId: string | null } | null;

export interface MapPin {
  id: string;
  layer: MapLayer;
  lat: number;
  lng: number;
  emoji: string;
  /** Fill colour of the marker / area. */
  color: string;
  title: string;
  subtitle?: string;
  target: MapTarget;
  /** heat only: verified actions and distinct people in the area; intensity 0–1 relative to the busiest area. */
  actions?: number;
  people?: number;
  intensity?: number;
  /** heat only: south-west and north-east corners of the ~1 km area. */
  bounds?: [[number, number], [number, number]];
}

export interface MapData {
  pins: MapPin[];
  /** Region the data was filtered to (null = everything). */
  region: (MapArea & { city: string }) | null;
}

const CATEGORY_COLOR: Record<string, string> = {
  planting: "#16a34a",
  donation: "#db2777",
  recycling: "#0d9488",
  cleanup: "#2563eb",
  other: "#7c3aed",
};

type Titled = { title: string; titleEn?: string | null; titleEs?: string | null };

function titleIn(m: Titled, lang: Lang): string {
  if (lang === "en" && m.titleEn) return m.titleEn;
  if (lang === "es" && m.titleEs) return m.titleEs;
  return m.title;
}

function inRegion(lat: number, lng: number, region: MapArea | null | undefined): boolean {
  return !region || distanceKm(region.lat, region.lng, lat, lng) <= region.radiusKm;
}

const num = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? NaN : Number(v));

export type MapMission = Titled & {
  id: string;
  category: string;
  scope?: "local" | "anywhere" | null;
  latitude: number | string | null;
  longitude: number | string | null;
  pointsReward?: number;
  city?: string | null;
  isActive?: boolean;
};

/** Active local missions with a point (inside the region when there is one). */
export function missionPins(list: MapMission[], lang: Lang, region?: MapArea | null): MapPin[] {
  const pins: MapPin[] = [];
  for (const m of list) {
    if (m.isActive === false || (m.scope ?? "local") !== "local") continue;
    const lat = num(m.latitude);
    const lng = num(m.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inRegion(lat, lng, region)) continue;
    pins.push({
      id: `m-${m.id}`,
      layer: "missions",
      lat,
      lng,
      emoji: categoryEmoji[m.category] ?? "🌱",
      color: CATEGORY_COLOR[m.category] ?? CATEGORY_COLOR.other,
      title: titleIn(m, lang),
      subtitle: [m.city, m.pointsReward ? `+${m.pointsReward} pts` : null].filter(Boolean).join(" · ") || undefined,
      target: { kind: "mission", id: m.id },
    });
  }
  return pins;
}

export type MapDump = {
  id: string;
  latitude: number | string;
  longitude: number | string;
  status: DumpStatus;
  missionId?: string | null;
  city?: string | null;
  resolvedAt?: string | Date | null;
};

const DUMP_STYLE: Partial<Record<DumpStatus, { emoji: string; color: string; label: Record<Lang, string> }>> = {
  open: { emoji: "🗑️", color: "#f59e0b", label: { pt: "Lixo descartado · precisa de confirmação", en: "Dumped rubbish · needs a confirmation", es: "Basura tirada · necesita confirmación" } },
  confirmed: { emoji: "🧹", color: "#dc2626", label: { pt: "Lixo confirmado · limpeza aberta", en: "Confirmed rubbish · clean-up open", es: "Basura confirmada · limpieza abierta" } },
  resolved: { emoji: "✨", color: "#16a34a", label: { pt: "Local limpo", en: "Spot cleaned", es: "Lugar limpio" } },
};

/** Public dumping spots: open, confirmed and cleaned in the last RESOLVED_DUMP_DAYS. Pending/rejected/expired never show. */
export function dumpPins(list: MapDump[], lang: Lang, region?: MapArea | null, now: Date = new Date()): MapPin[] {
  const pins: MapPin[] = [];
  for (const d of list) {
    const style = DUMP_STYLE[d.status];
    if (!style) continue;
    if (d.status === "resolved") {
      const at = d.resolvedAt ? new Date(d.resolvedAt).getTime() : NaN;
      if (!Number.isFinite(at) || now.getTime() - at > RESOLVED_DUMP_DAYS * 86_400_000) continue;
    }
    const lat = num(d.latitude);
    const lng = num(d.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inRegion(lat, lng, region)) continue;
    pins.push({
      id: `d-${d.id}`,
      layer: "dumps",
      lat,
      lng,
      emoji: style.emoji,
      color: style.color,
      title: style.label[lang],
      subtitle: d.city ?? undefined,
      target: { kind: "dump", missionId: d.status === "confirmed" ? (d.missionId ?? null) : null },
    });
  }
  return pins;
}

/** Verified actions per ~1 km area, hiding areas with fewer than MIN_PEOPLE_PER_ROW people. */
export function heatPins(rows: ImpactRow[], lang: Lang, region?: MapArea | null): MapPin[] {
  return heatPinsFromTable(aggregate(rows, "grid"), lang, region);
}

/** Same, from an already aggregated "grid" table (Admin → Dados → Por área). */
export function heatPinsFromTable(table: DataTable, lang: Lang, region?: MapArea | null): MapPin[] {
  if (table.view !== "grid") return [];
  const cells = table.rows
    .map((row) => {
      const [lat, lng] = row.key.split(",").map(Number);
      return { row, lat, lng };
    })
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng) && inRegion(c.lat, c.lng, region));
  const max = Math.max(1, ...cells.map((c) => c.row.actions));
  const half = GRID_DEGREES / 2;
  const label = (n: number) => (lang === "en" ? `${n} verified actions` : lang === "es" ? `${n} acciones verificadas` : `${n} ações verificadas`);
  const people = (n: number) => (lang === "en" ? `${n} people` : lang === "es" ? `${n} personas` : `${n} pessoas`);
  return cells.map(({ row, lat, lng }) => {
    const intensity = row.actions / max;
    return {
      id: `h-${row.key}`,
      layer: "heat" as const,
      lat,
      lng,
      emoji: "🔥",
      color: heatColor(intensity),
      title: label(row.actions),
      subtitle: people(row.people),
      target: null,
      actions: row.actions,
      people: row.people,
      intensity,
      bounds: [
        [round6(lat - half), round6(lng - half)],
        [round6(lat + half), round6(lng + half)],
      ] as [[number, number], [number, number]],
    };
  });
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Yellow (few) → orange → red (busiest area). */
export function heatColor(intensity: number): string {
  const t = Math.min(1, Math.max(0, intensity));
  if (t < 0.34) return "#facc15";
  if (t < 0.67) return "#f97316";
  return "#dc2626";
}

/** [[south, west], [north, east]] around all pins, or null when there are none. */
export function pinsBounds(pins: Pick<MapPin, "lat" | "lng">[]): [[number, number], [number, number]] | null {
  if (pins.length === 0) return null;
  let s = Infinity;
  let w = Infinity;
  let n = -Infinity;
  let e = -Infinity;
  for (const p of pins) {
    s = Math.min(s, p.lat);
    n = Math.max(n, p.lat);
    w = Math.min(w, p.lng);
    e = Math.max(e, p.lng);
  }
  return [
    [s, w],
    [n, e],
  ];
}

export function mapText(lang: Lang) {
  const T = (pt: string, en: string, es: string) => (lang === "en" ? en : lang === "es" ? es : pt);
  return {
    title: T("Mapa", "Map", "Mapa"),
    subtitle: T(
      "Missões perto de você, pontos de lixo para limpar e onde a comunidade já agiu.",
      "Missions near you, rubbish spots to clean and where the community has already acted.",
      "Misiones cerca de ti, puntos de basura para limpiar y dónde la comunidad ya actuó.",
    ),
    layers: {
      missions: T("Missões", "Missions", "Misiones"),
      dumps: T("Lixo", "Rubbish", "Basura"),
      heat: T("Ações verificadas", "Verified actions", "Acciones verificadas"),
    } satisfies Record<MapLayer, string>,
    regionNote: (city: string, km: number) => T(`Mostrando ${city} e até ${km} km ao redor.`, `Showing ${city} and up to ${km} km around.`, `Mostrando ${city} y hasta ${km} km alrededor.`),
    noRegion: T("Escolha sua região na tela de missões para ver o que tem perto.", "Choose your region on the missions screen to see what is nearby.", "Elige tu región en la pantalla de misiones para ver lo que hay cerca."),
    locate: T("Onde estou", "Where am I", "Dónde estoy"),
    locating: T("Procurando…", "Locating…", "Buscando…"),
    locateError: T("Não deu para pegar sua localização.", "Could not get your location.", "No se pudo obtener tu ubicación."),
    youAreHere: T("Você está aqui (não é salvo)", "You are here (not saved)", "Estás aquí (no se guarda)"),
    openMission: T("Ver missão", "Open mission", "Ver misión"),
    openCleanup: T("Fazer a limpeza", "Do the clean-up", "Hacer la limpieza"),
    openDumps: T("Abrir Lixo", "Open Rubbish", "Abrir Basura"),
    empty: T("Nada para mostrar aqui ainda.", "Nothing to show here yet.", "Nada que mostrar aquí todavía."),
    counts: (n: number) => T(`${n} no mapa`, `${n} on the map`, `${n} en el mapa`),
    privacy: T(
      `Privacidade: ninguém aparece no mapa. As ações verificadas são somadas por área de ~1 km e só aparecem onde ${MIN_PEOPLE_PER_ROW} ou mais pessoas agiram; missões feitas em casa nunca entram. Pontos de lixo não mostram quem avisou.`,
      `Privacy: nobody appears on the map. Verified actions are summed per ~1 km area and only show where ${MIN_PEOPLE_PER_ROW} or more people acted; missions done at home never count. Rubbish spots never show who reported them.`,
      `Privacidad: nadie aparece en el mapa. Las acciones verificadas se suman por área de ~1 km y solo aparecen donde ${MIN_PEOPLE_PER_ROW} o más personas actuaron; las misiones hechas en casa nunca entran. Los puntos de basura no muestran quién avisó.`,
    ),
    heatLegend: T("Poucas → muitas ações", "Few → many actions", "Pocas → muchas acciones"),
    mapLabel: T("Mapa de missões e ações", "Map of missions and actions", "Mapa de misiones y acciones"),
    seeOnMap: T("Ver no mapa", "See on the map", "Ver en el mapa"),
    close: T("Fechar", "Close", "Cerrar"),
  };
}
