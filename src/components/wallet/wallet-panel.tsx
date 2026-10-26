"use client";

import { useActionState, useState, useTransition } from "react";
import {
  cancelWalletRequestAction,
  linkWalletAction,
  renewWalletChallengeAction,
  reportWalletTxAction,
} from "@/lib/actions/wallet";
import type { ActionState } from "@/lib/actions/auth";
import { t, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { FoneAmount, FoneMark, PoweredByFone } from "@/components/brand/fone";
import {
  FONE_WALLET_ANDROID_URL,
  FONE_WALLET_IOS_URL,
  WALLET_CHALLENGE_TTL_MS,
  explorerAddressUrl,
  explorerTxUrl,
  type WalletState,
} from "@/lib/fone";

const initialState: ActionState = {};

const errorKeys = {
  adult_required: "wallet_error_adult",
  email_required: "wallet_error_email",
  invalid_address: "wallet_error_invalid",
  wallet_in_use: "wallet_error_in_use",
  already_verified: "wallet_error_already",
  too_many_attempts: "error_too_many_attempts",
  try_later: "wallet_error_later",
  invalid_tx: "wallet_error_tx",
  tx_in_use: "wallet_error_tx_in_use",
} as const;

function ErrorText({ lang, error }: { lang: Lang; error?: string }) {
  if (!error) return null;
  const key = errorKeys[error as keyof typeof errorKeys] ?? "error_generic";
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{t(lang, key)}</p>;
}

function CopyButton({ lang, value }: { lang: Lang; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable: the value is selectable anyway */
        }
      }}
      className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
    >
      {copied ? t(lang, "wallet_copied") : t(lang, "wallet_copy")}
    </button>
  );
}

function HexBox({ lang, value, href }: { lang: Lang; value: string; href?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
      <code className="min-w-0 flex-1 break-all text-left text-xs text-slate-700 select-all">{value}</code>
      <CopyButton lang={lang} value={value} />
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-bold text-teal-700 hover:underline"
        >
          ↗
        </a>
      )}
    </div>
  );
}

function GetFoneWallet({ lang }: { lang: Lang }) {
  return (
    <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 text-left">
      <div className="flex items-center gap-2.5">
        <FoneMark size={32} className="rounded-lg" />
        <div>
          <p className="text-sm font-semibold text-teal-900">{t(lang, "wallet_get_app")}</p>
          <p className="text-xs text-teal-700/80">Fone Wallet · {t(lang, "fone_wallet_official")}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={FONE_WALLET_ANDROID_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-teal-800 shadow-sm hover:bg-teal-100"
        >
          ▶ {t(lang, "wallet_android")}
        </a>
        <a
          href={FONE_WALLET_IOS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-teal-800 shadow-sm hover:bg-teal-100"
        >
          {t(lang, "wallet_ios")}
        </a>
      </div>
    </div>
  );
}

function LinkForm({
  lang,
  adultDeclared,
  hasLegacyAddress,
  onCancel,
}: {
  lang: Lang;
  adultDeclared: boolean;
  hasLegacyAddress: boolean;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(linkWalletAction, initialState);
  return (
    <div className="space-y-4 text-left">
      {hasLegacyAddress && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{t(lang, "wallet_legacy_notice")}</p>
      )}
      <GetFoneWallet lang={lang} />
      <form action={formAction} className="space-y-3">
        <label className="block text-sm font-medium text-slate-700" htmlFor="wallet-address">
          {t(lang, "wallet_address_label")}
        </label>
        <input
          id="wallet-address"
          type="text"
          name="address"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder={t(lang, "wallet_address_placeholder")}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-xs outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <p className="text-xs text-slate-500">{t(lang, "wallet_address_hint")}</p>
        {!adultDeclared && (
          <label className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
            <input type="checkbox" name="adult" required className="mt-0.5 h-4 w-4 accent-emerald-600" />
            <span>{t(lang, "wallet_adult_label")}</span>
          </label>
        )}
        <ErrorText lang={lang} error={state.error} />
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t(lang, "cancel")}
            </button>
          )}
          <button
            type="submit"
            disabled={pending}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
          >
            {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {t(lang, "wallet_link")}
          </button>
        </div>
      </form>
    </div>
  );
}

function PendingCard({
  lang,
  request,
  treasury,
  explorerUrl,
}: {
  lang: Lang;
  request: Extract<WalletState, { kind: "pending" }>;
  treasury: string | null;
  explorerUrl?: string;
}) {
  const [txState, txAction, txPending] = useActionState(reportWalletTxAction, initialState);
  const [busy, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string>();
  const expiresAt = new Date(new Date(request.createdAt).getTime() + WALLET_CHALLENGE_TTL_MS);

  const run = (action: () => Promise<ActionState>) =>
    startTransition(async () => {
      const result = await action();
      setActionError(result.error);
    });

  return (
    <div className="space-y-4 text-left">
      <h2 className="text-base font-bold text-slate-900">🔐 {t(lang, "wallet_pending_title")}</h2>

      {!treasury ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{t(lang, "wallet_unavailable")}</p>
      ) : request.expired ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{t(lang, "wallet_expired")}</p>
      ) : (
        <>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 text-center">
            <p className="text-3xl font-extrabold text-emerald-700">
              <FoneAmount amount={request.amount} size={30} />
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-700">{t(lang, "wallet_step_send").replace("{amount}", request.amount)}</p>
            <HexBox lang={lang} value={treasury} />
          </div>
        </>
      )}

      <div className="space-y-2">
        <p className="text-sm text-slate-700">{t(lang, "wallet_step_from")}</p>
        <HexBox lang={lang} value={request.address} href={explorerAddressUrl(request.address, explorerUrl)} />
      </div>

      {treasury && !request.expired && (
        <>
          <p className="text-xs text-slate-500">{t(lang, "wallet_step_why")}</p>
          <p className="text-xs text-slate-500">{t(lang, "wallet_expires").replace("{date}", formatDate(expiresAt, lang))}</p>

          {request.reportedTx ? (
            <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
              <p className="text-sm font-medium text-emerald-800">✓ {t(lang, "wallet_tx_saved")}</p>
              <HexBox lang={lang} value={request.reportedTx} href={explorerTxUrl(request.reportedTx, explorerUrl)} />
            </div>
          ) : (
            <form action={txAction} className="space-y-2">
              <label className="block text-xs font-medium text-slate-600" htmlFor="wallet-tx">
                {t(lang, "wallet_tx_label")}
              </label>
              <div className="flex gap-2">
                <input
                  id="wallet-tx"
                  type="text"
                  name="txHash"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={t(lang, "wallet_tx_placeholder")}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={txPending}
                  className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-70"
                >
                  {t(lang, "wallet_tx_submit")}
                </button>
              </div>
              <ErrorText lang={lang} error={txState.error} />
            </form>
          )}
        </>
      )}

      <ErrorText lang={lang} error={actionError} />
      <div className="flex flex-wrap gap-2">
        {treasury && request.expired && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(renewWalletChallengeAction)}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-70"
          >
            {t(lang, "wallet_renew")}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => run(cancelWalletRequestAction)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-70"
        >
          {t(lang, "wallet_cancel_request")}
        </button>
      </div>
    </div>
  );
}

export type WalletPanelProps = {
  lang: Lang;
  verifiedAddress: string | null;
  request: WalletState;
  treasury: string | null;
  explorerUrl?: string;
  adultDeclared: boolean;
};

export function WalletPanel({ lang, verifiedAddress, request, treasury, explorerUrl, adultDeclared }: WalletPanelProps) {
  const [changing, setChanging] = useState(false);

  return (
    <div className="space-y-4">
      {verifiedAddress && (
        <div className="space-y-2 text-left">
          <p className="text-sm font-semibold text-emerald-700">✅ {t(lang, "wallet_verified")}</p>
          <HexBox lang={lang} value={verifiedAddress} href={explorerAddressUrl(verifiedAddress, explorerUrl)} />
          <p className="text-xs text-slate-500">{t(lang, "wallet_verified_hint")}</p>
        </div>
      )}

      {request.kind === "pending" ? (
        <PendingCard lang={lang} request={request} treasury={treasury} explorerUrl={explorerUrl} />
      ) : verifiedAddress && !changing ? (
        <div className="text-left">
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            {t(lang, "wallet_change")}
          </button>
        </div>
      ) : (
        <>
          {verifiedAddress && <p className="text-left text-xs text-slate-500">{t(lang, "wallet_change_hint")}</p>}
          <LinkForm
            lang={lang}
            adultDeclared={adultDeclared}
            hasLegacyAddress={!verifiedAddress && request.hasLegacyAddress}
            onCancel={verifiedAddress ? () => setChanging(false) : undefined}
          />
        </>
      )}
      <div className="flex justify-center pt-2">
        <PoweredByFone lang={lang} />
      </div>
    </div>
  );
}
