/**
 * How customers reach and pay EcoVerify (environment variables, all optional):
 *
 * - SALES_EMAIL: receives the contact form leads (needs RESEND_API_KEY to actually send).
 * - SALES_WHATSAPP: phone in international format (e.g. 5581999999999) for the "Prefer WhatsApp?" link.
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

export function pixConfig() {
  const key = (process.env.PIX_KEY ?? "").trim();
  if (!key) return null;
  return {
    key,
    name: (process.env.PIX_RECEIVER_NAME ?? "EcoVerify").trim() || "EcoVerify",
    city: (process.env.PIX_RECEIVER_CITY ?? "Recife").trim() || "Recife",
  };
}

/** Public offline demo linked from the landing page ("Watch the 3-minute demo"). */
export function demoUrl(lang: string) {
  const base = (process.env.PUBLIC_DEMO_URL ?? "https://eco-verify-ruddy.vercel.app/").trim();
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}tour=1&lang=${lang}`;
}
