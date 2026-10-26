"use client";

import { useActionState, useState } from "react";
import { confirmWalletAction, rejectWalletAction, type AdminActionState } from "@/lib/actions/admin";
import { explorerAddressUrl, explorerTxUrl, shortHex } from "@/lib/fone";

const initialState: AdminActionState = {};

const errors: Record<string, string> = {
  invalid_tx: "Hash inválido: precisa ter 64 caracteres hexadecimais.",
  tx_in_use: "Este hash já foi usado em outra verificação ou pagamento.",
  wallet_in_use: "Esta carteira já está verificada em outra conta.",
  no_request: "Este pedido não existe mais (cancelado ou já resolvido).",
  reason_required: "Informe o motivo (mínimo 5 caracteres).",
};

export type PendingWallet = {
  id: string;
  name: string;
  email: string;
  address: string;
  amount: string;
  requestedAt: Date;
  expired: boolean;
  reportedTx: string | null;
  currentWallet: string | null;
};

export function WalletReviewRow({
  item,
  treasury,
  explorerUrl,
}: {
  item: PendingWallet;
  treasury: string | null;
  explorerUrl?: string;
}) {
  const [confirmState, confirmAction, confirming] = useActionState(confirmWalletAction, initialState);
  const [rejectState, rejectAction, rejecting] = useActionState(rejectWalletAction, initialState);
  const [rejectOpen, setRejectOpen] = useState(false);
  const expired = item.expired;
  const error = confirmState.error ?? rejectState.error;

  return (
    <div className="space-y-3 rounded-xl border border-black/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800">{item.name}</p>
          <p className="text-xs text-slate-500">{item.email}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-emerald-700">{item.amount} FONE</p>
          <p className={`text-xs ${expired ? "font-bold text-amber-600" : "text-slate-500"}`}>
            pedido em {new Date(item.requestedAt).toLocaleString("pt-BR")}
            {expired ? " · expirado" : ""}
          </p>
        </div>
      </div>

      <dl className="grid gap-1 text-xs text-slate-600 sm:grid-cols-[auto_1fr] sm:gap-x-3">
        <dt className="font-semibold">De (carteira do usuário)</dt>
        <dd>
          <a href={explorerAddressUrl(item.address, explorerUrl)} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-teal-700 hover:underline">
            {item.address} ↗
          </a>
        </dd>
        <dt className="font-semibold">Para (verificação)</dt>
        <dd className="break-all font-mono">{treasury ?? "FONE_TREASURY_ADDRESS não configurado"}</dd>
        <dt className="font-semibold">Hash informado</dt>
        <dd>
          {item.reportedTx ? (
            <a href={explorerTxUrl(item.reportedTx, explorerUrl)} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-teal-700 hover:underline">
              {item.reportedTx} ↗
            </a>
          ) : (
            <span className="text-slate-400">ainda não informado</span>
          )}
        </dd>
        {item.currentWallet && (
          <>
            <dt className="font-semibold">Carteira atual</dt>
            <dd className="font-mono">{shortHex(item.currentWallet)} (continua valendo até confirmar)</dd>
          </>
        )}
      </dl>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        Confira no explorer: uma transferência <b>saindo de {shortHex(item.address)}</b> para o endereço de verificação,
        de <b>exatamente {item.amount} FONE</b>, feita depois da data do pedido.
      </p>

      <form action={confirmAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="userId" value={item.id} />
        <input
          type="text"
          name="txHash"
          required
          defaultValue={item.reportedTx ?? ""}
          placeholder="Hash da transação de verificação"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 font-mono text-xs text-slate-600"
        />
        <button
          type="submit"
          disabled={confirming}
          className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-70"
        >
          ✅ Confirmar carteira
        </button>
        <button
          type="button"
          onClick={() => setRejectOpen((open) => !open)}
          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
        >
          Recusar
        </button>
      </form>

      {rejectOpen && (
        <form action={rejectAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="userId" value={item.id} />
          <input
            type="text"
            name="reason"
            required
            minLength={5}
            maxLength={300}
            placeholder="Motivo (ex.: nenhuma transferência com esse valor)"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-600"
          />
          <button type="submit" disabled={rejecting} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-70">
            Confirmar recusa
          </button>
        </form>
      )}

      {error && <p className="text-xs font-medium text-red-500">{errors[error] ?? "Não foi possível salvar."}</p>}
    </div>
  );
}
