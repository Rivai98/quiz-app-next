import { randomUUID } from "node:crypto";
import type { Attempt, LeaderboardRow, QuestionType, Quiz } from "./types";

export const TF_OPTIONS = ["صح", "خطأ"] as const;

export function newId(): string {
  try {
    return randomUUID();
  } catch {
    return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Normalizes Arabic student names for identity matching:
 * trimmed, collapsed spaces, unified hamza/alef/ya/ta-marbuta, lowercase.
 */
export function normalizeStudentName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLocaleLowerCase("ar");
}

export function calculateScore(quiz: { questions: { correctIndex: number }[] }, answers: number[]): number {
  if (quiz.questions.length === 0) return 0;
  const correct = quiz.questions.reduce((n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0), 0);
  return Math.round((correct / quiz.questions.length) * 100);
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Builds per-question review (corrections) from the stored quiz.
 * Only used server-side after a successful submission, or locally in demo mode.
 */
export function buildReview(quiz: { questions: { text: string; options: string[]; correctIndex: number; explanation: string }[] }, answers: number[]) {
  return quiz.questions.map((q, i) => {
    const given = answers[i];
    const ok = given !== undefined && given >= 0 && given === q.correctIndex;
    return {
      ok,
      given: given !== undefined && given >= 0 && given < q.options.length ? q.options[given] : null,
      correct: q.options[q.correctIndex],
      explanation: q.explanation,
    };
  });
}

/** True/false questions must use exactly the two canonical options ["صح","خطأ"]. */
export function isCanonicalTfOptions(options: string[]): boolean {
  return options.length === TF_OPTIONS.length && options[0] === TF_OPTIONS[0] && options[1] === TF_OPTIONS[1];
}

export function assertQuestionShape(q: { type: string; options: string[]; correctIndex: number }, position: number): string | null {
  const at = `السؤال رقم ${position}`;
  if (q.type === "true_false") {
    if (!isCanonicalTfOptions(q.options)) return `${at}: خيارات سؤال صح/خطأ يجب أن تكون «صح» و«خطأ» فقط.`;
    if (q.correctIndex !== 0 && q.correctIndex !== 1) return `${at}: رقم الإجابة الصحيحة خارج نطاق الخيارَين (0 أو 1).`;
    return null;
  }
  if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) return `${at}: يجب أن يحتوي على خيارين إلى ستة خيارات.`;
  if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length)
    return `${at}: رقم الإجابة الصحيحة يجب أن يكون رقمًا بين 0 و${q.options.length - 1}.`;
  return null;
}

/** Sorts by descending score, then ascending time, then earliest submission. */
export function rankAttempts(attempts: Attempt[]): Attempt[] {
  return [...attempts].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.elapsedSeconds !== b.elapsedSeconds) return a.elapsedSeconds - b.elapsedSeconds;
    return a.submittedAt.localeCompare(b.submittedAt);
  });
}

export function bestAttempts(attempts: Attempt[], quizId: string): Attempt[] {
  const best = new Map<string, Attempt>();
  for (const a of attempts.filter((x) => x.quizId === quizId)) {
    const old = best.get(a.normalizedName);
    const rankComparison = rankAttempts([old ?? a, a])[0];
    if (!old || rankComparison === a) best.set(a.normalizedName, a);
  }
  return rankAttempts([...best.values()]);
}
