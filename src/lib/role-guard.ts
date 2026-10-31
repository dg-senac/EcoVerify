import "server-only";
import { redirect } from "next/navigation";
import { moderatorsEnabled } from "@/lib/staff-config";
import { homeFor, isStaffExperience, type Role } from "@/lib/nav";

/**
 * Citizen screens (missions, proofs, ranking, community, perks, organizations) are not part of the
 * staff app: active moderators and admins are sent to their own home (Moderation / Admin).
 */
export function citizenOnly(role: Role): void {
  const enabled = moderatorsEnabled();
  if (isStaffExperience(role, enabled)) redirect(homeFor(role, enabled));
}
