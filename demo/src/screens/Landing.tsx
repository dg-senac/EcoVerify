import { Landing, type LandingStats } from "@/components/marketing/landing";
import { LeadForm } from "@/components/marketing/lead-form";
import { LangPills } from "@/components/marketing/lang-links";
import { PLAN_ORDER, type BillingCycle, type PlanId } from "@/lib/plans";
import { foneToCents } from "@/lib/fone";
import { setGuestLanguage, submitDemoLead, useLang, useStore } from "../store";

const BANNER = {
  pt: "Você está na demonstração offline do EcoVerify: nada é enviado para servidores. Toque em “Ver demo” para entrar com um perfil pronto.",
  en: "You're on EcoVerify's offline demo: nothing is sent to servers. Tap “See demo” to sign in with a ready-made profile.",
  es: "Estás en la demostración offline de EcoVerify: nada se envía a servidores. Toca “Ver demo” para entrar con un perfil listo.",
};

/** Public site of the demo (web only — the APK opens straight on the profile picker). */
export function LandingScreen() {
  const lang = useLang();
  const stats = useStore<LandingStats>((s) => {
    const approved = s.submissions.filter((x) => x.status === "approved");
    const cities = new Set(approved.map((x) => s.missions.find((m) => m.id === x.missionId)?.city).filter(Boolean));
    return {
      actions: approved.length,
      people: new Set(approved.map((x) => x.userId)).size,
      cities: cities.size,
      foneCents: s.rewards.filter((r) => r.status === "paid").reduce((sum, r) => sum + foneToCents(r.foneAmount), 0),
    };
  });
  const planHrefs = Object.fromEntries(PLAN_ORDER.map((plan) => [plan, { monthly: plan === "government" ? "#contato" : "#/entrar", yearly: plan === "government" ? "#contato" : "#/entrar" }])) as Record<
    PlanId,
    Record<BillingCycle, string>
  >;
  return (
    <Landing
      lang={lang}
      stats={stats}
      planHrefs={planHrefs}
      links={{
        login: "#/entrar",
        start: "#/entrar",
        demo: "#/tour",
        transparency: "#/transparencia",
        terms: "#/termos",
        privacy: "#/privacidade",
        contact: "#contato",
      }}
      topBanner={<p className="bg-sky-600 px-4 py-2 text-center text-xs font-medium text-white">{BANNER[lang]}</p>}
      langSwitcher={<LangPills lang={lang} onSelect={(l) => setGuestLanguage(l)} />}
      contactForm={<LeadForm lang={lang} onSubmit={async (input) => submitDemoLead(input)} />}
    />
  );
}
