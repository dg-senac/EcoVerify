"use client";

import Link from "next/link";
import { useActionState, useState, useEffect, useRef } from "react";
import { loginAction, type ActionState } from "@/lib/actions/auth";
import { t, type Lang, LANGS } from "@/lib/i18n";

const initialState: ActionState = {};

export function LoginForm({ lang }: { lang: Lang }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [currentLang, setCurrentLang] = useState<Lang>(lang);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    }

    if (showLangMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLangMenu]);

  return (
    <div className="rounded-3xl bg-white p-8 shadow-[0_20px_50px_rgba(16,24,40,0.08)] card-surface border border-black/5">
      <div className="flex justify-end relative" ref={menuRef}>
        <button 
          onClick={() => setShowLangMenu(!showLangMenu)}
          className="text-xl text-slate-500 hover:text-slate-700 transition-colors"
        >
          ⚙️
        </button>
        {showLangMenu && (
          <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 min-w-[150px]">
            {LANGS.map((langOption) => (
              <button
                key={langOption.value}
                onClick={() => {
                  setCurrentLang(langOption.value);
                  setShowLangMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2"
              >
                <span>{langOption.flag}</span>
                <span className="text-sm">{langOption.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <h1 className="text-2xl font-bold text-slate-900">{t(currentLang, "login_title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t(currentLang, "tagline")}</p>

      <form action={formAction} className="mt-6 space-y-4">
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
        <Link href="/register" className="font-semibold text-emerald-600 hover:underline">
          {t(currentLang, "login_create_account")}
        </Link>
      </p>

      <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
        <p className="mb-1 font-semibold text-slate-600">
          {currentLang === "en" ? "Demo accounts" : currentLang === "es" ? "Cuentas de demostración" : "Contas de demonstração"}
        </p>
        <p>
          {currentLang === "en" ? "Citizen" : currentLang === "es" ? "Ciudadana" : "Cidadã"}: ana@ecoverify.app · senha 123456
        </p>
        <p>
          {currentLang === "en" ? "Moderator" : currentLang === "es" ? "Moderador" : "Moderador"}: marcos@ecoverify.app · senha 123456
        </p>
        <p>
          {currentLang === "en" ? "Admin" : currentLang === "es" ? "Admin" : "Admin"}: julia@ecoverify.app · senha 123456
        </p>
      </div>
    </div>
  );
}
