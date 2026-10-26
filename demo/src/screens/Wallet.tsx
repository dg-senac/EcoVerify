import { useState, type FormEvent } from "react";
import { Wallet, Copy, ShieldCheck, ExternalLink } from "lucide-react";
import { t } from "@/lib/i18n";
import { FONE_WALLET_ANDROID_URL, FONE_WALLET_IOS_URL } from "@/lib/fone";
import { navigate } from "../router";
import { dt, errorText } from "../i18n";
import { cancelWalletRequest, requestWalletLink, simulateWalletVerification, useCurrentUser, useLang } from "../store";
import { btnPrimary, btnSecondary, card, input } from "../components/ui";

/** Fictional verification address used only in the demo (the real one comes from FONE_TREASURY_ADDRESS). */
const DEMO_TREASURY = `f${"ec0".repeat(21)}`;

function randomFoneAddress() {
  return `f${Array.from({ length: 63 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
}

/** Onboarding step after sign-up, like /wallet-setup in the real app (simulated). */
export function WalletSetupScreen() {
  const lang = useLang();
  const user = useCurrentUser();
  return (
    <div className="mx-auto max-w-lg animate-slide-up">
      <div className={`${card} p-6 text-center`}>
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
          <Wallet className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t(lang, "wallet_title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t(lang, "wallet_subtitle")}</p>
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{dt(lang, "wallet_demo_note_verify")}</p>
        <div className="mt-5">
          <WalletForm onDone={() => navigate("/missions", { replace: true })} />
        </div>
        <button type="button" onClick={() => navigate("/missions", { replace: true })} className="mt-4 text-sm font-semibold text-slate-500 hover:underline">
          {user?.pendingWallet || user?.walletAddress ? t(lang, "wallet_continue") : t(lang, "wallet_skip")}
        </button>
      </div>
    </div>
  );
}

function HexBox({ value }: { value: string }) {
  const lang = useLang();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-left">
      <code className="min-w-0 flex-1 break-all text-xs text-slate-700">{value}</code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(value).catch(() => undefined);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-600"
      >
        <Copy className="h-3.5 w-3.5" /> {copied ? t(lang, "wallet_copied") : t(lang, "wallet_copy")}
      </button>
    </div>
  );
}

/** Link form → pending verification (exact amount) → verified, same steps as the real app. */
export function WalletForm({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const lang = useLang();
  const user = useCurrentUser();
  const [address, setAddress] = useState("");
  const [adult, setAdult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  if (user.pendingWallet) {
    const pending = user.pendingWallet;
    return (
      <div className="grid gap-3 text-left">
        <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-emerald-600" /> {t(lang, "wallet_pending_title")}
        </h3>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-center">
          <p className="text-3xl font-extrabold text-emerald-700">{pending.amount} FONE</p>
        </div>
        <p className="text-sm text-slate-700">{t(lang, "wallet_step_send").replace("{amount}", pending.amount)}</p>
        <HexBox value={DEMO_TREASURY} />
        <p className="text-sm text-slate-700">{t(lang, "wallet_step_from")}</p>
        <HexBox value={pending.address} />
        <p className="text-xs text-slate-500">{t(lang, "wallet_step_why")}</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          className={btnPrimary}
          onClick={() => {
            const result = simulateWalletVerification();
            if (result.error) return setError(errorText(lang, result.error));
            onDone();
          }}
        >
          <ShieldCheck className="h-4 w-4" /> {dt(lang, "wallet_simulate")}
        </button>
        <button type="button" className={btnSecondary} onClick={() => cancelWalletRequest()}>
          {t(lang, "wallet_cancel_request")}
        </button>
      </div>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = requestWalletLink(address, adult);
    setError(result.error ? errorText(lang, result.error) : null);
  };

  return (
    <form onSubmit={submit} className="grid gap-3 text-left">
      <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-3">
        <p className="text-sm font-semibold text-teal-900">{t(lang, "wallet_get_app")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <a href={FONE_WALLET_ANDROID_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-teal-800 shadow-sm">
            {t(lang, "wallet_android")} <ExternalLink className="h-3 w-3" />
          </a>
          <a href={FONE_WALLET_IOS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-teal-800 shadow-sm">
            {t(lang, "wallet_ios")} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
      <label className="text-sm font-medium text-slate-700" htmlFor="demo-wallet-address">{t(lang, "wallet_address_label")}</label>
      <input
        id="demo-wallet-address"
        className={`${input} font-mono text-xs`}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder={t(lang, "wallet_address_placeholder")}
        autoComplete="off"
        spellCheck={false}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{t(lang, "wallet_address_hint")}</p>
        <button type="button" onClick={() => setAddress(randomFoneAddress())} className="text-xs font-semibold text-emerald-700 hover:underline">
          {dt(lang, "wallet_fill_example")}
        </button>
      </div>
      {!user.adultDeclaredAt && (
        <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
          <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-600" />
          <span>{t(lang, "wallet_adult_label")}</span>
        </label>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className={`grid gap-2 ${onCancel ? "grid-cols-2" : ""}`}>
        {onCancel && (
          <button type="button" className={btnSecondary} onClick={onCancel}>
            {t(lang, "cancel")}
          </button>
        )}
        <button type="submit" className={btnPrimary}>
          {t(lang, "wallet_link")}
        </button>
      </div>
    </form>
  );
}
