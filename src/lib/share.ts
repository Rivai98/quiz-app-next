import type { Attempt, LeaderboardRow, PublicQuiz, Quiz, QuizSeed, Question } from "./types";
import { bestAttempts, newId, calculateScore } from "./grading";
import type { ImportQuiz } from "./schema";

/** Strips answers/explanations for a payload delivered to students before they submit. */
export function toPublicQuiz(quiz: Quiz): PublicQuiz {
  return {
    id: quiz.id,
    title: quiz.title,
    unit: quiz.unit,
    description: quiz.description,
    durationMinutes: quiz.durationMinutes,
    questions: quiz.questions.map((q) => ({ id: q.id, type: q.type, text: q.text, options: q.options })),
  };
}

export function toPublicQuizzes(quizzes: Quiz[]): PublicQuiz[] {
  return quizzes.filter((q) => q.published).map(toPublicQuiz);
}

export function seedToQuiz(seed: QuizSeed, id: string, published: boolean): Quiz {
  return {
    id,
    title: seed.title,
    unit: seed.unit,
    description: seed.description,
    durationMinutes: seed.durationMinutes,
    published,
    questions: seed.questions.map((q) => ({ ...q, id: newId() })),
  };
}

export function importToSeed(imported: ImportQuiz): QuizSeed {
  return {
    title: imported.title,
    unit: imported.unit,
    description: imported.description,
    durationMinutes: imported.durationMinutes,
    questions: imported.questions,
  };
}

export function leaderboardFrom(attempts: Attempt[], quizId: string, limit = 50): LeaderboardRow[] {
  return bestAttempts(attempts, quizId)
    .slice(0, limit)
    .map((a) => ({ id: a.id, studentName: a.studentName, score: a.score, elapsedSeconds: a.elapsedSeconds, submittedAt: a.submittedAt }));
}

/** Server-side recomputation of an attempt against the stored quiz (never trusts the client). */
export function scoreAttempt(
  quiz: Quiz,
  answers: number[],
  elapsedSeconds: number,
  studentName: string,
  normalizedName: string,
  submittedAt: string,
  id: string,
): Attempt {
  const normalized = normalizeAnswers(quiz, answers);
  return {
    id,
    quizId: quiz.id,
    studentName,
    normalizedName,
    answers: normalized,
    score: calculateScore(quiz, normalized),
    elapsedSeconds,
    submittedAt,
  };
}

/** Pads/clamps the client answers array to the quiz length (missing = unanswered). */
export function normalizeAnswers(quiz: Quiz, answers: number[]): number[] {
  return quiz.questions.map((_, i) => (Number.isInteger(answers[i]) && answers[i] >= -1 ? answers[i] : -1));
}
