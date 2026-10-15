CREATE TABLE public.exit_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  student_name text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  parent_phone text NOT NULL DEFAULT '',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'sent',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exit_consents TO anon, authenticated;
GRANT ALL ON public.exit_consents TO service_role;
ALTER TABLE public.exit_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exit all" ON public.exit_consents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);