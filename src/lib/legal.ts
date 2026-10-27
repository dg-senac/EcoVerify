/**
 * Legal settings shared by the web app and the offline demo.
 *
 * IMPORTANT: the Terms of Use and Privacy Policy texts (src/components/legal/*) are a
 * starting point written for EcoVerify's real data flows. Have them reviewed by a lawyer
 * before opening the app to the public.
 *
 * Bump TERMS_VERSION whenever the texts change in a meaningful way: every user is asked
 * to accept the new version on their next visit.
 */
export const TERMS_VERSION = "2026-11-15";

/** Minimum age to create an account. Users under 18 need their guardian's authorisation. */
export const MIN_AGE = 13;

/** Age required to link a wallet and receive FONE. */
export const FONE_MIN_AGE = 18;

export type LegalInfo = {
  /** Person or company responsible for the data (LGPD "controlador"). */
  controllerName: string;
  /** Contact for privacy requests (LGPD "encarregado"). */
  contactEmail: string | null;
};

export const DEFAULT_LEGAL_INFO: LegalInfo = { controllerName: "EcoVerify", contactEmail: null };
