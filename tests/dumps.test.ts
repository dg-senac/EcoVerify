import { describe, expect, it } from "vitest";
import { distanceMeters, dumpOutcome, isDumpOverdue } from "@/lib/dumps";
import { analysis, DAY } from "./helpers";

describe("dump reports", () => {
  it("publishes without AI; rejects screen photos and inappropriate images", () => {
    expect(dumpOutcome(null)).toEqual({ status: "open" });
    expect(dumpOutcome(analysis())).toEqual({ status: "open" });
    expect(dumpOutcome(analysis({ inappropriate: true }))).toEqual({ status: "rejected", code: "inappropriate" });
    expect(dumpOutcome(analysis({ screenOrPrint: true }))).toEqual({ status: "rejected", code: "screen_photo" });
  });

  it("a suspected internet copy goes to the admin, never auto-rejected", () => {
    expect(dumpOutcome(analysis({ internetCopy: true }))).toEqual({ status: "review" });
  });

  it("'not a dump' is only rejected when the AI is confident", () => {
    expect(dumpOutcome(analysis({ matchesMission: false, confidence: 80 }))).toEqual({ status: "rejected", code: "not_dump" });
    expect(dumpOutcome(analysis({ matchesMission: false, confidence: 40 }))).toEqual({ status: "review" });
  });

  it("open reports expire after 14 days", () => {
    const createdAt = new Date("2026-10-01T00:00:00Z");
    expect(isDumpOverdue({ status: "open", createdAt }, new Date(createdAt.getTime() + 13 * DAY))).toBe(false);
    expect(isDumpOverdue({ status: "open", createdAt }, new Date(createdAt.getTime() + 14 * DAY))).toBe(true);
    expect(isDumpOverdue({ status: "resolved", createdAt }, new Date(createdAt.getTime() + 30 * DAY))).toBe(false);
  });

  it("measures distances on the map", () => {
    // Marco Zero → Praça do Arsenal (Recife), roughly 300 m.
    const d = distanceMeters(-8.0631, -34.8711, -8.0609, -34.8722);
    expect(d).toBeGreaterThan(200);
    expect(d).toBeLessThan(400);
    expect(distanceMeters(-8, -34, -8, -34)).toBe(0);
  });
});
