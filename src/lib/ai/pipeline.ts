import "server-only";
import { and, eq, isNotNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { aiSettings, missions, submissions } from "@/db/schema";
import {
  decideProof,
  DEFAULT_AI_SETTINGS,
  REJECTION_REASONS,
  SIMILAR_PHOTO_MAX_DISTANCE,
  type AiAnalysis,
  type AiChecks,
  type AiSettingsValues,
} from "@/lib/ai/decision";
import { analyzeProofWithGemini, AiUnavailableError, geminiApiKey } from "@/lib/ai/gemini";
import { hammingDistance, photoForAi } from "@/lib/ai/photo";
import { approveSubmission, rejectSubmission } from "@/lib/review";
import { FILES_ROUTE_PREFIX, isValidStoragePath, readStoredFile } from "@/lib/storage";

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
  if (useModel) {
    try {
      const buffer = photo ?? (await loadPhoto(submission.photoUrl));
      if (!buffer) throw new AiUnavailableError("photo not found in storage", "network");
      const result = await analyzeProofWithGemini({
        image: await photoForAi(buffer),
        mission: {
          title: mission.title,
          description: mission.description,
          category: mission.category,
          context: mission.context,
          aiChecklist: mission.aiChecklist,
        },
        report: submission.report,
      });
      analysis = result.analysis;
      model = result.model;
    } catch (error) {
      aiError = error instanceof AiUnavailableError ? `${error.kind}: ${error.message}` : `error: ${(error as Error).message}`;
      console.error(`[ai] verification of ${submissionId} failed:`, aiError);
    }
  }

  const decision = decideProof({ settings, analysis, similar, foneReward: Number(mission.foneReward) });

  await db
    .update(submissions)
    .set({
      aiStatus: useModel ? (analysis ? "done" : "failed") : similar ? "done" : null,
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
