export type QuestionType = "mcq" | "true_false";

export type Question = {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

/** Public (redacted) question as delivered to students before submission: no correct answers. */
export type PublicQuestion = Pick<Question, "id" | "type" | "text" | "options">;
export type PublicQuiz = {
  id: string;
  title: string;
  unit: string;
  description: string;
  durationMinutes: number | null;
  questions: PublicQuestion[];
};

export type Quiz = {
  id: string;
  title: string;
  unit: string;
  description: string;
  durationMinutes: number | null;
  published: boolean;
  questions: Question[];
};

/** A quiz parsed from an uploaded JSON file (ids are generated on save). */
export type QuizSeed = {
  title: string;
  unit: string;
  description: string;
  durationMinutes: number | null;
  questions: Omit<Question, "id">[];
};

export type Attempt = {
  id: string;
  quizId: string;
  studentName: string;
  normalizedName: string;
  answers: number[];
  score: number;
  elapsedSeconds: number;
  submittedAt: string;
};

export type LeaderboardRow = {
  id: string;
  studentName: string;
  score: number;
  elapsedSeconds: number;
  submittedAt: string;
};

export type ReviewItem = {
  ok: boolean;
  given: string | null;
  correct: string | null;
  explanation: string;
};
