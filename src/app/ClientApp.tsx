"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Attempt, Quiz, LeaderboardRow, ReviewItem } from "@/lib/types";
import { bestAttempts, calculateScore, formatTime, normalizeStudentName, buildReview, newId } from "@/lib/grading";
import { seedQuizzes } from "@/lib/quiz";
import { sanitizeAttempts, sanitizeQuizzes } from "@/lib/validate";
import { parseImportQuiz, ImportQuiz } from "@/lib/schema";
import confetti from "canvas-confetti";

type View="home"|"play"|"result"|"leaderboard"|"admin";
const QUIZZES_KEY="nabd-quizzes-v2", ATTEMPTS_KEY="nabd-attempts-v2";

function EmptyState({ text, style }: { text: string, style?: React.CSSProperties }) {
  return <div className="empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 1rem', ...style }}>
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
    <p style={{ margin: 0 }}>{text}</p>
  </div>;
}

const getScoreClass = (score: number) => {
  if (score >= 70) return "score-ring good";
  if (score >= 50) return "score-ring warn";
  return "score-ring retry";
};

export default function ClientApp({ hasSupabase }: { hasSupabase: boolean }){
  const [ready,setReady]=useState(false);
  const [view,setView]=useState<View>("home");
  const [name,setName]=useState("");
  const [quizzes,setQuizzes]=useState<Quiz[]>([]),[attempts,setAttempts]=useState<Attempt[]>([]),[active,setActive]=useState<Quiz|null>(null);
  const [lastAttempt,setLastAttempt]=useState<Attempt|null>(null);
  const [lastReview,setLastReview]=useState<ReviewItem[]|null>(null);

  useEffect(() => {
    const handleHash = () => { if (window.location.hash === "#admin") setView("admin"); };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  useEffect(() => {
    async function loadQuizzes() {
      if (hasSupabase) {
        try {
          const res = await fetch("/api/quizzes");
          if (res.ok) setQuizzes(await res.json());
        } catch (e) {
          console.error(e);
        }
      } else {
        const storedQuizzes=localStorage.getItem(QUIZZES_KEY);
        if(storedQuizzes!==null){
          const safe=sanitizeQuizzes(JSON.parse(storedQuizzes));
          setQuizzes(safe.length?safe:seedQuizzes);
        } else {
          setQuizzes(seedQuizzes);
        }
        setAttempts(sanitizeAttempts(JSON.parse(localStorage.getItem(ATTEMPTS_KEY)||"[]")));
      }
      setReady(true);
    }
    loadQuizzes();
  }, [hasSupabase]);

  useEffect(()=>{
    if(!hasSupabase && ready){
      localStorage.setItem(QUIZZES_KEY,JSON.stringify(quizzes));
      localStorage.setItem(ATTEMPTS_KEY,JSON.stringify(attempts));
    }
  },[quizzes,attempts,ready,hasSupabase]);

  const goHome=()=>{setView("home");setActive(null);setLastAttempt(null);setLastReview(null); window.history.pushState(null, '', window.location.pathname);};

  const handleFinish = async (answers: number[], elapsedSeconds: number) => {
    if (!active) return;
    if (hasSupabase) {
      try {
        const res = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId: active.id, studentName: name.trim(), answers, elapsedSeconds })
        });
        if (res.ok) {
          const data = await res.json();
          setLastAttempt(data.attempt);
          setLastReview(data.review);
        }
      } catch (e) { console.error(e); }
    } else {
      const attempt: Attempt = {
        id: newId(),
        quizId: active.id,
        studentName: name.trim(),
        normalizedName: normalizeStudentName(name),
        answers,
        score: calculateScore(active, answers),
        elapsedSeconds,
        submittedAt: new Date().toISOString()
      };
      setAttempts(x=>[...x,attempt]);
      setLastAttempt(attempt);
      setLastReview(buildReview(active, answers));
    }
    setView("result");
  };

  return <div className="shell">
    <Header view={view} onHome={goHome} onLeaderboard={()=>setView("leaderboard")}/>
    <main id="main" tabIndex={-1}>
      {!ready?<EmptyState text="جارٍ تجهيز الاختبارات…" />:
      view==="home"?<Home name={name} setName={setName} quizzes={quizzes} onStart={q=>{setActive(q);setView("play")}} hasSupabase={hasSupabase}/>:
      view==="play"&&active?<Player quiz={active} studentName={name} onCancel={goHome} onFinish={handleFinish}/>:
      view==="result"&&active&&lastAttempt&&lastReview?<Result quiz={active} attempt={lastAttempt} review={lastReview} onHome={goHome} onBoard={()=>setView("leaderboard")}/>:
      view==="leaderboard"?<Leaderboard quizzes={quizzes} attempts={attempts} hasSupabase={hasSupabase}/>:
      <Admin quizzes={quizzes} setQuizzes={setQuizzes} hasSupabase={hasSupabase}/>}
    </main>
    <footer>نبض — تعلّم، جرّب، وتقدّم ✦</footer>
  </div>;
}

function Header({view,onHome,onLeaderboard}:{view:View;onHome:()=>void;onLeaderboard:()=>void}){return <header><nav aria-label="التنقل الرئيسي"><button className="brand" onClick={onHome}><span aria-hidden="true">✓</span><span className="brand-word">نبض</span></button><div><button className="nav-link" aria-current={view==="home"?"page":undefined} onClick={onHome}>الاختبارات</button><button className="nav-link" aria-current={view==="leaderboard"?"page":undefined} onClick={onLeaderboard}>المتصدرون</button></div></nav></header>}

function Home({name,setName,quizzes,onStart,hasSupabase}:{name:string;setName:(s:string)=>void;quizzes:Quiz[];onStart:(q:Quiz)=>void;hasSupabase:boolean}){
  const [error,setError]=useState(""); 
  const submit=(e:FormEvent<HTMLFormElement>,q:Quiz)=>{e.preventDefault();if(name.trim().length<2){setError("اكتب اسمك أولًا (حرفان على الأقل).");return}setError("");onStart(q)};
  return <>
    <section className="hero">
      <div className="welcome-copy"><div className="eyebrow">مساحتك للتعلّم</div>
      <h1>اختبر معلوماتك.<br/><em>واكتشف تقدّمك.</em></h1>
      <p>اختبارات قصيرة متنوعة. اكتب اسمك واختر اختبارًا لتبدأ.</p></div>
      <div className="name-box"><label htmlFor="student-name">اسم الطالب</label><span id="name-help" className="help">سيظهر اسمك في لوحة المتصدرين.</span><input id="student-name" name="studentName" value={name} onChange={e=>setName(e.target.value)} maxLength={60} required autoComplete="name" placeholder="مثال: سارة أحمد" aria-describedby="name-help name-error"/>{error&&<strong id="name-error" className="error" role="alert">{error}</strong>}</div>
    </section>
    <section className="content">
      {!hasSupabase && <div className="demo-notice"><strong>وضع التجربة (Demo):</strong> قاعدة البيانات غير متصلة. التغييرات تحفظ في متصفحك فقط.</div>}
      <div className="section-title"><div><span className="eyebrow">ابدأ الآن</span><h2>الاختبارات المتاحة</h2></div><span className="count">{quizzes.length} اختبارات متاحة</span></div>
      <div className="quiz-grid">{quizzes.map((q,i)=><article className="quiz-card" key={q.id}><div className={`card-icon c${i%3}`}>{["✦","أ","∞"][i%3]}</div><div className="tags"><span>{q.unit}</span><span>{q.durationMinutes?`${q.durationMinutes} دقائق`:"بدون مؤقت"}</span></div><h3>{q.title}</h3><p>{q.description}</p><div className="card-foot"><span>{q.questions.length} أسئلة</span><form onSubmit={e=>submit(e,q)}><button className="primary" type="submit"><span>ابدأ الاختبار</span> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></button></form></div></article>)}
      {quizzes.length===0&&<EmptyState style={{gridColumn:"1/-1"}} text="لا توجد اختبارات منشورة حالياً." />}
      </div>
    </section>
  </>;
}

function Player({quiz,studentName,onCancel,onFinish}:{quiz:Quiz;studentName:string;onCancel:()=>void;onFinish:(answers:number[], elapsedSeconds:number)=>void}){
  const [answers,setAnswers]=useState<number[]>(()=>quiz.questions.map(()=>-1)),[index,setIndex]=useState(0);
  const durationSeconds=quiz.durationMinutes?quiz.durationMinutes*60:null;
  const [remaining,setRemaining]=useState(durationSeconds);
  const [started]=useState(()=>Date.now());
  const answersRef=useRef(answers),finishedRef=useRef(false),finishRef=useRef<()=>void>(()=>{});
  
  const setAnswer=(value:number)=>{const next=answers.map((x,j)=>j===index?value:x);answersRef.current=next;setAnswers(next);};
  const finish=()=>{
    if(finishedRef.current)return; finishedRef.current=true;
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - started) / 1000));
    onFinish(answersRef.current, elapsedSeconds);
  };
  useEffect(()=>{finishRef.current=finish;});
  useEffect(()=>{
    if(durationSeconds===null)return;
    const deadline=started+durationSeconds*1000;
    const t=setInterval(()=>{const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));setRemaining(left);if(left<=0){clearInterval(t);finishRef.current();}},250);
    return()=>clearInterval(t);
  },[durationSeconds,started]);
  const q=quiz.questions[index],answered=answers[index]>=0;
  return <section className="play"><div className="play-top"><button className="back" onClick={onCancel}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg><span>رجوع</span></button><div><strong>{quiz.title}</strong><small>{studentName}</small></div>{remaining!==null&&<time className={remaining<=30?"timer low":"timer"} aria-live="polite">⏱ {formatTime(remaining)}</time>}</div><div className="progress"><p>السؤال {index+1} من {quiz.questions.length}</p><div className="bar" role="progressbar" aria-label="التقدم في الاختبار" aria-valuemin={1} aria-valuemax={quiz.questions.length} aria-valuenow={index+1}><span style={{width:`${(index+1)/quiz.questions.length*100}%`}}/></div></div><form onSubmit={e=>{e.preventDefault();if(index===quiz.questions.length-1)finish();else setIndex(i=>i+1)}}><fieldset><legend>{q.text}</legend><p className="question-type">{q.type==="mcq"?"اختر إجابة واحدة":"صح أم خطأ؟"}</p><div className="options">{q.options.map((option,i)=><label key={i} className={answers[index]===i?"selected":""}><input type="radio" name={`q-${q.id}`} value={i} checked={answers[index]===i} onChange={()=>setAnswer(i)}/><span>{option}</span></label>)}</div></fieldset><div className="play-actions"><button type="button" className="secondary" disabled={index===0} onClick={()=>setIndex(i=>i-1)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg><span>السابق</span></button><button className="primary" type="submit" disabled={!answered}>{index===quiz.questions.length-1?<><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>إنهاء وتسليم</span></> : <><span>السؤال التالي</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg></>}</button></div></form></section>;
}

function Result({quiz,attempt,review,onHome,onBoard}:{quiz:Quiz;attempt:Attempt;review:ReviewItem[];onHome:()=>void;onBoard:()=>void}){
  useEffect(() => {
    if (attempt.score === 100) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
      return () => clearInterval(interval);
    }
  }, [attempt.score]);

  return <section className="result"><div className={getScoreClass(attempt.score)}><strong>{attempt.score}%</strong><span>{attempt.score===100?"بطل! 🏆":attempt.score>=70?"أحسنت!":"حاول مرة أخرى"}</span></div><h1>انتهى الاختبار يا {attempt.studentName}</h1><p>أنهيت {quiz.questions.length} أسئلة في {formatTime(attempt.elapsedSeconds)}.</p><div className="result-actions"><button className="primary" onClick={onBoard}>شاهد الترتيب</button><button className="secondary" onClick={onHome}>اختبار آخر</button></div><h2>مراجعة الإجابات</h2><ol className="review">{review.map((r,i)=>{return <li key={i} className={r.ok?"correct":"wrong"}><strong>{r.ok?"✓ إجابة صحيحة":"✕ إجابة غير صحيحة"}</strong><h3>{quiz.questions[i].text}</h3><p>إجابتك: {r.given?r.given:"بدون إجابة"}</p>{!r.ok&&<p>الصحيح: {r.correct}</p>}<small>{r.explanation}</small></li>})}</ol></section>
}

function Leaderboard({quizzes,attempts,hasSupabase}:{quizzes:Quiz[];attempts:Attempt[];hasSupabase:boolean}){
  const [qid,setQid]=useState(quizzes[0]?.id||"");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  useEffect(() => {
    if (!qid) return;
    if (hasSupabase) {
      fetch(`/api/leaderboard?quizId=${qid}`).then(r => r.json()).then(setRows).catch(console.error);
    } else {
      setRows(bestAttempts(attempts, qid));
    }
  }, [qid, attempts, hasSupabase]);

  return <section className="content narrow"><span className="eyebrow">روح المنافسة</span><h1>لوحة المتصدرين</h1><label htmlFor="board-quiz">اختر الاختبار</label><select id="board-quiz" value={qid} onChange={e=>setQid(e.target.value)}>{quizzes.map(q=><option value={q.id} key={q.id}>{q.title}</option>)}</select>{rows.length?<div className="table-wrap"><table><caption>أفضل محاولة لكل طالب</caption><thead><tr><th scope="col">الترتيب</th><th scope="col">الطالب</th><th scope="col">النتيجة</th><th scope="col">الوقت</th></tr></thead><tbody>{rows.map((a,i)=><tr key={a.id}><td className="rank"><span aria-label={`المركز ${i+1}`}>{i<3?["🥇","🥈","🥉"][i]:i+1}</span></td><th scope="row">{a.studentName}</th><td>{a.score}%</td><td>{formatTime(a.elapsedSeconds)}</td></tr>)}</tbody></table></div>:<EmptyState text="لا توجد محاولات بعد. كن أول المتصدرين!" />}<p className="privacy">تظهر الأسماء والنتائج والأوقات بشكل عام {hasSupabase?"في التطبيق":"داخل هذا المتصفح"}.</p></section>
}

function Admin({quizzes,setQuizzes,hasSupabase}:{quizzes:Quiz[];setQuizzes:(q:Quiz[])=>void;hasSupabase:boolean}){
  const [unlocked,setUnlocked]=useState(false),[pin,setPin]=useState(""),[message,setMessage]=useState("");
  const [adminQuizzes, setAdminQuizzes] = useState<Quiz[]>(quizzes);
  const [draft, setDraft] = useState<ImportQuiz | null>(null);
  const [preview, setPreview] = useState<Quiz | null>(null);

  useEffect(() => {
    if (unlocked && hasSupabase) {
      fetch("/api/admin/quizzes").then(r => r.ok ? r.json() : null).then(data => {
        if (data) setAdminQuizzes(data);
      }).catch(console.error);
    } else if (unlocked) {
      setAdminQuizzes(quizzes);
    }
  }, [unlocked, quizzes, hasSupabase]);

  const login = async (e:FormEvent) => {
    e.preventDefault();
    if (hasSupabase) {
      const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
      if (res.ok) { setUnlocked(true); setMessage(""); } else { setMessage("رقم الدخول غير صحيح."); }
    } else {
      if (pin === "1234") { setUnlocked(true); setMessage(""); } else { setMessage("رقم الدخول غير صحيح."); }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { setMessage("حجم الملف يتجاوز 1 ميغابايت."); return; }
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = parseImportQuiz(json);
      if (res.ok) {
        setDraft(res.data);
        setMessage("تم رفع الملف بنجاح. راجع المسودة أدناه.");
      } else {
        setMessage(res.error);
      }
    } catch (err) {
      setMessage("صيغة الملف غير صحيحة، تأكد من أنه JSON صالح.");
    }
    e.target.value = '';
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (hasSupabase) {
      try {
        const res = await fetch("/api/admin/quizzes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
        if (res.ok) {
          const saved = await res.json();
          setAdminQuizzes([saved, ...adminQuizzes]);
          setDraft(null);
          setMessage("حُفظت المسودة.");
        } else {
          setMessage((await res.json()).error || "خطأ أثناء الحفظ.");
        }
      } catch (e: any) { setMessage(e.message); }
    } else {
      const newQuiz: Quiz = {
        id: newId(),
        title: draft.title,
        unit: draft.unit,
        description: draft.description,
        durationMinutes: draft.durationMinutes,
        published: false,
        questions: draft.questions.map(q => ({ ...q, id: newId() }))
      };
      const updated = [newQuiz, ...quizzes];
      setQuizzes(updated);
      setAdminQuizzes(updated);
      setDraft(null);
      setMessage("حُفظت المسودة.");
    }
  };

  const togglePublish = async (q: Quiz) => {
    const nextPublished = !q.published;
    if (hasSupabase) {
      const res = await fetch(`/api/admin/quizzes/${q.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: nextPublished }) });
      if (res.ok) {
        setAdminQuizzes(adminQuizzes.map(x => x.id === q.id ? { ...x, published: nextPublished } : x));
      } else {
        setMessage("حدث خطأ أثناء التحديث.");
      }
    } else {
      const updated = quizzes.map(x => x.id === q.id ? { ...x, published: nextPublished } : x);
      setQuizzes(updated);
      setAdminQuizzes(updated);
    }
  };

  const deleteQuiz = async (q: Quiz) => {
    if (!confirm(`هل أنت متأكد من حذف اختبار "${q.title}" نهائياً؟`)) return;
    if (hasSupabase) {
      try {
        const res = await fetch(`/api/admin/quizzes/${q.id}`, { method: "DELETE" });
        if (res.ok) {
          setAdminQuizzes(adminQuizzes.filter(x => x.id !== q.id));
          setQuizzes(quizzes.filter(x => x.id !== q.id));
          if (preview?.id === q.id) setPreview(null);
          setMessage("تم الحذف بنجاح.");
        } else {
          setMessage("حدث خطأ أثناء الحذف.");
        }
      } catch (e: any) { setMessage(e.message); }
    } else {
      const updated = quizzes.filter(x => x.id !== q.id);
      setQuizzes(updated);
      setAdminQuizzes(updated);
      if (preview?.id === q.id) setPreview(null);
      setMessage("تم الحذف بنجاح.");
    }
  };

  if(!unlocked)return <section className="admin narrow"><span className="eyebrow">لوحة المدرّس</span><h1>دخول المدرّس</h1><p>الرقم الافتراضي في وضع العرض هو <code>1234</code>.</p><form onSubmit={login}><label htmlFor="pin">رقم الدخول</label><input id="pin" name="pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={e=>setPin(e.target.value)} required/><button className="primary" type="submit">دخول</button>{message&&<p className="error" role="alert">{message}</p>}</form></section>;

  const exampleJson = JSON.stringify({
    title: "اختبار المجموعة الشمسية",
    unit: "الفضاء",
    description: "اختبار مبسط",
    durationMinutes: 5,
    questions: [
      {
        type: "mcq",
        text: "ما أكبر كواكب المجموعة الشمسية؟",
        options: ["الأرض", "المشتري", "المريخ", "زحل"],
        correctIndex: 1,
        explanation: "المشتري هو أكبر الكواكب."
      }
    ]
  }, null, 2);

  return <section className="admin">
    <span className="eyebrow">لوحة المدرّس</span>
    <h1>إدارة الاختبارات</h1>
    <div className="admin-grid">
      <div className="panel">
        <h2>رفع ملف JSON</h2>
        <p>ارفع ملف اختبار جديد بصيغة JSON المطابقة للمعايير.</p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
          <label className="primary button-like" style={{ cursor: 'pointer', textAlign: 'center' }}>
            اختر ملف JSON
            <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
          <a href={`data:application/json;charset=utf-8,${encodeURIComponent(exampleJson)}`} download="example.json" className="secondary button-like" style={{ textAlign: 'center', textDecoration: 'none' }}>تنزيل ملف مثال</a>
        </div>
        <p className="status" aria-live="polite" style={{ marginTop: '1rem' }}>{message}</p>
      </div>
      
      <div className="panel">
        <h2>اختباراتي</h2>
        <ul className="admin-list">
          {adminQuizzes.map(q=><li key={q.id}>
            <div><strong>{q.title}</strong><small>{q.published?"منشور":"مسودة"} · {q.questions.length} أسئلة</small></div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="secondary small" onClick={() => { setPreview(q); setDraft(null); }}>معاينة</button>
              <button className="secondary small" onClick={()=>togglePublish(q)}>{q.published?"إلغاء النشر":"نشر"}</button>
              <button className="secondary small" style={{ color: 'var(--bad)' }} onClick={()=>deleteQuiz(q)}>حذف</button>
            </div>
          </li>)}
          {adminQuizzes.length === 0 && <li style={{listStyle:'none', padding:0, border:0}}><EmptyState text="لا توجد اختبارات." /></li>}
        </ul>
      </div>
    </div>
    
    {draft && (
      <div className="draft">
        <h2>راجع وعدّل المسودة</h2>
        <label htmlFor="draft-title">عنوان الاختبار</label>
        <input id="draft-title" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/>
        <label htmlFor="draft-unit">الوحدة</label>
        <input id="draft-unit" value={draft.unit} onChange={e=>setDraft({...draft,unit:e.target.value})}/>
        <label htmlFor="draft-description">الوصف</label>
        <textarea id="draft-description" value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/>
        <label htmlFor="draft-duration">المدة (دقائق) - اتركها فارغة للاختبار بدون مؤقت</label>
        <input id="draft-duration" type="number" min="1" max="600" value={draft.durationMinutes || ""} onChange={e=>setDraft({...draft,durationMinutes: e.target.value ? parseInt(e.target.value) : null})}/>
        
        <h3>الأسئلة ({draft.questions.length})</h3>
        <ol>
          {draft.questions.map((q,i)=><li key={i}>
            <label htmlFor={`draft-q-${i}`}>السؤال {i+1} ({q.type === 'mcq' ? 'خيارات متعددة' : 'صح وخطأ'})</label>
            <input id={`draft-q-${i}`} value={q.text} onChange={e=>setDraft({...draft,questions:draft.questions.map((x,j)=>j===i?{...x,text:e.target.value}:x)})}/>
            <small>الإجابة الصحيحة: {q.options[q.correctIndex]}</small>
            <details>
              <summary>تعديل الخيارات والشرح</summary>
              <div style={{ padding: '0.5rem', background: 'var(--surface-sunken)', borderRadius: '0.5rem', marginTop: '0.5rem' }}>
                <label>الشرح</label>
                <input value={q.explanation} onChange={e=>setDraft({...draft,questions:draft.questions.map((x,j)=>j===i?{...x,explanation:e.target.value}:x)})}/>
              </div>
            </details>
          </li>)}
        </ol>
        <button className="primary" onClick={saveDraft}>حفظ كمسودة</button>
      </div>
    )}

    {preview && (
      <div className="draft">
        <h2>معاينة: {preview.title}</h2>
        <button className="secondary small" onClick={() => setPreview(null)}>إغلاق المعاينة</button>
        <div style={{ marginTop: '1.5rem', background: 'var(--surface-sunken)', padding: '1rem', borderRadius: '10px' }}>
          <p><strong>الوحدة:</strong> {preview.unit}</p>
          <p><strong>الوصف:</strong> {preview.description}</p>
          <p><strong>المدة:</strong> {preview.durationMinutes ? `${preview.durationMinutes} دقائق` : 'بدون مؤقت'}</p>
        </div>
        <h3 style={{ marginTop: '2rem' }}>الأسئلة ({preview.questions.length})</h3>
        <ol style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {preview.questions.map((q,i)=><li key={i} style={{ background: 'var(--card)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--line)' }}>
            <strong>السؤال {i+1}: {q.text}</strong>
            <ul style={{ margin: '0.8rem 0', listStyleType: 'none', paddingInlineStart: '0' }}>
              {q.options.map((opt, j) => (
                <li key={j} style={{ 
                  color: j === q.correctIndex ? 'var(--ok)' : 'var(--muted)', 
                  fontWeight: j === q.correctIndex ? 'bold' : 'normal',
                  padding: '0.3rem 0'
                }}>
                  {j === q.correctIndex ? '✓ ' : '○ '} {opt}
                </li>
              ))}
            </ul>
            <p style={{ margin: 0 }}><small><strong>الشرح:</strong> {q.explanation}</small></p>
          </li>)}
        </ol>
      </div>
    )}
  </section>;
}
