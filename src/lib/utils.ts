import type { Lang } from "@/lib/i18n";

export function levelForPoints(points: number, lang: Lang) {
  const levels = [
    {
      min: 0,
      max: 99,
      emoji: "🌱",
      pt: "Iniciante",
      en: "Beginner",
      es: "Principiante",
    },
    {
      min: 100,
      max: 299,
      emoji: "🛡️",
      pt: "Guardião Verde",
      en: "Green Guardian",
      es: "Guardián Verde",
    },
    {
      min: 300,
      max: 699,
      emoji: "🦸",
      pt: "Eco-Herói",
      en: "Eco-Hero",
      es: "Eco-Héroe",
    },
    {
      min: 700,
      max: Infinity,
      emoji: "👑",
      pt: "Lenda Verde",
      en: "Green Legend",
      es: "Leyenda Verde",
    },
  ];
  const level = levels.find((l) => points >= l.min && points <= l.max) ?? levels[0];
  return { emoji: level.emoji, name: level[lang] };
}

export function formatDate(date: Date | string, lang: Lang) {
  const d = typeof date === "string" ? new Date(date) : date;
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatFone(value: string | number) {
  const num = typeof value === "string" ? Number(value) : value;
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function startOfTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** True when a database error is a Postgres unique-constraint violation (code 23505). */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    if (typeof current === "object" && "code" in current && (current as { code?: unknown }).code === "23505") {
      return true;
    }
    current = typeof current === "object" && "cause" in current ? (current as { cause?: unknown }).cause : null;
  }
  return false;
}
