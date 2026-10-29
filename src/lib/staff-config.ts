/**
 * Staff settings read from the server environment (no database needed).
 *
 * - MODERATORS_ENABLED: moderation is admin-only by default. "true" lets users with the "moderator"
 *   role review proofs and give yellow cards (never red cards, suspensions, bans or FONE).
 * - ADMIN_EMAILS: the owner accounts (comma separated). An account with one of these e-mails becomes
 *   admin automatically once the e-mail is confirmed, can't be demoted, banned or carded from the
 *   panel and, while the list is set, only these accounts can be admins.
 * - ALLOW_SEED_ACCOUNTS: the seed accounts (@ecoverify.dev, known password) can't sign in in
 *   production unless this is "true" (only for a throwaway demo server).
 */
export function moderatorsEnabled(): boolean {
  return flag(process.env.MODERATORS_ENABLED);
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(/[,;\s]+/)
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"));
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  return !!email && adminEmails().includes(email.trim().toLowerCase());
}

/** With ADMIN_EMAILS set, the admin role is reserved for those accounts. */
export function canHoldAdminRole(email: string | null | undefined): boolean {
  return adminEmails().length === 0 || isOwnerEmail(email);
}

export const SEED_EMAIL_DOMAIN = "@ecoverify.dev";

export function isSeedEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith(SEED_EMAIL_DOMAIN);
}

export function seedAccountsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || flag(process.env.ALLOW_SEED_ACCOUNTS);
}

function flag(value: string | undefined): boolean {
  return ["true", "1", "yes"].includes((value || "").trim().toLowerCase());
}
