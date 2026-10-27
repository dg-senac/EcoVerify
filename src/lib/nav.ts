import type { DictKey } from "@/lib/i18n";
import type { LucideIcon } from "lucide-react";
import { Sprout, FileText, Trophy, MessageSquare, Shield, BarChart3, Bell, User, Settings, Building2 } from "@/components/ui/icons";

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
  { href: "/org", labelKey: "nav_orgs", icon: Building2, roles: ["citizen", "moderator", "admin"] },
  { href: "/moderation", labelKey: "nav_moderation", icon: Shield, roles: ["moderator", "admin"] },
  { href: "/admin", labelKey: "nav_admin", icon: BarChart3, roles: ["admin"] },
  { href: "/notifications", labelKey: "nav_notifications", icon: Bell, roles: ["citizen", "moderator", "admin"] },
  { href: "/profile", labelKey: "nav_profile", icon: User, roles: ["citizen", "moderator", "admin"] },
  { href: "/settings", labelKey: "nav_settings", icon: Settings, roles: ["citizen", "moderator", "admin"] },
];

export const MOBILE_PRIMARY_HREFS = ["/missions", "/submissions", "/ranking", "/community"];
