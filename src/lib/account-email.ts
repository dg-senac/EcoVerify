import { createAuthToken } from "@/lib/auth-tokens";
import { appUrl, buildAccountEmail, emailMode, sendEmail } from "@/lib/email";
import type { Lang } from "@/lib/i18n";

/** Sends the e-mail confirmation link (server-side only; never exposed as an action). */
export async function sendVerificationEmail(user: { id: string; name: string; email: string; language: Lang }) {
  const base = appUrl();
  if (!base || emailMode() === "off") return false;
  const token = await createAuthToken(user.id, "verify_email");
  return sendEmail(buildAccountEmail("verify", user.language, user.name, `${base}/verify-email?token=${token}`, user.email));
}
