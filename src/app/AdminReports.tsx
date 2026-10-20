"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Attempt, Quiz } from "@/lib/types";
import { demoReports, reportHistory, type ReportPage, type HistoryPage, type StudentReport } from "@/lib/attemptReports";
import { formatTime } from "@/lib/grading";

const cairoDate = new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", dateStyle: "medium", timeStyle: "short" });

function Pages({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (page: number) => void }) {
  return <div className="report-pages"><button className="secondary small" disabled={page <= 1} onClick={() => onPage(page - 1)}>السابق</button><span>صفحة {page} من {Math.max(1, Math.ceil(total / pageSize))}</span><button className="secondary small" disabled={page * pageSize >= total} onClick={() => onPage(page + 1)}>التالي</button></div>;
}

function StudentHistory({ student, quizId, attempts, hasSupabase }: { student: StudentReport; quizId: string; attempts: Attempt[]; hasSupabase: boolean }) {
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0);
  const [history, setHistory] = useState<HistoryPage | null>(null), [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setHistory(null); setError("");
    if (!hasSupabase) {
      const all = reportHistory(attempts, quizId, student.normalizedName);
      setHistory({ attempts: all.slice((page - 1) * 20, page * 20), total: all.length, page, pageSize: 20 });
    } else {
      const query = new URLSearchParams({ quizId, student: student.normalizedName, page: String(page) });
      fetch(`/api/admin/attempts?${query}`, { cache: "no-store", signal: controller.signal }).then(async response => {
        if (!response.ok) throw new Error("تعذّر تحميل المحاولات.");
        setHistory(await response.json());
      }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    }
    return () => controller.abort();
  }, [quizId, student.normalizedName, page, retry, attempts, hasSupabase]);
  if (error) return <p role="alert">{error} <button className="secondary small" onClick={() => setRetry(n => n + 1)}>إعادة المحاولة</button></p>;
  if (!history) return <p role="status">جارٍ تحميل المحاولات…</p>;
  return <><div className="report-table" tabIndex={0} role="region" aria-label={`محاولات ${student.studentName}`}><table><caption>جميع المحاولات — التوقيت: القاهرة</caption><thead><tr><th scope="col">المحاولة</th><th scope="col">الدرجة</th><th scope="col">زمن الحل</th><th scope="col">تاريخ التسليم</th></tr></thead><tbody>{history.attempts.map(a => <tr key={a.id}><th scope="row">{a.attemptNumber}</th><td>{a.score}%</td><td>{formatTime(a.elapsedSeconds)}</td><td>{cairoDate.format(new Date(a.submittedAt))}</td></tr>)}</tbody></table></div><Pages {...history} onPage={setPage}/></>;
}

export default function AdminReports({ quizzes, attempts, hasSupabase }: { quizzes: Quiz[]; attempts: Attempt[]; hasSupabase: boolean }) {
  const [selected, setSelected] = useState(""), [input, setInput] = useState(""), [search, setSearch] = useState("");
  const [page, setPage] = useState(1), [retry, setRetry] = useState(0), [expanded, setExpanded] = useState<string | null>(null);
  const [report, setReport] = useState<ReportPage | null>(null), [error, setError] = useState("");
  const quizId = selected || quizzes[0]?.id || "";
  useEffect(() => {
    const controller = new AbortController();
    setReport(null); setError(""); setExpanded(null);
    if (!quizId) return;
    if (!hasSupabase) setReport(demoReports(attempts, quizId, search, page));
    else {
      const query = new URLSearchParams({ quizId, search, page: String(page) });
      fetch(`/api/admin/attempts?${query}`, { cache: "no-store", signal: controller.signal }).then(async response => {
        if (!response.ok) throw new Error("تعذّر تحميل النتائج. تأكد من تسجيل الدخول وتحديث قاعدة البيانات.");
        setReport(await response.json());
      }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    }
    return () => controller.abort();
  }, [quizId, search, page, retry, hasSupabase, attempts]);
  function searchStudents(event: FormEvent) { event.preventDefault(); setPage(1); setSearch(input); }
  return <section className="panel admin-reports"><h2>نتائج الطلاب</h2><p>المحاولات المسلّمة فقط. الأسماء المتطابقة بعد التوحيد تُعامل كطالب واحد.</p><label htmlFor="report-quiz">الاختبار</label><select id="report-quiz" value={quizId} onChange={e => { setSelected(e.target.value); setPage(1); }}>{quizzes.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}</select><form onSubmit={searchStudents}><label htmlFor="report-search">بحث باسم الطالب</label><div className="report-search"><input id="report-search" value={input} maxLength={60} onChange={e => setInput(e.target.value)}/><button className="secondary" type="submit">بحث</button></div></form>
    {!quizId ? <p>لا توجد اختبارات لعرض النتائج.</p> : error ? <p role="alert">{error} <button className="secondary" onClick={() => setRetry(n => n + 1)}>إعادة المحاولة</button></p> : !report ? <p role="status">جارٍ تحميل النتائج…</p> : <><p aria-live="polite">عدد الطلاب: {report.total}</p>{report.students.length === 0 ? <p>لا توجد محاولات مسلّمة تطابق البحث.</p> : report.students.map(student => <article className="student-report" key={student.normalizedName}><h3>{student.studentName}</h3><dl><div><dt>عدد المحاولات</dt><dd>{student.count}</dd></div><div><dt>أول درجة</dt><dd>{student.first.score}%</dd></div><div><dt>أفضل درجة</dt><dd>{student.best.score}% — المحاولة {student.best.attemptNumber}</dd></div><div><dt>آخر درجة</dt><dd>{student.latest.score}%</dd></div></dl><button className="secondary small" aria-expanded={expanded === student.normalizedName} onClick={() => setExpanded(expanded === student.normalizedName ? null : student.normalizedName)}>{expanded === student.normalizedName ? "إخفاء المحاولات" : "عرض جميع المحاولات"}</button>{expanded === student.normalizedName && <StudentHistory student={student} quizId={quizId} attempts={attempts} hasSupabase={hasSupabase}/>}</article>)}<Pages {...report} onPage={setPage}/></>}
  </section>;
}
