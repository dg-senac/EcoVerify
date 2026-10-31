"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, type ActionState } from "@/lib/actions/auth";
import { t, type Lang } from "@/lib/i18n";
import { GuestLangMenu } from "@/components/auth/guest-lang-menu";

const initialState: ActionState = {};

export function LoginForm({
  lang,
  notice,
  showDemoAccounts = false,
  next,
}: {
  lang: Lang;
  next?: string | null;
  notice?: "reset" | "deleted";
  showDemoAccounts?: boolean;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [currentLang, setCurrentLang] = useState<Lang>(lang);
  return (
    <div className="rounded-3xl bg-white p-8 shadow-[0_20px_50px_rgba(16,24,40,0.08)] card-surface border border-black/5">
      <GuestLangMenu value={currentLang} onChange={setCurrentLang} />
      <h1 className="text-2xl font-bold text-slate-900">{t(currentLang, "login_title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t(currentLang, "tagline")}</p>

      {notice && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {t(currentLang, notice === "reset" ? "login_reset_done" : "login_deleted")}
        </p>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{t(currentLang, "login_email")}</label>
          <input
            type="email"
            name="email"
            required
            placeholder={currentLang === "en" ? "you@example.com" : currentLang === "es" ? "tu@ejemplo.com" : "voce@email.com"}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{t(currentLang, "login_password")}</label>
          <input
            type="password"
            name="password"
            required
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <div className="mt-1.5 text-right">
            <Link href="/forgot-password" className="text-xs font-semibold text-emerald-600 hover:underline">
              {t(currentLang, "login_forgot")}
            </Link>
          </div>
        </div>

        {state?.error && (
          <p className="animate-fade-in rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            {t(currentLang, state.error === "banned" ? "banned_error" : state.error === "too_many_attempts" ? "error_too_many_attempts" : "login_error")}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:brightness-105 disabled:opacity-70"
        >
          {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {t(currentLang, "login_submit")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {t(currentLang, "login_no_account")}{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-semibold text-emerald-600 hover:underline">
          {t(currentLang, "login_create_account")}
        </Link>
      </p>

      {showDemoAccounts && (
        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
          <p className="mb-1 font-semibold text-slate-600">
            {currentLang === "en" ? "Seed accounts (development)" : currentLang === "es" ? "Cuentas de ejemplo (desarrollo)" : "Contas de exemplo (desenvolvimento)"}
          </p>
          <p>cidada@ecoverify.dev · moderador@ecoverify.dev · admin@ecoverify.dev</p>
          <p>{currentLang === "en" ? "password" : currentLang === "es" ? "contraseña" : "senha"}: ecoverify123</p>
        </div>
      )}
    </div>
  );
}
