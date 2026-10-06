import { describe, expect, it } from "vitest";
import { bestAttempts, calculateScore, formatTime, normalizeArabicName, seedQuizzes } from "./quiz";
import type { Attempt, Quiz } from "./types";

const attempt=(overrides:Partial<Attempt>):Attempt=>({id:"a",quizId:"q",studentName:"طالب",normalizedName:"طالب",answers:[],score:0,elapsedSeconds:10,submittedAt:"2026-01-01T00:00:00.000Z",...overrides});

describe("quiz rules",()=>{
  it("normalizes Arabic names",()=>{
    expect(normalizeArabicName("  أحمد   على ")).toBe("احمد علي");
    expect(normalizeArabicName("مدرسة")).toBe("مدرسه");
    expect(normalizeArabicName("شمس النهارى")).toBe("شمس النهاري");
    expect(normalizeArabicName("آسماء الإدريسي")).toBe("اسماء الادريسي");
  });
  it("calculates percentage",()=>expect(calculateScore(seedQuizzes[1],[1,0,3])).toBe(67));
  it("handles score edge cases",()=>{
    const empty={...seedQuizzes[0],questions:[]} as unknown as Quiz;
    expect(calculateScore(empty,[0,1])).toBe(0);
    expect(calculateScore(seedQuizzes[1],[1,0,1])).toBe(100);
    expect(calculateScore(seedQuizzes[1],[-1,-1,-1])).toBe(0);
    expect(calculateScore(seedQuizzes[1],[])).toBe(0);
    expect(calculateScore(seedQuizzes[0],[1,9,2,7])).toBe(50);
    expect(calculateScore(seedQuizzes[1],["1" as unknown as number,0,1])).toBe(67);
  });
  it("keeps the best attempt and ranks by time",()=>{ const base={quizId:"q",normalizedName:"ا",submittedAt:"2026-01-01",answers:[] as number[]}; const a:Attempt[]=[{...base,id:"1",studentName:"أ",score:80,elapsedSeconds:20},{...base,id:"2",studentName:"أ",score:90,elapsedSeconds:50},{...base,id:"3",studentName:"ب",normalizedName:"ب",score:90,elapsedSeconds:30}]; expect(bestAttempts(a,"q").map(x=>x.id)).toEqual(["3","2"]); });
  it("best attempt breaks ties by earliest submission and ignores other quizzes",()=>{
    const attempts=[
      attempt({id:"1",normalizedName:"س",score:90,elapsedSeconds:30,submittedAt:"2026-01-02T00:00:00.000Z"}),
      attempt({id:"2",normalizedName:"س",score:90,elapsedSeconds:30,submittedAt:"2026-01-01T00:00:00.000Z"}),
      attempt({id:"3",normalizedName:"ب",score:50,elapsedSeconds:5}),
      attempt({id:"4",normalizedName:"ج",quizId:"other",score:100,elapsedSeconds:1}),
    ];
    expect(bestAttempts(attempts,"q").map(x=>x.id)).toEqual(["2","3"]);
  });
  it("formats time and clamps negatives",()=>{
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(600)).toBe("10:00");
    expect(formatTime(-5)).toBe("0:00");
  });
});
