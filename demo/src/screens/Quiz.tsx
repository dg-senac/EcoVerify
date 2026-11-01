import { useState } from "react";
import { Brain } from "lucide-react";
import { answeredResults, quizDay, quizForClient, quizText } from "@/lib/quiz";
import { QuizView } from "@/components/quiz/quiz-view";
import { answerQuiz, quizAttemptOf, useLang, useStore, type User } from "../store";
import { PageHeader } from "../components/ui";

export function QuizScreen({ user }: { user: User }) {
  const lang = useLang();
  // The day is fixed when the screen opens (answering after midnight starts the new quiz).
  const [day] = useState(() => quizDay());
  const attempt = useStore((s) => quizAttemptOf(s, user.id, day));
  const text = quizText(lang);
  // Initial values only: the view keeps its own state while answering.
  const [initial] = useState(() => attempt);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={text.title} subtitle={text.intro} icon={Brain} />
      <QuizView
        key={`${day}-${lang}`}
        lang={lang}
        questions={quizForClient(day, lang)}
        initialAnswers={answeredResults(day, initial?.answers ?? [], lang)}
        initialFinished={initial?.finishedAt ? { correct: initial.correct, points: initial.points } : null}
        onAnswer={(index, choice) => answerQuiz(day, index, choice)}
      />
    </div>
  );
}
