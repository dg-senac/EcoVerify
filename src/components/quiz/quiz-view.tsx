"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { QUIZ_SIZE, quizText, type ClientQuestion, type QuizAnswerResponse, type QuizAnswerResult } from "@/lib/quiz";

type Answered = QuizAnswerResult & { choice: number };

/**
 * The daily quiz, one question at a time. After each answer it shows the right option and a short
 * explanation (the point is to learn). Shared by the web app and the APK: `onAnswer` checks the
 * answer (server action on the web, local store in the APK).
 */
export function QuizView({
  lang,
  questions,
  initialAnswers,
  initialFinished,
  onAnswer,
}: {
  lang: Lang;
  questions: ClientQuestion[];
  initialAnswers: Answered[];
  initialFinished: { correct: number; points: number } | null;
  onAnswer: (index: number, choice: number) => Promise<QuizAnswerResponse>;
}) {
  const text = quizText(lang);
  const [answers, setAnswers] = useState<Answered[]>(initialAnswers);
  const [finished, setFinished] = useState(initialFinished);
  // Question on screen: the next unanswered one, or the one just answered (until "Next").
  const [current, setCurrent] = useState(Math.min(initialAnswers.length, QUIZ_SIZE - 1));
  const [showSummary, setShowSummary] = useState(!!initialFinished);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  if (showSummary && finished) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm" data-testid="quiz-summary">
        {finished.correct === QUIZ_SIZE && <p className="text-lg font-extrabold text-emerald-700">{text.perfect}</p>}
        <p className="mt-1 text-base font-bold text-slate-800">{text.done(finished.correct, finished.points)}</p>
        <ol className="mt-4 space-y-3">
          {questions.map((q, i) => {
            const a = answers[i];
            return (
              <li key={q.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                <p className="font-semibold text-slate-800">
                  {a?.correct ? "✅" : "❌"} {q.text}
                </p>
                {a && <p className="mt-1 text-xs text-emerald-800">→ {q.options[a.correctIndex]}</p>}
                {a && <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.explanation}</p>}
              </li>
            );
          })}
        </ol>
        <p className="mt-4 text-sm font-semibold text-slate-600">{text.comeBack}</p>
      </section>
    );
  }

  const q = questions[current];
  const answer = answers[current];
  const choose = (choice: number) => {
    if (answer || pending) return;
    setError(false);
    start(async () => {
      const r = await onAnswer(current, choice);
      if ("error" in r) {
        if (r.error === "new_day") window.location.reload();
        else setError(true);
        return;
      }
      setAnswers((prev) => {
        const next = [...prev];
        next[current] = { correct: r.correct, correctIndex: r.correctIndex, explanation: r.explanation, choice };
        return next;
      });
      if (r.finished) setFinished(r.finished);
    });
  };

  const optionClass = (i: number) => {
    const base = "w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition";
    if (!answer) return `${base} border-slate-200 bg-white text-slate-800 hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-60`;
    if (i === answer.correctIndex) return `${base} border-emerald-500 bg-emerald-50 text-emerald-900`;
    if (i === answer.choice) return `${base} border-red-400 bg-red-50 text-red-900`;
    return `${base} border-slate-100 bg-slate-50 text-slate-400`;
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="quiz">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{text.question(current + 1)}</p>
        <div className="flex gap-1.5" aria-hidden>
          {questions.map((item, i) => (
            <span
              key={item.id}
              className={`h-2.5 w-2.5 rounded-full ${
                answers[i] ? (answers[i].correct ? "bg-emerald-500" : "bg-red-400") : i === current ? "bg-slate-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>
      <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900">{q.text}</h2>
      <div className="mt-4 grid grid-cols-1 gap-2">
        {q.options.map((option, i) => (
          <button key={i} type="button" disabled={!!answer || pending} onClick={() => choose(i)} className={optionClass(i)} data-quiz-option={i}>
            {option}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-xs font-semibold text-red-700">{text.error}</p>}
      {answer && (
        <div className="mt-4" data-testid="quiz-feedback">
          <p className={`text-sm font-extrabold ${answer.correct ? "text-emerald-700" : "text-red-700"}`}>{answer.correct ? text.right : text.wrong}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{answer.explanation}</p>
          <button
            type="button"
            onClick={() => (current + 1 < QUIZ_SIZE ? setCurrent(current + 1) : setShowSummary(true))}
            className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
            data-testid="quiz-next"
          >
            {current + 1 < QUIZ_SIZE ? text.next : text.finish}
          </button>
        </div>
      )}
    </section>
  );
}

export const QUIZ_CARD_BUTTON = "shrink-0 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700";

/** Small card on the missions screen; `action` is the link/button that opens the quiz. */
export function QuizCard({ lang, donePoints, action }: { lang: Lang; donePoints: number | null; action: ReactNode }) {
  const text = quizText(lang);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3" data-testid="quiz-card">
      <div className="min-w-0">
        <p className="text-sm font-bold text-sky-950">{text.cardTitle}</p>
        <p className="text-xs text-sky-900">{donePoints === null ? text.cardText : text.cardDone(donePoints)}</p>
      </div>
      {action}
    </div>
  );
}
