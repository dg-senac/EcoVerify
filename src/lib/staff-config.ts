/**
 * Moderation is admin-only by default. MODERATORS_ENABLED=true lets users with the "moderator" role
 * review proofs and give yellow cards (never red cards, suspensions, bans or FONE).
 */
export function moderatorsEnabled(): boolean {
  return (process.env.MODERATORS_ENABLED || "").trim().toLowerCase() === "true";
}
