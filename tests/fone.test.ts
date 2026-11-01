import { describe, expect, it } from "vitest";
import { centsToFone, foneToCents, isValidFoneAddress, normalizeHex, pickChallengeCents } from "@/lib/fone";

describe("FONE wallet", () => {
  it("accepts only Fone addresses (64 hex characters starting with f)", () => {
    expect(isValidFoneAddress("f" + "a".repeat(63))).toBe(true);
    expect(isValidFoneAddress("0x" + "a".repeat(40))).toBe(false);
    expect(isValidFoneAddress("f" + "a".repeat(62))).toBe(false);
    expect(isValidFoneAddress(null)).toBe(false);
    expect(normalizeHex("  F" + "A".repeat(63) + " ")).toBe("f" + "a".repeat(63));
  });

  it("converts amounts without rounding errors", () => {
    expect(centsToFone(137)).toBe("1.37");
    expect(foneToCents("1.37")).toBe(137);
    expect(foneToCents(0.1 + 0.2)).toBe(30);
  });

  it("each wallet check gets a unique amount", () => {
    const taken = new Set<number>();
    for (let i = 0; i < 99; i++) {
      const cents = pickChallengeCents(taken)!;
      expect(cents).toBeGreaterThanOrEqual(101);
      expect(cents).toBeLessThanOrEqual(199);
      expect(taken.has(cents)).toBe(false);
      taken.add(cents);
    }
    expect(pickChallengeCents(taken)).toBeGreaterThanOrEqual(200);
  });
});
