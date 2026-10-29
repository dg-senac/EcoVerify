import "server-only";
import type { AiAnalysis } from "@/lib/ai/decision";
import { AiUnavailableError, GEMINI_DEFAULT_MODEL, requestGeminiAnalysis, type MissionForAi } from "@/lib/ai/gemini-core";

/**
 * Vision model: Google Gemini API (free tier works; see docs/VERIFICACAO_IA.md).
 * The request itself lives in gemini-core.ts (shared with the offline demo).
 */

export { AiUnavailableError, type MissionForAi };

export function geminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODEL;
}

export async function analyzeProofWithGemini(input: {
  image: { base64: string; mimeType: string };
  mission: MissionForAi;
  report: string;
}): Promise<{ analysis: AiAnalysis; model: string }> {
  const key = geminiApiKey();
  if (!key) throw new AiUnavailableError("GEMINI_API_KEY is not set", "not_configured");
  return requestGeminiAnalysis({
    ...input,
    apiKey: key,
    model: geminiModel(),
    baseUrl: process.env.GEMINI_API_BASE_URL?.trim() || undefined,
  });
}
