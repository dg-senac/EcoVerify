import { redirect } from "next/navigation";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { getCurrentUser } from "@/lib/auth";
import { skipWalletAction } from "@/lib/actions/wallet";
import { WalletPanel } from "@/components/wallet/wallet-panel";
import { getFoneConfig } from "@/lib/fone-config";
import { verifiedWallet, walletRequestState } from "@/lib/fone";
import { t } from "@/lib/i18n";

export default async function WalletSetupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!PAYMENTS_ENABLED) redirect("/missions");
  const { treasury, explorerUrl } = getFoneConfig();
  const request = walletRequestState(user);
  const verified = verifiedWallet(user);
  const lang = user.language;

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-8 text-center shadow-[0_20px_50px_rgba(16,24,40,0.08)] card-surface">
      <div className="mx-auto mb-5 grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 text-5xl">
        👛
      </div>
      <h1 className="text-2xl font-bold text-slate-900">{t(lang, "wallet_title")}</h1>
      <p className="mt-2 text-sm text-slate-500">{t(lang, "wallet_subtitle")}</p>

      <div className="mt-6">
        <WalletPanel
          lang={lang}
          verifiedAddress={verified}
          request={request}
          treasury={treasury}
          explorerUrl={explorerUrl}
          adultDeclared={!!user.adultDeclaredAt}
        />
      </div>

      <form action={skipWalletAction} className="mt-6">
        <button type="submit" className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline">
          {request.kind === "pending" || verified ? t(lang, "wallet_continue") : t(lang, "wallet_skip")}
        </button>
      </form>
    </div>
  );
}
