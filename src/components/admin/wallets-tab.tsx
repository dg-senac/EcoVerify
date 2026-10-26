import { WalletReviewRow, type PendingWallet } from "@/components/admin/wallet-review-row";

export function WalletsTab({
  pending,
  verifiedCount,
  treasury,
  explorerUrl,
}: {
  pending: PendingWallet[];
  verifiedCount: number;
  treasury: string | null;
  explorerUrl?: string;
}) {
  return (
    <div className="space-y-4">
      {!treasury && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <b>Verificação desativada:</b> defina <code>FONE_TREASURY_ADDRESS</code> com o endereço FONE nativo da carteira
          que recebe as transferências de verificação. Até lá os usuários veem &quot;verificação ainda não aberta&quot;.
        </div>
      )}
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-bold text-slate-900">Carteiras aguardando verificação</h3>
          <p className="text-xs text-slate-500">{verifiedCount} carteira(s) verificada(s)</p>
        </div>
        {pending.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Nenhum pedido de verificação no momento.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((item) => (
              <WalletReviewRow key={item.id} item={item} treasury={treasury} explorerUrl={explorerUrl} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
