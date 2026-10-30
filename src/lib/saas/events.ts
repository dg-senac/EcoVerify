/**
 * One-off events (mutirões): an organization mission with a date and time window, paid once by
 * Pix ("evento avulso") by organizations that don't want a subscription. See docs/MONETIZACAO.md §1.
 *
 * Pure module: shared by the server and the offline demo.
 */
import type { Lang } from "@/lib/i18n";
import { hasFeature, type PlanId } from "@/lib/plans";

export const EVENT_PACKAGES = {
  p: { people: 50, cents: 30_000 },
  m: { people: 200, cents: 70_000 },
  g: { people: 500, cents: 150_000 },
} as const;
export type EventPackage = keyof typeof EVENT_PACKAGES;
export const EVENT_PACKAGE_IDS = Object.keys(EVENT_PACKAGES) as EventPackage[];

export function isEventPackage(value: unknown): value is EventPackage {
  return typeof value === "string" && value in EVENT_PACKAGES;
}

export const EVENT_PACKAGE_NAMES: Record<EventPackage, Record<Lang, string>> = {
  p: { pt: "Mutirão P", en: "Event S", es: "Jornada P" },
  m: { pt: "Mutirão M", en: "Event M", es: "Jornada M" },
  g: { pt: "Mutirão G", en: "Event L", es: "Jornada G" },
};

/** Proofs are still accepted for a few hours after the end (weak signal at the beach, battery...). */
export const EVENT_GRACE_HOURS = 3;
export const EVENT_MAX_HOURS = 72;
/** A paid event lifts the member limit from a week before it starts until a week after it ends. */
export const EVENT_MEMBER_WINDOW_DAYS = 7;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export interface EventLike {
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
}

export function isEvent(mission: EventLike): boolean {
  return !!mission.startsAt && !!mission.endsAt;
}

export type EventPhase = "upcoming" | "open" | "closed";

export function eventPhase(mission: EventLike, now: Date = new Date()): EventPhase | null {
  if (!isEvent(mission)) return null;
  const start = new Date(mission.startsAt!).getTime();
  const end = new Date(mission.endsAt!).getTime();
  if (now.getTime() < start) return "upcoming";
  if (now.getTime() <= end + EVENT_GRACE_HOURS * HOUR) return "open";
  return "closed";
}

/** Error key (i18n "error_*") when a proof can't be sent now, null when it can. */
export function eventSubmissionError(mission: EventLike, now: Date = new Date()): "event_not_started" | "event_ended" | null {
  const phase = eventPhase(mission, now);
  if (phase === "upcoming") return "event_not_started";
  if (phase === "closed") return "event_ended";
  return null;
}

/** Validates the window typed by the organization (ISO strings built by the browser in local time). */
export function parseEventWindow(
  startRaw: unknown,
  endRaw: unknown,
  now: Date = new Date(),
): { startsAt: Date; endsAt: Date } | { error: "event_window" } {
  const startsAt = new Date(String(startRaw ?? ""));
  const endsAt = new Date(String(endRaw ?? ""));
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return { error: "event_window" };
  const length = endsAt.getTime() - startsAt.getTime();
  if (length < 30 * 60_000 || length > EVENT_MAX_HOURS * HOUR) return { error: "event_window" };
  // Not long finished and not more than a year ahead.
  if (endsAt.getTime() < now.getTime() - DAY || startsAt.getTime() > now.getTime() + 366 * DAY) return { error: "event_window" };
  return { startsAt, endsAt };
}

/** Report and certificates of an event: included in paid plans, or unlocked by paying the event. */
export function eventUnlocked(plan: PlanId, mission: { eventPaidAt?: Date | string | null }): boolean {
  return !!mission.eventPaidAt || hasFeature(plan, "reports");
}

/** Extra member allowance from paid events around now (0 = none). */
export function eventMemberAllowance(
  events: { eventPaidAt?: Date | string | null; eventPackage?: string | null; startsAt?: Date | string | null; endsAt?: Date | string | null }[],
  now: Date = new Date(),
): number {
  let allowance = 0;
  for (const event of events) {
    if (!event.eventPaidAt || !isEventPackage(event.eventPackage) || !isEvent(event)) continue;
    const from = new Date(event.startsAt!).getTime() - EVENT_MEMBER_WINDOW_DAYS * DAY;
    const until = new Date(event.endsAt!).getTime() + EVENT_MEMBER_WINDOW_DAYS * DAY;
    if (now.getTime() >= from && now.getTime() <= until) allowance = Math.max(allowance, EVENT_PACKAGES[event.eventPackage].people);
  }
  return allowance;
}

/** Package that fits the expected number of people. */
export function suggestedPackage(people: number): EventPackage {
  return EVENT_PACKAGE_IDS.find((id) => EVENT_PACKAGES[id].people >= people) ?? "g";
}

export function formatEventWindow(mission: EventLike, lang: Lang): string {
  if (!isEvent(mission)) return "";
  const locale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR";
  const start = new Date(mission.startsAt!);
  const end = new Date(mission.endsAt!);
  const day = start.toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "short" });
  const time = (d: Date) => d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay ? `${day}, ${time(start)}–${time(end)}` : `${day} ${time(start)} → ${end.toLocaleDateString(locale, { day: "2-digit", month: "short" })} ${time(end)}`;
}

export const EVENT_TEXT: Record<Lang, {
  badge: string;
  upcoming: string;
  open: string;
  closed: string;
  toggle: string;
  date: string;
  start: string;
  end: string;
  hint: string;
  tab: string;
  intro: string;
  empty: string;
  participants: string;
  actions: string;
  unlocked: string;
  locked: string;
  includedInPlan: string;
  choosePackage: string;
  upTo: (n: number) => string;
  payEvent: string;
  openReport: string;
  pixLabel: (name: string) => string;
  certificate: string;
  reportTitle: string;
  reportPeople: string;
  reportPhotos: string;
  reportKg: string;
  reportNoPhotos: string;
  certTitle: string;
  certBody: (name: string, event: string, org: string) => string;
  certCode: string;
  ownerOnlyPay: string;
}> = {
  pt: {
    badge: "Evento",
    upcoming: "Em breve",
    open: "Acontecendo",
    closed: "Encerrado",
    toggle: "É um evento (mutirão com data e horário)",
    date: "Data",
    start: "Início",
    end: "Fim",
    hint: `As comprovações só valem dentro do horário (com ${EVENT_GRACE_HOURS} h de tolerância depois do fim).`,
    tab: "Eventos",
    intro: "Mutirões com data e horário. Com plano pago, o relatório e os certificados já estão incluídos; sem plano, pague só o evento.",
    empty: "Nenhum evento ainda. Crie um na aba Missões marcando \"É um evento\".",
    participants: "participantes",
    actions: "ações aprovadas",
    unlocked: "Relatório liberado",
    locked: "Relatório bloqueado",
    includedInPlan: "incluído no plano",
    choosePackage: "Escolha o pacote do evento",
    upTo: (n) => `até ${n} pessoas`,
    payEvent: "Gerar Pix do evento",
    openReport: "Abrir relatório do evento",
    pixLabel: (name) => `Evento avulso · ${name}`,
    certificate: "Certificado",
    reportTitle: "Relatório do evento",
    reportPeople: "Participantes com ação verificada",
    reportPhotos: "Fotos do evento",
    reportKg: "reciclados (declarado e verificado por foto)",
    reportNoPhotos: "As fotos aparecem aqui quando as comprovações forem aprovadas.",
    certTitle: "Certificado de participação",
    certBody: (name, event, org) => `Certificamos que ${name} participou do evento "${event}", organizado por ${org}, com ação ambiental comprovada por foto e localização e verificada pelo EcoVerify.`,
    certCode: "Código de verificação",
    ownerOnlyPay: "Só o responsável pela organização pode pagar o evento.",
  },
  en: {
    badge: "Event",
    upcoming: "Upcoming",
    open: "Happening now",
    closed: "Finished",
    toggle: "It's an event (with date and time)",
    date: "Date",
    start: "Start",
    end: "End",
    hint: `Proofs only count within the time window (plus ${EVENT_GRACE_HOURS} h after the end).`,
    tab: "Events",
    intro: "Events with a date and time. Paid plans include the report and certificates; without a plan, pay just for the event.",
    empty: "No events yet. Create one in the Missions tab by ticking \"It's an event\".",
    participants: "participants",
    actions: "approved actions",
    unlocked: "Report unlocked",
    locked: "Report locked",
    includedInPlan: "included in the plan",
    choosePackage: "Choose the event package",
    upTo: (n) => `up to ${n} people`,
    payEvent: "Generate event Pix",
    openReport: "Open event report",
    pixLabel: (name) => `One-off event · ${name}`,
    certificate: "Certificate",
    reportTitle: "Event report",
    reportPeople: "Participants with a verified action",
    reportPhotos: "Event photos",
    reportKg: "recycled (declared and checked by photo)",
    reportNoPhotos: "Photos show up here once the proofs are approved.",
    certTitle: "Certificate of participation",
    certBody: (name, event, org) => `This certifies that ${name} took part in the event "${event}", organized by ${org}, with an environmental action proven by photo and location and verified by EcoVerify.`,
    certCode: "Verification code",
    ownerOnlyPay: "Only the organization owner can pay for the event.",
  },
  es: {
    badge: "Evento",
    upcoming: "Próximamente",
    open: "En curso",
    closed: "Finalizado",
    toggle: "Es un evento (jornada con fecha y hora)",
    date: "Fecha",
    start: "Inicio",
    end: "Fin",
    hint: `Las pruebas solo valen dentro del horario (con ${EVENT_GRACE_HOURS} h de tolerancia después del fin).`,
    tab: "Eventos",
    intro: "Jornadas con fecha y hora. Con plan pago, el informe y los certificados ya están incluidos; sin plan, paga solo el evento.",
    empty: "Aún no hay eventos. Crea uno en la pestaña Misiones marcando \"Es un evento\".",
    participants: "participantes",
    actions: "acciones aprobadas",
    unlocked: "Informe liberado",
    locked: "Informe bloqueado",
    includedInPlan: "incluido en el plan",
    choosePackage: "Elige el paquete del evento",
    upTo: (n) => `hasta ${n} personas`,
    payEvent: "Generar Pix del evento",
    openReport: "Abrir informe del evento",
    pixLabel: (name) => `Evento único · ${name}`,
    certificate: "Certificado",
    reportTitle: "Informe del evento",
    reportPeople: "Participantes con acción verificada",
    reportPhotos: "Fotos del evento",
    reportKg: "reciclados (declarado y verificado por foto)",
    reportNoPhotos: "Las fotos aparecen aquí cuando se aprueban las pruebas.",
    certTitle: "Certificado de participación",
    certBody: (name, event, org) => `Certificamos que ${name} participó en el evento "${event}", organizado por ${org}, con una acción ambiental comprobada por foto y ubicación y verificada por EcoVerify.`,
    certCode: "Código de verificación",
    ownerOnlyPay: "Solo el responsable de la organización puede pagar el evento.",
  },
};
