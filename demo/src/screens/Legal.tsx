import { ArrowLeft } from "lucide-react";
import { LogoHorizontal } from "@/components/logo";
import { PoweredByFone } from "@/components/brand/fone";
import { TermsContent } from "@/components/legal/terms-content";
import { PrivacyContent } from "@/components/legal/privacy-content";
import { DEFAULT_LEGAL_INFO, TERMS_VERSION } from "@/lib/legal";
import { t, type Lang } from "@/lib/i18n";
import { goBack, Link } from "../router";
import { useLang } from "../store";
import { SafeAreaTop } from "../components/Shell";
import { card } from "../components/ui";

export type LegalDoc = "terms" | "privacy";

/** Same documents as /termos and /privacidade in the web app (translated; Portuguese is the binding version). */
export function LegalDocument({ doc, lang }: { doc: LegalDoc; lang: Lang }) {
  const note = t(lang, "legal_pt_only");
  const date = new Date(`${TERMS_VERSION}T12:00:00Z`).toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return (
    <div>
      <p className="text-xs text-slate-500">{t(lang, "legal_version").replace("{date}", date)}</p>
      {note && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{note}</p>}
      <div className="mt-4">
        {doc === "terms" ? <TermsContent info={DEFAULT_LEGAL_INFO} lang={lang} /> : <PrivacyContent info={DEFAULT_LEGAL_INFO} lang={lang} />}
      </div>
    </div>
  );
}

export function LegalScreen({ doc }: { doc: LegalDoc }) {
  const lang = useLang();
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <SafeAreaTop />
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => goBack("/")} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
            <ArrowLeft className="h-4 w-4" /> {t(lang, "back")}
          </button>
          <LogoHorizontal height={32} />
        </div>
        <nav className="mb-4 flex gap-4 text-sm font-semibold text-emerald-700">
          <Link to="/termos" className={doc === "terms" ? "underline" : ""}>{t(lang, "terms_of_use")}</Link>
          <Link to="/privacidade" className={doc === "privacy" ? "underline" : ""}>{t(lang, "privacy_policy")}</Link>
          <Link to="/transparencia">{t(lang, "transparency")}</Link>
        </nav>
        <article className={`${card} p-5 md:p-8`}>
          <h1 className="text-2xl font-extrabold text-slate-900">{t(lang, doc === "terms" ? "terms_of_use" : "privacy_policy")}</h1>
          <div className="mt-2">
            <LegalDocument doc={doc} lang={lang} />
          </div>
        </article>
        <div className="mt-6 flex justify-center">
          <PoweredByFone lang={lang} />
        </div>
      </div>
    </div>
  );
}
