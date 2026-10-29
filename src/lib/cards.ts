/**
 * Football-style cards for fraud attempts. Pure rules, shared by the web app and the offline demo.
 *
 *  - Only a person gives a card (never the AI), and only for an attempt to cheat. Honest mistakes
 *    (dark photo, wrong mission) give no card.
 *  - 1st yellow: warning. 2nd: last warning. 3rd active yellow: 14-day suspension. Pending FONE stays
 *    frozen during the suspension, it is not lost. Points stay.
 *  - Yellow cards expire after 180 days. Cards that caused a suspension stop counting after it.
 *  - A new yellow within 180 days after a suspension ended is a repeat offence: the admins are
 *    alerted and decide on a red card.
 *  - Red card (admin only): the account is blocked (ban), for repeat or severe cases.
 *  - Every card can be appealed once; an admin accepts (card cancelled, suspension lifted) or keeps it.
 */
import type { Lang } from "@/lib/i18n";

export type CardType = "yellow" | "red";

export const CARD_REASONS = [
  "internet_copy",
  "screen_photo",
  "similar_photo",
  "ai_generated",
  "report_mismatch",
  "fake_gps",
  "chat_offense",
  "other",
] as const;
export type CardReason = (typeof CARD_REASONS)[number];

export function isCardReason(value: unknown): value is CardReason {
  return typeof value === "string" && (CARD_REASONS as readonly string[]).includes(value);
}

export const CARD_EXPIRY_DAYS = 180;
export const SUSPENSION_DAYS = 14;
export const YELLOWS_FOR_SUSPENSION = 3;
/** Minimum length of the note explaining the card (shown to the person). */
export const CARD_NOTE_MIN = 15;
export const CARD_APPEAL_MIN = 20;
const DAY = 24 * 60 * 60 * 1000;

export const CARD_REASON_LABELS: Record<CardReason, Record<Lang, string>> = {
  internet_copy: { pt: "Foto copiada da internet", en: "Photo copied from the internet", es: "Foto copiada de internet" },
  screen_photo: { pt: "Foto de tela ou impressão", en: "Photo of a screen or print", es: "Foto de pantalla o impresión" },
  similar_photo: { pt: "Foto reaproveitada", en: "Reused photo", es: "Foto reutilizada" },
  ai_generated: { pt: "Imagem gerada ou montada", en: "Generated or edited image", es: "Imagen generada o editada" },
  report_mismatch: { pt: "Relato inventado", en: "Made-up report", es: "Relato inventado" },
  fake_gps: { pt: "Localização falsa", en: "Fake location", es: "Ubicación falsa" },
  chat_offense: { pt: "Ofensa na comunidade", en: "Offence in the community", es: "Ofensa en la comunidad" },
  other: { pt: "Outra tentativa de fraude", en: "Other fraud attempt", es: "Otro intento de fraude" },
};

/** Rejection reasons that can be a fraud attempt (the reviewer may add a yellow card). */
export const CARDABLE_REJECTIONS: ReadonlySet<string> = new Set(["internet_copy", "screen_photo", "similar_photo", "ai_generated", "report_mismatch"]);

export function cardReasonForRejection(code: string | null | undefined): CardReason {
  return isCardReason(code) && CARDABLE_REJECTIONS.has(code) ? code : "other";
}

/** Minimal card shape the rules need (DB rows and demo objects both fit). */
export type CardLike = {
  type: CardType;
  createdAt: Date | string;
  expiresAt: Date | string | null;
  revokedAt: Date | string | null;
  /** Set when the card was used up by a suspension. */
  consumedAt: Date | string | null;
};

const time = (value: Date | string) => (typeof value === "string" ? new Date(value).getTime() : value.getTime());

export function cardExpiresAt(type: CardType, issuedAt: Date): Date | null {
  return type === "yellow" ? new Date(issuedAt.getTime() + CARD_EXPIRY_DAYS * DAY) : null;
}

/** Card still valid (not cancelled, not expired). */
export function isCardActive(card: CardLike, now: Date = new Date()): boolean {
  if (card.revokedAt) return false;
  return !card.expiresAt || time(card.expiresAt) > now.getTime();
}

/** Yellow cards that count towards a suspension. */
export function countingYellows<T extends CardLike>(cards: T[], now: Date = new Date()): T[] {
  return cards.filter((card) => card.type === "yellow" && !card.consumedAt && isCardActive(card, now));
}

export type YellowOutcome = {
  /** Active yellow cards after this one (1, 2, 3...). */
  count: number;
  /** This card completes the series: suspend now. */
  suspend: boolean;
  suspendedUntil: Date | null;
  /** Yellow within CARD_EXPIRY_DAYS after the end of a previous suspension: admins decide on a red card. */
  repeatOffence: boolean;
};

/**
 * What a new yellow card causes. `existing` = the person's cards before the new one;
 * `lastSuspensionEnd` = when their latest suspension ended (or ends).
 */
export function yellowOutcome(existing: CardLike[], lastSuspensionEnd: Date | string | null, now: Date = new Date()): YellowOutcome {
  const count = countingYellows(existing, now).length + 1;
  const suspend = count >= YELLOWS_FOR_SUSPENSION;
  const repeatOffence = !!lastSuspensionEnd && now.getTime() - time(lastSuspensionEnd) < CARD_EXPIRY_DAYS * DAY;
  return { count, suspend, suspendedUntil: suspend ? new Date(now.getTime() + SUSPENSION_DAYS * DAY) : null, repeatOffence };
}

export function isSuspended(suspendedUntil: Date | string | null | undefined, now: Date = new Date()): boolean {
  return !!suspendedUntil && time(suspendedUntil) > now.getTime();
}

/** Text of the notification sent to the person who got the card. */
export function cardNoticeText(
  lang: Lang,
  input: { type: CardType; reason: CardReason; note: string; outcome: YellowOutcome | null; until?: string },
): { title: string; message: string } {
  const label = CARD_REASON_LABELS[input.reason][lang];
  const T = CARD_TEXT[lang];
  if (input.type === "red") return { title: T.redTitle, message: `${label}. ${input.note} ${T.redBody}` };
  const outcome = input.outcome;
  const step = !outcome ? "" : outcome.suspend ? T.suspended(input.until ?? "") : outcome.count === 2 ? T.lastWarning : T.firstWarning;
  const appeal = outcome?.suspend ? T.appealSuspended : T.appeal;
  return { title: T.yellowTitle, message: `${label}. ${input.note} ${step} ${appeal}`.replace(/\s+/g, " ").trim() };
}

const CARD_TEXT: Record<
  Lang,
  { yellowTitle: string; redTitle: string; firstWarning: string; lastWarning: string; suspended: (until: string) => string; redBody: string; appeal: string; appealSuspended: string }
> = {
  pt: {
    yellowTitle: "🟨 Você recebeu um cartão amarelo",
    redTitle: "🟥 Cartão vermelho",
    firstWarning: "É um aviso: com 3 cartões amarelos válidos a conta fica suspensa por 14 dias.",
    lastWarning: "Este é o 2º cartão: no próximo, a conta fica suspensa por 14 dias.",
    suspended: (until) => `Este é o 3º cartão: a conta está suspensa até ${until}. Seus FONE pendentes ficam guardados.`,
    redBody: "A conta foi bloqueada.",
    appeal: "Se foi um engano, conteste em Perfil → Meus cartões.",
    appealSuspended: "Se foi um engano, entre com seu e-mail e senha para ver os detalhes e contestar.",
  },
  en: {
    yellowTitle: "🟨 You got a yellow card",
    redTitle: "🟥 Red card",
    firstWarning: "This is a warning: with 3 valid yellow cards the account is suspended for 14 days.",
    lastWarning: "This is your 2nd card: with the next one the account is suspended for 14 days.",
    suspended: (until) => `This is your 3rd card: the account is suspended until ${until}. Your pending FONE is kept.`,
    redBody: "The account was blocked.",
    appeal: "If it was a mistake, appeal in Profile → My cards.",
    appealSuspended: "If it was a mistake, sign in with your e-mail and password to see the details and appeal.",
  },
  es: {
    yellowTitle: "🟨 Recibiste una tarjeta amarilla",
    redTitle: "🟥 Tarjeta roja",
    firstWarning: "Es un aviso: con 3 tarjetas amarillas válidas la cuenta se suspende por 14 días.",
    lastWarning: "Esta es tu 2ª tarjeta: con la próxima la cuenta se suspende por 14 días.",
    suspended: (until) => `Esta es tu 3ª tarjeta: la cuenta está suspendida hasta ${until}. Tus FONE pendientes se guardan.`,
    redBody: "La cuenta fue bloqueada.",
    appeal: "Si fue un error, apela en Perfil → Mis tarjetas.",
    appealSuspended: "Si fue un error, inicia sesión con tu correo y contraseña para ver los detalles y apelar.",
  },
};
