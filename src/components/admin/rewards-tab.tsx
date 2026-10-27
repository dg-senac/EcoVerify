import { PayoutRow, type PayoutGroup } from "@/components/admin/payout-row";
import { HeldRewardRow, PayoutSettingsForm } from "@/components/admin/payout-settings";
import { isReadyToPay, type HoldReason, type PayoutSettings } from "@/lib/payout-rules";
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
  settings,
  month,
  held,
}: {
  groups: PayoutGroup[];
  paid: PaidBatch[];
  explorerUrl?: string;
  settings: PayoutSettings;
  month: { treasuryFone: string; sponsoredFone: string };
  held: { reason: HoldReason; fone: string; count: number }[];
}) {
  const payable = groups.filter(isReadyToPay);
  const notYet = groups.filter((g) => g.wallet && !isReadyToPay(g));
  const waiting = groups.filter((g) => !g.wallet);
  const heldWithItems = held.filter((h) => h.count > 0);
  const payableTotal = payable.reduce((sum, g) => sum + Number(g.payableFone), 0);
  const used = Number(month.treasuryFone);
  const budget = settings.monthlyBudgetFone;
  const usedPercent = budget ? Math.min(100, Math.round((used / budget) * 100)) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3" data-testid="payout-summary">
        <div className="rounded-2xl border border-black/5 bg-white p-4">
          <p className="text-2xl font-bold text-slate-900">{payableTotal.toFixed(2)}</p>
          <p className="text-xs text-slate-500">FONE pronto para enviar agora ({payable.length} pessoa(s))</p>
        </div>
        <div
          className={`rounded-2xl border p-4 ${
            usedPercent === null ? "border-black/5 bg-white" : usedPercent >= 100 ? "border-red-200 bg-red-50" : usedPercent >= 80 ? "border-amber-200 bg-amber-50" : "border-black/5 bg-white"
          }`}
          data-testid="payout-budget"
        >
          <p className="text-2xl font-bold text-slate-900">
            {used.toFixed(2)}
            {budget !== null && <span className="text-base font-semibold text-slate-500"> / {budget.toFixed(2)}</span>}
          </p>
          <p className="text-xs text-slate-500">
            FONE da tesouraria comprometido este mês{budget === null ? " (sem orçamento definido)" : ` · ${usedPercent}% do orçamento`}
          </p>
          {usedPercent !== null && usedPercent >= 80 && (
            <p className="mt-1 text-xs font-semibold text-amber-800">
              {usedPercent >= 100 ? "Orçamento esgotado: novas recompensas ficam em espera." : "Atenção: o orçamento do mês está quase no fim."}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-4">
          <p className="text-2xl font-bold text-slate-900">{Number(month.sponsoredFone).toFixed(2)}</p>
          <p className="text-xs text-slate-500">FONE de patrocinadores comprometido este mês</p>
        </div>
      </div>
      <p className="rounded-xl bg-sky-50 px-4 py-3 text-xs text-sky-900">
        Antes de enviar, confira se a carteira de recompensas tem saldo para o total pronto + a taxa (≈0,15 FONE por envio) no{" "}
        explorador da Fone. Regras atuais: mínimo de {settings.minPayoutFone.toFixed(2)} FONE por envio e {settings.holdDays} dia(s) de carência.
      </p>

      {heldWithItems.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">FONE em espera</h3>
          <p className="mt-1 text-xs text-slate-500">
            Recompensas aprovadas que passaram de um orçamento ou limite. Os pontos já foram creditados; ao liberar, o FONE volta para a fila.
          </p>
          <ul className="mt-2 divide-y divide-slate-100">
            {heldWithItems.map((h) => (
              <HeldRewardRow key={h.reason} {...h} />
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900">Prontos para pagar</h3>
        <p className="mb-3 mt-1 text-xs text-slate-500">
          Envie o total de cada pessoa da carteira de recompensas para a carteira verificada dela (Fone Wallet) e cole o
          hash da transação. Um envio por pessoa paga todas as recompensas listadas.
        </p>
        {payable.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Nada pronto para pagar agora.</p>
        ) : (
          <div className="space-y-2">
            {payable.map((group) => (
              <PayoutRow key={group.userId} group={group} explorerUrl={explorerUrl} />
            ))}
          </div>
        )}
      </div>

      {notYet.length > 0 && (
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" data-testid="payout-not-yet">
          <h3 className="font-bold text-slate-900">Ainda não liberados</h3>
          <p className="mb-3 mt-1 text-xs text-slate-500">Em carência, em espera ou abaixo do pagamento mínimo.</p>
          <div className="space-y-2">
            {notYet.map((group) => (
              <PayoutRow key={group.userId} group={group} explorerUrl={explorerUrl} />
            ))}
          </div>
        </div>
      )}

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

      <PayoutSettingsForm settings={settings} />

      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-bold text-slate-900">Pagos recentemente</h3>
        <p className="-mt-2 mb-3 text-xs text-slate-500">
          Também aparecem (sem nomes) na página pública <a href="/transparencia" className="font-semibold text-teal-700 hover:underline">/transparencia</a>.
        </p>
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
