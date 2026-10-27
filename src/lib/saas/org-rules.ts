/**
 * Organization rules (pure): slugs, invite codes, roles and plan limits.
 * Shared by the server (src/lib/saas/orgs.ts, src/lib/actions/orgs.ts) and the offline demo.
 */
import { effectivePlan, hasFeature, PLANS, TRIAL_DAYS, type BillingCycle, type PlanFeature, type PlanId, type SubscriptionLike } from "@/lib/plans";

export const ORG_TYPES = ["school", "business", "government", "ngo", "other"] as const;
export type OrgType = (typeof ORG_TYPES)[number];
export type OrgRole = "owner" | "manager" | "member";

export function isOrgType(value: unknown): value is OrgType {
  return typeof value === "string" && (ORG_TYPES as readonly string[]).includes(value);
}

/** Slugs that would clash with routes under /org. */
const RESERVED_SLUGS = new Set(["nova", "entrar", "new", "join"]);

export function slugify(name: string): string {
  const slug =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "org";
  return RESERVED_SLUGS.has(slug) ? `${slug}-org` : slug;
}

/** 8 characters without look-alikes (0/O, 1/I/L). */
export function newInviteCode(random: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += alphabet[Math.floor(random() * alphabet.length)];
  return code;
}

export function normalizeInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export function canManage(role: OrgRole | null | undefined): boolean {
  return role === "owner" || role === "manager";
}

export interface OrgLike extends SubscriptionLike {
  trialUsed?: boolean;
}

export function orgPlan(org: OrgLike, now: Date = new Date()): PlanId {
  return effectivePlan(org, now);
}

export function orgHas(org: OrgLike, feature: PlanFeature, now: Date = new Date()): boolean {
  return hasFeature(orgPlan(org, now), feature);
}

export type LimitError = "member_limit" | "mission_limit";

export function canAddMember(org: OrgLike, currentMembers: number, now: Date = new Date()): LimitError | null {
  const max = PLANS[orgPlan(org, now)].maxMembers;
  return max !== null && currentMembers >= max ? "member_limit" : null;
}

export function canActivateMission(org: OrgLike, activeMissions: number, now: Date = new Date()): LimitError | null {
  const max = PLANS[orgPlan(org, now)].maxActiveMissions;
  return max !== null && activeMissions >= max ? "mission_limit" : null;
}

/** Managers besides the owner need the team moderation feature. */
export function canPromote(org: OrgLike, now: Date = new Date()): boolean {
  return orgHas(org, "team_moderation", now);
}

/** Initial subscription of a new organization: a paid plan starts as a free trial (once). */
export function initialSubscription(plan: PlanId, cycle: BillingCycle, now: Date = new Date()) {
  if (plan === "free" || plan === "government") {
    return { plan: "free" as PlanId, billingCycle: cycle, subscriptionStatus: "active" as const, currentPeriodEnd: null, trialUsed: false };
  }
  return {
    plan,
    billingCycle: cycle,
    subscriptionStatus: "trialing" as const,
    currentPeriodEnd: new Date(now.getTime() + TRIAL_DAYS * 86_400_000),
    trialUsed: true,
  };
}

/** Quick check for brand colours entered by organizations. */
export function cleanHexColor(raw: string | null | undefined): string | null {
  const value = String(raw ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : null;
}
