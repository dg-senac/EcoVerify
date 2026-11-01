import { describe, expect, it } from "vitest";
import { checkinCode, checkinPhase, checkinWindow, isValidCheckinCode, parseCheckinQr } from "@/lib/saas/checkin";

const secret = "test-secret-123";
const now = new Date("2026-11-01T12:02:00Z");

describe("event check-in", () => {
  it("the code has 6 digits and depends on the event and the time window", async () => {
    const w = checkinWindow(now);
    const code = await checkinCode(secret, "m1", w);
    expect(code).toMatch(/^\d{6}$/);
    expect(await checkinCode(secret, "m1", w)).toBe(code);
    expect(await checkinCode(secret, "m2", w)).not.toBe(code);
    expect(await checkinCode(secret, "m1", w + 1)).not.toBe(code);
  });

  it("accepts the current and the previous code (5 min each), not older ones", async () => {
    const w = checkinWindow(now);
    expect(await isValidCheckinCode(secret, "m1", await checkinCode(secret, "m1", w), now)).toBe(true);
    expect(await isValidCheckinCode(secret, "m1", await checkinCode(secret, "m1", w - 1), now)).toBe(true);
    expect(await isValidCheckinCode(secret, "m1", await checkinCode(secret, "m1", w - 2), now)).toBe(false);
    expect(await isValidCheckinCode(secret, "m1", "12ab56", now)).toBe(false);
  });

  it("reads the QR or a typed code", () => {
    expect(parseCheckinQr("ECOVERIFY-CHECKIN:m1:123456")).toEqual({ missionId: "m1", code: "123456" });
    expect(parseCheckinQr("123 456")).toEqual({ missionId: null, code: "123456" });
    expect(parseCheckinQr("ECOVERIFY-CHECKIN:m1:12")).toBeNull();
    expect(parseCheckinQr("hello")).toBeNull();
  });

  it("opens 1 h before the start and closes 3 h after the end", () => {
    const event = { startsAt: "2026-11-01T14:00:00Z", endsAt: "2026-11-01T17:00:00Z" };
    expect(checkinPhase(event, new Date("2026-11-01T12:30:00Z"))).toBe("early");
    expect(checkinPhase(event, new Date("2026-11-01T13:30:00Z"))).toBe("open");
    expect(checkinPhase(event, new Date("2026-11-01T19:59:00Z"))).toBe("open");
    expect(checkinPhase(event, new Date("2026-11-01T20:01:00Z"))).toBe("closed");
    expect(checkinPhase({}, now)).toBeNull();
  });
});
