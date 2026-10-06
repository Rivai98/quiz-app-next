import { NextResponse } from "next/server";
import { adminLoginSchema } from "@/lib/schema";
import { verifyPin, createAdminToken, ADMIN_COOKIE, adminCookieOptions } from "@/lib/adminAuth";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { pin } = parsed.data;
    if (!verifyPin(pin)) {
      return NextResponse.json({ error: "رقم الدخول غير صحيح." }, { status: 401 });
    }
    const token = createAdminToken();
    (await cookies()).set(ADMIN_COOKIE, token, adminCookieOptions);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
