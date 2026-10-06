import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import { adminSaveSchema } from "@/lib/schema";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import { cookies } from "next/headers";
import { newId } from "@/lib/grading";

export const dynamic = "force-dynamic";

async function checkAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyAdminToken(token)) {
    throw new Error("UNAUTHORIZED");
  }
}

export async function GET() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  try {
    await checkAdmin();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    
    const quizzes = data.map((row: any) => ({
      id: row.id,
      title: row.title,
      unit: row.unit,
      description: row.description,
      durationMinutes: row.duration_minutes,
      published: row.published,
      questions: row.questions,
    }));
    
    return NextResponse.json(quizzes);
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  try {
    await checkAdmin();
    const body = await req.json();
    const parsed = adminSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const quiz = parsed.data;
    
    const supabase = getSupabaseAdmin();
    
    // Add ids to questions
    const questionsWithIds = quiz.questions.map(q => ({ ...q, id: newId() }));

    const { data, error } = await supabase.from("quizzes").insert({
      title: quiz.title,
      unit: quiz.unit,
      description: quiz.description,
      duration_minutes: quiz.durationMinutes,
      published: false,
      questions: questionsWithIds,
    }).select().single();

    if (error) throw error;
    
    return NextResponse.json({
      id: data.id,
      title: data.title,
      unit: data.unit,
      description: data.description,
      durationMinutes: data.duration_minutes,
      published: data.published,
      questions: data.questions,
    });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
