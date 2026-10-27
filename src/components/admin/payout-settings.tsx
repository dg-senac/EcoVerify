"use client";

import { useActionState } from "react";
import { releaseHeldRewardsAction, updateFoneSettingsAction, type AdminActionState } from "@/lib/actions/admin";
import type { HoldReason, PayoutSettings } from "@/lib/payout-rules";

const initialState: AdminActionState = {};

const input =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const HOLD_LABELS: Record<HoldReason, { title: string; hint: string }> = {
  budget: { title: "Orçamento do mês", hint: "Libere no mês seguinte ou depois de aumentar o orçamento / depositar na carteira." },
  user_cap: { title: "Limite por pessoa", hint: "Alguém passou do limite mensal: confira se não é conta duplicada antes de liberar." },
  sponsor_budget: { title: "Orçamento de patrocinador", hint: "Libere depois que o patrocinador recarregar o orçamento (Missões → Patrocinadores)." },
};

export function PayoutSettingsForm({ settings }: { settings: PayoutSettings }) {
  const [state, formAction, pending] = useActionState(updateFoneSettingsAction, initialState);
  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-black/5 bg-white p-5 shadow-sm" data-testid="payout-settings">
      <div>
        <h3 className="font-bold text-slate-900">Regras de pagamento</h3>
        <p className="mt-1 text-xs text-slate-500">
          Protegem a carteira de recompensas: pontos nunca são afetados, só quando e quanto FONE sai.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold text-slate-700">Pagamento mínimo (FONE)</span>
          <input name="minPayoutFone" inputMode="decimal" defaultValue={settings.minPayoutFone.toFixed(2)} className={input} required />
          <span className="mt-1 block text-xs text-slate-500">Cada envio custa ≈0,15 FONE de taxa; juntar recompensas evita desperdício.</span>
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-slate-700">Carência (dias)</span>
          <input name="holdDays" type="number" min={0} max={90} defaultValue={settings.holdDays} className={input} required />
          <span className="mt-1 block text-xs text-slate-500">Tempo para contestações e detectar fraude antes do FONE sair.</span>
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-slate-700">Orçamento mensal da tesouraria (FONE)</span>
          <input name="monthlyBudgetFone" inputMode="decimal" defaultValue={settings.monthlyBudgetFone?.toFixed(2) ?? ""} placeholder="Sem limite" className={input} />
          <span className="mt-1 block text-xs text-slate-500">Missões patrocinadas usam o orçamento do patrocinador.</span>
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-slate-700">Limite por pessoa por mês (FONE)</span>
          <input name="maxFonePerUserMonth" inputMode="decimal" defaultValue={settings.maxFonePerUserMonth?.toFixed(2) ?? ""} placeholder="Sem limite" className={input} />
          <span className="mt-1 block text-xs text-slate-500">Dificulta farm com várias contas; o excedente fica em espera.</span>
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-70">
          {pending ? "Salvando…" : "Salvar regras"}
        </button>
        {state.success && <span className="text-sm text-emerald-700">Regras salvas.</span>}
        {state.error && <span className="text-sm text-red-500">Confira os valores (números ≥ 0; carência de 0 a 90 dias).</span>}
      </div>
    </form>
  );
}

export function HeldRewardRow({ reason, fone, count }: { reason: HoldReason; fone: string; count: number }) {
  const [state, formAction, pending] = useActionState(releaseHeldRewardsAction, initialState);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2" data-testid={`held-${reason}`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">
          {HOLD_LABELS[reason].title}: {fone} FONE <span className="font-normal text-slate-500">({count})</span>
        </p>
        <p className="text-xs text-slate-500">{HOLD_LABELS[reason].hint}</p>
      </div>
      <form action={formAction}>
        <input type="hidden" name="reason" value={reason} />
        <button type="submit" disabled={pending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
          {pending ? "Liberando…" : "Liberar"}
        </button>
        {state.error && <span className="ml-2 text-xs text-red-500">Erro</span>}
      </form>
    </li>
  );
}
