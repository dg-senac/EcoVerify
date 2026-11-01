import type { AiAnalysis } from "@/lib/ai/decision";

/** A clean "approve" answer from the vision model; override what each test needs. */
export function analysis(overrides: Partial<AiAnalysis> = {}): AiAnalysis {
  return {
    whatIsVisible: "Pessoa recolhendo lixo na praia",
    matchesMission: true,
    isRealPhoto: true,
    screenOrPrint: false,
    aiGeneratedOrEdited: false,
    inappropriate: false,
    tooDarkOrBlurry: false,
    reportConsistent: true,
    identifiableFaces: false,
    internetCopy: false,
    internetSigns: "",
    verdict: "approve",
    reasonCode: null,
    confidence: 92,
    explanation: "",
    ...overrides,
  };
}

export const DAY = 86_400_000;
