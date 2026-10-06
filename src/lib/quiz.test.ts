import { describe, expect, it } from "vitest";
import { bestAttempts, calculateScore, normalizeArabicName, seedQuizzes } from "./quiz";
import type { Attempt } from "./types";

describe("quiz rules",()=>{
  it("normalizes Arabic names",()=>expect(normalizeArabicName("  أحمد   على ")).toBe("احمد علي"));
  it("calculates percentage",()=>expect(calculateScore(seedQuizzes[1],[1,0,3])).toBe(67));
  it("keeps the best attempt and ranks by time",()=>{ const base={quizId:"q",normalizedName:"ا",submittedAt:"2026-01-01",answers:[] as number[]}; const a:Attempt[]=[{...base,id:"1",studentName:"أ",score:80,elapsedSeconds:20},{...base,id:"2",studentName:"أ",score:90,elapsedSeconds:50},{...base,id:"3",studentName:"ب",normalizedName:"ب",score:90,elapsedSeconds:30}]; expect(bestAttempts(a,"q").map(x=>x.id)).toEqual(["3","2"]); });
});
