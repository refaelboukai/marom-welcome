ALTER TABLE public.intake_sessions 
  ADD COLUMN IF NOT EXISTS consent_signature text,
  ADD COLUMN IF NOT EXISTS consent_date timestamptz,
  ADD COLUMN IF NOT EXISTS reassessment_student_responses jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reassessment_parent_responses jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reassessment_date timestamptz,
  ADD COLUMN IF NOT EXISTS reassessment_status text DEFAULT 'not_started';