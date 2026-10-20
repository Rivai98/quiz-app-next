import { expect, it } from "vitest";
import { demoReports, reportHistory } from "./attemptReports";
import type { Attempt } from "./types";

function attempt(id: string, score: number, studentName = " أحمد   على ", quizId = "quiz"): Attempt {
  return { id, score, studentName, quizId, normalizedName: "legacy-name", elapsedSeconds: 30, answers: [1], submittedAt: "2026-10-20T10:00:00Z" };
}

it("groups Arabic names, orders equal timestamps by id, and reports first/latest/best attempt", () => {
  const attempts = [attempt("c", 70), attempt("a", 40), attempt("b", 100, "احمد علي"), attempt("d", 100, "احمد علي", "other")];
  const report = demoReports(attempts, "quiz", "أحمد", 1);
  expect(report.total).toBe(1);
  expect(report.students[0]).toMatchObject({ count: 3, first: { score: 40, attemptNumber: 1 }, best: { score: 100, attemptNumber: 2 }, latest: { score: 70, attemptNumber: 3 } });
  const history = reportHistory(attempts, "quiz", "احمد علي");
  expect(history.map(a => a.id)).toEqual(["a", "b", "c"]);
  expect(JSON.stringify(history)).not.toContain("answers");
});

it("keeps accurate totals and complete history beyond 1000 attempts with paginated students", () => {
  const attempts = Array.from({ length: 1105 }, (_, i) => attempt(String(i).padStart(5, "0"), i % 101));
  attempts.push(...Array.from({ length: 25 }, (_, i) => attempt(`student-${i}`, 50, `طالب ${String(i).padStart(2, "0")}`)));
  const report = demoReports(attempts, "quiz", "", 1);
  expect(report.total).toBe(26);
  expect(report.students.find(s => s.normalizedName === "احمد علي")?.count).toBe(1105);
  expect(demoReports(attempts, "quiz", "", 2).students).toHaveLength(6);
  expect(reportHistory(attempts, "quiz", "احمد علي").at(-1)?.attemptNumber).toBe(1105);
});
