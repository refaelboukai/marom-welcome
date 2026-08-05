ALTER TABLE public.enrollment_forms
  ADD COLUMN IF NOT EXISTS form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS academic_year text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS student_signature_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS signature_id_number text NOT NULL DEFAULT '';