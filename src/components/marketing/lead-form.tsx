"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { LEAD_TYPES, MARKETING_TEXT } from "@/lib/marketing-text";
import { PLAN_ORDER } from "@/lib/plans";
import type { LeadInput } from "@/lib/saas/lead-input";

const field =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";

/**
 * Contact form of the landing page. `onSubmit` is a server action in the web app and a local
 * function in the offline demo.
 */
export function LeadForm({
  lang,
  onSubmit,
  whatsappUrl,
  defaultPlan,
}: {
  lang: Lang;
  onSubmit: (input: LeadInput, lang: Lang) => Promise<{ error?: string; success?: boolean }>;
  whatsappUrl?: string | null;
  defaultPlan?: string | null;
}) {
  const text = MARKETING_TEXT[lang];
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus("sending");
    try {
      const result = await onSubmit(
        {
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          organization: String(data.get("organization") ?? ""),
          type: String(data.get("type") ?? ""),
          plan: String(data.get("plan") ?? "") || null,
          message: String(data.get("message") ?? ""),
          website: String(data.get("website") ?? ""),
        },
        lang,
      );
      setStatus(result.success ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center" data-testid="lead-sent">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <p className="text-lg font-bold text-slate-900">{text.contactSent}</p>
        {whatsappUrl && (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline">
            <MessageCircle className="h-4 w-4" /> {text.contactWhatsapp}
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4" data-testid="lead-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          {text.contactName}
          <input name="name" required maxLength={80} autoComplete="name" className={field} />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          {text.contactEmail}
          <input name="email" type="email" required maxLength={160} autoComplete="email" className={field} />
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        {text.contactOrg}
        <input name="organization" required maxLength={120} autoComplete="organization" className={field} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          {text.contactType}
          <select name="type" required defaultValue="school" className={field}>
            {LEAD_TYPES.map((type) => (
              <option key={type} value={type}>
                {text.contactTypes[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          {text.contactPlan}
          <select name="plan" defaultValue={defaultPlan ?? ""} className={field}>
            <option value="">—</option>
            {PLAN_ORDER.map((plan) => (
              <option key={plan} value={plan}>
                {text.planNames[plan]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        {text.contactMessage}
        <textarea name="message" rows={3} maxLength={2000} className={field} />
      </label>
      {/* Honeypot for bots: hidden from people and screen readers. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {status === "error" && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{text.contactError}</p>}
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 font-bold text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
      >
        <Send className="h-4 w-4" /> {text.contactSend}
      </button>
      {whatsappUrl && (
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-emerald-700 hover:underline">
          <MessageCircle className="h-4 w-4" /> {text.contactWhatsapp}
        </a>
      )}
    </form>
  );
}
