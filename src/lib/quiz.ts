import type { Attempt, Quiz } from "./types";

export const seedQuizzes: Quiz[] = [
  { id:"science-1", title:"أساسيات العلوم", unit:"الوحدة الأولى", description:"اختبار قصير عن المادة والطاقة والكائنات الحية.", durationMinutes:5, published:true, questions:[
    {id:"s1",type:"mcq",text:"ما الكوكب الأقرب إلى الشمس؟",options:["الأرض","عطارد","المريخ","الزهرة"],correctIndex:1,explanation:"عطارد هو أول كواكب المجموعة الشمسية وأقربها إلى الشمس."},
    {id:"s2",type:"true_false",text:"الماء يتكوّن من الهيدروجين والأكسجين.",options:["صح","خطأ"],correctIndex:0,explanation:"الصيغة الكيميائية للماء هي H₂O."},
    {id:"s3",type:"mcq",text:"أي عضو يضخ الدم في جسم الإنسان؟",options:["الرئة","المعدة","القلب","الكبد"],correctIndex:2,explanation:"القلب يضخ الدم عبر الأوعية الدموية."},
    {id:"s4",type:"true_false",text:"الصوت ينتقل في الفراغ.",options:["صح","خطأ"],correctIndex:1,explanation:"الصوت يحتاج إلى وسط مادي لينتقل."}
  ]},
  { id:"arabic-1", title:"لغتنا الجميلة", unit:"النحو المبسّط", description:"راجع أساسيات الجملة العربية بطريقة خفيفة.", durationMinutes:null, published:true, questions:[
    {id:"a1",type:"mcq",text:"أي كلمة مما يلي فعل؟",options:["كتاب","يكتب","جميل","مدرسة"],correctIndex:1,explanation:"يكتب فعل مضارع يدل على حدث في الزمن الحاضر."},
    {id:"a2",type:"true_false",text:"تبدأ الجملة الاسمية باسم.",options:["صح","خطأ"],correctIndex:0,explanation:"الجملة الاسمية تتكون في أصلها من مبتدأ وخبر."},
    {id:"a3",type:"mcq",text:"ما جمع كلمة «طالب»؟",options:["طلبات","طُلّاب","طالبات فقط","مطلوب"],correctIndex:1,explanation:"الجمع الصحيح هنا هو طُلّاب."}
  ]}
];

export function normalizeArabicName(value:string){ return value.trim().replace(/\s+/g," ").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").toLocaleLowerCase("ar"); }
export function calculateScore(quiz:Quiz, answers:number[]){
  if(quiz.questions.length===0) return 0;
  const correct=quiz.questions.reduce((n,q,i)=>{ const a=answers[i]; return n+(Number.isInteger(a)&&a===q.correctIndex?1:0); },0);
  return Math.round(correct/quiz.questions.length*100);
}
export function bestAttempts(attempts:Attempt[], quizId:string){
  const map=new Map<string,Attempt>();
  for(const a of attempts.filter(x=>x.quizId===quizId)){ const old=map.get(a.normalizedName); if(!old || a.score>old.score || (a.score===old.score && (a.elapsedSeconds<old.elapsedSeconds || (a.elapsedSeconds===old.elapsedSeconds && a.submittedAt.localeCompare(old.submittedAt)<0)))) map.set(a.normalizedName,a); }
  return [...map.values()].sort((a,b)=>b.score-a.score || a.elapsedSeconds-b.elapsedSeconds || a.submittedAt.localeCompare(b.submittedAt));
}
export function formatTime(seconds:number){ const total=Math.max(0,Math.round(seconds)); const m=Math.floor(total/60); const s=total%60; return `${m}:${String(s).padStart(2,"0")}`; }
