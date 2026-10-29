/** Plan names and price labels (PT/EN/ES), shared by the app and the offline demo. */
import type { Lang } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";

export interface PlanText {
  planNames: Record<PlanId, string>;
  members: (n: number | null) => string;
  missions: (n: number | null) => string;
  monthly: string;
  yearly: string;
  yearlyBadge: string;
  perMonth: string;
  perYear: string;
  free: string;
}

export const PLAN_TEXT: Record<Lang, PlanText> = {
  pt: {
    planNames: { free: "Comunidade", school: "Escola", business: "Empresa", government: "Prefeitura" },
    members: (n) => (n === null ? "Participantes ilimitados" : `Até ${n.toLocaleString("pt-BR")} participantes`),
    missions: (n) => (n === null ? "Missões ilimitadas" : `${n} missões ativas`),
    monthly: "Mensal",
    yearly: "Anual",
    yearlyBadge: "2 meses grátis",
    perMonth: "/mês",
    perYear: "/ano",
    free: "Grátis",
  },
  en: {
    planNames: { free: "Community", school: "School", business: "Business", government: "City hall" },
    members: (n) => (n === null ? "Unlimited participants" : `Up to ${n.toLocaleString("en-US")} participants`),
    missions: (n) => (n === null ? "Unlimited missions" : `${n} active missions`),
    monthly: "Monthly",
    yearly: "Yearly",
    yearlyBadge: "2 months free",
    perMonth: "/mo",
    perYear: "/yr",
    free: "Free",
  },
  es: {
    planNames: { free: "Comunidad", school: "Escuela", business: "Empresa", government: "Municipio" },
    members: (n) => (n === null ? "Participantes ilimitados" : `Hasta ${n.toLocaleString("es-ES")} participantes`),
    missions: (n) => (n === null ? "Misiones ilimitadas" : `${n} misiones activas`),
    monthly: "Mensual",
    yearly: "Anual",
    yearlyBadge: "2 meses gratis",
    perMonth: "/mes",
    perYear: "/año",
    free: "Gratis",
  },
};
