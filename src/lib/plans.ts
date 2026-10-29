/**
 * EcoVerify for organizations: plans, prices and limits.
 *
 * Citizens always use EcoVerify for free. Revenue comes from organizations (schools, companies,
 * city halls, NGOs) that run their own space with private missions, ranking and impact reports,
 * and from brand campaigns (sponsored missions) that pay a service fee on top of the budget.
 *
 * Pure module: shared by the server and the offline demo.
 */
import type { Lang } from "@/lib/i18n";

export type PlanId = "free" | "school" | "business" | "government";
export type BillingCycle = "monthly" | "yearly";

export type PlanFeature =
  | "ranking"
  | "public_page"
  | "reports"
  | "certificates"
  | "team_moderation"
  | "branding"
  | "csv_export"
  | "sponsored_fone"
  | "city_demand"
  | "priority_support";

export interface Plan {
  id: PlanId;
  /** BRL cents per month. null = "talk to us". */
  monthlyCents: number | null;
  /** BRL cents per year (≈ 2 months free). null = "talk to us". */
  yearlyCents: number | null;
  /** null = unlimited. */
  maxMembers: number | null;
  maxActiveMissions: number | null;
  features: PlanFeature[];
  highlight?: boolean;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    monthlyCents: 0,
    yearlyCents: 0,
    maxMembers: 30,
    maxActiveMissions: 3,
    features: ["ranking", "public_page"],
  },
  school: {
    id: "school",
    monthlyCents: 7900,
    yearlyCents: 79000,
    maxMembers: 600,
    maxActiveMissions: null,
    features: ["ranking", "public_page", "reports", "certificates", "team_moderation"],
    highlight: true,
  },
  business: {
    id: "business",
    monthlyCents: 34900,
    yearlyCents: 349000,
    maxMembers: 2000,
    maxActiveMissions: null,
    features: ["ranking", "public_page", "reports", "certificates", "team_moderation", "branding", "csv_export", "sponsored_fone"],
  },
  government: {
    id: "government",
    monthlyCents: null,
    yearlyCents: null,
    maxMembers: null,
    maxActiveMissions: null,
    features: [
      "ranking",
      "public_page",
      "reports",
      "certificates",
      "team_moderation",
      "branding",
      "csv_export",
      "sponsored_fone",
      "city_demand",
      "priority_support",
    ],
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "school", "business", "government"];
export const PAID_PLANS: PlanId[] = ["school", "business"];

/** Days of free trial of a paid plan for a new organization. */
export const TRIAL_DAYS = 14;
/** Days after the period ends before the organization falls back to the free plan limits. */
export const GRACE_DAYS = 5;
/** Service fee EcoVerify charges on top of a brand campaign's reward budget. */
export const CAMPAIGN_FEE_PERCENT = 20;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

export function planPrice(plan: PlanId, cycle: BillingCycle): number | null {
  return cycle === "monthly" ? PLANS[plan].monthlyCents : PLANS[plan].yearlyCents;
}

export function formatBRL(cents: number, lang: Lang = "pt"): string {
  return (cents / 100).toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

export function campaignFeeCents(budgetCents: number): number {
  return Math.round((budgetCents * CAMPAIGN_FEE_PERCENT) / 100);
}

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export interface SubscriptionLike {
  plan: PlanId;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: Date | string | null;
}

/**
 * The plan whose limits apply right now. A paid plan stays in effect until the period ends plus
 * GRACE_DAYS; after that (or when canceled and expired) the organization uses the free limits.
 */
export function effectivePlan(sub: SubscriptionLike | null | undefined, now: Date = new Date()): PlanId {
  if (!sub || sub.plan === "free") return "free";
  if (!sub.currentPeriodEnd) return sub.subscriptionStatus === "active" ? sub.plan : "free";
  const end = new Date(sub.currentPeriodEnd).getTime();
  const grace = sub.subscriptionStatus === "canceled" ? 0 : GRACE_DAYS * 86_400_000;
  return now.getTime() <= end + grace ? sub.plan : "free";
}

export function hasFeature(plan: PlanId, feature: PlanFeature): boolean {
  return PLANS[plan].features.includes(feature);
}

export function addPeriod(from: Date, cycle: BillingCycle): Date {
  const next = new Date(from);
  if (cycle === "yearly") next.setUTCFullYear(next.getUTCFullYear() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

/** Days left in the current period (negative when expired). */
export function daysLeft(end: Date | string | null, now: Date = new Date()): number | null {
  if (!end) return null;
  return Math.ceil((new Date(end).getTime() - now.getTime()) / 86_400_000);
}
