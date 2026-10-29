import "server-only";
import { and, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { submissions } from "@/db/schema";
import { AiUnavailableError } from "@/lib/ai/gemini-core";
import { parseWebDetection, VISION_ENDPOINT, VISION_FREE_UNITS_PER_MONTH, visionRequestBody, type WebMatches } from "@/lib/ai/web-detection-core";
import { monthStart } from "@/lib/payout-rules";

const TIMEOUT_MS = 20_000;

/** GOOGLE_VISION_API_KEY: key of a Google Cloud project with the Vision API enabled (needs billing). */
export function visionApiKey(): string | null {
  return process.env.GOOGLE_VISION_API_KEY?.trim() || null;
}

/** Monthly cap on Web Detection calls; default = the free tier, so the bill stays at zero. */
export function visionMonthlyLimit(): number {
  const value = Number(process.env.VISION_MONTHLY_LIMIT);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : VISION_FREE_UNITS_PER_MONTH;
}

/** Web Detection calls this month (each proof checked counts once). */
export async function visionUsedThisMonth(now = new Date()): Promise<number> {
  const [row] = await db
    .select({ used: sql<number>`count(*)::int` })
    .from(submissions)
    .where(and(gte(submissions.aiAnalyzedAt, monthStart(now)), sql`(${submissions.aiChecks} ->> 'webChecked') = 'true'`));
  return row?.used ?? 0;
}

export async function canUseVision(): Promise<boolean> {
  if (!visionApiKey()) return false;
  return (await visionUsedThisMonth()) < visionMonthlyLimit();
}

/**
 * Searches the web for the photo (reduced, without EXIF). Only the image goes to Google: no name,
 * e-mail, location or report. Throws AiUnavailableError on problems (the proof goes to a person).
 */
export async function findPhotoOnWeb(image: { base64: string }): Promise<WebMatches> {
  const key = visionApiKey();
  if (!key) throw new AiUnavailableError("GOOGLE_VISION_API_KEY not set", "not_configured");
  let response: Response;
  try {
    response = await fetch(VISION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(visionRequestBody(image.base64)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw new AiUnavailableError(`Vision request failed: ${(error as Error).message}`, "network");
  }
  if (response.status === 429) throw new AiUnavailableError("Vision quota exhausted (429)", "quota");
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    const detail = (await response.text().catch(() => "")).slice(0, 200);
    throw new AiUnavailableError(`Vision rejected the request (${response.status}): ${detail}`, "invalid_key");
  }
  if (!response.ok) throw new AiUnavailableError(`Vision HTTP ${response.status}`, "http");
  const matches = parseWebDetection(await response.json().catch(() => null));
  if (!matches) throw new AiUnavailableError("Vision answer could not be read", "invalid_answer");
  return matches;
}
