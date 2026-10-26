import { useState, type FormEvent } from "react";
import { ArrowLeft, UserPlus } from "lucide-react";
import { LogoHorizontal } from "@/components/logo";
import { t, type Lang } from "@/lib/i18n";
import { Link, navigate } from "../router";
import { dt } from "../i18n";
import { register, setGuestLanguage, useLang } from "../store";
import { DemoBanner } from "../components/Shell";
import { ProfileList } from "../components/ProfileSwitcher";
import { btnPrimary, card, input, label } from "../components/ui";

const LANGS: { id: Lang; flag: string; label: string }[] = [
  { id: "pt", flag: "🇧🇷", label: "PT" },
  { id: "en", flag: "🇺🇸", label: "EN" },
  { id: "es", flag: "🇪🇸", label: "ES" },
];

function AuthLayout({ children }: { children: React.ReactNode }) {
  const lang = useLang();
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="sticky top-0 z-40">
        <DemoBanner />
      </div>
      <div className="mx-auto flex max-w-md flex-col px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <LogoHorizontal height={40} />
          <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-black/5">
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setGuestLanguage(l.id)}
                className={`rounded-lg px-2 py-1 text-xs font-bold ${lang === l.id ? "bg-emerald-500 text-white" : "text-slate-500"}`}
                aria-label={l.label}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-slate-400">{t(lang, "tagline")}</p>
      </div>
    </div>
  );
}

export function LoginScreen() {
  const lang = useLang();
  return (
    <AuthLayout>
      <div className={`${card} p-5 animate-slide-up`}>
        <h1 className="text-2xl font-extrabold text-slate-900">{dt(lang, "demo_login_title")}</h1>
        <p className="mb-5 mt-1 text-sm text-slate-500">{dt(lang, "demo_login_subtitle")}</p>
        <ProfileList />
        <div className="mt-5 border-t border-slate-100 pt-4 text-center">
          <Link to="/register" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline">
            <UserPlus className="h-4 w-4" /> {dt(lang, "demo_or_create")}
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export function RegisterScreen() {
  const lang = useLang();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = register(name, email, password);
    if (result.error) {
      setError(
        result.error === "email_exists"
          ? t(lang, "register_email_exists")
          : result.error === "password"
            ? t(lang, "register_password_hint")
            : result.error === "storage"
              ? dt(lang, "demo_storage_full")
              : dt(lang, "invalid_form"),
      );
      return;
    }
    navigate("/wallet", { replace: true });
  };

  return (
    <AuthLayout>
      <form onSubmit={submit} className={`${card} grid gap-4 p-5 animate-slide-up`}>
        <div>
          <Link to="/" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-500">
            <ArrowLeft className="h-4 w-4" /> {dt(lang, "have_demo_profiles")}
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900">{t(lang, "register_title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{dt(lang, "register_demo_note")}</p>
        </div>
        <div>
          <label className={label} htmlFor="name">{t(lang, "register_name")}</label>
          <input id="name" className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </div>
        <div>
          <label className={label} htmlFor="email">{t(lang, "login_email")}</label>
          <input id="email" type="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div>
          <label className={label} htmlFor="password">{t(lang, "login_password")}</label>
          <input id="password" type="password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          <p className="mt-1 text-xs text-slate-400">{t(lang, "register_password_hint")}</p>
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" className={btnPrimary}>{t(lang, "register_submit")}</button>
      </form>
    </AuthLayout>
  );
}
