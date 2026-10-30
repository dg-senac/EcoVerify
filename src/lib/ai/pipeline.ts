import "server-only";
import { and, eq, isNotNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { aiSettings, missions, submissions, users } from "@/db/schema";
import {
  decideProof,
  DEFAULT_AI_SETTINGS,
  REJECTION_REASONS,
  SAME_PHOTO_MAX_DISTANCE,
  SIMILAR_PHOTO_MAX_DISTANCE,
  type AiAnalysis,
  type AiChecks,
  type AiSettingsValues,
} from "@/lib/ai/decision";
import { analyzeProofWithGemini, AiUnavailableError, geminiApiKey } from "@/lib/ai/gemini";
import { hammingDistance, photoForAi } from "@/lib/ai/photo";
import { canUseVision, findPhotoOnWeb } from "@/lib/ai/vision";
import { webVerdict, type WebMatches } from "@/lib/ai/web-detection-core";
import { approveSubmission, rejectSubmission } from "@/lib/review";
import { notifyStaff } from "@/lib/staff-alerts";
import { moderatorsEnabled } from "@/lib/staff-config";
import { t, tf } from "@/lib/i18n";
import { FILES_ROUTE_PREFIX, isValidStoragePath, readStoredFile } from "@/lib/storage";
import { MATERIAL_LABELS } from "@/lib/impact";

export async function getAiSettings(): Promise<AiSettingsValues> {
  const [row] = await db.select().from(aiSettings).where(eq(aiSettings.id, 1)).limit(1);
  if (!row) return DEFAULT_AI_SETTINGS;
  return {
    mode: row.mode,
    approveMinConfidence: row.approveMinConfidence,
    rejectMinConfidence: row.rejectMinConfidence,
    maxAutoApproveFone: Number(row.maxAutoApproveFone),
  };
}

/** True when new proofs will be sent to the vision model. */
export function willAnalyzeWithModel(settings: AiSettingsValues): boolean {
  return settings.mode !== "off" && !!geminiApiKey();
}

async function loadPhoto(photoUrl: string): Promise<Buffer | null> {
  if (!photoUrl.startsWith(FILES_ROUTE_PREFIX)) return null;
  const [folder, fileName] = photoUrl.slice(FILES_ROUTE_PREFIX.length).split("/");
  if (!folder || !fileName || !isValidStoragePath(folder, fileName)) return null;
  const file = await readStoredFile(folder, fileName);
  return file ? Buffer.from(file.body) : null;
}

/** Closest earlier photo from the same mission (any user) or the same user (any mission). */
async function findSimilarPhoto(submission: { id: string; userId: string; missionId: string; photoPhash: string | null }) {
  if (!submission.photoPhash) return null;
  const candidates = await db
    .select({ id: submissions.id, phash: submissions.photoPhash })
    .from(submissions)
    .where(
      and(
        ne(submissions.id, submission.id),
        isNotNull(submissions.photoPhash),
        or(eq(submissions.missionId, submission.missionId), eq(submissions.userId, submission.userId)),
      ),
    )
    .limit(5000);
  let best: { id: string; distance: number } | null = null;
  for (const candidate of candidates) {
    const distance = hammingDistance(submission.photoPhash, candidate.phash!);
    if (!best || distance < best.distance) best = { id: candidate.id, distance };
  }
  // Only near-duplicates matter; unrelated photos are typically ~32 bits apart.
  return best && best.distance <= SIMILAR_PHOTO_MAX_DISTANCE ? best : null;
}

export type VerificationResult = "approved" | "rejected" | "review" | "skipped";

/**
 * Runs the automatic verification of a pending proof and, in "auto" mode, approves or rejects it
 * when the case is clear. Never throws for AI problems: the proof just stays with the moderators.
 *
 * @param photo the processed photo, when the caller already has it in memory (saves a download).
 */
export async function runProofVerification(submissionId: string, photo?: Buffer): Promise<VerificationResult> {
  const [row] = await db
    .select({ submission: submissions, mission: missions })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(eq(submissions.id, submissionId))
    .limit(1);
  // Appeals are always decided by a person.
  if (!row || row.submission.status !== "pending" || row.submission.appealedAt) return "skipped";
  const { submission, mission } = row;

  const settings = await getAiSettings();
  if (settings.mode === "off") {
    if (submission.aiStatus === "queued") {
      await db.update(submissions).set({ aiStatus: null }).where(eq(submissions.id, submissionId));
    }
    return "skipped";
  }

  const similar = await findSimilarPhoto(submission);
  const checks: AiChecks = similar ? { similarSubmissionId: similar.id, similarDistance: similar.distance } : {};

  let analysis: AiAnalysis | null = null;
  let model: string | null = null;
  let aiError: string | null = null;
  const useModel = willAnalyzeWithModel(settings);
  // Reverse image search: skipped for an exact repeat (already rejected by the local rules).
  const sameAsEarlier = !!similar && similar.distance <= SAME_PHOTO_MAX_DISTANCE;
  const useVision = !sameAsEarlier && (await canUseVision().catch(() => false));
  let image: { base64: string; mimeType: string } | null = null;
  if (useModel || useVision) {
    const buffer = photo ?? (await loadPhoto(submission.photoUrl));
    image = buffer ? await photoForAi(buffer).catch(() => null) : null;
  }

  let web: WebMatches | null = null;
  if (useVision) {
    try {
      if (!image) throw new AiUnavailableError("photo not found in storage", "network");
      web = await findPhotoOnWeb(image);
      Object.assign(checks, {
        webChecked: true,
        webFullMatches: web.fullMatches,
        webPages: web.pages,
        webPartialCount: web.partialCount,
        webBestGuess: web.bestGuess,
      } satisfies AiChecks);
    } catch (error) {
      const message = error instanceof AiUnavailableError ? `${error.kind}: ${error.message}` : `error: ${(error as Error).message}`;
      // A failed call still counts against the monthly cap (Google may have billed it).
      Object.assign(checks, { webChecked: true, webError: message.slice(0, 300) } satisfies AiChecks);
      console.error(`[vision] web search for ${submissionId} failed:`, message);
    }
  }

  if (useModel) {
    try {
      if (!image) throw new AiUnavailableError("photo not found in storage", "network");
      const result = await analyzeProofWithGemini({
        image,
        mission: {
          title: mission.title,
          description: mission.description,
          category: mission.category,
          context: mission.context,
          aiChecklist: mission.aiChecklist,
        },
        // The model also checks whether the photo matches the declared delivery.
        report: submission.material
          ? `${submission.report}\n\n[Entrega declarada: ${MATERIAL_LABELS[submission.material].pt}, cerca de ${submission.weightKg} kg]`
          : submission.report,
      });
      analysis = result.analysis;
      model = result.model;
    } catch (error) {
      aiError = error instanceof AiUnavailableError ? `${error.kind}: ${error.message}` : `error: ${(error as Error).message}`;
      console.error(`[ai] verification of ${submissionId} failed:`, aiError);
    }
  }

  const decision = decideProof({
    settings,
    analysis,
    similar,
    foneReward: Number(mission.foneReward),
    web: webVerdict(web),
    weightKg: submission.weightKg === null ? null : Number(submission.weightKg),
  });

  await db
    .update(submissions)
    .set({
      aiStatus: useModel ? (analysis ? "done" : "failed") : similar || checks.webChecked ? "done" : null,
      aiVerdict: analysis || decision.reasonCode === "similar_photo" ? decision.verdict : null,
      aiConfidence: analysis || decision.reasonCode === "similar_photo" ? decision.confidence : null,
      aiReasonCode: decision.reasonCode,
      aiSummary: analysis?.explanation || null,
      aiChecks: { ...checks, ...(analysis ?? {}) },
      aiModel: model,
      aiAnalyzedAt: new Date(),
      aiError,
    })
    .where(and(eq(submissions.id, submissionId), eq(submissions.status, "pending")));

  // Possible copy from the internet: the staff is alerted (once, not again on a retry).
  if (decision.reasonCode === "internet_copy" && submission.aiReasonCode !== "internet_copy") {
    try {
      const [author] = await db.select({ name: users.name }).from(users).where(eq(users.id, submission.userId)).limit(1);
      await notifyStaff(moderatorsEnabled() ? ["admin", "moderator"] : ["admin"], (lang) => ({
        title: t(lang, "staff_internet_title"),
        message: tf(lang, "staff_internet_message", { name: author?.name ?? "?", mission: mission.title }),
      }));
    } catch (error) {
      console.error(`[ai] could not alert the staff about ${submissionId}:`, (error as Error).message);
    }
  }

  if (decision.action === "approve") {
    return (await approveSubmission(submissionId, { kind: "ai" })) ? "approved" : "skipped";
  }
  if (decision.action === "reject" && decision.reasonCode) {
    const ok = await rejectSubmission(submissionId, { kind: "ai" }, {
      code: decision.reasonCode,
      text: REJECTION_REASONS[decision.reasonCode].pt,
    });
    return ok ? "rejected" : "skipped";
  }
  return "review";
}
