/**
 * Seasons and the Schools Cup (Copa das Escolas) — docs/COPA.md. Pure: shared by the web app, the APK
 * and the tests.
 *
 * - A season is a calendar two-month period (a "bimestre", the rhythm of Brazilian schools), in Recife
 *   time: Jan–Feb, Mar–Apr, May–Jun, Jul–Aug, Sep–Oct, Nov–Dec. Nothing is stored: the season of any
 *   moment is computed, and season points come from the points ledger (points removed by an audit
 *   disappear from the ledger, so they also leave the season).
 * - The all-time ranking keeps working as before; the season ranking restarts every two months, so new
 *   people can reach the top.
 * - Schools Cup: organizations of type "school" compete with their members' season points. To be fair:
 *   * only the TOP_N members with the most points count (a big school doesn't win just by size);
 *   * a school needs MIN_ACTIVE members with points to be ranked;
 *   * points count only from the moment the person joined the school (no last-minute transfers);
 *   * each person counts for ONE school (the first one they joined);
 *   * points from missions created by an organization don't count (a school can't create easy missions
 *     for itself) — public missions, the daily quiz and irregular-dump reports do.
 */
import type { Lang } from "@/lib/i18n";

export const SEASON_MONTHS = 2;
/** America/Recife is UTC−3 all year (no daylight saving time). */
export const SEASON_UTC_OFFSET_HOURS = -3;
export const SEASONS_PER_YEAR = 12 / SEASON_MONTHS;
/** Members whose points count for their school. */
export const CUP_TOP_N = 20;
/** Members with points needed for a school to be ranked. */
export const CUP_MIN_ACTIVE = 3;
/** Rows shown in the rankings. */
export const RANKING_LIMIT = 100;

export interface Season {
  /** "2026-6" = 6th season of 2026. */
  id: string;
  year: number;
  /** 1–6. */
  index: number;
  /** Inclusive start / exclusive end (00:00 Recife time). */
  start: Date;
  end: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function boundary(year: number, month: number): Date {
  // 00:00 in Recife = 03:00 UTC. Date.UTC normalizes month 12 to January of the next year.
  return new Date(Date.UTC(year, month, 1, -SEASON_UTC_OFFSET_HOURS));
}

function build(year: number, index: number): Season {
  const firstMonth = (index - 1) * SEASON_MONTHS;
  return { id: `${year}-${index}`, year, index, start: boundary(year, firstMonth), end: boundary(year, firstMonth + SEASON_MONTHS) };
}

/** Season that contains `date`. */
export function seasonAt(date: Date | string | number): Season {
  const local = new Date(new Date(date).getTime() + SEASON_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  return build(local.getUTCFullYear(), Math.floor(local.getUTCMonth() / SEASON_MONTHS) + 1);
}

/** "2026-6" → season; null for anything else. */
export function seasonById(id: string | null | undefined): Season | null {
  const match = /^(\d{4})-(\d)$/.exec(id ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const index = Number(match[2]);
  if (year < 2024 || year > 2100 || index < 1 || index > SEASONS_PER_YEAR) return null;
  return build(year, index);
}

export function previousSeason(season: Season): Season {
  return season.index > 1 ? build(season.year, season.index - 1) : build(season.year - 1, SEASONS_PER_YEAR);
}

export function inSeason(season: Season, at: Date | string | number): boolean {
  const time = new Date(at).getTime();
  return time >= season.start.getTime() && time < season.end.getTime();
}

/** Whole days left (today counts), 0 once the season is over. */
export function daysLeft(season: Season, now: Date | string | number = Date.now()): number {
  const ms = season.end.getTime() - new Date(now).getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}

/** 0–1: how much of the season has passed (progress bar). */
export function seasonProgress(season: Season, now: Date | string | number = Date.now()): number {
  const total = season.end.getTime() - season.start.getTime();
  const passed = new Date(now).getTime() - season.start.getTime();
  return Math.min(1, Math.max(0, passed / total));
}

/* ------------------------------------------------------------------ */
/* Rankings                                                            */
/* ------------------------------------------------------------------ */

/** One row of the points ledger. `cup` = false for points from organization missions. */
export interface PointEntry {
  userId: string;
  points: number;
  at: Date | string;
  cup: boolean;
}

export interface Ranked<T> {
  item: T;
  points: number;
  /** 1-based; ties share the position (1, 2, 2, 4). */
  position: number;
}

/** Season points per person (everything in the ledger counts here, organization missions included). */
export function seasonTotals(entries: readonly PointEntry[], season: Season): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (!inSeason(season, entry.at)) continue;
    totals.set(entry.userId, (totals.get(entry.userId) ?? 0) + entry.points);
  }
  return totals;
}

/** Sorts by points (desc), then name, then id; drops items with no points. */
export function rankByPoints<T>(items: readonly T[], pointsOf: (item: T) => number, nameOf: (item: T) => string, idOf: (item: T) => string): Ranked<T>[] {
  const sorted = items
    .map((item) => ({ item, points: pointsOf(item) }))
    .filter((row) => row.points > 0)
    .sort((a, b) => b.points - a.points || nameOf(a.item).localeCompare(nameOf(b.item)) || idOf(a.item).localeCompare(idOf(b.item)));
  let position = 0;
  return sorted.map((row, index) => {
    if (index === 0 || row.points !== sorted[index - 1].points) position = index + 1;
    return { ...row, position };
  });
}

export interface RankablePerson {
  id: string;
  name: string;
}

export function seasonRanking<P extends RankablePerson>(people: readonly P[], entries: readonly PointEntry[], season: Season): Ranked<P>[] {
  const totals = seasonTotals(entries, season);
  return rankByPoints(people, (p) => totals.get(p.id) ?? 0, (p) => p.name, (p) => p.id);
}

export interface CupSchool {
  id: string;
  name: string;
  city?: string | null;
}

export interface CupMembership {
  orgId: string;
  userId: string;
  joinedAt: Date | string;
}

export interface CupStanding {
  school: CupSchool;
  /** Sum of the TOP_N best members' cup points. */
  points: number;
  /** Members with cup points this season. */
  active: number;
  /** Members whose points were summed (≤ TOP_N). */
  counted: number;
  /** null while the school has fewer than MIN_ACTIVE active members. */
  position: number | null;
}

/** School each person counts for: the first school they joined (ties: lowest school id). */
export function primarySchools(memberships: readonly CupMembership[], schoolIds: ReadonlySet<string>): Map<string, CupMembership> {
  const primary = new Map<string, CupMembership>();
  for (const membership of memberships) {
    if (!schoolIds.has(membership.orgId)) continue;
    const current = primary.get(membership.userId);
    const time = new Date(membership.joinedAt).getTime();
    const currentTime = current ? new Date(current.joinedAt).getTime() : Infinity;
    if (!current || time < currentTime || (time === currentTime && membership.orgId < current.orgId)) primary.set(membership.userId, membership);
  }
  return primary;
}

/**
 * Cup standings for a season. Ranked schools first (by points, then name), then the ones that still
 * need MIN_ACTIVE active members (by points). Schools with no points at all are left out.
 */
export function schoolCup(input: {
  schools: readonly CupSchool[];
  memberships: readonly CupMembership[];
  entries: readonly PointEntry[];
  season: Season;
  topN?: number;
  minActive?: number;
}): CupStanding[] {
  const topN = input.topN ?? CUP_TOP_N;
  const minActive = input.minActive ?? CUP_MIN_ACTIVE;
  const primary = primarySchools(input.memberships, new Set(input.schools.map((s) => s.id)));

  // Cup points per person, only after joining their school.
  const perUser = new Map<string, number>();
  for (const entry of input.entries) {
    if (!entry.cup || !inSeason(input.season, entry.at)) continue;
    const membership = primary.get(entry.userId);
    if (!membership || new Date(entry.at).getTime() < new Date(membership.joinedAt).getTime()) continue;
    perUser.set(entry.userId, (perUser.get(entry.userId) ?? 0) + entry.points);
  }
  const bySchool = new Map<string, number[]>();
  for (const [userId, points] of perUser) {
    if (points <= 0) continue;
    const orgId = primary.get(userId)!.orgId;
    bySchool.set(orgId, [...(bySchool.get(orgId) ?? []), points]);
  }

  const rows = input.schools.map((school) => {
    const scores = (bySchool.get(school.id) ?? []).sort((a, b) => b - a);
    const best = scores.slice(0, topN);
    return { school, points: best.reduce((sum, p) => sum + p, 0), active: scores.length, counted: best.length };
  });
  const qualified = rankByPoints(rows.filter((r) => r.active >= minActive), (r) => r.points, (r) => r.school.name, (r) => r.school.id);
  const waiting = rows
    .filter((r) => r.active > 0 && r.active < minActive)
    .sort((a, b) => b.points - a.points || a.school.name.localeCompare(b.school.name));
  return [...qualified.map((r) => ({ ...r.item, position: r.position })), ...waiting.map((r) => ({ ...r, position: null }))];
}

/* ------------------------------------------------------------------ */
/* Texts                                                               */
/* ------------------------------------------------------------------ */

const MONTHS: Record<Lang, string[]> = {
  pt: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
};

/** "Nov–Dec 2026". */
export function seasonMonths(season: Season, lang: Lang): string {
  const first = (season.index - 1) * SEASON_MONTHS;
  return `${MONTHS[lang][first]}–${MONTHS[lang][first + SEASON_MONTHS - 1]} ${season.year}`;
}

export interface SeasonText {
  tabSeason: string;
  tabAll: string;
  tabSchools: string;
  seasonName: (season: Season) => string;
  daysLeft: (days: number) => string;
  seasonIntro: string;
  allIntro: string;
  seasonEmpty: string;
  myPosition: (position: number, points: number) => string;
  notRankedYet: string;
  lastSeasonTop: (season: Season) => string;
  cupTitle: string;
  cupIntro: string;
  cupRules: string[];
  cupRulesTitle: string;
  cupEmpty: string;
  cupWaiting: (missing: number) => string;
  cupActive: (active: number) => string;
  cupMine: (position: number | null, school: string) => string;
  cupJoinHint: string;
  cupChampions: (season: Season) => string;
  cupChampion: string;
  cupPositionShort: (position: number) => string;
  cupOrgCard: (position: number | null, points: number) => string;
  cupOrgNone: string;
  seeCup: string;
  pointsShort: string;
}

const pt: SeasonText = {
  tabSeason: "Temporada",
  tabAll: "Geral",
  tabSchools: "Escolas",
  seasonName: (s) => `Temporada ${s.index} · ${seasonMonths(s, "pt")}`,
  daysLeft: (d) => (d === 1 ? "termina hoje" : `termina em ${d} dias`),
  seasonIntro: "O ranking da temporada recomeça a cada dois meses: todo mundo tem chance de chegar ao topo.",
  allIntro: "Todos os pontos desde que você entrou.",
  seasonEmpty: "Ninguém pontuou nesta temporada ainda. Faça uma missão e saia na frente!",
  myPosition: (p, pts) => `Você está em ${p}º lugar com ${pts} pontos nesta temporada.`,
  notRankedYet: "Você ainda não pontuou nesta temporada.",
  lastSeasonTop: (s) => `Destaques da Temporada ${s.index} · ${seasonMonths(s, "pt")}`,
  cupTitle: "Copa das Escolas",
  cupIntro: "Escolas competem a cada temporada com as ações verificadas dos seus alunos e professores.",
  cupRulesTitle: "Como funciona",
  cupRules: [
    `Contam os pontos dos ${CUP_TOP_N} participantes que mais pontuaram — escola grande não ganha só pelo tamanho.`,
    `A escola entra na tabela com pelo menos ${CUP_MIN_ACTIVE} participantes pontuando.`,
    "Valem missões públicas, o quiz diário e os avisos de lixo. Missões criadas pela própria escola contam só no ranking interno dela.",
    "Os pontos contam a partir da entrada na escola, e cada pessoa conta para uma escola só.",
  ],
  cupEmpty: "Nenhuma escola pontuou nesta temporada ainda.",
  cupWaiting: (m) => (m === 1 ? "falta 1 participante para entrar na tabela" : `faltam ${m} participantes para entrar na tabela`),
  cupActive: (a) => (a === 1 ? "1 participante pontuando" : `${a} participantes pontuando`),
  cupMine: (p, school) => (p ? `${school} está em ${p}º lugar.` : `${school} ainda não entrou na tabela.`),
  cupJoinHint: "Sua escola não está aqui? Peça o código de convite ao professor ou cadastre a escola em Organizações.",
  cupChampions: (s) => `Campeãs da Temporada ${s.index} · ${seasonMonths(s, "pt")}`,
  cupChampion: "Campeã",
  cupPositionShort: (p) => `${p}º`,
  cupOrgCard: (p, pts) => (p ? `${p}º lugar nesta temporada · ${pts} pontos` : `${pts} pontos nesta temporada · ainda fora da tabela`),
  cupOrgNone: "A escola entra na Copa quando os participantes começarem a pontuar.",
  seeCup: "Ver a Copa",
  pointsShort: "pts",
};

const en: SeasonText = {
  tabSeason: "Season",
  tabAll: "All time",
  tabSchools: "Schools",
  seasonName: (s) => `Season ${s.index} · ${seasonMonths(s, "en")}`,
  daysLeft: (d) => (d === 1 ? "ends today" : `ends in ${d} days`),
  seasonIntro: "The season ranking restarts every two months: everyone has a chance to reach the top.",
  allIntro: "All points since you joined.",
  seasonEmpty: "Nobody has scored this season yet. Do a mission and take the lead!",
  myPosition: (p, pts) => `You are #${p} with ${pts} points this season.`,
  notRankedYet: "You haven't scored this season yet.",
  lastSeasonTop: (s) => `Top of Season ${s.index} · ${seasonMonths(s, "en")}`,
  cupTitle: "Schools Cup",
  cupIntro: "Schools compete every season with the verified actions of their students and teachers.",
  cupRulesTitle: "How it works",
  cupRules: [
    `The points of the ${CUP_TOP_N} top-scoring participants count — a big school doesn't win just by size.`,
    `A school enters the table with at least ${CUP_MIN_ACTIVE} participants scoring.`,
    "Public missions, the daily quiz and rubbish reports count. Missions created by the school itself only count in its own ranking.",
    "Points count from the moment someone joins the school, and each person counts for one school only.",
  ],
  cupEmpty: "No school has scored this season yet.",
  cupWaiting: (m) => (m === 1 ? "1 more participant needed to enter the table" : `${m} more participants needed to enter the table`),
  cupActive: (a) => (a === 1 ? "1 participant scoring" : `${a} participants scoring`),
  cupMine: (p, school) => (p ? `${school} is #${p}.` : `${school} isn't in the table yet.`),
  cupJoinHint: "Your school isn't here? Ask your teacher for the invite code or register the school under Organizations.",
  cupChampions: (s) => `Champions of Season ${s.index} · ${seasonMonths(s, "en")}`,
  cupChampion: "Champion",
  cupPositionShort: (p) => `#${p}`,
  cupOrgCard: (p, pts) => (p ? `#${p} this season · ${pts} points` : `${pts} points this season · not in the table yet`),
  cupOrgNone: "The school enters the Cup once participants start scoring.",
  seeCup: "See the Cup",
  pointsShort: "pts",
};

const es: SeasonText = {
  tabSeason: "Temporada",
  tabAll: "General",
  tabSchools: "Escuelas",
  seasonName: (s) => `Temporada ${s.index} · ${seasonMonths(s, "es")}`,
  daysLeft: (d) => (d === 1 ? "termina hoy" : `termina en ${d} días`),
  seasonIntro: "La clasificación de la temporada vuelve a empezar cada dos meses: todos tienen la oportunidad de llegar arriba.",
  allIntro: "Todos los puntos desde que entraste.",
  seasonEmpty: "Nadie ha sumado puntos en esta temporada todavía. ¡Haz una misión y toma la delantera!",
  myPosition: (p, pts) => `Estás en el puesto ${p} con ${pts} puntos en esta temporada.`,
  notRankedYet: "Todavía no sumaste puntos en esta temporada.",
  lastSeasonTop: (s) => `Destacados de la Temporada ${s.index} · ${seasonMonths(s, "es")}`,
  cupTitle: "Copa de las Escuelas",
  cupIntro: "Las escuelas compiten cada temporada con las acciones verificadas de sus alumnos y profesores.",
  cupRulesTitle: "Cómo funciona",
  cupRules: [
    `Cuentan los puntos de los ${CUP_TOP_N} participantes que más sumaron: una escuela grande no gana solo por su tamaño.`,
    `La escuela entra en la tabla con al menos ${CUP_MIN_ACTIVE} participantes sumando puntos.`,
    "Valen las misiones públicas, el quiz diario y los avisos de basura. Las misiones creadas por la propia escuela solo cuentan en su clasificación interna.",
    "Los puntos cuentan desde la entrada a la escuela, y cada persona cuenta para una sola escuela.",
  ],
  cupEmpty: "Ninguna escuela ha sumado puntos en esta temporada todavía.",
  cupWaiting: (m) => (m === 1 ? "falta 1 participante para entrar en la tabla" : `faltan ${m} participantes para entrar en la tabla`),
  cupActive: (a) => (a === 1 ? "1 participante sumando" : `${a} participantes sumando`),
  cupMine: (p, school) => (p ? `${school} está en el puesto ${p}.` : `${school} todavía no entró en la tabla.`),
  cupJoinHint: "¿Tu escuela no está aquí? Pide el código de invitación al profesor o registra la escuela en Organizaciones.",
  cupChampions: (s) => `Campeonas de la Temporada ${s.index} · ${seasonMonths(s, "es")}`,
  cupChampion: "Campeona",
  cupPositionShort: (p) => `${p}º`,
  cupOrgCard: (p, pts) => (p ? `Puesto ${p} en esta temporada · ${pts} puntos` : `${pts} puntos en esta temporada · todavía fuera de la tabla`),
  cupOrgNone: "La escuela entra en la Copa cuando los participantes empiecen a sumar puntos.",
  seeCup: "Ver la Copa",
  pointsShort: "pts",
};

export function seasonText(lang: Lang): SeasonText {
  return lang === "en" ? en : lang === "es" ? es : pt;
}

/**
 * Ranking screen tabs (?tab= on the web, #/ranking/<tab> in the APK). Lives here, not in the client
 * component, because the server page parses the tab before rendering.
 */
export const RANKING_TABS = ["season", "all", "schools"] as const;
export type RankingTab = (typeof RANKING_TABS)[number];

export function rankingTab(value: string | null | undefined): RankingTab {
  return RANKING_TABS.find((tab) => tab === value) ?? "season";
}
