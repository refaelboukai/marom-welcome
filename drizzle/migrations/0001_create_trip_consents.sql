CREATE TABLE public.trip_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  student_name text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  parent_phone text NOT NULL DEFAULT '',
  trip jsonb NOT NULL DEFAULT '{}'::jsonb,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'sent',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_consents TO anon, authenticated;
GRANT ALL ON public.trip_consents TO service_role;
ALTER TABLE public.trip_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trip all" ON public.trip_consents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);