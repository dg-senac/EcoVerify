import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { quizAttempts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { citizenOnly } from "@/lib/role-guard";
import { answeredResults, quizDay, quizForClient, quizText } from "@/lib/quiz";
import { answerQuizAction } from "@/lib/actions/quiz";
import { QuizView } from "@/components/quiz/quiz-view";

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  citizenOnly(user.role);
  const lang = user.language;
  const day = quizDay();
  const text = quizText(lang);
  const [attempt] = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, user.id), eq(quizAttempts.day, day)))
    .limit(1);

  async function answer(index: number, choice: number) {
    "use server";
    return answerQuizAction(day, index, choice);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">🧠 {text.title}</h1>
      <p className="mt-1 mb-5 text-sm leading-relaxed text-slate-500">{text.intro}</p>
      <QuizView
        key={day}
        lang={lang}
        questions={quizForClient(day, lang)}
        initialAnswers={answeredResults(day, attempt?.answers ?? [], lang)}
        initialFinished={attempt?.finishedAt ? { correct: attempt.correct, points: attempt.points } : null}
        onAnswer={answer}
      />
    </div>
  );
}
