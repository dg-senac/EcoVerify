import { headers } from "next/headers";
import type { Lang } from "@/lib/i18n";
import type { SessionUser } from "@/lib/auth";
import { Landing } from "@/components/marketing/landing";
import { LeadForm } from "@/components/marketing/lead-form";
import { LangPills } from "@/components/marketing/lang-links";
import { submitLeadAction } from "@/lib/actions/leads";
import { publicStats } from "@/lib/saas/public-stats";
import { demoUrl, salesConfig } from "@/lib/saas/sales-config";
import { PLAN_ORDER, type BillingCycle, type PlanId } from "@/lib/plans";

export async function pickLandingLang(param: string | undefined, user: SessionUser | null): Promise<Lang> {
  if (param === "pt" || param === "en" || param === "es") return param;
  if (user) return user.language;
  const accept = ((await headers()).get("accept-language") ?? "").toLowerCase();
  if (accept.startsWith("en")) return "en";
  if (accept.startsWith("es")) return "es";
  return "pt";
}

/** The public site, used by "/" (signed out) and "/sobre" (everyone). */
export async function LandingPage({ lang, user, path }: { lang: Lang; user: SessionUser | null; path: string }) {
  const stats = await publicStats();
  const { whatsappUrl } = salesConfig();
  const planHrefs = Object.fromEntries(
    PLAN_ORDER.map((plan) => [
      plan,
      {
        monthly: plan === "government" ? "#contato" : `/org/nova?plan=${plan}&cycle=monthly`,
        yearly: plan === "government" ? "#contato" : `/org/nova?plan=${plan}&cycle=yearly`,
      },
    ]),
  ) as Record<PlanId, Record<BillingCycle, string>>;

  return (
    <Landing
      lang={lang}
      stats={stats}
      planHrefs={planHrefs}
      links={{
        login: "/login",
        start: "/org/nova",
        demo: demoUrl(lang),
        transparency: `/transparencia?lang=${lang}`,
        terms: "/termos",
        privacy: "/privacidade",
        contact: "#contato",
        app: user ? "/missions" : undefined,
      }}
      langSwitcher={<LangPills lang={lang} hrefFor={(l) => `${path}?lang=${l}`} />}
      contactForm={<LeadForm lang={lang} onSubmit={submitLeadAction} whatsappUrl={whatsappUrl} />}
    />
  );
}
