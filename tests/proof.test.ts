import { describe, expect, it } from "vitest";
import { checkCountInput, countCheck, countRule, estimatedKg, verifiedCount } from "@/lib/proof";

describe("count missions", () => {
  const mission = { proofType: "count", countItem: "pet_bottle", countTarget: 20 };

  it("validates the declared count", () => {
    expect(checkCountInput(mission, "abc").error).toBe("count_invalid");
    expect(checkCountInput(mission, "0").error).toBe("count_invalid");
    expect(checkCountInput(mission, "301").error).toBe("count_invalid");
    expect(checkCountInput(mission, "10").error).toBe("count_below_target");
    const ok = checkCountInput(mission, "25");
    expect(ok.error).toBeUndefined();
    expect(ok.count).toBe(25);
    expect(ok.weightKg).toBeGreaterThan(0);
  });

  it("ignores the count on other mission types", () => {
    expect(checkCountInput({ proofType: "photo" }, "abc")).toEqual({ count: null, material: null, weightKg: null });
  });

  it("small differences with the AI count are normal; clearly fewer items are not", () => {
    expect(countCheck(25, 23)).toBe("ok");
    expect(countCheck(25, 10)).toBe("low");
    expect(countCheck(25, null)).toBe("unknown");
  });

  it("the record never counts more than what the photo shows", () => {
    expect(verifiedCount(25, 20)).toBe(20);
    expect(verifiedCount(25, 30)).toBe(25);
    expect(verifiedCount(25, null)).toBe(25);
  });

  it("the weight is estimated from the count, never typed by the person", () => {
    expect(estimatedKg("pet_bottle", 0)).toBeNull();
    expect(estimatedKg("pet_bottle", 1)).toBeGreaterThanOrEqual(0.1);
  });

  it("uses sane defaults for incomplete missions", () => {
    expect(countRule({})).toEqual({ item: "recyclables_bag", target: 1 });
    expect(countRule({ countItem: "can", countTarget: 9999 }).target).toBe(300);
  });
});
