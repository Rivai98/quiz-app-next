import type { Attempt, Question, QuestionType, Quiz } from "./types";
import { normalizeArabicName } from "./quiz";

type Raw = Record<string, unknown>;

const isRaw=(v:unknown):v is Raw=>typeof v==="object"&&v!==null&&!Array.isArray(v);
const asString=(v:unknown,min:number,max:number)=>typeof v==="string"&&v.trim().length>=min&&v.length<=max?v:undefined;
const asInt=(v:unknown,min:number,max:number)=>typeof v==="number"&&Number.isInteger(v)&&v>=min&&v<=max?v:undefined;
const isQuestionType=(v:unknown):v is QuestionType=>v==="mcq"||v==="true_false";
const asOptionArray=(v:unknown):v is string[]=>Array.isArray(v)&&v.length>=2&&v.length<=6&&v.every(o=>typeof o==="string"&&o.length>=1&&o.length<=200);

function asQuestion(v:unknown,index:number):Question|null{
  if(!isRaw(v)) return null;
  const type=isQuestionType(v.type)?v.type:undefined;
  const text=asString(v.text,1,500);
  const explanation=typeof v.explanation==="string"&&v.explanation.length<=500?v.explanation:undefined;
  if(!type||!text||!explanation||!asOptionArray(v.options)) return null;
  const options=v.options;
  const correctIndex=asInt(v.correctIndex,0,options.length-1);
  if(correctIndex===undefined) return null;
  const id=asString(v.id,1,100)??`q-${index}-${Math.random().toString(36).slice(2,10)}`;
  return {id,type,text,options,correctIndex,explanation};
}

export function sanitizeQuiz(value:unknown):Quiz|null{
  if(!isRaw(value)) return null;
  const id=asString(value.id,1,100);
  const title=asString(value.title,1,100);
  const unit=asString(value.unit,1,100);
  const description=typeof value.description==="string"&&value.description.length<=300?value.description:undefined;
  const published=typeof value.published==="boolean"?value.published:undefined;
  const hasDuration=value.durationMinutes===null||(typeof value.durationMinutes==="number"&&Number.isInteger(value.durationMinutes)&&value.durationMinutes>=1&&value.durationMinutes<=600);
  if(!id||!title||!unit||description===undefined||published===undefined||!hasDuration) return null;
  const questions=Array.isArray(value.questions)&&value.questions.length>=1&&value.questions.length<=50
    ?value.questions.map(asQuestion).filter((q):q is Question=>q!==null)
    :[];
  if(questions.length===0) return null;
  return {id,title,unit,description,durationMinutes:value.durationMinutes as number|null,published,questions};
}

export function sanitizeQuizzes(value:unknown):Quiz[]{
  if(!Array.isArray(value)) return [];
  const seen=new Set<string>();
  const out:Quiz[]=[];
  for(const raw of value){
    const quiz=sanitizeQuiz(raw);
    if(quiz&&!seen.has(quiz.id)){ seen.add(quiz.id); out.push(quiz); }
  }
  return out;
}

export function sanitizeAttempt(value:unknown,index:number):Attempt|null{
  if(!isRaw(value)) return null;
  const quizId=asString(value.quizId,1,100);
  const studentName=asString(value.studentName,1,60);
  if(!quizId||!studentName) return null;
  if(!Array.isArray(value.answers)||value.answers.length>200) return null;
  const answers=value.answers.map(a=>asInt(a,-1,999)??-1);
  const score=typeof value.score==="number"&&Number.isFinite(value.score)?Math.min(100,Math.max(0,Math.round(value.score))):undefined;
  const elapsed=asInt(value.elapsedSeconds,0,86400);
  const submittedAt=typeof value.submittedAt==="string"&&value.submittedAt.length<=40&&!Number.isNaN(Date.parse(value.submittedAt))?value.submittedAt:undefined;
  if(score===undefined||elapsed===undefined||!submittedAt) return null;
  const id=asString(value.id,1,100)??`a-${index}-${Math.random().toString(36).slice(2,10)}`;
  return {id,quizId,studentName:studentName.trim(),normalizedName:normalizeArabicName(studentName),answers,score,elapsedSeconds:Math.max(1,elapsed),submittedAt:new Date(submittedAt).toISOString()};
}

export function sanitizeAttempts(value:unknown):Attempt[]{
  if(!Array.isArray(value)) return [];
  return value.map(sanitizeAttempt).filter((a):a is Attempt=>a!==null);
}
