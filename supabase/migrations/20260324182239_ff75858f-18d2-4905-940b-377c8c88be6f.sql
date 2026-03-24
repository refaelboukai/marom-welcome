
-- Intake sessions table
CREATE TABLE public.intake_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  student_id_number TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  intake_date DATE NOT NULL DEFAULT CURRENT_DATE,
  parent_name TEXT DEFAULT '',
  parent_phone TEXT DEFAULT '',
  second_parent_name TEXT,
  notes TEXT,
  student_code TEXT NOT NULL UNIQUE,
  parent_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'not_started',
  student_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  student_open_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  parent_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  parent_open_response TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Academic assessments table
CREATE TABLE public.academic_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  subject TEXT NOT NULL, -- 'hebrew', 'math', 'english'
  grade_level TEXT NOT NULL,
  assessment_type TEXT NOT NULL DEFAULT 'diagnostic', -- 'diagnostic', 'mapping', 'progress'
  test_content JSONB, -- generated test questions
  student_answers JSONB DEFAULT '{}'::jsonb,
  ai_analysis JSONB, -- AI mapping report
  performance_level TEXT, -- 'mastery', 'partial', 'needs_intervention'
  dimension_scores JSONB DEFAULT '{}'::jsonb, -- per-skill scores
  action_plan JSONB DEFAULT '[]'::jsonb, -- pedagogical recommendations
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'analyzed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disable RLS for now (code-based auth via access codes)
ALTER TABLE public.intake_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_assessments ENABLE ROW LEVEL SECURITY;

-- Public access policies (access controlled by codes in app logic)
CREATE POLICY "Allow all access to intake_sessions" ON public.intake_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to academic_assessments" ON public.academic_assessments FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for intake_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.intake_sessions;
