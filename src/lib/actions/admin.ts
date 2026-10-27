"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { aiSettings, foneSettings, missions, notifications, rewardQueue, sessions, sponsorTopups, sponsors, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { placeOf } from "@/lib/municipalities";
import { getPayoutSettings } from "@/lib/payouts";
import { isHoldReason, splitOpenRewards } from "@/lib/payout-rules";
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
  const aiChecklist = String(formData.get("aiChecklist") ?? "").trim().slice(0, 500) || null;
  const scope = formData.get("scope") === "anywhere" ? "anywhere" : "local";
  let sponsorName = String(formData.get("sponsorName") ?? "").trim().slice(0, 80) || null;
  // A registered sponsor pays the FONE of this mission from its own budget.
  const sponsorIdInput = String(formData.get("sponsorId") ?? "").trim();
  let sponsorId: string | null = null;
  if (sponsorIdInput) {
    if (!/^[0-9a-f-]{36}$/i.test(sponsorIdInput)) return { error: "invalid" };
    const [sponsor] = await db.select({ id: sponsors.id, name: sponsors.name }).from(sponsors).where(eq(sponsors.id, sponsorIdInput)).limit(1);
    if (!sponsor) return { error: "invalid" };
    sponsorId = sponsor.id;
    sponsorName = sponsor.name;
  }
  const coordinate = (name: string) => {
    const raw = String(formData.get(name) ?? "").trim().replace(",", ".");
    return raw === "" ? NaN : Number(raw);
  };
  const latitude = coordinate("latitude");
  const longitude = coordinate("longitude");
  const hasPoint = Number.isFinite(latitude) && Number.isFinite(longitude);
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

  if (!title || !description || !context || !impact) return { error: "invalid" };
  // Local missions need a point; "anywhere" missions may have one (shown as a reference only).
  if (scope === "local" && !hasPoint) return { error: "invalid" };
  if (hasPoint && (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
    return { error: "invalid" };
  }
  const place = hasPoint && scope === "local" ? placeOf(latitude, longitude) : null;

  await db.insert(missions).values({
    title,
    titleEn,
    titleEs,
    description,
    descriptionEn,
    descriptionEs,
    context,
    impact,
    aiChecklist,
    latitude: hasPoint ? String(latitude) : null,
    longitude: hasPoint ? String(longitude) : null,
    scope,
    city: place?.city ?? null,
    stateCode: place?.stateCode ?? null,
    ibgeCode: place?.ibgeCode ?? null,
    sponsorName,
    sponsorId,
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

/**
 * Review of a mission created automatically (OpenStreetMap) or from a community suggestion.
 * Until reviewed it pays points only; the admin can set a FONE reward, keep it points-only
 * (it stays visible) or switch it off.
 */
export async function reviewMissionAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await assertAdmin();
  const missionId = String(formData.get("missionId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!missionId) return { error: "invalid" };
  if (decision === "deactivate") {
    await db.update(missions).set({ isActive: false, needsReview: false }).where(eq(missions.id, missionId));
  } else if (decision === "points") {
    await db.update(missions).set({ needsReview: false }).where(eq(missions.id, missionId));
  } else if (decision === "fone") {
    const fone = Number(String(formData.get("foneReward") ?? "").replace(",", "."));
    if (!Number.isFinite(fone) || fone <= 0 || fone > MAX_FONE_REWARD) return { error: "invalid" };
    await db
      .update(missions)
      .set({ needsReview: false, foneReward: fone.toFixed(2) })
      .where(eq(missions.id, missionId));
  } else {
    return { error: "invalid" };
  }
  revalidatePath("/admin");
  revalidatePath("/missions");
  return { success: true };
}

export async function updateUserRoleAction(userId: string, role: Role) {
  const admin = await assertAdmin();
  if (admin.id === userId) return;
  if (!ROLES.includes(role)) return;
  // Accounts deleted by their owner (LGPD) are anonymised and must stay inert.
  await db.update(users).set({ role }).where(and(eq(users.id, userId), isNull(users.deletedAt)));
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
  await db.update(users).set({ isBanned: false, banReason: null }).where(and(eq(users.id, userId), isNull(users.deletedAt)));
  revalidatePath("/admin");
}

export async function contactUserAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await assertAdmin();
  const userId = String(formData.get("userId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!title || !message) return { error: "invalid" };
  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);
  if (!target) return { error: "invalid" };

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

  const settings = await getPayoutSettings();
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

    // Payout rules are enforced here too (not only on screen): only rewards past the hold
    // period, not held by a budget, and only when they reach the minimum payout.
    const open = await tx
      .select({ id: rewardQueue.id, foneAmount: rewardQueue.foneAmount, createdAt: rewardQueue.createdAt, holdReason: rewardQueue.holdReason })
      .from(rewardQueue)
      .where(
        and(
          eq(rewardQueue.userId, userId),
          inArray(rewardQueue.id, rewardIds),
          inArray(rewardQueue.status, ["pending", "processing", "failed"]),
        ),
      );
    if (!open.length) return { error: "nothing_to_pay" as const };
    const split = splitOpenRewards(open, settings);
    if (!split.payable.length) return { error: split.waiting.length ? ("in_hold" as const) : ("nothing_to_pay" as const) };
    if (split.belowMinimum) return { error: "below_min" as const };
    const payableIds = split.payable.map((reward) => reward.id);

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
          inArray(rewardQueue.id, payableIds),
          inArray(rewardQueue.status, ["pending", "processing", "failed"]),
          isNull(rewardQueue.holdReason),
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

/** Admin → IA: how the automatic photo verification behaves. */
export async function updateAiSettingsAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await assertAdmin();
  const modeInput = String(formData.get("mode") ?? "");
  const mode = (["off", "suggest", "auto"] as const).find((value) => value === modeInput);
  const approveMinConfidence = Number(formData.get("approveMinConfidence"));
  const rejectMinConfidence = Number(formData.get("rejectMinConfidence"));
  const maxFone = Number(String(formData.get("maxAutoApproveFone") ?? "").replace(",", "."));
  const validConfidence = (value: number) => Number.isInteger(value) && value >= 50 && value <= 100;
  if (!mode || !validConfidence(approveMinConfidence) || !validConfidence(rejectMinConfidence)) return { error: "invalid" };
  if (!Number.isFinite(maxFone) || maxFone < 0 || maxFone > MAX_FONE_REWARD) return { error: "invalid" };

  const values = {
    mode,
    approveMinConfidence,
    rejectMinConfidence,
    maxAutoApproveFone: maxFone.toFixed(2),
    updatedBy: admin.id,
    updatedAt: new Date(),
  };
  await db.insert(aiSettings).values({ id: 1, ...values }).onConflictDoUpdate({ target: aiSettings.id, set: values });

  revalidatePath("/admin");
  revalidatePath("/moderation");
  return { success: true };
}

const money = (value: FormDataEntryValue | null) => {
  const raw = String(value ?? "").trim().replace(",", ".");
  return raw === "" ? null : Number(raw);
};

/** Admin → Recompensas: minimum payout, hold period, monthly budget and personal cap. */
export async function updateFoneSettingsAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await assertAdmin();
  const minPayout = money(formData.get("minPayoutFone"));
  const holdDays = Number(formData.get("holdDays"));
  const budget = money(formData.get("monthlyBudgetFone"));
  const userCap = money(formData.get("maxFonePerUserMonth"));
  const validAmount = (value: number | null) => value === null || (Number.isFinite(value) && value >= 0 && value <= MAX_FONE_REWARD);
  if (minPayout === null || !validAmount(minPayout) || !validAmount(budget) || !validAmount(userCap)) return { error: "invalid" };
  if (!Number.isInteger(holdDays) || holdDays < 0 || holdDays > 90) return { error: "invalid" };

  const values = {
    minPayoutFone: minPayout.toFixed(2),
    holdDays,
    monthlyBudgetFone: budget === null ? null : budget.toFixed(2),
    maxFonePerUserMonth: userCap === null ? null : userCap.toFixed(2),
    updatedBy: admin.id,
    updatedAt: new Date(),
  };
  await db.insert(foneSettings).values({ id: 1, ...values }).onConflictDoUpdate({ target: foneSettings.id, set: values });
  revalidatePath("/admin");
  revalidatePath("/profile");
  return { success: true };
}

/** Releases rewards held by a budget/cap (e.g. after a new month, a deposit or a sponsor top-up). */
export async function releaseHeldRewardsAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await assertAdmin();
  const reason = String(formData.get("reason") ?? "");
  if (!isHoldReason(reason)) return { error: "invalid" };
  const released = await db
    .update(rewardQueue)
    .set({ holdReason: null, updatedAt: new Date() })
    .where(and(eq(rewardQueue.holdReason, reason), inArray(rewardQueue.status, ["pending", "processing", "failed"])))
    .returning({ userId: rewardQueue.userId, foneAmount: rewardQueue.foneAmount });
  const byUser = new Map<string, number>();
  for (const row of released) byUser.set(row.userId, (byUser.get(row.userId) ?? 0) + foneToCents(row.foneAmount));
  if (byUser.size) {
    await db.insert(notifications).values(
      [...byUser].map(([userId, cents]) => ({
        userId,
        type: "system" as const,
        title: "FONE liberado ✅",
        message: `${centsToFone(cents)} FONE que estava em espera voltou para a fila de pagamento.`,
      })),
    );
  }
  revalidatePath("/admin");
  revalidatePath("/profile");
  return { success: true };
}

/** Service fee received in BRL ("R$ 1.234,56" or "1234.56") → cents; empty = 0, invalid = null. */
function brlCents(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "").replace(/[R$\s]/g, "");
  if (!text) return 0;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 10_000_000) return null;
  return Math.round(value * 100);
}

/** Admin → Missões: register a sponsor (company, city hall, NGO) with a FONE budget. */
export async function createSponsorAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await assertAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const websiteRaw = String(formData.get("website") ?? "").trim();
  const budget = money(formData.get("budgetFone"));
  if (!name || budget === null || !Number.isFinite(budget) || budget < 0 || budget > MAX_FONE_REWARD) return { error: "invalid" };
  let website: string | null = null;
  if (websiteRaw) {
    try {
      const url = new URL(/^https?:\/\//i.test(websiteRaw) ? websiteRaw : `https://${websiteRaw}`);
      if (url.protocol !== "https:" && url.protocol !== "http:") return { error: "invalid" };
      website = url.toString();
    } catch {
      return { error: "invalid" };
    }
  }
  const feeCents = brlCents(formData.get("feeBrl"));
  if (feeCents === null) return { error: "invalid" };
  await db.transaction(async (tx) => {
    const [sponsor] = await tx.insert(sponsors).values({ name, website, budgetFone: budget.toFixed(2), createdBy: admin.id }).returning({ id: sponsors.id });
    await tx.insert(sponsorTopups).values({ sponsorId: sponsor.id, budgetFone: budget.toFixed(2), feeCents, note: "orçamento inicial", createdBy: admin.id });
  });
  revalidatePath("/admin");
  revalidatePath("/transparencia");
  return { success: true };
}

/** Adds FONE to a sponsor's budget (after it deposits more in the treasury) or switches it on/off. */
export async function updateSponsorAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const admin = await assertAdmin();
  const sponsorId = String(formData.get("sponsorId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(sponsorId)) return { error: "invalid" };
  const intent = String(formData.get("intent") ?? "");
  if (intent === "topup") {
    const amount = money(formData.get("amount"));
    if (amount === null || !Number.isFinite(amount) || amount <= 0 || amount > MAX_FONE_REWARD) return { error: "invalid" };
    const [sponsor] = await db.select({ budget: sponsors.budgetFone }).from(sponsors).where(eq(sponsors.id, sponsorId)).limit(1);
    if (!sponsor) return { error: "invalid" };
    const feeCents = brlCents(formData.get("feeBrl"));
    if (feeCents === null) return { error: "invalid" };
    await db.transaction(async (tx) => {
      await tx
        .update(sponsors)
        .set({ budgetFone: centsToFone(foneToCents(sponsor.budget) + foneToCents(amount)), updatedAt: new Date() })
        .where(eq(sponsors.id, sponsorId));
      await tx.insert(sponsorTopups).values({ sponsorId, budgetFone: amount.toFixed(2), feeCents, note: "recarga", createdBy: admin.id });
    });
  } else if (intent === "toggle") {
    const [sponsor] = await db.select({ isActive: sponsors.isActive }).from(sponsors).where(eq(sponsors.id, sponsorId)).limit(1);
    if (!sponsor) return { error: "invalid" };
    await db.update(sponsors).set({ isActive: !sponsor.isActive, updatedAt: new Date() }).where(eq(sponsors.id, sponsorId));
  } else {
    return { error: "invalid" };
  }
  revalidatePath("/admin");
  revalidatePath("/missions");
  revalidatePath("/transparencia");
  return { success: true };
}
