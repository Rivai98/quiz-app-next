import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/adminAuth";
import { getSupabaseAdmin, hasSupabaseEnv } from "@/lib/supabase";
import { normalizeStudentName } from "@/lib/grading";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const querySchema = z.object({ quizId: z.uuid(), search: z.string().max(60).default(""), student: z.string().max(60).optional(), page: z.coerce.number().int().min(1).max(1000000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) });

export async function GET(req: Request) {
  if (!verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) return NextResponse.json({ error: "غير مصرح" }, { status: 401, headers });
  const query = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!query.success) return NextResponse.json({ error: "بيانات البحث غير صحيحة" }, { status: 400, headers });
  if (!hasSupabaseEnv()) return NextResponse.json({ error: "قاعدة البيانات غير معدّة" }, { status: 503, headers });
  const { quizId, search, student, page, pageSize } = query.data;
  try {
    const { data: report, error } = await getSupabaseAdmin().rpc("admin_attempt_report", { p_quiz_id: quizId, p_search: normalizeStudentName(search), p_student: student === undefined ? null : normalizeStudentName(student), p_page: page, p_page_size: pageSize });
    if (error) throw error;
    return NextResponse.json(report, { headers });
  } catch {
    return NextResponse.json({ error: "تعذّر تحميل النتائج. تحقق من تطبيق تحديث قاعدة البيانات ثم أعد المحاولة." }, { status: 500, headers });
  }
}
