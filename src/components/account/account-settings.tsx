"use client";

import { useActionState, useRef } from "react";
import { changePasswordAction, deleteAccountAction } from "@/lib/actions/account";
import type { ActionState } from "@/lib/actions/auth";
import { actionErrorMessage } from "@/lib/action-errors";
import { t, type Lang } from "@/lib/i18n";
import { EmailBanner } from "@/components/account/email-banner";

const initialState: ActionState = {};
const section = "space-y-4 rounded-3xl border border-black/5 bg-white p-6 shadow-sm";
const input =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

function ErrorText({ lang, error }: { lang: Lang; error?: string }) {
  const message = actionErrorMessage(lang, error, "error_generic");
  return message ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{message}</p> : null;
}

function ChangePasswordForm({ lang }: { lang: Lang }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await changePasswordAction(prev, formData);
    if (result.success) formRef.current?.reset();
    return result;
  }, initialState);

  return (
    <details className="group rounded-2xl border border-slate-200 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">{t(lang, "change_password")}</summary>
      <form ref={formRef} action={formAction} className="mt-4 space-y-3">
        <input type="password" name="currentPassword" required autoComplete="current-password" placeholder={t(lang, "current_password")} className={input} />
        <input type="password" name="password" required minLength={8} maxLength={200} autoComplete="new-password" placeholder={t(lang, "new_password")} className={input} />
        <input type="password" name="confirmPassword" required minLength={8} maxLength={200} autoComplete="new-password" placeholder={t(lang, "confirm_password")} className={input} />
        <p className="text-xs text-slate-400">{t(lang, "register_password_hint")}</p>
        <ErrorText lang={lang} error={state.error} />
        {state.success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{t(lang, "password_changed")}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {t(lang, "save")}
        </button>
      </form>
    </details>
  );
}

function DeleteAccountForm({ lang }: { lang: Lang }) {
  const [state, formAction, pending] = useActionState(deleteAccountAction, initialState);
  return (
    <details className="rounded-2xl border border-red-200 bg-red-50/40 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-red-700">{t(lang, "delete_title")}</summary>
      <form action={formAction} className="mt-4 space-y-3">
        <p className="text-sm text-slate-600">{t(lang, "delete_text")}</p>
        <input type="password" name="password" required autoComplete="current-password" placeholder={t(lang, "delete_password")} className={input} />
        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input type="checkbox" name="confirm" required className="mt-0.5 h-4 w-4 shrink-0 accent-red-600" />
          <span>{t(lang, "delete_confirm_label")}</span>
        </label>
        <ErrorText lang={lang} error={state.error} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {t(lang, "delete_button")}
        </button>
      </form>
    </details>
  );
}

export function AccountSettings({
  lang,
  email,
  emailVerified,
  verificationRequired,
  termsAcceptedOn,
}: {
  lang: Lang;
  email: string;
  emailVerified: boolean;
  verificationRequired: boolean;
  /** Already formatted date, or null. */
  termsAcceptedOn: string | null;
}) {
  return (
    <div className="space-y-6">
      <section className={section}>
        <h2 className="text-base font-bold text-slate-900">{t(lang, "account_section")}</h2>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium text-slate-800">{email}</span>
          {emailVerified ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">✓ {t(lang, "email_verified")}</span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{t(lang, "email_not_verified")}</span>
          )}
        </div>
        {!emailVerified && verificationRequired && <EmailBanner lang={lang} email={email} compact />}
        <ChangePasswordForm lang={lang} />
      </section>

      <section className={section}>
        <h2 className="text-base font-bold text-slate-900">{t(lang, "privacy_section")}</h2>
        <div className="text-sm text-slate-600">
          {termsAcceptedOn && <p>{t(lang, "terms_accepted_on").replace("{date}", termsAcceptedOn)}</p>}
          <p className="mt-1 flex flex-wrap gap-4 font-semibold">
            <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
              {t(lang, "terms_of_use")}
            </a>
            <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
              {t(lang, "privacy_policy")}
            </a>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">{t(lang, "export_title")}</p>
          <p className="mt-1 text-xs text-slate-500">{t(lang, "export_text")}</p>
          <a
            href="/api/account/export"
            download
            className="mt-3 inline-flex rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            ⬇ {t(lang, "export_button")}
          </a>
        </div>
        <DeleteAccountForm lang={lang} />
      </section>
    </div>
  );
}
