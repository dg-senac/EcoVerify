import { describe, expect, it } from "vitest";
import { decideProof, DEFAULT_AI_SETTINGS } from "@/lib/ai/decision";
import {
  extraProofVerdict,
  newChallengeCode,
  pendingStage,
  planVerification,
  shouldAudit,
  TRUST_APPROVE_MIN,
  trustScore,
  type TrustInput,
} from "@/lib/verification";
import { analysis } from "./helpers";

const veteran = { approved: 10, rejected: 0, activeCards: 0, accountAgeDays: 90 };
const input = (overrides: Partial<TrustInput> = {}): TrustInput => ({
  analysis: analysis(),
  proofType: "photo",
  location: { accuracy: 10, simulated: false, anywhere: false },
  history: veteran,
  ...overrides,
});

describe("trustScore", () => {
  it("a confirmed photo from a trusted person reaches the approval line", () => {
    expect(trustScore(input()).score).toBeGreaterThanOrEqual(TRUST_APPROVE_MIN);
  });

  it("is always between 0 and 100", () => {
    const low = trustScore(input({ analysis: null, similar: { distance: 6 }, web: "partial", history: { approved: 0, rejected: 9, activeCards: 2, accountAgeDays: 0 } }));
    expect(low.score).toBe(0);
    const high = trustScore(input({ extraProofOk: true, checkedIn: true }));
    expect(high.score).toBeLessThanOrEqual(100);
  });

  it("yellow cards and rejections lower the history points", () => {
    const clean = trustScore(input()).score;
    const carded = trustScore(input({ history: { ...veteran, activeCards: 1 } })).score;
    expect(carded).toBeLessThan(clean);
  });

  it("partner weighing is worth more than a photo", () => {
    // Without the AI the total stays below the 100 cap, so the difference is the whole bonus.
    const partner = trustScore(input({ analysis: null, proofType: "partner", partnerConfirmed: true })).score;
    const waiting = trustScore(input({ analysis: null, proofType: "partner", partnerConfirmed: false })).score;
    expect(partner - waiting).toBe(30);
  });
});

describe("planVerification", () => {
  const plan = (overrides: Partial<Parameters<typeof planVerification>[0]> = {}) =>
    planVerification({
      mode: "auto",
      decision: decideProof({ settings: DEFAULT_AI_SETTINGS, analysis: analysis(), similar: null, foneReward: 10 }),
      analyzed: true,
      aiExpected: true,
      score: 85,
      extraProofAsked: false,
      windowClosed: false,
      capExceeded: false,
      ...overrides,
    });

  it("approves when the AI approves and the score is high", () => {
    expect(plan()).toEqual({ action: "approve", forceAudit: false });
  });

  it("asks for an extra proof once when in doubt, then a person decides", () => {
    expect(plan({ score: 60 })).toEqual({ action: "extra_proof" });
    expect(plan({ score: 60, extraProofAsked: true })).toEqual({ action: "review" });
  });

  it("waits for the AI inside the window; afterwards trusted people are approved and audited", () => {
    expect(plan({ analyzed: false })).toEqual({ action: "wait" });
    expect(plan({ analyzed: false, windowClosed: true, score: 45 })).toEqual({ action: "approve", forceAudit: true });
    expect(plan({ analyzed: false, windowClosed: true, score: 30 })).toEqual({ action: "review" });
  });

  it("internet copies, duplicates and inappropriate images always go to a person", () => {
    for (const reasonCode of ["internet_copy", "similar_photo", "inappropriate"] as const) {
      expect(plan({ decision: { action: "review", verdict: "review", confidence: 90, reasonCode } })).toEqual({ action: "review" });
    }
  });

  it("only acts in auto mode", () => {
    expect(plan({ mode: "suggest" })).toEqual({ action: "review" });
  });

  it("partner missions wait for the collection point", () => {
    expect(plan({ awaitingPartner: true })).toEqual({ action: "wait" });
  });
});

describe("sample audit", () => {
  it("audits 25% of new accounts and 5% of the others", () => {
    expect(shouldAudit({ approvedBefore: 0, forced: false, random: 0.2 })).toBe(true);
    expect(shouldAudit({ approvedBefore: 10, forced: false, random: 0.2 })).toBe(false);
    expect(shouldAudit({ approvedBefore: 10, forced: false, random: 0.04 })).toBe(true);
    expect(shouldAudit({ approvedBefore: 10, forced: true, random: 0.99 })).toBe(true);
  });
});

describe("extra proof", () => {
  it("the code has 4 digits and never starts with 0", () => {
    expect(newChallengeCode(() => 0)).toBe("1000");
    expect(newChallengeCode(() => 0.999)).toBe("9999");
    for (let i = 0; i < 50; i++) expect(newChallengeCode()).toMatch(/^[1-9]\d{3}$/);
  });

  it("is ok only with the code visible in a real photo of the same place", () => {
    expect(extraProofVerdict(analysis({ codeVisible: true }))).toBe("ok");
    expect(extraProofVerdict(analysis({ codeVisible: false }))).toBe("failed");
    expect(extraProofVerdict(analysis({ codeVisible: true, sameScene: false }))).toBe("failed");
    expect(extraProofVerdict(analysis({ codeVisible: true, screenOrPrint: true }))).toBe("failed");
  });

  it("tells the person where their proof is", () => {
    const now = new Date("2026-11-01T12:00:00Z");
    expect(pendingStage({ extraProofStatus: "requested" }, now)).toBe("extra_proof");
    expect(pendingStage({ aiStatus: "queued", verifyBy: "2026-11-02T00:00:00Z" }, now)).toBe("analyzing");
    expect(pendingStage({ aiStatus: "queued", verifyBy: "2026-11-01T00:00:00Z" }, now)).toBe("team");
    expect(pendingStage({ appealedAt: now }, now)).toBe("team");
  });
});
