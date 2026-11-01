import "server-only";
import { eq, sql } from "drizzle-orm";
import type { db as Db } from "@/db";
import { pointsLedger, users } from "@/db/schema";

type Tx = Parameters<Parameters<typeof Db.transaction>[0]>[0];

export type PointsSource = "quiz" | "dump_report" | "dump_confirm";

/**
 * Points that don't come from a mission proof (quiz, irregular-dump reports). The ledger row and the
 * user's total change together, and `refKey` is unique, so the same reward can never be paid twice.
 * Returns false when it was already paid.
 */
export async function awardPoints(
  tx: Tx,
  input: { userId: string; points: number; source: PointsSource; refKey: string },
): Promise<boolean> {
  if (input.points <= 0) return false;
  const inserted = await tx
    .insert(pointsLedger)
    .values({ userId: input.userId, points: input.points, source: input.source, refKey: input.refKey })
    .onConflictDoNothing()
    .returning({ id: pointsLedger.id });
  if (inserted.length === 0) return false;
  await tx
    .update(users)
    .set({ totalPoints: sql`${users.totalPoints} + ${input.points}` })
    .where(eq(users.id, input.userId));
  return true;
}
