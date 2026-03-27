ALTER TABLE public.intake_sessions 
ADD COLUMN student_code_active boolean NOT NULL DEFAULT true,
ADD COLUMN parent_code_active boolean NOT NULL DEFAULT true;