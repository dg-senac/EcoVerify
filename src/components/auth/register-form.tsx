"use client";

import Link from "next/link";
import { useActionState, useState, useEffect, useRef } from "react";
import { registerAction, type ActionState } from "@/lib/actions/auth";
import { t, type Lang, LANGS } from "@/lib/i18n";
import { actionErrorMessage } from "@/lib/action-errors";

function withLinks(text: string, lang: Lang) {
  // "{terms}" / "{privacy}" placeholders become links that open in a new tab (keeps the typed form intact).
  return text.split(/(\{terms\}|\{privacy\})/).map((part, i) =>
    part === "{terms}" || part === "{privacy}" ? (
      <a
        key={i}
        href={part === "{terms}" ? "/termos" : "/privacidade"}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-emerald-700 underline"
      >
        {t(lang, part === "{terms}" ? "terms_of_use" : "privacy_policy")}
      </a>
    ) : (
      part
    )
  );
}

const initialState: ActionState = {};

export function RegisterForm({ lang, next }: { lang: Lang; next?: string | null }) {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const [password, setPassword] = useState("");
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

  const errorMessage = actionErrorMessage(currentLang, state?.error);

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
      <h1 className="text-2xl font-bold text-slate-900">{t(currentLang, "register_title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t(currentLang, "tagline")}</p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">{t(currentLang, "register_name")}</label>
          <input
            type="text"
            name="name"
            required
            placeholder={currentLang === "en" ? "Ana Silva" : currentLang === "es" ? "Ana Silva" : "Ana Souza"}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <p className={`mt-1 text-xs ${password.length > 0 && password.length < 8 ? "text-red-500" : "text-slate-400"}`}>
            {t(currentLang, "register_password_hint")}
          </p>
        </div>

        <input type="hidden" name="language" value={currentLang} />
        {next && <input type="hidden" name="next" value={next} />}
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
          <span>{withLinks(t(currentLang, "register_accept_terms"), currentLang)}</span>
        </label>
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input type="checkbox" name="ageConfirm" required className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
          <span>{t(currentLang, "register_age_confirm")}</span>
        </label>

        {errorMessage && (
          <p className="animate-fade-in rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:brightness-105 disabled:opacity-70"
        >
          {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {t(currentLang, "register_submit")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {t(currentLang, "register_has_account")}{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-emerald-600 hover:underline">
          {t(currentLang, "register_login")}
        </Link>
      </p>
    </div>
  );
}
