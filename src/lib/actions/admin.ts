"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { missions, notifications, rewardQueue, sessions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

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

export async function updateRewardAction(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await assertAdmin();
  const rewardId = String(formData.get("rewardId") ?? "");
  const status = String(formData.get("status") ?? "pending") as RewardStatus;
  const network = String(formData.get("network") ?? "").trim();
  const txHash = String(formData.get("txHash") ?? "").trim();

  if (!rewardId || !REWARD_STATUSES.includes(status)) return { error: "invalid" };
  // A payout can only be marked as paid with the on-chain transaction hash as proof.
  if (status === "paid" && txHash.length < 10) return { error: "tx_hash_required" };

  await db
    .update(rewardQueue)
    .set({
      status,
      network: network || null,
      txHash: txHash || null,
      updatedAt: new Date(),
    })
    .where(eq(rewardQueue.id, rewardId));

  revalidatePath("/admin");
  return { success: true };
}
