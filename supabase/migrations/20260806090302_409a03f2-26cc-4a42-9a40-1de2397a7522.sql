CREATE TABLE public.short_day_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  academic_year TEXT NOT NULL DEFAULT 'תשפ"ז',
  request_date DATE,
  student_name TEXT NOT NULL DEFAULT '',
  student_id_number TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  school_name TEXT NOT NULL DEFAULT 'מרום — בית אקשטיין יבנה',
  homeroom_teacher TEXT NOT NULL DEFAULT '',
  principal_name TEXT NOT NULL DEFAULT '',
  exit_time TEXT NOT NULL DEFAULT '',
  days JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date DATE,
  reason TEXT NOT NULL DEFAULT '',
  mother_name TEXT NOT NULL DEFAULT '',
  mother_signature TEXT NOT NULL DEFAULT '',
  mother_sign_date DATE,
  father_name TEXT NOT NULL DEFAULT '',
  father_signature TEXT NOT NULL DEFAULT '',
  father_sign_date DATE,
  declarations_accepted BOOLEAN NOT NULL DEFAULT false,
  decision TEXT NOT NULL DEFAULT 'pending',
  decision_exit_time TEXT NOT NULL DEFAULT '',
  decision_days JSONB NOT NULL DEFAULT '[]'::jsonb,
  decision_notes TEXT NOT NULL DEFAULT '',
  decision_date DATE,
  sig_teacher TEXT NOT NULL DEFAULT '',
  sig_treatment_coordinator TEXT NOT NULL DEFAULT '',
  sig_counselor TEXT NOT NULL DEFAULT '',
  sig_principal TEXT NOT NULL DEFAULT '',
  sig_supervisor TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_day_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_day_requests TO authenticated;
GRANT ALL ON public.short_day_requests TO service_role;

ALTER TABLE public.short_day_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to short_day_requests" ON public.short_day_requests FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_short_day_requests_updated_at BEFORE UPDATE ON public.short_day_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();