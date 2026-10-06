import { z } from "zod";

export const IMPORT_MAX_BYTES = 512 * 1024;
export const IMPORT_MAX_QUESTIONS = 100;

const questionIndex = (n: number) => `السؤال رقم ${n}`;
const NOT_SUPPORTED_TYPE = "نوع السؤال غير مدعوم. الأنواع المسموحة: mcq أو true_false.";
const TF_OPTIONS_MSG = "خيارات سؤال صح/خطأ يجب أن تكون «صح» و«خطأ» بالذات.";

const rawText = (label: string) =>
  z.string({ error: `${label} مفقود.` }).trim().min(1, `${label} مفقود أو فارغ.`);

const mcqQuestion = z.object({
  type: z.literal("mcq"),
  text: rawText("نص السؤال").max(500, "نص السؤال أطول من 500 حرف."),
  options: z
    .array(z.string().trim().min(1, "لا يمكن أن يكون نص الخيار فارغًا.").max(200, "نص الخيار أطول من 200 حرف."))
    .min(2, "يجب أن يحتوي السؤال على خيارين على الأقل.")
    .max(6, "أقصى عدد للخيارات هو ستة."),
  correctIndex: z.number({ error: "رقم الإجابة الصحيحة (correctIndex) مفقود." }).int("رقم الإجابة الصحيحة يجب أن يكون عددًا صحيحًا."),
  explanation: rawText("شرح الإجابة").max(500, "نص الشرح أطول من 500 حرف."),
});

const tfQuestion = z.object({
  type: z.literal("true_false"),
  text: rawText("نص السؤال").max(500, "نص السؤال أطول من 500 حرف."),
  options: z.array(z.string().trim().min(1, "لا يمكن أن يكون نص الخيار فارغًا.").max(200, "نص الخيار أطول من 200 حرف.")),
  correctIndex: z.number({ error: "رقم الإجابة الصحيحة (correctIndex) مفقود." }).int("رقم الإجابة الصحيحة يجب أن يكون عددًا صحيحًا."),
  explanation: rawText("شرح الإجابة").max(500, "نص الشرح أطول من 500 حرف."),
});

const questionUnion = z.discriminatedUnion("type", [mcqQuestion, tfQuestion]);

export const importQuizSchema = z.object({
  title: rawText("عنوان الاختبار").max(120, "عنوان الاختبار أطول من 120 حرفًا."),
  unit: rawText("الوحدة").max(120, "اسم الوحدة أطول من 120 حرفًا."),
  description: z.string().max(400, "وصف الاختبار أطول من 400 حرف.").default(""),
  durationMinutes: z
    .number({ error: "مدة الاختبار (durationMinutes) يجب أن تكون عددًا أو null." })
    .int("مدة الاختبار يجب أن تكون عددًا صحيحًا من الدقائق.")
    .min(1, "أقل مدة مسموحة دقيقة واحدة.")
    .max(600, "أقصى مدة مسموحة 600 دقيقة.")
    .nullable(),
  questions: z
    .array(questionUnion, { error: `الحقل «questions» يجب أن يكون مصفوفة أسئلة (${NOT_SUPPORTED_TYPE.slice(0, -1)}).` })
    .min(1, "يجب أن يحتوي الاختبار على سؤالٍ واحد على الأقل.")
    .max(100, `عدد الأسئلة يتجاوز الحد المسموح: 100 سؤال.`),
});

export type ImportQuiz = z.infer<typeof importQuizSchema>;

export type ImportResult<Good> = { ok: true; data: Good } | { ok: false; error: string };

function humanizeIssue(issue: z.core.$ZodIssue): string {
  const p = issue.path;
  const label = p.length ? p.map((x) => String(x)).join(".") : "الجذر";
  const qPrefix = p[0] === "questions" && typeof p[1] === "number" ? `${questionIndex(p[1] + 1)}: ` : "";
  const message = issue.message?.trim();

  // Map Zod-internal fallbacks to Arabic guidance.
  if (issue.code === "invalid_union") return `${qPrefix}${NOT_SUPPORTED_TYPE}`;
  if (/^Invalid input/i.test(message ?? "") || !message) {
    return `${qPrefix}الحقل «${label}» غير صالح.`;
  }
  return `${qPrefix}${message}`;
}

/** Converts a Zod validation failure into a single clear Arabic error message. */
export function humanizeImportError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "تعذّر قراءة الملف.";
  if (first.path.length === 0) return `صيغة الملف غير صحيحة: ${first.message}`;
  const msg = humanizeIssue(first);
  return msg.startsWith("صيغة الملف") ? msg : `صيغة الملف غير صحيحة — ${msg}`;
}

/**
 * Parses and validates an import payload: shape, question types, correctIndex bounds,
 * and canonical true/false options. Returns a normal draft ready to preview/edit.
 */
export function parseImportQuiz(value: unknown): ImportResult<ImportQuiz> {
  const parsed = importQuizSchema.safeParse(value);
  if (!parsed.success) return { ok: false, error: humanizeImportError(parsed.error) };

  const data = parsed.data;
  for (let i = 0; i < data.questions.length; i++) {
    const q = data.questions[i];
    const at = questionIndex(i + 1);
    if (q.type === "true_false") {
      if (q.options.length !== 2 || q.options[0] !== "صح" || q.options[1] !== "خطأ") return { ok: false, error: `صيغة الملف غير صحيحة — ${at}: ${TF_OPTIONS_MSG}` };
      if (q.correctIndex !== 0 && q.correctIndex !== 1) return { ok: false, error: `صيغة الملف غير صحيحة — ${at}: رقم الإجابة الصحيحة خارج نطاق الخيارَين (0 أو 1).` };
    } else if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      return { ok: false, error: `صيغة الملف غير صحيحة — ${at}: رقم الإجابة الصحيحة (correctIndex) خارج نطاق الخيارات (0 إلى ${q.options.length - 1}).` };
    }
  }
  return { ok: true, data };
}

export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;

export const submitAttemptSchema = z.object({
  quizId: z.string().min(1, "رقم الاختبار مفقود."),
  studentName: rawText("اسم الطالب").max(60, "اسم الطالب أطول من 60 حرفًا."),
  answers: z.array(z.number().int().min(-1, "قيمة الإجابة غير صالحة.").max(999, "قيمة الإجابة غير صالحة.")).max(100, "عدد الإجابات أكبر من الحد المسموح."),
  elapsedSeconds: z.number({ error: "زمن المحاولة يجب أن يكون رقمًا." }).int().min(0).max(86_400, "زمن المحاولة غير منطقي.").default(0),
});

export const adminLoginSchema = z.object({ pin: z.string().min(1, "رقم الدخول مفقود.").max(64) });

export const adminPublishSchema = z.object({ published: z.boolean() });

export const adminSaveSchema = importQuizSchema.extend({
  id: z.string().min(1).max(64).optional(),
});

export const adminUpdateSchema = z.object({
  title: rawText("عنوان الاختبار").max(120).optional(),
  unit: rawText("الوحدة").max(120).optional(),
  description: z.string().max(400).optional(),
  durationMinutes: z.number().int().min(1).max(600).nullable().optional(),
  published: z.boolean().optional(),
});
