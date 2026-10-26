import { PayoutRow, type PayoutGroup } from "@/components/admin/payout-row";
import { explorerTxUrl, shortHex } from "@/lib/fone";
import { FoneAmount, FoneMark } from "@/components/brand/fone";

export type PaidBatch = {
  txHash: string | null;
  userName: string;
  wallet: string | null;
  totalFone: string;
  count: number;
  paidAt: string | null;
};

export function RewardsTab({
  groups,
  paid,
  explorerUrl,
}: {
  groups: PayoutGroup[];
  paid: PaidBatch[];
  explorerUrl?: string;
}) {
  const payable = groups.filter((g) => g.wallet);
  const waiting = groups.filter((g) => !g.wallet);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900">Pagamentos em FONE a fazer</h3>
        <p className="mb-3 mt-1 text-xs text-slate-500">
          Envie o total de cada pessoa da carteira de recompensas para a carteira verificada dela (Fone Wallet) e cole o
          hash da transação. Um envio por pessoa paga todas as recompensas listadas.
        </p>
        {payable.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Nada a pagar para carteiras verificadas.</p>
        ) : (
          <div className="space-y-2">
            {payable.map((group) => (
              <PayoutRow key={group.userId} group={group} explorerUrl={explorerUrl} />
            ))}
          </div>
        )}
      </div>

      {waiting.length > 0 && (
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-bold text-slate-900">Aguardando carteira verificada</h3>
          <div className="space-y-2">
            {waiting.map((group) => (
              <PayoutRow key={group.userId} group={group} explorerUrl={explorerUrl} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-bold text-slate-900">Pagos recentemente</h3>
        {paid.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Nenhum pagamento registrado ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {paid.map((batch) => (
              <li key={`${batch.txHash}-${batch.userName}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="font-semibold text-slate-800">{batch.userName}</span>
                <span className="font-bold text-emerald-700">
                  <FoneAmount amount={batch.totalFone} size={14} /> <span className="text-xs font-normal text-slate-400">({batch.count})</span>
                </span>
                <span className="text-xs text-slate-500">
                  {batch.paidAt ? new Date(batch.paidAt).toLocaleString("pt-BR") : "—"}
                  {batch.wallet ? ` → ${shortHex(batch.wallet)}` : ""}
                </span>
                {batch.txHash ? (
                  <a
                    href={explorerTxUrl(batch.txHash, explorerUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-teal-700 hover:underline"
                  >
                    {shortHex(batch.txHash)} ↗
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">sem hash</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
