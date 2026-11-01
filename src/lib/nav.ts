import type { DictKey } from "@/lib/i18n";
import type { LucideIcon } from "lucide-react";
import { Sprout, FileText, Trophy, MessageSquare, Shield, BarChart3, Bell, User, Settings, Building2, Gift, Brain, MapPinCheck, Map as MapIcon } from "@/components/ui/icons";

export type Role = "citizen" | "moderator" | "admin";

export type NavItem = {
  href: string;
  labelKey: DictKey;
  icon: LucideIcon;
  roles: Role[];
};

/**
 * Citizens and moderators use the same app (missions, proofs, ranking, community, perks,
 * organizations). Moderators are trusted members of the team, chosen by the admin in Admin → Users:
 * besides the citizen app they get the Moderation screen (never their own proofs). The admin has
 * only the admin tools (no missions, ranking or chat).
 */
const PEOPLE: Role[] = ["citizen", "moderator"];
export const NAV_ITEMS: NavItem[] = [
  // Citizens and moderators
  { href: "/missions", labelKey: "nav_missions", icon: Sprout, roles: PEOPLE },
  { href: "/submissions", labelKey: "nav_submissions", icon: FileText, roles: PEOPLE },
  { href: "/ranking", labelKey: "nav_ranking", icon: Trophy, roles: PEOPLE },
  { href: "/community", labelKey: "nav_community", icon: MessageSquare, roles: PEOPLE },
  { href: "/quiz", labelKey: "nav_quiz", icon: Brain, roles: PEOPLE },
  { href: "/lixo", labelKey: "nav_dumps", icon: MapPinCheck, roles: PEOPLE },
  { href: "/mapa", labelKey: "nav_map", icon: MapIcon, roles: PEOPLE },
  { href: "/beneficios", labelKey: "nav_benefits", icon: Gift, roles: PEOPLE },
  { href: "/org", labelKey: "nav_orgs", icon: Building2, roles: PEOPLE },
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
 * Who reviews proofs for the platform. Admins always; moderators unless the platform switched the
 * role off (MODERATORS_ENABLED=false on the server, a switch in the demo). Moderators have limited
 * powers: review proofs and give yellow cards; red cards, suspensions, bans and FONE are admin-only.
 */
export function canReview(role: Role, moderatorsEnabled: boolean): boolean {
  return role === "admin" || (role === "moderator" && moderatorsEnabled);
}

/** Citizens and moderators take part (missions, ranking, chat...); the admin doesn't. */
export function isParticipant(role: Role): boolean {
  return role !== "admin";
}

/** True for the admin: no citizen screens. Moderators use the citizen app plus Moderation. */
export function isStaffExperience(role: Role, _moderatorsEnabled?: boolean): boolean {
  return !isParticipant(role);
}

/** First screen after login (and where citizen screens send the admin). */
export function homeFor(role: Role, _moderatorsEnabled?: boolean): string {
  return role === "admin" ? "/admin" : "/missions";
}

export function navItemsFor(role: Role, moderatorsEnabled: boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role) && (item.href !== "/moderation" || canReview(role, moderatorsEnabled)));
}

/** Splits the role's items into the phone bottom bar (up to 4) and the "More" drawer. */
export function mobileNav(items: NavItem[]): { primary: NavItem[]; more: NavItem[] } {
  const primary = items.filter((item) => MOBILE_PRIMARY_HREFS.includes(item.href)).slice(0, 4);
  return { primary, more: items.filter((item) => !primary.includes(item)) };
}
