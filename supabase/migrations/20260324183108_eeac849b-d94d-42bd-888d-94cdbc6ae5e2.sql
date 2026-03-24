
ALTER TABLE public.intake_sessions 
ADD COLUMN IF NOT EXISTS class_group TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS staff_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS staff_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS staff_open_responses JSONB NOT NULL DEFAULT '{}'::jsonb;
