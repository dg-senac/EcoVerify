"use client";

import { useActionState, useEffect, useRef } from "react";
import { createSponsorAction, updateSponsorAction, type AdminActionState } from "@/lib/actions/admin";

const initialState: AdminActionState = {};

export type SponsorItem = {
  id: string;
  name: string;
  website: string | null;
  isActive: boolean;
  budgetFone: string;
  spentFone: string;
  paidFone: string;
  remainingFone: string;
};

const input =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

function SponsorRow({ sponsor }: { sponsor: SponsorItem }) {
  const [state, formAction, pending] = useActionState(updateSponsorAction, initialState);
  const budget = Number(sponsor.budgetFone);
  const usedPercent = budget > 0 ? Math.min(100, Math.round((Number(sponsor.spentFone) / budget) * 100)) : 100;
  return (
    <li className="space-y-2 border-t border-black/5 pt-3" data-testid="sponsor-row">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-slate-800">
          {sponsor.name} {!sponsor.isActive && <span className="text-xs font-normal text-slate-400">(inativo)</span>}
        </p>
        <p className="text-xs text-slate-500" data-testid="sponsor-balance">
          Restam <b className="text-slate-800">{sponsor.remainingFone}</b> de {sponsor.budgetFone} FONE · pago {sponsor.paidFone}
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${usedPercent >= 90 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${usedPercent}%` }} />
      </div>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="sponsorId" value={sponsor.id} />
        <input name="amount" inputMode="decimal" placeholder="+ FONE" className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
        <button type="submit" name="intent" value="topup" disabled={pending} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
          Recarregar
        </button>
        <button type="submit" name="intent" value="toggle" disabled={pending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
          {sponsor.isActive ? "Desativar" : "Ativar"}
        </button>
        {state.error && <span className="text-xs text-red-500">Valor inválido.</span>}
      </form>
    </li>
  );
}

/** Sponsors fund missions with their own FONE budget (deposited in the EcoVerify treasury). */
export function SponsorsPanel({ sponsors }: { sponsors: SponsorItem[] }) {
  const [state, formAction, pending] = useActionState(createSponsorAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" data-testid="sponsors-panel">
      <h3 className="font-bold text-slate-900">🤝 Patrocinadores</h3>
      <p className="mt-1 text-sm text-slate-500">
        Empresas, prefeituras ou ONGs que bancam missões com FONE próprio. Registre aqui o valor que o patrocinador depositou na
        carteira de recompensas; o FONE das missões dele sai desse orçamento e, quando acaba, as recompensas ficam em espera até uma
        recarga. Saldo e pagamentos aparecem na página pública de transparência.
      </p>
      <form ref={formRef} action={formAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_8rem_auto]">
        <input name="name" required maxLength={80} placeholder="Nome (ex.: Prefeitura do Recife)" className={input} />
        <input name="website" placeholder="Site (opcional)" className={input} />
        <input name="budgetFone" required inputMode="decimal" placeholder="Orçamento FONE" className={input} />
        <button type="submit" disabled={pending} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-70">
          Adicionar
        </button>
      </form>
      {state.error && <p className="mt-1 text-xs text-red-500">Confira o nome, o site e o orçamento.</p>}
      {sponsors.length > 0 && (
        <ul className="mt-3 space-y-3">
          {sponsors.map((sponsor) => (
            <SponsorRow key={sponsor.id} sponsor={sponsor} />
          ))}
        </ul>
      )}
    </div>
  );
}
