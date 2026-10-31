import type { DictKey } from "@/lib/i18n";
import type { LucideIcon } from "lucide-react";
import { Sprout, FileText, Trophy, MessageSquare, Shield, BarChart3, Bell, User, Settings, Building2, Gift } from "@/components/ui/icons";

export type Role = "citizen" | "moderator" | "admin";

export type NavItem = {
  href: string;
  labelKey: DictKey;
  icon: LucideIcon;
  roles: Role[];
};

/**
 * Each role has its own app. Citizens do missions; staff (moderators and admins) do NOT get the
 * citizen experience (missions, proofs, ranking, community, perks, organizations): they only see
 * the tools of their stricter job. A moderator whose role is switched off by the platform
 * (MODERATORS_ENABLED / demo switch) has no staff powers, so they use the app as a citizen.
 */
export const NAV_ITEMS: NavItem[] = [
  // Citizen
  { href: "/missions", labelKey: "nav_missions", icon: Sprout, roles: ["citizen"] },
  { href: "/submissions", labelKey: "nav_submissions", icon: FileText, roles: ["citizen"] },
  { href: "/ranking", labelKey: "nav_ranking", icon: Trophy, roles: ["citizen"] },
  { href: "/community", labelKey: "nav_community", icon: MessageSquare, roles: ["citizen"] },
  { href: "/beneficios", labelKey: "nav_benefits", icon: Gift, roles: ["citizen"] },
  { href: "/org", labelKey: "nav_orgs", icon: Building2, roles: ["citizen"] },
  // Staff
  { href: "/admin", labelKey: "nav_admin", icon: BarChart3, roles: ["admin"] },
  { href: "/moderation", labelKey: "nav_moderation", icon: Shield, roles: ["moderator", "admin"] },
  // Everyone
  { href: "/notifications", labelKey: "nav_notifications", icon: Bell, roles: ["citizen", "moderator", "admin"] },
  { href: "/profile", labelKey: "nav_profile", icon: User, roles: ["citizen", "moderator", "admin"] },
  { href: "/settings", labelKey: "nav_settings", icon: Settings, roles: ["citizen", "moderator", "admin"] },
];

/** Bottom bar on phones: the first 4 of these that the role has (the rest go to "More"). */
export const MOBILE_PRIMARY_HREFS = ["/missions", "/submissions", "/ranking", "/community", "/admin", "/moderation", "/notifications", "/profile"];

/**
 * Who reviews proofs for the platform. Admins always; moderators only when the platform turned the
 * role on (MODERATORS_ENABLED on the server, a switch in the demo). Moderators have limited powers:
 * review proofs and give yellow cards; red cards, suspensions, bans and FONE are admin-only.
 */
export function canReview(role: Role, moderatorsEnabled: boolean): boolean {
  return role === "admin" || (role === "moderator" && moderatorsEnabled);
}

/** The experience the person gets: a moderator without an active role is treated as a citizen. */
export function experienceRole(role: Role, moderatorsEnabled: boolean): Role {
  return role === "moderator" && !moderatorsEnabled ? "citizen" : role;
}

/** True for staff with active powers: they do not get citizen screens. */
export function isStaffExperience(role: Role, moderatorsEnabled: boolean): boolean {
  return experienceRole(role, moderatorsEnabled) !== "citizen";
}

/** First screen after login (and where citizen-only screens send staff). */
export function homeFor(role: Role, moderatorsEnabled: boolean): string {
  const r = experienceRole(role, moderatorsEnabled);
  return r === "admin" ? "/admin" : r === "moderator" ? "/moderation" : "/missions";
}

export function navItemsFor(role: Role, moderatorsEnabled: boolean): NavItem[] {
  const r = experienceRole(role, moderatorsEnabled);
  // The community chat is for citizens only (even a moderator without an active role stays out).
  return NAV_ITEMS.filter((item) => item.roles.includes(r) && (item.href !== "/community" || role === "citizen"));
}

/** Splits the role's items into the phone bottom bar (up to 4) and the "More" drawer. */
export function mobileNav(items: NavItem[]): { primary: NavItem[]; more: NavItem[] } {
  const primary = items.filter((item) => MOBILE_PRIMARY_HREFS.includes(item.href)).slice(0, 4);
  return { primary, more: items.filter((item) => !primary.includes(item)) };
}
