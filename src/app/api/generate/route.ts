import { NextResponse } from "next/server";
import { z } from "zod";
import { generateQuiz } from "@/lib/gemini";

const inputSchema=z.object({source:z.string().min(10).max(12000),count:z.number().int().min(3).max(20),kind:z.enum(["mixed","mcq","true_false"])});
const isTimeout=(e:unknown)=>e instanceof Error&&(e.name==="TimeoutError"||/abort|timed?\s?out/i.test(e.message)||(e.cause instanceof Error&&(e.cause.name==="TimeoutError"||/abort|timed?\s?out/i.test(e.cause.message))));
export async function POST(request:Request){
  try{ const input=inputSchema.parse(await request.json()); return NextResponse.json(await generateQuiz(input)); }
  catch(error){
    if(isTimeout(error)) return NextResponse.json({error:"استغرق إنشاء الاختبار وقتًا طويلاً. حاول مرة أخرى."},{status:504});
    if(error instanceof Error&&error.message==="AI_NOT_CONFIGURED") return NextResponse.json({error:"ميزة الذكاء الاصطناعي غير مفعّلة. أضف GEMINI_API_KEY ثم أعد تشغيل التطبيق."},{status:503});
    console.error("Quiz generation failed",error); return NextResponse.json({error:"تعذّر إنشاء الاختبار الآن. راجع المدخلات وحاول مرة أخرى."},{status:400}); }
}
