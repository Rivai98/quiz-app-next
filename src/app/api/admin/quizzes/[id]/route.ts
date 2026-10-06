import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import { adminUpdateSchema } from "@/lib/schema";
import { verifyAdminToken, ADMIN_COOKIE } from "@/lib/adminAuth";
import { cookies } from "next/headers";

async function checkAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyAdminToken(token)) {
    throw new Error("UNAUTHORIZED");
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  try {
    await checkAdmin();
    const id = (await params).id;
    const body = await req.json();
    const parsed = adminUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const updates = parsed.data;
    
    const supabase = getSupabaseAdmin();
    
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.unit !== undefined) updateData.unit = updates.unit;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.durationMinutes !== undefined) updateData.duration_minutes = updates.durationMinutes;
    if (updates.published !== undefined) updateData.published = updates.published;

    const { data, error } = await supabase.from("quizzes").update(updateData).eq("id", id).select().single();
    if (error) throw error;
    
    return NextResponse.json({ success: true, published: data.published });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  try {
    await checkAdmin();
    const id = (await params).id;
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح لك" }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
