/**
 * Irregular dumping spots ("ponto de lixo irregular"). The flow follows the rest of the app:
 * a citizen reports the spot with a photo + GPS, the AI checks the photo, ANOTHER person confirms
 * it on site (own photo, close by), and then a cleanup mission (before/after) is created at that
 * exact spot. When a cleanup proof is approved, the spot is marked as resolved.
 *
 * Nobody earns anything for a report alone: points come only after an independent confirmation,
 * so fake reports don't pay. Unconfirmed reports expire.
 *
 * Pure module: shared by the web app and the APK.
 */
import type { AiAnalysis } from "@/lib/ai/decision";
import type { MissionForAi } from "@/lib/ai/gemini-core";
import { tx, type Lang } from "@/lib/i18n";

export const DUMP_SIZES = ["small", "medium", "large"] as const;
export type DumpSize = (typeof DUMP_SIZES)[number];
export type DumpStatus = "pending" | "open" | "confirmed" | "resolved" | "rejected" | "expired";
export type DumpRejection = "not_dump" | "screen_photo" | "unclear_photo" | "inappropriate" | "admin";

export const DUMP_DAILY_LIMIT = 3;
export const DUMP_CONFIRM_DAILY_LIMIT = 10;
export const DUMP_MAX_ACCURACY_M = 150;
/** An open report closer than this already covers the spot: confirm it instead. */
export const DUMP_DEDUPE_M = 50;
/** The confirming person must be this close to the reported spot. */
export const DUMP_CONFIRM_RADIUS_M = 100;
/** Nearby list on the screen. */
export const DUMP_NEARBY_KM = 5;
export const DUMP_EXPIRY_DAYS = 14;
export const DUMP_REPORT_POINTS = 10;
export const DUMP_CONFIRM_POINTS = 5;
export const CLEANUP_POINTS: Record<DumpSize, number> = { small: 30, medium: 50, large: 80 };

export function isDumpSize(value: unknown): value is DumpSize {
  return typeof value === "string" && (DUMP_SIZES as readonly string[]).includes(value);
}

/** What the vision model checks in a report photo (same adapter as mission proofs). */
export const DUMP_AI_MISSION: MissionForAi = {
  title: "Ponto de descarte irregular de lixo",
  description:
    "A pessoa está relatando um ponto de lixo descartado de forma irregular em local público (rua, calçada, terreno baldio, margem de rio/canal, praia, mangue).",
  category: "cleanup",
  context: null,
  aiChecklist:
    "A foto deve mostrar lixo, entulho, móveis velhos ou sacos de lixo largados em local público, fora de lixeira, contêiner ou caçamba autorizada. Uma lixeira cheia no lugar certo NÃO é descarte irregular.",
  proofType: "photo",
};

export type DumpAiOutcome =
  | { status: "open" }
  | { status: "rejected"; code: DumpRejection }
  | { status: "review" };

/**
 * Decision on a report photo. No analysis (AI off or unavailable) = the report is published and
 * the independent confirmation does the checking. A suspected internet copy is never decided by
 * the AI alone: it goes to the admin.
 */
export function dumpOutcome(analysis: AiAnalysis | null): DumpAiOutcome {
  if (!analysis) return { status: "open" };
  if (analysis.inappropriate) return { status: "rejected", code: "inappropriate" };
  if (analysis.screenOrPrint || analysis.aiGeneratedOrEdited || !analysis.isRealPhoto) return { status: "rejected", code: "screen_photo" };
  if (analysis.internetCopy) return { status: "review" };
  if (analysis.tooDarkOrBlurry) return { status: "rejected", code: "unclear_photo" };
  if (!analysis.matchesMission) return analysis.confidence >= 60 ? { status: "rejected", code: "not_dump" } : { status: "review" };
  return { status: "open" };
}

export function dumpExpiresAt(createdAt: Date | string): Date {
  return new Date(new Date(createdAt).getTime() + DUMP_EXPIRY_DAYS * 86_400_000);
}

export function isDumpOverdue(report: { status: DumpStatus; createdAt: Date | string }, at: Date = new Date()): boolean {
  return (report.status === "open" || report.status === "pending") && dumpExpiresAt(report.createdAt).getTime() <= at.getTime();
}

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Cleanup mission created at the spot after the confirmation (before/after proof). */
export function cleanupMission(report: { size: DumpSize; city: string | null; note: string | null }) {
  const place = report.city ? ` · ${report.city}` : "";
  const large = report.size === "large";
  const pt = large
    ? " Ponto grande: chame amigos ou a escola para um mutirão, ou registre a limpeza feita pela prefeitura."
    : "";
  const en = large ? " Large spot: get friends or your school together for a clean-up, or record the clean-up done by the city." : "";
  const es = large ? " Punto grande: reúne amigos o tu escuela para una jornada de limpieza, o registra la limpieza hecha por la municipalidad." : "";
  return {
    title: `Limpar ponto de lixo irregular${place}`,
    titleEn: `Clean up an illegal dumping spot${place}`,
    titleEs: `Limpiar un basural irregular${place}`,
    description:
      "Um morador relatou e outra pessoa confirmou lixo jogado aqui. Tire a foto ANTES, recolha o lixo com luvas e leve para uma lixeira ou ecoponto, e tire a foto DEPOIS do mesmo ângulo. Seringas, produtos químicos ou entulho pesado: não mexa — avise a prefeitura." +
      pt,
    descriptionEn:
      "A resident reported, and someone else confirmed, rubbish dumped here. Take the BEFORE photo, pick up the waste wearing gloves and take it to a bin or drop-off point, then take the AFTER photo from the same angle. Syringes, chemicals or heavy rubble: don't touch them — tell the city hall." +
      en,
    descriptionEs:
      "Un vecino informó, y otra persona confirmó, basura tirada aquí. Toma la foto ANTES, recoge la basura con guantes y llévala a un contenedor o ecopunto, y toma la foto DESPUÉS desde el mismo ángulo. Jeringas, químicos o escombros pesados: no los toques — avisa a la municipalidad." +
      es,
    context: report.note ? `Observação de quem relatou: ${report.note}` : null,
    category: "cleanup" as const,
    proofType: "before_after" as const,
    aiChecklist: "Foto ANTES: lixo descartado no local. Foto DEPOIS: o mesmo local, do mesmo ângulo, sem o lixo.",
    pointsReward: CLEANUP_POINTS[report.size],
    foneReward: "0",
    scope: "local" as const,
  };
}

/** CSV with the spots (for city halls / reports). */
export function dumpsCsv(
  rows: { id: string; createdAt: string | Date; status: DumpStatus; size: DumpSize; latitude: string | number; longitude: string | number; city: string | null; stateCode: string | null; confirmedAt?: string | Date | null; resolvedAt?: string | Date | null }[],
): string {
  const iso = (v: string | Date | null | undefined) => (v ? new Date(v).toISOString() : "");
  const esc = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = "id,criado_em,status,tamanho,latitude,longitude,cidade,uf,confirmado_em,resolvido_em";
  return [
    head,
    ...rows.map((r) =>
      [r.id, iso(r.createdAt), r.status, r.size, String(r.latitude), String(r.longitude), r.city ?? "", r.stateCode ?? "", iso(r.confirmedAt), iso(r.resolvedAt)].map(esc).join(","),
    ),
  ].join("\n");
}

/** What the screens show about a report (web and APK). */
export type DumpItem = {
  id: string;
  photoUrl: string;
  latitude: number;
  longitude: number;
  size: DumpSize;
  status: DumpStatus;
  needsReview: boolean;
  createdAt: string;
  city: string | null;
  note: string | null;
  rejectionCode: string | null;
  missionId: string | null;
  distanceM?: number;
  mine?: boolean;
  confirmedByMe?: boolean;
  reporterName?: string;
  confirmations?: number;
  aiReason?: string | null;
};

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export type DumpError =
  | "photo_required"
  | "invalid_photo"
  | "photo_too_large"
  | "duplicate_photo"
  | "location_required"
  | "location_inaccurate"
  | "daily_limit"
  | "nearby_open"
  | "invalid_size"
  | "not_found"
  | "own_report"
  | "already_confirmed"
  | "too_far"
  | "not_allowed";

export function dumpText(lang: Lang) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  return {
    title: T("Lixo irregular", "Illegal dumping", "Basura irregular"),
    subtitle: T(
      "Viu lixo jogado na rua, num terreno ou na beira do canal? Relate o ponto e ajude a limpar a cidade.",
      "Seen rubbish dumped on the street, in an empty lot or by a canal? Report the spot and help clean up the city.",
      "¿Viste basura tirada en la calle, en un terreno o junto al canal? Informa el punto y ayuda a limpiar la ciudad.",
    ),
    howTitle: T("Como funciona", "How it works", "Cómo funciona"),
    how: [
      T("📸 Você relata o ponto com uma foto, no local (o GPS marca onde é).", "📸 You report the spot with a photo, on site (GPS marks where it is).", "📸 Informas el punto con una foto, en el lugar (el GPS marca dónde está)."),
      T(
        `👀 Outra pessoa confirma com a própria foto. Aí você ganha ${DUMP_REPORT_POINTS} pontos e quem confirmou ganha ${DUMP_CONFIRM_POINTS}.`,
        `👀 Someone else confirms it with their own photo. Then you get ${DUMP_REPORT_POINTS} points and they get ${DUMP_CONFIRM_POINTS}.`,
        `👀 Otra persona lo confirma con su propia foto. Entonces ganas ${DUMP_REPORT_POINTS} puntos y quien confirmó gana ${DUMP_CONFIRM_POINTS}.`,
      ),
      T(
        `🧹 Vira uma missão de limpeza (antes e depois) que vale ${CLEANUP_POINTS.small} a ${CLEANUP_POINTS.large} pontos. Limpo, o ponto sai do mapa.`,
        `🧹 It becomes a clean-up mission (before and after) worth ${CLEANUP_POINTS.small} to ${CLEANUP_POINTS.large} points. Once clean, the spot leaves the map.`,
        `🧹 Se convierte en una misión de limpieza (antes y después) que vale de ${CLEANUP_POINTS.small} a ${CLEANUP_POINTS.large} puntos. Limpio, el punto sale del mapa.`,
      ),
    ],
    expiryNote: T(
      `Relatos sem confirmação em ${DUMP_EXPIRY_DAYS} dias expiram. Máximo de ${DUMP_DAILY_LIMIT} relatos por dia.`,
      `Reports without a confirmation in ${DUMP_EXPIRY_DAYS} days expire. Up to ${DUMP_DAILY_LIMIT} reports per day.`,
      `Los informes sin confirmación en ${DUMP_EXPIRY_DAYS} días expiran. Máximo ${DUMP_DAILY_LIMIT} informes por día.`,
    ),
    safety: T(
      "Segurança primeiro: não entre em terrenos fechados e não toque em seringas, produtos químicos ou animais mortos.",
      "Safety first: don't enter fenced lots and don't touch syringes, chemicals or dead animals.",
      "La seguridad primero: no entres en terrenos cerrados y no toques jeringas, químicos ni animales muertos.",
    ),
    reportTitle: T("Relatar um ponto", "Report a spot", "Informar un punto"),
    photo: T("Foto do lixo", "Photo of the rubbish", "Foto de la basura"),
    photoHint: T("Mostre o lixo e um pouco do lugar (rua, muro, poste).", "Show the rubbish and a bit of the place (street, wall, post).", "Muestra la basura y un poco del lugar (calle, muro, poste)."),
    size: T("Tamanho", "Size", "Tamaño"),
    sizes: {
      small: T("Pequeno (alguns sacos)", "Small (a few bags)", "Pequeño (algunas bolsas)"),
      medium: T("Médio (cabe num carrinho)", "Medium (fits in a cart)", "Mediano (cabe en un carrito)"),
      large: T("Grande (entulho, móveis, caçamba)", "Large (rubble, furniture, a skip's worth)", "Grande (escombros, muebles)"),
    } as Record<DumpSize, string>,
    note: T("Observação (opcional)", "Note (optional)", "Observación (opcional)"),
    notePlaceholder: T("Ex.: em frente ao nº 120, perto da escola", "E.g. in front of no. 120, near the school", "Ej.: frente al nº 120, cerca de la escuela"),
    location: T("Localização", "Location", "Ubicación"),
    getLocation: T("📍 Usar minha localização", "📍 Use my location", "📍 Usar mi ubicación"),
    locationOk: (m: number) => T(`Localização capturada (precisão ~${m} m)`, `Location captured (accuracy ~${m} m)`, `Ubicación capturada (precisión ~${m} m)`),
    locationError: T("Não foi possível obter sua localização. Ative o GPS e tente de novo.", "Could not get your location. Turn on GPS and try again.", "No se pudo obtener tu ubicación. Activa el GPS e inténtalo de nuevo."),
    send: T("Enviar relato", "Send report", "Enviar informe"),
    sent: T(
      "Relato enviado! Assim que outra pessoa confirmar, você ganha os pontos.",
      "Report sent! As soon as someone else confirms it, you get the points.",
      "¡Informe enviado! En cuanto otra persona lo confirme, ganas los puntos.",
    ),
    nearbyTitle: T("Pontos perto de você para confirmar", "Spots near you to confirm", "Puntos cerca de ti para confirmar"),
    nearbyEmpty: T("Nenhum ponto aberto por perto. 🎉", "No open spots nearby. 🎉", "No hay puntos abiertos cerca. 🎉"),
    nearbyNeedLocation: T("Use sua localização para ver os pontos por perto.", "Use your location to see nearby spots.", "Usa tu ubicación para ver los puntos cercanos."),
    confirm: T("Confirmar que está lá", "Confirm it's there", "Confirmar que sigue ahí"),
    confirmHint: T(
      `Vá até o local (até ${DUMP_CONFIRM_RADIUS_M} m), tire sua própria foto e confirme.`,
      `Go to the spot (within ${DUMP_CONFIRM_RADIUS_M} m), take your own photo and confirm.`,
      `Ve al lugar (hasta ${DUMP_CONFIRM_RADIUS_M} m), toma tu propia foto y confirma.`,
    ),
    confirmSend: T("Enviar confirmação", "Send confirmation", "Enviar confirmación"),
    confirmed: T(
      `Confirmado! Você ganhou ${DUMP_CONFIRM_POINTS} pontos e a missão de limpeza foi criada.`,
      `Confirmed! You earned ${DUMP_CONFIRM_POINTS} points and the clean-up mission was created.`,
      `¡Confirmado! Ganaste ${DUMP_CONFIRM_POINTS} puntos y se creó la misión de limpieza.`,
    ),
    openMission: T("Ver missão de limpeza", "See clean-up mission", "Ver misión de limpieza"),
    mineTitle: T("Meus relatos", "My reports", "Mis informes"),
    mineEmpty: T("Você ainda não relatou nenhum ponto.", "You haven't reported any spot yet.", "Todavía no informaste ningún punto."),
    away: (m: string) => T(`a ${m}`, `${m} away`, `a ${m}`),
    status: {
      pending: T("Verificando a foto", "Checking the photo", "Verificando la foto"),
      review: T("Em análise pela equipe", "Being reviewed by the team", "En revisión por el equipo"),
      open: T("Aguardando confirmação", "Waiting for confirmation", "Esperando confirmación"),
      confirmed: T("Confirmado · limpeza aberta", "Confirmed · clean-up open", "Confirmado · limpieza abierta"),
      resolved: T("Limpo ✓", "Cleaned ✓", "Limpio ✓"),
      rejected: T("Não aceito", "Not accepted", "No aceptado"),
      expired: T("Expirado sem confirmação", "Expired without confirmation", "Expirado sin confirmación"),
    },
    rejection: {
      not_dump: T("a foto não mostra lixo descartado irregularmente", "the photo doesn't show illegally dumped rubbish", "la foto no muestra basura tirada irregularmente"),
      screen_photo: T("a foto parece ser de uma tela, impressa ou editada", "the photo looks like a screen, a print or an edited image", "la foto parece de una pantalla, impresa o editada"),
      unclear_photo: T("a foto está escura ou borrada demais", "the photo is too dark or blurry", "la foto está demasiado oscura o borrosa"),
      inappropriate: T("a foto tem conteúdo impróprio", "the photo has inappropriate content", "la foto tiene contenido inapropiado"),
      admin: T("a equipe não aceitou o relato", "the team did not accept the report", "el equipo no aceptó el informe"),
    } as Record<DumpRejection, string>,
    reportedOn: (d: string) => T(`Relatado em ${d}`, `Reported on ${d}`, `Informado el ${d}`),
    expiresOn: (d: string) => T(`Expira em ${d}`, `Expires on ${d}`, `Expira el ${d}`),
    errors: {
      photo_required: T("Tire ou escolha uma foto.", "Take or choose a photo.", "Toma o elige una foto."),
      invalid_photo: T("Formato de foto inválido. Use JPG, PNG, WebP ou HEIC.", "Invalid photo format. Use JPG, PNG, WebP or HEIC.", "Formato de foto inválido. Usa JPG, PNG, WebP o HEIC."),
      photo_too_large: T("A foto passa de 10 MB.", "The photo is larger than 10 MB.", "La foto supera los 10 MB."),
      duplicate_photo: T("Essa foto já foi usada. Tire uma foto nova no local.", "This photo was already used. Take a new photo on site.", "Esa foto ya se usó. Toma una foto nueva en el lugar."),
      location_required: T("Capture sua localização no local.", "Capture your location on site.", "Captura tu ubicación en el lugar."),
      location_inaccurate: T(
        `Localização imprecisa (mais de ${DUMP_MAX_ACCURACY_M} m). Vá para um lugar aberto e tente de novo.`,
        `Location too imprecise (over ${DUMP_MAX_ACCURACY_M} m). Move to an open area and try again.`,
        `Ubicación imprecisa (más de ${DUMP_MAX_ACCURACY_M} m). Ve a un lugar abierto e inténtalo de nuevo.`,
      ),
      daily_limit: T(`Você já fez ${DUMP_DAILY_LIMIT} relatos hoje. Volte amanhã.`, `You've already sent ${DUMP_DAILY_LIMIT} reports today. Come back tomorrow.`, `Ya enviaste ${DUMP_DAILY_LIMIT} informes hoy. Vuelve mañana.`),
      nearby_open: T(
        "Já existe um relato aberto neste ponto. Confirme o relato existente na lista abaixo.",
        "There is already an open report at this spot. Confirm the existing report in the list below.",
        "Ya hay un informe abierto en este punto. Confirma el informe existente en la lista de abajo.",
      ),
      invalid_size: T("Escolha o tamanho.", "Choose the size.", "Elige el tamaño."),
      not_found: T("Esse relato não está mais aberto.", "This report is no longer open.", "Este informe ya no está abierto."),
      own_report: T("Quem relatou não pode confirmar o próprio relato.", "You can't confirm your own report.", "No puedes confirmar tu propio informe."),
      already_confirmed: T("Você já confirmou este ponto.", "You've already confirmed this spot.", "Ya confirmaste este punto."),
      too_far: T(`Você precisa estar a até ${DUMP_CONFIRM_RADIUS_M} m do ponto.`, `You need to be within ${DUMP_CONFIRM_RADIUS_M} m of the spot.`, `Debes estar a menos de ${DUMP_CONFIRM_RADIUS_M} m del punto.`),
      not_allowed: T("Sua conta não pode fazer isso agora.", "Your account can't do this right now.", "Tu cuenta no puede hacer esto ahora."),
    } as Record<DumpError, string>,
    cardTitle: T("🗑️ Viu lixo jogado?", "🗑️ Seen dumped rubbish?", "🗑️ ¿Viste basura tirada?"),
    cardText: T("Relate o ponto e ganhe pontos quando alguém confirmar", "Report the spot and earn points once someone confirms it", "Informa el punto y gana puntos cuando alguien lo confirme"),
    cardAction: T("Relatar", "Report", "Informar"),
    // Notifications
    notifyConfirmedTitle: T("Seu relato foi confirmado! 🗑️", "Your report was confirmed! 🗑️", "¡Tu informe fue confirmado! 🗑️"),
    notifyConfirmed: T(
      `Outra pessoa confirmou o ponto de lixo que você relatou. Você ganhou ${DUMP_REPORT_POINTS} pontos e uma missão de limpeza foi aberta no local.`,
      `Someone else confirmed the dumping spot you reported. You earned ${DUMP_REPORT_POINTS} points and a clean-up mission was opened there.`,
      `Otra persona confirmó el basural que informaste. Ganaste ${DUMP_REPORT_POINTS} puntos y se abrió una misión de limpieza en el lugar.`,
    ),
    notifyResolvedTitle: T("O ponto que você relatou foi limpo! ✨", "The spot you reported was cleaned! ✨", "¡El punto que informaste fue limpiado! ✨"),
    notifyResolved: T(
      "Alguém concluiu a missão de limpeza no ponto de lixo que você relatou. Obrigado por cuidar da cidade.",
      "Someone completed the clean-up mission at the dumping spot you reported. Thanks for looking after the city.",
      "Alguien completó la misión de limpieza en el basural que informaste. Gracias por cuidar la ciudad.",
    ),
    notifyRejectedTitle: T("Relato de lixo não aceito", "Dumping report not accepted", "Informe de basura no aceptado"),
    notifyRejected: (reason: string) =>
      T(`Seu relato de ponto de lixo não foi aceito: ${reason}.`, `Your dumping report was not accepted: ${reason}.`, `Tu informe de basural no fue aceptado: ${reason}.`),
    // Admin
    adminTitle: T("Lixo irregular", "Illegal dumping", "Basura irregular"),
    adminHint: T(
      "Relatos dos cidadãos. A confirmação de outra pessoa e a missão de limpeza são automáticas; aqui você só decide os casos que a IA mandou para análise. O CSV serve para enviar à prefeitura.",
      "Citizens' reports. The confirmation by another person and the clean-up mission are automatic; here you only decide the cases the AI sent for review. The CSV can be sent to the city hall.",
      "Informes de los ciudadanos. La confirmación de otra persona y la misión de limpieza son automáticas; aquí solo decides los casos que la IA envió a revisión. El CSV sirve para enviar a la municipalidad.",
    ),
    adminStats: {
      review: T("Em análise", "To review", "En revisión"),
      open: T("Abertos", "Open", "Abiertos"),
      confirmed: T("Em limpeza", "Being cleaned", "En limpieza"),
      resolved: T("Limpos", "Cleaned", "Limpios"),
    },
    adminApprove: T("Publicar", "Publish", "Publicar"),
    adminConfirm: T("Confirmar e abrir limpeza", "Confirm and open clean-up", "Confirmar y abrir limpieza"),
    adminReject: T("Rejeitar", "Reject", "Rechazar"),
    adminCsv: T("Baixar CSV", "Download CSV", "Descargar CSV"),
    adminEmpty: T("Nenhum relato ainda.", "No reports yet.", "Ningún informe todavía."),
    adminFilterAll: T("Todos", "All", "Todos"),
    by: (name: string) => T(`por ${name}`, `by ${name}`, `por ${name}`),
    confirmations: (n: number) => T(`${n} confirmação(ões)`, `${n} confirmation(s)`, `${n} confirmación(es)`),
    aiSays: T("IA", "AI", "IA"),
  };
}
