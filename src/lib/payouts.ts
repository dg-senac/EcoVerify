import "server-only";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { foneSettings, rewardQueue, sponsors } from "@/db/schema";
import { decideHold, DEFAULT_PAYOUT_SETTINGS, monthStart, type HoldReason, type PayoutSettings } from "@/lib/payout-rules";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export async function getPayoutSettings(executor: Executor = db): Promise<PayoutSettings> {
  const [row] = await executor.select().from(foneSettings).where(eq(foneSettings.id, 1)).limit(1);
  if (!row) return DEFAULT_PAYOUT_SETTINGS;
  return {
    minPayoutFone: Number(row.minPayoutFone),
    holdDays: row.holdDays,
    monthlyBudgetFone: row.monthlyBudgetFone === null ? null : Number(row.monthlyBudgetFone),
    maxFonePerUserMonth: row.maxFonePerUserMonth === null ? null : Number(row.maxFonePerUserMonth),
  };
}

const centsOf = (value: string | null | undefined) => Math.round(Number(value ?? 0) * 100);

/** FONE committed by a sponsor's rewards (held ones don't count). */
export async function sponsorSpentCents(executor: Executor, sponsorId: string): Promise<number> {
  const [row] = await executor
    .select({ sum: sql<string>`coalesce(sum(${rewardQueue.foneAmount}), 0)::text` })
    .from(rewardQueue)
    .where(and(eq(rewardQueue.sponsorId, sponsorId), isNull(rewardQueue.holdReason)));
  return centsOf(row?.sum);
}

/**
 * Called inside the approval transaction, before the reward is inserted.
 * A transaction-level advisory lock serialises concurrent approvals so budgets can't be overrun.
 */
export async function holdReasonForNewReward(
  tx: Tx,
  input: { userId: string; amount: string; sponsorId: string | null },
): Promise<HoldReason | null> {
  const amountCents = centsOf(input.amount);
  if (amountCents <= 0) return null;
  await tx.execute(sql`select pg_advisory_xact_lock(724001)`);
  const settings = await getPayoutSettings(tx);
  const since = monthStart();

  const [treasury] = await tx
    .select({ sum: sql<string>`coalesce(sum(${rewardQueue.foneAmount}), 0)::text` })
    .from(rewardQueue)
    .where(and(gte(rewardQueue.createdAt, since), isNull(rewardQueue.sponsorId), isNull(rewardQueue.holdReason)));
  const [user] = await tx
    .select({ sum: sql<string>`coalesce(sum(${rewardQueue.foneAmount}), 0)::text` })
    .from(rewardQueue)
    .where(and(eq(rewardQueue.userId, input.userId), gte(rewardQueue.createdAt, since), isNull(rewardQueue.holdReason)));

  let sponsorRemainingCents: number | undefined;
  if (input.sponsorId) {
    const [sponsor] = await tx.select({ budget: sponsors.budgetFone }).from(sponsors).where(eq(sponsors.id, input.sponsorId)).limit(1);
    sponsorRemainingCents = centsOf(sponsor?.budget) - (await sponsorSpentCents(tx, input.sponsorId));
  }

  return decideHold({
    amountCents,
    sponsored: !!input.sponsorId,
    sponsorRemainingCents,
    treasuryMonthCents: centsOf(treasury?.sum),
    userMonthCents: centsOf(user?.sum),
    settings,
  });
}

/** Spent and remaining FONE of every sponsor (for cards, admin and the transparency page). */
export async function sponsorBalances() {
  const rows = await db
    .select({
      id: sponsors.id,
      name: sponsors.name,
      website: sponsors.website,
      isActive: sponsors.isActive,
      budgetFone: sponsors.budgetFone,
      createdAt: sponsors.createdAt,
      // Explicit aliases: drizzle leaves columns unqualified in single-table queries, which would
      // make "id" inside the subquery resolve to reward_queue.id.
      spent: sql<string>`coalesce((select sum(rq.fone_amount) from reward_queue rq where rq.sponsor_id = "sponsors"."id" and rq.hold_reason is null), 0)::text`,
      paid: sql<string>`coalesce((select sum(rq.fone_amount) from reward_queue rq where rq.sponsor_id = "sponsors"."id" and rq.status = 'paid'), 0)::text`,
    })
    .from(sponsors)
    .orderBy(sponsors.name);
  return rows.map((row) => {
    const budgetCents = centsOf(row.budgetFone);
    const spentCents = centsOf(row.spent);
    return { ...row, budgetCents, spentCents, paidCents: centsOf(row.paid), remainingCents: Math.max(0, budgetCents - spentCents) };
  });
}
