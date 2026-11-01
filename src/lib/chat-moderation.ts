/**
 * Safety rules of the community chat. The app accepts people from 13 years old, so the public
 * chat must protect them without depending on a moderator being online:
 *
 * - Reports have a reason. 3 different people reporting (or 2 for sexual content / violence) hide
 *   the message for everybody at once; the staff then keeps or removes it.
 * - Images are checked by the AI before others see them (when the AI is configured); an
 *   inappropriate one is hidden and the staff is alerted.
 * - Phone numbers, e-mails and links can't be posted (nobody moves a child to a private chat).
 * - Audio and video (that the AI can't check) only for people who declared being 18+.
 * - Anyone can block a person (stops seeing their messages); the staff can mute a person.
 *
 * Pure module: shared by the web app and the APK.
 */
import { tx, type Lang } from "@/lib/i18n";

export const CHAT_REPORT_REASONS = ["offense", "sexual", "violence", "personal_data", "spam", "other"] as const;
export type ChatReportReason = (typeof CHAT_REPORT_REASONS)[number];
const SEVERE: ReadonlySet<ChatReportReason> = new Set(["sexual", "violence"]);

export const CHAT_HIDE_REPORTS = 3;
export const CHAT_HIDE_REPORTS_SEVERE = 2;
export const CHAT_REPORT_DETAIL_MAX = 200;
export const CHAT_MUTE_HOURS = [24, 168, 720] as const;
export type ChatMuteHours = (typeof CHAT_MUTE_HOURS)[number];

export type ChatHiddenReason = "reports" | "ai" | "staff";
export type ChatSendIssue = "contact_info" | "link" | "adult_media" | "muted";

export function isChatReportReason(value: unknown): value is ChatReportReason {
  return typeof value === "string" && (CHAT_REPORT_REASONS as readonly string[]).includes(value);
}

export function isChatMuteHours(value: unknown): value is ChatMuteHours {
  return typeof value === "number" && (CHAT_MUTE_HOURS as readonly number[]).includes(value);
}

/** Reports (one per person) that hide a message right away. */
export function shouldHideForReports(reasons: readonly string[]): boolean {
  if (reasons.length >= CHAT_HIDE_REPORTS) return true;
  return reasons.length >= CHAT_HIDE_REPORTS_SEVERE && reasons.some((r) => SEVERE.has(r as ChatReportReason));
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
// 8+ digits, allowing spaces, dots, dashes and parentheses between them (phone numbers, "9 9999-9999").
const PHONE = /(?:\+?\d[\s().-]*){8,}/;
const LINK = /(?:https?:\/\/|www\.)\S+|\b(?:wa\.me|t\.me|chat\.whatsapp)\b/i;
// Bare domains ("site.com.br"): lowercase only, so a missing space after a period ("dia.Com") is not a link.
const BARE_DOMAIN = /\b[a-z0-9-]{2,}\.(?:com|net|org|br|io|ly|gg|xyz)(?:\.br)?(?:\/\S*)?(?=$|[\s,;:!?)])/;

/** Contact data and links are not allowed in the public chat. */
export function chatTextIssue(text: string): "contact_info" | "link" | null {
  if (!text) return null;
  if (EMAIL.test(text) || PHONE.test(text)) return "contact_info";
  if (LINK.test(text) || BARE_DOMAIN.test(text)) return "link";
  return null;
}

/** Audio and video can't be checked by the AI: only for people who declared being 18+. */
export function canSendChatMedia(type: string, adult: boolean): boolean {
  return type === "audio" || type === "video" ? adult : true;
}

export function isChatMuted(mutedUntil: Date | string | null | undefined, at: Date = new Date()): boolean {
  return !!mutedUntil && new Date(mutedUntil).getTime() > at.getTime();
}

/** What the vision model is told about a chat image (only the "inappropriate" flag is used). */
export const CHAT_IMAGE_AI_MISSION = {
  title: "Imagem enviada no chat público da comunidade",
  description: "Chat público de um app ambiental usado também por adolescentes (13+).",
  category: "other",
  context: null,
  aiChecklist:
    "Qualquer imagem comum é aceita. Marque como imprópria se houver nudez ou conteúdo sexual, violência explícita, armas apontadas, drogas, símbolos de ódio, humilhação de alguém, ou documentos e dados pessoais legíveis (RG, CPF, cartão, endereço, telefone).",
  proofType: "photo" as const,
};

/** One reported message in the staff queue (web and APK). */
export type ChatReportItem = {
  messageId: string;
  authorId: string;
  authorName: string;
  authorMutedUntil: string | null;
  text: string | null;
  messageType: string;
  mediaUrl: string | null;
  createdAt: string;
  hidden: boolean;
  hiddenReason: ChatHiddenReason | null;
  reports: { reason: ChatReportReason | string; detail: string | null; reporterName: string; createdAt: string }[];
};

export function chatModText(lang: Lang) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  return {
    reasons: {
      offense: T("Ofensa, xingamento ou assédio", "Offence, insults or harassment", "Ofensa, insultos o acoso"),
      sexual: T("Conteúdo sexual", "Sexual content", "Contenido sexual"),
      violence: T("Violência ou ameaça", "Violence or threats", "Violencia o amenazas"),
      personal_data: T("Dados pessoais ou contato", "Personal data or contact details", "Datos personales o de contacto"),
      spam: T("Spam ou propaganda", "Spam or advertising", "Spam o publicidad"),
      other: T("Outro motivo", "Other reason", "Otro motivo"),
    } as Record<ChatReportReason, string>,
    reportTitle: T("Denunciar mensagem", "Report message", "Denunciar mensaje"),
    reportWhy: T("Qual é o problema?", "What's wrong?", "¿Cuál es el problema?"),
    reportDetail: T("Detalhes (opcional)", "Details (optional)", "Detalles (opcional)"),
    reportSend: T("Enviar denúncia", "Send report", "Enviar denuncia"),
    reportDone: T(
      "Obrigado! A equipe vai analisar. Se mais pessoas denunciarem, a mensagem some na hora.",
      "Thanks! The team will review it. If more people report it, the message disappears at once.",
      "¡Gracias! El equipo lo revisará. Si más personas lo denuncian, el mensaje desaparece al instante.",
    ),
    reportAlready: T("Você já denunciou esta mensagem.", "You've already reported this message.", "Ya denunciaste este mensaje."),
    reportChoose: T("Escolha um motivo.", "Choose a reason.", "Elige un motivo."),
    block: T("Bloquear esta pessoa", "Block this person", "Bloquear a esta persona"),
    blockConfirm: (name: string) =>
      T(
        `Bloquear ${name}? Você deixa de ver as mensagens dessa pessoa. Ela não é avisada.`,
        `Block ${name}? You'll stop seeing their messages. They won't be told.`,
        `¿Bloquear a ${name}? Dejarás de ver sus mensajes. No se le avisará.`,
      ),
    blockedTitle: (n: number) => T(`Pessoas bloqueadas (${n})`, `Blocked people (${n})`, `Personas bloqueadas (${n})`),
    unblock: T("Desbloquear", "Unblock", "Desbloquear"),
    cancel: T("Cancelar", "Cancel", "Cancelar"),
    errorGeneric: T("Não deu certo. Tente de novo.", "That didn't work. Try again.", "No funcionó. Inténtalo de nuevo."),
    showMedia: T("Toque para ver a mídia", "Tap to see the media", "Toca para ver el contenido"),
    hiddenOwn: T(
      "🔒 Oculta para os outros: em análise pela equipe.",
      "🔒 Hidden from others: being reviewed by the team.",
      "🔒 Oculto para los demás: en revisión por el equipo.",
    ),
    checkingImage: T("🔎 Verificando a imagem…", "🔎 Checking the image…", "🔎 Verificando la imagen…"),
    mutedBanner: (until: string) =>
      T(
        `Você está sem poder enviar mensagens no chat até ${until}. Dá para continuar lendo.`,
        `You can't send messages in the chat until ${until}. You can still read.`,
        `No puedes enviar mensajes en el chat hasta el ${until}. Puedes seguir leyendo.`,
      ),
    adultMediaHint: T(
      "Áudio e vídeo só para quem declarou ter 18 anos ou mais (no Perfil).",
      "Audio and video only for people who declared being 18+ (in Profile).",
      "Audio y video solo para quienes declararon tener 18 años o más (en Perfil).",
    ),
    safetyNote: T(
      "Chat público e moderado: não compartilhe telefone, e-mail, endereço ou links. Denuncie o que for estranho.",
      "Public, moderated chat: don't share phone numbers, e-mails, addresses or links. Report anything odd.",
      "Chat público y moderado: no compartas teléfono, correo, dirección ni enlaces. Denuncia lo extraño.",
    ),
    errors: {
      contact_info: T(
        "Por segurança, não compartilhe telefone ou e-mail no chat público.",
        "For safety, don't share phone numbers or e-mails in the public chat.",
        "Por seguridad, no compartas teléfonos ni correos en el chat público.",
      ),
      link: T("Links não são permitidos no chat público.", "Links aren't allowed in the public chat.", "No se permiten enlaces en el chat público."),
      adult_media: T(
        "Áudio e vídeo só para quem declarou ter 18 anos ou mais.",
        "Audio and video are only for people who declared being 18+.",
        "Audio y video solo para quienes declararon tener 18 años o más.",
      ),
      muted: T("Você está temporariamente sem poder enviar mensagens.", "You're temporarily unable to send messages.", "Temporalmente no puedes enviar mensajes."),
    } as Record<ChatSendIssue, string>,
    // Staff queue
    panelTitle: T("Denúncias do chat", "Chat reports", "Denuncias del chat"),
    panelHint: T(
      "Mensagens denunciadas ou barradas pela IA. Com 3 denúncias (2 se for conteúdo sexual ou violência) a mensagem já some sozinha; aqui você mantém ou remove.",
      "Messages reported or stopped by the AI. With 3 reports (2 for sexual content or violence) the message is already hidden; here you keep or remove it.",
      "Mensajes denunciados o frenados por la IA. Con 3 denuncias (2 si es contenido sexual o violencia) el mensaje ya se oculta solo; aquí lo mantienes o lo eliminas.",
    ),
    panelEmpty: T("Nenhuma denúncia pendente. 🎉", "No pending reports. 🎉", "Ninguna denuncia pendiente. 🎉"),
    hiddenBy: {
      reports: T("Oculta pelas denúncias", "Hidden by reports", "Oculto por las denuncias"),
      ai: T("Barrada pela IA", "Stopped by the AI", "Frenado por la IA"),
      staff: T("Removida pela equipe", "Removed by the team", "Eliminado por el equipo"),
    } as Record<ChatHiddenReason, string>,
    visible: T("Ainda visível", "Still visible", "Aún visible"),
    reportsCount: (n: number) => T(`${n} denúncia(s)`, `${n} report(s)`, `${n} denuncia(s)`),
    keep: T("Manter (sem problema)", "Keep (no problem)", "Mantener (sin problema)"),
    remove: T("Remover mensagem", "Remove message", "Eliminar mensaje"),
    mute: T("Silenciar autor", "Mute author", "Silenciar autor"),
    muteFor: (h: number) => (h === 24 ? T("24 h", "24 h", "24 h") : h === 168 ? T("7 dias", "7 days", "7 días") : T("30 dias", "30 days", "30 días")),
    unmute: T("Tirar silêncio", "Unmute", "Quitar silencio"),
    mutedUntil: (d: string) => T(`Silenciado até ${d}`, `Muted until ${d}`, `Silenciado hasta ${d}`),
    yellowCard: T("Remover + cartão amarelo", "Remove + yellow card", "Eliminar + tarjeta amarilla"),
    cardNote: T(
      "Explique para a pessoa o que ela fez (mín. 15 caracteres)",
      "Explain to the person what they did (min. 15 characters)",
      "Explica a la persona lo que hizo (mín. 15 caracteres)",
    ),
    cardSend: T("Dar cartão e remover", "Give card and remove", "Dar tarjeta y eliminar"),
    media: T("[mídia]", "[media]", "[multimedia]"),
    // Notifications
    staffHiddenTitle: T("Mensagem ocultada no chat", "Message hidden in the chat", "Mensaje ocultado en el chat"),
    staffHidden: (author: string, why: string) =>
      T(`Uma mensagem de ${author} foi ocultada (${why}). Confira em Moderação → Denúncias do chat.`, `A message from ${author} was hidden (${why}). Check it in Moderation → Chat reports.`, `Un mensaje de ${author} fue ocultado (${why}). Revísalo en Moderación → Denuncias del chat.`),
    removedTitle: T("Sua mensagem foi removida do chat", "Your message was removed from the chat", "Tu mensaje fue eliminado del chat"),
    removed: T(
      "A equipe removeu uma mensagem sua da comunidade por não seguir as regras (respeito, nada de conteúdo impróprio, contato ou links).",
      "The team removed one of your community messages for breaking the rules (respect, no inappropriate content, contact details or links).",
      "El equipo eliminó un mensaje tuyo de la comunidad por no seguir las reglas (respeto, sin contenido inapropiado, contactos ni enlaces).",
    ),
    mutedTitle: T("Você foi silenciado no chat", "You were muted in the chat", "Fuiste silenciado en el chat"),
    mutedMsg: (until: string) =>
      T(
        `Você não pode enviar mensagens na comunidade até ${until}. Se achar que foi um engano, fale com o suporte.`,
        `You can't send community messages until ${until}. If you think it's a mistake, contact support.`,
        `No puedes enviar mensajes en la comunidad hasta el ${until}. Si crees que es un error, contacta al soporte.`,
      ),
  };
}
