import type { Attempt } from "./types";
import { normalizeStudentName } from "./grading";

export type ReportAttempt = Pick<Attempt, "id" | "score" | "elapsedSeconds" | "submittedAt"> & { attemptNumber: number };
export type StudentReport = { normalizedName: string; studentName: string; count: number; first: ReportAttempt; latest: ReportAttempt; best: ReportAttempt };
export type ReportPage = { students: StudentReport[]; total: number; page: number; pageSize: number };
export type HistoryPage = { attempts: ReportAttempt[]; total: number; page: number; pageSize: number };

export function reportHistory(attempts: Attempt[], quizId: string, name: string): ReportAttempt[] {
  return attempts.filter(a => a.quizId === quizId && normalizeStudentName(a.studentName) === name)
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id))
    .map((a, i) => ({ id: a.id, score: a.score, elapsedSeconds: a.elapsedSeconds, submittedAt: a.submittedAt, attemptNumber: i + 1 }));
}

export function demoReports(attempts: Attempt[], quizId: string, search: string, page: number, pageSize = 20): ReportPage {
  const names = new Map<string, string>();
  for (const a of attempts) if (a.quizId === quizId) names.set(normalizeStudentName(a.studentName), a.studentName);
  const students = [...names].filter(([name]) => name.includes(normalizeStudentName(search))).sort(([a], [b]) => a.localeCompare(b)).map(([normalizedName, studentName]) => {
    const history = reportHistory(attempts, quizId, normalizedName);
    const best = [...history].sort((a, b) => b.score - a.score || a.elapsedSeconds - b.elapsedSeconds || a.attemptNumber - b.attemptNumber)[0];
    return { normalizedName, studentName, count: history.length, first: history[0], latest: history[history.length - 1], best };
  });
  return { students: students.slice((page - 1) * pageSize, page * pageSize), total: students.length, page, pageSize };
}
