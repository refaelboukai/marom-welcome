
CREATE TABLE public.school_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.school_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_settings TO authenticated;
GRANT ALL ON public.school_settings TO service_role;

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to school_settings"
ON public.school_settings
FOR ALL
USING (true)
WITH CHECK (true);
