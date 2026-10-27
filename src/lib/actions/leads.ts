"use server";

import { headers } from "next/headers";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { salesConfig } from "@/lib/saas/sales-config";
import { cleanLead, type LeadInput } from "@/lib/saas/lead-input";
import type { Lang } from "@/lib/i18n";

export type LeadResult = { error?: string; success?: boolean };

/** Public contact form (landing page). Stored for Admin → Negócios and e-mailed to SALES_EMAIL. */
export async function submitLeadAction(input: LeadInput, lang: Lang = "pt"): Promise<LeadResult> {
  if (input.website) return { success: true }; // honeypot: pretend it worked
  const lead = cleanLead(input);
  if (!lead) return { error: "invalid" };
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
  if (!rateLimit(`lead:${ip}`, 5, 60 * 60 * 1000)) return { error: "too_many_attempts" };

  const language = (["pt", "en", "es"] as const).find((l) => l === lang) ?? "pt";
  await db.insert(leads).values({ ...lead, language });

  const { email } = salesConfig();
  if (email) {
    const user = await getCurrentUser();
    const lines = [
      `Nome: ${lead.name}`,
      `E-mail: ${lead.email}`,
      `Organização: ${lead.organization} (${lead.type})`,
      `Plano: ${lead.plan ?? "-"}`,
      user ? `Conta EcoVerify: ${user.email}` : null,
      "",
      lead.message ?? "",
    ].filter((l) => l !== null);
    const text = lines.join("\n");
    await sendEmail({
      to: email,
      subject: `[EcoVerify] Novo contato: ${lead.organization}`,
      text,
      html: `<pre style="font-family:inherit;white-space:pre-wrap">${text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</pre>`,
    }).catch((error) => console.error("[lead] e-mail", error));
  }
  return { success: true };
}
