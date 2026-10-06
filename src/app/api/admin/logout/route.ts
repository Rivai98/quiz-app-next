import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieOptions } from "@/lib/adminAuth";
import { cookies } from "next/headers";

export async function POST() {
  (await cookies()).set(ADMIN_COOKIE, "", { ...adminCookieOptions, maxAge: 0 });
  return NextResponse.json({ success: true });
}
