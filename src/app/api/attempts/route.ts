import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import { submitAttemptSchema } from "@/lib/schema";
import { scoreAttempt } from "@/lib/share";
import { buildReview, newId, normalizeStudentName } from "@/lib/grading";
import type { Quiz } from "@/lib/types";

export async function POST(req: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const parsed = submitAttemptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { quizId, studentName, answers, elapsedSeconds } = parsed.data;

    const supabase = getSupabaseAdmin();
    const { data: qData, error: qError } = await supabase.from("quizzes").select("*").eq("id", quizId).single();
    if (qError || !qData) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }

    const quiz: Quiz = {
      id: qData.id,
      title: qData.title,
      unit: qData.unit,
      description: qData.description,
      durationMinutes: qData.duration_minutes,
      published: qData.published,
      questions: qData.questions,
    };

    if (!quiz.published) {
      return NextResponse.json({ error: "هذا الاختبار غير منشور حاليًا" }, { status: 403 });
    }

    const normalizedName = normalizeStudentName(studentName);
    const submittedAt = new Date().toISOString();
    const attemptId = newId();

    const attempt = scoreAttempt(quiz, answers, elapsedSeconds, studentName, normalizedName, submittedAt, attemptId);
    const review = buildReview(quiz, attempt.answers);

    const { error: insertError } = await supabase.from("attempts").insert({
      id: attempt.id,
      quiz_id: attempt.quizId,
      student_name: attempt.studentName,
      normalized_name: attempt.normalizedName,
      answers: attempt.answers,
      score: attempt.score,
      elapsed_seconds: attempt.elapsedSeconds,
      submitted_at: attempt.submittedAt,
    });

    if (insertError) throw insertError;

    return NextResponse.json({ attempt, review });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
