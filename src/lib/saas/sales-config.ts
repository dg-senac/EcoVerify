/**
 * How customers reach and pay EcoVerify (environment variables, all optional):
 *
 * - SALES_WHATSAPP: phone in international format (e.g. 5581999999999) for the "Talk to us" link.
 * - SALES_EMAIL: used for the same link when there is no WhatsApp.
 * - PIX_KEY + PIX_RECEIVER_NAME + PIX_RECEIVER_CITY: receiver of the plan payments. Without
 *   PIX_KEY the plan page shows "talk to us" instead of a Pix QR code.
 */
export function salesConfig() {
  const whatsapp = (process.env.SALES_WHATSAPP ?? "").replace(/\D/g, "");
  const email = (process.env.SALES_EMAIL ?? "").trim();
  return {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
    whatsappUrl: whatsapp.length >= 10 ? `https://wa.me/${whatsapp}` : null,
  };
}

/** "Talk to us" link of the plan page (government plan, or when Pix is not configured). */
export function contactUrl(): string | null {
  const { whatsappUrl, email } = salesConfig();
  return whatsappUrl ?? (email ? `mailto:${email}` : null);
}

export function pixConfig() {
  const key = (process.env.PIX_KEY ?? "").trim();
  if (!key) return null;
  return {
    key,
    name: (process.env.PIX_RECEIVER_NAME ?? "EcoVerify").trim() || "EcoVerify",
    city: (process.env.PIX_RECEIVER_CITY ?? "Recife").trim() || "Recife",
  };
}
