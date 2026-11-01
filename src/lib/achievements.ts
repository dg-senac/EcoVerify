/**
 * Badges, weekly streak and personal impact, computed from a person's APPROVED actions only.
 * Pure: shared by the web profile (src/app/(app)/profile) and the APK (demo/src/screens/Profile).
 * Nothing is stored: everything is derived, so rules can change without migrations.
 */
import { tx, type Lang } from "@/lib/i18n";
import { co2Estimate } from "@/lib/impact-factors";

export type ActionCategory = "planting" | "donation" | "recycling" | "cleanup" | "other";

export interface ApprovedAction {
  category: ActionCategory | string;
  /** When the action was submitted (that is the week it counts for). */
  at: string | Date;
  /** Recycling: weight in kg after review. */
  weightKg?: number | string | null;
  /** Recycling: material delivered (used for the CO₂e estimate; missing = mixed recyclables). */
  material?: string | null;
  /** The mission was a dated event (mutirão). */
  isEvent?: boolean;
}

/* ------------------------------------------------------------------ */
/* Weekly streak                                                       */
/* ------------------------------------------------------------------ */

const DAY = 86_400_000;

/** Monday 00:00 (local time) of the week of `date`, as a timestamp. */
export function weekStart(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - offset);
  return d.getTime();
}

function previousWeek(start: number): number {
  // Go back 3.5 days and re-anchor: safe across daylight-saving changes.
  return weekStart(new Date(start - 3.5 * DAY));
}

export interface Streak {
  /** Consecutive weeks with at least one approved action, up to this week. */
  current: number;
  /** Longest run ever. */
  best: number;
  /** Already did something this week (otherwise the streak is still alive until Sunday). */
  thisWeekDone: boolean;
  /** Last 8 weeks, oldest first: true = had an approved action. */
  lastWeeks: boolean[];
}

export function weeklyStreak(actions: ApprovedAction[], now: Date = new Date()): Streak {
  const weeks = new Set(actions.map((a) => weekStart(new Date(a.at))));
  const thisWeek = weekStart(now);
  const thisWeekDone = weeks.has(thisWeek);

  let current = 0;
  let cursor = thisWeekDone ? thisWeek : previousWeek(thisWeek);
  while (weeks.has(cursor)) {
    current++;
    cursor = previousWeek(cursor);
  }

  let best = 0;
  for (const start of weeks) {
    if (weeks.has(previousWeek(start))) continue; // not the beginning of a run
    let run = 0;
    let w = start;
    while (weeks.has(w)) {
      run++;
      w = weekStart(new Date(w + 10 * DAY));
    }
    best = Math.max(best, run);
  }

  const lastWeeks: boolean[] = [];
  let w = thisWeek;
  for (let i = 0; i < 8; i++) {
    lastWeeks.unshift(weeks.has(w));
    w = previousWeek(w);
  }
  return { current, best: Math.max(best, current), thisWeekDone, lastWeeks };
}

/* ------------------------------------------------------------------ */
/* Personal impact                                                     */
/* ------------------------------------------------------------------ */

export interface PersonalImpact {
  actions: number;
  recycledKg: number;
  /** ESTIMATE of kg CO₂e avoided by the recycling (src/lib/impact-factors.ts). Always shown with an "estimate" label. */
  co2Kg: number;
  /** Same CO₂e as this many km by an average gasoline car (estimate). */
  carKm: number;
  recyclingDeliveries: number;
  plantings: number;
  cleanups: number;
  donations: number;
  events: number;
  /** Distinct categories (excluding "other"). */
  categories: number;
}

export function personalImpact(actions: ApprovedAction[]): PersonalImpact {
  const count = (c: string) => actions.filter((a) => a.category === c).length;
  const recycledKg = actions.reduce((sum, a) => sum + (a.category === "recycling" ? Number(a.weightKg ?? 0) || 0 : 0), 0);
  const co2 = co2Estimate(actions.filter((a) => a.category === "recycling").map((a) => ({ material: a.material, kg: a.weightKg })));
  return {
    actions: actions.length,
    recycledKg: Math.round(recycledKg * 10) / 10,
    co2Kg: co2.co2Kg,
    carKm: co2.carKm,
    recyclingDeliveries: count("recycling"),
    plantings: count("planting"),
    cleanups: count("cleanup"),
    donations: count("donation"),
    events: actions.filter((a) => a.isEvent).length,
    categories: new Set(actions.map((a) => a.category).filter((c) => c !== "other")).size,
  };
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export type BadgeId =
  | "first_step"
  | "regular"
  | "climate_hero"
  | "recycler"
  | "kg_10"
  | "planter"
  | "cleaner"
  | "donor"
  | "team"
  | "streak_4"
  | "all_rounder";

type Text3 = [pt: string, en: string, es: string];

interface BadgeDef {
  id: BadgeId;
  emoji: string;
  name: Text3;
  goal: Text3;
  target: number;
  value: (impact: PersonalImpact, streak: Streak) => number;
}

const BADGES: BadgeDef[] = [
  { id: "first_step", emoji: "🌱", name: ["Primeiro passo", "First step", "Primer paso"], goal: ["1 ação aprovada", "1 approved action", "1 acción aprobada"], target: 1, value: (i) => i.actions },
  { id: "regular", emoji: "⭐", name: ["Constante", "Regular", "Constante"], goal: ["10 ações aprovadas", "10 approved actions", "10 acciones aprobadas"], target: 10, value: (i) => i.actions },
  { id: "climate_hero", emoji: "🏅", name: ["Herói do clima", "Climate hero", "Héroe del clima"], goal: ["30 ações aprovadas", "30 approved actions", "30 acciones aprobadas"], target: 30, value: (i) => i.actions },
  { id: "recycler", emoji: "♻️", name: ["Reciclador", "Recycler", "Reciclador"], goal: ["5 entregas de recicláveis", "5 recycling drop-offs", "5 entregas de reciclables"], target: 5, value: (i) => i.recyclingDeliveries },
  { id: "kg_10", emoji: "⚖️", name: ["10 kg reciclados", "10 kg recycled", "10 kg reciclados"], goal: ["10 kg conferidos", "10 kg checked", "10 kg verificados"], target: 10, value: (i) => i.recycledKg },
  { id: "planter", emoji: "🌳", name: ["Plantador", "Planter", "Plantador"], goal: ["3 plantios", "3 plantings", "3 plantaciones"], target: 3, value: (i) => i.plantings },
  { id: "cleaner", emoji: "🧹", name: ["Mão na massa", "Hands-on", "Manos a la obra"], goal: ["3 limpezas", "3 clean-ups", "3 limpiezas"], target: 3, value: (i) => i.cleanups },
  { id: "donor", emoji: "🤝", name: ["Solidário", "Generous", "Solidario"], goal: ["2 doações", "2 donations", "2 donaciones"], target: 2, value: (i) => i.donations },
  { id: "team", emoji: "👥", name: ["Em equipe", "Team player", "En equipo"], goal: ["1 mutirão com data", "1 dated clean-up event", "1 jornada con fecha"], target: 1, value: (i) => i.events },
  { id: "streak_4", emoji: "🔥", name: ["4 semanas seguidas", "4 weeks in a row", "4 semanas seguidas"], goal: ["Agir 4 semanas seguidas", "Act 4 weeks in a row", "Actuar 4 semanas seguidas"], target: 4, value: (_, s) => s.best },
  { id: "all_rounder", emoji: "🌈", name: ["Versátil", "All-rounder", "Versátil"], goal: ["Ações em 4 categorias", "Actions in 4 categories", "Acciones en 4 categorías"], target: 4, value: (i) => i.categories },
];

export interface Badge {
  id: BadgeId;
  emoji: string;
  name: string;
  goal: string;
  earned: boolean;
  /** 0..1 */
  progress: number;
  value: number;
  target: number;
}

export function badgesFor(actions: ApprovedAction[], lang: Lang, now: Date = new Date()): Badge[] {
  const impact = personalImpact(actions);
  const streak = weeklyStreak(actions, now);
  return BADGES.map((b) => {
    const value = b.value(impact, streak);
    return {
      id: b.id,
      emoji: b.emoji,
      name: tx(lang, ...b.name),
      goal: tx(lang, ...b.goal),
      earned: value >= b.target,
      progress: Math.min(1, value / b.target),
      value,
      target: b.target,
    };
  });
}

/** Badges earned by adding `added` to `before` (for the "new badge" notification after an approval). */
export function newlyEarned(before: ApprovedAction[], added: ApprovedAction, lang: Lang, now: Date = new Date()): Badge[] {
  const had = new Set(badgesFor(before, lang, now).filter((b) => b.earned).map((b) => b.id));
  return badgesFor([...before, added], lang, now).filter((b) => b.earned && !had.has(b.id));
}
