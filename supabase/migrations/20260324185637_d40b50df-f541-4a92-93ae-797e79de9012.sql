CREATE TABLE public.support_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.intake_sessions(id) ON DELETE CASCADE,
  domain text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to support_plans" ON public.support_plans
  FOR ALL TO public USING (true) WITH CHECK (true);