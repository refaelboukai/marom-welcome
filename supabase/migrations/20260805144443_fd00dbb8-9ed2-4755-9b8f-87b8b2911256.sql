CREATE TABLE public.enrollment_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_first_name text NOT NULL DEFAULT '',
  student_last_name text NOT NULL DEFAULT '',
  student_id_number text NOT NULL DEFAULT '',
  birth_date date,
  gender text,
  grade text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  student_phone text NOT NULL DEFAULT '',
  previous_school text NOT NULL DEFAULT '',
  parent1_name text NOT NULL DEFAULT '',
  parent1_phone text NOT NULL DEFAULT '',
  parent1_email text NOT NULL DEFAULT '',
  parent1_id_number text NOT NULL DEFAULT '',
  parent2_name text NOT NULL DEFAULT '',
  parent2_phone text NOT NULL DEFAULT '',
  parent2_email text NOT NULL DEFAULT '',
  family_status text NOT NULL DEFAULT '',
  siblings text NOT NULL DEFAULT '',
  medical_allergies text NOT NULL DEFAULT '',
  medical_medications text NOT NULL DEFAULT '',
  medical_conditions text NOT NULL DEFAULT '',
  medical_diagnoses text NOT NULL DEFAULT '',
  medical_treatments text NOT NULL DEFAULT '',
  emergency_contact_name text NOT NULL DEFAULT '',
  emergency_contact_phone text NOT NULL DEFAULT '',
  health_fund text NOT NULL DEFAULT '',
  consents jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature_name text NOT NULL DEFAULT '',
  signature_date timestamptz,
  extra_notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'submitted',
  linked_session_id uuid REFERENCES public.intake_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_forms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_forms TO authenticated;
GRANT ALL ON public.enrollment_forms TO service_role;

ALTER TABLE public.enrollment_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to enrollment_forms" ON public.enrollment_forms FOR ALL USING (true) WITH CHECK (true);