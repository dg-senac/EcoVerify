import { describe, expect, it } from "vitest";
import { composeRejectionMessage, decideProof, DEFAULT_AI_SETTINGS, parseAiAnalysis, validateRejection } from "@/lib/ai/decision";
import { analysis } from "./helpers";

const base = { settings: DEFAULT_AI_SETTINGS, similar: null, foneReward: 10 };

describe("decideProof", () => {
  it("approves a clean photo with high confidence", () => {
    expect(decideProof({ ...base, analysis: analysis() })).toMatchObject({ action: "approve", verdict: "approve", reasonCode: null });
  });

  it("only suggests when confidence is below the threshold", () => {
    expect(decideProof({ ...base, analysis: analysis({ confidence: 70 }) }).action).toBe("review");
  });

  it("never auto-approves big rewards or heavy deliveries", () => {
    expect(decideProof({ ...base, foneReward: 51, analysis: analysis() }).action).toBe("review");
    expect(decideProof({ ...base, weightKg: 21, analysis: analysis() }).action).toBe("review");
  });

  it("does not trust an 'approve' that contradicts the model's own answers", () => {
    const d = decideProof({ ...base, analysis: analysis({ screenOrPrint: true }) });
    expect(d).toMatchObject({ action: "review", reasonCode: "screen_photo" });
  });

  it("rejects the same photo sent again, and sends near copies to a person", () => {
    expect(decideProof({ ...base, similar: { distance: 2 }, analysis: analysis() })).toMatchObject({ action: "reject", reasonCode: "similar_photo" });
    expect(decideProof({ ...base, similar: { distance: 7 }, analysis: analysis() })).toMatchObject({ action: "review", reasonCode: "similar_photo" });
  });

  it("never decides a suspected internet copy alone (the admin decides)", () => {
    const flagged = decideProof({ ...base, analysis: analysis({ internetCopy: true, verdict: "reject", reasonCode: "internet_copy", confidence: 99 }) });
    expect(flagged).toMatchObject({ action: "review", reasonCode: "internet_copy" });
    const web = decideProof({ ...base, web: "copy", analysis: analysis() });
    expect(web).toMatchObject({ action: "review", reasonCode: "internet_copy" });
  });

  it("auto-rejects only reasons that are safe to reject automatically", () => {
    expect(decideProof({ ...base, analysis: analysis({ verdict: "reject", reasonCode: "too_dark_blurry", confidence: 95 }) }).action).toBe("reject");
    // A made-up report is a judgement call: a person decides.
    expect(decideProof({ ...base, analysis: analysis({ verdict: "reject", reasonCode: "report_mismatch", confidence: 99 }) }).action).toBe("review");
    expect(decideProof({ ...base, analysis: analysis({ verdict: "reject", reasonCode: "too_dark_blurry", confidence: 80 }) }).action).toBe("review");
  });

  it("does not approve when far fewer items than declared are visible", () => {
    const d = decideProof({ ...base, declaredCount: 30, analysis: analysis({ itemCount: 10 }) });
    expect(d).toMatchObject({ action: "review", reasonCode: "count_mismatch" });
  });

  it("sends everything to a person when the AI is off or failed", () => {
    expect(decideProof({ ...base, settings: { ...DEFAULT_AI_SETTINGS, mode: "off" }, analysis: analysis() }).action).toBe("review");
    expect(decideProof({ ...base, analysis: null }).action).toBe("review");
  });

  it("suggest mode never acts on its own", () => {
    const settings = { ...DEFAULT_AI_SETTINGS, mode: "suggest" as const };
    expect(decideProof({ ...base, settings, analysis: analysis({ confidence: 99 }) }).action).toBe("review");
    expect(decideProof({ ...base, settings, analysis: analysis({ verdict: "reject", reasonCode: "ai_generated", confidence: 99 }) }).action).toBe("review");
  });
});

describe("parseAiAnalysis (untrusted model output)", () => {
  const raw = {
    matches_mission: true,
    is_real_photo: true,
    screen_or_print: false,
    ai_generated_or_edited: false,
    inappropriate: false,
    too_dark_or_blurry: false,
    report_consistent: true,
    identifiable_faces: false,
    verdict: "approve",
    confidence: 140,
    reason_code: "made_up_code",
    item_count: 12.6,
  };

  it("clamps the confidence, drops unknown reason codes and rounds counts", () => {
    const parsed = parseAiAnalysis(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.confidence).toBe(100);
    expect(parsed!.reasonCode).toBeNull();
    expect(parsed!.itemCount).toBe(13);
    expect(parsed!.internetCopy).toBe(false);
  });

  it("refuses incomplete or invalid answers", () => {
    expect(parseAiAnalysis(null)).toBeNull();
    expect(parseAiAnalysis({ ...raw, inappropriate: "no" })).toBeNull();
    expect(parseAiAnalysis({ ...raw, verdict: "maybe" })).toBeNull();
    expect(parseAiAnalysis({ ...raw, confidence: "high" })).toBeNull();
  });
});

describe("rejections written by the team", () => {
  it("requires the moderator's own words for a flagged internet copy", () => {
    const preset = composeRejectionMessage("internet_copy", "", "pt");
    expect(validateRejection({ flagged: true, text: preset })).toBe("explanation_required");
    expect(validateRejection({ flagged: true, text: "A mesma foto está no site da prefeitura, publicada em 2023." })).toBeNull();
    expect(validateRejection({ flagged: false, text: "ok" })).toBe("reason_too_short");
  });

  it("adds the team explanation after the standard reason", () => {
    const message = composeRejectionMessage("too_dark_blurry", "Tente com mais luz.", "en");
    expect(message).toContain("Team explanation: Tente com mais luz.");
  });
});
