-- Supabase Schema for Nabd Quiz

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  unit TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER,
  published BOOLEAN NOT NULL DEFAULT false,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create attempts table
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER NOT NULL,
  elapsed_seconds INTEGER NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for fast querying
CREATE INDEX idx_quizzes_published ON public.quizzes(published);
CREATE INDEX idx_attempts_quiz_id ON public.attempts(quiz_id);
CREATE INDEX idx_attempts_normalized_name ON public.attempts(normalized_name);
CREATE INDEX idx_attempts_score ON public.attempts(score DESC);

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- Anonymous users (students) can only read published quizzes
CREATE POLICY "Anyone can read published quizzes"
  ON public.quizzes
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

-- Nobody can insert, update, or delete via anon directly.
-- Server routes (using service_role key) will handle writes and drafts.

-- Admin access is exclusively via the server-side service_role key, which bypasses RLS.
