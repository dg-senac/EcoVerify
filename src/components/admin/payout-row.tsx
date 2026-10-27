"use client";

import { useActionState, useState } from "react";
import {
  payUserRewardsAction,
  setRewardsStatusAction,
  type AdminActionState,
} from "@/lib/actions/admin";
import { explorerAddressUrl } from "@/lib/fone";
import { FoneAmount, FoneMark } from "@/components/brand/fone";
import { FONE_NETWORK_FEE, isReadyToPay } from "@/lib/payout-rules";

const initialState: AdminActionState = {};

const errors: Record<string, string> = {
  invalid_tx: "Hash inválido: precisa ter 64 caracteres hexadecimais.",
  tx_in_use: "Este hash já foi usado para outro usuário ou numa verificação de carteira.",
  wallet_not_verified: "O usuário não tem carteira verificada.",
  nothing_to_pay: "Essas recompensas já foram pagas ou mudaram. Atualize a página.",
  below_min: "O valor liberado ainda está abaixo do pagamento mínimo.",
  in_hold: "Essas recompensas ainda estão no período de carência.",
};

const statusLabels = { pending: "Pendente", processing: "Enviando", failed: "Falhou" } as const;

export type PayoutGroup = {
  userId: string;
  userName: string;
  wallet: string | null;
  totalFone: string;
  rewardIds: string[];
  statuses: ("pending" | "processing" | "failed")[];
  oldest: Date;
  /** Can be paid now (past the hold period, not held by a budget). rewardIds/statuses refer to these. */
  payableFone: string;
  /** Still in the hold period. */
  waitingFone: string;
  waitingCount: number;
  nextReleaseAt: Date | null;
  /** Held by the monthly budget, the personal cap or a sponsor budget. */
  heldFone: string;
  heldCount: number;
  belowMinimum: boolean;
  /** Share of the payment taken by the network fee (0.15 FONE). */
  feePercent: number | null;
  minPayoutFone: string;
};

export function PayoutRow({ group, explorerUrl }: { group: PayoutGroup; explorerUrl?: string }) {
  const [payState, payAction, paying] = useActionState(payUserRewardsAction, initialState);
  const [statusState, statusAction, updating] = useActionState(setRewardsStatusAction, initialState);
  const [copied, setCopied] = useState(false);
  const ids = group.rewardIds.join(",");
  const counts = group.statuses.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s]: (acc[s] ?? 0) + 1 }), {});
  const error = payState.error ?? statusState.error;

  return (
    <div className="space-y-3 rounded-xl border border-black/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">{group.userName}</p>
          <p className="text-xs text-slate-500">
            {group.rewardIds.length} liberada(s)
            {group.rewardIds.length > 0 &&
              ` (${Object.entries(counts)
                .map(([s, n]) => `${n} ${statusLabels[s as keyof typeof statusLabels].toLowerCase()}`)
                .join(", ")})`}{" "}
            · desde {new Date(group.oldest).toLocaleDateString("pt-BR")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-teal-700" data-testid="payout-payable">
            <FoneAmount amount={group.payableFone} size={20} />
          </p>
          {group.payableFone !== group.totalFone && <p className="text-[11px] text-slate-400">de {group.totalFone} FONE na fila</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
        {group.waitingCount > 0 && (
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-800" data-testid="payout-waiting">
            ⏳ {group.waitingFone} FONE em carência
            {group.nextReleaseAt ? ` · libera em ${new Date(group.nextReleaseAt).toLocaleDateString("pt-BR")}` : ""}
          </span>
        )}
        {group.heldCount > 0 && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800" data-testid="payout-held">
            ✋ {group.heldFone} FONE em espera (orçamento/limite)
          </span>
        )}
        {group.belowMinimum && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600" data-testid="payout-below-min">
            Abaixo do mínimo de {group.minPayoutFone} FONE
          </span>
        )}
        {group.feePercent !== null && !group.belowMinimum && (
          <span className={`rounded-full px-2 py-0.5 ${group.feePercent > 5 ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
            Taxa da rede ≈ {FONE_NETWORK_FEE.toFixed(2)} FONE ({group.feePercent}% do envio)
          </span>
        )}
      </div>

      {group.wallet ? (
        <>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <code className="min-w-0 flex-1 break-all text-xs text-slate-700 select-all">{group.wallet}</code>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard?.writeText(group.wallet!).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600"
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
            <a
              href={explorerAddressUrl(group.wallet, explorerUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs font-bold text-teal-700 hover:underline"
            >
              ↗
            </a>
          </div>
          {!isReadyToPay(group) ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {group.rewardIds.length === 0
                ? "Nada liberado para pagar agora: o FONE desta pessoa está em carência ou em espera."
                : `Pagamento bloqueado até o valor liberado chegar a ${group.minPayoutFone} FONE — assim a taxa da rede não come a recompensa.`}
            </p>
          ) : (
          <>
          <form action={payAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="userId" value={group.userId} />
            <input type="hidden" name="rewardIds" value={ids} />
            <input
              type="text"
              name="txHash"
              required
              spellCheck={false}
              placeholder={`Hash da transação de ${group.payableFone} FONE`}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 font-mono text-xs text-slate-600"
            />
            <button
              type="submit"
              disabled={paying}
              className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-70"
            >
              Marcar como pago
            </button>
          </form>
          <form action={statusAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="userId" value={group.userId} />
            <input type="hidden" name="rewardIds" value={ids} />
            <button
              type="submit"
              name="status"
              value="processing"
              disabled={updating}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Marcar &quot;enviando&quot;
            </button>
            <button
              type="submit"
              name="status"
              value="failed"
              disabled={updating}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Marcar &quot;falhou&quot;
            </button>
          </form>
          </>
          )}
        </>
      ) : (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          Aguardando carteira verificada: o FONE fica guardado na fila até o usuário verificar uma carteira.
        </p>
      )}

      {error && <p className="text-xs font-medium text-red-500">{errors[error] ?? "Não foi possível salvar."}</p>}
    </div>
  );
}
