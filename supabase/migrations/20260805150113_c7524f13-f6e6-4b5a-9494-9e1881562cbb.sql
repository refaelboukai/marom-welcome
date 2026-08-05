CREATE TABLE public.enrollment_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  pair_id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_name text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  academic_year text NOT NULL DEFAULT '',
  parent_name text NOT NULL DEFAULT '',
  parent_phone text NOT NULL DEFAULT '',
  parent_role text NOT NULL DEFAULT 'parent1',
  family_status text NOT NULL DEFAULT 'married',
  draft_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  current_step integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent',
  form_id uuid REFERENCES public.enrollment_forms(id) ON DELETE SET NULL,
  sent_at timestamp with time zone,
  submitted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_invites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_invites TO authenticated;
GRANT ALL ON public.enrollment_invites TO service_role;

ALTER TABLE public.enrollment_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to enrollment_invites"
ON public.enrollment_invites FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_enrollment_invites_pair ON public.enrollment_invites(pair_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_enrollment_invites_updated_at
BEFORE UPDATE ON public.enrollment_invites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.enrollment_forms ADD COLUMN IF NOT EXISTS invite_token text NOT NULL DEFAULT '';
ALTER TABLE public.enrollment_forms ADD COLUMN IF NOT EXISTS pair_id uuid;
ALTER TABLE public.enrollment_forms ADD COLUMN IF NOT EXISTS parent_role text NOT NULL DEFAULT 'parent1';