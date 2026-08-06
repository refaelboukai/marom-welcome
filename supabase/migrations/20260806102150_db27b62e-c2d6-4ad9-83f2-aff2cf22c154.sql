GRANT INSERT ON public.short_day_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_day_requests TO authenticated;
GRANT ALL ON public.short_day_requests TO service_role;