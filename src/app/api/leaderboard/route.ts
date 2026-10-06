import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import { leaderboardFrom } from "@/lib/share";
import type { Attempt } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const quizId = searchParams.get("quizId");
    if (!quizId) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    // Fetch best attempts per quiz
    // Since we need to pick the best attempt per normalized name, we fetch all for this quiz.
    // In a real app with many attempts, we might do this via a SQL function or view.
    // For MVP, we fetch all and calculate in JS.
    const { data, error } = await supabase.from("attempts").select("*").eq("quiz_id", quizId);
    if (error) throw error;

    const attempts: Attempt[] = data.map((row: any) => ({
      id: row.id,
      quizId: row.quiz_id,
      studentName: row.student_name,
      normalizedName: row.normalized_name,
      answers: row.answers,
      score: row.score,
      elapsedSeconds: row.elapsed_seconds,
      submittedAt: row.submitted_at,
    }));

    const rows = leaderboardFrom(attempts, quizId, 50);
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
