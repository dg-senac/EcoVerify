"use server";

import { redirect } from "next/navigation";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { revalidatePath } from "next/cache";
import { and, eq, gt, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { notifications, rewardQueue, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import type { ActionState } from "@/lib/actions/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isEmailVerificationRequired } from "@/lib/email";
import {
  WALLET_CHALLENGE_TTL_MS,
  centsToFone,
  foneToCents,
  isValidFoneAddress,
  isValidTxHash,
  normalizeHex,
  pickChallengeCents,
} from "@/lib/fone";

/**
 * Wallet linking without the (not yet public) Fone SDK:
 *
 * 1. The user (18+) enters the address of the wallet they own in the Fone Wallet app.
 * 2. We assign a unique exact amount (e.g. 1.37 FONE).
 * 3. The user sends that amount FROM that wallet TO the EcoVerify verification address.
 *    Only the owner can sign a transfer from the address, so this proves ownership.
 * 4. An admin checks the transfer on the explorer and confirms (see confirmWalletAction).
 *
 * The verified wallet (users.walletAddress) keeps receiving payouts until a new one is verified.
 */

const LINK_LIMIT_PER_DAY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isBanned) redirect("/login");
  return user;
}

function refresh() {
  revalidatePath("/profile");
  revalidatePath("/wallet-setup");
}

/** Exact amounts currently reserved by open (non-expired) requests. */
async function takenChallengeCents(excludeUserId: string) {
  const since = new Date(Date.now() - WALLET_CHALLENGE_TTL_MS);
  const rows = await db
    .select({ amount: users.walletChallengeAmount })
    .from(users)
    .where(
      and(
        isNotNull(users.pendingWalletAddress),
        gt(users.walletChallengeCreatedAt, since),
        ne(users.id, excludeUserId),
      ),
    );
  return new Set(rows.filter((r) => r.amount).map((r) => foneToCents(r.amount!)));
}

export async function linkWalletAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!PAYMENTS_ENABLED) return { error: "unavailable" };
  const user = await requireUser();
  const address = normalizeHex(formData.get("address"));
  const adult = formData.get("adult") === "on";

  if (!user.adultDeclaredAt && !adult) return { error: "adult_required" };
  if (!isValidFoneAddress(address)) return { error: "invalid_address" };
  // Rewards are tied to a reachable, confirmed account (anti-multi-account and account recovery).
  if (isEmailVerificationRequired() && !user.emailVerifiedAt) return { error: "email_required" };
  if (user.walletVerifiedAt && user.walletAddress === address) return { error: "already_verified" };
  if (!rateLimit(`wallet-link:${user.id}`, LINK_LIMIT_PER_DAY, DAY_MS)) return { error: "too_many_attempts" };

  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.walletAddress, address), isNotNull(users.walletVerifiedAt), ne(users.id, user.id)))
    .limit(1);
  if (owner) return { error: "wallet_in_use" };

  const cents = pickChallengeCents(await takenChallengeCents(user.id));
  if (cents === null) return { error: "try_later" };

  await db
    .update(users)
    .set({
      pendingWalletAddress: address,
      walletChallengeAmount: centsToFone(cents),
      walletChallengeCreatedAt: new Date(),
      walletChallengeTx: null,
      adultDeclaredAt: user.adultDeclaredAt ?? new Date(),
    })
    .where(eq(users.id, user.id));

  refresh();
  return { success: true };
}

/** The user tells us which transaction they sent (optional, makes the admin check faster). */
export async function reportWalletTxAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const hash = normalizeHex(formData.get("txHash"));
  if (!user.pendingWalletAddress) return { error: "no_request" };
  if (!isValidTxHash(hash)) return { error: "invalid_tx" };

  const [usedByWallet] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.walletVerificationTx, hash))
    .limit(1);
  const [usedByPayout] = await db
    .select({ id: rewardQueue.id })
    .from(rewardQueue)
    .where(eq(rewardQueue.txHash, hash))
    .limit(1);
  if (usedByWallet || usedByPayout) return { error: "tx_in_use" };

  await db.update(users).set({ walletChallengeTx: hash }).where(eq(users.id, user.id));

  // Let the admins know there is a transfer to check.
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isBanned, false), eq(users.notificationsEnabled, true)));
  if (admins.length) {
    await db.insert(notifications).values(
      admins.map((admin) => ({
        userId: admin.id,
        type: "admin" as const,
        title: "Carteira aguardando verificação",
        message: `${user.name} informou a transação de verificação da carteira. Confira em Admin → Carteiras.`,
      })),
    );
  }

  refresh();
  return { success: true };
}

/** New exact amount (e.g. after the 7-day window expired). */
export async function renewWalletChallengeAction(): Promise<ActionState> {
  const user = await requireUser();
  if (!user.pendingWalletAddress) return { error: "no_request" };
  if (!rateLimit(`wallet-link:${user.id}`, LINK_LIMIT_PER_DAY, DAY_MS)) return { error: "too_many_attempts" };
  const cents = pickChallengeCents(await takenChallengeCents(user.id));
  if (cents === null) return { error: "try_later" };
  await db
    .update(users)
    .set({ walletChallengeAmount: centsToFone(cents), walletChallengeCreatedAt: new Date(), walletChallengeTx: null })
    .where(eq(users.id, user.id));
  refresh();
  return { success: true };
}

export async function cancelWalletRequestAction(): Promise<ActionState> {
  const user = await requireUser();
  await db
    .update(users)
    .set({ pendingWalletAddress: null, walletChallengeAmount: null, walletChallengeCreatedAt: null, walletChallengeTx: null })
    .where(eq(users.id, user.id));
  refresh();
  return { success: true };
}

export async function skipWalletAction() {
  redirect("/missions");
}
