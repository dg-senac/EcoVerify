"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { quizAttempts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { moderatorsEnabled } from "@/lib/staff-config";
import { isStaffExperience } from "@/lib/nav";
import { awardPoints } from "@/lib/points-award";
import { QUIZ_SIZE, checkQuizAnswer, quizDay, quizPoints, type QuizAnswerResponse } from "@/lib/quiz";

/**
 * Answers question `index` of today's quiz. Answers must come in order and can't be changed: the
 * stored array only grows when its length is exactly `index`, so a double click or two tabs can't
 * answer twice. The points are credited once, when the last answer arrives.
 */
export async function answerQuizAction(day: string, index: number, choice: number): Promise<QuizAnswerResponse> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isBanned || isStaffExperience(user.role, moderatorsEnabled())) return { error: "not_allowed" };
  if (!rateLimit(`quiz:${user.id}`, 30, 10 * 60_000)) return { error: "too_many" };
  // The quiz page was opened yesterday and answered after midnight: start today's quiz instead.
  if (day !== quizDay()) return { error: "new_day" };
  if (!Number.isInteger(index) || index < 0 || index >= QUIZ_SIZE) return { error: "invalid" };
  const result = checkQuizAnswer(day, index, choice, user.language);
  if (!result) return { error: "invalid" };

  await db.insert(quizAttempts).values({ userId: user.id, day }).onConflictDoNothing();
  const [attempt] = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, user.id), eq(quizAttempts.day, day)))
    .limit(1);
  if (!attempt) return { error: "invalid" };

  // Already answered (reload, double click): return what was stored, never a second chance.
  if (index < attempt.answers.length) {
    const stored = checkQuizAnswer(day, index, attempt.answers[index], user.language);
    if (!stored) return { error: "invalid" };
    return attempt.finishedAt ? { ...stored, finished: { correct: attempt.correct, points: attempt.points } } : stored;
  }
  if (index > attempt.answers.length || attempt.finishedAt) return { error: "invalid" };

  const answers = [...attempt.answers, choice];
  const correct = attempt.correct + (result.correct ? 1 : 0);
  const finishing = answers.length === QUIZ_SIZE;
  const points = finishing ? quizPoints(correct) : 0;

  const saved = await db.transaction(async (tx) => {
    const updated = await tx
      .update(quizAttempts)
      .set({ answers, correct, points, finishedAt: finishing ? new Date() : null })
      .where(
        and(
          eq(quizAttempts.id, attempt.id),
          isNull(quizAttempts.finishedAt),
          sql`jsonb_array_length(${quizAttempts.answers}) = ${index}`,
        ),
      )
      .returning({ id: quizAttempts.id });
    if (updated.length === 0) return false;
    if (finishing) await awardPoints(tx, { userId: user.id, points, source: "quiz", refKey: `quiz:${user.id}:${day}` });
    return true;
  });
  if (!saved) return { error: "invalid" };

  if (finishing) {
    revalidatePath("/missions");
    revalidatePath("/ranking");
    revalidatePath("/profile");
    return { ...result, finished: { correct, points } };
  }
  return result;
}
