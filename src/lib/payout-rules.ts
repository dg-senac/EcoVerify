/**
 * Rules that protect the FONE treasury and keep payouts worth it. Pure functions,
 * shared by the server (src/lib/payouts.ts) and the offline demo.
 *
 * - Minimum payout: each transfer on the Fone network costs a fee (0.15 FONE), so a person's
 *   rewards are only sent when they add up to at least `minPayoutFone`.
 * - Hold period: a reward waits `holdDays` before it can be paid (time for appeals and fraud checks).
 * - Monthly budget: the treasury commits at most `monthlyBudgetFone` per month (sponsored missions
 *   use the sponsor's own budget instead).
 * - Personal cap: one person earns at most `maxFonePerUserMonth` per month.
 * Rewards over a budget/cap are kept with a hold reason; an admin can release them later.
 * Points are never affected.
 */

/** Fee of one transfer on the Fone network (fone.dev). Used to show how much of a payout goes to fees. */
export const FONE_NETWORK_FEE = 0.15;

export type PayoutSettings = {
  minPayoutFone: number;
  holdDays: number;
  monthlyBudgetFone: number | null;
  maxFonePerUserMonth: number | null;
};

export const DEFAULT_PAYOUT_SETTINGS: PayoutSettings = {
  minPayoutFone: 5,
  holdDays: 7,
  monthlyBudgetFone: null,
  maxFonePerUserMonth: null,
};

export const HOLD_REASONS = ["budget", "user_cap", "sponsor_budget"] as const;
export type HoldReason = (typeof HOLD_REASONS)[number];

export function isHoldReason(value: unknown): value is HoldReason {
  return typeof value === "string" && (HOLD_REASONS as readonly string[]).includes(value);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** First instant of the current month in Brazil (UTC-3, no daylight saving since 2019). */
export function monthStart(now: Date = new Date()): Date {
  const brazil = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return new Date(Date.UTC(brazil.getUTCFullYear(), brazil.getUTCMonth(), 1, 3, 0, 0));
}

export function releaseDate(createdAt: Date | string, holdDays: number): Date {
  return new Date(new Date(createdAt).getTime() + holdDays * DAY_MS);
}

/** Decides, at approval time, whether a new FONE reward must be held. Amounts in cents. */
export function decideHold(input: {
  amountCents: number;
  sponsored: boolean;
  /** Sponsor budget minus what its rewards already committed. */
  sponsorRemainingCents?: number;
  /** Treasury FONE committed this month (not sponsored, not held). */
  treasuryMonthCents: number;
  /** This person's FONE committed this month (not held). */
  userMonthCents: number;
  settings: PayoutSettings;
}): HoldReason | null {
  const { amountCents, sponsored, settings } = input;
  if (amountCents <= 0) return null;
  if (sponsored && (input.sponsorRemainingCents ?? 0) < amountCents) return "sponsor_budget";
  if (settings.maxFonePerUserMonth !== null && input.userMonthCents + amountCents > Math.round(settings.maxFonePerUserMonth * 100)) {
    return "user_cap";
  }
  if (!sponsored && settings.monthlyBudgetFone !== null && input.treasuryMonthCents + amountCents > Math.round(settings.monthlyBudgetFone * 100)) {
    return "budget";
  }
  return null;
}

/** Whether the admin can send a person's FONE now (verified wallet, something released, minimum reached). */
export function isReadyToPay(group: { wallet: string | null; rewardIds: string[]; belowMinimum: boolean }) {
  return !!group.wallet && group.rewardIds.length > 0 && !group.belowMinimum;
}

export type OpenReward = { id: string; foneAmount: string; createdAt: Date | string; holdReason?: string | null };

export type RewardSplit<T extends OpenReward> = {
  /** Can be paid now. */
  payable: T[];
  payableCents: number;
  /** Still in the hold period. */
  waiting: T[];
  waitingCents: number;
  /** When the next waiting reward becomes payable. */
  nextReleaseAt: Date | null;
  /** Held by a budget or cap (an admin must release them). */
  held: T[];
  heldCents: number;
  /** There is something payable, but less than the minimum payout. */
  belowMinimum: boolean;
  /** Share of the payable amount that the network fee would take (0-100), or null. */
  feePercent: number | null;
};

/** Splits one person's open rewards into payable now / waiting / held. */
export function splitOpenRewards<T extends OpenReward>(rewards: T[], settings: PayoutSettings, now: Date = new Date()): RewardSplit<T> {
  const payable: T[] = [];
  const waiting: T[] = [];
  const held: T[] = [];
  let nextReleaseAt: Date | null = null;
  for (const reward of rewards) {
    if (reward.holdReason) {
      held.push(reward);
      continue;
    }
    const release = releaseDate(reward.createdAt, settings.holdDays);
    if (release.getTime() > now.getTime()) {
      waiting.push(reward);
      if (!nextReleaseAt || release < nextReleaseAt) nextReleaseAt = release;
    } else {
      payable.push(reward);
    }
  }
  const sum = (list: T[]) => list.reduce((total, r) => total + Math.round(Number(r.foneAmount) * 100), 0);
  const payableCents = sum(payable);
  return {
    payable,
    payableCents,
    waiting,
    waitingCents: sum(waiting),
    nextReleaseAt,
    held,
    heldCents: sum(held),
    belowMinimum: payableCents > 0 && payableCents < Math.round(settings.minPayoutFone * 100),
    feePercent: payableCents > 0 ? Math.round(((FONE_NETWORK_FEE * 100) / payableCents) * 1000) / 10 : null,
  };
}
