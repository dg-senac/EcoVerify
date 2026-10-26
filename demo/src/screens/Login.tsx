import { useState, type FormEvent } from "react";
import { ArrowLeft, UserPlus } from "lucide-react";
import { LogoHorizontal } from "@/components/logo";
import { t, type Lang } from "@/lib/i18n";
import { Link, navigate } from "../router";
import { dt, errorText } from "../i18n";
import { register, setGuestLanguage, useLang } from "../store";
import { DemoBanner } from "../components/Shell";
import { ProfileList } from "../components/ProfileSwitcher";
import { btnPrimary, card, input, label, Modal } from "../components/ui";
import { PoweredByFone } from "@/components/brand/fone";
import { LegalDocument, type LegalDoc } from "./Legal";

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
        <div className="mt-4 flex flex-col items-center gap-2">
          <PoweredByFone lang={lang} />
          <nav className="flex gap-4 text-xs font-medium text-slate-500">
            <Link to="/termos" className="hover:underline">{t(lang, "terms_of_use")}</Link>
            <Link to="/privacidade" className="hover:underline">{t(lang, "privacy_policy")}</Link>
          </nav>
        </div>
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
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [ageConfirm, setAgeConfirm] = useState(false);
  const [openDoc, setOpenDoc] = useState<LegalDoc | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = register(name, email, password, { terms: acceptTerms, age: ageConfirm });
    if (result.error) {
      setError(
        result.error === "email_exists"
          ? t(lang, "register_email_exists")
          : result.error === "password"
            ? t(lang, "register_password_hint")
            : result.error === "invalid"
              ? dt(lang, "invalid_form")
              : errorText(lang, result.error),
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
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
          <span>
            {t(lang, "register_accept_terms")
              .split(/(\{terms\}|\{privacy\})/)
              .map((part, i) =>
                part === "{terms}" || part === "{privacy}" ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setOpenDoc(part === "{terms}" ? "terms" : "privacy")}
                    className="font-semibold text-emerald-700 underline"
                  >
                    {t(lang, part === "{terms}" ? "terms_of_use" : "privacy_policy")}
                  </button>
                ) : (
                  part
                ),
              )}
          </span>
        </label>
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input type="checkbox" checked={ageConfirm} onChange={(e) => setAgeConfirm(e.target.checked)} required className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
          <span>{t(lang, "register_age_confirm")}</span>
        </label>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" className={btnPrimary}>{t(lang, "register_submit")}</button>
      </form>
      {openDoc && (
        <Modal title={t(lang, openDoc === "terms" ? "terms_of_use" : "privacy_policy")} onClose={() => setOpenDoc(null)}>
          <LegalDocument doc={openDoc} lang={lang} />
        </Modal>
      )}
    </AuthLayout>
  );
}
