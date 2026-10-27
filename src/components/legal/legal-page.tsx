import Link from "next/link";
import { LogoHorizontal } from "@/components/logo";
import { PoweredByFone } from "@/components/brand/fone";
import { TERMS_VERSION } from "@/lib/legal";
import { t, type Lang } from "@/lib/i18n";

export function LegalPage({ lang, title, children }: { lang: Lang; title: string; children: React.ReactNode }) {
  const note = t(lang, "legal_pt_only");
  const date = new Date(`${TERMS_VERSION}T12:00:00Z`).toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/">
            <LogoHorizontal height={36} />
          </Link>
          <nav className="flex gap-4 text-sm font-semibold text-emerald-700">
            <Link href="/termos" className="hover:underline">{t(lang, "terms_of_use")}</Link>
            <Link href="/privacidade" className="hover:underline">{t(lang, "privacy_policy")}</Link>
            <Link href="/transparencia" className="hover:underline">{t(lang, "transparency")}</Link>
          </nav>
        </div>
        <article className="card-surface rounded-3xl border border-black/5 bg-white p-6 shadow-sm md:p-10">
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h1>
          <p className="mt-1 text-xs text-slate-500">{t(lang, "legal_version").replace("{date}", date)}</p>
          {note && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{note}</p>}
          <div className="mt-6">{children}</div>
        </article>
        <div className="mt-6 flex justify-center">
          <PoweredByFone lang={lang} />
        </div>
      </div>
    </div>
  );
}
