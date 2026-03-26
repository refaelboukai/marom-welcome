CREATE TABLE public.assessment_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL DEFAULT 1,
  round_label TEXT NOT NULL DEFAULT 'סבב',
  participants TEXT NOT NULL DEFAULT 'both',
  student_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  parent_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  student_status TEXT NOT NULL DEFAULT 'pending',
  parent_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(session_id, round_number)
);

ALTER TABLE public.assessment_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to assessment_rounds"
  ON public.assessment_rounds
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Migrate existing reassessment data into the new table
INSERT INTO public.assessment_rounds (session_id, round_number, round_label, participants, student_responses, parent_responses, student_status, parent_status, created_at, completed_at)
SELECT 
  id,
  1,
  'סיכום שנתי',
  'both',
  COALESCE(reassessment_student_responses, '{}'::jsonb),
  COALESCE(reassessment_parent_responses, '{}'::jsonb),
  CASE 
    WHEN reassessment_status = 'completed' THEN 'completed'
    WHEN reassessment_status = 'student_completed' THEN 'completed'
    ELSE 'pending'
  END,
  CASE 
    WHEN reassessment_status = 'completed' THEN 'completed'
    WHEN reassessment_status = 'parent_completed' THEN 'completed'
    ELSE 'pending'
  END,
  COALESCE(reassessment_date, now()),
  CASE WHEN reassessment_status = 'completed' THEN COALESCE(reassessment_date, now()) ELSE NULL END
FROM public.intake_sessions
WHERE reassessment_status IS NOT NULL AND reassessment_status NOT IN ('not_started', '');