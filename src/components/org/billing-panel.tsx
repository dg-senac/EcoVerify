"use client";

import { useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import { CalendarClock, Check, Copy, Crown, MessageCircle } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { MARKETING_TEXT } from "@/lib/marketing-text";
import { PAID_PLANS, PLANS, daysLeft, formatBRL, type BillingCycle, type PlanId, type SubscriptionStatus } from "@/lib/plans";

export interface BillingInvoice {
  id: string;
  plan: PlanId;
  billingCycle: BillingCycle;
  amountCents: number;
  status: "pending" | "paid" | "canceled";
  reference: string;
  reportedAt: string | null;
  createdAt: string;
  paidAt: string | null;
  /** Pix copy-and-paste code (pending invoices only). */
  pixPayload?: string | null;
}

type Result = { error?: string; success?: boolean };

/**
 * Plan & billing tab of an organization. The actions are server actions in the web app and
 * local functions in the offline demo.
 */
export function BillingPanel({
  lang,
  orgId,
  isOwner,
  plan,
  effectivePlan,
  status,
  periodEnd,
  invoices,
  pixAvailable,
  contactUrl,
  onCreate,
  onReport,
  onCancel,
}: {
  lang: Lang;
  orgId: string;
  isOwner: boolean;
  plan: PlanId;
  effectivePlan: PlanId;
  status: SubscriptionStatus;
  periodEnd: string | null;
  invoices: BillingInvoice[];
  pixAvailable: boolean;
  contactUrl: string;
  onCreate: (orgId: string, plan: PlanId, cycle: BillingCycle) => Promise<Result>;
  onReport: (invoiceId: string) => Promise<Result>;
  onCancel: (invoiceId: string) => Promise<Result>;
}) {
  const text = ORG_TEXT[lang];
  const mk = MARKETING_TEXT[lang];
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const [choice, setChoice] = useState<PlanId>(PAID_PLANS.includes(plan) ? plan : "school");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pendingInvoice = invoices.find((i) => i.status === "pending") ?? null;
  const left = daysLeft(periodEnd);
  const expired = plan !== "free" && effectivePlan === "free";

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const result = await fn();
      setError(result.error ? (text.errors[result.error] ?? text.errors.invalid) : null);
    });

  return (
    <div className="grid gap-5" data-testid="billing-panel">
      {/* Current plan */}
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{text.currentPlan}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h3 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900" data-testid="billing-plan">
            <Crown className="h-6 w-6 text-amber-500" /> {mk.planNames[effectivePlan]}
          </h3>
          {plan !== "free" && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                expired ? "bg-red-50 text-red-700" : status === "trialing" ? "bg-sky-50 text-sky-700" : "bg-emerald-50 text-emerald-700"
              }`}
              data-testid="billing-status"
            >
              {expired ? text.statusLabels.past_due : text.statusLabels[status]}
            </span>
          )}
        </div>
        {plan !== "free" && periodEnd && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
            <CalendarClock className="h-4 w-4" />
            {status === "trialing" ? text.trialEnds(left ?? 0) : text.periodEnds(new Date(periodEnd).toLocaleDateString(locale))}
          </p>
        )}
        {expired && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{text.expiredNote}</p>}
        <p className="mt-2 text-sm text-slate-500">
          {mk.members(PLANS[effectivePlan].maxMembers)} · {mk.missions(PLANS[effectivePlan].maxActiveMissions)}
        </p>
      </div>

      {!isOwner ? (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{text.ownerOnly}</p>
      ) : pendingInvoice ? (
        <PixBox
          lang={lang}
          invoice={pendingInvoice}
          pending={pending}
          onReport={() => run(() => onReport(pendingInvoice.id))}
          onCancel={() => run(() => onCancel(pendingInvoice.id))}
        />
      ) : (
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">{text.upgradeTitle}</h3>
          <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold ${cycle === c ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}
              >
                {c === "monthly" ? mk.monthly : `${mk.yearly} · ${mk.yearlyBadge}`}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {PAID_PLANS.map((id) => {
              const price = cycle === "monthly" ? PLANS[id].monthlyCents! : PLANS[id].yearlyCents!;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChoice(id)}
                  data-testid={`billing-choose-${id}`}
                  className={`rounded-2xl border p-4 text-left transition ${choice === id ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{mk.planNames[id]}</span>
                    {choice === id && <Check className="h-4 w-4 text-emerald-600" />}
                  </span>
                  <span className="mt-1 block text-xl font-extrabold text-slate-900">
                    {formatBRL(price, lang)}
                    <span className="text-sm font-semibold text-slate-400">{cycle === "monthly" ? mk.perMonth : mk.perYear}</span>
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">{mk.members(PLANS[id].maxMembers)}</span>
                </button>
              );
            })}
          </div>
          {pixAvailable ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => onCreate(orgId, choice, cycle))}
              data-testid="billing-generate-pix"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-60"
            >
              <PixIcon /> {text.generatePix}
            </button>
          ) : (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>{text.pixNotConfigured}</p>
              <a href={contactUrl} className="mt-2 inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:underline">
                <MessageCircle className="h-4 w-4" /> {text.talkToUs}
              </a>
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500">{text.downgradeNote}</p>
          <p className="mt-1 text-xs text-slate-500">
            {mk.planNames.government}: <a href={contactUrl} className="font-semibold text-emerald-700 hover:underline">{text.talkToUs}</a>
          </p>
        </div>
      )}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {/* History */}
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900">{text.invoices}</h3>
        {invoices.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">{text.noInvoices}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100" data-testid="invoice-list">
            {invoices.map((invoice) => (
              <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="font-semibold text-slate-800">
                  {mk.planNames[invoice.plan]} · {invoice.billingCycle === "monthly" ? mk.monthly : mk.yearly}
                </span>
                <span className="font-mono text-xs text-slate-400">{invoice.reference}</span>
                <span className="font-bold text-slate-900">{formatBRL(invoice.amountCents, lang)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    invoice.status === "paid" ? "bg-emerald-50 text-emerald-700" : invoice.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {text.invoiceStatus[invoice.status]}
                </span>
                <span className="text-xs text-slate-400">{new Date(invoice.paidAt ?? invoice.createdAt).toLocaleDateString(locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PixBox({
  lang,
  invoice,
  pending,
  onReport,
  onCancel,
}: {
  lang: Lang;
  invoice: BillingInvoice;
  pending: boolean;
  onReport: () => void;
  onCancel: () => void;
}) {
  const text = ORG_TEXT[lang];
  const mk = MARKETING_TEXT[lang];
  const [svg, setSvg] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const payload = invoice.pixPayload ?? "";

  useEffect(() => {
    let alive = true;
    if (payload) QRCode.toString(payload, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then((value) => alive && setSvg(value));
    return () => {
      alive = false;
    };
  }, [payload]);

  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-white p-5 shadow-sm" data-testid="pix-box">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
          <PixIcon /> {text.pixTitle}
        </h3>
        <span className="text-2xl font-extrabold text-slate-900" data-testid="pix-amount">
          {formatBRL(invoice.amountCents, lang)}
        </span>
      </div>
      <p className="text-sm text-slate-500">
        {mk.planNames[invoice.plan]} · {invoice.billingCycle === "monthly" ? mk.monthly : mk.yearly} · ref. <span className="font-mono">{invoice.reference}</span>
      </p>
      <div className="mt-4 grid items-start gap-5 sm:grid-cols-[200px_1fr]">
        <div className="mx-auto aspect-square w-[200px] rounded-xl bg-white p-2 ring-1 ring-slate-200 [&_svg]:h-full [&_svg]:w-full" data-testid="pix-qr" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="grid gap-3">
          <p className="text-sm text-slate-600">{text.pixHowTo}</p>
          <textarea readOnly value={payload} rows={3} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] text-slate-600" data-testid="pix-payload" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard?.writeText(payload).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? text.pixCopied : text.pixCopy}
            </button>
            {!invoice.reportedAt && (
              <button
                type="button"
                disabled={pending}
                onClick={onReport}
                data-testid="pix-paid"
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-50 disabled:opacity-60"
              >
                {text.iPaid}
              </button>
            )}
            <button type="button" disabled={pending} onClick={onCancel} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:text-red-600">
              {text.cancelInvoice}
            </button>
          </div>
          {invoice.reportedAt && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800" data-testid="pix-reported">
              {text.pixReported}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PixIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.2 16.6a2.9 2.9 0 0 1-2.1-.9l-3-3a.6.6 0 0 0-.8 0l-3 3a2.9 2.9 0 0 1-2.1.9h-.6l3.8 3.8a3 3 0 0 0 4.3 0l3.8-3.8h-.3ZM6.2 7.4c.8 0 1.6.3 2.1.9l3 3c.2.2.6.2.8 0l3-3c.6-.6 1.3-.9 2.1-.9h.4l-3.8-3.8a3 3 0 0 0-4.3 0L5.7 7.4h.5Zm14.2 2.5-2.3-2.3h-.9c-.5 0-1 .2-1.4.6l-3 3a1.4 1.4 0 0 1-2 0l-3-3c-.4-.4-.9-.6-1.4-.6H5.3L3.1 9.9a3 3 0 0 0 0 4.3l2.2 2.2h1.1c.5 0 1-.2 1.4-.6l3-3c.6-.5 1.5-.5 2 0l3 3c.4.4.9.6 1.4.6h.9l2.3-2.3a3 3 0 0 0 0-4.2Z"
      />
    </svg>
  );
}
