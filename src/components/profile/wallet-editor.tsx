"use client";

import { useActionState, useState, useTransition } from "react";
import { createWalletFromProfileAction, updateWalletFromProfileAction } from "@/lib/actions/wallet";
import type { ActionState } from "@/lib/actions/auth";

const initialState: ActionState = {};

export function WalletEditor({ walletAddress }: { walletAddress: string | null }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateWalletFromProfileAction, initialState);
  const [isPending, startTransition] = useTransition();

  if (!walletAddress && !editing) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-slate-400">Nenhuma carteira conectada ainda.</p>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => createWalletFromProfileAction())}
          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
        >
          ✨ Criar carteira
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          🔑 Importar
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="address"
          defaultValue={walletAddress ?? ""}
          placeholder="Cole o endereço da carteira"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={pending}
          onClick={() => setEditing(false)}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"
        >
          Cancelar
        </button>
        {state.error && (
          <p className="w-full text-xs font-medium text-red-500">
            {state.error === "wallet_in_use" ? "Esta carteira já está vinculada a outra conta." : "Endereço inválido."}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="truncate rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600">{walletAddress}</code>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
      >
        Editar
      </button>
    </div>
  );
}
