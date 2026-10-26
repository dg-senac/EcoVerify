import { useState, type FormEvent } from "react";
import { Wallet, Sparkles, Link2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { navigate } from "../router";
import { dt, errorText } from "../i18n";
import { createDemoWallet, importWallet, useLang } from "../store";
import { btnPrimary, btnSecondary, card, input } from "../components/ui";

/** Onboarding step after sign-up, like /wallet in the real app (simulated). */
export function WalletSetupScreen() {
  const lang = useLang();
  return (
    <div className="mx-auto max-w-lg animate-slide-up">
      <div className={`${card} p-6 text-center`}>
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
          <Wallet className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t(lang, "wallet_title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t(lang, "wallet_subtitle")}</p>
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{dt(lang, "wallet_demo_note")}</p>
        <div className="mt-5">
          <WalletForm onDone={() => navigate("/missions", { replace: true })} />
        </div>
        <button type="button" onClick={() => navigate("/missions", { replace: true })} className="mt-4 text-sm font-semibold text-slate-500 hover:underline">
          {t(lang, "wallet_skip")}
        </button>
      </div>
    </div>
  );
}

export function WalletForm({ onDone }: { onDone: () => void }) {
  const lang = useLang();
  const [importing, setImporting] = useState(false);
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitImport = (event: FormEvent) => {
    event.preventDefault();
    const result = importWallet(address);
    if (result.error) return setError(errorText(lang, result.error));
    onDone();
  };

  if (importing) {
    return (
      <form onSubmit={submitImport} className="grid gap-3 text-left">
        <input className={input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t(lang, "wallet_address_placeholder")} autoFocus />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={btnSecondary} onClick={() => setImporting(false)}>{t(lang, "cancel")}</button>
          <button type="submit" className={btnPrimary}>{t(lang, "wallet_continue")}</button>
        </div>
      </form>
    );
  }
  return (
    <div className="grid gap-2">
      <button
        type="button"
        className={btnPrimary}
        onClick={() => {
          createDemoWallet();
          onDone();
        }}
      >
        <Sparkles className="h-4 w-4" /> {dt(lang, "wallet_create_demo")}
      </button>
      <button type="button" className={btnSecondary} onClick={() => setImporting(true)}>
        <Link2 className="h-4 w-4" /> {t(lang, "wallet_import")}
      </button>
    </div>
  );
}
