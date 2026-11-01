import { describe, expect, it } from "vitest";
import { cardExpiresAt, cardReasonForRejection, countingYellows, isSuspended, yellowOutcome, type CardLike } from "@/lib/cards";
import { DAY } from "./helpers";

const now = new Date("2026-11-01T12:00:00Z");
const yellow = (daysAgo: number, extra: Partial<CardLike> = {}): CardLike => {
  const createdAt = new Date(now.getTime() - daysAgo * DAY);
  return { type: "yellow", createdAt, expiresAt: cardExpiresAt("yellow", createdAt), revokedAt: null, consumedAt: null, ...extra };
};

describe("yellow cards", () => {
  it("the 3rd active yellow suspends for 2 weeks", () => {
    expect(yellowOutcome([], null, now)).toMatchObject({ count: 1, suspend: false });
    expect(yellowOutcome([yellow(10)], null, now)).toMatchObject({ count: 2, suspend: false });
    const third = yellowOutcome([yellow(10), yellow(5)], null, now);
    expect(third.suspend).toBe(true);
    expect(third.suspendedUntil!.getTime() - now.getTime()).toBe(14 * DAY);
  });

  it("expired, revoked or used-up cards don't count", () => {
    const cards = [yellow(200), yellow(3, { revokedAt: now }), yellow(3, { consumedAt: now }), yellow(3)];
    expect(countingYellows(cards, now)).toHaveLength(1);
  });

  it("a yellow soon after a suspension is flagged as a repeat offence", () => {
    expect(yellowOutcome([], new Date(now.getTime() - 30 * DAY), now).repeatOffence).toBe(true);
    expect(yellowOutcome([], new Date(now.getTime() - 400 * DAY), now).repeatOffence).toBe(false);
  });

  it("red cards never expire; yellows last 180 days", () => {
    expect(cardExpiresAt("red", now)).toBeNull();
    expect(cardExpiresAt("yellow", now)!.getTime() - now.getTime()).toBe(180 * DAY);
  });

  it("maps fraud rejections to card reasons", () => {
    expect(cardReasonForRejection("internet_copy")).toBe("internet_copy");
    expect(cardReasonForRejection("too_dark_blurry")).toBe("other");
  });

  it("suspension ends on its date", () => {
    expect(isSuspended(new Date(now.getTime() + DAY), now)).toBe(true);
    expect(isSuspended(new Date(now.getTime() - DAY), now)).toBe(false);
    expect(isSuspended(null, now)).toBe(false);
  });
});
