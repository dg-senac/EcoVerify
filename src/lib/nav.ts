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

export const NAV_ITEMS: NavItem[] = [
  { href: "/missions", labelKey: "nav_missions", icon: Sprout, roles: ["citizen", "moderator", "admin"] },
  { href: "/submissions", labelKey: "nav_submissions", icon: FileText, roles: ["citizen", "moderator", "admin"] },
  { href: "/ranking", labelKey: "nav_ranking", icon: Trophy, roles: ["citizen", "moderator", "admin"] },
  { href: "/community", labelKey: "nav_community", icon: MessageSquare, roles: ["citizen"] },
  { href: "/beneficios", labelKey: "nav_benefits", icon: Gift, roles: ["citizen", "moderator", "admin"] },
  { href: "/org", labelKey: "nav_orgs", icon: Building2, roles: ["citizen", "moderator", "admin"] },
  { href: "/moderation", labelKey: "nav_moderation", icon: Shield, roles: ["moderator", "admin"] },
  { href: "/admin", labelKey: "nav_admin", icon: BarChart3, roles: ["admin"] },
  { href: "/notifications", labelKey: "nav_notifications", icon: Bell, roles: ["citizen", "moderator", "admin"] },
  { href: "/profile", labelKey: "nav_profile", icon: User, roles: ["citizen", "moderator", "admin"] },
  { href: "/settings", labelKey: "nav_settings", icon: Settings, roles: ["citizen", "moderator", "admin"] },
];

export const MOBILE_PRIMARY_HREFS = ["/missions", "/submissions", "/ranking", "/community"];

/**
 * Who reviews proofs for the platform. Admins always; moderators only when the platform turned the
 * role on (MODERATORS_ENABLED on the server, a switch in the demo). Moderators have limited powers:
 * review proofs and give yellow cards; red cards, suspensions, bans and FONE are admin-only.
 */
export function canReview(role: Role, moderatorsEnabled: boolean): boolean {
  return role === "admin" || (role === "moderator" && moderatorsEnabled);
}

export function navItemsFor(role: Role, moderatorsEnabled: boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role) && (item.href !== "/moderation" || canReview(role, moderatorsEnabled)));
}
