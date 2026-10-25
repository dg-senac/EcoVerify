"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import type { ActionState } from "@/lib/actions/auth";
import { isUniqueViolation } from "@/lib/utils";

/**
 * Accepts native FONE addresses and BEP-20 (0x…) addresses: letters and digits only,
 * 20 to 128 characters. Real ownership verification (signed message) should be added
 * once the public Fone SDK is available.
 */
const WALLET_PATTERN = /^[A-Za-z0-9]{20,128}$/;

function normalizeAddress(raw: FormDataEntryValue | null) {
  return String(raw ?? "").trim();
}

/** Saves the wallet for the user, enforcing format and "one wallet per account". */
async function saveWalletAddress(userId: string, address: string): Promise<ActionState> {
  if (!WALLET_PATTERN.test(address)) {
    return { error: "invalid_address" };
  }
  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.walletAddress, address), ne(users.id, userId)))
    .limit(1);
  if (owner) return { error: "wallet_in_use" };

  try {
    await db.update(users).set({ walletAddress: address }).where(eq(users.id, userId));
  } catch (error) {
    if (isUniqueViolation(error)) return { error: "wallet_in_use" };
    throw error;
  }
  return {};
}

function generateWalletAddress() {
  return "0xFONE" + crypto.randomBytes(16).toString("hex");
}

export async function createWalletAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await db
    .update(users)
    .set({ walletAddress: generateWalletAddress() })
    .where(eq(users.id, user.id));
  redirect("/missions");
}

export async function importWalletAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const result = await saveWalletAddress(user.id, normalizeAddress(formData.get("address")));
  if (result.error) return result;
  redirect("/missions");
}

export async function skipWalletAction() {
  redirect("/missions");
}

export async function updateWalletFromProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const result = await saveWalletAddress(user.id, normalizeAddress(formData.get("address")));
  if (result.error) return result;
  revalidatePath("/profile");
  return {};
}

export async function createWalletFromProfileAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await db
    .update(users)
    .set({ walletAddress: generateWalletAddress() })
    .where(eq(users.id, user.id));
  revalidatePath("/profile");
}
