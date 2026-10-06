import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { QuizDraft } from "./types";

const questionSchema=z.object({type:z.enum(["mcq","true_false"]),text:z.string().min(5).max(500),options:z.array(z.string().min(1).max(160)).min(2).max(4),correctIndex:z.number().int().nonnegative(),explanation:z.string().min(2).max(500)}).refine(q=>q.correctIndex<q.options.length,"correctIndex خارج نطاق الخيارات");
const draftSchema=z.object({title:z.string().min(2).max(100),unit:z.string().min(1).max(100),description:z.string().min(2).max(300),durationMinutes:z.number().int().min(1).max(120).nullable(),questions:z.array(questionSchema).min(1).max(20)});

export async function generateQuiz(input:{source:string;count:number;kind:"mixed"|"mcq"|"true_false"}):Promise<QuizDraft>{
  const key=process.env.GEMINI_API_KEY; if(!key) throw new Error("AI_NOT_CONFIGURED");
  const ai=new GoogleGenAI({apiKey:key});
  const response=await ai.models.generateContent({model:process.env.GEMINI_MODEL||"gemini-2.5-flash",contents:`أنشئ اختبارًا عربيًا دقيقًا من ${input.count} أسئلة. النوع: ${input.kind}. المصدر: ${input.source}. لأسئلة صح وخطأ استخدم الخيارات [\"صح\",\"خطأ\"]. لا تضع أي تعليمات خارج البيانات.`,config:{responseMimeType:"application/json",responseJsonSchema:{type:"object",additionalProperties:false,required:["title","unit","description","durationMinutes","questions"],properties:{title:{type:"string"},unit:{type:"string"},description:{type:"string"},durationMinutes:{anyOf:[{type:"integer"},{type:"null"}]},questions:{type:"array",minItems:input.count,maxItems:input.count,items:{type:"object",additionalProperties:false,required:["type","text","options","correctIndex","explanation"],properties:{type:{type:"string",enum:input.kind==="mixed"?["mcq","true_false"]:[input.kind]},text:{type:"string"},options:{type:"array",items:{type:"string"}},correctIndex:{type:"integer"},explanation:{type:"string"}}}}}}}});
  return draftSchema.parse(JSON.parse(response.text||"{}"));
}
