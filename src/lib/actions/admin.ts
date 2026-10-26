"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { missions, notifications, rewardQueue, sessions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { centsToFone, foneToCents, isValidFoneAddress, isValidTxHash, normalizeHex, verifiedWallet } from "@/lib/fone";

export type AdminActionState = { error?: string; success?: boolean };

const CATEGORIES = ["planting", "donation", "recycling", "cleanup", "other"] as const;
const ROLES = ["citizen", "moderator", "admin"] as const;
const REWARD_STATUSES = ["pending", "processing", "paid", "failed"] as const;
type Category = (typeof CATEGORIES)[number];
type Role = (typeof ROLES)[number];
type RewardStatus = (typeof REWARD_STATUSES)[number];

/** Upper bounds to avoid typos turning into huge payouts (e.g. 100000 instead of 10.0). */
const MAX_POINTS_REWARD = 10_000;
const MAX_FONE_REWARD = 1_000_000;

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/missions");
  return user;
}

export async function createMissionAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await assertAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const titleEn = String(formData.get("titleEn") ?? "").trim() || null;
  const titleEs = String(formData.get("titleEs") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const descriptionEn = String(formData.get("descriptionEn") ?? "").trim() || null;
  const descriptionEs = String(formData.get("descriptionEs") ?? "").trim() || null;
  const context = String(formData.get("context") ?? "").trim() || null;
  const impact = String(formData.get("impact") ?? "").trim() || null;
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const category = String(formData.get("category") ?? "other") as Category;
  const pointsReward = Number(formData.get("pointsReward") ?? 0);
  const foneRewardNumber = Number(String(formData.get("foneReward") ?? "0").replace(",", "."));

  if (!CATEGORIES.includes(category)) return { error: "invalid" };
  if (!Number.isInteger(pointsReward) || pointsReward <= 0 || pointsReward > MAX_POINTS_REWARD) {
    return { error: "invalid" };
  }
  if (!Number.isFinite(foneRewardNumber) || foneRewardNumber < 0 || foneRewardNumber > MAX_FONE_REWARD) {
    return { error: "invalid" };
  }
  const foneReward = foneRewardNumber.toFixed(2);

  if (!title || !description || !context || !impact ||
      !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: "invalid" };
  }

  await db.insert(missions).values({
    title,
    titleEn,
    titleEs,
    description,
    descriptionEn,
    descriptionEs,
    context,
    impact,
    latitude: String(latitude),
    longitude: String(longitude),
    category,
    pointsReward,
    foneReward,
    createdBy: admin.id,
  });

  revalidatePath("/admin");
  revalidatePath("/missions");
  return { success: true };
}

export async function toggleMissionAction(missionId: string, isActive: boolean) {
  await assertAdmin();
  await db.update(missions).set({ isActive }).where(eq(missions.id, missionId));
  revalidatePath("/admin");
  revalidatePath("/missions");
}

export async function updateUserRoleAction(userId: string, role: Role) {
  const admin = await assertAdmin();
  if (admin.id === userId) return;
  if (!ROLES.includes(role)) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
  revalidatePath("/admin");
}

export async function banUserAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (admin.id === userId) return { error: "self" };
  if (!reason) return { error: "reason_required" };

  await db.transaction(async (tx) => {
    await tx.update(users).set({ isBanned: true, banReason: reason }).where(eq(users.id, userId));
    // Log the user out everywhere immediately.
    await tx.delete(sessions).where(eq(sessions.userId, userId));
  });
  revalidatePath("/admin");
  revalidatePath("/ranking");
  return { success: true };
}

export async function unbanUserAction(userId: string) {
  const admin = await assertAdmin();
  if (admin.id === userId) return;
  await db.update(users).set({ isBanned: false, banReason: null }).where(eq(users.id, userId));
  revalidatePath("/admin");
}

export async function contactUserAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!title || !message) return { error: "invalid" };

  await db.insert(notifications).values({
    userId,
    type: "admin",
    title,
    message,
  });

  revalidatePath("/admin");
  revalidatePath("/notifications");
  return { success: true };
}

/**
 * Wallet ownership check (manual until the Fone SDK / explorer API is available):
 * the admin opens the claimed address on the explorer and confirms there is an outgoing
 * transfer of exactly `walletChallengeAmount` FONE to FONE_TREASURY_ADDRESS made after the
 * request date, then pastes that transaction hash here.
 */
export async function confirmWalletAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  const txHash = normalizeHex(formData.get("txHash"));
  if (!userId) return { error: "invalid" };
  if (!isValidTxHash(txHash)) return { error: "invalid_tx" };

  const result = await db.transaction(async (tx) => {
    const [target] = await tx
      .select({ pending: users.pendingWalletAddress, amount: users.walletChallengeAmount })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!target?.pending || !isValidFoneAddress(target.pending)) return "no_request" as const;

    const [owner] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.walletAddress, target.pending), isNotNull(users.walletVerifiedAt), ne(users.id, userId)))
      .limit(1);
    if (owner) return "wallet_in_use" as const;

    const [txUsed] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.walletVerificationTx, txHash), ne(users.id, userId)))
      .limit(1);
    const [txUsedByPayout] = await tx
      .select({ id: rewardQueue.id })
      .from(rewardQueue)
      .where(eq(rewardQueue.txHash, txHash))
      .limit(1);
    if (txUsed || txUsedByPayout) return "tx_in_use" as const;

    // Old unverified/fake addresses may still sit in wallet_address: free that slot first.
    await tx
      .update(users)
      .set({ walletAddress: null })
      .where(and(eq(users.walletAddress, target.pending), isNull(users.walletVerifiedAt), ne(users.id, userId)));

    await tx
      .update(users)
      .set({
        walletAddress: target.pending,
        walletVerifiedAt: new Date(),
        walletVerifiedBy: admin.id,
        walletVerificationTx: txHash,
        pendingWalletAddress: null,
        walletChallengeAmount: null,
        walletChallengeCreatedAt: null,
        walletChallengeTx: null,
      })
      .where(eq(users.id, userId));

    await tx.insert(notifications).values({
      userId,
      type: "system",
      title: "Carteira verificada ✅",
      message: "Sua carteira FONE foi verificada. Suas recompensas em FONE serão enviadas para ela.",
    });
    return "ok" as const;
  });

  if (result !== "ok") return { error: result };
  revalidatePath("/admin");
  return { success: true };
}

export async function rejectWalletAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  if (!userId || reason.length < 5) return { error: "reason_required" };

  const updated = await db
    .update(users)
    .set({ pendingWalletAddress: null, walletChallengeAmount: null, walletChallengeCreatedAt: null, walletChallengeTx: null })
    .where(and(eq(users.id, userId), isNotNull(users.pendingWalletAddress)))
    .returning({ id: users.id });
  if (!updated.length) return { error: "no_request" };

  await db.insert(notifications).values({
    userId,
    type: "alert",
    title: "Verificação de carteira recusada",
    message: `Não conseguimos confirmar sua carteira FONE. Motivo: ${reason}. Você pode pedir uma nova verificação no seu perfil.`,
  });

  revalidatePath("/admin");
  return { success: true };
}

/**
 * Marks a batch of a user's rewards as paid with one on-chain transaction (the admin sends
 * the total to the user's verified wallet from the reward wallet, then pastes the hash).
 * Only the reward ids shown on screen are paid, so rewards approved meanwhile are not included.
 */
export async function payUserRewardsAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  const txHash = normalizeHex(formData.get("txHash"));
  const rewardIds = String(formData.get("rewardIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!userId || !rewardIds.length) return { error: "invalid" };
  if (!isValidTxHash(txHash)) return { error: "invalid_tx" };

  const result = await db.transaction(async (tx) => {
    const [target] = await tx
      .select({ walletAddress: users.walletAddress, walletVerifiedAt: users.walletVerifiedAt })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    const wallet = target ? verifiedWallet(target) : null;
    if (!wallet) return { error: "wallet_not_verified" as const };

    // The same transaction can't settle someone else's rewards or a wallet verification.
    const [usedByOther] = await tx
      .select({ id: rewardQueue.id })
      .from(rewardQueue)
      .where(and(eq(rewardQueue.txHash, txHash), ne(rewardQueue.userId, userId)))
      .limit(1);
    const [usedByWallet] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.walletVerificationTx, txHash))
      .limit(1);
    if (usedByOther || usedByWallet) return { error: "tx_in_use" as const };

    const paid = await tx
      .update(rewardQueue)
      .set({
        status: "paid",
        network: "FONE",
        txHash,
        walletAddress: wallet,
        paidAt: new Date(),
        paidBy: admin.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(rewardQueue.userId, userId),
          inArray(rewardQueue.id, rewardIds),
          inArray(rewardQueue.status, ["pending", "processing", "failed"]),
        ),
      )
      .returning({ foneAmount: rewardQueue.foneAmount });
    if (!paid.length) return { error: "nothing_to_pay" as const };

    const totalCents = paid.reduce((sum, row) => sum + foneToCents(row.foneAmount), 0);
    await tx.insert(notifications).values({
      userId,
      type: "system",
      title: "FONE enviado! 🪙",
      message: `Enviamos ${centsToFone(totalCents)} FONE para a sua carteira. Transação: ${txHash}`,
    });
    return { ok: true as const };
  });

  if ("error" in result) return { error: result.error };
  revalidatePath("/admin");
  revalidatePath("/profile");
  return { success: true };
}

/** Moves a user's open rewards to "processing" (being sent) or "failed" (send failed, retry later). */
export async function setRewardsStatusAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  const rewardIds = String(formData.get("rewardIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!userId || !rewardIds.length || (status !== "processing" && status !== "failed" && status !== "pending")) {
    return { error: "invalid" };
  }

  await db
    .update(rewardQueue)
    .set({ status: status as Exclude<RewardStatus, "paid">, updatedAt: new Date() })
    .where(
      and(
        eq(rewardQueue.userId, userId),
        inArray(rewardQueue.id, rewardIds),
        inArray(rewardQueue.status, ["pending", "processing", "failed"]),
      ),
    );

  revalidatePath("/admin");
  return { success: true };
}
