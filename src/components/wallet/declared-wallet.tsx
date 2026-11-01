"use client";

import { useState } from "react";
import type { Lang } from "@/lib/i18n";
import { walletOptionalText, type DeclaredWalletError } from "@/lib/wallet-optional";

const INPUT =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

/**
 * Optional wallet fields for the sign-up forms (web and APK). Uncontrolled: the form reads
 * `walletAddress` and `walletAdult` (src/lib/wallet-optional.ts validates them).
 */
export function DeclaredWalletFields({ lang }: { lang: Lang }) {
  const text = walletOptionalText(lang);
  const [address, setAddress] = useState("");
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 p-4" data-testid="register-wallet">
      <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="walletAddress">
        {text.label}
      </label>
      <input
        id="walletAddress"
        name="walletAddress"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={80}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder={text.placeholder}
        className={INPUT}
      />
      <p className="mt-1 text-xs text-slate-400">{text.hint}</p>
      {address.trim() && (
        <label className="mt-3 flex items-start gap-2.5 text-sm text-slate-600">
          <input type="checkbox" name="walletAdult" className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
          <span>{text.adult}</span>
        </label>
      )}
    </div>
  );
}

/** Profile card: add, change or remove the optional wallet (web and APK). */
export function DeclaredWalletCard({
  lang,
  address,
  adultDeclared,
  onSave,
}: {
  lang: Lang;
  address: string | null;
  adultDeclared: boolean;
  /** Empty address = remove. */
  onSave: (address: string, adult: boolean) => Promise<{ error?: DeclaredWalletError }>;
}) {
  const text = walletOptionalText(lang);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(address ?? "");
  const [adult, setAdult] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<DeclaredWalletError | null>(null);
  const [saved, setSaved] = useState<"saved" | "removed" | null>(null);

  const save = async (next: string) => {
    setPending(true);
    setError(null);
    setSaved(null);
    const result = await onSave(next, adult);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
    setSaved(next ? "saved" : "removed");
    setValue(next);
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" data-testid="declared-wallet">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-slate-900">👛 {text.profileTitle}</h3>
        {address && !editing && (
          <div className="flex shrink-0 gap-3 text-sm font-semibold">
            <button type="button" className="text-emerald-700 hover:underline" onClick={() => { setValue(address); setEditing(true); setSaved(null); }}>
              {text.change}
            </button>
            <button type="button" className="text-slate-500 hover:underline" disabled={pending} onClick={() => save("")} data-testid="declared-wallet-remove">
              {text.remove}
            </button>
          </div>
        )}
      </div>

      {address && !editing ? (
        <>
          <p className="mt-2 text-xs font-semibold text-slate-500">{text.profileSaved}</p>
          <p className="mt-1 break-all rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700" data-testid="declared-wallet-address">
            {address}
          </p>
          <p className="mt-2 text-xs text-slate-500">{text.profileNote}</p>
        </>
      ) : !editing ? (
        <>
          <p className="mt-2 text-sm text-slate-500">{text.profileNone}</p>
          <button type="button" className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700" onClick={() => { setValue(""); setEditing(true); setSaved(null); }} data-testid="declared-wallet-add">
            {text.add}
          </button>
        </>
      ) : (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void save(value.trim());
          }}
        >
          <input
            aria-label={text.label}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={text.placeholder}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={80}
            className={INPUT}
            data-testid="declared-wallet-input"
          />
          {!adultDeclared && (
            <label className="flex items-start gap-2.5 text-sm text-slate-600">
              <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
              <span>{text.adult}</span>
            </label>
          )}
          <p className="text-xs text-slate-400">{text.profileNote}</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending || !value.trim()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60" data-testid="declared-wallet-save">
              {text.save}
            </button>
            <button type="button" className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" onClick={() => { setEditing(false); setError(null); }}>
              {text.cancel}
            </button>
          </div>
        </form>
      )}
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{text.errors[error]}</p>}
      {saved && !error && <p className="mt-3 text-sm font-medium text-emerald-700">{saved === "saved" ? text.saved : text.removed}</p>}
    </div>
  );
}
