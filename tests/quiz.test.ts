import { describe, expect, it } from "vitest";
import { checkQuizAnswer, dailyQuiz, QUIZ_MAX_POINTS, QUIZ_QUESTIONS, QUIZ_SIZE, quizDay, quizForClient, quizPoints } from "@/lib/quiz";

describe("daily quiz", () => {
  it("is the same for everybody on the same day and changes the next day", () => {
    const a = dailyQuiz("2026-11-01").map((q) => q.question.id);
    expect(dailyQuiz("2026-11-01").map((q) => q.question.id)).toEqual(a);
    expect(dailyQuiz("2026-11-02").map((q) => q.question.id)).not.toEqual(a);
  });

  it("has 5 different questions with the right answer somewhere in the options", () => {
    const quiz = dailyQuiz("2026-11-01");
    expect(quiz).toHaveLength(QUIZ_SIZE);
    expect(new Set(quiz.map((q) => q.question.id)).size).toBe(QUIZ_SIZE);
    for (const q of quiz) {
      expect([...q.order].sort()).toEqual([0, 1, 2, 3]);
      expect(q.order[q.correctIndex]).toBe(0);
    }
  });

  it("the browser never gets the answer", () => {
    const json = JSON.stringify(quizForClient("2026-11-01", "pt"));
    expect(json).not.toContain("correct");
    expect(json).not.toContain("explain");
  });

  it("checks answers and refuses invalid choices", () => {
    const { correctIndex } = dailyQuiz("2026-11-01")[0];
    expect(checkQuizAnswer("2026-11-01", 0, correctIndex, "pt")!.correct).toBe(true);
    expect(checkQuizAnswer("2026-11-01", 0, (correctIndex + 1) % 4, "pt")!.correct).toBe(false);
    expect(checkQuizAnswer("2026-11-01", 0, 7, "pt")).toBeNull();
    expect(checkQuizAnswer("2026-11-01", 9, 0, "pt")).toBeNull();
  });

  it("2 points per right answer, +2 for a perfect quiz", () => {
    expect(quizPoints(0)).toBe(0);
    expect(quizPoints(4)).toBe(8);
    expect(quizPoints(5)).toBe(QUIZ_MAX_POINTS);
    expect(QUIZ_MAX_POINTS).toBe(12);
  });

  it("the day follows Brasília time", () => {
    expect(quizDay(new Date("2026-11-02T02:00:00Z"))).toBe("2026-11-01");
    expect(quizDay(new Date("2026-11-02T03:00:00Z"))).toBe("2026-11-02");
  });

  it("every question has 4 options and texts in the three languages", () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      for (const lang of ["pt", "en", "es"] as const) {
        expect(q.q[lang]).toBeTruthy();
        expect(q.explain[lang]).toBeTruthy();
        for (const option of q.options) expect(option[lang]).toBeTruthy();
      }
    }
    expect(new Set(QUIZ_QUESTIONS.map((q) => q.id)).size).toBe(QUIZ_QUESTIONS.length);
  });
});
