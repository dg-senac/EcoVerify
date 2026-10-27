import type { ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { LogoHorizontal } from "@/components/logo";
import { LangPills } from "@/components/marketing/lang-links";
import { MARKETING_TEXT } from "@/lib/marketing-text";

/** Light header/footer for public pages (organization page, report, certificate). */
export function PublicShell({ lang, path, children, wide = true }: { lang: Lang; path: string; children: ReactNode; wide?: boolean }) {
  const mk = MARKETING_TEXT[lang];
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-white print:bg-white">
      <header className="border-b border-black/5 bg-white/80 backdrop-blur print:hidden">
        <div className={`mx-auto flex items-center justify-between gap-3 px-4 py-3 ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
          <a href={`/sobre?lang=${lang}`} aria-label="EcoVerify">
            <LogoHorizontal height={32} />
          </a>
          <div className="flex items-center gap-2">
            <LangPills lang={lang} hrefFor={(l) => `${path}?lang=${l}`} />
            <a href="/login" className="hidden rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-700 sm:inline">
              {mk.nav.login}
            </a>
          </div>
        </div>
      </header>
      <main className={`mx-auto px-4 py-8 ${wide ? "max-w-5xl" : "max-w-3xl"}`}>{children}</main>
      <footer className="border-t border-black/5 py-6 text-center text-xs text-slate-400 print:hidden">
        © {new Date().getFullYear()} EcoVerify · <a href={`/transparencia?lang=${lang}`} className="hover:underline">{mk.nav.transparency}</a> ·{" "}
        <a href="/privacidade" className="hover:underline">{lang === "en" ? "Privacy" : lang === "es" ? "Privacidad" : "Privacidade"}</a>
      </footer>
    </div>
  );
}
