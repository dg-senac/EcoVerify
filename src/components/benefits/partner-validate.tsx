"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Lock, Store, XCircle } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { BENEFIT_TEXT, formatRedemptionCode, normalizeRedemptionCode, type ValidateError } from "@/lib/benefits";
import { LogoHorizontal } from "@/components/logo";

type ValidateResult = { error?: ValidateError | "invalid" | "too_many"; firstName?: string };

/**
 * The shop's validation page (/parceiro/<token>): no account, only the secret link. Shows the
 * offer's numbers and marks a customer's code as used. The partner only sees first names.
 */
export function PartnerValidateView({
  lang,
  partnerName,
  offerTitle,
  isActive,
  generated,
  used,
  recent,
  onValidate,
}: {
  lang: Lang;
  partnerName: string;
  offerTitle: string;
  isActive: boolean;
  generated: number;
  used: number;
  recent: { code: string; firstName: string; usedAt: string }[];
  onValidate: (code: string) => Promise<ValidateResult>;
}) {
  const text = BENEFIT_TEXT[lang];
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-slate-100 px-4 py-8" data-testid="partner-page">
      <div className="mx-auto grid max-w-md gap-5">
        <div className="flex justify-center">
          <LogoHorizontal height={32} />
        </div>
        <section className="rounded-3xl bg-white p-6 shadow-xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            <Store className="h-4 w-4" /> {partnerName}
          </p>
          <h1 className="mt-1 text-xl font-extrabold text-slate-900">{offerTitle}</h1>
          <p className="mt-1 text-sm font-semibold text-emerald-700" data-testid="partner-stats">
            {text.partnerStats(generated, used)}
          </p>

          {!isActive ? (
            <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{text.partnerInactive}</p>
          ) : (
            <form
              className="mt-5 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const clean = normalizeRedemptionCode(code);
                start(async () => {
                  const r = await onValidate(clean);
                  if (r.error) setResult({ ok: false, message: text.errors[r.error] ?? text.errors.invalid });
                  else {
                    setResult({ ok: true, message: text.partnerOk(r.firstName ?? "") });
                    setCode("");
                  }
                });
              }}
            >
              <p className="text-sm text-slate-600">{text.partnerSubtitle}</p>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                {text.partnerCodeLabel}
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCD-2345"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={12}
                  required
                  className="rounded-xl border border-slate-200 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.2em] text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  data-testid="partner-code"
                />
              </label>
              <button
                type="submit"
                disabled={pending || normalizeRedemptionCode(code).length < 8}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
                data-testid="partner-validate"
              >
                {text.partnerValidate}
              </button>
              {result && (
                <p
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
                  data-testid={result.ok ? "partner-ok" : "partner-error"}
                >
                  {result.ok ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />} {result.message}
                </p>
              )}
            </form>
          )}
        </section>

        {recent.length > 0 && (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">{text.partnerRecent}</h2>
            <ul className="mt-2 divide-y divide-slate-100 text-sm" data-testid="partner-recent">
              {recent.map((r) => (
                <li key={r.code} className="flex items-center justify-between gap-2 py-2">
                  <span className="font-mono text-slate-500">{formatRedemptionCode(r.code)}</span>
                  <span className="font-semibold text-slate-800">{r.firstName}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(r.usedAt).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="flex items-start gap-2 px-2 text-xs text-slate-500">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {text.partnerPrivacy}
        </p>
      </div>
    </div>
  );
}
