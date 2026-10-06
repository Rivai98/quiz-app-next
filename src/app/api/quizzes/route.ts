import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import { toPublicQuizzes } from "@/lib/share";
import type { Quiz } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("quizzes").select("*").eq("published", true).order("created_at", { ascending: false });
    if (error) throw error;
    
    // map DB rows to Quiz objects
    const quizzes: Quiz[] = data.map((row: any) => ({
      id: row.id,
      title: row.title,
      unit: row.unit,
      description: row.description,
      durationMinutes: row.duration_minutes,
      published: row.published,
      questions: row.questions,
    }));
    
    return NextResponse.json(toPublicQuizzes(quizzes));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
