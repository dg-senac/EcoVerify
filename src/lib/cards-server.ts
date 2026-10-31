import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications, sessions, userCards, users } from "@/db/schema";
import {
  CARD_REASON_LABELS,
  cardExpiresAt,
  cardNoticeText,
  countingYellows,
  isCardActive,
  yellowOutcome,
  type CardReason,
  type CardType,
  type YellowOutcome,
} from "@/lib/cards";
import { DEFAULT_LANG, t, tf, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { notifyStaff } from "@/lib/staff-alerts";

export type IssueCardInput = {
  userId: string;
  type: CardType;
  reason: CardReason;
  note: string;
  issuerId: string;
  submissionId?: string | null;
};

/**
 * Gives a card and applies its effect in one transaction: a 3rd active yellow suspends the account
 * for 14 days (sessions closed, cards used up); a red card blocks it. The person is always told why.
 */
export async function issueCard(input: IssueCardInput): Promise<{ outcome: YellowOutcome | null } | null> {
  const now = new Date();
  const note = input.note.trim().slice(0, 1000);

  const result = await db.transaction(async (tx) => {
    const [target] = await tx
      .select({ id: users.id, name: users.name, role: users.role, language: users.language, suspendedUntil: users.suspendedUntil, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, input.userId))
      .for("update");
    // Admins are not carded: a problem with an admin is handled by the owner, outside the panel.
    if (!target || target.deletedAt || target.role === "admin") return null;

    const existing = await tx.select().from(userCards).where(eq(userCards.userId, input.userId));
    const outcome = input.type === "yellow" ? yellowOutcome(existing, target.suspendedUntil, now) : null;

    const [card] = await tx
      .insert(userCards)
      .values({
        userId: input.userId,
        type: input.type,
        reasonCode: input.reason,
        note,
        submissionId: input.submissionId ?? null,
        issuedBy: input.issuerId,
        createdAt: now,
        expiresAt: cardExpiresAt(input.type, now),
        causedSuspension: !!outcome?.suspend,
        consumedAt: outcome?.suspend ? now : null,
      })
      .returning({ id: userCards.id });

    const label = CARD_REASON_LABELS[input.reason][target.language];
    if (outcome?.suspend) {
      // The cards of this series are used up: after the suspension the count starts again.
      for (const old of countingYellows(existing, now)) {
        await tx.update(userCards).set({ consumedAt: now }).where(eq(userCards.id, old.id));
      }
      await tx
        .update(users)
        .set({ suspendedUntil: outcome.suspendedUntil, suspensionReason: `${label}. ${note}`, banAppealMessage: null, banAppealedAt: null })
        .where(eq(users.id, input.userId));
      await tx.delete(sessions).where(eq(sessions.userId, input.userId));
    }
    if (input.type === "red") {
      await tx
        .update(users)
        .set({ isBanned: true, banReason: `${label}. ${note}`.slice(0, 1000), bannedAt: now, banAppealMessage: null, banAppealedAt: null })
        .where(eq(users.id, input.userId));
      await tx.delete(sessions).where(eq(sessions.userId, input.userId));
    }

    // Always delivered (even with notifications off): the person must know why.
    const lang: Lang = target.language;
    const notice = cardNoticeText(lang, {
      type: input.type,
      reason: input.reason,
      note,
      outcome,
      until: outcome?.suspendedUntil ? formatDate(outcome.suspendedUntil, lang) : undefined,
    });
    await tx.insert(notifications).values({ userId: input.userId, type: "alert", title: notice.title, message: notice.message });
    return { outcome, name: target.name, cardId: card.id };
  });
  if (!result) return null;

  if (result.outcome?.repeatOffence) {
    try {
      await notifyStaff(["admin"], (lang) => ({
        title: t(lang, "staff_repeat_title"),
        message: tf(lang, "staff_repeat_message", { name: result.name }),
      }));
    } catch (error) {
      console.error("[cards] could not alert the admins:", (error as Error).message);
    }
  }
  return { outcome: result.outcome };
}

/**
 * Cancels a card (accepted appeal or mistake). A cancelled suspension card lifts the suspension and
 * gives back the other cards of that series; a cancelled red card unblocks the account.
 */
export async function revokeCard(cardId: string, adminId: string): Promise<boolean> {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [card] = await tx.select().from(userCards).where(eq(userCards.id, cardId)).for("update");
    if (!card || card.revokedAt) return false;
    await tx.update(userCards).set({ revokedAt: now, revokedBy: adminId, consumedAt: null }).where(eq(userCards.id, cardId));

    const [target] = await tx.select({ language: users.language, suspendedUntil: users.suspendedUntil }).from(users).where(eq(users.id, card.userId));
    if (card.causedSuspension && card.consumedAt) {
      // The other cards of the series count again (one fewer than needed for a suspension).
      await tx
        .update(userCards)
        .set({ consumedAt: null })
        .where(and(eq(userCards.userId, card.userId), eq(userCards.consumedAt, card.consumedAt), isNull(userCards.revokedAt)));
      if (target?.suspendedUntil && target.suspendedUntil > now) {
        // Lifting early: the suspension ended "now" and is not counted as served.
        await tx.update(users).set({ suspendedUntil: null, suspensionReason: null, banAppealMessage: null, banAppealedAt: null }).where(eq(users.id, card.userId));
      }
    }
    if (card.type === "red") {
      await tx
        .update(users)
        .set({ isBanned: false, banReason: null, bannedAt: null, banAppealMessage: null, banAppealedAt: null })
        .where(eq(users.id, card.userId));
    }
    const lang: Lang = target?.language ?? DEFAULT_LANG;
    await tx.insert(notifications).values({
      userId: card.userId,
      type: "alert",
      title: t(lang, "card_revoked_title"),
      message: tf(lang, "card_revoked_message", { reason: CARD_REASON_LABELS[card.reasonCode as CardReason]?.[lang] ?? card.reasonCode }),
    });
    return true;
  });
}

/** Ends a suspension early (accepted appeal of the suspension itself). */
export async function liftSuspension(userId: string): Promise<boolean> {
  const now = new Date();
  const [row] = await db
    .update(users)
    .set({ suspendedUntil: now, banAppealMessage: null, banAppealedAt: null })
    .where(eq(users.id, userId))
    .returning({ language: users.language });
  if (!row) return false;
  await db.insert(notifications).values({
    userId,
    type: "alert",
    title: t(row.language, "suspension_lifted_title"),
    message: t(row.language, "suspension_lifted_message"),
  });
  return true;
}

export async function keepCardAfterAppeal(cardId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [card] = await tx
      .update(userCards)
      .set({ appealRejectedAt: new Date() })
      .where(and(eq(userCards.id, cardId), isNull(userCards.revokedAt), isNull(userCards.appealRejectedAt)))
      .returning({ userId: userCards.userId, reasonCode: userCards.reasonCode });
    if (!card) return false;
    const [target] = await tx.select({ language: users.language }).from(users).where(eq(users.id, card.userId));
    const lang: Lang = target?.language ?? DEFAULT_LANG;
    await tx.insert(notifications).values({
      userId: card.userId,
      type: "alert",
      title: t(lang, "card_kept_title"),
      message: tf(lang, "card_kept_message", { reason: CARD_REASON_LABELS[card.reasonCode as CardReason]?.[lang] ?? card.reasonCode }),
    });
    return true;
  });
}

export async function cardsOf(userId: string) {
  return db.select().from(userCards).where(eq(userCards.userId, userId)).orderBy(desc(userCards.createdAt));
}

/** Short summary for lists: active yellow cards and whether there is a red one. */
export function cardSummary(cards: { type: CardType; createdAt: Date; expiresAt: Date | null; revokedAt: Date | null; consumedAt: Date | null }[]) {
  const now = new Date();
  return {
    yellows: countingYellows(cards, now).length,
    red: cards.some((card) => card.type === "red" && isCardActive(card, now)),
    total: cards.filter((card) => !card.revokedAt).length,
  };
}
