/**
 * Partner collection points with a scale (cooperativas, ecopontos, recycling shops).
 *
 * Missions with the proof type "partner" are confirmed by the point: the person sends the proof,
 * gets a delivery code (with a QR) and shows it at the point. The point opens its secret link
 * /ponto/<token> (no account, like the benefits partner page), reads the QR or types the code, picks
 * the material and types the weight from its scale. The weight is then "checked at the collection
 * point" and the confirmation counts as strong evidence in the confidence score.
 *
 * Pure module: shared by the web app and the APK.
 */
import { tx, type Lang } from "@/lib/i18n";
import { isMaterial, type Material } from "@/lib/impact";

/** The point has this long to confirm a delivery; after that the proof is refused. */
export const PARTNER_CONFIRM_HOURS = 48;
/** One delivery of one person. More than this is a typo. */
export const MAX_PARTNER_KG = 500;

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 6-character delivery code (shown as ABC-234). */
export function newDeliveryCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  return code;
}

export function normalizeDeliveryCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function formatDeliveryCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

export function isDeliveryCode(value: string): boolean {
  return /^[A-HJ-NP-Z2-9]{6}$/.test(value);
}

const QR_PREFIX = "ECOVERIFY-ENTREGA:";

/** What the QR on the person's proof contains. */
export function deliveryQrPayload(code: string): string {
  return `${QR_PREFIX}${code}`;
}

/** Reads a scanned QR (or a typed code). null = not a delivery code. */
export function parseDeliveryQr(text: string): string | null {
  const raw = text.trim().toUpperCase().startsWith(QR_PREFIX) ? text.trim().slice(QR_PREFIX.length) : text;
  const code = normalizeDeliveryCode(raw);
  return isDeliveryCode(code) ? code : null;
}

/** Weight typed by the point (kg, comma or dot). 0.1 precision. */
export function parsePartnerKg(raw: unknown): number | null {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(text)) return null;
  const kg = Math.round(Number(text) * 10) / 10;
  return kg >= 0.1 && kg <= MAX_PARTNER_KG ? kg : null;
}

export type DeliveryError = "invalid" | "not_found" | "already_confirmed" | "expired" | "not_pending" | "kg_invalid" | "material_invalid" | "too_many";

/** Checks a delivery before the point confirms it. */
export function deliveryError(
  row: { status: string; partnerConfirmedAt: Date | string | null; submittedAt: Date | string } | null,
  now: Date = new Date(),
): DeliveryError | null {
  if (!row) return "not_found";
  if (row.partnerConfirmedAt) return "already_confirmed";
  if (row.status !== "pending") return "not_pending";
  if (now.getTime() - new Date(row.submittedAt).getTime() > PARTNER_CONFIRM_HOURS * 3_600_000) return "expired";
  return null;
}

export function parseDeliveryInput(materialRaw: unknown, kgRaw: unknown): { material: Material; kg: number } | { error: DeliveryError } {
  if (!isMaterial(materialRaw)) return { error: "material_invalid" };
  const kg = parsePartnerKg(kgRaw);
  if (kg === null) return { error: "kg_invalid" };
  return { material: materialRaw, kg };
}

/** Texts of the point page (/ponto/<token>) and of the person's delivery box. */
export function pointText(lang: Lang) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  return {
    pageTitle: T("Conferir entrega", "Check a delivery", "Verificar entrega"),
    subtitle: T(
      "Leia o QR da pessoa ou digite o código, pese o material e confirme. O peso fica registrado como conferido pelo ponto.",
      "Scan the person's QR or type the code, weigh the material and confirm. The weight is recorded as checked by the point.",
      "Lee el QR de la persona o escribe el código, pesa el material y confirma. El peso queda registrado como verificado por el punto.",
    ),
    codeLabel: T("Código da entrega", "Delivery code", "Código de la entrega"),
    find: T("Buscar entrega", "Find delivery", "Buscar entrega"),
    scan: T("Ler QR com a câmera", "Scan QR with the camera", "Leer QR con la cámara"),
    scanFailed: T("Não encontrei um QR na foto. Tente de novo ou digite o código.", "No QR found in the photo. Try again or type the code.", "No encontré un QR en la foto. Inténtalo de nuevo o escribe el código."),
    person: T("Pessoa", "Person", "Persona"),
    mission: T("Missão", "Mission", "Misión"),
    material: T("Material", "Material", "Material"),
    weight: T("Peso na balança (kg)", "Weight on the scale (kg)", "Peso en la balanza (kg)"),
    confirm: T("Confirmar entrega", "Confirm delivery", "Confirmar entrega"),
    cancel: T("Cancelar", "Cancel", "Cancelar"),
    ok: (name: string, kg: string) => T(`Entrega de ${name} confirmada: ${kg}.`, `${name}'s delivery confirmed: ${kg}.`, `Entrega de ${name} confirmada: ${kg}.`),
    stats: (count: number, kg: string) =>
      T(`${count} entrega(s) conferida(s) · ${kg} no total`, `${count} delivery(ies) checked · ${kg} in total`, `${count} entrega(s) verificada(s) · ${kg} en total`),
    recent: T("Últimas entregas conferidas", "Latest checked deliveries", "Últimas entregas verificadas"),
    inactive: T("Este ponto de coleta está desativado. Fale com a equipe EcoVerify.", "This collection point is disabled. Contact the EcoVerify team.", "Este punto de recolección está desactivado. Habla con el equipo EcoVerify."),
    privacy: T(
      "Você vê só o primeiro nome da pessoa e a missão. Nada de e-mail, telefone ou localização.",
      "You only see the person's first name and the mission. No e-mail, phone or location.",
      "Solo ves el primer nombre de la persona y la misión. Nada de correo, teléfono o ubicación.",
    ),
    errors: {
      invalid: T("Código inválido.", "Invalid code.", "Código no válido."),
      not_found: T("Nenhuma entrega com esse código neste ponto.", "No delivery with this code at this point.", "Ninguna entrega con ese código en este punto."),
      already_confirmed: T("Essa entrega já foi conferida.", "This delivery was already checked.", "Esa entrega ya fue verificada."),
      expired: T(`O prazo de ${PARTNER_CONFIRM_HOURS} h para conferir essa entrega terminou.`, `The ${PARTNER_CONFIRM_HOURS} h deadline to check this delivery is over.`, `El plazo de ${PARTNER_CONFIRM_HOURS} h para verificar esta entrega terminó.`),
      not_pending: T("Essa comprovação já foi decidida.", "This proof was already decided.", "Esta comprobación ya fue decidida."),
      kg_invalid: T(`Informe o peso entre 0,1 e ${MAX_PARTNER_KG} kg.`, `Type a weight between 0.1 and ${MAX_PARTNER_KG} kg.`, `Indica un peso entre 0,1 y ${MAX_PARTNER_KG} kg.`),
      material_invalid: T("Escolha o material.", "Choose the material.", "Elige el material."),
      too_many: T("Muitas tentativas. Aguarde alguns minutos.", "Too many attempts. Wait a few minutes.", "Demasiados intentos. Espera unos minutos."),
    } satisfies Record<DeliveryError, string>,
    // The person's side.
    boxTitle: T("Mostre no ponto de coleta", "Show it at the collection point", "Muéstralo en el punto de recolección"),
    boxHint: (point: string) =>
      T(
        `Leve o material até ${point}. A equipe lê este QR (ou digita o código), pesa e confirma. Você recebe os pontos com o peso conferido.`,
        `Take the material to ${point}. The team scans this QR (or types the code), weighs it and confirms. You get the points with the checked weight.`,
        `Lleva el material a ${point}. El equipo lee este QR (o escribe el código), lo pesa y confirma. Recibes los puntos con el peso verificado.`,
      ),
    boxDeadline: T(`A entrega precisa ser conferida em até ${PARTNER_CONFIRM_HOURS} horas.`, `The delivery must be checked within ${PARTNER_CONFIRM_HOURS} hours.`, `La entrega debe verificarse en hasta ${PARTNER_CONFIRM_HOURS} horas.`),
    confirmedNotice: (kg: string) => T(`✓ Entrega conferida no ponto: ${kg}.`, `✓ Delivery checked at the point: ${kg}.`, `✓ Entrega verificada en el punto: ${kg}.`),
    notifTitle: T("⚖️ Entrega conferida", "⚖️ Delivery checked", "⚖️ Entrega verificada"),
    notifMessage: (point: string, kg: string, mission: string) =>
      T(
        `${point} conferiu sua entrega de "${mission}": ${kg}. A verificação vai concluir em instantes.`,
        `${point} checked your delivery for "${mission}": ${kg}. The verification will finish shortly.`,
        `${point} verificó tu entrega de "${mission}": ${kg}. La verificación terminará en instantes.`,
      ),
  };
}
