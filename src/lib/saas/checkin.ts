/**
 * Event check-in (mutirão): the organizer shows a QR with a 6-digit code that changes every
 * CHECKIN_STEP_MINUTES; participants scan it (or type the code) in the app. A confirmed presence
 * is strong evidence for the proofs of that event (confidence score, src/lib/verification.ts).
 *
 * The code is HMAC-SHA256(secret, missionId:window): it can't be guessed and a photo of the QR sent
 * to someone at home stops working in a few minutes.
 *
 * Pure module (Web Crypto, available in Node 20+ and browsers): shared by the server and the APK.
 */
import { tx, type Lang } from "@/lib/i18n";
import { EVENT_GRACE_HOURS, type EventLike } from "@/lib/saas/events";

export const CHECKIN_STEP_MINUTES = 5;
/** Check-in opens a little before the start (people arrive early). */
export const CHECKIN_EARLY_MINUTES = 60;

const STEP_MS = CHECKIN_STEP_MINUTES * 60_000;

export function checkinWindow(now: Date = new Date()): number {
  return Math.floor(now.getTime() / STEP_MS);
}

/** When the current code stops being shown (the previous one is still accepted for one more step). */
export function checkinCodeExpiresAt(now: Date = new Date()): Date {
  return new Date((checkinWindow(now) + 1) * STEP_MS);
}

export async function checkinCode(secret: string, missionId: string, window: number): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`checkin:${missionId}:${window}`)));
  // Dynamic truncation (RFC 4226): 6 digits.
  const offset = mac[mac.length - 1] & 0x0f;
  const value = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(value % 1_000_000).padStart(6, "0");
}

/** The current code or the one before it (someone scanned right at the change). */
export async function isValidCheckinCode(secret: string, missionId: string, code: string, now: Date = new Date()): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  const window = checkinWindow(now);
  for (const w of [window, window - 1]) {
    if ((await checkinCode(secret, missionId, w)) === code) return true;
  }
  return false;
}

export type CheckinPhase = "early" | "open" | "closed";

export function checkinPhase(mission: EventLike, now: Date = new Date()): CheckinPhase | null {
  if (!mission.startsAt || !mission.endsAt) return null;
  const opens = new Date(mission.startsAt).getTime() - CHECKIN_EARLY_MINUTES * 60_000;
  const closes = new Date(mission.endsAt).getTime() + EVENT_GRACE_HOURS * 3_600_000;
  if (now.getTime() < opens) return "early";
  if (now.getTime() > closes) return "closed";
  return "open";
}

const QR_PREFIX = "ECOVERIFY-CHECKIN:";

export function checkinQrPayload(missionId: string, code: string): string {
  return `${QR_PREFIX}${missionId}:${code}`;
}

/** Reads a scanned QR or a typed code. missionId is null when only the 6 digits were typed. */
export function parseCheckinQr(text: string): { missionId: string | null; code: string } | null {
  const raw = text.trim();
  if (raw.toUpperCase().startsWith(QR_PREFIX)) {
    const [missionId, code] = raw.slice(QR_PREFIX.length).split(":");
    return missionId && /^\d{6}$/.test(code ?? "") ? { missionId, code } : null;
  }
  const digits = raw.replace(/\D/g, "");
  return digits.length === 6 ? { missionId: null, code: digits } : null;
}

export type CheckinError = "invalid_code" | "wrong_event" | "early" | "closed" | "not_member" | "too_many";

export function checkinText(lang: Lang) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  return {
    title: T("Check-in do mutirão", "Event check-in", "Check-in de la jornada"),
    hint: T(
      "Chegou? Leia o QR que a organização está mostrando (ou digite o código de 6 números). A presença confirmada ajuda a aprovar sua comprovação.",
      "Arrived? Scan the QR the organizers are showing (or type the 6-digit code). A confirmed presence helps approve your proof.",
      "¿Llegaste? Lee el QR que muestra la organización (o escribe el código de 6 números). La presencia confirmada ayuda a aprobar tu comprobación.",
    ),
    scan: T("Ler QR com a câmera", "Scan QR with the camera", "Leer QR con la cámara"),
    scanFailed: T("Não encontrei um QR na foto. Tente de novo ou digite o código.", "No QR found in the photo. Try again or type the code.", "No encontré un QR en la foto. Inténtalo de nuevo o escribe el código."),
    codeLabel: T("Código de 6 números", "6-digit code", "Código de 6 números"),
    send: T("Confirmar presença", "Confirm presence", "Confirmar presencia"),
    done: (time: string) => T(`✓ Presença confirmada às ${time}.`, `✓ Presence confirmed at ${time}.`, `✓ Presencia confirmada a las ${time}.`),
    early: T("O check-in abre 1 hora antes do início.", "Check-in opens 1 hour before the start.", "El check-in abre 1 hora antes del inicio."),
    errors: {
      invalid_code: T("Código inválido ou vencido. Leia o QR de novo.", "Invalid or expired code. Scan the QR again.", "Código no válido o vencido. Lee el QR de nuevo."),
      wrong_event: T("Esse QR é de outro evento.", "This QR is for another event.", "Ese QR es de otro evento."),
      early: T("O check-in ainda não abriu.", "Check-in is not open yet.", "El check-in aún no abrió."),
      closed: T("O check-in deste evento já fechou.", "Check-in for this event is closed.", "El check-in de este evento ya cerró."),
      not_member: T("Entre na organização para participar.", "Join the organization to take part.", "Únete a la organización para participar."),
      too_many: T("Muitas tentativas. Aguarde alguns minutos.", "Too many attempts. Wait a few minutes.", "Demasiados intentos. Espera unos minutos."),
    } satisfies Record<CheckinError, string>,
    // Organizer side.
    showQr: T("QR de check-in", "Check-in QR", "QR de check-in"),
    displayTitle: T("Check-in: aponte a câmera do app EcoVerify", "Check-in: point the EcoVerify app camera", "Check-in: apunta la cámara de la app EcoVerify"),
    displayHint: T(
      `O código muda a cada ${CHECKIN_STEP_MINUTES} minutos. Deixe esta tela aberta na entrada do evento.`,
      `The code changes every ${CHECKIN_STEP_MINUTES} minutes. Keep this screen open at the event entrance.`,
      `El código cambia cada ${CHECKIN_STEP_MINUTES} minutos. Deja esta pantalla abierta en la entrada del evento.`,
    ),
    present: (n: number) => T(`${n} presença(s) confirmada(s)`, `${n} presence(s) confirmed`, `${n} presencia(s) confirmada(s)`),
    close: T("Fechar", "Close", "Cerrar"),
  };
}
