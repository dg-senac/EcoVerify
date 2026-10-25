"use client";

import { useActionState, useState } from "react";
import { createWalletAction, importWalletAction, skipWalletAction } from "@/lib/actions/wallet";
import type { ActionState } from "@/lib/actions/auth";
import { t, type Lang } from "@/lib/i18n";

const initialState: ActionState = {};

export function WalletSetupForm({ lang }: { lang: Lang }) {
  const [mode, setMode] = useState<"choose" | "import">("choose");
  const [importState, importFormAction, importPending] = useActionState(importWalletAction, initialState);

  return (
    <div className="rounded-3xl bg-white p-8 shadow-[0_20px_50px_rgba(16,24,40,0.08)] card-surface border border-black/5 text-center">
      <div className="mx-auto mb-5 grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 text-5xl">
        👛
      </div>
      <h1 className="text-2xl font-bold text-slate-900">{t(lang, "wallet_title")}</h1>
      <p className="mt-2 text-sm text-slate-500">{t(lang, "wallet_subtitle")}</p>

      {mode === "choose" && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form action={createWalletAction}>
            <button
              type="submit"
              className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-4 py-6 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <span className="text-3xl">✨</span>
              {t(lang, "wallet_create")}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setMode("import")}
            className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 px-4 py-6 text-sm font-semibold text-slate-700 transition hover:border-teal-400 hover:bg-teal-50"
          >
            <span className="text-3xl">🔑</span>
            {t(lang, "wallet_import")}
          </button>
        </div>
      )}

      {mode === "import" && (
        <form action={importFormAction} className="mt-6 space-y-3 text-left">
          <label className="block text-sm font-medium text-slate-700">{t(lang, "wallet_import")}</label>
          <input
            type="text"
            name="address"
            required
            placeholder={t(lang, "wallet_address_placeholder")}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          {importState?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              {t(lang, importState.error === "wallet_in_use" ? "wallet_error_in_use" : "wallet_error_invalid")}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t(lang, "cancel")}
            </button>
            <button
              type="submit"
              disabled={importPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              {importPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {t(lang, "wallet_continue")}
            </button>
          </div>
        </form>
      )}

      <form action={skipWalletAction} className="mt-5">
        <button type="submit" className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline">
          {t(lang, "wallet_skip")}
        </button>
      </form>
    </div>
  );
}
