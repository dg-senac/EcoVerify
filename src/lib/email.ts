import type { Lang } from "@/lib/i18n";

/**
 * Transactional e-mail (account confirmation and password reset).
 *
 * - "resend": RESEND_API_KEY + EMAIL_FROM set → sent through the Resend HTTP API
 *   (https://resend.com, free tier is enough to start). No SDK needed.
 * - "console": development without a key → the e-mail (with the link) is printed in the
 *   server log, so the flows can be tested locally.
 * - "off": production without a key → nothing is sent and e-mail confirmation is not
 *   required (the app shows a warning to admins).
 *
 * Links always use APP_URL (never the request Host header, which an attacker could forge to
 * steal reset links). In development APP_URL defaults to http://localhost:3000.
 */

export type EmailMode = "resend" | "console" | "off";

export function emailMode(): EmailMode {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM && appUrl()) return "resend";
  return process.env.NODE_ENV === "production" ? "off" : "console";
}

/** E-mail confirmation is only required when the app can actually send (or log) e-mails. */
export function isEmailVerificationRequired() {
  return emailMode() !== "off";
}

export function appUrl(): string | null {
  const raw = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
  if (raw && /^https?:\/\/[^\s/]+/.test(raw)) return raw;
  return process.env.NODE_ENV === "production" ? null : "http://localhost:3000";
}

type Email = { to: string; subject: string; text: string; html: string };

export async function sendEmail(email: Email): Promise<boolean> {
  const mode = emailMode();
  if (mode === "off") return false;
  if (mode === "console") {
    console.info(`\n[email] to=${email.to}\n[email] subject=${email.subject}\n${email.text}\n`);
    return true;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
    });
    if (!response.ok) console.error(`[email] Resend error ${response.status}: ${await response.text()}`);
    return response.ok;
  } catch (error) {
    console.error("[email] send failed", error);
    return false;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const copy = {
  verify: {
    pt: { subject: "Confirme seu e-mail no EcoVerify", intro: "Olá, {name}! Confirme seu e-mail para proteger sua conta e poder receber FONE.", cta: "Confirmar e-mail", outro: "O link vale por 48 horas. Se você não criou uma conta no EcoVerify, ignore esta mensagem." },
    en: { subject: "Confirm your e-mail on EcoVerify", intro: "Hi, {name}! Confirm your e-mail to protect your account and be able to receive FONE.", cta: "Confirm e-mail", outro: "The link is valid for 48 hours. If you didn't create an EcoVerify account, ignore this message." },
    es: { subject: "Confirma tu correo en EcoVerify", intro: "¡Hola, {name}! Confirma tu correo para proteger tu cuenta y poder recibir FONE.", cta: "Confirmar correo", outro: "El enlace es válido por 48 horas. Si no creaste una cuenta en EcoVerify, ignora este mensaje." },
  },
  reset: {
    pt: { subject: "Redefinir sua senha do EcoVerify", intro: "Olá, {name}! Recebemos um pedido para redefinir sua senha.", cta: "Criar nova senha", outro: "O link vale por 1 hora e só pode ser usado uma vez. Se não foi você, ignore esta mensagem: sua senha continua a mesma." },
    en: { subject: "Reset your EcoVerify password", intro: "Hi, {name}! We received a request to reset your password.", cta: "Create new password", outro: "The link is valid for 1 hour and can be used only once. If it wasn't you, ignore this message: your password stays the same." },
    es: { subject: "Restablecer tu contraseña de EcoVerify", intro: "¡Hola, {name}! Recibimos una solicitud para restablecer tu contraseña.", cta: "Crear nueva contraseña", outro: "El enlace es válido por 1 hora y solo puede usarse una vez. Si no fuiste tú, ignora este mensaje: tu contraseña sigue igual." },
  },
} as const;

export function buildAccountEmail(kind: keyof typeof copy, lang: Lang, name: string, link: string, to: string): Email {
  const c = copy[kind][lang] ?? copy[kind].pt;
  const intro = c.intro.replace("{name}", name);
  return {
    to,
    subject: c.subject,
    text: `${intro}\n\n${c.cta}: ${link}\n\n${c.outro}\n\nEcoVerify`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0f172a">
<h2 style="color:#047857">EcoVerify</h2>
<p>${escapeHtml(intro)}</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#059669;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">${escapeHtml(c.cta)}</a></p>
<p style="font-size:12px;color:#64748b">${escapeHtml(c.outro)}</p>
<p style="font-size:12px;color:#64748b;word-break:break-all">${escapeHtml(link)}</p>
</div>`,
  };
}
