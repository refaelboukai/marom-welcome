CREATE TABLE public.short_day_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  student_name TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  parent_name TEXT NOT NULL DEFAULT '',
  parent_phone TEXT NOT NULL DEFAULT '',
  academic_year TEXT NOT NULL DEFAULT '',
  draft_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'sent',
  request_id UUID,
  sent_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_day_invites TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_day_invites TO authenticated;
GRANT ALL ON public.short_day_invites TO service_role;

ALTER TABLE public.short_day_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to short_day_invites"
ON public.short_day_invites FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_short_day_invites_updated_at
BEFORE UPDATE ON public.short_day_invites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();