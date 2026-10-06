import { describe, expect, it } from "vitest";
import { seedQuizzes } from "./quiz";
import type { Attempt, Quiz } from "./types";
import { sanitizeAttempt, sanitizeAttempts, sanitizeQuiz, sanitizeQuizzes } from "./validate";

const validQuiz:Quiz=seedQuizzes[0];
const validQuestion=validQuiz.questions[0];

const attempt=(overrides:Partial<Attempt>):Attempt=>({id:"a1",quizId:"science-1",studentName:"سارة أحمد",normalizedName:"ساره احمد",answers:[0,1],score:80,elapsedSeconds:45,submittedAt:"2026-01-01T00:00:00.000Z",...overrides});

describe("sanitizeQuizzes",()=>{
  it("passes seed quizzes through unchanged",()=>{
    expect(sanitizeQuizzes(JSON.parse(JSON.stringify(seedQuizzes)))).toEqual(seedQuizzes);
    expect(sanitizeQuiz(validQuiz)).toEqual(validQuiz);
  });
  it("rejects non-arrays and non-objects",()=>{
    expect(sanitizeQuizzes(null)).toEqual([]);
    expect(sanitizeQuizzes("quizzes")).toEqual([]);
    expect(sanitizeQuizzes({})).toEqual([]);
    expect(sanitizeQuiz(null)).toBeNull();
    expect(sanitizeQuiz([])).toBeNull();
  });
  it("drops quizzes with invalid shape",()=>{
    expect(sanitizeQuiz({...validQuiz,title:""})).toBeNull();
    expect(sanitizeQuiz({...validQuiz,id:""})).toBeNull();
    expect(sanitizeQuiz({...validQuiz,published:"yes"})).toBeNull();
    expect(sanitizeQuiz({...validQuiz,durationMinutes:0})).toBeNull();
    expect(sanitizeQuiz({...validQuiz,durationMinutes:601})).toBeNull();
    expect(sanitizeQuiz({...validQuiz,questions:[]})).toBeNull();
  });
  it("accepts null durationMinutes (untimed quiz)",()=>{
    const untimed={...seedQuizzes[1]};
    expect(sanitizeQuiz(untimed)).toEqual(untimed);
  });
  it("drops questions with out-of-range correctIndex or bad options, then empty quizzes",()=>{
    expect(sanitizeQuiz({...validQuiz,questions:[{...validQuestion,correctIndex:99}]})).toBeNull();
    expect(sanitizeQuiz({...validQuiz,questions:[{...validQuestion,options:["واحد"]}]})).toBeNull();
    expect(sanitizeQuiz({...validQuiz,questions:[{...validQuestion,options:["أ","ب",5]}]})).toBeNull();
    expect(sanitizeQuiz({...validQuiz,questions:[{...validQuestion,type:"fill_blank"}]})).toBeNull();
    const mixed=sanitizeQuiz({...validQuiz,questions:[{...validQuestion,correctIndex:-1},{...validQuestion}]});
    expect(mixed?.questions).toHaveLength(1);
  });
  it("dedupes quizzes by id keeping the first",()=>{
    const dupes=[validQuiz,{...validQuiz,title:"نسخة ثانية"}];
    expect(sanitizeQuizzes(dupes)).toEqual([validQuiz]);
  });
  it("skips invalid entries instead of failing everything",()=>{
    const result=sanitizeQuizzes([null,"x",seedQuizzes[1]]);
    expect(result).toEqual([seedQuizzes[1]]);
  });
});

describe("sanitizeAttempts",()=>{
  it("keeps valid attempts",()=>expect(sanitizeAttempt(attempt({}),0)).toEqual(attempt({})));
  it("rejects non-objects and missing required fields",()=>{
    expect(sanitizeAttempt(null,0)).toBeNull();
    expect(sanitizeAttempt("attempt",0)).toBeNull();
    expect(sanitizeAttempt(attempt({studentName:""}),0)).toBeNull();
    expect(sanitizeAttempt(attempt({quizId:undefined}),0)).toBeNull();
    expect(sanitizeAttempt(attempt({answers:"0,1" as unknown as number[]}),0)).toBeNull();
    expect(sanitizeAttempt(attempt({score:"80" as unknown as number}),0)).toBeNull();
    expect(sanitizeAttempt(attempt({score:Number.NaN}),0)).toBeNull();
    expect(sanitizeAttempt(attempt({submittedAt:"not-a-date"}),0)).toBeNull();
    expect(sanitizeAttempt(attempt({elapsedSeconds:90000}),0)).toBeNull();
  });
  it("recomputes normalizedName from studentName",()=>{
    const fixed=sanitizeAttempt(attempt({studentName:"  أحمد   على ",normalizedName:"hacked"}),0)!;
    expect(fixed.normalizedName).toBe("احمد علي");
    expect(fixed.studentName).toBe("أحمد   على");
  });
  it("clamps score and elapsed to valid ranges",()=>{
    expect(sanitizeAttempt(attempt({score:150}),0)?.score).toBe(100);
    expect(sanitizeAttempt(attempt({score:-5}),0)?.score).toBe(0);
    expect(sanitizeAttempt(attempt({score:74.6}),0)?.score).toBe(75);
    expect(sanitizeAttempt(attempt({elapsedSeconds:0}),0)?.elapsedSeconds).toBe(1);
    expect(sanitizeAttempt(attempt({elapsedSeconds:-30}),0)).toBeNull();
  });
  it("maps invalid answers to unanswered and normalizes submittedAt",()=>{
    const a=sanitizeAttempt(attempt({answers:[0,"2" as unknown as number,1.5,-3],submittedAt:"2026-03-05T10:00:00+02:00"}),0)!;
    expect(a.answers).toEqual([0,-1,-1,-1]);
    expect(a.submittedAt).toBe(new Date("2026-03-05T10:00:00+02:00").toISOString());
  });
  it("synthesizes ids when missing",()=>{
    const id=sanitizeAttempt(attempt({id:""}),7)?.id??"";
    expect(id).toMatch(/^a-7-/);
  });
  it("sanitizeAttempts filters invalid entries and rejects non-arrays",()=>{
    expect(sanitizeAttempts([attempt({id:"1"}),"junk",attempt({id:"2",score:9999})]).map(a=>a.id)).toEqual(["1","2"]);
    expect(sanitizeAttempts(undefined)).toEqual([]);
    expect(sanitizeAttempts(42)).toEqual([]);
  });
});
