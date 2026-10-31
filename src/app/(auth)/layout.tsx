import Link from "next/link";
import { LogoHorizontal } from "@/components/logo";
import { PoweredByFone } from "@/components/brand/fone";
import { t } from "@/lib/i18n";
import { guestLang } from "@/lib/guest-lang";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const lang = await guestLang();
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div className="mb-8 animate-fade-in">
          <LogoHorizontal height={44} />
        </div>
        <div className="w-full max-w-md animate-slide-up">{children}</div>
      </div>
      <footer className="flex flex-col items-center gap-3 pb-6 text-center text-xs text-slate-400">
        <PoweredByFone lang={lang} />
        <nav className="flex gap-4 font-medium text-slate-500">
          <Link href="/termos" className="hover:underline">{t(lang, "terms_of_use")}</Link>
          <Link href="/privacidade" className="hover:underline">{t(lang, "privacy_policy")}</Link>
          <Link href="/transparencia" className="hover:underline">{t(lang, "transparency")}</Link>
        </nav>
        <p>© {new Date().getFullYear()} EcoVerify · {t(lang, "tagline")}</p>
      </footer>
    </div>
  );
}
