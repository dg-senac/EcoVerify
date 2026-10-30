/**
 * Local business benefits ("Comércio local", docs/MONETIZACAO.md §3). A shop pays for a showcase and
 * offers a discount/gift to people with verified actions. Redeeming does NOT spend points: it only
 * requires a minimum, once per person per offer, and gives a unique code checked at the counter.
 *
 * Pure module: shared by the server and the offline demo.
 */
import type { Lang } from "@/lib/i18n";

export const OFFER_KINDS = ["food", "bike", "sport", "shop", "culture", "other"] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];
export const OFFER_EMOJI: Record<OfferKind, string> = { food: "☕", bike: "🚲", sport: "🏋️", shop: "🛍️", culture: "📚", other: "🎁" };

export function isOfferKind(value: unknown): value is OfferKind {
  return typeof value === "string" && (OFFER_KINDS as readonly string[]).includes(value);
}

/** No look-alikes (0/O, 1/I/L). */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 8-character redemption code (shown as ABCD-2345). */
export function newRedemptionCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return code;
}

export function normalizeRedemptionCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export function formatRedemptionCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** Secret part of the partner's validation link (/parceiro/<token>): 24 url-safe characters. */
export function newPartnerToken(random: () => number = Math.random): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 24; i++) token += chars[Math.floor(random() * chars.length)];
  return token;
}

export function isPartnerToken(value: string): boolean {
  return /^[a-z2-9]{24}$/.test(value);
}

export interface OfferLike {
  isActive: boolean;
  adultsOnly: boolean;
  minPoints: number;
  maxRedemptions?: number | null;
  expiresAt?: Date | string | null;
}

export type RedeemError = "offer_unavailable" | "offer_expired" | "offer_sold_out" | "already_redeemed" | "adult_required" | "not_enough_points";

export function offerExpired(offer: OfferLike, now: Date = new Date()): boolean {
  return !!offer.expiresAt && new Date(offer.expiresAt).getTime() < now.getTime();
}

/** Whether a person may see the offer at all (18+ offers stay hidden until the person declares 18+). */
export function offerVisible(offer: OfferLike, user: { adultDeclaredAt?: Date | string | null }, now: Date = new Date()): boolean {
  return offer.isActive && !offerExpired(offer, now) && (!offer.adultsOnly || !!user.adultDeclaredAt);
}

export function redeemError(input: {
  offer: OfferLike;
  user: { totalPoints: number; adultDeclaredAt?: Date | string | null };
  alreadyRedeemed: boolean;
  redeemedCount: number;
  now?: Date;
}): RedeemError | null {
  const { offer, user, alreadyRedeemed, redeemedCount } = input;
  const now = input.now ?? new Date();
  if (!offer.isActive) return "offer_unavailable";
  if (offerExpired(offer, now)) return "offer_expired";
  if (alreadyRedeemed) return "already_redeemed";
  if (offer.adultsOnly && !user.adultDeclaredAt) return "adult_required";
  if (offer.maxRedemptions != null && redeemedCount >= offer.maxRedemptions) return "offer_sold_out";
  if (user.totalPoints < offer.minPoints) return "not_enough_points";
  return null;
}

export type ValidateError = "code_not_found" | "code_used" | "offer_expired";

export function validateError(redemption: { usedAt?: Date | string | null } | null, offer: OfferLike | null, now: Date = new Date()): ValidateError | null {
  if (!redemption || !offer) return "code_not_found";
  if (redemption.usedAt) return "code_used";
  if (offerExpired(offer, now)) return "offer_expired";
  return null;
}

/** Only the first name goes to the partner (data minimisation). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** Featured offers first, then those the person can already redeem, then by fewer points needed. */
export function sortOffers<T extends OfferLike & { featured?: boolean }>(offers: T[], points: number): T[] {
  return [...offers].sort(
    (a, b) =>
      Number(!!b.featured) - Number(!!a.featured) ||
      Number(points >= b.minPoints) - Number(points >= a.minPoints) ||
      a.minPoints - b.minPoints,
  );
}

export const BENEFIT_TEXT: Record<Lang, {
  nav: string;
  title: string;
  subtitle: string;
  freeNote: string;
  empty: string;
  minPoints: (n: number) => string;
  missing: (n: number) => string;
  redeem: string;
  redeemed: string;
  yourCode: string;
  showAtCounter: string;
  used: (date: string) => string;
  myCodes: string;
  validUntil: (date: string) => string;
  left: (n: number) => string;
  adultBadge: string;
  adultTitle: string;
  adultBody: string;
  adultConfirm: string;
  featured: string;
  errors: Record<RedeemError | ValidateError | "invalid" | "too_many", string>;
  partnerTitle: string;
  partnerSubtitle: string;
  partnerCodeLabel: string;
  partnerValidate: string;
  partnerOk: (name: string) => string;
  partnerStats: (generated: number, used: number) => string;
  partnerRecent: string;
  partnerInactive: string;
  partnerBadLink: string;
  partnerPrivacy: string;
}> = {
  pt: {
    nav: "Benefícios",
    title: "Benefícios",
    subtitle: "Comércios da sua cidade dão descontos e brindes para quem faz ações verificadas.",
    freeNote: "Resgatar não gasta seus pontos: o ranking continua igual. Cada benefício pode ser resgatado uma vez.",
    empty: "Ainda não há benefícios na sua cidade. Conhece um comércio que toparia? Fale com a gente!",
    minPoints: (n) => (n > 0 ? `a partir de ${n} pontos` : "para todos"),
    missing: (n) => `faltam ${n} pontos`,
    redeem: "Resgatar",
    redeemed: "Resgatado",
    yourCode: "Seu código",
    showAtCounter: "Mostre este código no balcão.",
    used: (d) => `usado em ${d}`,
    myCodes: "Meus códigos",
    validUntil: (d) => `válido até ${d}`,
    left: (n) => `restam ${n}`,
    adultBadge: "18+",
    adultTitle: "Alguns benefícios são só para maiores de 18 anos",
    adultBody: "Por lei, ofertas de comércio não podem ser direcionadas a crianças e adolescentes. Se você tem 18 anos ou mais, declare abaixo para ver todos.",
    adultConfirm: "Declaro que tenho 18 anos ou mais",
    featured: "Destaque",
    errors: {
      offer_unavailable: "Este benefício não está mais disponível.",
      offer_expired: "Este benefício expirou.",
      offer_sold_out: "Os códigos deste benefício acabaram.",
      already_redeemed: "Você já resgatou este benefício.",
      adult_required: "Este benefício é só para maiores de 18 anos.",
      not_enough_points: "Você ainda não tem os pontos mínimos. Complete mais missões!",
      code_not_found: "Código não encontrado. Confira as letras e os números.",
      code_used: "Este código já foi usado.",
      invalid: "Não foi possível concluir. Tente de novo.",
      too_many: "Muitas tentativas. Espere alguns minutos.",
    },
    partnerTitle: "Validar código EcoVerify",
    partnerSubtitle: "Digite o código que o cliente mostrou no celular.",
    partnerCodeLabel: "Código",
    partnerValidate: "Validar e marcar como usado",
    partnerOk: (name) => `Código válido! Benefício liberado para ${name}.`,
    partnerStats: (g, u) => `${g} códigos gerados · ${u} usados`,
    partnerRecent: "Últimos códigos usados",
    partnerInactive: "Este benefício está pausado. Fale com o EcoVerify para reativar.",
    partnerBadLink: "Link de validação inválido. Peça o link atualizado ao EcoVerify.",
    partnerPrivacy: "Guarde este link: quem tiver acesso a ele pode validar códigos. Você vê só o primeiro nome do cliente.",
  },
  en: {
    nav: "Perks",
    title: "Perks",
    subtitle: "Local businesses give discounts and gifts to people with verified actions.",
    freeNote: "Redeeming doesn't spend your points: your ranking stays the same. Each perk can be redeemed once.",
    empty: "No perks in your city yet. Know a business that would join? Tell us!",
    minPoints: (n) => (n > 0 ? `from ${n} points` : "for everyone"),
    missing: (n) => `${n} points to go`,
    redeem: "Redeem",
    redeemed: "Redeemed",
    yourCode: "Your code",
    showAtCounter: "Show this code at the counter.",
    used: (d) => `used on ${d}`,
    myCodes: "My codes",
    validUntil: (d) => `valid until ${d}`,
    left: (n) => `${n} left`,
    adultBadge: "18+",
    adultTitle: "Some perks are for adults (18+) only",
    adultBody: "By law, shop offers can't target children and teenagers. If you are 18 or older, declare it below to see them all.",
    adultConfirm: "I declare I am 18 or older",
    featured: "Featured",
    errors: {
      offer_unavailable: "This perk is no longer available.",
      offer_expired: "This perk has expired.",
      offer_sold_out: "This perk has run out of codes.",
      already_redeemed: "You already redeemed this perk.",
      adult_required: "This perk is for adults (18+) only.",
      not_enough_points: "You don't have the minimum points yet. Complete more missions!",
      code_not_found: "Code not found. Check the letters and numbers.",
      code_used: "This code was already used.",
      invalid: "Something went wrong. Try again.",
      too_many: "Too many attempts. Wait a few minutes.",
    },
    partnerTitle: "Validate an EcoVerify code",
    partnerSubtitle: "Type the code the customer shows on their phone.",
    partnerCodeLabel: "Code",
    partnerValidate: "Validate and mark as used",
    partnerOk: (name) => `Valid code! Perk granted to ${name}.`,
    partnerStats: (g, u) => `${g} codes generated · ${u} used`,
    partnerRecent: "Latest codes used",
    partnerInactive: "This perk is paused. Contact EcoVerify to reactivate it.",
    partnerBadLink: "Invalid validation link. Ask EcoVerify for the current link.",
    partnerPrivacy: "Keep this link private: anyone with it can validate codes. You only see the customer's first name.",
  },
  es: {
    nav: "Beneficios",
    title: "Beneficios",
    subtitle: "Comercios de tu ciudad dan descuentos y regalos a quien hace acciones verificadas.",
    freeNote: "Canjear no gasta tus puntos: el ranking sigue igual. Cada beneficio se canjea una vez.",
    empty: "Aún no hay beneficios en tu ciudad. ¿Conoces un comercio que se sumaría? ¡Escríbenos!",
    minPoints: (n) => (n > 0 ? `desde ${n} puntos` : "para todos"),
    missing: (n) => `faltan ${n} puntos`,
    redeem: "Canjear",
    redeemed: "Canjeado",
    yourCode: "Tu código",
    showAtCounter: "Muestra este código en el mostrador.",
    used: (d) => `usado el ${d}`,
    myCodes: "Mis códigos",
    validUntil: (d) => `válido hasta ${d}`,
    left: (n) => `quedan ${n}`,
    adultBadge: "18+",
    adultTitle: "Algunos beneficios son solo para mayores de 18 años",
    adultBody: "Por ley, las ofertas de comercios no pueden dirigirse a niños y adolescentes. Si tienes 18 años o más, decláralo abajo para verlos todos.",
    adultConfirm: "Declaro que tengo 18 años o más",
    featured: "Destacado",
    errors: {
      offer_unavailable: "Este beneficio ya no está disponible.",
      offer_expired: "Este beneficio expiró.",
      offer_sold_out: "Se agotaron los códigos de este beneficio.",
      already_redeemed: "Ya canjeaste este beneficio.",
      adult_required: "Este beneficio es solo para mayores de 18 años.",
      not_enough_points: "Aún no tienes los puntos mínimos. ¡Completa más misiones!",
      code_not_found: "Código no encontrado. Revisa las letras y los números.",
      code_used: "Este código ya fue usado.",
      invalid: "No se pudo completar. Inténtalo de nuevo.",
      too_many: "Demasiados intentos. Espera unos minutos.",
    },
    partnerTitle: "Validar código EcoVerify",
    partnerSubtitle: "Escribe el código que el cliente muestra en el celular.",
    partnerCodeLabel: "Código",
    partnerValidate: "Validar y marcar como usado",
    partnerOk: (name) => `¡Código válido! Beneficio liberado para ${name}.`,
    partnerStats: (g, u) => `${g} códigos generados · ${u} usados`,
    partnerRecent: "Últimos códigos usados",
    partnerInactive: "Este beneficio está pausado. Habla con EcoVerify para reactivarlo.",
    partnerBadLink: "Enlace de validación inválido. Pide el enlace actualizado a EcoVerify.",
    partnerPrivacy: "Guarda este enlace: quien lo tenga puede validar códigos. Solo ves el primer nombre del cliente.",
  },
};

/** What the admin types to create an offer (same shape on the web and in the demo). */
export interface OfferInput {
  partnerName: string;
  title: string;
  description: string;
  kind: string;
  city: string;
  address: string;
  minPoints: string | number;
  maxRedemptions: string | number;
  expiresAt: string;
  monthlyFee: string | number;
  adultsOnly: boolean;
  featured: boolean;
}

export interface OfferValues {
  partnerName: string;
  title: string;
  description: string;
  kind: OfferKind;
  city: string | null;
  address: string | null;
  minPoints: number;
  maxRedemptions: number | null;
  expiresAt: Date | null;
  monthlyFeeCents: number;
  adultsOnly: boolean;
  featured: boolean;
}

export function parseOfferInput(input: OfferInput): { value: OfferValues } | { error: "invalid" } {
  const partnerName = String(input.partnerName ?? "").trim();
  const title = String(input.title ?? "").trim();
  const description = String(input.description ?? "").trim();
  const minPoints = Math.round(Number(input.minPoints || 0));
  const maxRaw = String(input.maxRedemptions ?? "").trim();
  const maxRedemptions = maxRaw === "" ? null : Math.round(Number(maxRaw));
  const fee = Number(String(input.monthlyFee ?? "0").replace(",", ".") || 0);
  const expiresRaw = String(input.expiresAt ?? "").trim();
  // A date (yyyy-mm-dd) means "until the end of that day".
  const expiresAt = expiresRaw === "" ? null : new Date(/^\d{4}-\d{2}-\d{2}$/.test(expiresRaw) ? `${expiresRaw}T23:59:59` : expiresRaw);
  if (partnerName.length < 2 || partnerName.length > 80 || title.length < 4 || title.length > 120 || description.length < 10 || description.length > 600) return { error: "invalid" };
  if (!Number.isFinite(minPoints) || minPoints < 0 || minPoints > 100_000) return { error: "invalid" };
  if (maxRedemptions !== null && (!Number.isFinite(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 100_000)) return { error: "invalid" };
  if (!Number.isFinite(fee) || fee < 0 || fee > 100_000) return { error: "invalid" };
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { error: "invalid" };
  return {
    value: {
      partnerName,
      title,
      description,
      kind: isOfferKind(input.kind) ? input.kind : "other",
      city: String(input.city ?? "").trim().slice(0, 80) || null,
      address: String(input.address ?? "").trim().slice(0, 160) || null,
      minPoints,
      maxRedemptions,
      expiresAt,
      monthlyFeeCents: Math.round(fee * 100),
      adultsOnly: input.adultsOnly !== false,
      featured: !!input.featured,
    },
  };
}

const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/** Offers without a city show everywhere; otherwise only in the person's city (all when no city chosen). */
export function offerInCity(offerCity: string | null | undefined, personCity: string | null | undefined): boolean {
  return !offerCity || !personCity || plain(offerCity) === plain(personCity);
}
