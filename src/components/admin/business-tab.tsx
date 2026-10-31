"use client";

import { useState, useTransition } from "react";
import { formatBRL, PLAN_ORDER, type PlanId } from "@/lib/plans";
import { PLAN_TEXT } from "@/lib/saas/plan-text";
import { EVENT_PACKAGE_NAMES, isEventPackage } from "@/lib/saas/events";

const PLAN_NAMES = PLAN_TEXT.pt.planNames;
const STATUS_LABEL: Record<string, string> = { trialing: "Teste", active: "Ativo", past_due: "Vencido", canceled: "Cancelado" };

export interface BusinessData {
  mrrCents: number;
  receivedMonthCents: number;
  receivedTotalCents: number;
  /** Service fees of sponsored campaigns (BRL cents). */
  campaignFeesMonthCents: number;
  campaignFeesTotalCents: number;
  /** One-off events paid by Pix (BRL cents); receivedMonth/Total are plans only. */
  eventsMonthCents?: number;
  eventsTotalCents?: number;
  eventsPaidCount?: number;
  payingOrgs: number;
  trialOrgs: number;
  totalOrgs: number;
  pendingInvoices: {
    id: string;
    orgName: string;
    orgSlug: string;
    plan: PlanId;
    cycle: "monthly" | "yearly";
    amountCents: number;
    reference: string;
    reportedAt: string | null;
    createdAt: string;
    kind?: "plan" | "event";
    eventPackage?: string | null;
    eventTitle?: string | null;
  }[];
  orgs: {
    id: string;
    name: string;
    slug: string;
    type: string;
    plan: PlanId;
    effectivePlan: PlanId;
    status: string;
    periodEnd: string | null;
    members: number;
    ownerEmail: string | null;
  }[];
}

type Result = { error?: string; success?: boolean };
/** Server actions in the web app, local functions in the offline demo. */
export interface BusinessActions {
  confirmInvoice: (invoiceId: string) => Promise<Result>;
  grantPlan: (orgId: string, plan: string, months: number) => Promise<Result>;
}

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

export function BusinessTab({ data, actions }: { data: BusinessData; actions: BusinessActions }) {
  return (
    <div className="grid gap-6" data-testid="business-tab">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Receita recorrente (MRR)", value: formatBRL(data.mrrCents), hint: "planos ativos, anual ÷ 12" },
          {
            label: "Recebido este mês",
            value: formatBRL(data.receivedMonthCents + (data.eventsMonthCents ?? 0) + data.campaignFeesMonthCents),
            hint: `planos ${formatBRL(data.receivedMonthCents)} · eventos ${formatBRL(data.eventsMonthCents ?? 0)} · campanhas ${formatBRL(data.campaignFeesMonthCents)} · total ${formatBRL(data.receivedTotalCents + (data.eventsTotalCents ?? 0) + data.campaignFeesTotalCents)}`,
          },
          { label: "Organizações pagantes", value: String(data.payingOrgs), hint: `${data.totalOrgs} no total` },
          { label: "Em teste grátis", value: String(data.trialOrgs), hint: "potenciais clientes" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-400">{card.hint}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">💰 Pix aguardando confirmação</h2>
        <p className="mt-1 text-xs text-slate-500">
          Confira no extrato do banco se entrou um Pix com o valor e a referência abaixo, depois confirme. O plano (ou o evento avulso) é liberado na hora.
        </p>
        {data.pendingInvoices.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nenhuma cobrança em aberto.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100" data-testid="pending-invoices">
            {data.pendingInvoices.map((inv) => (
              <InvoiceRow key={inv.id} invoice={inv} onConfirm={actions.confirmInvoice} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">🏫 Organizações</h2>
        {data.orgs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nenhuma organização criada ainda.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm" data-testid="org-table">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="py-2">Nome</th>
                  <th>Plano</th>
                  <th>Situação</th>
                  <th>Vence</th>
                  <th>Pessoas</th>
                  <th>Plano manual</th>
                </tr>
              </thead>
              <tbody>
                {data.orgs.map((org) => (
                  <tr key={org.id} className="border-t border-slate-100 align-middle">
                    <td className="py-2.5">
                      <a href={`/o/${org.slug}`} className="font-semibold text-slate-800 hover:text-emerald-700">
                        {org.name}
                      </a>
                      <p className="text-xs text-slate-400">{org.ownerEmail}</p>
                    </td>
                    <td>{PLAN_NAMES[org.effectivePlan]}</td>
                    <td>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {org.plan !== "free" && org.effectivePlan === "free" ? "Vencido" : (STATUS_LABEL[org.status] ?? org.status)}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">{fmtDate(org.periodEnd)}</td>
                    <td>{org.members}</td>
                    <td>
                      <GrantPlan orgId={org.id} current={org.plan} onGrant={actions.grantPlan} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}

function InvoiceRow({ invoice, onConfirm }: { invoice: BusinessData["pendingInvoices"][number]; onConfirm: BusinessActions["confirmInvoice"] }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800">
          {invoice.orgName} ·{" "}
          {invoice.kind === "event" ? (
            <span data-testid="invoice-event">
              🎪 {isEventPackage(invoice.eventPackage) ? EVENT_PACKAGE_NAMES[invoice.eventPackage].pt : "Evento"}
              {invoice.eventTitle ? ` · ${invoice.eventTitle}` : ""}
            </span>
          ) : (
            <>
              {PLAN_NAMES[invoice.plan]} {invoice.cycle === "yearly" ? "anual" : "mensal"}
            </>
          )}
        </p>
        <p className="text-xs text-slate-500">
          ref. <span className="font-mono font-bold text-slate-700">{invoice.reference}</span> · gerado em {fmtDate(invoice.createdAt)}
          {invoice.reportedAt ? ` · cliente disse que pagou em ${fmtDate(invoice.reportedAt)}` : " · aguardando o cliente"}
        </p>
      </div>
      <span className="text-lg font-extrabold text-slate-900">{formatBRL(invoice.amountCents)}</span>
      {message ? (
        <span className="text-sm font-semibold text-emerald-700">{message}</span>
      ) : (
        <button
          type="button"
          disabled={pending}
          data-testid="confirm-invoice"
          onClick={() => {
            if (!window.confirm(`Confirmar que ${formatBRL(invoice.amountCents)} (ref. ${invoice.reference}) entrou na sua conta?`)) return;
            start(async () => {
              const result = await onConfirm(invoice.id);
              setMessage(result.success ? "Confirmado ✓" : "Não foi possível confirmar");
            });
          }}
          className={`rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${invoice.reportedAt ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-400 hover:bg-slate-500"}`}
        >
          Confirmar recebimento
        </button>
      )}
    </li>
  );
}

function GrantPlan({ orgId, current, onGrant }: { orgId: string; current: PlanId; onGrant: BusinessActions["grantPlan"] }) {
  const [plan, setPlan] = useState<PlanId>(current);
  const [months, setMonths] = useState(12);
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <select value={plan} onChange={(e) => setPlan(e.target.value as PlanId)} className="rounded-lg border border-slate-200 px-1.5 py-1 text-xs">
        {PLAN_ORDER.map((p) => (
          <option key={p} value={p}>
            {PLAN_NAMES[p]}
          </option>
        ))}
      </select>
      {plan !== "free" && (
        <input
          type="number"
          min={1}
          max={36}
          value={months}
          onChange={(e) => setMonths(Number(e.target.value) || 1)}
          className="w-14 rounded-lg border border-slate-200 px-1.5 py-1 text-xs"
          aria-label="meses"
        />
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await onGrant(orgId, plan, plan === "free" ? 0 : months);
            setDone(!!result.success);
          })
        }
        className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-white disabled:opacity-60"
      >
        {done ? "✓" : "Aplicar"}
      </button>
    </div>
  );
}
