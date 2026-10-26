"use client";

import Link from "next/link";
import { useActionState } from "react";
import { acceptTermsAction, requestPasswordResetAction, resetPasswordAction } from "@/lib/actions/account";
import type { ActionState } from "@/lib/actions/auth";
import { actionErrorMessage } from "@/lib/action-errors";
import { t, type Lang } from "@/lib/i18n";

const initialState: ActionState = {};
const card = "rounded-3xl border border-black/5 bg-white p-8 shadow-[0_20px_50px_rgba(16,24,40,0.08)] card-surface";
const input =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
const button =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:brightness-105 disabled:opacity-70";

function ErrorBox({ lang, error }: { lang: Lang; error?: string }) {
  const message = actionErrorMessage(lang, error, "error_email_failed");
  if (!message) return null;
  return <p className="animate-fade-in rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{message}</p>;
}

function Spinner({ show }: { show: boolean }) {
  return show ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null;
}

function BackToLogin({ lang }: { lang: Lang }) {
  return (
    <p className="mt-6 text-center text-sm">
      <Link href="/login" className="font-semibold text-emerald-600 hover:underline">
        {t(lang, "back_to_login")}
      </Link>
    </p>
  );
}

export function ForgotPasswordForm({ lang }: { lang: Lang }) {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);
  return (
    <div className={card}>
      <h1 className="text-2xl font-bold text-slate-900">{t(lang, "forgot_title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t(lang, "forgot_subtitle")}</p>
      {state.success ? (
        <p className="mt-6 rounded-lg bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700">{t(lang, "forgot_sent")}</p>
      ) : (
        <form action={formAction} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">{t(lang, "login_email")}</label>
            <input type="email" name="email" required maxLength={255} autoComplete="email" className={input} />
          </div>
          <ErrorBox lang={lang} error={state.error === "invalid" ? undefined : state.error} />
          <button type="submit" disabled={pending} className={button}>
            <Spinner show={pending} />
            {t(lang, "forgot_submit")}
          </button>
        </form>
      )}
      <BackToLogin lang={lang} />
    </div>
  );
}

export function ResetPasswordForm({ lang, token }: { lang: Lang; token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);
  return (
    <div className={card}>
      <h1 className="text-2xl font-bold text-slate-900">{t(lang, "reset_title")}</h1>
      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{t(lang, "new_password")}</label>
          <input type="password" name="password" required minLength={8} maxLength={200} autoComplete="new-password" className={input} />
          <p className="mt-1 text-xs text-slate-400">{t(lang, "register_password_hint")}</p>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{t(lang, "confirm_password")}</label>
          <input type="password" name="confirmPassword" required minLength={8} maxLength={200} autoComplete="new-password" className={input} />
        </div>
        <ErrorBox lang={lang} error={state.error} />
        {state.error === "invalid_token" && (
          <Link href="/forgot-password" className="block text-center text-sm font-semibold text-emerald-600 hover:underline">
            {t(lang, "forgot_title")}
          </Link>
        )}
        <button type="submit" disabled={pending} className={button}>
          <Spinner show={pending} />
          {t(lang, "reset_submit")}
        </button>
      </form>
      <BackToLogin lang={lang} />
    </div>
  );
}

export function AcceptTermsForm({ lang }: { lang: Lang }) {
  const [state, formAction, pending] = useActionState(acceptTermsAction, initialState);
  return (
    <div className={card}>
      <h1 className="text-2xl font-bold text-slate-900">{t(lang, "terms_update_title")}</h1>
      <p className="mt-2 text-sm text-slate-500">{t(lang, "terms_update_text")}</p>
      <div className="mt-4 flex flex-col gap-2 text-sm font-semibold">
        <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
          {t(lang, "terms_of_use")} ↗
        </a>
        <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">
          {t(lang, "privacy_policy")} ↗
        </a>
      </div>
      <form action={formAction} className="mt-6 space-y-4">
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input type="checkbox" name="accept" required className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
          <span>
            {t(lang, "register_accept_terms")
              .replace("{terms}", t(lang, "terms_of_use"))
              .replace("{privacy}", t(lang, "privacy_policy"))}
          </span>
        </label>
        <ErrorBox lang={lang} error={state.error} />
        <button type="submit" disabled={pending} className={button}>
          <Spinner show={pending} />
          {t(lang, "terms_continue")}
        </button>
      </form>
    </div>
  );
}
