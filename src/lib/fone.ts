/**
 * Everything specific to the Fone Protocol blockchain lives here, so the rest of the app
 * doesn't depend on address formats or explorer URLs.
 *
 * Formats observed on the official explorer (https://fone.dev/explorer, Oct 2026):
 * - native wallet address: 64 hexadecimal characters starting with "f"
 *   (e.g. f5a25eaa99e1cca13bb25c7a9b18eb58bada3aaeab68b52d0d58a7b3aa9adde3)
 * - transaction hash: 64 hexadecimal characters
 * - FONE amounts use 2 decimal places
 *
 * TODO(fone-sdk): when Fone publishes the SDK / explorer API, add automatic checks here
 * (find the verification transfer, confirm payout transactions) and drop the manual steps.
 */

export const FONE_ADDRESS_PATTERN = /^f[0-9a-f]{63}$/;
export const FONE_TX_HASH_PATTERN = /^[0-9a-f]{64}$/;

export const FONE_WALLET_ANDROID_URL = "https://play.google.com/store/apps/details?id=com.cloud.earning";
export const FONE_WALLET_IOS_URL = "https://apps.apple.com/us/app/fone-network/id1665915235";
export const FONE_SITE_URL = "https://fone.dev";

const DEFAULT_EXPLORER_URL = "https://fone.dev";

/** How long a wallet verification request stays valid. */
export const WALLET_CHALLENGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Addresses and hashes are case-insensitive hex: store them lowercase, without spaces. */
export function normalizeHex(raw: unknown): string {
  return String(raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

export function isValidFoneAddress(value: string | null | undefined): value is string {
  return !!value && FONE_ADDRESS_PATTERN.test(value);
}

export function isValidTxHash(value: string | null | undefined): value is string {
  return !!value && FONE_TX_HASH_PATTERN.test(value);
}

function explorerBase(explorerUrl?: string) {
  return (explorerUrl || DEFAULT_EXPLORER_URL).replace(/\/+$/, "");
}

export function explorerAddressUrl(address: string, explorerUrl?: string) {
  return `${explorerBase(explorerUrl)}/address/${address}`;
}

export function explorerTxUrl(hash: string, explorerUrl?: string) {
  return `${explorerBase(explorerUrl)}/tx/${hash}`;
}

/** "f5a25eaa…9adde3" */
export function shortHex(value: string, head = 8, tail = 6) {
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/**
 * Picks the exact amount (in hundredths of FONE) the user must send to prove wallet ownership.
 * It must be unique among open requests so each transfer maps to exactly one account:
 * 1.01–1.99 FONE first, then 2.00–9.99 FONE when those are taken.
 */
export function pickChallengeCents(taken: Set<number>, random: () => number = Math.random): number | null {
  for (const [min, max] of [
    [101, 199],
    [200, 999],
  ]) {
    const free: number[] = [];
    for (let cents = min; cents <= max; cents++) if (!taken.has(cents)) free.push(cents);
    if (free.length) return free[Math.floor(random() * free.length)];
  }
  return null;
}

export function centsToFone(cents: number) {
  return (cents / 100).toFixed(2);
}

export function foneToCents(value: string | number) {
  return Math.round(Number(value) * 100);
}

export function isChallengeExpired(createdAt: Date, now = Date.now()) {
  return now - createdAt.getTime() > WALLET_CHALLENGE_TTL_MS;
}

export type WalletState =
  | { kind: "none"; hasLegacyAddress: boolean }
  | {
      kind: "pending";
      address: string;
      amount: string;
      createdAt: Date;
      expired: boolean;
      reportedTx: string | null;
    };

type WalletFields = {
  walletAddress: string | null;
  walletVerifiedAt: Date | null;
  pendingWalletAddress: string | null;
  walletChallengeAmount: string | null;
  walletChallengeCreatedAt: Date | null;
  walletChallengeTx: string | null;
};

/** The verified wallet (receives payouts), or null. Unverified legacy addresses are ignored. */
export function verifiedWallet(user: Pick<WalletFields, "walletAddress" | "walletVerifiedAt">): string | null {
  return user.walletVerifiedAt && isValidFoneAddress(user.walletAddress) ? user.walletAddress : null;
}

/** State of the in-progress wallet link request (independent from the verified wallet). */
export function walletRequestState(user: WalletFields, now = Date.now()): WalletState {
  if (user.pendingWalletAddress && user.walletChallengeAmount && user.walletChallengeCreatedAt) {
    return {
      kind: "pending",
      address: user.pendingWalletAddress,
      amount: user.walletChallengeAmount,
      createdAt: user.walletChallengeCreatedAt,
      expired: isChallengeExpired(user.walletChallengeCreatedAt, now),
      reportedTx: user.walletChallengeTx,
    };
  }
  // Addresses saved before verification existed (or the old fake "0xFONE…" ones) are not trusted.
  return { kind: "none", hasLegacyAddress: !!user.walletAddress && !user.walletVerifiedAt };
}
