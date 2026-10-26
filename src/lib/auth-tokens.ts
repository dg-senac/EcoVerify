import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { authTokens } from "@/db/schema";

export type TokenPurpose = "verify_email" | "reset_password";

export const TOKEN_TTL_MS: Record<TokenPurpose, number> = {
  verify_email: 48 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Creates a one-time token (previous unused ones of the same purpose stop working). */
export async function createAuthToken(userId: string, purpose: TokenPurpose): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  await db.transaction(async (tx) => {
    await tx
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(authTokens.userId, userId), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt)));
    await tx.insert(authTokens).values({
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS[purpose]),
    });
  });
  return token;
}

/** Marks the token as used and returns its user, or null when invalid, expired or already used. */
export async function consumeAuthToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.purpose, purpose),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: authTokens.userId });
  return row?.userId ?? null;
}

/** Checks a token without using it (to show the reset form only for valid links). */
export async function peekAuthToken(token: string, purpose: TokenPurpose): Promise<boolean> {
  if (!TOKEN_PATTERN.test(token)) return false;
  const [row] = await db
    .select({ id: authTokens.id })
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        eq(authTokens.purpose, purpose),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return !!row;
}
