export type QuestionType = "mcq" | "true_false";
export type Question = { id: string; type: QuestionType; text: string; options: string[]; correctIndex: number; explanation: string };
export type Quiz = { id: string; title: string; unit: string; description: string; durationMinutes: number | null; published: boolean; questions: Question[] };
export type Attempt = { id: string; quizId: string; studentName: string; normalizedName: string; answers: number[]; score: number; elapsedSeconds: number; submittedAt: string };
export type QuizDraft = Omit<Quiz, "id" | "published" | "questions"> & { questions: Omit<Question, "id">[] };
