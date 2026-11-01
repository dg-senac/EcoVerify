import "server-only";
import { redirect } from "next/navigation";
import { moderatorsEnabled } from "@/lib/staff-config";
import { homeFor, isStaffExperience, type Role } from "@/lib/nav";

/**
 * Citizen screens (missions, proofs, ranking, community, perks, organizations) are for citizens and
 * moderators (who also get Moderation). The admin is sent to the admin panel.
 */
export function citizenOnly(role: Role): void {
  const enabled = moderatorsEnabled();
  if (isStaffExperience(role, enabled)) redirect(homeFor(role, enabled));
}
