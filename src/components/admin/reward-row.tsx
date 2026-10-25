"use client";

import { useActionState, useState } from "react";
import { updateRewardAction, type AdminActionState } from "@/lib/actions/admin";

const initialState: AdminActionState = {};
// FONE runs on its own mobile blockchain and has a BEP-20 bridge on BNB Smart Chain.
const networks = ["FONE", "BNB Smart Chain (BEP-20)"];

export function RewardRow({
  reward,
}: {
  reward: {
    id: string;
    userName: string;
    foneAmount: string;
    status: "pending" | "processing" | "paid" | "failed";
    network: string | null;
    txHash: string | null;
  };
}) {
  const [saved, setSaved] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: AdminActionState, formData: FormData) => {
      const result = await updateRewardAction(prev, formData);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
      return result;
    },
    initialState,
  );

  return (
    <form action={formAction} className="grid grid-cols-1 items-center gap-3 rounded-xl border border-black/5 p-4 lg:grid-cols-6">
      <input type="hidden" name="rewardId" value={reward.id} />
      <div className="lg:col-span-1">
        <p className="text-sm font-semibold text-slate-800">{reward.userName}</p>
        <p className="text-xs font-bold text-teal-700">🪙 {reward.foneAmount} FONE</p>
      </div>
      <select
        name="status"
        defaultValue={reward.status}
        className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600"
      >
        <option value="pending">Pendente</option>
        <option value="processing">Em processamento</option>
        <option value="paid">Pago</option>
        <option value="failed">Falhou</option>
      </select>
      <select
        name="network"
        defaultValue={reward.network && networks.includes(reward.network) ? reward.network : "FONE"}
        className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600"
      >
        {networks.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <input
        type="text"
        name="txHash"
        defaultValue={reward.txHash ?? ""}
        placeholder="Hash da transação"
        className="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-600 lg:col-span-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-70"
      >
        {pending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
        {saved ? "Salvo ✓" : "Salvar"}
      </button>
      {state.error && (
        <p className="text-xs font-medium text-red-500 lg:col-span-6">
          {state.error === "tx_hash_required"
            ? "Informe o hash da transação para marcar como pago."
            : "Não foi possível salvar. Verifique os dados."}
        </p>
      )}
    </form>
  );
}
